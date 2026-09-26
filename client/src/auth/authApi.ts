export type AuthUser = {
    id: string;
    name: string;
    email: string;
    role: string;
};

export type AuthResponse = {
    token: string;
    user: AuthUser;
};

type RegisterCredentials = {
    name: string;
    email: string;
    password: string;
};

type LoginCredentials = {
    email: string;
    password: string;
};

const AUTH_API_URL = '/api/auth';

async function postAuthRequest(
    endpoint: 'signup' | 'login',
    credentials: RegisterCredentials | LoginCredentials,
): Promise<AuthResponse> {
    let response: Response;

    try {
        response = await fetch(`${AUTH_API_URL}/${endpoint}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(credentials),
        });
    } catch {
        throw new Error('Unable to reach the authentication server. Check your connection and try again.');
    }

    let data: unknown;
    try {
        data = await response.json();
    } catch {
        throw new Error('The authentication server returned an invalid response.');
    }

    if (!response.ok) {
        if (
            typeof data === 'object' &&
            data !== null &&
            'error' in data &&
            typeof data.error === 'string'
        ) {
            throw new Error(data.error);
        }

        throw new Error('Authentication failed. Please try again.');
    }

    if (
        typeof data !== 'object' ||
        data === null ||
        !('token' in data) ||
        typeof data.token !== 'string' ||
        !('user' in data) ||
        typeof data.user !== 'object' ||
        data.user === null
    ) {
        throw new Error('The authentication server returned an invalid response.');
    }

    return data as AuthResponse;
}

export function register(credentials: RegisterCredentials): Promise<AuthResponse> {
    return postAuthRequest('signup', credentials);
}

export function login(credentials: LoginCredentials): Promise<AuthResponse> {
    return postAuthRequest('login', credentials);
}