import { authFailure, type AuthResult } from "../domain/auth-result";
import type { LoginEmailCredentials } from "../domain/auth-credentials";
import type { AuthGatewayPort } from "../ports/auth-gateway.port";

export async function loginWithEmail(
    gateway: AuthGatewayPort,
    credentials: LoginEmailCredentials,
): Promise<AuthResult<void>> {
    const email = credentials.email.trim();
    if (!email) {
        return authFailure(400, "El correo electrónico es obligatorio.");
    }
    if (!credentials.password) {
        return authFailure(400, "La contraseña es obligatoria.");
    }
    return gateway.loginWithEmail({ ...credentials, email });
}
