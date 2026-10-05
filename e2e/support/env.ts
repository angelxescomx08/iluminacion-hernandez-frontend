import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
export const FRONTEND_DIR = path.resolve(here, "../..");
export const STATE_DIR = path.join(FRONTEND_DIR, "e2e", ".state");

/** Lee un `.env` sencillo (KEY=valor, comillas opcionales). */
function readDotEnv(file: string): Record<string, string> {
    if (!existsSync(file)) return {};
    const out: Record<string, string> = {};
    for (const raw of readFileSync(file, "utf8").split(/\r?\n/)) {
        const m = raw.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
        if (!m) continue;
        out[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
    return out;
}

/** Carpeta del backend: por defecto `../../node/backend-iluminacion-hernandez` (estructura en tu equipo). */
export const BACKEND_DIR = path.resolve(
    process.env.E2E_BACKEND_DIR ?? path.join(FRONTEND_DIR, "../../node/backend-iluminacion-hernandez"),
);

const backendEnv = readDotEnv(path.join(BACKEND_DIR, ".env"));
const pick = (key: string) => process.env[key] ?? backendEnv[key] ?? "";

export const E2E = {
    pgPort: Number(process.env.E2E_PG_PORT ?? 5433),
    backendPort: Number(process.env.E2E_BACKEND_PORT ?? 3001),
    frontendPort: Number(process.env.E2E_FRONTEND_PORT ?? 4322),
    get databaseUrl() {
        return `postgresql://iluminacion:e2e_password@localhost:${this.pgPort}/iluminacion_hernandez_e2e`;
    },
    get backendUrl() {
        return `http://localhost:${this.backendPort}`;
    },
    get frontendUrl() {
        return `http://localhost:${this.frontendPort}`;
    },
    /** Llave de PRUEBA de Stripe (sk_test_…). Se toma de E2E_STRIPE_SECRET_KEY o del .env del backend. */
    stripeSecretKey: process.env.E2E_STRIPE_SECRET_KEY ?? pick("STRIPE_SECRET_KEY"),
    resendApiKey: process.env.E2E_RESEND_API_KEY ?? pick("RESEND_API_KEY"),
    fromEmail: pick("CONTACT_FROM_EMAIL") || "Iluminación Hernández <contacto@iluminacion-hernandez.com>",
    /** Buzón de prueba de Resend: acepta el correo y lo marca como entregado sin enviarlo a nadie. */
    ownerEmail: "delivered@resend.dev",
    stripeCli: process.env.STRIPE_CLI ?? "stripe",
    shippingFlatRate: 199,
};

export function assertTestModeKey(): void {
    if (!E2E.stripeSecretKey.startsWith("sk_test_")) {
        throw new Error(
            "Las pruebas E2E solo corren con una llave de PRUEBA de Stripe (sk_test_…). " +
                "Define E2E_STRIPE_SECRET_KEY o pon una sk_test_ en el .env del backend.",
        );
    }
}
