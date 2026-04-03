import { authFailure, type AuthResult } from "../domain/auth-result";
import type { RegisterEmailCredentials } from "../domain/auth-credentials";
import type { AuthGatewayPort } from "../ports/auth-gateway.port";

const MIN_PASSWORD_LENGTH = 8;

export async function registerWithEmail(
    gateway: AuthGatewayPort,
    credentials: RegisterEmailCredentials,
): Promise<AuthResult<void>> {
    const name = credentials.name.trim();
    const email = credentials.email.trim();
    if (!name) {
        return authFailure(400, "El nombre es obligatorio.");
    }
    if (!email) {
        return authFailure(400, "El correo electrónico es obligatorio.");
    }
    if (!credentials.password || credentials.password.length < MIN_PASSWORD_LENGTH) {
        return authFailure(
            400,
            `La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres.`,
        );
    }
    return gateway.registerWithEmail({ ...credentials, name, email });
}
