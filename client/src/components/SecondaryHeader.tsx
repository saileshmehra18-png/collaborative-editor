import { ChevronDown, Plus, Copy } from 'lucide-react'
import './SecondaryHeader.css'

interface SecondaryHeaderProps {
  version: string
  docTitle: string
  docId: string
  onlineCount: number
  connectionDetails: string
  onNewDoc: () => void
}

export function SecondaryHeader({ 
  version, 
  docTitle, 
  docId, 
  onlineCount, 
  connectionDetails,
  onNewDoc 
}: SecondaryHeaderProps) {
  return (
    <div className="secondary-header">
      <div className="header-left-group">
        <div className="version-badge">{version}</div>
        
        <span className="divider">/</span>
        
        <button className="doc-selector">
          <span className="doc-title">{docTitle}</span>
          <ChevronDown size={14} />
        </button>
        
        <button className="doc-id-btn" title="Copy document ID">
          <span className="text-mono doc-id">{docId}</span>
          <Copy size={12} />
        </button>
      </div>

      <div className="header-right-group">
        <div className="connection-detail">
          <span className="status-icon">✓</span>
          <span className="text-mono detail-text">{connectionDetails}</span>
        </div>

        <div className="online-count">
          <div className="avatar-mini-group">
            <div className="avatar-mini" style={{ background: '#6366f1' }}>AM</div>
            <div className="avatar-mini" style={{ background: '#8b5cf6' }}>SK</div>
            <div className="avatar-mini" style={{ background: '#ec4899' }}>DL</div>
            <div className="avatar-mini" style={{ background: '#f59e0b' }}>ER</div>
          </div>
          <span className="online-text">{onlineCount} online</span>
        </div>

        <button className="new-doc-btn" onClick={onNewDoc}>
          <Plus size={16} />
          <span>New Doc</span>
        </button>
      </div>
    </div>
  )
}
