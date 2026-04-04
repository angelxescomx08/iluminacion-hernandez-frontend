export type ProductImage = {
    id: string;
    url: string;
    isMain: boolean;
};

export type CatalogProduct = {
    id: string;
    title: string;
    slug: string;
    description: string | null;
    content: string | null;
    characteristics: Record<string, unknown> | null;
    stock: number | null;
    isActive: boolean;
    price: number;
    images: ProductImage[];
    stripeProductId?: string;
    stripePriceId?: string;
};

export type ProductsPagination = {
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
};

export type ProductListPage = {
    items: CatalogProduct[];
    pagination: ProductsPagination;
};

export type CreateProductInput = {
    title: string;
    price: number;
    description?: string;
    content?: string;
    characteristics?: Record<string, unknown>;
    stock?: number;
    isActive?: boolean;
};

export type UpdateProductInput = Partial<CreateProductInput>;
