import { expect, type Page } from "@playwright/test";

/** Tarjetas de prueba oficiales: https://docs.stripe.com/testing */
export const CARDS = {
    success: "4242424242424242",
    declined: "4000000000000002",
    insufficientFunds: "4000000000009995",
    /** Siempre pide autenticación 3D Secure. */
    threeDSecure: "4000002760003184",
    /** El pago se aprueba y después el banco abre una disputa (fraudulent). */
    dispute: "4000000000000259",
} as const;

/**
 * Responde la ventana de prueba de 3D Secure que Stripe abre dentro de iframes anidados.
 * `complete` = el banco aprueba la autenticación; `fail` = la rechaza.
 */
export async function answer3DSecure(page: Page, action: "complete" | "fail") {
    const selector = action === "complete" ? "#test-source-authorize-3ds" : "#test-source-fail-3ds";
    const deadline = Date.now() + 45_000;
    while (Date.now() < deadline) {
        for (const frame of page.frames()) {
            const button = frame.locator(selector);
            if (await button.isVisible().catch(() => false)) {
                await button.click();
                return;
            }
        }
        await page.waitForTimeout(500);
    }
    throw new Error("No apareció la ventana de prueba de 3D Secure");
}

export async function expectOnStripeCheckout(page: Page) {
    await page.waitForURL(/checkout\.stripe\.com/, { timeout: 45_000 });
    await expect(page.locator("#cardNumber")).toBeVisible({ timeout: 45_000 });
}

async function fillIfVisible(page: Page, selector: string, value: string) {
    const field = page.locator(selector);
    if (await field.isVisible().catch(() => false)) await field.fill(value);
}

/** Llena la dirección de envío de la página de Stripe (solo aparece cuando se eligió envío a domicilio). */
export async function fillShipping(page: Page) {
    await page.locator("#shippingName").fill("Cliente Prueba E2E");
    const manual = page.getByRole("button", { name: /dirección manualmente/i });
    if (await manual.isVisible().catch(() => false)) await manual.click();
    await page.locator("#shippingAddressLine1").fill("Victoria 31");
    await page.keyboard.press("Escape");
    await fillIfVisible(page, "#shippingDependentLocality", "Centro");
    await page.locator("#shippingPostalCode").fill("06050");
    await page.locator("#shippingLocality").fill("Ciudad de México");
    const state = page.locator("#shippingAdministrativeArea");
    const label = await state
        .locator("option")
        .evaluateAll((opts) => (opts as HTMLOptionElement[]).map((o) => o.label).find((t) => /ciudad de m|cdmx|distrito/i.test(t)));
    if (label) await state.selectOption({ label });
}

export async function fillContact(page: Page) {
    await fillIfVisible(page, "#phoneNumber", "5512345678");
}

export async function fillCard(page: Page, number: string) {
    // Evita el flujo de "Link" (guardar datos en Stripe) para que la prueba sea determinista.
    const link = page.locator("#enableStripePass");
    if (await link.isChecked().catch(() => false)) await link.uncheck();
    await page.locator("#cardNumber").fill(number);
    await page.locator("#cardExpiry").fill("12 / 34");
    await page.locator("#cardCvc").fill("123");
    await fillIfVisible(page, "#billingName", "Cliente Prueba E2E");
    await fillIfVisible(page, "#billingPostalCode", "06050");
}

export async function submit(page: Page) {
    await page.getByTestId("hosted-payment-submit-button").click();
}

/** Flujo completo en la página de Stripe. */
export async function payOnStripe(page: Page, opts: { card?: string; shipping: boolean }) {
    await expectOnStripeCheckout(page);
    if (opts.shipping) await fillShipping(page);
    await fillContact(page);
    await fillCard(page, opts.card ?? CARDS.success);
    await submit(page);
}
