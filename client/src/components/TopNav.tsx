import { FileText } from 'lucide-react'
import './TopNav.css'

interface TopNavProps {
  userName: string
}

export function TopNav({ userName }: TopNavProps) {
  return (
    <div className="top-nav">
      <div className="top-nav-left">
        <div className="logo">
          <FileText size={20} />
          <span className="logo-text">Collaborative Editor</span>
        </div>
        
      </div>
      <div className="top-nav-right">
        <span className="status-text">{userName}</span>
      </div>
    </div>
  )
}
