import { db, expect, test, waitForOrder } from "./support/fixtures";
import { payOnStripe } from "./support/stripe-checkout";

test.describe("Compra exitosa", () => {
    test("carrito con envío a domicilio: paga, confirma pedido, descuenta stock y envía correos", async ({ page, customer, ids }) => {
        const productId = ids.a;
        const stockBefore = await db.stock(productId);

        // 1. Producto → agregar 2 piezas al carrito; el contador del header se actualiza.
        await page.goto("/producto/e2e-ventilador-greco");
        await page.getByTestId("product-qty").fill("2");
        await page.getByTestId("add-to-cart").click();
        await expect(page.getByTestId("added-to-cart")).toBeVisible();
        await expect(page.getByTestId("header-cart-count").first()).toHaveText("2");

        // 2. Carrito: envío a domicilio ($199) y totales correctos.
        await page.getByTestId("header-cart").first().click();
        await expect(page).toHaveURL(/\/carrito/);
        await expect(page.getByTestId("cart-line")).toHaveCount(1);
        await expect(page.getByTestId("cart-subtotal")).toHaveText("$1,278.00");
        await expect(page.getByTestId("cart-shipping")).toHaveText("$199.00");
        await expect(page.getByTestId("cart-total")).toHaveText("$1,477.00");

        // 3. Pagar en Stripe (modo prueba) con dirección de envío.
        await page.getByTestId("checkout-pay").click();
        await payOnStripe(page, { shipping: true });

        // 4. Página de éxito.
        await page.waitForURL(/\/checkout\/exito\?session_id=cs_test_/, { timeout: 60_000 });
        await expect(page.getByTestId("order-status")).toContainText("Pago confirmado");
        await expect(page.getByTestId("order-total")).toHaveText("$1,477.00");
        await expect(page.getByTestId("order-code")).toHaveText(/^#[0-9A-F]{8}$/);

        // 5. El carrito se vació.
        await expect(page.getByTestId("header-cart-count").first()).toBeHidden();

        // 6. Base de datos: pedido pagado con sus datos, stock descontado y ambos correos enviados.
        //    (El webhook y la página de éxito compiten; los correos se registran un instante después del pago.)
        const order = await waitForOrder(
            customer.email,
            (o) => o.status === "paid" && o.customer_email_sent_at !== null && o.owner_email_sent_at !== null,
        );
        expect(order!.status).toBe("paid");
        expect(order!.fulfillment_method).toBe("shipping");
        expect(order!.subtotal_amount).toBe("1278.00");
        expect(order!.shipping_amount).toBe("199.00");
        expect(order!.total_amount).toBe("1477.00");
        expect(order!.shipping_address).toContain("Victoria 31");
        expect(order!.stripe_payment_intent_id).toMatch(/^pi_/);
        expect(order!.customer_email_sent_at).not.toBeNull();
        expect(order!.owner_email_sent_at).not.toBeNull();
        expect(await db.orderItems(order!.id)).toEqual([
            expect.objectContaining({ product_id: productId, quantity: 2, price_at_purchase: "639.00" }),
        ]);
        expect(await db.stock(productId)).toBe(stockBefore - 2);
    });

    test("comprar ahora y recoger en sucursal: sin costo de envío y no toca el carrito", async ({ page, customer, ids }) => {
        // Algo en el carrito que NO debe pagarse ni borrarse con "Comprar ahora".
        await page.goto("/producto/e2e-ventilador-greco");
        await page.getByTestId("add-to-cart").click();
        await expect(page.getByTestId("header-cart-count").first()).toHaveText("1");

        const stockBefore = await db.stock(ids.b);
        await page.goto("/producto/e2e-ventilador-samba");
        await page.getByTestId("buy-now").click();
        await expect(page).toHaveURL(/\/carrito\?ahora=/);
        await expect(page.getByTestId("cart-line")).toHaveCount(1);

        await page.getByTestId("fulfillment-pickup").check();
        await expect(page.getByTestId("cart-shipping")).toHaveText("Gratis");
        await expect(page.getByTestId("cart-total")).toHaveText("$1,139.00");

        await page.getByTestId("checkout-pay").click();
        await payOnStripe(page, { shipping: false });

        await page.waitForURL(/\/checkout\/exito/, { timeout: 60_000 });
        await expect(page.getByTestId("order-status")).toContainText("Pago confirmado");
        await expect(page.getByTestId("order-total")).toHaveText("$1,139.00");
        await expect(page.locator("[data-order-details]")).toContainText("Recoger en sucursal");

        const order = await waitForOrder(
            customer.email,
            (o) => o.status === "paid" && o.customer_email_sent_at !== null && o.owner_email_sent_at !== null,
        );
        expect(order!.fulfillment_method).toBe("pickup");
        expect(order!.pickup_branch).toBe("Sucursal Victoria 31");
        expect(order!.shipping_amount).toBe("0.00");
        expect(order!.total_amount).toBe("1139.00");
        expect(order!.shipping_address).toBeNull();
        expect(order!.customer_email_sent_at).not.toBeNull();
        expect(order!.owner_email_sent_at).not.toBeNull();
        expect(await db.stock(ids.b)).toBe(stockBefore - 1);

        // El carrito original sigue intacto.
        await expect(page.getByTestId("header-cart-count").first()).toHaveText("1");
    });
});
