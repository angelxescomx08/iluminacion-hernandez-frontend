export type ContactSuccess = { ok: true };

export type ContactFailure = {
    ok: false;
    status: number;
    message: string;
};

export type ContactResult = ContactSuccess | ContactFailure;

export function contactSuccess(): ContactSuccess {
    return { ok: true };
}

export function contactFailure(status: number, message: string): ContactFailure {
    return { ok: false, status, message };
}

export function extractContactErrorMessage(body: unknown, fallback: string): string {
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
    return fallback;
}
