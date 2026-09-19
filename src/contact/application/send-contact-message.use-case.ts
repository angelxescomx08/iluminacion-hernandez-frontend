import type { ContactMessageInput } from "../domain/contact-message";
import { contactFailure, type ContactResult } from "../domain/contact-result";
import type { ContactGatewayPort } from "../ports/contact-gateway.port";

export async function sendContactMessage(
    gateway: ContactGatewayPort,
    input: ContactMessageInput,
): Promise<ContactResult> {
    const nombre = input.nombre.trim();
    const telefono = input.telefono.trim();
    const email = input.email.trim();

    if (!nombre) {
        return contactFailure(400, "El nombre completo es obligatorio.");
    }
    if (!telefono) {
        return contactFailure(400, "El teléfono celular es obligatorio.");
    }
    if (!email) {
        return contactFailure(400, "El correo electrónico es obligatorio.");
    }

    return gateway.sendMessage({
        nombre,
        telefono,
        email,
        mensaje: input.mensaje?.trim() || undefined,
    });
}
