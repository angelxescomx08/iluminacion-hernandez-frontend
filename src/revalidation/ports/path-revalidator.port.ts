export type PathRevalidateResult =
    | { ok: true }
    | { ok: false; error: string };

export interface PathRevalidatorPort {
    revalidate(paths: string[]): Promise<PathRevalidateResult>;
}
