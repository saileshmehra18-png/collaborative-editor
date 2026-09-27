import { FileText, Keyboard, HelpCircle, ChevronDown } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { clearAuthSession } from '../auth/authStorage'
import './TopNav.css'

interface TopNavProps {
  connectionStatus: 'connected' | 'connecting' | 'disconnected' | 'error'
  onlineCount: number
  currentDoc?: { title: string; id: string }
}

export function TopNav({ connectionStatus, onlineCount, currentDoc }: TopNavProps) {
  const navigate = useNavigate();

  const statusConfig = {
    connected: { text: 'Connected', color: '#10b981', label: 'yjs://sync' },
    connecting: { text: 'Connecting...', color: '#f59e0b', label: 'connecting...' },
    disconnected: { text: 'Disconnected', color: '#ef4444', label: 'offline' },
    error: { text: 'Error', color: '#ef4444', label: 'error' }
  }

  const status = statusConfig[connectionStatus] || statusConfig.error

  return (
    <div className="top-nav">
      <div className="top-nav-left">
        <div className="logo" style={{ cursor: 'pointer' }} onClick={() => navigate('/documents')}>
          <FileText size={20} />
          <span className="logo-text">Collaborative Editor</span>
        </div>
        
        <div className="breadcrumb">
          <span className="breadcrumb-item" onClick={() => navigate('/documents')}>Documents</span>
          <span className="breadcrumb-separator">/</span>
          <span className="breadcrumb-item active">{currentDoc?.title || 'Loading...'}</span>
        </div>
      </div>

      <div className="top-nav-center">
        <button className="tab-btn" onClick={() => navigate('/documents')}>All Documents</button>
        <button className="tab-btn active">Active Document</button>
      </div>

      <div className="top-nav-right">
        <div className="connection-indicator" style={{ '--status-color': status.color } as any}>
          <span className="status-dot"></span>
          <span className="status-text">{status.text}</span>
          <span className="status-label text-mono">{status.label}</span>
        </div>

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
