/** Subconjunto del producto solo para metadatos y JSON-LD (sin acoplar al catálogo). */
export type ProductSeoSnapshot = {
    id: string;
    title: string;
    slug: string;
    description: string | null;
    price: number;
    stock: number | null;
    imageUrl: string | null;
};
