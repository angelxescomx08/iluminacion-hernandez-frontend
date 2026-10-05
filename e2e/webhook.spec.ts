import { E2E } from "./support/env";
import { db, expect, state, test, waitForOrder } from "./support/fixtures";
import { payOnStripe } from "./support/stripe-checkout";

test.describe("Webhook de Stripe", () => {
    test("rechaza eventos sin firma válida", async ({ request }) => {
        const body = JSON.stringify({ id: "evt_falso", type: "checkout.session.completed", data: { object: { object: "checkout.session", id: "cs_test_falso" } } });
        const noSig = await request.post(`${E2E.backendUrl}/api/v1/stripe/webhook`, {
            headers: { "Content-Type": "application/json" },
            data: body,
        });
        const badSig = await request.post(`${E2E.backendUrl}/api/v1/stripe/webhook`, {
            headers: { "Content-Type": "application/json", "Stripe-Signature": "t=1,v1=firma_falsa" },
            data: body,
        });
        if (!state().webhookEnabled) {
            expect(noSig.status()).toBe(503);
            return;
        }
        expect(noSig.status()).toBe(400);
        expect(badSig.status()).toBe(400);
    });

    test("confirma el pedido aunque el cliente nunca llegue a la página de éxito", async ({ page, customer, ids }) => {
        test.skip(!state().webhookEnabled, "Requiere el Stripe CLI instalado (stripe listen).");
        const stockBefore = await db.stock(ids.h);

        // Simula que el cliente cierra la pestaña justo después de pagar: bloquea la página de éxito.
        await page.route("**/checkout/exito**", (route) => route.abort());

        await page.goto("/producto/e2e-ventilador-santana");
        await page.getByTestId("buy-now").click();
        await page.getByTestId("fulfillment-pickup").check();
        await page.getByTestId("checkout-pay").click();
        await payOnStripe(page, { shipping: false });

        // Solo el webhook (checkout.session.completed) puede haber confirmado el pedido.
        const order = await waitForOrder(
            customer.email,
            (o) => o.status === "paid" && o.customer_email_sent_at !== null && o.owner_email_sent_at !== null,
            45_000,
        );
        expect(order.stripe_payment_intent_id).toMatch(/^pi_/);
        expect(await db.stock(ids.h)).toBe(stockBefore - 1);
    });
});
