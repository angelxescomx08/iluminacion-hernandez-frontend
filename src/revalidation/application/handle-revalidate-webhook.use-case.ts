import type { PathRevalidatorPort } from "../ports/path-revalidator.port";

export type RevalidateWebhookInput = {
    paths: unknown;
    slug: unknown;
    oldSlug: unknown;
};

export type RevalidateWebhookResult =
    | { ok: true; revalidated: string[] }
    | { ok: false; status: 400; message: string }
    | { ok: false; status: 503; message: string };

function isValidSlugSegment(value: string): boolean {
    const v = value.trim();
    if (!v) {
        return false;
    }
    if (v.includes("/") || v.includes("\\") || v.includes("..")) {
        return false;
    }
    return true;
}

function isSafePublicPath(path: string): boolean {
    const p = path.trim();
    if (!p.startsWith("/") || p.includes("//")) {
        return false;
    }
    const segments = p.split("/").filter(Boolean);
    for (const seg of segments) {
        if (seg === "." || seg === "..") {
            return false;
        }
    }
    if (p === "/tienda") {
        return true;
    }
    if (p.startsWith("/producto/")) {
        const rest = p.slice("/producto/".length);
        return rest.length > 0 && !rest.includes("/");
    }
    return false;
}

function normalizeUnique(paths: string[]): string[] {
    return [...new Set(paths.map((x) => x.trim()).filter(Boolean))];
}

export function buildRevalidationPaths(input: RevalidateWebhookInput): string[] {
    const set = new Set<string>();

    if (Array.isArray(input.paths)) {
        for (const item of input.paths) {
            if (typeof item === "string" && isSafePublicPath(item)) {
                set.add(item.trim());
            }
        }
    }

    const slug = typeof input.slug === "string" ? input.slug.trim() : "";
    if (slug) {
        if (!isValidSlugSegment(slug)) {
            return [];
        }
        set.add(`/producto/${slug}`);
        set.add("/tienda");
    }

    const oldSlug =
        typeof input.oldSlug === "string" ? input.oldSlug.trim() : "";
    if (oldSlug) {
        if (!isValidSlugSegment(oldSlug)) {
            return [];
        }
        set.add(`/producto/${oldSlug}`);
    }

    return normalizeUnique([...set]);
}

export async function handleRevalidateWebhook(
    revalidator: PathRevalidatorPort,
    input: RevalidateWebhookInput,
): Promise<RevalidateWebhookResult> {
    const paths = buildRevalidationPaths(input);

    if (paths.length === 0) {
        return {
            ok: false,
            status: 400,
            message:
                "Envía `paths` (rutas permitidas: /tienda, /producto/{slug}) y/o `slug` válido.",
        };
    }

    const result = await revalidator.revalidate(paths);
    if (!result.ok) {
        return { ok: false, status: 503, message: result.error };
    }

    return { ok: true, revalidated: paths };
}
