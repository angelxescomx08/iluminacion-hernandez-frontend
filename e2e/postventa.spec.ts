import type { Page } from "@playwright/test";
import { E2E } from "./support/env";
import { db, expect, state, test, waitForOrder } from "./support/fixtures";
import { expireSession, findCompletedEvent, refund, signWebhookPayload, stripeApi } from "./support/stripe-api";
import { CARDS, expectOnStripeCheckout, payOnStripe } from "./support/stripe-checkout";

/** Compra rápida: "Comprar ahora" + recoger en sucursal + pago en Stripe. */
async function buyNow(page: Page, slug: string, opts: { quantity?: number; card?: string } = {}) {
    await page.goto(`/producto/${slug}`);
    if (opts.quantity) await page.getByTestId("product-qty").fill(String(opts.quantity));
    await page.getByTestId("buy-now").click();
    await page.getByTestId("fulfillment-pickup").check();
    await page.getByTestId("checkout-pay").click();
    await payOnStripe(page, { shipping: false, card: opts.card });
    await page.waitForURL(/\/checkout\/exito/, { timeout: 60_000 });
    await expect(page.getByTestId("order-status")).toContainText("Pago confirmado");
}

const paidWithEmails = (o: { status: string; customer_email_sent_at: Date | null; owner_email_sent_at: Date | null }) =>
    o.status === "paid" && o.customer_email_sent_at !== null && o.owner_email_sent_at !== null;

test.describe("Después del pago (vía webhook)", () => {
    test.beforeEach(() => {
        test.skip(!state().webhookEnabled, "Requiere el Stripe CLI instalado (stripe listen).");
    });

    test("reembolso total desde Stripe: pedido reembolsado y el stock regresa", async ({ page, customer, ids }) => {
        const stockBefore = await db.stock(ids.j);
        await buyNow(page, "e2e-ventilador-lugo", { quantity: 2 });
        const paid = await waitForOrder(customer.email, paidWithEmails);
        expect(await db.stock(ids.j)).toBe(stockBefore - 2);

        await refund(paid.stripe_payment_intent_id!);

        const refunded = await waitForOrder(customer.email, (o) => o.status === "refunded", 45_000);
        expect(refunded.refunded_amount).toBe("4558.00");
        expect(refunded.refunded_at).not.toBeNull();
        await expect.poll(() => db.stock(ids.j)).toBe(stockBefore);
    });

    test("reembolso parcial: el pedido sigue pagado, registra el monto y no toca el stock", async ({ page, customer, ids }) => {
        const stockBefore = await db.stock(ids.k);
        await buyNow(page, "e2e-ventilador-kari");
        const paid = await waitForOrder(customer.email, paidWithEmails);

        await refund(paid.stripe_payment_intent_id!, 300);
        const partial = await waitForOrder(customer.email, (o) => o.refunded_amount === "300.00", 45_000);
        expect(partial.status).toBe("paid");

        // Un segundo reembolso parcial que completa el total sí lo marca como reembolsado.
        await refund(paid.stripe_payment_intent_id!);
        const full = await waitForOrder(customer.email, (o) => o.status === "refunded", 45_000);
        expect(full.refunded_amount).toBe("1899.00");
        await expect.poll(() => db.stock(ids.k)).toBe(stockBefore);
    });

    test("contracargo: el pedido queda marcado con la disputa y su motivo", async ({ page, customer }) => {
        await buyNow(page, "e2e-ventilador-passat", { card: CARDS.dispute });
        await waitForOrder(customer.email, paidWithEmails);

        // Stripe abre la disputa unos segundos después del pago (charge.dispute.created).
        const disputed = await waitForOrder(customer.email, (o) => o.dispute_status !== null, 60_000);
        expect(disputed.status).toBe("paid");
        expect(disputed.dispute_reason).toBe("fraudulent");
        expect(disputed.dispute_status).toMatch(/needs_response|warning_needs_response|under_review/);
    });

    test("sesión que expira sin pagar: el pedido queda 'expired' y el enlace ya no sirve", async ({ page, customer, ids }) => {
        const stockBefore = await db.stock(ids.n);
        await page.goto("/producto/e2e-ventilador-fenix");
        await page.getByTestId("buy-now").click();
        await page.getByTestId("checkout-pay").click();
        await expectOnStripeCheckout(page);
        const checkoutUrl = page.url();

        const pending = await db.latestOrder(customer.email);
        expect(pending!.status).toBe("pending");

        // Simula los 30 minutos: Stripe expira la sesión y avisa con checkout.session.expired.
        await expireSession(pending!.stripe_checkout_session_id!);
        const expired = await waitForOrder(customer.email, (o) => o.status === "expired", 45_000);
        expect(expired.paid_at).toBeNull();
        expect(expired.customer_email_sent_at).toBeNull();
        expect(await db.stock(ids.n)).toBe(stockBefore);

        // En Stripe la sesión quedó expirada: ese enlace ya no puede cobrar.
        const session = await stripeApi<{ status: string; payment_status: string; url: string | null }>(
            "GET",
            `/checkout/sessions/${pending!.stripe_checkout_session_id}`,
        );
        expect(session.status).toBe("expired");
        expect(session.payment_status).toBe("unpaid");
        expect(session.url).toBeNull();
        expect(checkoutUrl).toContain("checkout.stripe.com");
    });

    test("Stripe reenvía el mismo evento: no se descuenta stock ni se envían correos dos veces", async ({ page, customer, ids, request }) => {
        const stockBefore = await db.stock(ids.o);
        await buyNow(page, "e2e-ventilador-ciclon");
        const paid = await waitForOrder(customer.email, paidWithEmails);
        expect(await db.stock(ids.o)).toBe(stockBefore - 1);

        // Toma el evento real de Stripe y lo entrega otras 3 veces, firmado como lo hace Stripe.
        const event = await findCompletedEvent(paid.stripe_checkout_session_id!);
        const payload = JSON.stringify(event);
        for (let i = 0; i < 3; i++) {
            const res = await request.post(`${E2E.backendUrl}/api/v1/stripe/webhook`, {
                headers: {
                    "Content-Type": "application/json",
                    "Stripe-Signature": signWebhookPayload(payload, state().webhookSecret!),
                },
                data: payload,
            });
            expect(res.status()).toBe(200);
            expect((await res.json()).handled).toBe(true);
        }

        const after = await db.latestOrder(customer.email);
        expect(after!.status).toBe("paid");
        expect(after!.paid_at).toEqual(paid.paid_at);
        expect(after!.customer_email_sent_at).toEqual(paid.customer_email_sent_at);
        expect(after!.owner_email_sent_at).toEqual(paid.owner_email_sent_at);
        expect(await db.stock(ids.o)).toBe(stockBefore - 1);

        // Y la sesión de Stripe coincide con lo cobrado.
        const session = await stripeApi<{ amount_total: number; payment_status: string }>(
            "GET",
            `/checkout/sessions/${paid.stripe_checkout_session_id}`,
        );
        expect(session.payment_status).toBe("paid");
        expect(session.amount_total).toBe(227900);
    });
});
