const FALLBACK_LETTER = "?";

export function initialsFromDisplayName(displayName: string): string {
    const parts = displayName.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) {
        return FALLBACK_LETTER;
    }
    if (parts.length === 1) {
        const word = parts[0];
        return word.slice(0, 2).toUpperCase();
    }
    const first = parts[0][0] ?? "";
    const last = parts[parts.length - 1][0] ?? "";
    const pair = `${first}${last}`.toUpperCase();
    return pair || FALLBACK_LETTER;
}

export function initialsFromEmail(email: string): string {
    const local = email.split("@")[0]?.trim() ?? "";
    if (!local) {
        return FALLBACK_LETTER;
    }
    return local.slice(0, 2).toUpperCase();
}
