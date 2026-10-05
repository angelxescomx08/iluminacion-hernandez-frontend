import { formatMoney } from "../domain/cart";
import { type OrderView, tryCreateBrowserCheckoutGateway } from "../adapters/http-checkout-gateway";
import { cartStore, takePendingCheckout } from "./cart-store";

const esc = (s: string) =>
    s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

function renderOrder(order: OrderView): string {
    const delivery =
        order.fulfillmentMethod === "pickup"
            ? `Recoger en sucursal: ${esc(order.pickupBranch ?? "Sucursal")}`
            : `Envío a: ${esc(order.shippingAddress ?? "tu dirección")}`;
    return `
        <p class="font-inter text-sm text-neutral-500">Pedido <span class="font-semibold text-neutral-800" data-testid="order-code">#${esc(order.code)}</span></p>
        <ul class="divide-y divide-neutral-100">
            ${order.items
                .map(
                    (i) => `<li class="flex justify-between gap-4 py-3 font-inter text-sm">
                <span>${i.quantity} × ${esc(i.title ?? "Producto")}</span>
                <span class="whitespace-nowrap">${formatMoney(Number(i.unitPrice ?? 0) * i.quantity)}</span></li>`,
                )
                .join("")}
        </ul>
        <dl class="font-inter text-sm space-y-1 border-t border-neutral-100 pt-3">
            <div class="flex justify-between"><dt class="text-neutral-500">Envío</dt><dd>${Number(order.shipping) > 0 ? formatMoney(order.shipping) : "Gratis"}</dd></div>
            <div class="flex justify-between font-semibold text-neutral-900"><dt>Total pagado</dt><dd data-testid="order-total">${formatMoney(order.total)}</dd></div>
        </dl>
        <p class="font-inter text-sm text-neutral-600">${delivery}</p>`;
}

export async function bootSuccessPage(): Promise<void> {
    const box = document.querySelector<HTMLElement>("[data-success-root]")!;
    const status = document.querySelector<HTMLElement>("[data-testid='order-status']")!;
    const details = document.querySelector<HTMLElement>("[data-order-details]")!;
    const gateway = tryCreateBrowserCheckoutGateway();
    const sessionId = new URLSearchParams(window.location.search).get("session_id");

    if (!gateway || !sessionId) {
        status.textContent = "No encontramos la información de tu pago.";
        box.dataset.state = "error";
        return;
    }

    // Stripe ya redirigió aquí; el backend confirma el pago (también lo hace el webhook).
    // Si aún aparece pendiente, reintenta unos segundos.
    let order: OrderView | null = null;
    for (let attempt = 0; attempt < 6; attempt++) {
        const r = await gateway.session(sessionId);
        if (!r.ok) {
            status.textContent =
                r.status === 401 ? "Inicia sesión para ver tu pedido." : "No pudimos consultar tu pedido. Revisa tu correo de confirmación.";
            box.dataset.state = "error";
            return;
        }
        order = r.data;
        if (order.status !== "pending") break;
        await new Promise((res) => setTimeout(res, 1500));
    }

    if (!order) return;
    details.innerHTML = renderOrder(order);
    box.dataset.state = order.status;

    if (order.status === "paid") {
        status.textContent = "¡Pago confirmado! Te enviamos un correo con los detalles de tu pedido.";
        if (takePendingCheckout() === "cart") cartStore.clear();
    } else if (order.status === "pending") {
        status.textContent = "Tu pago se está procesando. Te avisaremos por correo en cuanto se confirme.";
    } else {
        status.textContent = "Este pago no se completó. No se realizó ningún cargo.";
    }
}
