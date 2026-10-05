import { createHmac } from "node:crypto";
import { E2E } from "./env";

/** Llamadas directas al API de Stripe en MODO PRUEBA (lo que harías desde el Dashboard). */
export async function stripeApi<T = Record<string, unknown>>(
    method: "GET" | "POST",
    path: string,
    form?: Record<string, string>,
): Promise<T> {
    const res = await fetch(`https://api.stripe.com/v1${path}`, {
        method,
        headers: {
            Authorization: `Bearer ${E2E.stripeSecretKey}`,
            ...(form ? { "Content-Type": "application/x-www-form-urlencoded" } : {}),
        },
        body: form ? new URLSearchParams(form).toString() : undefined,
    });
    const body = (await res.json()) as T & { error?: { message: string } };
    if (!res.ok) throw new Error(`Stripe ${method} ${path}: ${body.error?.message ?? res.status}`);
    return body;
}

/** Reembolso desde "el Dashboard": total si no se indica monto (en pesos). */
export function refund(paymentIntentId: string, amountPesos?: number) {
    return stripeApi("POST", "/refunds", {
        payment_intent: paymentIntentId,
        ...(amountPesos ? { amount: String(Math.round(amountPesos * 100)) } : {}),
    });
}

/** Expira una sesión abierta, igual que hace Stripe cuando pasan los 30 minutos. */
export function expireSession(sessionId: string) {
    return stripeApi("POST", `/checkout/sessions/${sessionId}/expire`);
}

/** Busca el evento `checkout.session.completed` de una sesión (Stripe tarda unos segundos en listarlo). */
export async function findCompletedEvent(sessionId: string): Promise<Record<string, unknown>> {
    for (let i = 0; i < 20; i++) {
        const list = await stripeApi<{ data: Array<{ id: string; data: { object: { id: string } } }> }>(
            "GET",
            "/events?type=checkout.session.completed&limit=50",
        );
        const event = list.data.find((e) => e.data.object.id === sessionId);
        if (event) return event as unknown as Record<string, unknown>;
        await new Promise((r) => setTimeout(r, 1000));
    }
    throw new Error(`No se encontró checkout.session.completed para ${sessionId}`);
}

/** Firma un payload como lo hace Stripe (cabecera Stripe-Signature, esquema v1). */
export function signWebhookPayload(payload: string, secret: string): string {
    const timestamp = Math.floor(Date.now() / 1000);
    const signature = createHmac("sha256", secret).update(`${timestamp}.${payload}`).digest("hex");
    return `t=${timestamp},v1=${signature}`;
}
