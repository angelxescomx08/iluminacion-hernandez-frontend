import { mapApiProductPayload } from "../application/map-api-product";
import {
    catalogFailure,
    catalogSuccess,
    type CatalogResult,
} from "../domain/catalog-result";
import type {
    CatalogProduct,
    CreateProductInput,
    ProductListPage,
    UpdateProductInput,
} from "../domain/product";
import type {
    ListProductsParams,
    ProductsGatewayPort,
} from "../ports/products-gateway.port";

const JSON_HEADERS = {
    "Content-Type": "application/json",
} as const;

async function readJsonSafe(response: Response): Promise<unknown> {
    const text = await response.text();
    if (!text) {
        return null;
    }
    try {
        return JSON.parse(text) as unknown;
    } catch {
        return text;
    }
}

function extractApiError(body: unknown, fallback: string): string {
    if (body === null || body === undefined) {
        return fallback;
    }
    if (typeof body === "string" && body.trim()) {
        return body;
    }
    if (typeof body !== "object") {
        return fallback;
    }
    const record = body as Record<string, unknown>;
    if (typeof record.message === "string" && record.message.trim()) {
        return record.message;
    }
    if (typeof record.error === "string" && record.error.trim()) {
        return record.error;
    }
    const code = record.code;
    if (typeof code === "string" && code.trim()) {
        return `${fallback} (${code})`;
    }
    return fallback;
}

function parseListPayload(payload: unknown): CatalogResult<ProductListPage> {
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
        return catalogFailure(500, "Respuesta de listado inválida");
    }
    const root = payload as Record<string, unknown>;
    const dataUnknown = root.data;
    if (!Array.isArray(dataUnknown)) {
        return catalogFailure(500, "Respuesta de listado sin arreglo data");
    }
    const items: CatalogProduct[] = [];
    for (const row of dataUnknown) {
        const p = mapApiProductPayload(row);
        if (p) {
            items.push(p);
        }
    }
    const pag = root.pagination;
    if (!pag || typeof pag !== "object" || Array.isArray(pag)) {
        return catalogSuccess({
            items,
            pagination: {
                total: items.length,
                page: 1,
                pageSize: items.length,
                totalPages: 1,
            },
        });
    }
    const p = pag as Record<string, unknown>;
    const total = Number(p.total);
    const page = Number(p.page);
    const pageSize = Number(p.pageSize);
    const totalPages = Number(p.totalPages);
    return catalogSuccess({
        items,
        pagination: {
            total: Number.isFinite(total) ? total : items.length,
            page: Number.isFinite(page) ? page : 1,
            pageSize: Number.isFinite(pageSize) ? pageSize : items.length,
            totalPages: Number.isFinite(totalPages) ? totalPages : 1,
        },
    });
}

function parseProductPayload(payload: unknown): CatalogResult<CatalogProduct> {
    const p = mapApiProductPayload(payload);
    if (!p) {
        return catalogFailure(500, "No se pudo interpretar el producto");
    }
    return catalogSuccess(p);
}

function buildListQuery(params: ListProductsParams): string {
    const sp = new URLSearchParams();
    if (params.page !== undefined) {
        sp.set("page", String(params.page));
    }
    if (params.pageSize !== undefined) {
        sp.set("pageSize", String(params.pageSize));
    }
    if (params.q !== undefined && params.q.trim()) {
        sp.set("q", params.q.trim());
    }
    if (params.characteristics !== undefined && params.characteristics.trim()) {
        sp.set("characteristics", params.characteristics.trim());
    }
    if (params.activeOnly === false) {
        sp.set("activeOnly", "false");
    }
    const qs = sp.toString();
    return qs ? `?${qs}` : "";
}

