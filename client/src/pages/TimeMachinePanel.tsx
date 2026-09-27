import Collaboration from '@tiptap/extension-collaboration';
import type { JSONContent } from '@tiptap/core';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { useEffect, useState } from 'react';
import * as Y from 'yjs';
import { API_BASE } from '../config';
import { getAuthSession } from '../auth/authStorage';
import './TimeMachinePanel.css';

type HistoryCheckpoint = {
    version: string;
    label: string;
    kind: 'snapshot' | 'update';
    createdAt: number;
    updateCount: number;
    state: number[];
};

export type HistorySession = {
    id: string;
    documentId: string;
    userId: string | null;
    authorName: string | null;
    authorStatus: 'tracked' | 'unknown' | 'not-recorded';
    startAt: number;
    lastActivityAt: number;
    updateCount: number;
    checkpoints: HistoryCheckpoint[];
};

type TimeMachinePanelProps = {
    docId: string;
    currentText: string | null;
    onRestore: (content: JSONContent) => void;
    onSessionsChange?: (sessions: HistorySession[]) => void;
    canRestore?: boolean;
};

function getAuthorLabel(session: HistorySession): string {
    if (session.authorName) return session.authorName;
    if (session.userId) return `Unknown author (${session.userId})`;
    if (session.authorStatus === 'not-recorded') return 'Snapshot author not recorded';
    return 'Recorded before provenance tracking';
}

