export type CheckoutOptions = {
    currency: string;
    shipping: { amount: string; label: string; estimate: string };
    pickup: { amount: string; label: string; branch: { name: string; address: string } };
    maxQuantityPerItem: number;
};

export type OrderView = {
    id: string;
    code: string;
    status: "pending" | "paid" | "canceled" | "expired";
    fulfillmentMethod: "shipping" | "pickup";
    pickupBranch: string | null;
    shippingAddress: string | null;
    subtotal: string;
    shipping: string;
    total: string;
    currency: string;
    paidAt: string | null;
    createdAt: string | null;
    items: Array<{ productId: string; title: string | null; quantity: number; unitPrice: string | null }>;
};

export type ApiProduct = {
    id: string;
    slug: string;
    title: string;
    price: string;
    stock: number;
    isActive: boolean;
    images: Array<{ url: string; isMain: boolean }>;
};

export type GatewayResult<T> =
    | { ok: true; data: T }
    | { ok: false; status: number; message: string; code: string | null };

async function call<T>(base: string, path: string, init?: RequestInit): Promise<GatewayResult<T>> {
    try {
        const response = await fetch(`${base}${path}`, {
            credentials: "include",
            ...init,
            headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
        });
        const text = await response.text();
        const body = text ? (JSON.parse(text) as unknown) : null;
        if (response.ok) return { ok: true, data: body as T };
        const record = (body ?? {}) as { error?: unknown; code?: unknown };
        return {
            ok: false,
            status: response.status,
            message: typeof record.error === "string" ? record.error : "No se pudo completar la operación",
            code: typeof record.code === "string" ? record.code : null,
        };
    } catch {
        return { ok: false, status: 0, message: "Sin conexión con el servidor. Intenta de nuevo.", code: "network" };
    }
}

export function createHttpCheckoutGateway(apiBaseUrl: string) {
    const base = apiBaseUrl.replace(/\/$/, "");
    return {
        options: () => call<CheckoutOptions>(base, "/api/v1/checkout/options"),
        product: (id: string) => call<ApiProduct>(base, `/api/v1/products/${encodeURIComponent(id)}`),
        createSession: (input: {
            items: Array<{ productId: string; quantity: number }>;
            fulfillment: "shipping" | "pickup";
        }) =>
            call<{ orderId: string; checkoutSessionId: string; checkoutUrl: string }>(
                base,
                "/api/v1/checkout/sessions",
                { method: "POST", body: JSON.stringify(input) },
            ),
        session: (sessionId: string) =>
            call<OrderView>(base, `/api/v1/checkout/sessions/${encodeURIComponent(sessionId)}`),
        cancel: (orderId: string) =>
            call<OrderView>(base, `/api/v1/checkout/orders/${encodeURIComponent(orderId)}/cancel`, {
                method: "POST",
                body: "{}",
            }),
        isLoggedIn: async () => {
            const r = await call<{ user?: { id?: string } } | null>(base, "/api/v1/auth/session");
            return r.ok && Boolean(r.data?.user?.id);
        },
    };
}

export type CheckoutGateway = ReturnType<typeof createHttpCheckoutGateway>;

export function tryCreateBrowserCheckoutGateway(): CheckoutGateway | null {
    const baseUrl = import.meta.env.PUBLIC_API_URL;
    if (typeof baseUrl !== "string" || !baseUrl.trim()) return null;
    return createHttpCheckoutGateway(baseUrl.trim());
}
