import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  Bold,
  Italic,
  Strikethrough,
  Code,
  List,
  ListOrdered,
  WifiOff,
} from 'lucide-react'
import TiptapEditor from '../TiptapEditor'
import TimeMachinePanel from './TimeMachinePanel'
import DiagnosticsPanel from './DiagnosticsPanel'
import { getAuthSession } from '../auth/authStorage'
import type { AuthUser } from '../auth/authApi'
import type { JSONContent } from '@tiptap/core'
import type { EditorDiagnostics } from '../TiptapEditor'
import type { HistorySession } from './TimeMachinePanel'
import type {
  ProviderStatus,
  ProviderSyncStatus,
} from '../providers/CustomYjsWebSocketProvider'
import './Editor.css'

function Editor() {
  const { docId } = useParams<{ docId: string }>()
  const navigate = useNavigate()

  const [title, setTitle] = useState('Untitled')
  const [connectionStatus, setConnectionStatus] = useState<ProviderStatus>('connecting')
  const [offlineMode, setOfflineMode] = useState(false)
  const [offlineEditCount, setOfflineEditCount] = useState(0)
  const [syncStatus, setSyncStatus] = useState<ProviderSyncStatus>('idle')
  const [currentDocumentText, setCurrentDocumentText] = useState<string | null>(null)
  const [currentUser] = useState<AuthUser | null>(() => getAuthSession()?.user ?? null)
  const [editorDiagnostics, setEditorDiagnostics] = useState<EditorDiagnostics | null>(null)
  const [historySessions, setHistorySessions] = useState<HistorySession[]>([])
  const [restoreRequest, setRestoreRequest] = useState<{ id: number; content: JSONContent } | null>(null)
  const nextRestoreId = useRef(0)

  const requestRestore = useCallback((content: JSONContent) => {
    setRestoreRequest({ id: ++nextRestoreId.current, content })
  }, [])
  const handleRestoreApplied = useCallback((id: number) => {
    setRestoreRequest((request) => request?.id === id ? null : request)
  }, [])

  const syncStatusLabel = syncStatus === 'synced'
    ? 'Synchronized to server'
    : syncStatus === 'syncing'
      ? 'Syncing Yjs updates'
      : offlineMode
        ? offlineEditCount > 0 ? 'Offline edits pending' : 'Offline mode enabled'
        : 'Waiting for connection'
  const connectionStatusLabel = offlineMode
    ? 'Offline'
    : connectionStatus === 'connected'
      ? 'Connected'
      : connectionStatus === 'connecting'
        ? 'Connecting'
        : connectionStatus === 'error'
          ? 'Connection error'
          : 'Disconnected'

  useEffect(() => {
    if (!docId) return

    let isCurrent = true
    const token = getAuthSession()?.token
    fetch('/api/documents', {
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    })
      .then(async (response) => {
        if (!response.ok) throw new Error('Failed to load documents')
        return response.json() as Promise<Array<{ id: string; title: string }>>
      })
      .then((documents) => {
        const document = documents.find((item) => item.id === docId)
        if (isCurrent && document) setTitle(document.title)
      })
      .catch(() => {
        if (isCurrent) setTitle('Untitled')
      })

    return () => {
      isCurrent = false
    }
  }, [docId])

  if (!docId) {
    return (
      <div className="error-state">
        <h2>Document not found</h2>
        <button className="btn-primary" onClick={() => navigate('/documents')}>
          Back to Documents
        </button>
      </div>
    )
  }

  return (
    <div className="editor-page">
      {!offlineMode && (connectionStatus === 'disconnected' || connectionStatus === 'error') && (
        <div className="disconnect-banner">
          <span>
            <WifiOff size={16} style={{ display: 'inline', marginRight: '8px' }} />
            WebSocket connection unavailable. Reconnecting automatically.
          </span>
        </div>
      )}

      <header className="editor-header">
        <div className="header-left">
          <button className="back-btn" onClick={() => navigate('/documents')}>
            <ArrowLeft size={18} />
            <span>Documents</span>
          </button>

          <input
            type="text"
            className="document-title-input"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Untitled"
          />
        </div>

        <div className="header-right">
          <div className={`status-badge ${connectionStatus === 'connected' ? 'connected' : connectionStatus === 'connecting' ? 'syncing' : 'disconnected'}`}>
            <span className="status-dot"></span>
            {connectionStatus === 'connected' && 'Connected'}
            {connectionStatus === 'connecting' && 'Connecting...'}
            {connectionStatus === 'disconnected' && 'Disconnected'}
            {connectionStatus === 'error' && 'Connection error'}
          </div>
        </div>
      </header>

      <section className="conflict-simulator" aria-labelledby="conflict-simulator-title">
        <div className="conflict-simulator-heading">
          <h2 id="conflict-simulator-title">Conflict Simulator</h2>
          <label className="offline-mode-toggle">
            <input
              type="checkbox"
              checked={offlineMode}
              onChange={(event) => setOfflineMode(event.target.checked)}
            />
            Offline Mode
          </label>
        </div>
        <dl className="conflict-simulator-stats">
          <div>
            <dt>Connection</dt>
            <dd>{connectionStatusLabel}</dd>
          </div>
          <div>
            <dt>Mode</dt>
            <dd>{offlineMode ? 'Offline' : 'Online'}</dd>
          </div>
          <div>
            <dt>Local edits while offline</dt>
            <dd>{offlineEditCount}</dd>
          </div>
          <div>
            <dt>Sync status</dt>
            <dd role="status" aria-live="polite">{syncStatusLabel}</dd>
          </div>
        </dl>
        <button
          className="simulator-reconnect"
          type="button"
          disabled={!offlineMode}
          onClick={() => setOfflineMode(false)}
        >
          Reconnect and sync
        </button>
      </section>

      <TimeMachinePanel
        docId={docId}
        currentText={currentDocumentText}
        onRestore={requestRestore}
        onSessionsChange={setHistorySessions}
      />
      <DiagnosticsPanel
        user={currentUser}
        diagnostics={editorDiagnostics}
        sessions={historySessions}
      />

      <div className="editor-container">
        <TiptapEditor
          key={docId}
          docId={docId}
          className="embedded-tiptap-editor"
          offlineMode={offlineMode}
          onConnectionStatusChange={setConnectionStatus}
          onDiagnosticsChange={setEditorDiagnostics}
          onDocumentTextChange={setCurrentDocumentText}
          restoreRequest={restoreRequest}
          onRestoreApplied={handleRestoreApplied}
          onOfflineEditCountChange={setOfflineEditCount}
          onSyncStatusChange={setSyncStatus}
          renderToolbar={(editor) => (
            <>
              <button
                type="button"
                className={`toolbar-btn ${editor?.isActive('bold') ? 'is-active' : ''}`}
                onClick={() => editor?.chain().focus().toggleBold().run()}
                title="Bold (Ctrl+B)"
                aria-label="Bold"
                disabled={!editor}
              >
                <Bold size={16} />
              </button>
              <button
                type="button"
                className={`toolbar-btn ${editor?.isActive('italic') ? 'is-active' : ''}`}
                onClick={() => editor?.chain().focus().toggleItalic().run()}
                title="Italic (Ctrl+I)"
                aria-label="Italic"
                disabled={!editor}
              >
                <Italic size={16} />
              </button>
              <button
                type="button"
                className={`toolbar-btn ${editor?.isActive('strike') ? 'is-active' : ''}`}
                onClick={() => editor?.chain().focus().toggleStrike().run()}
                title="Strikethrough"
                aria-label="Strikethrough"
                disabled={!editor}
              >
                <Strikethrough size={16} />
              </button>
              <button
                type="button"
                className={`toolbar-btn ${editor?.isActive('code') ? 'is-active' : ''}`}
                onClick={() => editor?.chain().focus().toggleCode().run()}
                title="Code (Ctrl+E)"
                aria-label="Code"
                disabled={!editor}
              >
                <Code size={16} />
              </button>
              <div className="toolbar-divider" />
              <button
                type="button"
                className={`toolbar-btn ${editor?.isActive('bulletList') ? 'is-active' : ''}`}
                onClick={() => editor?.chain().focus().toggleBulletList().run()}
                title="Bullet List"
                aria-label="Bullet list"
                disabled={!editor}
              >
                <List size={16} />
              </button>
              <button
                type="button"
                className={`toolbar-btn ${editor?.isActive('orderedList') ? 'is-active' : ''}`}
                onClick={() => editor?.chain().focus().toggleOrderedList().run()}
                title="Numbered List"
                aria-label="Numbered list"
                disabled={!editor}
              >
                <ListOrdered size={16} />
              </button>
            </>
          )}
        />
      </div>
    </div>
  )
}

export default Editor
