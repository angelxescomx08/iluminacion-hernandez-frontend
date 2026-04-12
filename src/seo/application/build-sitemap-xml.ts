function escapeXml(s: string): string {
    return s
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}

export function buildSitemapXml(urls: string[]): string {
    const body = urls
        .map(
            (loc) =>
                `  <url><loc>${escapeXml(loc)}</loc><changefreq>weekly</changefreq><priority>0.7</priority></url>`,
        )
        .join("\n");
    return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${body}
</urlset>`;
}