export function createHttpProductsGateway(
    apiBaseUrl: string,
): ProductsGatewayPort {
    const base = apiBaseUrl.replace(/\/$/, "");
    const productsRoot = `${base}/api/v1/products`;

    async function parseResponse(
        response: Response,
    ): Promise<CatalogResult<CatalogProduct>> {
        const payload = await readJsonSafe(response);
        if (!response.ok) {
            return catalogFailure(
                response.status,
                extractApiError(
                    payload,
                    response.statusText || "Error en el catálogo",
                ),
            );
        }
        return parseProductPayload(payload);
    }

    return {
        async list(
            params: ListProductsParams,
        ): Promise<CatalogResult<ProductListPage>> {
            const response = await fetch(
                `${productsRoot}${buildListQuery(params)}`,
                { method: "GET", credentials: "include" },
            );
            const payload = await readJsonSafe(response);
            if (!response.ok) {
                return catalogFailure(
                    response.status,
                    extractApiError(
                        payload,
                        response.statusText || "No se pudo listar productos",
                    ),
                );
            }
            return parseListPayload(payload);
        },

        async getById(id: string): Promise<CatalogResult<CatalogProduct>> {
            const response = await fetch(`${productsRoot}/${encodeURIComponent(id)}`, {
                method: "GET",
                credentials: "include",
            });
            const payload = await readJsonSafe(response);
            if (!response.ok) {
                return catalogFailure(
                    response.status,
                    extractApiError(
                        payload,
                        response.statusText || "Producto no encontrado",
                    ),
                );
            }
            return parseProductPayload(payload);
        },

        async getBySlug(slug: string): Promise<CatalogResult<CatalogProduct>> {
            const response = await fetch(
                `${productsRoot}/by-slug/${encodeURIComponent(slug)}`,
                {
                    method: "GET",
                    credentials: "include",
                },
            );
            const payload = await readJsonSafe(response);
            if (!response.ok) {
                return catalogFailure(
                    response.status,
                    extractApiError(
                        payload,
                        response.statusText || "Producto no encontrado",
                    ),
                );
            }
            return parseProductPayload(payload);
        },

        async create(
            input: CreateProductInput,
        ): Promise<CatalogResult<CatalogProduct>> {
            const response = await fetch(productsRoot, {
                method: "POST",
                credentials: "include",
                headers: JSON_HEADERS,
                body: JSON.stringify(input),
            });
            return parseResponse(response);
        },

        async update(
            id: string,
            input: UpdateProductInput,
        ): Promise<CatalogResult<CatalogProduct>> {
            const response = await fetch(
                `${productsRoot}/${encodeURIComponent(id)}`,
                {
                    method: "PATCH",
                    credentials: "include",
                    headers: JSON_HEADERS,
                    body: JSON.stringify(input),
                },
            );
            return parseResponse(response);
        },

        async remove(id: string): Promise<CatalogResult<CatalogProduct>> {
            const response = await fetch(
                `${productsRoot}/${encodeURIComponent(id)}`,
                { method: "DELETE", credentials: "include" },
            );
            return parseResponse(response);
        },

        async uploadImage(
            productId: string,
            file: File,
        ): Promise<CatalogResult<CatalogProduct>> {
            const formData = new FormData();
            formData.append("file", file);
            const response = await fetch(
                `${productsRoot}/${encodeURIComponent(productId)}/images`,
                {
                    method: "POST",
                    credentials: "include",
                    body: formData,
                },
            );
            return parseResponse(response);
        },

        async deleteImage(
            productId: string,
            imageId: string,
        ): Promise<CatalogResult<CatalogProduct>> {
            const response = await fetch(
                `${productsRoot}/${encodeURIComponent(productId)}/images/${encodeURIComponent(imageId)}`,
                { method: "DELETE", credentials: "include" },
            );
            return parseResponse(response);
        },

        async setMainImage(
            productId: string,
            imageId: string,
        ): Promise<CatalogResult<CatalogProduct>> {
            const response = await fetch(
                `${productsRoot}/${encodeURIComponent(productId)}/images/${encodeURIComponent(imageId)}/main`,
                {
                    method: "PATCH",
                    credentials: "include",
                },
            );
            return parseResponse(response);
        },
    };
}
