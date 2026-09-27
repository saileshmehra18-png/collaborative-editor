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
        </button>
        
        <button className="doc-id-btn" title="Copy document ID" onClick={() => navigator.clipboard.writeText(docId)}>
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
