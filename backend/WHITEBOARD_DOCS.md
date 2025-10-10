# EduMeet Whiteboard System Documentation

## Overview
The EduMeet whiteboard system provides real-time collaborative drawing and annotation capabilities for online meetings. This system includes comprehensive controllers, models, and socket handlers for managing whiteboard sessions.

## Architecture

### Models
- **Whiteboard**: Main whiteboard data model
- **WhiteboardSession**: Real-time session management
- **User**: User authentication and management
- **Meeting**: Meeting data (referenced by whiteboard)

### Controllers
- **WhiteboardController**: CRUD operations for whiteboards
- **WhiteboardSessionController**: Session and participant management

### Real-time Features
- **Socket.IO Integration**: Real-time drawing synchronization
- **Cursor Tracking**: Live cursor positions
- **Permission Management**: Role-based drawing access

## API Endpoints

### Whiteboard Management

#### Create Whiteboard
```http
POST /api/whiteboard/create
Authorization: Bearer <token>

{
  "meetingId": "meeting_123",
  "title": "Physics Class Whiteboard",
  "canvasWidth": 1920,
  "canvasHeight": 1080,
  "backgroundColor": "#ffffff"
}
```

#### Get Whiteboard by Meeting
```http
GET /api/whiteboard/{meetingId}
Authorization: Bearer <token>
```

#### Add Drawing Element
```http
POST /api/whiteboard/{whiteboardId}/element
Authorization: Bearer <token>

{
  "type": "stroke",
  "tool": "pen",
  "color": "#000000",
  "brushSize": 3,
  "points": [
    { "x": 100, "y": 150 },
    { "x": 105, "y": 155 }
  ]
}
```

#### Clear Whiteboard
```http
DELETE /api/whiteboard/{whiteboardId}/clear
Authorization: Bearer <token>
```

#### Save Snapshot
```http
POST /api/whiteboard/{whiteboardId}/snapshot
Authorization: Bearer <token>

{
  "imageData": "data:image/png;base64,..."
}
```

#### Update Permissions
```http
PUT /api/whiteboard/{whiteboardId}/permissions
Authorization: Bearer <token>

{
  "allowedDrawers": ["userId1", "userId2"],
  "publicDrawing": false,
  "restrictToHost": true
}
```

#### Export Whiteboard
```http
POST /api/whiteboard/{whiteboardId}/export
Authorization: Bearer <token>

{
  "format": "png",
  "quality": 0.9
}
```

### Session Management

#### Join Session
```http
POST /api/whiteboard/session/join
Authorization: Bearer <token>

{
  "whiteboardId": "wb_meeting_123_uuid",
  "socketId": "socket_id_123"
}
```

#### Leave Session
```http
POST /api/whiteboard/session/leave
Authorization: Bearer <token>

{
  "socketId": "socket_id_123"
}
```

#### Update Cursor Position
```http
PUT /api/whiteboard/session/cursor
Authorization: Bearer <token>

{
  "socketId": "socket_id_123",
  "cursor": { "x": 250, "y": 300 }
}
```

#### Get Session Participants
```http
GET /api/whiteboard/session/{sessionId}/participants
Authorization: Bearer <token>
```

#### Get Session Metrics
```http
GET /api/whiteboard/session/{sessionId}/metrics
Authorization: Bearer <token>
```

## Socket.IO Events

### Client → Server Events

#### Join Whiteboard
```javascript
socket.emit('join-whiteboard', {
  whiteboardId: 'wb_meeting_123_uuid',
  userId: 'user_123',
  meetingId: 'meeting_123'
});
```

#### Drawing Events
```javascript
// Start drawing
socket.emit('drawing-start', {
  x: 100,
  y: 150,
  tool: 'pen',
  color: '#000000',
  brushSize: 3
});

// Drawing data
socket.emit('drawing', {
  x: 105,
  y: 155,
  tool: 'pen',
  color: '#000000',
  brushSize: 3
});

// End drawing
socket.emit('drawing-end', {
  elementData: {
    type: 'stroke',
    tool: 'pen',
    color: '#000000',
    brushSize: 3,
    points: [...]
  }
});
```

#### Cursor Movement
```javascript
socket.emit('cursor-move', {
  cursor: { x: 250, y: 300 }
});
```

#### Tool Change
```javascript
socket.emit('tool-change', {
  tool: 'eraser'
});
```

#### Canvas Actions
```javascript
// Clear canvas
socket.emit('clear-canvas', {});

// Undo/Redo
socket.emit('canvas-action', {
  action: 'undo', // or 'redo'
  imageData: 'data:image/png;base64,...'
});
```

### Server → Client Events

#### Whiteboard State
```javascript
socket.on('joined-whiteboard', (data) => {
  console.log('Joined whiteboard:', data);
  // { whiteboardId, sessionId, role, canDraw, permissions, settings }
});

socket.on('whiteboard-state', (data) => {
  console.log('Whiteboard state:', data);
  // { elements, backgroundColor, backgroundImage, canvasWidth, canvasHeight, version }
});
```

#### Drawing Updates
```javascript
socket.on('drawing-start', (data) => {
  // Another user started drawing
});

socket.on('drawing', (data) => {
  // Drawing data from another user
});

socket.on('drawing-end', (data) => {
  // Another user finished drawing
});
```

#### Participant Updates
```javascript
socket.on('user-joined', (data) => {
  console.log('User joined:', data);
  // { userId, role, socketId, timestamp }
});

socket.on('user-left', (data) => {
  console.log('User left:', data);
  // { userId, role, timestamp }
});

socket.on('cursor-update', (data) => {
  // Another user's cursor position
  // { userId, cursor: { x, y }, timestamp }
});
```

