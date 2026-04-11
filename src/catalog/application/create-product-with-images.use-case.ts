import {
    catalogFailure,
    catalogSuccess,
    type CatalogResult,
} from "../domain/catalog-result";
import { describeProductImagesBatchError } from "../domain/product-image-upload";
import type { CatalogProduct, CreateProductInput } from "../domain/product";
import type { ProductsGatewayPort } from "../ports/products-gateway.port";
import { uploadProductImage } from "./upload-product-image.use-case";

export type CreateProductWithImagesData = {
    product: CatalogProduct;
    failedUploads: { name: string; message: string }[];
};

/**
 * Crea el producto y sube imágenes en orden (la primera subida suele quedar como referencia principal en el API).
 * Las subidas fallidas no revierten el alta del producto; el llamador puede redirigir a edición.
 */
export async function createProductWithImages(
    gateway: ProductsGatewayPort,
    input: CreateProductInput,
    imageFiles: File[],
): Promise<CatalogResult<CreateProductWithImagesData>> {
    const batchError = describeProductImagesBatchError(imageFiles);
    if (batchError) {
        return catalogFailure(400, batchError);
    }

    const created = await gateway.create(input);
    if (!created.ok) {
        return created;
    }

    const failedUploads: { name: string; message: string }[] = [];
    let product = created.data;

    for (const file of imageFiles) {
        const uploaded = await uploadProductImage(gateway, product.id, file);
        if (!uploaded.ok) {
            failedUploads.push({ name: file.name, message: uploaded.message });
        } else {
            product = uploaded.data;
        }
    }

    return catalogSuccess({ product, failedUploads });
}
