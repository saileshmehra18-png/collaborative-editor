import { 
  Bold, 
  Italic, 
  Strikethrough, 
  Code,
  List,
  ListOrdered,
  CheckSquare,
  Undo,
  Redo
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
  editor
}: EditorToolbarProps) {
  return (
    <div className="editor-toolbar">
      <div className="toolbar-group">
        <button
          className={`toolbar-btn ${editor?.isActive('bold') ? 'active' : ''}`}
          onClick={() => editor?.chain().focus().toggleBold().run()}
          title="Bold (Cmd+B)"
        >
          <Bold size={16} />
        </button>
        
        <button
          className={`toolbar-btn ${editor?.isActive('italic') ? 'active' : ''}`}
          onClick={() => editor?.chain().focus().toggleItalic().run()}
          title="Italic (Cmd+I)"
        >
          <Italic size={16} />
        </button>
        
        <button
          className={`toolbar-btn ${editor?.isActive('strike') ? 'active' : ''}`}
          onClick={() => editor?.chain().focus().toggleStrike().run()}
          title="Strikethrough (Cmd+Shift+X)"
        >
          <Strikethrough size={16} />
        </button>
        
        <button
          className={`toolbar-btn ${editor?.isActive('code') ? 'active' : ''}`}
          onClick={() => editor?.chain().focus().toggleCode().run()}
          title="Code (Cmd+E)"
        >
          <Code size={16} />
        </button>
      </div>

      <div className="toolbar-divider"></div>

      <div className="toolbar-group">
        <select 
          className="toolbar-select"
          onChange={(e) => {
            const level = parseInt(e.target.value)
            if (level === 0) {
              editor?.chain().focus().setParagraph().run()
            } else {
              editor?.chain().focus().toggleHeading({ level }).run()
            }
          }}
          value={
            editor?.isActive('heading', { level: 1 }) ? '1' :
            editor?.isActive('heading', { level: 2 }) ? '2' :
            editor?.isActive('heading', { level: 3 }) ? '3' : '0'
          }
        >
          <option value="0">Paragraph</option>
          <option value="1">Heading 1</option>
          <option value="2">Heading 2</option>
          <option value="3">Heading 3</option>
        </select>
      </div>

      <div className="toolbar-divider"></div>

      <div className="toolbar-group">
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
      </div>

      <div className="toolbar-divider"></div>

      <div className="toolbar-group">
        <button
          className="toolbar-btn"
          onClick={() => editor?.chain().focus().undo().run()}
          disabled={!editor?.can().undo()}
          title="Undo"
        >
          <Undo size={16} />
        </button>
        
        <button
          className="toolbar-btn"
          onClick={() => editor?.chain().focus().redo().run()}
          disabled={!editor?.can().redo()}
          title="Redo"
        >
          <Redo size={16} />
        </button>
      </div>
    </div>
  )
}
