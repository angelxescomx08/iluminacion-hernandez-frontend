import { createHttpAuthGateway } from "../adapters/http-auth-gateway";
import type { AuthGatewayPort } from "../ports/auth-gateway.port";

export function tryCreateBrowserAuthGateway(): AuthGatewayPort | null {
    const baseUrl = import.meta.env.PUBLIC_API_URL;
    if (typeof baseUrl !== "string" || !baseUrl.trim()) {
        return null;
    }
    return createHttpAuthGateway(baseUrl.trim());
}
