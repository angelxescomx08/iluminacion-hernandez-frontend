/**
 * Mensajes de validación junto al control (DaisyUI: input-error / textarea-error).
 * El párrafo de error debe tener id `${fieldId}-error`.
 */
export function setInlineFieldError(
    fieldId: string,
    message: string | null,
): void {
    const field = document.getElementById(fieldId);
    const err = document.getElementById(`${fieldId}-error`);
    if (err) {
        if (!message) {
            err.textContent = "";
            err.classList.add("hidden");
        } else {
            err.textContent = message;
            err.classList.remove("hidden");
        }
    }
    if (!field) {
        return;
    }
    const has = Boolean(message);
    if (
        field instanceof HTMLInputElement &&
        field.type !== "checkbox" &&
        field.type !== "hidden"
    ) {
        field.classList.toggle("input-error", has);
    } else if (field instanceof HTMLTextAreaElement) {
        field.classList.toggle("textarea-error", has);
    }
}

/** Línea de error sin control asociado (p. ej. error de API al pie del formulario). */
export function setHelperLineError(
    lineElementId: string,
    message: string | null,
): void {
    const el = document.getElementById(lineElementId);
    if (!el) {
        return;
    }
    if (!message) {
        el.textContent = "";
        el.classList.add("hidden");
    } else {
        el.textContent = message;
        el.classList.remove("hidden");
    }
}
