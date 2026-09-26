# Yjs Awareness Protocol - WebSocket Message Format

## Overview

The backend now supports Yjs Awareness protocol for real-time collaborator presence tracking. Awareness state is relayed between clients but **NOT persisted to SQLite**.

## Message Types

### 1. Awareness Update (Client → Server & Server → Client)

**Message Format:**
```json
{
  "type": "awareness",
  "update": [1, 2, 3, ...]
}
```

**Fields:**
- `type`: Always `"awareness"`
- `update`: Array of numbers representing the encoded Yjs Awareness update (Uint8Array converted to number array)

**Encoding:**
The `update` field contains a Yjs-encoded awareness update using `y-protocols/awareness.encodeAwarenessUpdate()`. This is **not a custom format** - it follows the official Yjs protocol.

### 2. Document Sync (Unchanged)

**Message Format:**
```json
{
  "type": "sync",
  "update": [1, 2, 3, ...]
}
```

Sent once when a client connects, contains the full document state.

### 3. Document Update (Unchanged)

**Message Format:**
```json
{
  "type": "update",
  "update": [1, 2, 3, ...]
}
```

Sent whenever the document content changes.

## Awareness Flow

### Connection Flow

1. **Client connects** to `ws://localhost:4000?docId=<doc_id>`

2. **Server sends initial sync:**
   ```json
   {
     "type": "sync",
     "update": [...]
   }
   ```

3. **Server sends current awareness states** of all already-connected clients:
   ```json
   {
     "type": "awareness",
     "update": [...]
   }
   ```

### Update Flow

1. **Client sends awareness update** (e.g., cursor position, username, selection):
   ```json
   {
     "type": "awareness",
     "update": [...]
   }
   ```

2. **Server applies the update** to the awareness instance using `applyAwarenessUpdate()`

3. **Server broadcasts to all other clients** in the same document:
   ```json
   {
     "type": "awareness",
     "update": [...]
   }
   ```

### Disconnect Flow

1. **Client WebSocket closes**

2. **Server removes awareness state** for all clientIDs owned by that connection using `removeAwarenessStates()`

3. **Server broadcasts removal** to remaining clients automatically via the awareness `update` event

4. **Other clients receive awareness update** with removed client information

## Implementation Details

### Server-Side Data Structures

```typescript
// Per-document awareness instances
const awareness = new Map<string, awarenessProtocol.Awareness>();

// Track which WebSocket owns which clientIDs for cleanup
const wsToClientIds = new Map<WebSocket, Set<number>>();
```

### Awareness State NOT Persisted

- Awareness data is kept **only in memory**
- When all clients disconnect, awareness state is lost
- When a new client connects to an existing document, they only receive awareness of currently connected clients
- This is intentional - presence is ephemeral

### Client ID Tracking

When a client sends an awareness update:
1. Server applies the update
2. Server extracts all clientIDs from the awareness instance
3. Server tracks which clientIDs belong to which WebSocket
4. On disconnect, server removes all clientIDs for that WebSocket

### Broadcasting

- Awareness updates are broadcast to **all clients in the same document** EXCEPT the origin
- Uses the awareness instance's `update` event to automatically trigger broadcasts
- Changed clients (added, updated, removed) are encoded and sent to peers

## Frontend Integration

To use this from the frontend, use the official Yjs Awareness provider:

```typescript
import * as Y from 'yjs'
import * as awarenessProtocol from 'y-protocols/awareness'

const ydoc = new Y.Doc()
const awareness = new awarenessProtocol.Awareness(ydoc)

// Set local awareness state
awareness.setLocalState({
  user: { name: 'Alice', color: '#ff0000' },
  cursor: { x: 100, y: 200 }
})

// Listen for remote awareness changes
awareness.on('change', ({ added, updated, removed }) => {
  // Handle collaborator presence changes
  console.log('Added:', added)
  console.log('Updated:', updated)
  console.log('Removed:', removed)
})

// Connect to WebSocket
const ws = new WebSocket('ws://localhost:4000?docId=doc123')

ws.onmessage = (event) => {
  const msg = JSON.parse(event.data)
  
  if (msg.type === 'awareness') {
    const update = new Uint8Array(msg.update)
    awarenessProtocol.applyAwarenessUpdate(awareness, update, ws)
  }
}

// Send awareness updates
awareness.on('update', ({ added, updated, removed }) => {
  const changedClients = added.concat(updated).concat(removed)
  const update = awarenessProtocol.encodeAwarenessUpdate(awareness, changedClients)
  
  ws.send(JSON.stringify({
    type: 'awareness',
    update: Array.from(update)
  }))
})
```

## Testing

To test awareness:

1. Start the server: `npm run dev`
2. Connect multiple clients to the same document
3. Each client should send awareness updates with their user info
4. Each client should receive awareness updates from other clients
5. When a client disconnects, others should receive a removal update

## Authentication Integration

The current implementation works with authenticated WebSockets. Each WebSocket connection can have multiple clientIDs (one per Yjs document instance), and all are properly cleaned up on disconnect.

To associate awareness with authenticated users, include the user info in the awareness state:

```typescript
awareness.setLocalState({
  user: {
    id: authenticatedUserId,
    name: authenticatedUserName,
    color: userColor
  }
})
```
