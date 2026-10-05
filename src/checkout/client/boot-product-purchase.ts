import { clampQuantity } from "../domain/cart";
import { cartStore } from "./cart-store";

/** Botones "Agregar al carrito" y "Comprar ahora" en la página de producto. */
export function bootProductPurchase(): void {
    const box = document.querySelector<HTMLElement>("[data-purchase]");
    if (!box) return;
    const d = box.dataset;
    const stock = Number(d.stock ?? "0");
    const qtyInput = box.querySelector<HTMLInputElement>("[data-testid='product-qty']");
    const added = box.querySelector<HTMLElement>("[data-testid='added-to-cart']");
    const qty = () => clampQuantity(Number(qtyInput?.value ?? "1"), stock);

    box.querySelector("[data-testid='add-to-cart']")?.addEventListener("click", () => {
        cartStore.add({
            productId: d.productId!,
            slug: d.slug!,
            title: d.title!,
            price: Number(d.price),
            imageUrl: d.image || null,
            quantity: qty(),
        });
        added?.classList.remove("hidden");
    });

    box.querySelector("[data-testid='buy-now']")?.addEventListener("click", () => {
        window.location.assign(`/carrito?ahora=${encodeURIComponent(d.productId!)}&cantidad=${qty()}`);
    });
}
