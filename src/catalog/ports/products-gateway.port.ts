import type { CatalogResult } from "../domain/catalog-result";
import type {
    CatalogProduct,
    CreateProductInput,
    ProductListPage,
    UpdateProductInput,
} from "../domain/product";

export type ListProductsParams = {
    page?: number;
    pageSize?: number;
    q?: string;
    /** Cadena JSON para filtro JSONB en el servidor. */
    characteristics?: string;
    /** Por defecto el API asume activos; `false` incluye inactivos. */
    activeOnly?: boolean;
};

export interface ProductsGatewayPort {
    list(params: ListProductsParams): Promise<CatalogResult<ProductListPage>>;
    getById(id: string): Promise<CatalogResult<CatalogProduct>>;
    create(
        input: CreateProductInput,
    ): Promise<CatalogResult<CatalogProduct>>;
    update(
        id: string,
        input: UpdateProductInput,
    ): Promise<CatalogResult<CatalogProduct>>;
    remove(id: string): Promise<CatalogResult<CatalogProduct>>;
    uploadImage(
        productId: string,
        file: File,
    ): Promise<CatalogResult<CatalogProduct>>;
    deleteImage(
        productId: string,
        imageId: string,
    ): Promise<CatalogResult<CatalogProduct>>;
    setMainImage(
        productId: string,
        imageId: string,
    ): Promise<CatalogResult<CatalogProduct>>;
}
