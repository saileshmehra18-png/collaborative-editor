import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Collaboration from '@tiptap/extension-collaboration'
import CollaborationCursor from '@tiptap/extension-collaboration-cursor'
import * as Y from 'yjs'
import {
  ArrowLeft,
  Bold,
  Italic,
  Strikethrough,
  Code,
  List,
  ListOrdered,
  Wifi,
  WifiOff,
  RefreshCw,
  Loader2
} from 'lucide-react'
import './Editor.css'

const COLORS = [
  '#4F46E5', '#0EA5E9', '#10B981', '#F59E0B', '#F43F5E',
  '#8B5CF6', '#EC4899', '#06B6D4', '#14B8A6', '#F97316'
]

function Editor() {
  const { docId } = useParams<{ docId: string }>()
  const navigate = useNavigate()
  
  const [title, setTitle] = useState('Untitled')
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting')
  const [collaborators, setCollaborators] = useState<Array<{ name: string; color: string }>>([])
  
  const ydocRef = useRef<Y.Doc | null>(null)
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>()

  const userName = `User${Math.floor(Math.random() * 1000)}`
  const userColor = COLORS[Math.floor(Math.random() * COLORS.length)]

  useEffect(() => {
    if (!docId) return

    // Load document metadata
    fetch(`/api/documents`)
      .then(res => res.json())
      .then((docs: any[]) => {
        const doc = docs.find(d => d.id === docId)
        if (doc) setTitle(doc.title)
      })
      .catch(console.error)

    // Initialize Yjs document
    const ydoc = new Y.Doc()
    ydocRef.current = ydoc

    // Connect WebSocket
    connectWebSocket()

    return () => {
      if (wsRef.current) {
        wsRef.current.close()
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }
      ydoc.destroy()
    }
  }, [docId])

  function connectWebSocket() {
    if (!docId || !ydocRef.current) return

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const ws = new WebSocket(`${protocol}//localhost:4000?docId=${docId}`)
    wsRef.current = ws

    ws.onopen = () => {
      setConnectionStatus('connected')
    }

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        
        if (data.type === 'sync' || data.type === 'update') {
          const update = new Uint8Array(data.update)
          Y.applyUpdate(ydocRef.current!, update)
        }
      } catch (error) {
        console.error('Failed to process message:', error)
      }
    }

    ws.onerror = (error) => {
      console.error('WebSocket error:', error)
      setConnectionStatus('disconnected')
    }

    ws.onclose = () => {
      setConnectionStatus('disconnected')
      
      // Attempt reconnection after 3 seconds
      reconnectTimeoutRef.current = setTimeout(() => {
        setConnectionStatus('connecting')
        connectWebSocket()
      }, 3000)
    }

    // Send updates to server
    ydocRef.current.on('update', (update: Uint8Array, origin: any) => {
      if (origin !== ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          type: 'update',
          update: Array.from(update)
        }))
      }
    })
  }

  const editor = useEditor({
    extensions: [
      StarterKit,
      Collaboration.configure({
        document: ydocRef.current!,
      }),
      CollaborationCursor.configure({
        provider: null as any,
        user: {
          name: userName,
          color: userColor,
        },
      }),
    ],
    editorProps: {
      attributes: {
        class: 'ProseMirror',
      },
    },
  }, [ydocRef.current])

  // Track awareness for collaborators (simplified version)
  useEffect(() => {
    if (connectionStatus === 'connected') {
      // Simulate collaborators for demo
      setCollaborators([
        { name: userName, color: userColor }
      ])
    } else {
      setCollaborators([])
    }
  }, [connectionStatus, userName, userColor])

  function handleTitleChange(newTitle: string) {
    setTitle(newTitle)
  }

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
      {connectionStatus === 'disconnected' && (
        <div className="disconnect-banner">
          <span>
            <WifiOff size={16} style={{ display: 'inline', marginRight: '8px' }} />
            WebSocket disconnected. Attempting to reconnect...
          </span>
          <button onClick={() => connectWebSocket()}>
            Reconnect Now
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
            onChange={(e) => handleTitleChange(e.target.value)}
            placeholder="Untitled"
          />
        </div>

        <div className="header-right">
          <div className={`status-badge ${connectionStatus}`}>
            <span className="status-dot"></span>
            {connectionStatus === 'connected' && 'Connected'}
            {connectionStatus === 'connecting' && 'Connecting...'}
            {connectionStatus === 'disconnected' && 'Disconnected'}
          </div>

          {collaborators.length > 0 && (
            <div className="collaborators">
              {collaborators.slice(0, 4).map((user, i) => (
                <div
                  key={i}
                  className="avatar"
                  style={{ background: user.color }}
                  title={user.name}
                >
                  {user.name.substring(0, 2).toUpperCase()}
                </div>
              ))}
            </div>
          )}
        </div>
      </header>

      <div className="editor-toolbar">
        <button
          className={`toolbar-btn ${editor?.isActive('bold') ? 'is-active' : ''}`}
          onClick={() => editor?.chain().focus().toggleBold().run()}
          title="Bold (Ctrl+B)"
        >
          <Bold size={16} />
        </button>
        
        <button
          className={`toolbar-btn ${editor?.isActive('italic') ? 'is-active' : ''}`}
          onClick={() => editor?.chain().focus().toggleItalic().run()}
          title="Italic (Ctrl+I)"
        >
          <Italic size={16} />
        </button>
        
        <button
          className={`toolbar-btn ${editor?.isActive('strike') ? 'is-active' : ''}`}
          onClick={() => editor?.chain().focus().toggleStrike().run()}
          title="Strikethrough"
        >
          <Strikethrough size={16} />
        </button>
        
        <button
          className={`toolbar-btn ${editor?.isActive('code') ? 'is-active' : ''}`}
          onClick={() => editor?.chain().focus().toggleCode().run()}
          title="Code (Ctrl+E)"
        >
          <Code size={16} />
        </button>

        <div className="toolbar-divider"></div>

        <button
          className={`toolbar-btn ${editor?.isActive('bulletList') ? 'is-active' : ''}`}
          onClick={() => editor?.chain().focus().toggleBulletList().run()}
          title="Bullet List"
        >
          <List size={16} />
        </button>
        
        <button
          className={`toolbar-btn ${editor?.isActive('orderedList') ? 'is-active' : ''}`}
          onClick={() => editor?.chain().focus().toggleOrderedList().run()}
          title="Numbered List"
        >
          <ListOrdered size={16} />
        </button>
      </div>

      <div className="editor-container">
        <div className="editor-content">
          {editor ? (
            <EditorContent editor={editor} />
          ) : (
            <div className="loading-state">
              <Loader2 size={32} className="spin" />
              <p>Loading editor...</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default Editor
