import type { APIRoute } from "astro";
import { createHttpProductsGateway } from "../catalog/adapters/http-products-gateway";
import { loadPublicProductList } from "../catalog/application/load-public-product-list.use-case";
import { buildSitemapXml } from "../seo/application/build-sitemap-xml";

export const prerender = false;

const STATIC_INDEXABLE = ["/", "/tienda", "/contacto", "/sucursales"] as const;

export const GET: APIRoute = async ({ site, request }) => {
    const origin = (site?.origin ?? new URL(request.url).origin).replace(
        /\/$/,
        "",
    );
    const urls: string[] = STATIC_INDEXABLE.map((path) => `${origin}${path}`);

    const apiBase = import.meta.env.PUBLIC_API_URL?.trim();
    if (apiBase) {
        const gateway = createHttpProductsGateway(apiBase);
        let page = 1;
        let totalPages = 1;
        do {
            const result = await loadPublicProductList(gateway, {
                page,
                pageSize: 100,
                activeOnly: true,
            });
            if (!result.ok) {
                break;
            }
            for (const item of result.data.items) {
                urls.push(
                    `${origin}/producto/${encodeURIComponent(item.slug)}`,
                );
            }
            totalPages = result.data.pagination.totalPages;
            page += 1;
        } while (page <= totalPages);
    }

    return new Response(buildSitemapXml(urls), {
        headers: { "Content-Type": "application/xml; charset=utf-8" },
    });
};
