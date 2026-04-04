import { ensureAdminBrowserAccess } from "../../auth/application/ensure-admin-browser-access.use-case";
import { tryCreateBrowserAuthGateway } from "../../auth/client/create-browser-auth-gateway";
import type { AuthGatewayPort } from "../../auth/ports/auth-gateway.port";
import type { ProductsGatewayPort } from "../ports/products-gateway.port";
import { tryCreateBrowserProductsGateway } from "./create-browser-products-gateway";

export type AdminCatalogBootOk = {
    auth: AuthGatewayPort;
    products: ProductsGatewayPort;
};

/**
 * Comprueba entorno, sesión admin y devuelve gateways listos para el panel de productos.
 */
export async function bootAdminCatalogPage(): Promise<
    AdminCatalogBootOk | "env" | "redirect"
> {
    const auth = tryCreateBrowserAuthGateway();
    const products = tryCreateBrowserProductsGateway();
    if (!auth || !products) {
        return "env";
    }
    const allowed = await ensureAdminBrowserAccess(auth);
    if (!allowed) {
        return "redirect";
    }
    return { auth, products };
}
