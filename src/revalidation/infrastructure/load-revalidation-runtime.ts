import { timingSafeEqual } from "node:crypto";

const textEncoder = new TextEncoder();

export type RevalidationRuntimeConfig = {
    revalidateSecret: string;
};

function areSecretsEqual(a: string, b: string): boolean {
    const ba = textEncoder.encode(a);
    const bb = textEncoder.encode(b);
    if (ba.length !== bb.length) {
        return false;
    }
    return timingSafeEqual(ba, bb);
}

/**
 * Webhook protegido con `REVALIDATE_SECRET` (solo servidor; no expongas al cliente).
 */
export function loadRevalidationRuntime(): RevalidationRuntimeConfig | null {
    const revalidateSecret = process.env.REVALIDATE_SECRET?.trim();
    if (!revalidateSecret) {
        return null;
    }

    return { revalidateSecret };
}

export function isAuthorizedRevalidateRequest(
    request: Request,
    url: URL,
    secret: string,
): boolean {
    const auth = request.headers.get("authorization");
    if (auth?.startsWith("Bearer ")) {
        const token = auth.slice("Bearer ".length).trim();
        if (areSecretsEqual(token, secret)) {
            return true;
        }
    }

    const headerSecret = request.headers.get("x-revalidate-secret")?.trim();
    if (headerSecret && areSecretsEqual(headerSecret, secret)) {
        return true;
    }

    const querySecret = url.searchParams.get("secret")?.trim() ?? "";
    return querySecret.length > 0 && areSecretsEqual(querySecret, secret);
}