function formatSessionRange(session: HistorySession): string {
    const start = new Date(session.startAt);
    const end = new Date(session.lastActivityAt);
    return `${start.toLocaleDateString()} · ${start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}–${end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
}

function HistoricalPreview({
    checkpoint,
    session,
    currentText,
    onRestore,
    canRestore = true,
}: {
    checkpoint: HistoryCheckpoint;
    session: HistorySession;
    currentText: string | null;
    onRestore: (content: JSONContent) => void;
    canRestore: boolean;
}) {
    const [ydoc] = useState(() => {
        const document = new Y.Doc();
        Y.applyUpdate(document, Uint8Array.from(checkpoint.state));
        return document;
    });
    const editor = useEditor({
        extensions: [
            StarterKit.configure({ undoRedo: false }),
            Collaboration.configure({ document: ydoc }),
        ],
        editable: false,
    }, [ydoc]);

    useEffect(() => () => ydoc.destroy(), [ydoc]);

    const historicalText = editor?.getText() ?? '';
    const comparison = !editor || currentText === null
        ? 'Preparing comparison'
        : historicalText === currentText
            ? 'No text changes from current'
            : 'Text differs from current document';

    const restore = (): void => {
        if (!editor || !window.confirm('Restore this checkpoint as a new document change? Existing history will be kept.')) {
            return;
        }

        onRestore(editor.getJSON());
    };

    return (
        <div className="time-machine-selected">
            <div className="time-machine-version-info">
                <div>
                    <span>Author</span>
                    <strong>{getAuthorLabel(session)}</strong>
                </div>
                <div>
                    <span>Session</span>
                    <strong>{formatSessionRange(session)}</strong>
                </div>
                <div>
                    <span>Checkpoint</span>
                    <strong>{checkpoint.label}</strong>
                </div>
                <div>
                    <span>Saved</span>
                    <time dateTime={new Date(checkpoint.createdAt).toISOString()}>
                        {new Date(checkpoint.createdAt).toLocaleString()}
                    </time>
                </div>
                <div>
                    <span>Comparison</span>
                    <strong>{comparison}</strong>
                </div>
            </div>
            <div className="time-machine-preview" aria-label="Read-only historical document preview">
                <EditorContent editor={editor} />
            </div>
            <div className="time-machine-actions">
                <span>Preview only until restored</span>
                {canRestore && <button type="button" disabled={!editor} onClick={restore}>
                    Restore this version
                </button>}
            </div>
            <div className="time-machine-text-comparison">
                <div>
                    <h4>Selected version text</h4>
                    <pre>{historicalText || '(empty document)'}</pre>
                </div>
                <div>
                    <h4>Current document text</h4>
                    <pre>{currentText ?? 'Waiting for current document...'}</pre>
                </div>
            </div>
        </div>
    );
}

export default function TimeMachinePanel({
    docId,
    currentText,
    onRestore,
    onSessionsChange,
    canRestore = true,
}: TimeMachinePanelProps) {
    const [sessions, setSessions] = useState<HistorySession[]>([]);
    const [selectedCheckpointVersion, setSelectedCheckpointVersion] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [refreshCount, setRefreshCount] = useState(0);

    useEffect(() => {
        const controller = new AbortController();
        const token = getAuthSession()?.token;
        setLoading(true);
        setError(null);

        fetch(`${API_BASE}/api/documents/${encodeURIComponent(docId)}/history`, {
            headers: token ? { Authorization: `Bearer ${token}` } : {},
            signal: controller.signal,
        })
            .then(async (response) => {
                if (!response.ok) throw new Error('Unable to load document history.');
                return response.json() as Promise<HistorySession[]>;
            })
            .then((history) => {
                setSessions(history);
                onSessionsChange?.(history);
                const allCheckpoints = history.flatMap((session) => session.checkpoints);
                setSelectedCheckpointVersion((current) =>
                    allCheckpoints.some((checkpoint) => checkpoint.version === current)
                        ? current
                        : allCheckpoints[allCheckpoints.length - 1]?.version ?? null,
                );
            })
            .catch((loadError: unknown) => {
                if (!controller.signal.aborted) {
                    setError(loadError instanceof Error ? loadError.message : 'Unable to load document history.');
                }
            })
            .finally(() => {
                if (!controller.signal.aborted) setLoading(false);
            });

        return () => controller.abort();
    }, [docId, onSessionsChange, refreshCount]);

    const selectedSession = sessions.find((session) =>
        session.checkpoints.some((checkpoint) => checkpoint.version === selectedCheckpointVersion),
    ) ?? null;
    const selectedCheckpoint = selectedSession?.checkpoints.find(
        (checkpoint) => checkpoint.version === selectedCheckpointVersion,
    ) ?? null;

    return (
        <details className="feature-panel time-machine-panel-override">
            <summary>
                <span className="panel-title">Time Machine</span>
                <span className="panel-meta">
                    {sessions.length} sessions · {sessions.reduce((count, session) => count + session.checkpoints.length, 0)} checkpoints
                </span>
            </summary>
            <div className="time-machine-toolbar">
                <span>Sessions group persisted Yjs updates; checkpoints are real saved states.</span>
                <button type="button" disabled={loading} onClick={() => setRefreshCount((count) => count + 1)}>
                    Refresh history
                </button>
            </div>
            {loading ? (
                <p className="time-machine-message">Loading persisted document history...</p>
            ) : error ? (
                <p className="time-machine-message is-error" role="alert">{error}</p>
            ) : sessions.length === 0 ? (
                <p className="time-machine-message">No persisted document history yet.</p>
            ) : (
                <div className="time-machine-session-list" aria-label="Document editing sessions">
                    {sessions.map((session, index) => (
                        <details className="time-machine-session" key={session.id} open={index === sessions.length - 1}>
                            <summary>
                                <strong>{getAuthorLabel(session)}</strong>
                                <span>{formatSessionRange(session)}</span>
                                <span>{session.updateCount} saved updates</span>
                            </summary>
                            <ol className="time-machine-checkpoints">
                                {session.checkpoints.map((checkpoint) => (
                                    <li key={checkpoint.version}>
                                        <button
                                            type="button"
                                            aria-pressed={selectedCheckpointVersion === checkpoint.version}
                                            className={selectedCheckpointVersion === checkpoint.version ? 'is-selected' : ''}
                                            onClick={() => setSelectedCheckpointVersion(checkpoint.version)}
                                        >
                                            <strong>{checkpoint.label}</strong>
                                            <time dateTime={new Date(checkpoint.createdAt).toISOString()}>
                                                {new Date(checkpoint.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                            </time>
                                            <span>{checkpoint.updateCount} updates</span>
                                        </button>
                                    </li>
                                ))}
                            </ol>
                        </details>
                    ))}
                </div>
            )}
            {selectedCheckpoint && selectedSession && (
                <HistoricalPreview
                    key={selectedCheckpoint.version}
                    checkpoint={selectedCheckpoint}
                    session={selectedSession}
                    currentText={currentText}
                    onRestore={onRestore}
                    canRestore={canRestore}
                />
            )}
        </details>
    );
}
