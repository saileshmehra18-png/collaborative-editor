import { useCallback, useEffect, useState } from 'react';
import type { JSONContent } from '@tiptap/core';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { API_BASE, WS_URL } from '../config';
import { getAuthSession, clearAuthSession } from '../auth/authStorage';
import type { EditorDiagnostics } from '../TiptapEditor';
import TiptapEditor from '../TiptapEditor';
import type { ProviderStatus, ProviderSyncStatus } from '../providers/CustomYjsWebSocketProvider';
import TimeMachinePanel from './TimeMachinePanel';
import type { HistorySession } from './TimeMachinePanel';
import DiagnosticsPanel from './DiagnosticsPanel';
import { TopNav } from '../components/TopNav';
import { SecondaryHeader } from '../components/SecondaryHeader';
import { TabBar, TabType } from '../components/TabBar';
import { EditorToolbar } from '../components/EditorToolbar';
import { StatusBar } from '../components/StatusBar';
import './Editor.css';

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
    const [activeTab, setActiveTab] = useState<TabType>('editor');
    const [showPeerCursors, setShowPeerCursors] = useState(true);
    const [showCRDTClock, setShowCRDTClock] = useState(false);
    const [shareOpen, setShareOpen] = useState(false);
    const [grants, setGrants] = useState<Grant[]>([]);
    const [shareEmail, setShareEmail] = useState('');
    const [sharePermission, setSharePermission] = useState<'editor' | 'viewer'>('editor');
    const [shareMessage, setShareMessage] = useState('');
    const [shareBusy, setShareBusy] = useState(false);

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

    if (loadError) return <main className="editor-state"><p>{loadError}</p><button onClick={() => navigate('/documents')}>Back to documents</button></main>;
    if (!document || !docId) return <main className="editor-state">Loading document…</main>;

    const canEdit = document.permission !== 'viewer';
    const collaborators = diagnostics?.awarenessClients ?? [];
    const onlineCount = collaborators.length || (connection === 'connected' ? 1 : 0);
    const statusLabel = connection === 'connected' ? 'Connected' : connection === 'connecting' ? 'Connecting' : connection === 'error' ? 'Connection error' : 'Offline';
    const syncLabel = sync === 'synced' ? 'Synced' : sync === 'syncing' ? 'Syncing' : sync === 'offline' ? 'Offline' : 'Waiting';

    return (
        <div className="editor-page">
            <TopNav
                connectionStatus={connection}
                onlineCount={onlineCount}
                currentDoc={document}
            />

            <SecondaryHeader
                version="v1.0"
                docTitle={document.title}
                docId={document.id}
                onlineCount={onlineCount}
                connectionDetails={`${statusLabel} (${syncLabel})`}
                onNewDoc={() => navigate('/documents')}
            />

            <TabBar
                activeTab={activeTab}
                onTabChange={setActiveTab}
                documentName={document.title}
            />

            {activeTab === 'editor' && (
                <main className="collab-editor">
                    <header className="document-heading" style={{ padding: '0 2rem' }}>
                        <div><p className="document-kicker">Collaborative document</p><h1>{document.title}</h1><p className="permission-line">{document.permission === 'owner' ? 'Owner' : document.permission === 'editor' ? 'Editor' : 'Viewer'} access</p></div>
                        {document.permission === 'owner' && <button className="share-button" onClick={() => void openShare()}>Share</button>}
                    </header>
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

                    <section className="editor-panels" aria-label="Collaboration tools">
                        <details className="feature-panel" open><summary>Collaboration <span>{statusLabel} · {collaborators.length} collaborators</span></summary><div className="feature-content"><p>Real-time presence and cursor sharing are active while connected.</p><ul>{collaborators.map(peer => <li key={peer.clientId}><i style={{ background: peer.color ?? '#476b58' }} />{peer.name ?? 'Collaborator'}{peer.isLocal ? ' (you)' : ''}</li>)}</ul></div></details>
                        <TimeMachinePanel docId={docId} currentText={text} onRestore={restore} onSessionsChange={setHistory} canRestore={canEdit} />
                        <details className="feature-panel"><summary>Conflict Simulator <span>{offlineMode ? `${offlineEdits} pending edits` : 'Offline mode is off'}</span></summary><div className="feature-content simulator-content"><label><input type="checkbox" checked={offlineMode} onChange={event => setOfflineMode(event.target.checked)} /> Simulate offline mode</label><p>Edits made offline remain local and sync after reconnect.</p><dl><div><dt>Connection</dt><dd>{statusLabel}</dd></div><div><dt>Pending local edits</dt><dd>{offlineEdits}</dd></div><div><dt>Sync state</dt><dd>{syncLabel}</dd></div></dl><button type="button" disabled={!offlineMode} onClick={() => setOfflineMode(false)}>Reconnect and sync</button></div></details>
                    </section>
                </main>
            )}

            {activeTab === 'dashboard' && (
                <div className="dashboard-view" style={{ padding: '2rem' }}>
                    <h2>Dashboard</h2>
                    <p>Go to <Link to="/documents">All Documents</Link> to view your dashboard.</p>
                </div>
            )}

            {activeTab === 'diagnostics' && (
                <div className="diagnostics-view" style={{ padding: '2rem' }}>
                    <h2>Diagnostics</h2>
                    <DiagnosticsPanel user={session?.user ?? null} diagnostics={diagnostics} sessions={history} />
                </div>
            )}

            <StatusBar
                wsConnected={connection === 'connected'}
                apiEndpoint={API_BASE || window.location.origin}
                wsEndpoint={WS_URL}
            />

            {shareOpen && <div className="share-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) setShareOpen(false); }}><section className="share-dialog" role="dialog" aria-modal="true" aria-labelledby="share-title"><header><div><p className="document-kicker">Document access</p><h2 id="share-title">Share “{document.title}”</h2></div><button aria-label="Close" onClick={() => setShareOpen(false)}>×</button></header><form onSubmit={addGrant}><label>Email address<input type="email" required value={shareEmail} onChange={event => setShareEmail(event.target.value)} placeholder="teammate@example.com" /></label><label>Permission<select value={sharePermission} onChange={event => setSharePermission(event.target.value as 'editor' | 'viewer')}><option value="editor">Editor</option><option value="viewer">Viewer</option></select></label><button disabled={shareBusy}>{shareBusy ? 'Saving…' : 'Invite'}</button></form>{shareMessage && <p role="status">{shareMessage}</p>}<h3>People with access</h3><ul className="grant-list">{grants.map(grant => <li key={grant.userId}><span><strong>{grant.name}</strong><small>{grant.email}</small></span><span>{grant.permission}</span><button disabled={shareBusy} onClick={() => void removeGrant(grant.userId)}>Remove</button></li>)}{grants.length === 0 && <li>No one else has access yet.</li>}</ul><p className="share-owner">You own this document and have full access.</p></section></div>}
        </div>
    );
}
