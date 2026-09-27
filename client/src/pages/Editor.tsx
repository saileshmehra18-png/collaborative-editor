import { useCallback, useEffect, useState } from 'react';
import type { JSONContent } from '@tiptap/core';
import { useNavigate, useParams } from 'react-router-dom';
import { API_BASE } from '../config';
import { getAuthSession, clearAuthSession } from '../auth/authStorage';
import type { EditorDiagnostics } from '../TiptapEditor';
import TiptapEditor from '../TiptapEditor';
import type { ProviderStatus, ProviderSyncStatus } from '../providers/CustomYjsWebSocketProvider';
import TimeMachinePanel from './TimeMachinePanel';
import type { HistorySession } from './TimeMachinePanel';
import DiagnosticsPanel from './DiagnosticsPanel';
import { EditorToolbar } from '../components/EditorToolbar';
import './Editor.css';
import { FileText, Users, Share2, HelpCircle } from 'lucide-react';

type Permission = 'owner' | 'editor' | 'viewer';
type DocumentRecord = { id: string; title: string; permission: Permission; updated_at: number };
type Grant = { userId: string; name: string; email: string; permission: 'editor' | 'viewer'; createdAt: number };

const api = (path: string) => `${API_BASE}/api${path}`;
const authHeaders = (): Record<string, string> => {
    const token = getAuthSession()?.token;
    return token ? { Authorization: `Bearer ${token}` } : {};
};

