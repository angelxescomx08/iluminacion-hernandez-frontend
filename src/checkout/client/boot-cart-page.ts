import { type CartLine, clampQuantity, formatMoney } from "../domain/cart";
import {
    type ApiProduct,
    type CheckoutGateway,
    type CheckoutOptions,
    tryCreateBrowserCheckoutGateway,
} from "../adapters/http-checkout-gateway";
import { cartStore, rememberPendingCheckout } from "./cart-store";

type ViewLine = CartLine & { stock: number; available: boolean; note: string | null };

const esc = (s: string) =>
    s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

function mainImage(p: ApiProduct): string | null {
    return p.images.find((i) => i.isMain)?.url ?? p.images[0]?.url ?? null;
}

function el<T extends HTMLElement>(selector: string): T {
    const node = document.querySelector<T>(selector);
    if (!node) throw new Error(`Falta ${selector}`);
    return node;
}

/** Revalida cada línea contra el API: precio, título, stock y disponibilidad actuales. */
async function revalidate(gateway: CheckoutGateway, lines: CartLine[]): Promise<ViewLine[]> {
    return Promise.all(
        lines.map(async (line): Promise<ViewLine> => {
            const r = await gateway.product(line.productId);
            if (!r.ok || !r.data.isActive) {
                return { ...line, stock: 0, available: false, note: "Este producto ya no está disponible." };
            }
            const p = r.data;
            const fresh = {
                ...line,
                slug: p.slug,
                title: p.title,
                price: Number(p.price),
                imageUrl: mainImage(p) ?? line.imageUrl,
                stock: p.stock,
            };
            if (p.stock <= 0) return { ...fresh, available: false, note: "Agotado." };
            const qty = clampQuantity(line.quantity, p.stock);
            return {
                ...fresh,
                quantity: qty,
                available: true,
                note: qty < line.quantity ? `Solo hay ${p.stock} pieza(s); ajustamos la cantidad.` : null,
            };
        }),
    );
}

