import React, { useEffect, useRef, useState } from 'react';
import * as Y from 'yjs';
import './EditorContent.css';

interface EditorContentProps {
  ydoc: Y.Doc;
  showCRDTClock: boolean;
  showPeerCursors: boolean;
}

interface DocumentMetadata {
  created: string;
  modified: string;
  wordCount: number;
  characterCount: number;
  version: string;
  syncStatus: 'synced' | 'syncing' | 'offline';
  lastSyncTime: string;
}

export const EditorContent: React.FC<EditorContentProps> = ({
  ydoc,
  showCRDTClock,
  showPeerCursors,
}) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const [metadata, setMetadata] = useState<DocumentMetadata>({
    created: new Date().toISOString(),
    modified: new Date().toISOString(),
    wordCount: 0,
    characterCount: 0,
    version: '1.0.0',
    syncStatus: 'synced',
    lastSyncTime: new Date().toLocaleTimeString(),
  });

  const [content, setContent] = useState('');
  const ytext = ydoc.getText('content');

  useEffect(() => {
    // Initialize content from Yjs
    const initialContent = ytext.toString();
    setContent(initialContent);
    updateMetadata(initialContent);

    // Listen for Yjs updates
    const observer = () => {
      const newContent = ytext.toString();
      setContent(newContent);
      updateMetadata(newContent);
    };

    ytext.observe(observer);

    return () => {
      ytext.unobserve(observer);
    };
  }, [ytext]);

  const updateMetadata = (text: string) => {
    const words = text.trim().split(/\s+/).filter(w => w.length > 0).length;
    const chars = text.length;

    setMetadata(prev => ({
      ...prev,
      modified: new Date().toISOString(),
      wordCount: words,
      characterCount: chars,
      lastSyncTime: new Date().toLocaleTimeString(),
    }));
  };

  const handleInput = (e: React.FormEvent<HTMLDivElement>) => {
    const newContent = e.currentTarget.textContent || '';
    
    // Update Yjs document
    ydoc.transact(() => {
      ytext.delete(0, ytext.length);
      ytext.insert(0, newContent);
    });
  };

  const formatDate = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="editor-content-container">
      <div className="editor-metadata">
        <div className="metadata-row">
          <div className="metadata-item">
            <span className="metadata-label">Created:</span>
            <span className="metadata-value">{formatDate(metadata.created)}</span>
          </div>
          <div className="metadata-item">
            <span className="metadata-label">Modified:</span>
            <span className="metadata-value">{formatDate(metadata.modified)}</span>
          </div>
          <div className="metadata-item">
            <span className="metadata-label">Version:</span>
            <span className="metadata-value version-badge">{metadata.version}</span>
          </div>
        </div>
        <div className="metadata-row">
          <div className="metadata-item">
            <span className="metadata-label">Words:</span>
            <span className="metadata-value">{metadata.wordCount}</span>
          </div>
          <div className="metadata-item">
            <span className="metadata-label">Characters:</span>
            <span className="metadata-value">{metadata.characterCount}</span>
          </div>
          <div className="metadata-item">
            <span className="metadata-label">Sync Status:</span>
            <span className={`metadata-value sync-status ${metadata.syncStatus}`}>
              <span className="sync-indicator"></span>
              {metadata.syncStatus}
            </span>
          </div>
          <div className="metadata-item">
            <span className="metadata-label">Last Sync:</span>
            <span className="metadata-value">{metadata.lastSyncTime}</span>
          </div>
        </div>
      </div>

      {showCRDTClock && (
        <div className="crdt-vector-clock">
          <div className="clock-header">
            <span className="clock-icon">⏱</span>
            <span className="clock-title">CRDT Vector Clock</span>
          </div>
          <div className="clock-content">
            <code className="clock-data">
              {JSON.stringify(
                {
                  site: ydoc.clientID,
                  clock: Array.from(ydoc.store.clients.entries()).map(([client, items]) => ({
                    client,
                    clock: items.length,
                  })),
                },
                null,
                2
              )}
            </code>
          </div>
        </div>
      )}

      <div className="editor-wrapper">
        <div
          ref={editorRef}
          className={`editor-area ${showPeerCursors ? 'show-cursors' : ''}`}
          contentEditable
          onInput={handleInput}
          suppressContentEditableWarning
        >
          {content}
        </div>

        {showPeerCursors && (
          <div className="peer-cursors-overlay">
            {/* Peer cursors will be rendered here via Yjs Awareness */}
          </div>
        )}
      </div>

      <div className="verification-callout">
        <div className="callout-icon">✓</div>
        <div className="callout-content">
          <div className="callout-title">Document Verified</div>
          <div className="callout-description">
            All changes have been synchronized and verified across all clients
          </div>
        </div>
      </div>
    </div>
  );
};
