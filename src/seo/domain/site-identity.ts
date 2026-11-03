/** Datos NAP y marca reutilizables en JSON-LD (local / organización). */
export const SITE_BRAND_NAME = "Iluminación Hernández";

export const SITE_DEFAULT_DESCRIPTION =
    "Iluminación decorativa y lámparas en el centro de la Ciudad de México. Tienda en línea, catálogo y atención por WhatsApp.";

export const SITE_ADDRESS = {
    streetAddress: "Victoria 31, Pasillo de acceso centro",
    addressLocality: "Cuauhtémoc",
    addressRegion: "CDMX",
    postalCode: "06050",
    addressCountry: "MX",
} as const;

export const SITE_GEO = {
    latitude: 19.426,
    longitude: -99.1332,
} as const;

export const SITE_PHONE = "+525563028712";

/** Todos los teléfonos públicos (mismos que en /contacto). `tel` en formato E.164. */
export const SITE_PHONES = [
    { label: "WhatsApp", display: "55 6302 8712", tel: "+525563028712", whatsapp: true },
    { label: "Conmutador", display: "55 5512 4169", ext: "Ext. 121 y 122", tel: "+525555124169" },
    { label: "Conmutador", display: "55 7245 0233", tel: "+525572450233" },
    { label: "Conmutador", display: "55 7047 1875", tel: "+525570471875" },
    { label: "Conmutador", display: "55 7012 9562", tel: "+525570129562" },
    { label: "Conmutador", display: "55 6302 5712", tel: "+525563025712" },
] as const;
export const SITE_EMAIL = "iluminacion.hernandez.ventas@gmail.com";

export const SITE_SOCIAL_PROFILES = [
    "https://www.facebook.com/profile.php?id=61585753828406",
    "https://www.instagram.com/iluminacion_hernandez/",
    "https://www.tiktok.com/@iluminacin.hernnde",
] as const;