export default function Editor() {
    const { docId } = useParams<{ docId: string }>();
    const navigate = useNavigate();
    const session = getAuthSession();

    const [document, setDocument] = useState<DocumentRecord | null>(null);
    const [loadError, setLoadError] = useState('');

    // Editor State
    const [offlineMode, setOfflineMode] = useState(false);
    const [offlineEdits, setOfflineEdits] = useState(0);
    const [connection, setConnection] = useState<ProviderStatus>('connecting');
    const [sync, setSync] = useState<ProviderSyncStatus>('idle');
    const [diagnostics, setDiagnostics] = useState<EditorDiagnostics | null>(null);
    const [text, setText] = useState<string | null>(null);
    const [restoreRequest, setRestoreRequest] = useState<{ id: number; content: JSONContent } | null>(null);
    const [restoreId, setRestoreId] = useState(0);
    const [history, setHistory] = useState<HistorySession[]>([]);

    // UI State
    const [showPeerCursors, setShowPeerCursors] = useState(true);
    const [showCRDTClock, setShowCRDTClock] = useState(false);
    const [shareOpen, setShareOpen] = useState(false);
    const [grants, setGrants] = useState<Grant[]>([]);
    const [shareEmail, setShareEmail] = useState('');
    const [sharePermission, setSharePermission] = useState<'editor' | 'viewer'>('editor');
    const [shareMessage, setShareMessage] = useState('');
    const [shareBusy, setShareBusy] = useState(false);
    const [diagOpen, setDiagOpen] = useState(false);

    useEffect(() => {
        if (!docId) return;
        const controller = new AbortController();
        fetch(api(`/documents`), { headers: authHeaders(), signal: controller.signal })
            .then(res => {
                if (res.status === 401) { clearAuthSession(); navigate('/login'); throw new Error('Unauthorized'); }
                if (!res.ok) throw new Error('Failed to load documents');
                return res.json();
            })
            .then((docs: DocumentRecord[]) => {
                const found = docs.find(d => d.id === docId);
                if (!found) throw new Error('Document not found or you do not have permission.');
                setDocument(found);
            })
            .catch(error => { if (!controller.signal.aborted) setLoadError(error instanceof Error ? error.message : 'Unable to load document.'); });
        return () => controller.abort();
    }, [docId, navigate]);

    const loadGrants = useCallback(async () => {
        if (!docId) return;
        const response = await fetch(api(`/documents/${encodeURIComponent(docId)}/permissions`), { headers: authHeaders() });
        if (!response.ok) throw new Error('Unable to load sharing settings.');
        setGrants(await response.json() as Grant[]);
    }, [docId]);

    async function openShare() {
        setShareOpen(true);
        setShareMessage('');
        try { await loadGrants(); } catch (error) { setShareMessage(error instanceof Error ? error.message : 'Unable to load sharing settings.'); }
    }

    async function addGrant(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (!docId) return;
        setShareBusy(true); setShareMessage('');
        try {
            const response = await fetch(api(`/documents/${encodeURIComponent(docId)}/permissions`), {
                method: 'PUT', headers: { 'Content-Type': 'application/json', ...authHeaders() },
                body: JSON.stringify({ email: shareEmail.trim(), permission: sharePermission }),
            });
            const result = await response.json().catch(() => ({})) as { error?: string };
            if (!response.ok) throw new Error(result.error || 'Unable to update sharing.');
            setShareEmail(''); await loadGrants(); setShareMessage('Access updated.');
        } catch (error) { setShareMessage(error instanceof Error ? error.message : 'Unable to update sharing.'); }
        finally { setShareBusy(false); }
    }

    async function removeGrant(userId: string) {
        if (!docId) return;
        setShareBusy(true);
        try {
            const response = await fetch(api(`/documents/${encodeURIComponent(docId)}/permissions/${encodeURIComponent(userId)}`), { method: 'DELETE', headers: authHeaders() });
            if (!response.ok) throw new Error('Unable to remove access.');
            await loadGrants();
        } catch (error) { setShareMessage(error instanceof Error ? error.message : 'Unable to remove access.'); }
        finally { setShareBusy(false); }
    }

    function restore(content: JSONContent) {
        setRestoreId(id => id + 1);
        setRestoreRequest({ id: restoreId + 1, content });
    }

    if (loadError) return <main className="editor-state"><p>{loadError}</p><button className="btn-primary" onClick={() => navigate('/documents')}>Back to documents</button></main>;
    if (!document || !docId) return <main className="editor-state"><div className="spinner"></div><p>Loading document…</p></main>;

    const canEdit = document.permission !== 'viewer';
    const collaborators = diagnostics?.awarenessClients ?? [];
    const onlineCount = collaborators.length || (connection === 'connected' ? 1 : 0);
    const statusLabel = connection === 'connected' ? 'Connected' : connection === 'connecting' ? 'Connecting...' : connection === 'error' ? 'Connection error' : 'Offline';
    const syncLabel = sync === 'synced' ? 'Synced' : sync === 'syncing' ? 'Syncing...' : sync === 'offline' ? 'Offline' : 'Waiting';

    const isConnected = connection === 'connected';

    return (
        <div className="editor-page">
            <nav className="editor-top-nav">
                <div className="nav-left">
                    <div className="nav-logo" onClick={() => navigate('/documents')} title="Dashboard">
                        <FileText size={18} />
                        <span>Collaborative Editor</span>
                    </div>
                    <div className="nav-breadcrumbs">
                        <span onClick={() => navigate('/documents')}>Documents</span>
                        <span className="separator">/</span>
                        <span className="current">{document.title}</span>
                    </div>
                </div>
                <div className="nav-right">
                    <span className="user-profile">{session?.user.name || 'User'}</span>
                    <button className="nav-btn-text" onClick={() => { clearAuthSession(); navigate('/login', { replace: true }); }}>Sign out</button>
                    <button className="nav-btn-icon" title="Help"><HelpCircle size={18} /></button>
                </div>
            </nav>

            <main className="editor-main-container">
                <header className="editor-document-header">
                    <div className="header-title-section">
                        <h1>{document.title}</h1>
                        <span className={`role-badge role-${document.permission}`}>
                            {document.permission === 'owner' ? 'Owner' : document.permission === 'editor' ? 'Editor' : 'Viewer'}
                        </span>
                    </div>
                    <div className="header-actions">
                        {document.permission === 'owner' && (
                            <button className="btn-primary" onClick={() => void openShare()}>
                                <Share2 size={16} /> Share
                            </button>
                        )}
                    </div>
                </header>

                <div className="editor-status-strip">
                    <div className={`status-item ${isConnected ? 'positive' : 'negative'}`}>
                        <span className="status-dot"></span> {statusLabel}
                    </div>
                    <div className="status-item">
                        ✓ {syncLabel}
                    </div>
                    <div className="status-item">
                        <Users size={14} /> {onlineCount} {onlineCount === 1 ? 'collaborator' : 'collaborators'}
                    </div>
                </div>

                <div className="editor-content-wrapper">
                    <TiptapEditor
                        docId={docId}
                        editable={canEdit}
                        offlineMode={offlineMode}
                        onConnectionStatusChange={setConnection}
                        onSyncStatusChange={setSync}
                        onDiagnosticsChange={setDiagnostics}
                        onDocumentTextChange={setText}
                        onOfflineEditCountChange={setOfflineEdits}
                        restoreRequest={restoreRequest}
                        onRestoreApplied={id => setRestoreRequest(current => current?.id === id ? null : current)}
                        renderToolbar={(editor) => (
                            <EditorToolbar
                                editor={editor}
                                showPeerCursors={showPeerCursors}
                                onTogglePeerCursors={() => setShowPeerCursors(!showPeerCursors)}
                                showCRDTClock={showCRDTClock}
                                onToggleCRDTClock={() => setShowCRDTClock(!showCRDTClock)}
                            />
                        )}
                    />
                </div>

                <section className="editor-panels">
                    <details className="feature-panel">
                        <summary>
                            <span className="panel-title">Collaboration</span>
                            <span className="panel-meta">{statusLabel} · {collaborators.length} collaborators</span>
                        </summary>
                        <div className="feature-content">
                            <p>Real-time presence and cursor sharing are active while connected.</p>
                            <ul className="collaborator-list">
                                {collaborators.map(peer => (
                                    <li key={peer.clientId}>
                                        <i style={{ background: peer.color ?? '#476b58' }} />
                                        {peer.name ?? 'Collaborator'}{peer.isLocal ? ' (you)' : ''}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </details>

                    <TimeMachinePanel docId={docId} currentText={text} onRestore={restore} onSessionsChange={setHistory} canRestore={canEdit} />

                    <details className="feature-panel">
                        <summary>
                            <span className="panel-title">Conflict Simulator</span>
                            <span className="panel-meta">{offlineMode ? `${offlineEdits} pending edits` : 'Offline mode is off'}</span>
                        </summary>
                        <div className="feature-content simulator-content">
                            <label className="toggle-label">
                                <input type="checkbox" checked={offlineMode} onChange={event => setOfflineMode(event.target.checked)} />
                                Simulate offline mode
                            </label>
                            <p>Edits made offline remain local and sync after reconnect.</p>
                            <dl className="status-dl">
                                <div><dt>Connection</dt><dd>{statusLabel}</dd></div>
                                <div><dt>Pending local edits</dt><dd>{offlineEdits}</dd></div>
                                <div><dt>Sync state</dt><dd>{syncLabel}</dd></div>
                            </dl>
                            <button className="btn-secondary" disabled={!offlineMode} onClick={() => setOfflineMode(false)}>Reconnect and sync</button>
                        </div>
                    </details>

                    <details className="feature-panel" open={diagOpen} onToggle={(e) => setDiagOpen((e.target as HTMLDetailsElement).open)}>
                        <summary>
                            <span className="panel-title">Diagnostics</span>
                        </summary>
                        <div className="feature-content">
                            {diagOpen && <DiagnosticsPanel user={session?.user ?? null} diagnostics={diagnostics} sessions={history} />}
                        </div>
                    </details>
                </section>
            </main>

            {shareOpen && (
                <div className="modal-overlay" onMouseDown={event => { if (event.target === event.currentTarget) setShareOpen(false); }}>
                    <section className="modal-card" role="dialog" aria-modal="true" aria-labelledby="share-title">
                        <header className="modal-header">
                            <h2 id="share-title" className="modal-title">Share Document</h2>
                            <button className="modal-close" aria-label="Close" onClick={() => setShareOpen(false)}>×</button>
                        </header>
                        <div className="modal-body">
                            <form onSubmit={addGrant} className="share-form">
                                <div className="form-group">
                                    <label className="input-label">Email address</label>
                                    <input className="input-field" type="email" required value={shareEmail} onChange={event => setShareEmail(event.target.value)} placeholder="teammate@example.com" />
                                </div>
                                <div className="form-group">
                                    <label className="input-label">Permission</label>
                                    <select className="input-field" value={sharePermission} onChange={event => setSharePermission(event.target.value as 'editor' | 'viewer')}>
                                        <option value="editor">Editor</option>
                                        <option value="viewer">Viewer</option>
                                    </select>
                                </div>
                                <button className="btn-primary submit-btn" disabled={shareBusy}>{shareBusy ? 'Saving…' : 'Invite'}</button>
                            </form>
                            {shareMessage && <p className="status-message" role="status">{shareMessage}</p>}

                            <h3 className="section-subtitle">People with access</h3>
                            <ul className="grant-list">
                                {grants.map(grant => (
                                    <li key={grant.userId}>
                                        <div className="grant-info">
                                            <strong>{grant.name}</strong>
                                            <small>{grant.email}</small>
                                        </div>
                                        <span className="grant-role">{grant.permission}</span>
                                        <button className="btn-secondary btn-sm" disabled={shareBusy} onClick={() => void removeGrant(grant.userId)}>Remove</button>
                                    </li>
                                ))}
                                {grants.length === 0 && <li className="empty-li">No one else has access yet.</li>}
                            </ul>
                        </div>
                        <div className="modal-footer">
                            <p className="share-owner-text">You own this document and have full access.</p>
                        </div>
                    </section>
                </div>
            )}
        </div>
    );
}
