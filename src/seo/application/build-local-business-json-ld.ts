import {
    SITE_ADDRESS,
    SITE_BRAND_NAME,
    SITE_EMAIL,
    SITE_GEO,
    SITE_PHONE,
    SITE_PHONES,
    SITE_SOCIAL_PROFILES,
} from "../domain/site-identity";

export function buildLocalBusinessJsonLd(siteUrl: string): Record<string, unknown> {
    const origin = siteUrl.replace(/\/$/, "");
    return {
        "@context": "https://schema.org",
        "@type": "LightingStore",
        name: SITE_BRAND_NAME,
        url: origin,
        email: SITE_EMAIL,
        telephone: SITE_PHONE,
        contactPoint: SITE_PHONES.map((phone) => ({
            "@type": "ContactPoint",
            telephone: phone.tel,
            contactType: phone.whatsapp ? "customer service" : "sales",
            areaServed: "MX",
            availableLanguage: "es",
        })),
        sameAs: [...SITE_SOCIAL_PROFILES],
        address: {
            "@type": "PostalAddress",
            streetAddress: SITE_ADDRESS.streetAddress,
            addressLocality: SITE_ADDRESS.addressLocality,
            addressRegion: SITE_ADDRESS.addressRegion,
            postalCode: SITE_ADDRESS.postalCode,
            addressCountry: SITE_ADDRESS.addressCountry,
        },
        geo: {
            "@type": "GeoCoordinates",
            latitude: SITE_GEO.latitude,
            longitude: SITE_GEO.longitude,
        },
    };
}
