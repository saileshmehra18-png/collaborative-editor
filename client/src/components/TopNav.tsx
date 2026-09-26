import { FileText, Users, Keyboard, HelpCircle, ChevronDown } from 'lucide-react'
import './TopNav.css'

interface TopNavProps {
  connectionStatus: 'connected' | 'connecting' | 'disconnected'
  onlineCount: number
  currentDoc?: { title: string; id: string }
}

export function TopNav({ connectionStatus, onlineCount, currentDoc }: TopNavProps) {
  const statusConfig = {
    connected: { text: 'Connected', color: '#10b981', label: 'yjs://sync:443' },
    connecting: { text: 'Connecting...', color: '#f59e0b', label: 'connecting...' },
    disconnected: { text: 'Disconnected', color: '#ef4444', label: 'offline' }
  }

  const status = statusConfig[connectionStatus]

  return (
    <div className="top-nav">
      <div className="top-nav-left">
        <div className="logo">
          <FileText size={20} />
          <span className="logo-text">Collaborative Editor</span>
        </div>
        
        <div className="breadcrumb">
          <span className="breadcrumb-item">Documents</span>
          <span className="breadcrumb-separator">/</span>
          <span className="breadcrumb-item active">{currentDoc?.title || 'rfc-distributed-crdt-sync...'}</span>
          <ChevronDown size={16} />
        </div>
      </div>

      <div className="top-nav-center">
        <button className="tab-btn active">All Documents</button>
        <button className="tab-btn">Active Document</button>
      </div>

      <div className="top-nav-right">
        <div className="connection-indicator" style={{ '--status-color': status.color } as any}>
          <span className="status-dot"></span>
          <span className="status-text">{status.text}</span>
          <span className="status-label text-mono">{status.label}</span>
        </div>

        <div className="avatar-group">
          {['AM', 'SK', 'DL', 'ER'].map((initials, i) => (
            <div key={i} className="avatar" style={{ background: `hsl(${i * 90}, 70%, 50%)` }}>
              {initials}
            </div>
          ))}
        </div>

        <button className="icon-btn" title="Shortcuts">
          <Keyboard size={16} />
          <span className="kbd-hint">⌘K</span>
        </button>

        <button className="icon-btn" title="Help">
          <HelpCircle size={16} />
        </button>
      </div>
    </div>
  )
}
