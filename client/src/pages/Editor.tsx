import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
<<<<<<< HEAD
import * as Y from 'yjs'
import { TopNav } from '../components/TopNav'
import { SecondaryHeader } from '../components/SecondaryHeader'
import { TabBar, TabType } from '../components/TabBar'
import { EditorToolbar } from '../components/EditorToolbar'
import { EditorContent } from '../components/EditorContent'
import { StatusBar } from '../components/StatusBar'
import './Editor.css'

=======
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

>>>>>>> 4fc3ff0d45c572259243a46518aa44ccf0278256
function Editor() {
  const { docId } = useParams<{ docId: string }>()
  const navigate = useNavigate()
  
  const [title, setTitle] = useState('Untitled')
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting')
<<<<<<< HEAD
  const [activeTab, setActiveTab] = useState<TabType>('editor')
  const [showPeerCursors, setShowPeerCursors] = useState(true)
  const [showCRDTClock, setShowCRDTClock] = useState(false)
  const [onlineUsers, setOnlineUsers] = useState(1)
=======
  const [collaborators, setCollaborators] = useState<Array<{ name: string; color: string }>>([])
>>>>>>> 4fc3ff0d45c572259243a46518aa44ccf0278256
  
  const ydocRef = useRef<Y.Doc | null>(null)
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>()

<<<<<<< HEAD
  const userName = localStorage.getItem('userName') || 'Anonymous'
=======
  const userName = `User${Math.floor(Math.random() * 1000)}`
  const userColor = COLORS[Math.floor(Math.random() * COLORS.length)]
>>>>>>> 4fc3ff0d45c572259243a46518aa44ccf0278256

  useEffect(() => {
    if (!docId) return

    // Load document metadata
<<<<<<< HEAD
    const token = localStorage.getItem('token')
    fetch(`http://localhost:4000/api/documents`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
=======
    fetch(`/api/documents`)
>>>>>>> 4fc3ff0d45c572259243a46518aa44ccf0278256
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

<<<<<<< HEAD
    const token = localStorage.getItem('token')
    // FIXED: Added /ws path as per main branch backend
    const ws = new WebSocket(`ws://localhost:4000/ws?docId=${docId}&token=${token}`)
=======
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const ws = new WebSocket(`${protocol}//localhost:4000?docId=${docId}`)
>>>>>>> 4fc3ff0d45c572259243a46518aa44ccf0278256
    wsRef.current = ws

    ws.onopen = () => {
      setConnectionStatus('connected')
<<<<<<< HEAD
      console.log('WebSocket connected')
=======
>>>>>>> 4fc3ff0d45c572259243a46518aa44ccf0278256
    }

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        
        if (data.type === 'sync' || data.type === 'update') {
          const update = new Uint8Array(data.update)
          Y.applyUpdate(ydocRef.current!, update)
        }
<<<<<<< HEAD

        if (data.type === 'awareness') {
          // Handle awareness updates for collaborator presence
          const awarenessUpdate = new Uint8Array(data.update)
          // TODO: Apply awareness update to show peer cursors
          console.log('Awareness update received', awarenessUpdate)
        }
=======
>>>>>>> 4fc3ff0d45c572259243a46518aa44ccf0278256
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

<<<<<<< HEAD
=======
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

>>>>>>> 4fc3ff0d45c572259243a46518aa44ccf0278256
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
<<<<<<< HEAD
      <TopNav
        userName={userName}
        breadcrumbs={[
          { label: 'Documents', path: '/documents' },
          { label: title, path: `/documents/${docId}` }
        ]}
        connectionStatus={connectionStatus}
        onlineUsers={onlineUsers}
      />

      <SecondaryHeader
        version="v1.2.3"
        documentTitle={title}
        onDocumentChange={(newTitle) => setTitle(newTitle)}
        onlineUsers={onlineUsers}
      />

      <TabBar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        documentName={title}
      />

      {activeTab === 'editor' && (
        <>
          <EditorToolbar
            showPeerCursors={showPeerCursors}
            onTogglePeerCursors={() => setShowPeerCursors(!showPeerCursors)}
            showCRDTClock={showCRDTClock}
            onToggleCRDTClock={() => setShowCRDTClock(!showCRDTClock)}
          />

          {ydocRef.current && (
            <EditorContent
              ydoc={ydocRef.current}
              showCRDTClock={showCRDTClock}
              showPeerCursors={showPeerCursors}
            />
          )}
        </>
      )}

      {activeTab === 'dashboard' && (
        <div className="dashboard-view">
          <h2>Dashboard</h2>
          <p>Document statistics and analytics will be displayed here.</p>
        </div>
      )}

      {activeTab === 'diagnostics' && (
        <div className="diagnostics-view">
          <h2>Diagnostics</h2>
          <div className="diagnostic-info">
            <p><strong>Document ID:</strong> {docId}</p>
            <p><strong>Connection Status:</strong> {connectionStatus}</p>
            <p><strong>Yjs Client ID:</strong> {ydocRef.current?.clientID}</p>
            <p><strong>Online Users:</strong> {onlineUsers}</p>
          </div>
        </div>
      )}

      <StatusBar
        wsConnected={connectionStatus === 'connected'}
        apiEndpoint="http://localhost:4000"
        wsEndpoint="ws://localhost:4000/ws"
      />
=======
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
>>>>>>> 4fc3ff0d45c572259243a46518aa44ccf0278256
    </div>
  )
}

export default Editor
