import type { AuthResult } from "../domain/auth-result";
import type { GoogleLoginOptions } from "../domain/auth-credentials";
import type { AuthGatewayPort, GoogleLoginResult } from "../ports/auth-gateway.port";

export function loginWithGoogle(
    gateway: AuthGatewayPort,
    options?: GoogleLoginOptions,
): Promise<AuthResult<GoogleLoginResult>> {
    return gateway.loginWithGoogle(options);
}
