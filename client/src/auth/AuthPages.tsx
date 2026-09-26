import { useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import './AuthPages.css';

type AuthFrameProps = {
    mode: 'login' | 'signup';
    title: string;
    description: string;
    children: ReactNode;
};

function AuthFrame({ mode, title, description, children }: AuthFrameProps) {
    const isLogin = mode === 'login';

    return (
        <div className="auth-page">
            <header className="topbar">
                <a className="brand" href="/" aria-label="Collaborative Editor home">
                    <span className="brand-mark" aria-hidden="true">
                        C
                    </span>
                    <span>Collaborative Editor</span>
                </a>
                <a className="auth-nav-link" href={isLogin ? '/signup' : '/login'}>
                    {isLogin ? 'Create account' : 'Log in'}
                </a>
            </header>

            <main className="auth-main">
                <div className="auth-heading">
                    <p className="eyebrow">ACCOUNT ACCESS</p>
                    <h1>{title}</h1>
                    <p className="auth-description">{description}</p>
                </div>
                <section className="auth-panel" aria-label={title}>
                    {children}
                </section>
                <p className="auth-switch">
                    {isLogin ? 'New to Collaborative Editor?' : 'Already have an account?'}{' '}
                    <a href={isLogin ? '/signup' : '/login'}>
                        {isLogin ? 'Sign up' : 'Log in'}
                    </a>
                </p>
            </main>
        </div>
    );
}

function AuthField({
    label,
    name,
    type = 'text',
    autoComplete,
}: {
    label: string;
    name: string;
    type?: string;
    autoComplete: string;
}) {
    return (
        <label className="auth-field">
            <span>{label}</span>
            <input
                type={type}
                name={name}
                autoComplete={autoComplete}
                required
            />
        </label>
    );
}

export function LoginPage() {
    const [message, setMessage] = useState('');

    function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setMessage('Login will be connected to the authentication API.');
    }

    return (
        <AuthFrame
            mode="login"
            title="Welcome back"
            description="Log in to continue to your documents."
        >
            <form className="auth-form" onSubmit={handleSubmit}>
                <AuthField label="Email" name="email" type="email" autoComplete="email" />
                <AuthField
                    label="Password"
                    name="password"
                    type="password"
                    autoComplete="current-password"
                />
                <button className="auth-submit" type="submit">
                    Log in
                </button>
                {message && <p className="auth-message" role="status">{message}</p>}
            </form>
        </AuthFrame>
    );
}

export function SignUpPage() {
    const [message, setMessage] = useState('');

    function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);

        if (formData.get('password') !== formData.get('confirmPassword')) {
            setMessage('Passwords do not match.');
            return;
        }

        setMessage('Sign up will be connected to the authentication API.');
    }

    return (
        <AuthFrame
            mode="signup"
            title="Create your account"
            description="Set up an account to start collaborating."
        >
            <form className="auth-form" onSubmit={handleSubmit}>
                <AuthField label="Name" name="name" autoComplete="name" />
                <AuthField label="Email" name="email" type="email" autoComplete="email" />
                <AuthField
                    label="Password"
                    name="password"
                    type="password"
                    autoComplete="new-password"
                />
                <AuthField
                    label="Confirm password"
                    name="confirmPassword"
                    type="password"
                    autoComplete="new-password"
                />
                <button className="auth-submit" type="submit">
                    Create account
                </button>
                {message && <p className="auth-message" role="status">{message}</p>}
            </form>
        </AuthFrame>
    );
}