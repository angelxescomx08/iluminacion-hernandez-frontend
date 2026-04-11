import type { CatalogProduct, ProductImage } from "../domain/product";

function readString(value: unknown): string | null {
    if (typeof value !== "string") {
        return null;
    }
    const t = value.trim();
    return t ? t : null;
}

function readId(value: unknown): string | null {
    if (typeof value === "string" && value.trim()) {
        return value.trim();
    }
    if (typeof value === "number" && Number.isFinite(value)) {
        return String(value);
    }
    return null;
}

function readNumber(value: unknown): number | null {
    if (typeof value === "number" && Number.isFinite(value)) {
        return value;
    }
    if (typeof value === "string" && value.trim()) {
        const n = Number(value);
        return Number.isFinite(n) ? n : null;
    }
    return null;
}

function readBoolean(value: unknown): boolean | null {
    if (typeof value === "boolean") {
        return value;
    }
    if (value === "true") {
        return true;
    }
    if (value === "false") {
        return false;
    }
    return null;
}

function pick<T>(record: Record<string, unknown>, keys: string[]): T | undefined {
    for (const key of keys) {
        if (key in record && record[key] !== undefined) {
            return record[key] as T;
        }
    }
    return undefined;
}

function mapProductImage(raw: unknown): ProductImage | null {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
        return null;
    }
    const o = raw as Record<string, unknown>;
    const id = readId(pick(o, ["id"]));
    const url = readString(pick(o, ["url", "publicUrl", "src"]));
    if (!id || !url) {
        return null;
    }
    const mainUnknown = pick<boolean | string>(o, [
        "isMain",
        "is_main",
        "main",
    ]);
    const isMain = readBoolean(mainUnknown) ?? false;
    return { id, url, isMain };
}

/**
 * Normaliza la forma heterogénea del API (camelCase / snake_case) a un modelo estable.
 */
export function mapApiProductPayload(raw: unknown): CatalogProduct | null {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
        return null;
    }
    const o = raw as Record<string, unknown>;
    const id = readId(pick(o, ["id"]));
    const title = readString(pick(o, ["title"]));
    const slug = readString(pick(o, ["slug"])) ?? "";
    const price = readNumber(pick(o, ["price"]));
    if (!id || !title || price === null) {
        return null;
    }

    const description =
        readString(pick(o, ["description"])) ??
        readString(pick(o, ["shortDescription"])) ??
        null;
    const content = readString(pick(o, ["content"])) ?? null;

    let characteristics: string | null = null;
    const ch = pick<unknown>(o, ["characteristics", "attrs", "attributes"]);
    if (typeof ch === "string") {
        characteristics = ch;
    } else if (ch && typeof ch === "object" && !Array.isArray(ch)) {
        characteristics = JSON.stringify(ch);
    } else if (ch != null && typeof ch !== "object") {
        characteristics = String(ch);
    }

    const stock = readNumber(pick(o, ["stock"]));

    const activeUnknown = pick(o, ["isActive", "is_active"]);
    const isActive = readBoolean(activeUnknown) ?? true;

    const imagesUnknown = pick<unknown>(o, ["images"]);
    const images: ProductImage[] = [];
    if (Array.isArray(imagesUnknown)) {
        for (const item of imagesUnknown) {
            const img = mapProductImage(item);
            if (img) {
                images.push(img);
            }
        }
    }

    const stripeProductId =
        readString(pick(o, ["stripeProductId", "stripe_product_id"])) ??
        undefined;
    const stripePriceId =
        readString(pick(o, ["stripePriceId", "stripe_price_id"])) ?? undefined;

    return {
        id,
        title,
        slug,
        description,
        content,
        characteristics,
        stock,
        isActive,
        price,
        images,
        ...(stripeProductId ? { stripeProductId } : {}),
        ...(stripePriceId ? { stripePriceId } : {}),
    };
}
