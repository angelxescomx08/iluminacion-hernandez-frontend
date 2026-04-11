import {
    catalogFailure,
    type CatalogResult,
} from "../domain/catalog-result";
import type { CatalogProduct } from "../domain/product";
import type { ProductsGatewayPort } from "../ports/products-gateway.port";

export function loadPublicProductBySlug(
    gateway: ProductsGatewayPort,
    slug: string,
): Promise<CatalogResult<CatalogProduct>> {
    const trimmed = slug.trim();
    if (!trimmed) {
        return Promise.resolve(catalogFailure(400, "Slug inválido"));
    }
    return gateway.getBySlug(trimmed);
}
