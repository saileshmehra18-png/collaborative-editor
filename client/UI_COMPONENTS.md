# Collaborative Editor UI Components

## Overview
This document describes the sophisticated UI components built for the collaborative editor, matching the design mockup provided. The UI features a dark glassmorphism theme with professional visual design.

## Architecture

### Component Hierarchy
```
Editor Page
├── TopNav (Global Navigation)
├── SecondaryHeader (Document Controls)
├── TabBar (View Switcher)
├── EditorToolbar (Formatting Controls)
├── EditorContent (Main Editor Area)
│   ├── Document Metadata
│   ├── CRDT Vector Clock (toggleable)
│   ├── Editor Area
│   └── Verification Callout
└── StatusBar (Connection Status)
```

## Component Details

### 1. TopNav Component
**Location:** `src/components/TopNav.tsx`

**Features:**
- Logo and branding
- Breadcrumb navigation
- Connection status indicator (Connected/Syncing/Offline)
- Online user count with avatar display
- Profile dropdown menu

**Props:**
```typescript
interface TopNavProps {
  userName: string
  breadcrumbs: Array<{ label: string; path: string }>
  connectionStatus: 'connecting' | 'connected' | 'disconnected'
  onlineUsers: number
}
```

### 2. SecondaryHeader Component
**Location:** `src/components/SecondaryHeader.tsx`

**Features:**
- Version badge display
- Document title editor
- Document selector dropdown
- Online users indicator
- Quick actions menu

**Props:**
```typescript
interface SecondaryHeaderProps {
  version: string
  documentTitle: string
  onDocumentChange: (title: string) => void
  onlineUsers: number
}
```

### 3. TabBar Component
**Location:** `src/components/TabBar.tsx`

**Features:**
- Three view modes: Dashboard, Active Editor, Diagnostics
- Active tab highlighting
- Document name display in editor tab
- Split view and more options buttons

**Props:**
```typescript
interface TabBarProps {
  activeTab: 'dashboard' | 'editor' | 'diagnostics'
  onTabChange: (tab: TabType) => void
  documentName?: string
}
```

### 4. EditorToolbar Component
**Location:** `src/components/EditorToolbar.tsx`

**Features:**
- Text formatting buttons (Bold, Italic, Underline, Strike, Code)
- Alignment controls
- List controls (Bullet, Numbered)
- Link and image insertion
- Peer cursors toggle with live indicator
- CRDT vector clock toggle

**Props:**
```typescript
interface EditorToolbarProps {
  showPeerCursors: boolean
  onTogglePeerCursors: () => void
  showCRDTClock: boolean
  onToggleCRDTClock: () => void
}
```

### 5. EditorContent Component
**Location:** `src/components/EditorContent.tsx`

**Features:**
- Document metadata display (Created, Modified, Version)
- Real-time word and character count
- Sync status indicator with live updates
- CRDT vector clock display (toggleable)
- Rich text editor area with Yjs integration
- Peer cursors overlay (toggleable)
- Verification callout for sync confirmation

**Props:**
```typescript
interface EditorContentProps {
  ydoc: Y.Doc
  showCRDTClock: boolean
  showPeerCursors: boolean
}
```

**Metadata Tracked:**
- Document creation timestamp
- Last modification timestamp
- Version number
- Word count (live updates)
- Character count (live updates)
- Sync status (synced/syncing/offline)
- Last sync time

### 6. StatusBar Component
**Location:** `src/components/StatusBar.tsx`

**Features:**
- REST API endpoint display
- WebSocket endpoint display
- Connection status indicators (Online/Offline, Connected/Disconnected)
- Last sync time with "X ago" display
- System time clock
- Network settings and refresh buttons

**Props:**
```typescript
interface StatusBarProps {
  wsConnected: boolean
  apiEndpoint?: string
  wsEndpoint?: string
}
```

## Design System

### Color Palette
```css
/* Primary Colors */
--bg-primary: #0f172a       /* Dark slate background */
--bg-secondary: #1e293b     /* Secondary surfaces */
--bg-tertiary: #334155      /* Tertiary surfaces */

/* Accent Colors */
--accent-primary: #6366f1   /* Indigo accent */
--accent-hover: #4f46e5     /* Hover state */
--success: #10b981          /* Success green */
--warning: #f59e0b          /* Warning amber */
--error: #ef4444            /* Error red */

/* Text Colors */
--text-primary: #f1f5f9     /* Primary text */
--text-secondary: #cbd5e1   /* Secondary text */
--text-tertiary: #94a3b8    /* Tertiary text */
```

