import type { ProductsGatewayPort } from "../ports/products-gateway.port";
import { tryCreateBrowserProductsGateway } from "./create-browser-products-gateway";

/**
 * Prepara el gateway de catálogo para la tienda pública (sin comprobar rol admin).
 */
export function bootShopCatalogPage(): ProductsGatewayPort | "env" {
    const products = tryCreateBrowserProductsGateway();
    if (!products) {
        return "env";
    }
    return products;
}
