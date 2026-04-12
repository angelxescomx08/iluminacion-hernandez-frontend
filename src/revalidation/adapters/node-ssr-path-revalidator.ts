import type { PathRevalidatorPort } from "../ports/path-revalidator.port";

/**
 * Con `@astrojs/node`, las rutas con `prerender = false` se generan en cada petición
 * leyendo el API: no hay caché ISR de edge que purgar. El webhook mantiene el contrato
 * con tu backend (auditoría, métricas, futura capa de caché propia).
 */
export function createNodeSsrPathRevalidator(): PathRevalidatorPort {
    return {
        async revalidate(_paths: string[]) {
            return { ok: true };
        },
    };
}
