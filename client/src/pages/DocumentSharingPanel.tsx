import { useEffect, useState } from 'react';
import { getAuthSession } from '../auth/authStorage';
import './DocumentSharingPanel.css';

type DocumentGrant = {
    userId: string;
    name: string;
    email: string;
    permission: 'editor' | 'viewer';
    createdAt: number;
};

type DocumentSharingPanelProps = {
    docId: string;
};

export default function DocumentSharingPanel({ docId }: DocumentSharingPanelProps) {
    const [grants, setGrants] = useState<DocumentGrant[]>([]);
    const [email, setEmail] = useState('');
    const [permission, setPermission] = useState<'editor' | 'viewer'>('viewer');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const controller = new AbortController();
        const token = getAuthSession()?.token;
        fetch(`/api/documents/${encodeURIComponent(docId)}/permissions`, {
            headers: token ? { Authorization: `Bearer ${token}` } : {},
            signal: controller.signal,
        })
            .then(async (response) => {
                if (!response.ok) throw new Error('Unable to load document access.');
                return response.json() as Promise<DocumentGrant[]>;
            })
            .then(setGrants)
            .catch((loadError: unknown) => {
                if (!controller.signal.aborted) {
                    setError(loadError instanceof Error ? loadError.message : 'Unable to load document access.');
                }
            })
            .finally(() => {
                if (!controller.signal.aborted) setLoading(false);
            });

        return () => controller.abort();
    }, [docId]);

    async function grantAccess(event: React.FormEvent<HTMLFormElement>): Promise<void> {
        event.preventDefault();
        setSaving(true);
        setError(null);
        try {
            const token = getAuthSession()?.token;
            const response = await fetch(`/api/documents/${encodeURIComponent(docId)}/permissions`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                },
                body: JSON.stringify({ email: email.trim(), permission }),
            });
            const message = await response.json().catch(() => null) as { error?: string } | null;
            if (!response.ok) throw new Error(message?.error ?? 'Unable to grant document access.');
            const grant = message as DocumentGrant;
            setGrants((current) => [...current.filter((item) => item.userId !== grant.userId), grant]);
            setEmail('');
        } catch (saveError: unknown) {
            setError(saveError instanceof Error ? saveError.message : 'Unable to grant document access.');
        } finally {
            setSaving(false);
        }
    }

    async function revokeAccess(userId: string): Promise<void> {
        setSaving(true);
        setError(null);
        try {
            const token = getAuthSession()?.token;
            const response = await fetch(
                `/api/documents/${encodeURIComponent(docId)}/permissions/${encodeURIComponent(userId)}`,
                {
                    method: 'DELETE',
                    headers: token ? { Authorization: `Bearer ${token}` } : {},
                },
            );
            if (!response.ok) throw new Error('Unable to revoke document access.');
            setGrants((current) => current.filter((grant) => grant.userId !== userId));
        } catch (revokeError: unknown) {
            setError(revokeError instanceof Error ? revokeError.message : 'Unable to revoke document access.');
        } finally {
            setSaving(false);
        }
    }

    return (
        <details className="document-sharing-panel">
            <summary>Share document</summary>
            <form className="document-sharing-form" onSubmit={grantAccess}>
                <label>
                    <span>Account email</span>
                    <input
                        type="email"
                        required
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                        placeholder="person@example.com"
                    />
                </label>
                <label>
                    <span>Permission</span>
                    <select
                        value={permission}
                        onChange={(event) => setPermission(event.target.value as 'editor' | 'viewer')}
                    >
                        <option value="viewer">Viewer</option>
                        <option value="editor">Editor</option>
                    </select>
                </label>
                <button type="submit" disabled={saving}>{saving ? 'Saving...' : 'Grant access'}</button>
            </form>
            {error && <p className="document-sharing-error" role="alert">{error}</p>}
            <div className="document-sharing-grants">
                <h3>People with access</h3>
                {loading ? (
                    <p>Loading access list...</p>
                ) : grants.length === 0 ? (
                    <p>No additional users have access.</p>
                ) : (
                    <ul>
                        {grants.map((grant) => (
                            <li key={grant.userId}>
                                <span><strong>{grant.name}</strong> · {grant.email} · {grant.permission}</span>
                                <button type="button" disabled={saving} onClick={() => void revokeAccess(grant.userId)}>
                                    Revoke
                                </button>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </details>
    );
}