export async function bootCartPage(): Promise<void> {
    const gateway = tryCreateBrowserCheckoutGateway();
    const root = el<HTMLElement>("[data-cart-root]");
    const listBox = el<HTMLElement>("[data-cart-lines]");
    const emptyBox = el<HTMLElement>("[data-testid='cart-empty']");
    const summaryBox = el<HTMLElement>("[data-cart-summary]");
    const errorBox = el<HTMLElement>("[data-testid='checkout-error']");
    const noticeBox = el<HTMLElement>("[data-testid='checkout-notice']");
    const payBtn = el<HTMLButtonElement>("[data-testid='checkout-pay']");
    const loginLink = el<HTMLAnchorElement>("[data-testid='checkout-login']");
    const titleEl = el<HTMLElement>("[data-cart-title]");

    const showError = (msg: string | null) => {
        errorBox.textContent = msg ?? "";
        errorBox.classList.toggle("hidden", !msg);
    };
    const showNotice = (msg: string | null) => {
        noticeBox.textContent = msg ?? "";
        noticeBox.classList.toggle("hidden", !msg);
    };

    if (!gateway) {
        showError("La tienda no está configurada (falta PUBLIC_API_URL).");
        return;
    }

    const params = new URLSearchParams(window.location.search);
    const buyNowId = params.get("ahora");
    const mode: "cart" | "buy-now" = buyNowId ? "buy-now" : "cart";
    const canceledOrderId = params.get("cancelado");

    const [optionsResult, loggedIn] = await Promise.all([gateway.options(), gateway.isLoggedIn()]);
    const options: CheckoutOptions | null = optionsResult.ok ? optionsResult.data : null;

    if (canceledOrderId) {
        if (loggedIn) await gateway.cancel(canceledOrderId);
        showNotice("Cancelaste el pago. No se hizo ningún cargo; tus productos siguen aquí.");
        const clean = new URL(window.location.href);
        clean.searchParams.delete("cancelado");
        window.history.replaceState(null, "", clean.toString());
    }

    let baseLines: CartLine[];
    if (mode === "buy-now") {
        titleEl.textContent = "Comprar ahora";
        baseLines = [
            {
                productId: buyNowId!,
                slug: "",
                title: "",
                price: 0,
                imageUrl: null,
                quantity: clampQuantity(Number(params.get("cantidad") ?? "1")),
            },
        ];
    } else {
        baseLines = cartStore.get().lines;
    }

    let lines = await revalidate(gateway, baseLines);
    if (mode === "cart") {
        cartStore.replace({
            lines: lines.map(({ stock: _s, available: _a, note: _n, ...l }) => l),
        });
    }

    const fulfillment = () =>
        (document.querySelector<HTMLInputElement>("input[name='fulfillment']:checked")?.value ?? "shipping") as
            | "shipping"
            | "pickup";

    const render = () => {
        const payable = lines.filter((l) => l.available);
        const isEmpty = lines.length === 0;
        emptyBox.classList.toggle("hidden", !isEmpty);
        summaryBox.classList.toggle("hidden", isEmpty);

        listBox.innerHTML = lines
            .map(
                (l) => `
            <li class="flex gap-4 py-5 border-b border-neutral-100" data-testid="cart-line" data-product-id="${esc(l.productId)}">
                <div class="w-20 h-20 shrink-0 rounded-2xl bg-neutral-100 overflow-hidden">
                    ${l.imageUrl ? `<img src="${esc(l.imageUrl)}" alt="" class="w-full h-full object-contain" loading="lazy" />` : ""}
                </div>
                <div class="flex-1 min-w-0 space-y-2">
                    <a href="/producto/${esc(l.slug)}" class="font-inter font-semibold text-sm text-neutral-800 hover:text-amber-600 line-clamp-2">${esc(l.title || "Producto")}</a>
                    <p class="text-sm text-neutral-500 font-inter">${formatMoney(l.price)} c/u</p>
                    ${l.note ? `<p class="text-xs font-semibold ${l.available ? "text-amber-700" : "text-red-600"}" data-testid="cart-line-note">${esc(l.note)}</p>` : ""}
                    ${
                        l.available
                            ? `<div class="flex items-center gap-3">
                        <label class="sr-only" for="qty-${esc(l.productId)}">Cantidad</label>
                        <input id="qty-${esc(l.productId)}" type="number" min="1" max="${Math.min(l.stock, options?.maxQuantityPerItem ?? 10)}"
                            value="${l.quantity}" class="input input-bordered input-sm w-20" data-testid="cart-qty" data-qty-for="${esc(l.productId)}" />
                        ${mode === "cart" ? `<button type="button" class="btn btn-ghost btn-xs text-neutral-500" data-remove="${esc(l.productId)}" data-testid="cart-remove">Quitar</button>` : ""}
                    </div>`
                            : mode === "cart"
                              ? `<button type="button" class="btn btn-ghost btn-xs text-neutral-500" data-remove="${esc(l.productId)}" data-testid="cart-remove">Quitar</button>`
                              : ""
                    }
                </div>
                <p class="font-inter font-semibold text-sm text-neutral-800 whitespace-nowrap">${l.available ? formatMoney(l.price * l.quantity) : "—"}</p>
            </li>`,
            )
            .join("");

        const subtotal = payable.reduce((s, l) => s + l.price * l.quantity, 0);
        const shippingCost = fulfillment() === "shipping" ? Number(options?.shipping.amount ?? 0) : 0;
        el<HTMLElement>("[data-testid='cart-subtotal']").textContent = formatMoney(subtotal);
        el<HTMLElement>("[data-testid='cart-shipping']").textContent =
            shippingCost > 0 ? formatMoney(shippingCost) : "Gratis";
        el<HTMLElement>("[data-testid='cart-total']").textContent = formatMoney(subtotal + shippingCost);

        payBtn.classList.toggle("hidden", !loggedIn);
        loginLink.classList.toggle("hidden", loggedIn);
        payBtn.disabled = payable.length === 0;
    };

    if (options) {
        el<HTMLElement>("[data-shipping-price]").textContent = formatMoney(options.shipping.amount);
        el<HTMLElement>("[data-shipping-estimate]").textContent = options.shipping.estimate;
        el<HTMLElement>("[data-pickup-branch]").textContent =
            `${options.pickup.branch.name} — ${options.pickup.branch.address}`;
    }
    loginLink.href = `/login?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`;

    listBox.addEventListener("change", (event) => {
        const input = event.target as HTMLInputElement;
        const id = input.dataset.qtyFor;
        if (!id) return;
        lines = lines.map((l) =>
            l.productId === id ? { ...l, quantity: clampQuantity(Number(input.value), l.stock), note: null } : l,
        );
        const line = lines.find((l) => l.productId === id);
        if (mode === "cart" && line) cartStore.setQuantity(id, line.quantity);
        render();
    });
    listBox.addEventListener("click", (event) => {
        const btn = (event.target as HTMLElement).closest<HTMLElement>("[data-remove]");
        if (!btn) return;
        const id = btn.dataset.remove!;
        lines = lines.filter((l) => l.productId !== id);
        cartStore.remove(id);
        render();
    });
    document.querySelectorAll("input[name='fulfillment']").forEach((r) => r.addEventListener("change", render));

    payBtn.addEventListener("click", async () => {
        showError(null);
        const items = lines.filter((l) => l.available).map((l) => ({ productId: l.productId, quantity: l.quantity }));
        if (!items.length) {
            showError("Tu carrito está vacío.");
            return;
        }
        payBtn.disabled = true;
        payBtn.classList.add("loading");
        const result = await gateway.createSession({ items, fulfillment: fulfillment() });
        if (!result.ok) {
            payBtn.disabled = false;
            payBtn.classList.remove("loading");
            if (result.status === 401) {
                window.location.assign(loginLink.href);
                return;
            }
            showError(result.message);
            if (result.code === "insufficient_stock" || result.code === "product_unavailable") {
                lines = await revalidate(gateway, lines);
                render();
            }
            return;
        }
        rememberPendingCheckout(mode);
        window.location.assign(result.data.checkoutUrl);
    });

    render();
    root.dataset.ready = "true";
}
