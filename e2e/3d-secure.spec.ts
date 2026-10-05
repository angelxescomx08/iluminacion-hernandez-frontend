import { db, expect, test, waitForOrder } from "./support/fixtures";
import { answer3DSecure, CARDS, expectOnStripeCheckout, fillCard, fillContact, submit } from "./support/stripe-checkout";

test.describe("3D Secure (autenticación del banco)", () => {
    test("el cliente aprueba la autenticación: el pago se completa", async ({ page, customer, ids }) => {
        const stockBefore = await db.stock(ids.i);
        await page.goto("/producto/e2e-ventilador-bela");
        await page.getByTestId("buy-now").click();
        await page.getByTestId("fulfillment-pickup").check();
        await page.getByTestId("checkout-pay").click();

        await expectOnStripeCheckout(page);
        await fillContact(page);
        await fillCard(page, CARDS.threeDSecure);
        await submit(page);
        await answer3DSecure(page, "complete");

        await page.waitForURL(/\/checkout\/exito/, { timeout: 60_000 });
        await expect(page.getByTestId("order-status")).toContainText("Pago confirmado");
        const order = await waitForOrder(
            customer.email,
            (o) => o.status === "paid" && o.customer_email_sent_at !== null && o.owner_email_sent_at !== null,
        );
        expect(order.total_amount).toBe("2279.00");
        expect(await db.stock(ids.i)).toBe(stockBefore - 1);
    });

    test("el cliente falla la autenticación: no se cobra y puede intentar de nuevo", async ({ page, customer, ids }) => {
        const stockBefore = await db.stock(ids.m);
        await page.goto("/producto/e2e-ventilador-altano");
        await page.getByTestId("buy-now").click();
        await page.getByTestId("fulfillment-pickup").check();
        await page.getByTestId("checkout-pay").click();

        await expectOnStripeCheckout(page);
        await fillContact(page);
        await fillCard(page, CARDS.threeDSecure);
        await submit(page);
        await answer3DSecure(page, "fail");

        // Stripe regresa a su formulario con un error y no redirige a la tienda.
        await expect(page.getByText(/autentic|authenticat|no se pudo|unable/i).first()).toBeVisible({ timeout: 30_000 });
        await expect(page).toHaveURL(/checkout\.stripe\.com/);

        const order = await db.latestOrder(customer.email);
        expect(order!.status).toBe("pending");
        expect(order!.customer_email_sent_at).toBeNull();
        expect(await db.stock(ids.m)).toBe(stockBefore);

        // Segundo intento con tarjeta normal en la misma sesión.
        await fillCard(page, CARDS.success);
        await submit(page);
        await page.waitForURL(/\/checkout\/exito/, { timeout: 60_000 });
        await expect(page.getByTestId("order-status")).toContainText("Pago confirmado");
        expect(await db.stock(ids.m)).toBe(stockBefore - 1);
    });
});
