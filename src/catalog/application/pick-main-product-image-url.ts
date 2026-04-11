import type { CatalogProduct } from "../domain/product";

export function pickMainProductImageUrl(product: CatalogProduct): string | null {
    const main = product.images.find((i) => i.isMain);
    if (main?.url) {
        return main.url;
    }
    return product.images[0]?.url ?? null;
}
