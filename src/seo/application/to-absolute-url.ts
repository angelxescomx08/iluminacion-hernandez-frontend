/**
 * Convierte una URL de imagen o recurso en absoluta respecto al sitio publicado.
 */
export function toAbsoluteUrl(
    siteOrigin: string | undefined,
    requestOrigin: string,
    url: string | null | undefined,
): string | undefined {
    const raw = url?.trim();
    if (!raw) {
        return undefined;
    }
    if (raw.startsWith("http://") || raw.startsWith("https://")) {
        return raw;
    }
    const base = (siteOrigin ?? requestOrigin).replace(/\/$/, "");
    const path = raw.startsWith("/") ? raw : `/${raw}`;
    try {
        return new URL(path, `${base}/`).href;
    } catch {
        return undefined;
    }
}
