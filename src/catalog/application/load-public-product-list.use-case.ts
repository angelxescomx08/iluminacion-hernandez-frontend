import type { CatalogResult } from "../domain/catalog-result";
import type { ProductListPage } from "../domain/product";
import type {
    ListProductsParams,
    ProductsGatewayPort,
} from "../ports/products-gateway.port";

/**
 * Listado público de catálogo: delega en el puerto y mantiene activos por defecto.
 */
export function loadPublicProductList(
    gateway: ProductsGatewayPort,
    params: ListProductsParams,
): Promise<CatalogResult<ProductListPage>> {
    return gateway.list({
        ...params,
        activeOnly: params.activeOnly ?? true,
    });
}
