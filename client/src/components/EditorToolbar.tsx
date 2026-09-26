import { 
  Bold, 
  Italic, 
  Strikethrough, 
  Code,
  List,
  ListOrdered,
  CheckSquare,
  Info,
  Eye,
  GitBranch
} from 'lucide-react'
import './EditorToolbar.css'

interface EditorToolbarProps {
  editor: any
  showPeerCursors: boolean
  onTogglePeerCursors: () => void
  showCRDTClock: boolean
  onToggleCRDTClock: () => void
}

export function EditorToolbar({ 
  editor, 
  showPeerCursors, 
  onTogglePeerCursors,
  showCRDTClock,
  onToggleCRDTClock 
}: EditorToolbarProps) {
  return (
    <div className="editor-toolbar">
      <div className="toolbar-section">
        <button
          className={`toolbar-btn ${editor?.isActive('bold') ? 'active' : ''}`}
          onClick={() => editor?.chain().focus().toggleBold().run()}
          title="Bold"
        >
          <Bold size={16} />
        </button>
        
        <button
          className={`toolbar-btn ${editor?.isActive('italic') ? 'active' : ''}`}
          onClick={() => editor?.chain().focus().toggleItalic().run()}
          title="Italic"
        >
          <Italic size={16} />
        </button>
        
        <button
          className={`toolbar-btn ${editor?.isActive('strike') ? 'active' : ''}`}
          onClick={() => editor?.chain().focus().toggleStrike().run()}
          title="Strikethrough"
        >
          <Strikethrough size={16} />
        </button>
        
        <button
          className={`toolbar-btn ${editor?.isActive('code') ? 'active' : ''}`}
          onClick={() => editor?.chain().focus().toggleCode().run()}
          title="Code"
        >
          <Code size={16} />
        </button>
      </div>

      <div className="toolbar-divider"></div>

      <div className="toolbar-section">
        <select 
          className="heading-select"
          onChange={(e) => {
            const level = parseInt(e.target.value)
            if (level === 0) {
              editor?.chain().focus().setParagraph().run()
            } else {
              editor?.chain().focus().toggleHeading({ level }).run()
            }
          }}
        >
          <option value="0">Paragraph</option>
          <option value="1">Heading 1</option>
          <option value="2">Heading 2</option>
          <option value="3">Heading 3</option>
        </select>
      </div>

      <div className="toolbar-divider"></div>

      <div className="toolbar-section">
        <button
          className={`toolbar-btn ${editor?.isActive('bulletList') ? 'active' : ''}`}
          onClick={() => editor?.chain().focus().toggleBulletList().run()}
          title="Bullet List"
        >
          <List size={16} />
        </button>
        
        <button
          className={`toolbar-btn ${editor?.isActive('orderedList') ? 'active' : ''}`}
          onClick={() => editor?.chain().focus().toggleOrderedList().run()}
          title="Numbered List"
        >
          <ListOrdered size={16} />
        </button>
        
        <button
          className={`toolbar-btn ${editor?.isActive('taskList') ? 'active' : ''}`}
          onClick={() => editor?.chain().focus().toggleTaskList().run()}
          title="Task List"
        >
          <CheckSquare size={16} />
        </button>
        
        <button
          className="toolbar-btn"
          title="Info"
        >
          <Info size={16} />
        </button>
      </div>

      <div className="toolbar-spacer"></div>

      <div className="toolbar-section">
        <button
          className={`toggle-btn ${showPeerCursors ? 'active' : ''}`}
          onClick={onTogglePeerCursors}
        >
          <Eye size={14} />
          <span>Show Peer Cursors</span>
        </button>
        
        <button
          className={`toggle-btn ${showCRDTClock ? 'active' : ''}`}
          onClick={onToggleCRDTClock}
        >
          <GitBranch size={14} />
          <span>CRDT Vector Clock</span>
        </button>
      </div>
    </div>
  )
}
