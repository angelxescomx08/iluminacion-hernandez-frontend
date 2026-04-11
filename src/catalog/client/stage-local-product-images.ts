import {
    describeProductImageValidationError,
    PRODUCT_IMAGES_MAX_COUNT,
} from "../domain/product-image-upload";

export type StagedImageFileResult =
    | { ok: true; file: File }
    | { ok: false; name: string; reason: string };

/**
 * Filtra archivos nuevos respetando el tope global y las reglas de tipo/tamaño.
 */
export function classifyFilesForStaging(
    alreadyStaged: number,
    picked: File[],
): StagedImageFileResult[] {
    const room = Math.max(0, PRODUCT_IMAGES_MAX_COUNT - alreadyStaged);
    const results: StagedImageFileResult[] = [];
    let accepted = 0;
    for (const file of picked) {
        if (accepted >= room) {
            results.push({
                ok: false,
                name: file.name,
                reason: `Solo caben ${PRODUCT_IMAGES_MAX_COUNT} imágenes en total.`,
            });
            continue;
        }
        const invalid = describeProductImageValidationError(file);
        if (invalid) {
            results.push({ ok: false, name: file.name, reason: invalid });
            continue;
        }
        results.push({ ok: true, file });
        accepted += 1;
    }
    return results;
}
