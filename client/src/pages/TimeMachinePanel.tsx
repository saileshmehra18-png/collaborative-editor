import Collaboration from '@tiptap/extension-collaboration';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { useEffect, useState } from 'react';
import * as Y from 'yjs';
import { getAuthSession } from '../auth/authStorage';
import './TimeMachinePanel.css';

type HistoryVersion = {
    version: string;
    kind: 'snapshot' | 'update';
    createdAt: number;
    state: number[];
};

type TimeMachinePanelProps = {
    docId: string;
    currentText: string | null;
};

function HistoricalPreview({
    version,
    currentText,
}: {
    version: HistoryVersion;
    currentText: string | null;
}) {
    const [ydoc] = useState(() => {
        const document = new Y.Doc();
        Y.applyUpdate(document, Uint8Array.from(version.state));
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

    return (
        <div className="time-machine-selected">
            <div className="time-machine-version-info">
                <div>
                    <span>Selected version</span>
                    <strong>{version.kind === 'snapshot' ? 'Database snapshot' : 'Persisted update'}</strong>
                </div>
                <div>
                    <span>Saved</span>
                    <time dateTime={new Date(version.createdAt).toISOString()}>
                        {new Date(version.createdAt).toLocaleString()}
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

export default function TimeMachinePanel({ docId, currentText }: TimeMachinePanelProps) {
    const [versions, setVersions] = useState<HistoryVersion[]>([]);
    const [selectedVersion, setSelectedVersion] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [refreshCount, setRefreshCount] = useState(0);

    useEffect(() => {
        const controller = new AbortController();
        const token = getAuthSession()?.token;
        setLoading(true);
        setError(null);

        fetch(`/api/documents/${encodeURIComponent(docId)}/history`, {
            headers: token ? { Authorization: `Bearer ${token}` } : {},
            signal: controller.signal,
        })
            .then(async (response) => {
                if (!response.ok) throw new Error('Unable to load document history.');
                return response.json() as Promise<HistoryVersion[]>;
            })
            .then((history) => {
                setVersions(history);
                setSelectedVersion((current) =>
                    history.some((version) => version.version === current)
                        ? current
                        : history[history.length - 1]?.version ?? null,
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
    }, [docId, refreshCount]);

    const selected = versions.find((version) => version.version === selectedVersion) ?? null;

    return (
        <details className="time-machine-panel" open>
            <summary>
                <span>Time Machine</span>
                <span className="time-machine-count">{versions.length} saved states</span>
            </summary>
            <div className="time-machine-toolbar">
                <span>History is reconstructed from persisted Yjs states and updates.</span>
                <button type="button" disabled={loading} onClick={() => setRefreshCount((count) => count + 1)}>
                    Refresh history
                </button>
            </div>
            {loading ? (
                <p className="time-machine-message">Loading persisted document history...</p>
            ) : error ? (
                <p className="time-machine-message is-error" role="alert">{error}</p>
            ) : versions.length === 0 ? (
                <p className="time-machine-message">No persisted document history yet.</p>
            ) : (
                <div className="time-machine-content">
                    <ol className="time-machine-timeline" aria-label="Chronological document history">
                        {versions.map((version, index) => (
                            <li key={version.version}>
                                <button
                                    type="button"
                                    aria-pressed={selectedVersion === version.version}
                                    className={selectedVersion === version.version ? 'is-selected' : ''}
                                    onClick={() => setSelectedVersion(version.version)}
                                >
                                    <strong>Version {index + 1}</strong>
                                    <time dateTime={new Date(version.createdAt).toISOString()}>
                                        {new Date(version.createdAt).toLocaleString()}
                                    </time>
                                    <span>{version.kind === 'snapshot' ? 'Snapshot' : 'Update'}</span>
                                </button>
                            </li>
                        ))}
                    </ol>
                    {selected && (
                        <HistoricalPreview
                            key={selected.version}
                            version={selected}
                            currentText={currentText}
                        />
                    )}
                </div>
            )}
        </details>
    );
}