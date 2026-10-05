import { randomUUID } from "node:crypto";
import pg from "pg";
import { E2E } from "./env";

/** Productos de prueba. Los IDs de Stripe son fijos para reutilizarlos entre corridas (modo prueba). */
export const SEED_PRODUCTS = [
    { key: "a", stripeId: "e2e_ventilador_a", slug: "e2e-ventilador-greco", title: "E2E Ventilador Greco 56\"", price: 639, stock: 50, active: true },
    { key: "b", stripeId: "e2e_ventilador_b", slug: "e2e-ventilador-samba", title: "E2E Ventilador Samba 42\"", price: 1139, stock: 20, active: true },
    { key: "c", stripeId: "e2e_ventilador_c", slug: "e2e-ventilador-ultima-pieza", title: "E2E Ventilador Última pieza", price: 1269, stock: 1, active: true },
    { key: "d", stripeId: "e2e_ventilador_d", slug: "e2e-ventilador-agotado", title: "E2E Ventilador Agotado", price: 1649, stock: 0, active: true },
    { key: "e", stripeId: "e2e_ventilador_e", slug: "e2e-ventilador-inactivo", title: "E2E Ventilador Inactivo", price: 1899, stock: 5, active: false },
    { key: "f", stripeId: "e2e_ventilador_f", slug: "e2e-ventilador-tornado", title: "E2E Ventilador Tornado 52\"", price: 2029, stock: 8, active: true },
    { key: "g", stripeId: "e2e_ventilador_g", slug: "e2e-ventilador-feria", title: "E2E Ventilador Feria 50\"", price: 2669, stock: 8, active: true },
    { key: "h", stripeId: "e2e_ventilador_h", slug: "e2e-ventilador-santana", title: "E2E Ventilador Santana 56\"", price: 3809, stock: 8, active: true },
    { key: "i", stripeId: "e2e_ventilador_i", slug: "e2e-ventilador-bela", title: "E2E Ventilador Bela 44\"", price: 2279, stock: 8, active: true },
    { key: "j", stripeId: "e2e_ventilador_j", slug: "e2e-ventilador-lugo", title: "E2E Ventilador Lugo 44\"", price: 2279, stock: 8, active: true },
    { key: "k", stripeId: "e2e_ventilador_k", slug: "e2e-ventilador-kari", title: "E2E Ventilador Kari 52\"", price: 1899, stock: 8, active: true },
    { key: "l", stripeId: "e2e_ventilador_l", slug: "e2e-ventilador-passat", title: "E2E Ventilador Passat 54\"", price: 2919, stock: 8, active: true },
    { key: "m", stripeId: "e2e_ventilador_m", slug: "e2e-ventilador-altano", title: "E2E Ventilador Altano 52\"", price: 2539, stock: 8, active: true },
    { key: "n", stripeId: "e2e_ventilador_n", slug: "e2e-ventilador-fenix", title: "E2E Ventilador Fénix 52\"", price: 2539, stock: 8, active: true },
    { key: "o", stripeId: "e2e_ventilador_o", slug: "e2e-ventilador-ciclon", title: "E2E Ventilador Ciclón 52\"", price: 2279, stock: 8, active: true },
] as const;

export type SeedKey = (typeof SEED_PRODUCTS)[number]["key"];

async function stripe(method: "GET" | "POST", path: string, form?: Record<string, string>) {
    const res = await fetch(`https://api.stripe.com/v1${path}`, {
        method,
        headers: {
            Authorization: `Bearer ${E2E.stripeSecretKey}`,
            ...(form ? { "Content-Type": "application/x-www-form-urlencoded" } : {}),
        },
        body: form ? new URLSearchParams(form).toString() : undefined,
    });
    const body = (await res.json()) as Record<string, unknown>;
    return { status: res.status, body };
}

/** Devuelve el price id del producto de prueba en Stripe, creándolo si no existe o si cambió el precio. */
async function ensureStripeProduct(p: (typeof SEED_PRODUCTS)[number]): Promise<string> {
    const existing = await stripe("GET", `/products/${p.stripeId}?expand[]=default_price`);
    if (existing.status === 200) {
        const price = existing.body.default_price as { id: string; unit_amount: number; active: boolean } | null;
        if (price && price.unit_amount === p.price * 100 && price.active) return price.id;
        const newPrice = await stripe("POST", "/prices", {
            product: p.stripeId,
            currency: "mxn",
            unit_amount: String(p.price * 100),
        });
        await stripe("POST", `/products/${p.stripeId}`, { default_price: String(newPrice.body.id), active: "true" });
        return String(newPrice.body.id);
    }
    const created = await stripe("POST", "/products", {
        id: p.stripeId,
        name: p.title,
        "metadata[e2e]": "true",
        "default_price_data[currency]": "mxn",
        "default_price_data[unit_amount]": String(p.price * 100),
    });
    if (created.status !== 200) throw new Error(`No se pudo crear ${p.stripeId} en Stripe: ${JSON.stringify(created.body)}`);
    return String(created.body.default_price);
}

export async function seedProducts(): Promise<Record<SeedKey, string>> {
    const db = new pg.Client({ connectionString: E2E.databaseUrl });
    await db.connect();
    const ids = {} as Record<SeedKey, string>;
    try {
        for (const p of SEED_PRODUCTS) {
            const priceId = await ensureStripeProduct(p);
            const id = randomUUID();
            await db.query(
                `insert into products (id, title, slug, description, characteristics, price, stock, is_active, stripe_product_id, stripe_price_id)
                 values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
                [id, p.title, p.slug, "Producto de prueba E2E.", "Marca: Coolfan", p.price, p.stock, p.active, p.stripeId, priceId],
            );
            await db.query(
                `insert into product_images (id, product_id, url, is_main, sort_order) values ($1, $2, $3, true, 0)`,
                [randomUUID(), id, `https://placehold.co/600x600/png?text=${encodeURIComponent(p.key.toUpperCase())}`],
            );
            ids[p.key] = id;
        }
    } finally {
        await db.end();
    }
    return ids;
}
