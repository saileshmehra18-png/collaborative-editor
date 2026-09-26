import type { AuthResponse, AuthUser } from './authApi';

const AUTH_STORAGE_KEY = 'collaborative-editor.auth';

export type AuthSession = {
    token: string;
    user: AuthUser;
};

export function storeAuthSession(session: AuthResponse): void {
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
}

export function getAuthSession(): AuthSession | null {
    const storedSession = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!storedSession) {
        return null;
    }

    try {
        return JSON.parse(storedSession) as AuthSession;
    } catch {
        localStorage.removeItem(AUTH_STORAGE_KEY);
        return null;
    }
}

export function clearAuthSession(): void {
    localStorage.removeItem(AUTH_STORAGE_KEY);
}