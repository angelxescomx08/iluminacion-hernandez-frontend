import type { ContactMessageInput } from "../domain/contact-message";
import type { ContactResult } from "../domain/contact-result";

export interface ContactGatewayPort {
    sendMessage(input: ContactMessageInput): Promise<ContactResult>;
}
