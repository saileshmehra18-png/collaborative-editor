import { useState, useEffect } from 'react'
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
import type { ProviderStatus } from '../providers/CustomYjsWebSocketProvider'
import './Editor.css'

function Editor() {
  const { docId } = useParams<{ docId: string }>()
  const navigate = useNavigate()

  const [title, setTitle] = useState('Untitled')
  const [connectionStatus, setConnectionStatus] = useState<ProviderStatus>('connecting')

  useEffect(() => {
    if (!docId) return

    let isCurrent = true
    fetch('/api/documents')
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
      {(connectionStatus === 'disconnected' || connectionStatus === 'error') && (
        <div className="disconnect-banner">
          <span>
            <WifiOff size={16} style={{ display: 'inline', marginRight: '8px' }} />
            WebSocket connection unavailable. Check your session and connection.
          </span>
          <button onClick={() => window.location.reload()}>
            Retry
          </button>
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

      <div className="editor-container">
        <TiptapEditor
          key={docId}
          docId={docId}
          className="embedded-tiptap-editor"
          onConnectionStatusChange={setConnectionStatus}
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
