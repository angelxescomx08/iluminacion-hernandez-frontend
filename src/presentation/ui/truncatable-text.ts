/**
 * Utilidades de presentación: texto truncado con tooltip (sin lógica de dominio).
 */

export function normalizeForTooltip(text: string): string {
    return text.replace(/\s+/g, " ").trim();
}

export function escapeHtml(s: string): string {
    return s
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}

export function escapeHtmlAttribute(s: string): string {
    return normalizeForTooltip(s)
        .replace(/&/g, "&amp;")
        .replace(/"/g, "&quot;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
}

const lineVisualClass: Record<number, string> = {
    1: "truncate",
    2: "line-clamp-2",
    3: "line-clamp-3",
    4: "line-clamp-4",
    5: "line-clamp-5",
    6: "line-clamp-6",
    7: "line-clamp-7",
    8: "line-clamp-8",
};

export function truncatableInnerClassList(
    lines: number,
    options?: { preserveLineBreaks?: boolean },
): string {
    const visual = lineVisualClass[lines] ?? "line-clamp-3";
    const pre = options?.preserveLineBreaks ? "whitespace-pre-line" : "";
    return ["block", "min-w-0", "max-w-full", "break-words", visual, pre]
        .filter(Boolean)
        .join(" ");
}

export const TRUNCATABLE_TOOLTIP_WRAP_CLASSES =
    "tooltip tooltip-top ih-dynamic-tip inline-block max-w-full min-w-0";

export function buildTruncatableHtmlFragment(options: {
    text: string;
    lines: number;
    innerExtraClass?: string;
    preserveLineBreaks?: boolean;
}): string {
    const { text, lines, innerExtraClass = "", preserveLineBreaks } = options;
    const trimmed = text.trim();
    if (!trimmed) {
        return "";
    }
    const tip = escapeHtmlAttribute(trimmed);
    const escapedContent = escapeHtml(text);
    const innerClasses = [
        truncatableInnerClassList(lines, { preserveLineBreaks }),
        innerExtraClass,
    ]
        .join(" ")
        .trim();
    return `<span class="${TRUNCATABLE_TOOLTIP_WRAP_CLASSES}" data-tip="${tip}"><span class="${innerClasses}">${escapedContent}</span></span>`;
}

export function applyTruncatableHints(
    element: HTMLElement | null,
    fullText: string,
): void {
    if (!element) {
        return;
    }
    const tip = normalizeForTooltip(fullText);
    if (!tip) {
        element.removeAttribute("data-tip");
        element.classList.remove(
            "tooltip",
            "tooltip-top",
            "ih-dynamic-tip",
        );
        return;
    }
    element.setAttribute("data-tip", tip);
    element.classList.add("tooltip", "tooltip-top", "ih-dynamic-tip");
}
