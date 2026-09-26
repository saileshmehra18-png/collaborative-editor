import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { FileText, Plus, Search } from 'lucide-react'
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
  const navigate = useNavigate()

  useEffect(() => {
    loadDocuments()
  }, [])

  async function loadDocuments() {
    try {
      const res = await fetch('/api/documents')
      const data = await res.json()
      setDocuments(data)
    } catch (error) {
      console.error('Failed to load documents:', error)
    } finally {
      setLoading(false)
    }
  }

  async function createDocument() {
    try {
      const res = await fetch('/api/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newDocTitle || 'Untitled' })
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
    }
  }

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
      <header className="dashboard-header">
        <div className="header-content">
          <div className="logo">
            <FileText size={24} />
            <span className="logo-text">Collaborative Editor</span>
          </div>
          <button className="btn-primary" onClick={() => setShowCreateModal(true)}>
            <Plus size={16} />
            New Document
          </button>
        </div>
      </header>

      <main className="dashboard-main">
        <div className="dashboard-content">
          <div className="section-header">
            <h1 className="headline-xl">All Documents</h1>
            <div className="search-box">
              <Search size={16} />
              <input type="text" placeholder="Search documents..." />
            </div>
          </div>

          {loading ? (
            <div className="loading">Loading documents...</div>
          ) : documents.length === 0 ? (
            <div className="empty-state">
              <FileText size={48} />
              <h2>No documents yet</h2>
              <p>Create your first collaborative document to get started</p>
              <button className="btn-primary" onClick={() => setShowCreateModal(true)}>
                <Plus size={16} />
                Create Document
              </button>
            </div>
          ) : (
            <div className="documents-grid">
              {documents.map(doc => (
                <div
                  key={doc.id}
                  className="document-card"
                  onClick={() => navigate(`/documents/${doc.id}`)}
                >
                  <FileText size={20} />
                  <div className="document-info">
                    <h3 className="document-title">{doc.title}</h3>
                    <p className="document-meta">{formatTime(doc.updated_at)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2 className="headline-lg">Create Collaborative Document</h2>
            <div className="modal-body">
              <label className="label-md">Document Title</label>
              <input
                type="text"
                className="input"
                placeholder="Untitled"
                value={newDocTitle}
                onChange={e => setNewDocTitle(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && createDocument()}
                autoFocus
              />
            </div>
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setShowCreateModal(false)}>
                Cancel
              </button>
              <button className="btn-primary" onClick={createDocument}>
                Create & Connect
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Dashboard
