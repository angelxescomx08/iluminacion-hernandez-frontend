import {
    SITE_ADDRESS,
    SITE_BRAND_NAME,
    SITE_EMAIL,
    SITE_PHONE,
    SITE_SOCIAL_PROFILES,
} from "../domain/site-identity";

export function buildOrganizationJsonLd(siteUrl: string): Record<string, unknown> {
    const origin = siteUrl.replace(/\/$/, "");
    return {
        "@context": "https://schema.org",
        "@type": "Organization",
        name: SITE_BRAND_NAME,
        url: origin,
        email: SITE_EMAIL,
        telephone: SITE_PHONE,
        sameAs: [...SITE_SOCIAL_PROFILES],
        address: {
            "@type": "PostalAddress",
            streetAddress: SITE_ADDRESS.streetAddress,
            addressLocality: SITE_ADDRESS.addressLocality,
            addressRegion: SITE_ADDRESS.addressRegion,
            postalCode: SITE_ADDRESS.postalCode,
            addressCountry: SITE_ADDRESS.addressCountry,
        },
    };
}

export function buildWebSiteJsonLd(
    siteUrl: string,
    options?: { withSiteSearch?: boolean },
): Record<string, unknown> {
    const origin = siteUrl.replace(/\/$/, "");
    const payload: Record<string, unknown> = {
        "@context": "https://schema.org",
        "@type": "WebSite",
        name: SITE_BRAND_NAME,
        url: `${origin}/`,
        publisher: {
            "@type": "Organization",
            name: SITE_BRAND_NAME,
        },
    };
    if (options?.withSiteSearch) {
        payload.potentialAction = {
            "@type": "SearchAction",
            target: `${origin}/tienda?q={search_term_string}`,
            "query-input": "required name=search_term_string",
        };
    }
    return payload;
}
