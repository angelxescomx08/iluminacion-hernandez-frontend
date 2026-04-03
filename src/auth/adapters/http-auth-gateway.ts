import {
    authFailure,
    authSuccess,
    extractErrorMessage,
    type AuthResult,
} from "../domain/auth-result";
import type {
    GoogleLoginOptions,
    LoginEmailCredentials,
    RegisterEmailCredentials,
} from "../domain/auth-credentials";
import type {
    AuthGatewayPort,
    GoogleLoginResult,
    SessionPayload,
} from "../ports/auth-gateway.port";

const JSON_HEADERS = {
    "Content-Type": "application/json",
} as const;

async function readJsonSafe(response: Response): Promise<unknown> {
    const text = await response.text();
    if (!text) {
        return null;
    }
    try {
        return JSON.parse(text) as unknown;
    } catch {
        return text;
    }
}

function redirectUrlFromBody(body: unknown): string | null {
    if (!body || typeof body !== "object") {
        return null;
    }
    const record = body as Record<string, unknown>;
    const url =
        typeof record.url === "string"
            ? record.url
            : typeof record.redirectUrl === "string"
              ? record.redirectUrl
              : null;
    return url && url.trim() ? url : null;
}

export function createHttpAuthGateway(apiBaseUrl: string): AuthGatewayPort {
    const base = apiBaseUrl.replace(/\/$/, "");

    async function postJson(
        path: string,
        body: Record<string, unknown>,
    ): Promise<AuthResult<void>> {
        const response = await fetch(`${base}${path}`, {
            method: "POST",
            credentials: "include",
            headers: JSON_HEADERS,
            body: JSON.stringify(body),
        });
        const payload = await readJsonSafe(response);
        if (response.ok) {
            return authSuccess();
        }
        const message = extractErrorMessage(
            payload,
            response.statusText || "Error en la petición",
        );
        return authFailure(response.status, message);
    }

    return {
        async registerWithEmail(
            credentials: RegisterEmailCredentials,
        ): Promise<AuthResult<void>> {
            return postJson("/api/v1/auth/register/email", {
                name: credentials.name,
                email: credentials.email,
                password: credentials.password,
                ...(credentials.rememberMe !== undefined && {
                    rememberMe: credentials.rememberMe,
                }),
                ...(credentials.callbackURL && {
                    callbackURL: credentials.callbackURL,
                }),
            });
        },

        async loginWithEmail(
            credentials: LoginEmailCredentials,
        ): Promise<AuthResult<void>> {
            return postJson("/api/v1/auth/login/email", {
                email: credentials.email,
                password: credentials.password,
                ...(credentials.rememberMe !== undefined && {
                    rememberMe: credentials.rememberMe,
                }),
                ...(credentials.callbackURL && {
                    callbackURL: credentials.callbackURL,
                }),
            });
        },

        async loginWithGoogle(
            options?: GoogleLoginOptions,
        ): Promise<AuthResult<GoogleLoginResult>> {
            const response = await fetch(
                `${base}/api/v1/auth/login/google`,
                {
                    method: "POST",
                    credentials: "include",
                    headers: JSON_HEADERS,
                    body: JSON.stringify({
                        ...(options?.callbackURL && {
                            callbackURL: options.callbackURL,
                        }),
                        ...(options?.errorCallbackURL && {
                            errorCallbackURL: options.errorCallbackURL,
                        }),
                    }),
                },
            );
            const payload = await readJsonSafe(response);
            if (response.ok) {
                const redirectUrl = redirectUrlFromBody(payload);
                if (redirectUrl) {
                    return authSuccess({ redirectUrl });
                }
                return authFailure(
                    response.status,
                    "El servidor no devolvió URL de redirección para Google.",
                );
            }
            const message = extractErrorMessage(
                payload,
                response.statusText || "No se pudo iniciar sesión con Google",
            );
            return authFailure(response.status, message);
        },

        async logout(): Promise<AuthResult<void>> {
            return postJson("/api/v1/auth/logout", {});
        },

        async getSession(): Promise<AuthResult<SessionPayload>> {
            const response = await fetch(`${base}/api/v1/auth/session`, {
                method: "GET",
                credentials: "include",
            });
            const payload = await readJsonSafe(response);
            if (response.ok) {
                return authSuccess(payload);
            }
            const message = extractErrorMessage(
                payload,
                response.statusText || "No se pudo obtener la sesión",
            );
            return authFailure(response.status, message);
        },
    };
}
