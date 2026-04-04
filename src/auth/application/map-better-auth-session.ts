import type { ClientSession } from "../domain/client-session";

function readString(value: unknown): string | null {
    if (typeof value !== "string") {
        return null;
    }
    const trimmed = value.trim();
    return trimmed ? trimmed : null;
}

function unwrapDataWrapper(payload: Record<string, unknown>): unknown {
    if ("data" in payload && payload.data !== undefined) {
        return payload.data;
    }
    return payload;
}

/**
 * Convierte la respuesta cruda de GET /api/v1/auth/session (Better Auth)
 * en un modelo de presentación estable para el cliente.
 */
export function mapBetterAuthSessionPayload(payload: unknown): ClientSession {
    const unwrapped =
        payload !== null &&
        payload !== undefined &&
        typeof payload === "object" &&
        !Array.isArray(payload)
            ? unwrapDataWrapper(payload as Record<string, unknown>)
            : payload;

    if (unwrapped === null || unwrapped === undefined) {
        return { kind: "guest" };
    }

    if (typeof unwrapped !== "object" || Array.isArray(unwrapped)) {
        return { kind: "guest" };
    }

    const root = unwrapped as Record<string, unknown>;
    const userUnknown = root.user;

    if (userUnknown === null || userUnknown === undefined) {
        return { kind: "guest" };
    }

    if (typeof userUnknown !== "object" || Array.isArray(userUnknown)) {
        return { kind: "guest" };
    }

    const user = userUnknown as Record<string, unknown>;
    const id = readString(user.id);
    const name = readString(user.name);
    const email = readString(user.email);
    const imageUrl = readString(user.image);
    const role = readString(user.role);

    if (!id && !name && !email) {
        return { kind: "guest" };
    }

    const displayName = name ?? email ?? "Usuario";

    return {
        kind: "authenticated",
        user: {
            displayName,
            email,
            imageUrl,
            role,
        },
    };
}
