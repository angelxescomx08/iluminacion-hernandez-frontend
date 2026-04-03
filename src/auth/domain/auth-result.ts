export type AuthSuccess<T = void> = T extends void
    ? { ok: true }
    : { ok: true; data: T };

export type AuthFailure = {
    ok: false;
    status: number;
    message: string;
};

export type AuthResult<T = void> = AuthSuccess<T> | AuthFailure;

export function authFailure(
    status: number,
    message: string,
): AuthFailure {
    return { ok: false, status, message };
}

export function authSuccess(): AuthSuccess<void>;
export function authSuccess<T>(data: T): AuthSuccess<T>;
export function authSuccess<T>(data?: T): AuthSuccess<T> | AuthSuccess<void> {
    if (data === undefined) {
        return { ok: true } as AuthSuccess<void>;
    }
    return { ok: true, data } as AuthSuccess<T>;
}

export function extractErrorMessage(body: unknown, fallback: string): string {
    if (body === null || body === undefined) {
        return fallback;
    }
    if (typeof body === "string" && body.trim()) {
        return body;
    }
    if (typeof body !== "object") {
        return fallback;
    }
    const record = body as Record<string, unknown>;
    if (typeof record.message === "string" && record.message.trim()) {
        return record.message;
    }
    if (typeof record.error === "string" && record.error.trim()) {
        return record.error;
    }
    const nested = record.error;
    if (nested && typeof nested === "object") {
        const err = nested as Record<string, unknown>;
        if (typeof err.message === "string" && err.message.trim()) {
            return err.message;
        }
    }
    return fallback;
}
