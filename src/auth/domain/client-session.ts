export type GuestClientSession = {
    kind: "guest";
};

export type AuthenticatedClientSession = {
    kind: "authenticated";
    user: PublicUserProfile;
};

export type PublicUserProfile = {
    displayName: string;
    email: string | null;
    /** URL de imagen del proveedor (p. ej. Google); null si no hay. */
    imageUrl: string | null;
};

export type ClientSession = GuestClientSession | AuthenticatedClientSession;

export function isAuthenticatedSession(
    session: ClientSession,
): session is AuthenticatedClientSession {
    return session.kind === "authenticated";
}
