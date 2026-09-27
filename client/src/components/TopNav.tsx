import { FileText, HelpCircle } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { clearAuthSession } from '../auth/authStorage'
import './TopNav.css'

interface TopNavProps {
  connectionStatus?: 'connected' | 'connecting' | 'disconnected' | 'error'
  currentDoc?: { title: string; id: string }
  isDashboard?: boolean
}

export function TopNav({ connectionStatus, currentDoc, isDashboard }: TopNavProps) {
  const navigate = useNavigate();
  const [showHelp, setShowHelp] = useState(false);

  const statusConfig = {
    connected: { text: 'Connected', color: '#10b981', label: 'yjs://sync' },
    connecting: { text: 'Connecting...', color: '#f59e0b', label: 'connecting...' },
    disconnected: { text: 'Disconnected', color: '#ef4444', label: 'offline' },
    error: { text: 'Error', color: '#ef4444', label: 'error' }
  }

  const status = connectionStatus ? (statusConfig[connectionStatus] || statusConfig.error) : null;

  return (
    <>
      <div className="top-nav">
        <div className="top-nav-left">
          <button className="logo" onClick={() => navigate('/documents')} aria-label="Go to Documents">
            <FileText size={20} />
            <span className="logo-text">Collaborative Editor</span>
          </button>

          {!isDashboard && (
            <div className="breadcrumb">
              <button className="breadcrumb-item" onClick={() => navigate('/documents')}>Documents</button>
              <span className="breadcrumb-separator">/</span>
              <span className="breadcrumb-item active">{currentDoc?.title || 'Loading...'}</span>
            </div>
          )}
        </div>

        <div className="top-nav-center">
          <button className={`tab-btn ${isDashboard ? 'active' : ''}`} onClick={() => navigate('/documents')}>All Documents</button>
          <button
            className={`tab-btn ${!isDashboard ? 'active' : ''}`}
            disabled={isDashboard}
            onClick={() => currentDoc && navigate(`/documents/${currentDoc.id}`)}
          >
            Active Document
          </button>
        </div>

        <div className="top-nav-right">
          {status && (
            <div className="connection-indicator" style={{ '--status-color': status.color } as any}>
              <span className="status-dot"></span>
              <span className="status-text">{status.text}</span>
              <span className="status-label text-mono">{status.label}</span>
            </div>
          )}

          <button className="icon-btn" title="Sign Out" onClick={() => { clearAuthSession(); navigate('/login', { replace: true }); }}>
            <span>Sign Out</span>
          </button>

          <button className="icon-btn" title="Help" onClick={() => setShowHelp(true)}>
            <HelpCircle size={16} />
          </button>
        </div>
      </div>

      {showHelp && (
        <div className="modal-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) setShowHelp(false) }}>
          <div className="modal-card help-modal">
            <div className="modal-header">
              <h2 className="modal-title">About Collaborative Editor</h2>
              <button className="modal-close" onClick={() => setShowHelp(false)} aria-label="Close">×</button>
            </div>
            <div className="modal-body">
              <p>Welcome to the <strong>Collaborative Editor</strong>. This application is designed to demonstrate robust real-time synchronization using CRDTs (Conflict-free Replicated Data Types).</p>
              <ul className="help-feature-list">
                <li><strong>Real-time Collaboration:</strong> Edit documents simultaneously with other users. Changes sync instantly via WebSockets.</li>
                <li><strong>Version History (Time Machine):</strong> Automatically tracks sessions. Preview, compare, and restore previous versions seamlessly.</li>
                <li><strong>Conflict Simulator:</strong> Test offline capabilities. Disconnect, make local edits, and watch them merge perfectly when you reconnect.</li>
                <li><strong>Diagnostics:</strong> Inspect real-time data flow, including vector clocks, awareness (cursors/presence), and persistence ACKs.</li>
                <li><strong>Permissions & Sharing:</strong> Granular Owner, Editor, and Viewer access controls to secure your documents.</li>
              </ul>
            </div>
            <div className="modal-footer">
              <button className="btn-primary" onClick={() => setShowHelp(false)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
