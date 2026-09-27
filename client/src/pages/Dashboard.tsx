import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { TopNav } from '../components/TopNav'
import { API_BASE } from '../config'
import './Dashboard.css'

interface Document {
  id: string
  title: string
  updated_at: number
}

function Dashboard() {
  const [documents, setDocuments] = useState<Document[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newDocTitle, setNewDocTitle] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const navigate = useNavigate()

  const userName = localStorage.getItem('userName') || 'Anonymous'

  useEffect(() => {
    loadDocuments()
  }, [])

  async function loadDocuments() {
    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`${API_BASE}/api/documents`, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      })
      
      if (res.ok) {
        const data = await res.json()
        setDocuments(data)
      }
    } catch (error) {
      console.error('Failed to load documents:', error)
    } finally {
      setLoading(false)
    }
  }

  async function createDocument() {
    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`${API_BASE}/api/documents`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ title: newDocTitle || 'Untitled Document' })
      })
      
      if (!res.ok) {
        throw new Error(`Failed to create document: ${res.status}`)
      }
      
      const doc = await res.json()
      setShowCreateModal(false)
      setNewDocTitle('')
      navigate(`/documents/${doc.id}`)
    } catch (error) {
      console.error('Failed to create document:', error)
      alert('Failed to create document. Please try again.')
    }
  }

  const filteredDocuments = documents.filter(doc =>
    doc.title.toLowerCase().includes(searchQuery.toLowerCase())
  )

  function formatTime(timestamp: number) {
    const now = Date.now()
    const diff = now - timestamp
    const seconds = Math.floor(diff / 1000)
    const minutes = Math.floor(seconds / 60)
    const hours = Math.floor(minutes / 60)
    const days = Math.floor(hours / 24)

    if (seconds < 60) return 'just now'
    if (minutes < 60) return `${minutes}m ago`
    if (hours < 24) return `${hours}h ago`
    if (days < 7) return `${days}d ago`
    return new Date(timestamp).toLocaleDateString()
  }

  return (
    <div className="dashboard">
      <TopNav
        userName={userName}
        breadcrumbs={[{ label: 'Documents', path: '/documents' }]}
        connectionStatus="disconnected"
        onlineUsers={1}
      />

      <main className="dashboard-main">
        <div className="dashboard-hero">
          <div className="hero-content">
            <h1 className="hero-title">Your Collaborative Workspace</h1>
            <p className="hero-subtitle">
              Create, edit, and collaborate on documents in real-time with CRDT-powered synchronization
            </p>
            <button className="btn-create-large" onClick={() => setShowCreateModal(true)}>
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M10 4v12M4 10h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
              Create New Document
            </button>
          </div>
        </div>

        <div className="dashboard-content">
          <div className="content-header">
            <div className="header-left">
              <h2 className="section-title">Recent Documents</h2>
              <span className="doc-count">{documents.length} total</span>
            </div>
            <div className="search-box">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.5"/>
                <path d="M11 11l3.5 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
              <input
                type="text"
                placeholder="Search documents..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          {loading ? (
            <div className="loading-state">
              <div className="spinner"></div>
              <p>Loading your documents...</p>
            </div>
          ) : filteredDocuments.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📄</div>
              <h3>No documents found</h3>
              <p>
                {searchQuery
                  ? 'Try a different search term'
                  : 'Create your first document to get started'}
              </p>
              {!searchQuery && (
                <button className="btn-primary" onClick={() => setShowCreateModal(true)}>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                  Create Document
                </button>
              )}
            </div>
          ) : (
            <div className="documents-grid">
              {filteredDocuments.map(doc => (
                <div
                  key={doc.id}
                  className="document-card"
                  onClick={() => navigate(`/documents/${doc.id}`)}
                >
                  <div className="card-header">
                    <div className="card-icon">
                      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                        <path d="M4 3h8l4 4v10a1 1 0 01-1 1H4a1 1 0 01-1-1V4a1 1 0 011-1z" stroke="currentColor" strokeWidth="1.5"/>
                        <path d="M12 3v4h4" stroke="currentColor" strokeWidth="1.5"/>
                      </svg>
                    </div>
                    <div className="card-menu">
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <circle cx="8" cy="3" r="1.5" fill="currentColor"/>
                        <circle cx="8" cy="8" r="1.5" fill="currentColor"/>
                        <circle cx="8" cy="13" r="1.5" fill="currentColor"/>
                      </svg>
                    </div>
                  </div>
                  <div className="card-content">
                    <h3 className="card-title">{doc.title}</h3>
                    <p className="card-meta">
                      <span className="meta-item">
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                          <circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="1.5"/>
                          <path d="M7 3.5v4l2.5 1.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                        </svg>
                        {formatTime(doc.updated_at)}
                      </span>
                    </p>
                  </div>
                  <div className="card-footer">
                    <div className="card-tags">
                      <span className="tag">Collaborative</span>
                    </div>
                    <button className="btn-card-action" onClick={(e) => { e.stopPropagation(); navigate(`/documents/${doc.id}`) }}>
                      Open →
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal-card" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Create New Document</h2>
              <button className="modal-close" onClick={() => setShowCreateModal(false)}>
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              </button>
            </div>
            <div className="modal-body">
              <label className="input-label">Document Title</label>
              <input
                type="text"
                className="input-field"
                placeholder="Enter document title..."
                value={newDocTitle}
                onChange={e => setNewDocTitle(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && createDocument()}
                autoFocus
              />
              <p className="input-hint">
                Choose a descriptive title for your collaborative document
              </p>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setShowCreateModal(false)}>
                Cancel
              </button>
              <button className="btn-primary" onClick={createDocument}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
                Create Document
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Dashboard
