import { type ChildProcess, spawn, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import EmbeddedPostgres from "embedded-postgres";
import { assertTestModeKey, BACKEND_DIR, E2E, FRONTEND_DIR, STATE_DIR } from "./support/env";
import { seedProducts } from "./support/seed";

const isWin = process.platform === "win32";
const children: ChildProcess[] = [];

function log(msg: string) {
    console.log(`[e2e] ${msg}`);
}

function start(name: string, command: string, args: string[], cwd: string, env: NodeJS.ProcessEnv): ChildProcess {
    const child = spawn(command, args, {
        cwd,
        env: { ...process.env, ...env },
        shell: isWin,
        detached: !isWin,
        stdio: ["ignore", "pipe", "pipe"],
    });
    const prefix = `[${name}] `;
    const verbose = process.env.E2E_VERBOSE === "1";
    child.stdout?.on("data", (d) => verbose && process.stdout.write(prefix + d));
    child.stderr?.on("data", (d) => verbose && process.stderr.write(prefix + d));
    children.push(child);
    return child;
}

function killTree(child: ChildProcess) {
    if (!child.pid || child.exitCode !== null) return;
    try {
        if (isWin) spawnSync("taskkill", ["/pid", String(child.pid), "/T", "/F"]);
        else process.kill(-child.pid, "SIGTERM");
    } catch {}
}

async function waitFor(url: string, label: string, timeoutMs = 90_000) {
    const until = Date.now() + timeoutMs;
    while (Date.now() < until) {
        try {
            const r = await fetch(url);
            if (r.status < 500) return;
        } catch {}
        await new Promise((r) => setTimeout(r, 500));
    }
    throw new Error(`${label} no respondió en ${timeoutMs / 1000}s (${url}). Corre con E2E_VERBOSE=1 para ver logs.`);
}

/** Obtiene el secreto whsec_ del Stripe CLI y deja `stripe listen` reenviando al backend. */
function startStripeListener(): string | null {
    const probe = spawnSync(E2E.stripeCli, ["listen", "--print-secret", "--api-key", E2E.stripeSecretKey], {
        encoding: "utf8",
        shell: isWin,
        timeout: 30_000,
    });
    const secret = probe.stdout?.trim();
    if (probe.status !== 0 || !secret?.startsWith("whsec_")) {
        log("Stripe CLI no disponible: se omiten las pruebas que dependen del webhook (ver e2e/README.md).");
        return null;
    }
    start(
        "stripe",
        E2E.stripeCli,
        [
            "listen",
            "--api-key",
            E2E.stripeSecretKey,
            "--events",
            [
                "checkout.session.completed",
                "checkout.session.expired",
                "checkout.session.async_payment_succeeded",
                "checkout.session.async_payment_failed",
                "charge.refunded",
                "charge.dispute.created",
                "charge.dispute.updated",
                "charge.dispute.closed",
            ].join(","),
            "--forward-to",
            `${E2E.backendUrl}/api/v1/stripe/webhook`,
        ],
        FRONTEND_DIR,
        {},
    );
    return secret;
}

export default async function globalSetup() {
    assertTestModeKey();
    if (!existsSync(path.join(BACKEND_DIR, "package.json"))) {
        throw new Error(`No encontré el backend en ${BACKEND_DIR}. Define E2E_BACKEND_DIR.`);
    }
    mkdirSync(STATE_DIR, { recursive: true });

    // 1) Postgres embebido (sin Docker), base de datos limpia en cada corrida.
    const dataDir = path.join(STATE_DIR, "pgdata");
    const pg = new EmbeddedPostgres({
        databaseDir: dataDir,
        user: "iluminacion",
        password: "e2e_password",
        port: E2E.pgPort,
        persistent: true,
        onLog: () => {},
    });
    if (!existsSync(dataDir)) await pg.initialise();
    await pg.start();
    try {
        await pg.dropDatabase("iluminacion_hernandez_e2e");
    } catch {}
    await pg.createDatabase("iluminacion_hernandez_e2e");
    log(`Postgres en :${E2E.pgPort}`);

    // 2) Migraciones del backend.
    const migrate = spawnSync("npx", ["drizzle-kit", "migrate"], {
        cwd: BACKEND_DIR,
        env: { ...process.env, DATABASE_URL: E2E.databaseUrl },
        shell: isWin,
        encoding: "utf8",
    });
    if (migrate.status !== 0) throw new Error(`Falló drizzle-kit migrate:\n${migrate.stdout}\n${migrate.stderr}`);
    log("Migraciones aplicadas");

    // 3) Productos de prueba (Stripe modo prueba + base de datos).
    const productIds = await seedProducts();
    log("Productos de prueba listos");

    // 4) Stripe CLI (opcional) → webhook.
    const webhookSecret = startStripeListener();

    // 5) Backend.
    start("backend", "npx", ["tsx", "src/infrastructure/server.ts"], BACKEND_DIR, {
        NODE_ENV: "test",
        PORT: String(E2E.backendPort),
        DATABASE_URL: E2E.databaseUrl,
        BETTER_AUTH_SECRET: "e2e-secret-e2e-secret-e2e-secret-e2e",
        BETTER_AUTH_URL: E2E.backendUrl,
        TRUSTED_ORIGINS: `${E2E.frontendUrl},${E2E.backendUrl}`,
        ALLOWED_ORIGINS: E2E.frontendUrl,
        CORS_DELEGATED_TO_PROXY: "false",
        STRIPE_SECRET_KEY: E2E.stripeSecretKey,
        STRIPE_CURRENCY: "mxn",
        STRIPE_WEBHOOK_SECRET: webhookSecret ?? "",
        PUBLIC_SITE_URL: E2E.frontendUrl,
        SHIPPING_FLAT_RATE: String(E2E.shippingFlatRate),
        RESEND_API_KEY: E2E.resendApiKey,
        CONTACT_TO_EMAIL: E2E.ownerEmail,
        CONTACT_FROM_EMAIL: E2E.fromEmail,
        ORDER_NOTIFY_EMAIL: E2E.ownerEmail,
        GOOGLE_CLIENT_ID: "",
        GOOGLE_CLIENT_SECRET: "",
    });

    await waitFor(`${E2E.backendUrl}/api/v1/checkout/options`, "Backend");
    log("Backend listo");

    // 6) Frontend: build de producción (como en el servidor) en una carpeta aparte, apuntando al backend de pruebas.
    //    El modo dev de Astro recarga la página al optimizar dependencias y vuelve inestables las pruebas.
    const outDir = path.join(STATE_DIR, "dist");
    const frontendEnv = {
        PUBLIC_API_URL: E2E.backendUrl,
        PUBLIC_SITE_URL: E2E.frontendUrl,
        ASTRO_OUT_DIR: outDir,
        ASTRO_TELEMETRY_DISABLED: "1",
    };
    const build = spawnSync("npx", ["astro", "build"], {
        cwd: FRONTEND_DIR,
        env: { ...process.env, ...frontendEnv },
        shell: isWin,
        encoding: "utf8",
    });
    if (build.status !== 0) throw new Error(`Falló astro build:\n${build.stdout}\n${build.stderr}`);
    start("frontend", "node", [path.join(outDir, "server", "entry.mjs")], FRONTEND_DIR, {
        ...frontendEnv,
        HOST: "localhost",
        PORT: String(E2E.frontendPort),
    });
    await waitFor(`${E2E.frontendUrl}/carrito`, "Frontend");
    log("Servicios listos");

    writeFileSync(
        path.join(STATE_DIR, "state.json"),
        // El secreto es del listener local del Stripe CLI (temporal, solo modo prueba): lo usan las pruebas de reenvío.
        JSON.stringify({ productIds, webhookEnabled: Boolean(webhookSecret), webhookSecret }, null, 2),
    );

    return async () => {
        children.reverse().forEach(killTree);
        await new Promise((r) => setTimeout(r, 1500)); // deja que el backend cierre su pool antes de apagar Postgres
        await pg.stop().catch(() => {});
        log("Servicios detenidos");
    };
}
