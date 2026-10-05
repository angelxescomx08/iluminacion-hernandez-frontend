import { readFileSync } from "node:fs";
import path from "node:path";
import { test as base, expect, type APIRequestContext } from "@playwright/test";
import pg from "pg";
import { E2E, STATE_DIR } from "./env";
import type { SeedKey } from "./seed";

type State = { productIds: Record<SeedKey, string>; webhookEnabled: boolean; webhookSecret: string | null };
export const state = (): State => JSON.parse(readFileSync(path.join(STATE_DIR, "state.json"), "utf8")) as State;

export type DbOrder = {
    id: string;
    status: string;
    fulfillment_method: string;
    pickup_branch: string | null;
    subtotal_amount: string;
    shipping_amount: string;
    total_amount: string;
    shipping_address: string | null;
    customer_email: string | null;
    customer_phone: string | null;
    stripe_checkout_session_id: string | null;
    stripe_payment_intent_id: string | null;
    paid_at: Date | null;
    customer_email_sent_at: Date | null;
    owner_email_sent_at: Date | null;
    refunded_amount: string;
    refunded_at: Date | null;
    dispute_status: string | null;
    dispute_reason: string | null;
};

export const db = {
    async query<T>(sql: string, params: unknown[] = []): Promise<T[]> {
        const client = new pg.Client({ connectionString: E2E.databaseUrl });
        await client.connect();
        try {
            return (await client.query(sql, params)).rows as T[];
        } finally {
            await client.end();
        }
    },
    async stock(productId: string): Promise<number> {
        const [row] = await this.query<{ stock: number }>("select stock from products where id = $1", [productId]);
        return row.stock;
    },
    async latestOrder(email: string): Promise<DbOrder | null> {
        const [row] = await this.query<DbOrder>(
            `select o.* from orders o join users u on u.id = o.user_id where u.email = $1 order by o.created_at desc limit 1`,
            [email],
        );
        return row ?? null;
    },
    async orderItems(orderId: string) {
        return this.query<{ product_id: string; quantity: number; price_at_purchase: string }>(
            "select product_id, quantity, price_at_purchase from order_items where order_id = $1",
            [orderId],
        );
    },
};

/** Espera (sondeando la BD) a que el pedido cumpla una condición, p. ej. que el webhook lo marque pagado. */
export async function waitForOrder(email: string, predicate: (o: DbOrder) => boolean, timeoutMs = 30_000) {
    let last: DbOrder | null = null;
    await expect
        .poll(
            async () => {
                last = await db.latestOrder(email);
                return last !== null && predicate(last);
            },
            { timeout: timeoutMs, intervals: [500, 1000] },
        )
        .toBe(true);
    return last as unknown as DbOrder;
}

async function registerAndLogin(request: APIRequestContext, email: string) {
    const headers = { Origin: E2E.frontendUrl };
    const reg = await request.post(`${E2E.backendUrl}/api/v1/auth/register/email`, {
        headers,
        data: { name: "Cliente Prueba E2E", email, password: "Prueba12345!" },
    });
    expect(reg.ok(), `registro: ${await reg.text()}`).toBeTruthy();
    const login = await request.post(`${E2E.backendUrl}/api/v1/auth/login/email`, {
        headers,
        data: { email, password: "Prueba12345!" },
    });
    expect(login.ok(), `login: ${await login.text()}`).toBeTruthy();
}

type Fixtures = {
    /** Cliente nuevo con sesión iniciada en el navegador de la prueba. Correo de prueba de Resend. */
    customer: { email: string };
    ids: Record<SeedKey, string>;
};

export const test = base.extend<Fixtures>({
    customer: async ({ page }, use, testInfo) => {
        const email = `delivered+e2e-${Date.now()}-${testInfo.workerIndex}-${testInfo.repeatEachIndex}@resend.dev`;
        await registerAndLogin(page.request, email);
        await use({ email });
    },
    ids: async ({}, use) => {
        await use(state().productIds);
    },
});

export { expect };
