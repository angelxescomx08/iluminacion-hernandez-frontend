import { test as base } from "@playwright/test";
import { E2E } from "./support/env";
import { db, expect, state, test } from "./support/fixtures";

const api = (path: string) => `${E2E.backendUrl}${path}`;
const headers = { Origin: E2E.frontendUrl };

base.describe("Sin sesión", () => {
    base("el carrito pide iniciar sesión para pagar y el API responde 401", async ({ page, request }) => {
        const { productIds } = state();
        await page.goto("/producto/e2e-ventilador-greco");
        await page.getByTestId("add-to-cart").click();
        await page.goto("/carrito");
        await expect(page.getByTestId("checkout-login")).toBeVisible();
        await expect(page.getByTestId("checkout-pay")).toBeHidden();
        await expect(page.getByTestId("checkout-login")).toHaveAttribute("href", /\/login\?redirect=%2Fcarrito/);

        const res = await request.post(api("/api/v1/checkout/sessions"), {
            headers,
            data: { items: [{ productId: productIds.a, quantity: 1 }], fulfillment: "shipping" },
        });
        expect(res.status()).toBe(401);
    });

    base("producto agotado no muestra botones de compra", async ({ page }) => {
        await page.goto("/producto/e2e-ventilador-agotado");
        await expect(page.getByTestId("out-of-stock")).toBeVisible();
        await expect(page.getByTestId("buy-now")).toHaveCount(0);
        await expect(page.getByTestId("add-to-cart")).toHaveCount(0);
    });
});

test.describe("Validaciones del pedido (con sesión)", () => {
    const create = (page: import("@playwright/test").Page, data: unknown) =>
        page.request.post(api("/api/v1/checkout/sessions"), { headers, data });

    test("rechaza carrito vacío, cantidades inválidas, entrega inválida y productos no disponibles", async ({ page, customer: _c, ids }) => {
        const cases: Array<[string, unknown, number, string]> = [
            ["carrito vacío", { items: [], fulfillment: "shipping" }, 400, "empty_cart"],
            ["cantidad 0", { items: [{ productId: ids.a, quantity: 0 }], fulfillment: "shipping" }, 400, "invalid_quantity"],
            ["cantidad decimal", { items: [{ productId: ids.a, quantity: 1.5 }], fulfillment: "shipping" }, 400, "invalid_quantity"],
            ["más de 10 piezas", { items: [{ productId: ids.a, quantity: 11 }], fulfillment: "shipping" }, 400, "invalid_quantity"],
            ["entrega inválida", { items: [{ productId: ids.a, quantity: 1 }], fulfillment: "dron" }, 400, "invalid_fulfillment"],
            ["producto inexistente", { items: [{ productId: "no-existe", quantity: 1 }], fulfillment: "pickup" }, 400, "product_unavailable"],
            ["producto inactivo", { items: [{ productId: ids.e, quantity: 1 }], fulfillment: "pickup" }, 400, "product_unavailable"],
            ["producto agotado", { items: [{ productId: ids.d, quantity: 1 }], fulfillment: "pickup" }, 409, "insufficient_stock"],
            ["más que el stock", { items: [{ productId: ids.c, quantity: 2 }], fulfillment: "pickup" }, 409, "insufficient_stock"],
        ];
        for (const [name, body, status, code] of cases) {
            const res = await create(page, body);
            expect(res.status(), name).toBe(status);
            expect((await res.json()).code, name).toBe(code);
        }
    });

    test("el carrito ajusta la cantidad al stock disponible y muestra el error del servidor", async ({ page, customer: _c, ids }) => {
        // Se agregan 3 piezas de un producto con solo 1 en stock.
        await page.goto("/producto/e2e-ventilador-greco");
        await page.evaluate((id) => {
            localStorage.setItem(
                "ih:cart:v1",
                JSON.stringify({ lines: [{ productId: id, slug: "e2e-ventilador-ultima-pieza", title: "x", price: 1, imageUrl: null, quantity: 3 }] }),
            );
        }, ids.c);
        await page.goto("/carrito");
        await expect(page.getByTestId("cart-line-note")).toContainText("Solo hay 1");
        await expect(page.getByTestId("cart-qty")).toHaveValue("1");
        // El precio se corrige con el del servidor (no el que estaba guardado en el navegador).
        await expect(page.getByTestId("cart-subtotal")).toHaveText("$1,269.00");

        // Otro cliente compra la última pieza mientras tanto → el servidor rechaza con un mensaje claro.
        await db.query("update products set stock = 0 where id = $1", [ids.c]);
        await page.getByTestId("checkout-pay").click();
        await expect(page.getByTestId("checkout-error")).toContainText("agotado");
        await expect(page.getByTestId("cart-line-note")).toContainText("Agotado");
        await expect(page.getByTestId("checkout-pay")).toBeDisabled();
        await db.query("update products set stock = 1 where id = $1", [ids.c]);
    });

    test("un cliente no puede consultar ni cancelar el pedido de otro", async ({ page, customer: _c, ids, browser }) => {
        const res = await create(page, { items: [{ productId: ids.h, quantity: 1 }], fulfillment: "pickup" });
        expect(res.status()).toBe(201);
        const { orderId, checkoutSessionId } = await res.json();

        const other = await browser.newContext();
        const otherPage = await other.newPage();
        const email = `delivered+e2e-otro-${Date.now()}@resend.dev`;
        await otherPage.request.post(api("/api/v1/auth/register/email"), {
            headers,
            data: { name: "Otro", email, password: "Prueba12345!" },
        });
        const cancel = await otherPage.request.post(api(`/api/v1/checkout/orders/${orderId}/cancel`), { headers, data: {} });
        expect(cancel.status()).toBe(404);
        const view = await otherPage.request.get(api(`/api/v1/checkout/sessions/${checkoutSessionId}`), { headers });
        expect(view.status()).toBe(404);
        await other.close();

        // El dueño sí puede cancelarlo.
        const own = await page.request.post(api(`/api/v1/checkout/orders/${orderId}/cancel`), { headers, data: {} });
        expect((await own.json()).status).toBe("canceled");
    });
});
