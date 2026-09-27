import { FileText, HelpCircle } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { clearAuthSession } from '../auth/authStorage'
import './TopNav.css'

interface TopNavProps {
  connectionStatus?: 'connected' | 'connecting' | 'disconnected' | 'error'
  currentDoc?: { title: string; id: string }
  isDashboard?: boolean
}

export function TopNav({ connectionStatus, currentDoc, isDashboard }: TopNavProps) {
  const navigate = useNavigate();

  const statusConfig = {
    connected: { text: 'Connected', color: '#10b981', label: 'yjs://sync' },
    connecting: { text: 'Connecting...', color: '#f59e0b', label: 'connecting...' },
    disconnected: { text: 'Disconnected', color: '#ef4444', label: 'offline' },
    error: { text: 'Error', color: '#ef4444', label: 'error' }
  }

  const status = connectionStatus ? (statusConfig[connectionStatus] || statusConfig.error) : null;

  return (
    <div className="top-nav">
      <div className="top-nav-left">
        <div className="logo" style={{ cursor: 'pointer' }} onClick={() => navigate('/documents')}>
          <FileText size={20} />
          <span className="logo-text">Collaborative Editor</span>
        </div>
        
        {!isDashboard && (
          <div className="breadcrumb">
            <span className="breadcrumb-item" onClick={() => navigate('/documents')}>Documents</span>
            <span className="breadcrumb-separator">/</span>
            <span className="breadcrumb-item active">{currentDoc?.title || 'Loading...'}</span>
          </div>
        )}
      </div>

      <div className="top-nav-center">
        <button className={`tab-btn ${isDashboard ? 'active' : ''}`} onClick={() => navigate('/documents')}>All Documents</button>
        <button className={`tab-btn ${!isDashboard ? 'active' : ''}`} disabled={isDashboard}>Active Document</button>
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

        <button className="icon-btn" title="Help">
          <HelpCircle size={16} />
        </button>
      </div>
    </div>
  )
}
