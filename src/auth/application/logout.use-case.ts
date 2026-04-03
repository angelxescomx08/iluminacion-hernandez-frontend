import type { AuthResult } from "../domain/auth-result";
import type { AuthGatewayPort } from "../ports/auth-gateway.port";

export function logout(gateway: AuthGatewayPort): Promise<AuthResult<void>> {
    return gateway.logout();
}
