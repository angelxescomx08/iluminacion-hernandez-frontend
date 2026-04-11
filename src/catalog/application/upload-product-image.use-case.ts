import {
    catalogFailure,
    type CatalogResult,
} from "../domain/catalog-result";
import { describeProductImageValidationError } from "../domain/product-image-upload";
import type { CatalogProduct } from "../domain/product";
import type { ProductsGatewayPort } from "../ports/products-gateway.port";

export async function uploadProductImage(
    gateway: ProductsGatewayPort,
    productId: string,
    file: File,
): Promise<CatalogResult<CatalogProduct>> {
    const validationError = describeProductImageValidationError(file);
    if (validationError) {
        return catalogFailure(400, validationError);
    }
    return gateway.uploadImage(productId, file);
}
