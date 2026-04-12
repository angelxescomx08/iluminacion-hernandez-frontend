import type { APIRoute } from "astro";

export const prerender = false;

export const GET: APIRoute = ({ site, request }) => {
    const origin = (site?.origin ?? new URL(request.url).origin).replace(
        /\/$/,
        "",
    );
    const body = [
        "User-agent: *",
        "Allow: /",
        "Disallow: /admin/",
        "Disallow: /api/",
        "",
        `Sitemap: ${origin}/sitemap.xml`,
        "",
    ].join("\n");
    return new Response(body, {
        headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
};
