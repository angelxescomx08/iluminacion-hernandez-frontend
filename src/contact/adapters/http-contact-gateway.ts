import type { ContactMessageInput } from "../domain/contact-message";
import {
    contactFailure,
    contactSuccess,
    extractContactErrorMessage,
    type ContactResult,
} from "../domain/contact-result";
import type { ContactGatewayPort } from "../ports/contact-gateway.port";

const JSON_HEADERS = {
    "Content-Type": "application/json",
} as const;

async function readJsonSafe(response: Response): Promise<unknown> {
    const text = await response.text();
    if (!text) {
        return null;
    }
    try {
        return JSON.parse(text) as unknown;
    } catch {
        return text;
    }
}

export function createHttpContactGateway(apiBaseUrl: string): ContactGatewayPort {
    const base = apiBaseUrl.replace(/\/$/, "");

    return {
        async sendMessage(input: ContactMessageInput): Promise<ContactResult> {
            const response = await fetch(`${base}/api/v1/contact`, {
                method: "POST",
                headers: JSON_HEADERS,
                body: JSON.stringify(input),
            });
            const payload = await readJsonSafe(response);
            if (response.ok) {
                return contactSuccess();
            }
            const message = extractContactErrorMessage(
                payload,
                response.statusText || "No se pudo enviar tu mensaje",
            );
            return contactFailure(response.status, message);
        },
    };
}
