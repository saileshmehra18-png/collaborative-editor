import type { AuthUser } from '../auth/authApi';
import type { EditorDiagnostics } from '../TiptapEditor';
import type { HistorySession } from './TimeMachinePanel';
import './DiagnosticsPanel.css';

type DiagnosticsPanelProps = {
    user: AuthUser | null;
    diagnostics: EditorDiagnostics | null;
    sessions: HistorySession[];
};

const WEBSOCKET_STATE_LABELS: Record<number, string> = {
    0: 'Connecting',
    1: 'Open',
    2: 'Closing',
    3: 'Closed',
};

function formatTimestamp(timestamp: number): string {
    return new Date(timestamp).toLocaleString();
}

function getSessionAuthor(session: HistorySession): string {
    if (session.authorName) return session.authorName;
    if (session.userId) return `User ${session.userId} (name unavailable)`;
    if (session.authorStatus === 'not-recorded') return 'Snapshot author not recorded';
    return 'Unknown / legacy author';
}

function getSessionRange(session: HistorySession): string {
    return `${formatTimestamp(session.startAt)} to ${formatTimestamp(session.lastActivityAt)}`;
}

export default function DiagnosticsPanel({ user, diagnostics, sessions }: DiagnosticsPanelProps) {
    const collaborators = diagnostics?.awarenessClients ?? [];
    const stateVector = diagnostics?.stateVector ?? [];
    const recentSessions = sessions.slice(-5).reverse();

    return (
        <details className="diagnostics-panel">
            <summary>
                <span>Diagnostics</span>
                <span className="diagnostics-panel-summary">Provenance and collaboration state</span>
            </summary>
            <div className="diagnostics-content">
                <section className="diagnostics-section">
                    <h3>Authenticated user</h3>
                    {user ? (
                        <dl>
                            <div><dt>Name</dt><dd>{user.name || 'No display name'}</dd></div>
                            {user.email && <div><dt>Email</dt><dd>{user.email}</dd></div>}
                            <div><dt>User ID</dt><dd>{user.id}</dd></div>
                            <div><dt>Role</dt><dd>{user.role}</dd></div>
                        </dl>
                    ) : (
                        <p>No authenticated user data.</p>
                    )}
                </section>

                <section className="diagnostics-section">
                    <h3>Connection and persistence</h3>
                    {diagnostics ? (
                        <dl>
                            <div><dt>WebSocket</dt><dd>{diagnostics.provider.status}</dd></div>
                            <div>
                                <dt>Socket state</dt>
                                <dd>{diagnostics.provider.webSocketReadyState === null
                                    ? 'No socket'
                                    : WEBSOCKET_STATE_LABELS[diagnostics.provider.webSocketReadyState] ?? 'Unknown'}</dd>
                            </div>
                            <div><dt>Sync</dt><dd>{diagnostics.provider.syncStatus}</dd></div>
                            <div><dt>Offline mode</dt><dd>{diagnostics.provider.offlineMode ? 'On' : 'Off'}</dd></div>
                            <div><dt>Reconnect attempts</dt><dd>{diagnostics.provider.reconnectAttempt}</dd></div>
                            <div>
                                <dt>Pending persistence acknowledgments</dt>
                                <dd>{diagnostics.provider.pendingAcknowledgements}</dd>
                            </div>
                            <div>
                                <dt>Last acknowledged update</dt>
                                <dd>{diagnostics.provider.lastAcknowledgedUpdateId === null
                                    ? 'None yet'
                                    : `#${diagnostics.provider.lastAcknowledgedUpdateId} · ${formatTimestamp(diagnostics.provider.lastAcknowledgedAt!)}`}</dd>
                            </div>
                        </dl>
                    ) : (
                        <p>Waiting for the live editor provider.</p>
                    )}
                </section>

                <section className="diagnostics-section">
                    <h3>Awareness-derived active collaborators</h3>
                    <p className="diagnostics-note">This reflects Awareness states, not an exact server socket count.</p>
                    {collaborators.length > 0 ? (
                        <ul>
                            {collaborators.map((collaborator) => (
                                <li key={collaborator.clientId}>
                                    {collaborator.name ?? 'Unnamed collaborator'}
                                    {collaborator.isLocal ? ' (you)' : ''}
                                    <span>Client ID {collaborator.clientId}</span>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p>{diagnostics ? 'No Awareness states currently available.' : 'Waiting for Awareness.'}</p>
                    )}
                </section>

                <section className="diagnostics-section">
                    <h3>Yjs document</h3>
                    {diagnostics ? (
                        <>
                            <dl>
                                <div><dt>Local document client ID</dt><dd>{diagnostics.documentClientId}</dd></div>
                                <div><dt>Encoded state vector size</dt><dd>{diagnostics.stateVectorBytes} bytes</dd></div>
                                <div><dt>CollaborationCaret installed</dt><dd>{diagnostics.collaborationCaretInstalled ? 'Yes' : 'No'}</dd></div>
                            </dl>
                            <p className="diagnostics-note">Decoded state vector clocks (client ID: clock)</p>
                            {stateVector.length > 0 ? (
                                <ul>
                                    {stateVector.map(({ clientId, clock }) => (
                                        <li key={clientId}>{clientId}: {clock}</li>
                                    ))}
                                </ul>
                            ) : (
                                <p>Empty state vector.</p>
                            )}
                        </>
                    ) : (
                        <p>Waiting for the live Y.Doc.</p>
                    )}
                </section>

                <section className="diagnostics-section diagnostics-provenance">
                    <h3>Recent provenance sessions</h3>
                    {recentSessions.length > 0 ? (
                        <ul>
                            {recentSessions.map((session) => (
                                <li key={session.id}>
                                    <strong>{getSessionAuthor(session)}</strong>
                                    <span>{getSessionRange(session)}</span>
                                    <span>{session.updateCount} updates</span>
                                    <ul>
                                        {session.checkpoints.map((checkpoint) => (
                                            <li key={checkpoint.version}>
                                                {checkpoint.label} · {getSessionAuthor(session)} · {formatTimestamp(checkpoint.createdAt)}
                                            </li>
                                        ))}
                                    </ul>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p>No persisted provenance sessions loaded.</p>
                    )}
                </section>
            </div>
        </details>
    );
}