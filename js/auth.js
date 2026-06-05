/**
 * auth.js — SalaSphere v2 Auth Helpers (shared across all pages)
 *
 * Provides: saveSession, getSession, clearSession, guardRoute,
 *           getCurrentUser, isAdmin, and API_BASE constant.
 */

const API_BASE = "http://127.0.0.1:5000";
const SESSION_KEY = "salasphere_session";

/**
 * Save user session to localStorage after login/register.
 * @param {{ id, nome, email, role, token }} userData
 */
function saveSession(userData) {
    localStorage.setItem(SESSION_KEY, JSON.stringify(userData));
}

/**
 * Get current session object or null if not logged in.
 * @returns {{ id, nome, email, role, token } | null}
 */
function getSession() {
    try {
        const raw = localStorage.getItem(SESSION_KEY);
        return raw ? JSON.parse(raw) : null;
    } catch {
        return null;
    }
}

/** Clear session (logout). */
function clearSession() {
    localStorage.removeItem(SESSION_KEY);
}

/** Helper function to redirect to login page (home) based on path location */
function redirectLogin() {
    const path = window.location.pathname;
    if (path.includes("/dashboard/") || path.includes("/salas/")) {
        window.location.replace("../home/index.html");
    } else if (path.includes("/home/")) {
        // Já está na home
    } else {
        // Raiz do projeto
        window.location.replace("home/index.html");
    }
}

/**
 * Guard a protected page: redirects to login if not logged in.
 * Call at the TOP of protected pages before DOMContentLoaded.
 */
function guardRoute() {
    if (!getSession()) {
        redirectLogin();
    }
}

/**
 * Get the current logged-in user object.
 * @returns {{ id, nome, email, role, token } | null}
 */
function getCurrentUser() {
    return getSession();
}

/**
 * Check whether the current user has the admin role.
 * @returns {boolean}
 */
function isAdmin() {
    const u = getSession();
    return u ? u.role === "admin" : false;
}

/**
 * Build a user avatar initials string (up to 2 chars).
 * @param {string} nome
 * @returns {string}
 */
function userInitials(nome) {
    if (!nome) return "?";
    const parts = nome.trim().split(" ");
    if (parts.length === 1) return parts[0][0].toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/**
 * Universal showAlert for toast notifications.
 * Uses #alert-container if present in the DOM.
 * @param {string} message
 * @param {"success"|"danger"|"warning"} type
 * @param {number} [duration=4000]
 */
function showAlert(message, type = "success", duration = 4000) {
    let container = document.getElementById("alert-container");
    if (!container) {
        container = document.createElement("div");
        container.id = "alert-container";
        document.body.appendChild(container);
    }

    const iconMap = {
        success: '<i class="bi bi-check-circle-fill me-2 fs-6" aria-hidden="true"></i>',
        danger: '<i class="bi bi-exclamation-triangle-fill me-2 fs-6" aria-hidden="true"></i>',
        warning: '<i class="bi bi-exclamation-circle-fill me-2 fs-6" aria-hidden="true"></i>',
    };

    const div = document.createElement("div");
    div.className = `custom-alert custom-alert-${type}`;
    div.setAttribute("role", "status");
    div.setAttribute("aria-live", "polite");
    div.innerHTML = `${iconMap[type] || ""}<div class="flex-grow-1">${message}</div>`;

    container.appendChild(div);

    setTimeout(() => {
        div.style.opacity = "0";
        div.style.transform = "translateY(-10px)";
        div.style.transition = "all 0.3s ease";
        setTimeout(() => div.remove(), 300);
    }, duration);
}

// ─── Fetch Timezone Interceptor ───────────────────────────────────────────────
(function () {
    const originalFetch = window.fetch;
    window.fetch = async function (resource, options = {}) {
        options.headers = options.headers || {};
        const userTz = Intl.DateTimeFormat().resolvedOptions().timeZone || "America/Sao_Paulo";

        if (options.headers instanceof Headers) {
            if (!options.headers.has("X-Timezone")) {
                options.headers.append("X-Timezone", userTz);
            }
        } else if (Array.isArray(options.headers)) {
            const hasTz = options.headers.some(([key]) => key.toLowerCase() === "x-timezone");
            if (!hasTz) {
                options.headers.push(["X-Timezone", userTz]);
            }
        } else {
            const hasTz = Object.keys(options.headers).some((key) => key.toLowerCase() === "x-timezone");
            if (!hasTz) {
                options.headers["X-Timezone"] = userTz;
            }
        }
        return originalFetch(resource, options);
    };
})();
