/** Línea del carrito guardada en el navegador (se revalida contra el API antes de pagar). */
export type CartLine = {
    productId: string;
    slug: string;
    title: string;
    /** Precio unitario en pesos al momento de agregar (el cobro real lo calcula el backend). */
    price: number;
    imageUrl: string | null;
    quantity: number;
};

export type Cart = { lines: CartLine[] };

export const MAX_QTY_PER_ITEM = 10;

export function clampQuantity(qty: number, stock?: number | null): number {
    const max = Math.min(MAX_QTY_PER_ITEM, stock ?? MAX_QTY_PER_ITEM);
    if (!Number.isFinite(qty)) return 1;
    return Math.max(1, Math.min(Math.floor(qty), Math.max(max, 1)));
}

export function addLine(cart: Cart, line: CartLine): Cart {
    const existing = cart.lines.find((l) => l.productId === line.productId);
    if (existing) {
        return {
            lines: cart.lines.map((l) =>
                l.productId === line.productId
                    ? { ...l, ...line, quantity: clampQuantity(l.quantity + line.quantity) }
                    : l,
            ),
        };
    }
    return { lines: [...cart.lines, { ...line, quantity: clampQuantity(line.quantity) }] };
}

export function setQuantity(cart: Cart, productId: string, quantity: number): Cart {
    return {
        lines: cart.lines.map((l) =>
            l.productId === productId ? { ...l, quantity: clampQuantity(quantity) } : l,
        ),
    };
}

export function removeLine(cart: Cart, productId: string): Cart {
    return { lines: cart.lines.filter((l) => l.productId !== productId) };
}

export function cartCount(cart: Cart): number {
    return cart.lines.reduce((n, l) => n + l.quantity, 0);
}

export function cartSubtotal(cart: Cart): number {
    return cart.lines.reduce((sum, l) => sum + l.price * l.quantity, 0);
}

export function formatMoney(amount: number | string): string {
    return `$${Number(amount).toLocaleString("es-MX", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    })}`;
}
