/**
 * Entrada de metadatos por página (sin dependencias de Astro ni HTTP).
 */
export type PageSeoInput = {
    title: string;
    description: string;
    /** URL absoluta de imagen para Open Graph / Twitter */
    ogImage?: string | null;
    /** Si es true, los buscadores no indexan la página */
    noIndex?: boolean;
    /** Open Graph type (p. ej. `product` en ficha de producto) */
    ogType?: string;
};
