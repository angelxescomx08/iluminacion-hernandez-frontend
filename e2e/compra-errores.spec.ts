import { E2E } from "./support/env";
import { db, expect, test } from "./support/fixtures";
import { CARDS, expectOnStripeCheckout, fillCard, fillContact, fillShipping, submit } from "./support/stripe-checkout";

test.describe("Errores y cancelación", () => {
    test("tarjeta rechazada: Stripe muestra el error, el pedido sigue pendiente y luego se puede pagar", async ({ page, customer, ids }) => {
        const stockBefore = await db.stock(ids.f);
        await page.goto("/producto/e2e-ventilador-tornado");
        await page.getByTestId("buy-now").click();
        await page.getByTestId("checkout-pay").click();

        await expectOnStripeCheckout(page);
        await fillShipping(page);
        await fillContact(page);
        await fillCard(page, CARDS.declined);
        await submit(page);

        // Stripe rechaza y el cliente se queda en la página de pago.
        await expect(page.getByText(/rechaz|declin/i).first()).toBeVisible({ timeout: 30_000 });
        await expect(page).toHaveURL(/checkout\.stripe\.com/);

        const pending = await db.latestOrder(customer.email);
        expect(pending!.status).toBe("pending");
        expect(pending!.paid_at).toBeNull();
        expect(pending!.customer_email_sent_at).toBeNull();
        expect(pending!.owner_email_sent_at).toBeNull();
        expect(await db.stock(ids.f)).toBe(stockBefore);

        // Reintenta con una tarjeta válida en la misma sesión.
        await fillCard(page, CARDS.success);
        await submit(page);
        await page.waitForURL(/\/checkout\/exito/, { timeout: 60_000 });
        await expect(page.getByTestId("order-status")).toContainText("Pago confirmado");

        const paid = await db.latestOrder(customer.email);
        expect(paid!.id).toBe(pending!.id);
        expect(paid!.status).toBe("paid");
        expect(await db.stock(ids.f)).toBe(stockBefore - 1);
    });

    test("fondos insuficientes también se rechaza sin cobrar", async ({ page, customer }) => {
        await page.goto("/producto/e2e-ventilador-tornado");
        await page.getByTestId("buy-now").click();
        await page.getByTestId("fulfillment-pickup").check();
        await page.getByTestId("checkout-pay").click();

        await expectOnStripeCheckout(page);
        await fillContact(page);
        await fillCard(page, CARDS.insufficientFunds);
        await submit(page);
        await expect(page.getByText(/fondos|insufficient|rechaz/i).first()).toBeVisible({ timeout: 30_000 });

        const order = await db.latestOrder(customer.email);
        expect(order!.status).toBe("pending");
    });

    test("cancelar en Stripe regresa al carrito, cancela el pedido y expira la sesión", async ({ page, customer, ids }) => {
        const stockBefore = await db.stock(ids.g);
        await page.goto("/producto/e2e-ventilador-feria");
        await page.getByTestId("add-to-cart").click();
        await page.goto("/carrito");
        await page.getByTestId("checkout-pay").click();
        await expectOnStripeCheckout(page);

        // Enlace "atrás" de Stripe → cancel_url.
        await page.locator('a[href*="/carrito?cancelado="]').first().click();
        await page.waitForURL(/\/carrito/);
        await expect(page.getByTestId("checkout-notice")).toContainText("Cancelaste el pago");
        await expect(page.getByTestId("cart-line")).toHaveCount(1);
        await expect(page).not.toHaveURL(/cancelado=/);

        const order = await db.latestOrder(customer.email);
        expect(order!.status).toBe("canceled");
        expect(order!.customer_email_sent_at).toBeNull();
        expect(await db.stock(ids.g)).toBe(stockBefore);

        // La sesión de Stripe quedó expirada: ese enlace de pago ya no sirve.
        const res = await page.request.get(
            `https://api.stripe.com/v1/checkout/sessions/${order!.stripe_checkout_session_id}`,
            { headers: { Authorization: `Bearer ${E2E.stripeSecretKey}` } },
        );
        expect((await res.json()).status).toBe("expired");
    });
});
