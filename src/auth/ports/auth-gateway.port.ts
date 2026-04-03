import type { AuthResult } from "../domain/auth-result";
import type {
    GoogleLoginOptions,
    LoginEmailCredentials,
    RegisterEmailCredentials,
} from "../domain/auth-credentials";

export type GoogleLoginResult = {
    redirectUrl: string;
};

export type SessionPayload = unknown;

export interface AuthGatewayPort {
    registerWithEmail(
        credentials: RegisterEmailCredentials,
    ): Promise<AuthResult<void>>;
    loginWithEmail(
        credentials: LoginEmailCredentials,
    ): Promise<AuthResult<void>>;
    loginWithGoogle(
        options?: GoogleLoginOptions,
    ): Promise<AuthResult<GoogleLoginResult>>;
    logout(): Promise<AuthResult<void>>;
    getSession(): Promise<AuthResult<SessionPayload>>;
}
