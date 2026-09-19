import { createHttpContactGateway } from "../adapters/http-contact-gateway";
import type { ContactGatewayPort } from "../ports/contact-gateway.port";

export function tryCreateBrowserContactGateway(): ContactGatewayPort | null {
    const baseUrl = import.meta.env.PUBLIC_API_URL;
    if (typeof baseUrl !== "string" || !baseUrl.trim()) {
        return null;
    }
    return createHttpContactGateway(baseUrl.trim());
}
