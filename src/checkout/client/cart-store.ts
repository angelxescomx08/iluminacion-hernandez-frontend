import {
    addLine,
    type Cart,
    type CartLine,
    cartCount,
    removeLine,
    setQuantity,
} from "../domain/cart";

const STORAGE_KEY = "ih:cart:v1";
export const CART_CHANGED_EVENT = "ih:cart-changed";

function read(): Cart {
    try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        if (!raw) return { lines: [] };
        const parsed = JSON.parse(raw) as Cart;
        return Array.isArray(parsed?.lines) ? parsed : { lines: [] };
    } catch {
        return { lines: [] };
    }
}

function write(cart: Cart): void {
    try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(cart));
    } catch {
        // Modo privado o almacenamiento bloqueado: el carrito vive solo en esta pestaña.
    }
    window.dispatchEvent(new CustomEvent(CART_CHANGED_EVENT, { detail: { count: cartCount(cart) } }));
}

export const cartStore = {
    get: read,
    add(line: CartLine): Cart {
        const next = addLine(read(), line);
        write(next);
        return next;
    },
    setQuantity(productId: string, quantity: number): Cart {
        const next = setQuantity(read(), productId, quantity);
        write(next);
        return next;
    },
    remove(productId: string): Cart {
        const next = removeLine(read(), productId);
        write(next);
        return next;
    },
    replace(cart: Cart): void {
        write(cart);
    },
    clear(): void {
        write({ lines: [] });
    },
    count(): number {
        return cartCount(read());
    },
};

/** Recuerda qué se estaba pagando, para vaciar el carrito solo si se pagó el carrito (no un "Comprar ahora"). */
const PENDING_KEY = "ih:checkout-pending";

export function rememberPendingCheckout(mode: "cart" | "buy-now"): void {
    try {
        window.sessionStorage.setItem(PENDING_KEY, mode);
    } catch {}
}

export function takePendingCheckout(): "cart" | "buy-now" | null {
    try {
        const v = window.sessionStorage.getItem(PENDING_KEY);
        window.sessionStorage.removeItem(PENDING_KEY);
        return v === "cart" || v === "buy-now" ? v : null;
    } catch {
        return null;
    }
}
