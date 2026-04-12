/**
 * URL canónica sin fragmento. Incluye query string (p. ej. paginación en tienda).
 */
export function resolveCanonicalUrl(siteOrigin: string | undefined, pageUrl: URL): string {
    const origin = (siteOrigin ?? pageUrl.origin).replace(/\/$/, "");
    const path = pageUrl.pathname || "/";
    const search = pageUrl.search ?? "";
    return `${origin}${path}${search}`;
}
