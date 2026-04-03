import type { ClientSession } from "../domain/client-session";
import type { AuthGatewayPort } from "../ports/auth-gateway.port";
import { mapBetterAuthSessionPayload } from "./map-better-auth-session";

export async function loadClientSession(
    gateway: AuthGatewayPort,
): Promise<ClientSession> {
    const result = await gateway.getSession();
    if (!result.ok) {
        return { kind: "guest" };
    }
    return mapBetterAuthSessionPayload(result.data);
}