#### Canvas Updates
```javascript
socket.on('canvas-cleared', (data) => {
  // Canvas was cleared
  // { clearedBy, version, timestamp }
});

socket.on('element-added', (data) => {
  // New element added to canvas
  // { element, version, addedBy, timestamp }
});
```

## Permission System

### User Roles
- **Host**: Meeting creator, full permissions
- **Admin**: Can draw and manage whiteboard
- **Participant**: View-only unless public drawing enabled

### Permission Settings
- `restrictToHost`: Only meeting host can draw
- `publicDrawing`: All participants can draw
- `allowedDrawers`: Specific users who can draw

## Usage Examples

### Frontend Integration

#### React Component Setup
```javascript
import io from 'socket.io-client';

const WhiteboardComponent = ({ meetingId, userId, userRole }) => {
  const [socket, setSocket] = useState(null);
  const [whiteboardData, setWhiteboardData] = useState(null);

  useEffect(() => {
    // Connect to whiteboard namespace
    const newSocket = io('http://localhost:5001/whiteboard');
    setSocket(newSocket);

    // Join whiteboard
    newSocket.emit('join-whiteboard', {
      whiteboardId: `wb_${meetingId}`,
      userId,
      meetingId
    });

    // Listen for events
    newSocket.on('joined-whiteboard', (data) => {
      console.log('Joined successfully:', data);
    });

    newSocket.on('whiteboard-state', (data) => {
      setWhiteboardData(data);
    });

    return () => newSocket.disconnect();
  }, [meetingId, userId]);

  return (
    <div>
      {/* Whiteboard canvas and controls */}
    </div>
  );
};
```

#### Drawing Implementation
```javascript
const handleDrawing = (e) => {
  if (!canDraw) return;

  const rect = canvasRef.current.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;

  if (isDrawing) {
    socket.emit('drawing', {
      x, y,
      tool: currentTool,
      color: currentColor,
      brushSize: currentBrushSize
    });

    // Draw locally for immediate feedback
    drawOnCanvas(x, y);
  }
};
```

### Backend Integration

#### Server Setup
```javascript
import whiteboardSocket from './socket/whiteboardSocket.js';
import whiteboardRoutes from './routes/whiteboardRoutes.js';

// Initialize Socket.IO with whiteboard support
whiteboardSocket(io);

// Add whiteboard API routes
app.use('/api/whiteboard', whiteboardRoutes);
```

## Database Schema

### Whiteboard Document Example
```javascript
{
  whiteboardId: "wb_meeting_123_uuid",
  meetingId: "meeting_123",
  meeting: ObjectId("..."),
  title: "Physics Class Whiteboard",
  canvasWidth: 1920,
  canvasHeight: 1080,
  backgroundColor: "#ffffff",
  elements: [
    {
      type: "stroke",
      tool: "pen",
      color: "#000000",
      brushSize: 3,
      points: [
        { x: 100, y: 150, timestamp: Date },
        { x: 105, y: 155, timestamp: Date }
      ],
      createdBy: ObjectId("..."),
      createdAt: Date
    }
  ],
  permissions: {
    allowedDrawers: [ObjectId("...")],
    publicDrawing: false,
    restrictToHost: true
  },
  version: 5,
  isActive: true
}
```

## Error Handling

### Common Error Responses
```javascript
// Authentication Error
{
  message: "Not authorized, no token",
  status: 401
}

// Permission Error
{
  message: "Drawing permission denied",
  status: 403
}

// Validation Error
{
  message: "Whiteboard not found",
  status: 404
}

// Server Error
{
  message: "Server error",
  error: "Database connection failed",
  status: 500
}
```

### Socket Error Events
```javascript
socket.on('error', (data) => {
  console.error('Whiteboard error:', data.message);
});

socket.on('drawing-denied', (data) => {
  console.warn('Drawing denied:', data.message);
});

socket.on('action-denied', (data) => {
  console.warn('Action denied:', data.message);
});
```

## Performance Considerations

### Optimization Strategies
1. **Snapshot Management**: Limited to 20 snapshots per whiteboard
2. **History Cleanup**: Collaboration history limited to 100 entries
3. **Session Cleanup**: Automatic cleanup of inactive sessions
4. **Database Indexes**: Optimized queries with proper indexing

### Scalability Features
1. **Room-based Broadcasting**: Socket events scoped to specific whiteboards
2. **Participant Limits**: Configurable maximum participants per session
3. **Event Throttling**: Rate limiting for drawing events
4. **Data Compression**: Efficient storage of drawing data

## Security Features

### Authentication & Authorization
- JWT-based authentication for all endpoints
- Role-based permission system
- Meeting access validation

### Data Protection
- Input validation and sanitization
- CORS configuration for cross-origin requests
- Socket.IO CORS protection

## Monitoring & Analytics

### Available Metrics
- Total drawing events per session
- Peak participant count
- Session duration statistics
- Element creation statistics
- Collaboration history tracking

### Example Metrics Query
```javascript
GET /api/whiteboard/session/{sessionId}/metrics

Response:
{
  sessionMetrics: {
    totalParticipants: 15,
    activeParticipants: 8,
    peakParticipants: 12,
    totalDrawingEvents: 1250,
    totalElementsCreated: 45,
    sessionDuration: 3600, // seconds
    averageParticipationTime: 2400 // seconds
  },
  whiteboardMetrics: {
    totalElements: 45,
    totalSnapshots: 8,
    version: 15,
    collaborationEvents: 67
  }
}
```

This comprehensive system provides a robust foundation for real-time collaborative whiteboarding in your EduMeet application!