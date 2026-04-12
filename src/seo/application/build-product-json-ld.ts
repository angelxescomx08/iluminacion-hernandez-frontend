import type { ProductSeoSnapshot } from "../domain/product-seo-snapshot";
import { SITE_BRAND_NAME } from "../domain/site-identity";
import { toAbsoluteUrl } from "./to-absolute-url";

export function buildProductJsonLd(
    product: ProductSeoSnapshot,
    pageUrl: string,
    siteOrigin: string | undefined,
    requestOrigin: string,
): Record<string, unknown> {
    const imageAbsolute = toAbsoluteUrl(
        siteOrigin,
        requestOrigin,
        product.imageUrl,
    );

    const offer: Record<string, unknown> = {
        "@type": "Offer",
        priceCurrency: "MXN",
        price: String(product.price),
        availability:
            product.stock === null || product.stock > 0
                ? "https://schema.org/InStock"
                : "https://schema.org/OutOfStock",
    };

    const json: Record<string, unknown> = {
        "@context": "https://schema.org",
        "@type": "Product",
        name: product.title,
        description: product.description ?? undefined,
        sku: product.id,
        brand: {
            "@type": "Brand",
            name: SITE_BRAND_NAME,
        },
        offers: offer,
        url: pageUrl,
    };

    if (imageAbsolute) {
        json.image = [imageAbsolute];
    }

    return json;
}