### Typography
- **Primary Font:** Inter (sans-serif)
- **Monospace Font:** JetBrains Mono

### Visual Effects
- **Glassmorphism:** `backdrop-filter: blur(10px)` with semi-transparent backgrounds
- **Borders:** Subtle indigo borders with opacity (`rgba(99, 102, 241, 0.2)`)
- **Shadows:** Soft elevation shadows for depth
- **Animations:** Smooth transitions (0.2s ease) and pulse effects for live indicators

## Integration with Backend

### WebSocket Connection
The editor connects to the backend WebSocket server with:
```typescript
ws://localhost:4000?docId={docId}&token={authToken}
```

### Message Types Handled
1. **sync** - Initial document state
2. **update** - Document changes via Yjs
3. **awareness** - Collaborator presence updates

### Yjs Integration
- Uses `Y.Doc` for CRDT document representation
- Real-time sync via WebSocket
- Automatic conflict resolution
- Vector clock tracking for debugging

### API Endpoints Used
- `GET /api/documents` - List all documents
- `POST /api/documents` - Create new document
- WebSocket connection for real-time sync

## State Management

### Local State
- Connection status (connecting/connected/disconnected)
- Active tab (dashboard/editor/diagnostics)
- UI toggles (peer cursors, CRDT clock)
- Document metadata (title, word count, etc.)

### Synchronized State (via Yjs)
- Document content
- Collaborator awareness (cursors, selections)
- Edit operations

## Features Implemented

### ✅ Completed
- [x] Dark glassmorphism theme
- [x] Top navigation with breadcrumbs
- [x] Secondary header with version and doc selector
- [x] Tab-based view switching
- [x] Rich text formatting toolbar
- [x] Peer cursors toggle
- [x] CRDT vector clock toggle
- [x] Document metadata display
- [x] Real-time word/character count
- [x] Sync status indicators
- [x] Connection status displays
- [x] Status bar with endpoints and time
- [x] Yjs document integration
- [x] WebSocket connection handling
- [x] Responsive design
- [x] Custom scrollbars

### 🔄 Pending Backend Integration
- [ ] Yjs Awareness provider integration
- [ ] Peer cursor positioning
- [ ] Real-time collaborator avatars
- [ ] Document version history
- [ ] Conflict resolution visualization

## File Structure
```
client/src/
├── components/
│   ├── TopNav.tsx
│   ├── TopNav.css
│   ├── SecondaryHeader.tsx
│   ├── SecondaryHeader.css
│   ├── TabBar.tsx
│   ├── TabBar.css
│   ├── EditorToolbar.tsx
│   ├── EditorToolbar.css
│   ├── EditorContent.tsx
│   ├── EditorContent.css
│   ├── StatusBar.tsx
│   └── StatusBar.css
├── pages/
│   ├── Editor.tsx
│   ├── Editor.css
│   ├── Dashboard.tsx
│   └── Dashboard.css
├── index.css (global theme variables)
└── main.tsx
```

## Usage Example

```typescript
import { Editor } from './pages/Editor'

// The Editor page automatically integrates all components:
// - TopNav for navigation
// - SecondaryHeader for document controls
// - TabBar for view switching
// - EditorToolbar for formatting
// - EditorContent for editing
// - StatusBar for connection status

// Navigate to: /editor/:docId
```

## Responsive Design
- Desktop: Full layout with all features
- Tablet: Adjusted spacing and some hidden labels
- Mobile: Compact toolbar, stacked layout

## Browser Compatibility
- Chrome/Edge: Full support
- Firefox: Full support
- Safari: Full support (with -webkit- prefixes)

## Performance Considerations
- Debounced metadata updates (word count)
- Efficient Yjs update handling
- CSS transforms for smooth animations
- Lazy loading for large documents

## Next Steps
1. Complete Yjs Awareness integration for peer cursors
2. Add real-time collaborator presence
3. Implement document version history UI
4. Add conflict resolution indicators
5. Enhance diagnostics view with CRDT visualizations
6. Add keyboard shortcuts
7. Implement undo/redo with CRDT-aware history
