import { createHttpProductsGateway } from "../adapters/http-products-gateway";
import type { ProductsGatewayPort } from "../ports/products-gateway.port";

export function tryCreateBrowserProductsGateway(): ProductsGatewayPort | null {
    const baseUrl = import.meta.env.PUBLIC_API_URL;
    if (typeof baseUrl !== "string" || !baseUrl.trim()) {
        return null;
    }
    return createHttpProductsGateway(baseUrl.trim());
}
