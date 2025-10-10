# EduMeet Socket Integration Documentation

## Overview
EduMeet now supports both **Meeting** and **Whiteboard** functionality through separate Socket.IO namespaces, enabling comprehensive online collaboration with video/audio calls and real-time whiteboard sharing.

## Socket Namespaces

### 1. Meeting Socket (`/meeting`)
Handles video/audio conferencing with WebRTC signaling:

#### Connection
```javascript
const meetingSocket = io('http://localhost:5001/meeting');
```

#### Events

**Client → Server:**
- `join-meeting` - Join a meeting room
- `offer` - WebRTC offer for peer connection
- `answer` - WebRTC answer response  
- `ice-candidate` - ICE candidate exchange
- `leave-meeting` - Leave meeting room

**Server → Client:**
- `meeting-joined` - Successfully joined meeting
- `user-joined` - New user joined meeting
- `user-left` - User left meeting
- `meeting-error` - Error occurred
- `offer` - Relay WebRTC offer
- `answer` - Relay WebRTC answer
- `ice-candidate` - Relay ICE candidate

#### Example Usage:
```javascript
// Join a meeting
meetingSocket.emit('join-meeting', {
  meetingId: 'meeting_123',
  userId: 'user_456'
});

// Listen for other users
meetingSocket.on('meeting-joined', (data) => {
  console.log('Joined meeting:', data.meetingId);
  console.log('Other users:', data.otherUsers);
  console.log('Meeting settings:', data.meetingSettings);
});

// WebRTC Offer
meetingSocket.emit('offer', {
  to: 'target_socket_id',
  sdp: localDescription
});
```

### 2. Whiteboard Socket (`/whiteboard`)
Handles collaborative drawing and canvas operations:

#### Connection
```javascript
const whiteboardSocket = io('http://localhost:5001/whiteboard');
```

#### Events

**Client → Server:**
- `join-whiteboard` - Join whiteboard session
- `draw-element` - Add drawing element
- `cursor-move` - Share cursor position
- `clear-canvas` - Clear entire canvas
- `undo-action` - Undo last action

**Server → Client:**
- `whiteboard-joined` - Successfully joined
- `element-added` - New drawing element
- `canvas-cleared` - Canvas was cleared
- `cursor-update` - Other user's cursor position
- `user-joined-whiteboard` - New user joined
- `user-left-whiteboard` - User left

## API Endpoints

### Meeting Management
```
POST   /api/meetings/create           - Create new meeting
POST   /api/meetings/join/:meetingId  - Join existing meeting  
GET    /api/meetings/:meetingId       - Get meeting details
GET    /api/meetings/user/meetings    - Get user's meetings
PATCH  /api/meetings/end/:meetingId   - End meeting (host only)
```

### Whiteboard Management
```
POST   /api/whiteboard/create         - Create new whiteboard
GET    /api/whiteboard/:whiteboardId  - Get whiteboard data
POST   /api/whiteboard/:whiteboardId/elements - Add elements
DELETE /api/whiteboard/:whiteboardId/clear    - Clear whiteboard
```

## Integration Example

### Frontend Integration
```javascript
// Initialize both sockets
const meetingSocket = io('http://localhost:5001/meeting');
const whiteboardSocket = io('http://localhost:5001/whiteboard');

// Join meeting first
meetingSocket.emit('join-meeting', {
  meetingId: 'meeting_123',
  userId: 'user_456'
});

// After joining meeting, join associated whiteboard
meetingSocket.on('meeting-joined', (data) => {
  // Join the meeting's whiteboard
  whiteboardSocket.emit('join-whiteboard', {
    whiteboardId: `whiteboard_${data.meetingId}`,
    userId: 'user_456',
    meetingId: data.meetingId
  });
});

// Handle drawing while in meeting
whiteboardSocket.on('element-added', (element) => {
  // Render new drawing element on canvas
  renderElement(element);
});

// Handle users joining/leaving
meetingSocket.on('user-joined', (data) => {
  console.log('New user joined meeting:', data.userId);
});

whiteboardSocket.on('user-joined-whiteboard', (data) => {
  console.log('New user joined whiteboard:', data.userId);
});
```

## Database Models

### Meeting Model
```javascript
{
  meetingId: String (unique),
  title: String,
  host: ObjectId (User),
  participants: [ObjectId (User)],
  currentParticipants: [{
    userId: ObjectId,
    socketId: String,
    joinedAt: Date,
    isHost: Boolean
  }],
  meetingSettings: {
    allowVideo: Boolean,
    allowAudio: Boolean,
    allowScreenShare: Boolean,
    allowChat: Boolean,
    allowWhiteboard: Boolean
  },
  startTime: Date,
  endTime: Date,
  isActive: Boolean
}
```

### Whiteboard Model
```javascript
{
  whiteboardId: String (unique),
  meeting: ObjectId (Meeting),
  elements: [DrawingElement],
  permissions: {
    canDraw: [ObjectId (User)],
    canView: [ObjectId (User)]
  },
  isActive: Boolean
}
```

## Features Enabled

### Meeting Features
- ✅ Multi-user video/audio rooms
- ✅ WebRTC peer-to-peer connections  
- ✅ Real-time participant tracking
- ✅ Meeting access control
- ✅ Host privileges
- ✅ Capacity management

### Whiteboard Features  
- ✅ Real-time collaborative drawing
- ✅ Multiple drawing tools
- ✅ Canvas synchronization
- ✅ Cursor sharing
- ✅ Undo/Redo functionality
- ✅ Permission-based access

### Integration Benefits
- 🎯 **Unified Experience**: Users can video chat while collaboratively drawing
- 🔒 **Shared Security**: Same meeting participants access whiteboard  
- 📊 **Synchronized State**: Meeting and whiteboard state managed together
- ⚡ **Real-time**: Instant updates across all participants
- 🎛️ **Granular Control**: Host can manage both meeting and whiteboard permissions

## Usage Flow
1. **Create Meeting** → API creates meeting with settings
2. **Join Meeting** → WebRTC socket connects users for video/audio  
3. **Join Whiteboard** → Canvas socket enables collaborative drawing
4. **Collaborate** → Users can simultaneously talk and draw
5. **End Session** → Both meeting and whiteboard sessions clean up

This architecture provides a complete online education/collaboration platform with both communication and visual collaboration capabilities!