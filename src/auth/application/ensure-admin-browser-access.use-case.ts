import { mapBetterAuthSessionPayload } from "./map-better-auth-session";
import {
    isAdminClientSession,
    isAuthenticatedSession,
} from "../domain/client-session";
import type { AuthGatewayPort } from "../ports/auth-gateway.port";

export type EnsureAdminBrowserAccessOptions = {
    loginPath?: string;
    forbiddenPath?: string;
};

/**
 * Garantiza en el navegador que hay sesión con rol `admin`.
 * Si no cumple, redirige y devuelve false.
 */
export async function ensureAdminBrowserAccess(
    gateway: AuthGatewayPort,
    options?: EnsureAdminBrowserAccessOptions,
): Promise<boolean> {
    const loginBase = options?.loginPath ?? "/login";
    const forbiddenPath = options?.forbiddenPath ?? "/";
    const redirectParam = encodeURIComponent(
        `${window.location.pathname}${window.location.search}`,
    );
    const loginWithReturn = `${loginBase}?redirect=${redirectParam}`;

    const result = await gateway.getSession();
    if (!result.ok) {
        window.location.assign(loginWithReturn);
        return false;
    }

    const session = mapBetterAuthSessionPayload(result.data);
    if (!isAuthenticatedSession(session)) {
        window.location.assign(loginWithReturn);
        return false;
    }

    if (!isAdminClientSession(session)) {
        window.location.assign(forbiddenPath);
        return false;
    }

    return true;
}
