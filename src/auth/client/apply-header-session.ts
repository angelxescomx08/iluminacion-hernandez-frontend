import {
    isAuthenticatedSession,
    type ClientSession,
} from "../domain/client-session";
import { initialsFromDisplayName, initialsFromEmail } from "./avatar-placeholder";

type SessionElements = {
    avatarImg: HTMLImageElement | null;
    avatarTrigger: HTMLElement | null;
    avatarFallback: HTMLElement | null;
    avatarInitials: HTMLElement | null;
    primaryLine: HTMLElement | null;
    menuTitle: HTMLElement | null;
    menuSubtitle: HTMLElement | null;
    itemLogin: HTMLElement | null;
    itemRegister: HTMLElement | null;
    itemPanel: HTMLElement | null;
    itemLogout: HTMLElement | null;
    desktopLogin: HTMLElement | null;
};

function queryGroup(root: ParentNode): SessionElements {
    return {
        avatarImg: root.querySelector("[data-session-avatar-img]"),
        avatarTrigger: root.querySelector("[data-session-avatar-trigger]"),
        avatarFallback: root.querySelector("[data-session-avatar-fallback]"),
        avatarInitials: root.querySelector("[data-session-avatar-initials]"),
        primaryLine: root.querySelector("[data-session-primary-line]"),
        menuTitle: root.querySelector("[data-session-menu-title]"),
        menuSubtitle: root.querySelector("[data-session-menu-subtitle]"),
        itemLogin: root.querySelector("[data-session-item-login]"),
        itemRegister: root.querySelector("[data-session-item-register]"),
        itemPanel: root.querySelector("[data-session-item-panel]"),
        itemLogout: root.querySelector("[data-session-item-logout]"),
        desktopLogin: root.querySelector("[data-session-desktop-login]"),
    };
}

function setHidden(el: HTMLElement | null, hidden: boolean) {
    if (!el) {
        return;
    }
    el.classList.toggle("hidden", hidden);
    if (hidden) {
        el.setAttribute("aria-hidden", "true");
    } else {
        el.removeAttribute("aria-hidden");
    }
}

function initialsForSession(session: ClientSession): string {
    if (!isAuthenticatedSession(session)) {
        return "?";
    }
    const { displayName, email } = session.user;
    const fromName = initialsFromDisplayName(displayName);
    if (fromName && fromName !== "?") {
        return fromName;
    }
    if (email) {
        return initialsFromEmail(email);
    }
    return "?";
}

function bindAvatar(
    els: SessionElements,
    session: ClientSession,
    avatarAlt: string,
) {
    const { avatarImg, avatarFallback, avatarInitials } = els;
    if (!avatarFallback || !avatarInitials) {
        return;
    }

    avatarInitials.textContent = initialsForSession(session);

    if (!isAuthenticatedSession(session)) {
        if (avatarImg) {
            avatarImg.onload = null;
            avatarImg.onerror = null;
            avatarImg.removeAttribute("src");
            avatarImg.alt = "";
            setHidden(avatarImg, true);
        }
        avatarFallback.classList.remove("bg-amber-100", "text-amber-800");
        avatarFallback.classList.add("bg-neutral-200", "text-neutral-600");
        setHidden(avatarFallback, false);
        return;
    }

    const url = session.user.imageUrl;
    if (!url || !avatarImg) {
        if (avatarImg) {
            avatarImg.onload = null;
            avatarImg.onerror = null;
            avatarImg.removeAttribute("src");
            avatarImg.alt = "";
            setHidden(avatarImg, true);
        }
        avatarFallback.classList.remove("bg-neutral-200", "text-neutral-600");
        avatarFallback.classList.add("bg-amber-100", "text-amber-800");
        setHidden(avatarFallback, false);
        return;
    }

    setHidden(avatarImg, true);
    setHidden(avatarFallback, false);
    avatarFallback.classList.remove("bg-neutral-200", "text-neutral-600");
    avatarFallback.classList.add("bg-amber-100", "text-amber-800");

    avatarImg.alt = avatarAlt;
    avatarImg.onload = () => {
        setHidden(avatarImg, false);
        setHidden(avatarFallback, true);
    };
    avatarImg.onerror = () => {
        avatarImg.onload = null;
        avatarImg.onerror = null;
        avatarImg.removeAttribute("src");
        setHidden(avatarImg, true);
        avatarFallback.classList.remove("bg-neutral-200", "text-neutral-600");
        avatarFallback.classList.add("bg-amber-100", "text-amber-800");
        setHidden(avatarFallback, false);
    };

    avatarImg.src = url;
    if (avatarImg.complete && avatarImg.naturalWidth > 0) {
        setHidden(avatarImg, false);
        setHidden(avatarFallback, true);
    }
}

function applyNavGroup(els: SessionElements, session: ClientSession) {
    const auth = isAuthenticatedSession(session);

    setHidden(els.desktopLogin, auth);
    setHidden(els.itemLogin, auth);
    setHidden(els.itemRegister, auth);
    setHidden(els.itemPanel, !auth);
    setHidden(els.itemLogout, !auth);

    if (els.menuTitle) {
        els.menuTitle.textContent = auth
            ? session.user.displayName
            : "Modo invitado";
    }

    if (els.menuSubtitle) {
        if (auth) {
            els.menuSubtitle.textContent =
                session.user.email ?? "Cuenta conectada";
        } else {
            els.menuSubtitle.textContent = "Inicia sesión para guardar preferencias";
        }
    }

    if (els.primaryLine) {
        els.primaryLine.textContent = auth
            ? session.user.displayName
            : "Invitado";
    }

    if (els.avatarTrigger) {
        els.avatarTrigger.setAttribute(
            "aria-label",
            auth
                ? `Menú de cuenta: ${session.user.displayName}`
                : "Menú de cuenta: invitado",
        );
    }

    const avatarAlt = auth
        ? `Avatar de ${session.user.displayName}`
        : "Invitado";
    bindAvatar(els, session, avatarAlt);
}

export function applyHeaderSessionToDocument(session: ClientSession) {
    const nav = document.querySelector("[data-header-session-nav]");
    const drawer = document.querySelector("[data-header-session-drawer]");

    if (nav instanceof HTMLElement) {
        applyNavGroup(queryGroup(nav), session);
    }
    if (drawer instanceof HTMLElement) {
        applyNavGroup(queryGroup(drawer), session);
    }

    const live = document.querySelector("[data-session-live]");
    if (live instanceof HTMLElement) {
        live.textContent = isAuthenticatedSession(session)
            ? `Conectado como ${session.user.displayName}`
            : "Navegando como invitado";
    }
}
