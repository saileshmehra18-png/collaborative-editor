import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import * as Y from 'yjs'
import { TopNav } from '../components/TopNav'
import { SecondaryHeader } from '../components/SecondaryHeader'
import { TabBar, TabType } from '../components/TabBar'
import { EditorToolbar } from '../components/EditorToolbar'
import { EditorContent } from '../components/EditorContent'
import { StatusBar } from '../components/StatusBar'
import './Editor.css'

function Editor() {
  const { docId } = useParams<{ docId: string }>()
  const navigate = useNavigate()
  
  const [title, setTitle] = useState('Untitled')
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting')
  const [activeTab, setActiveTab] = useState<TabType>('editor')
  const [showPeerCursors, setShowPeerCursors] = useState(true)
  const [showCRDTClock, setShowCRDTClock] = useState(false)
  const [onlineUsers, setOnlineUsers] = useState(1)
  
  const ydocRef = useRef<Y.Doc | null>(null)
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>()

  const userName = localStorage.getItem('userName') || 'Anonymous'

  useEffect(() => {
    if (!docId) return

    // Load document metadata
    const token = localStorage.getItem('token')
    fetch(`http://localhost:4000/api/documents`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
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

    const token = localStorage.getItem('token')
    // FIXED: Added /ws path as per main branch backend
    const ws = new WebSocket(`ws://localhost:4000/ws?docId=${docId}&token=${token}`)
    wsRef.current = ws

    ws.onopen = () => {
      setConnectionStatus('connected')
      console.log('WebSocket connected')
    }

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        
        if (data.type === 'sync' || data.type === 'update') {
          const update = new Uint8Array(data.update)
          Y.applyUpdate(ydocRef.current!, update)
        }

        if (data.type === 'awareness') {
          // Handle awareness updates for collaborator presence
          const awarenessUpdate = new Uint8Array(data.update)
          // TODO: Apply awareness update to show peer cursors
          console.log('Awareness update received', awarenessUpdate)
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
    </div>
  )
}

export default Editor
