/** Límite alineado con `POST /api/v1/products/:id/images`. */
export const PRODUCT_IMAGE_MAX_BYTES = 5 * 1024 * 1024;

/** Catálogo: Stripe admite hasta 8 URLs de imagen por producto. */
export const PRODUCT_IMAGES_MAX_COUNT = 8;

const ACCEPTED_MIME = new Set([
    "image/jpeg",
    "image/png",
    "image/webp",
]);

/**
 * Devuelve un mensaje de error localizable si el archivo no cumple las reglas del API;
 * `null` si es válido.
 */
export function describeProductImageValidationError(file: File): string | null {
    if (!ACCEPTED_MIME.has(file.type)) {
        return "El archivo debe ser JPEG, PNG o WebP.";
    }
    if (file.size > PRODUCT_IMAGE_MAX_BYTES) {
        return "La imagen supera el máximo de 5 MB.";
    }
    return null;
}

/**
 * Valida un lote antes de crear el producto o antes de subir en secuencia.
 * `files` vacío es válido.
 */
export function describeProductImagesBatchError(files: File[]): string | null {
    if (files.length > PRODUCT_IMAGES_MAX_COUNT) {
        return `Puedes elegir como máximo ${PRODUCT_IMAGES_MAX_COUNT} imágenes por producto.`;
    }
    for (const file of files) {
        const one = describeProductImageValidationError(file);
        if (one) {
            return `${file.name}: ${one}`;
        }
    }
    return null;
}
