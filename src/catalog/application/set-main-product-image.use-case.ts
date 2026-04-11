import type { CatalogResult } from "../domain/catalog-result";
import type { CatalogProduct } from "../domain/product";
import type { ProductsGatewayPort } from "../ports/products-gateway.port";

export function setMainProductImage(
    gateway: ProductsGatewayPort,
    productId: string,
    imageId: string,
): Promise<CatalogResult<CatalogProduct>> {
    return gateway.setMainImage(productId, imageId);
}
