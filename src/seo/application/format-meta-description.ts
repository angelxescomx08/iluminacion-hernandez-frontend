const ELLIPSIS = "\u2026";

/**
 * Normaliza y recorta la meta description (~150–160 caracteres visibles en SERP).
 */
export function formatMetaDescription(text: string, maxLength = 158): string {
    const collapsed = text.replace(/\s+/g, " ").trim();
    if (collapsed.length <= maxLength) {
        return collapsed;
    }
    const slice = collapsed.slice(0, maxLength - 1);
    const lastSpace = slice.lastIndexOf(" ");
    const base =
        lastSpace > Math.floor(maxLength * 0.6) ? slice.slice(0, lastSpace) : slice;
    return `${base.trimEnd()}${ELLIPSIS}`;
}
