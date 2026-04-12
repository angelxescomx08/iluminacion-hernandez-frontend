import type { CatalogResult } from "../domain/catalog-result";
import type { CatalogProduct } from "../domain/product";
import type { ProductsGatewayPort } from "../ports/products-gateway.port";

/**
 * Baja lógica de producto (admin): delega en DELETE /api/v1/products/:id.
 */
export function deleteCatalogProduct(
    gateway: ProductsGatewayPort,
    productId: string,
): Promise<CatalogResult<CatalogProduct>> {
    return gateway.remove(productId);
}
