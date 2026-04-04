export type CatalogSuccess<T> = { ok: true; data: T };

export type CatalogFailure = {
    ok: false;
    status: number;
    message: string;
    code?: string;
};

export type CatalogResult<T> = CatalogSuccess<T> | CatalogFailure;

export function catalogFailure(
    status: number,
    message: string,
    code?: string,
): CatalogFailure {
    return { ok: false, status, message, ...(code ? { code } : {}) };
}

export function catalogSuccess<T>(data: T): CatalogSuccess<T> {
    return { ok: true, data };
}
