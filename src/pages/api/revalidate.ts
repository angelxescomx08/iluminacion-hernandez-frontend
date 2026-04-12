/**
 * Webhook tras crear/editar/eliminar productos (adaptador Node).
 *
 * Las rutas `/producto/[slug]` usan `prerender = false`: cada visita consulta el API
 * y no dependen de ISR. Este endpoint sigue siendo útil para integrar tu backend,
 * logs y una futura caché propia (Redis, etc.).
 *
 * Ejemplo desde tu backend Node:
 *
 * ```ts
 * const site = process.env.ASTRO_SITE_URL!;
 * const secret = process.env.ASTRO_REVALIDATE_SECRET!;
 *
 * await fetch(`${site}/api/revalidate`, {
 *   method: "POST",
 *   headers: {
 *     "content-type": "application/json",
 *     authorization: `Bearer ${secret}`,
 *   },
 *   body: JSON.stringify({
 *     slug: product.slug,
 *     oldSlug: previousSlug,
 *     paths: ["/tienda", `/producto/${product.slug}`],
 *   }),
 * });
 * ```
 *
 * Variable en Astro (servidor): `REVALIDATE_SECRET`.
 */
import { createNodeSsrPathRevalidator } from "../../revalidation/adapters/node-ssr-path-revalidator";
import { handleRevalidateWebhook } from "../../revalidation/application/handle-revalidate-webhook.use-case";
import {
    isAuthorizedRevalidateRequest,
    loadRevalidationRuntime,
} from "../../revalidation/infrastructure/load-revalidation-runtime";

export const prerender = false;

export async function POST({ request }: { request: Request }) {
    const url = new URL(request.url);
    const runtime = loadRevalidationRuntime();
    if (!runtime) {
        return Response.json(
            {
                ok: false,
                error: "Define REVALIDATE_SECRET en el entorno del servidor.",
            },
            { status: 503 },
        );
    }

    if (!isAuthorizedRevalidateRequest(request, url, runtime.revalidateSecret)) {
        return Response.json({ ok: false, error: "No autorizado" }, {
            status: 401,
        });
    }

    let body: Record<string, unknown> = {};
    try {
        const ct = request.headers.get("content-type") ?? "";
        if (ct.includes("application/json")) {
            body = (await request.json()) as Record<string, unknown>;
        }
    } catch {
        return Response.json({ ok: false, error: "JSON inválido" }, {
            status: 400,
        });
    }

    const revalidator = createNodeSsrPathRevalidator();

    const result = await handleRevalidateWebhook(revalidator, {
        paths: body.paths,
        slug: body.slug,
        oldSlug: body.oldSlug,
    });

    if (!result.ok) {
        return Response.json({ ok: false, error: result.message }, {
            status: result.status,
        });
    }

    return Response.json({
        ok: true,
        revalidated: result.revalidated,
        strategy: "node-ssr",
    });
}
