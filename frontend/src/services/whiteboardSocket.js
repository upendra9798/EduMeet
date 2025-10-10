import { io } from 'socket.io-client';

// Socket connection configuration
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5001';

/**
 * Whiteboard Socket Manager
 * Handles real-time whiteboard collaboration
 */
class WhiteboardSocket {
  constructor() {
    this.socket = null;
    this.isConnected = false;
    this.whiteboardId = null;
    this.userId = null;
    this.eventHandlers = {};
  }

  /**
   * Connect to whiteboard socket namespace
   * @param {string} userId - Current user ID
   */
  connect(userId) {
    this.userId = userId;
    this.socket = io(`${SOCKET_URL}/whiteboard`, {
      transports: ['websocket', 'polling'],
      timeout: 20000,
    });

    this.socket.on('connect', () => {
      console.log('Connected to whiteboard socket:', this.socket.id);
      this.isConnected = true;
      this.emit('connected', { socketId: this.socket.id });
    });

    this.socket.on('disconnect', () => {
      console.log('Disconnected from whiteboard socket');
      this.isConnected = false;
      this.emit('disconnected');
    });

    // Whiteboard session events
    this.socket.on('whiteboard-joined', (data) => {
      console.log('Joined whiteboard:', data);
      this.emit('whiteboard-joined', data);
    });

    this.socket.on('whiteboard-left', (data) => {
      console.log('Left whiteboard:', data);
      this.emit('whiteboard-left', data);
    });

    this.socket.on('user-joined', (data) => {
      console.log('User joined whiteboard:', data);
      this.emit('user-joined', data);
    });

    this.socket.on('user-left', (data) => {
      console.log('User left whiteboard:', data);
      this.emit('user-left', data);
    });

    // Drawing events
    this.socket.on('drawing-element', (data) => {
      this.emit('drawing-element', data);
    });

    this.socket.on('drawing-start', (data) => {
      this.emit('drawing-start', data);
    });

    this.socket.on('drawing-update', (data) => {
      this.emit('drawing-update', data);
    });

    this.socket.on('drawing-end', (data) => {
      this.emit('drawing-end', data);
    });

    this.socket.on('canvas-cleared', (data) => {
      console.log('Canvas cleared:', data);
      this.emit('canvas-cleared', data);
    });

    // Cursor tracking
    this.socket.on('cursor-move', (data) => {
      this.emit('cursor-move', data);
    });

    this.socket.on('cursor-hide', (data) => {
      this.emit('cursor-hide', data);
    });

    // Tool and settings events
    this.socket.on('tool-changed', (data) => {
      this.emit('tool-changed', data);
    });

    this.socket.on('permissions-updated', (data) => {
      console.log('Permissions updated:', data);
      this.emit('permissions-updated', data);
    });

    // Error handling
    this.socket.on('error', (error) => {
      console.error('Whiteboard error:', error);
      this.emit('error', error);
    });
  }

  /**
   * Join a whiteboard session
   * @param {string} whiteboardId - Whiteboard ID to join
   * @param {string} meetingId - Associated meeting ID
   */
  joinWhiteboard(whiteboardId, meetingId) {
    if (!this.isConnected) {
      throw new Error('Socket not connected');
    }
    
    this.whiteboardId = whiteboardId;
    this.socket.emit('join-whiteboard', {
      whiteboardId,
      userId: this.userId,
      meetingId
    });
  }

  /**
   * Leave current whiteboard session
   */
  leaveWhiteboard() {
    if (this.isConnected && this.whiteboardId) {
      this.socket.emit('leave-whiteboard');
      this.whiteboardId = null;
    }
  }

  /**
   * Send drawing element
   * @param {Object} element - Drawing element data
   */
  sendDrawingElement(element) {
    if (this.isConnected) {
      this.socket.emit('drawing-element', element);
    }
  }

  /**
   * Start drawing
   * @param {Object} drawingData - Initial drawing data
   */
  startDrawing(drawingData) {
    if (this.isConnected) {
      this.socket.emit('drawing-start', drawingData);
    }
  }

  /**
   * Update drawing
   * @param {Object} drawingData - Updated drawing data
   */
  updateDrawing(drawingData) {
    if (this.isConnected) {
      this.socket.emit('drawing-update', drawingData);
    }
  }

  /**
   * End drawing
   * @param {Object} drawingData - Final drawing data
   */
  endDrawing(drawingData) {
    if (this.isConnected) {
      this.socket.emit('drawing-end', drawingData);
    }
  }

  /**
   * Clear canvas
   */
  clearCanvas() {
    if (this.isConnected) {
      this.socket.emit('clear-canvas');
    }
  }

  /**
   * Send cursor movement
   * @param {Object} cursorData - Cursor position and info
   */
  sendCursorMove(cursorData) {
    if (this.isConnected) {
      this.socket.emit('cursor-move', cursorData);
    }
  }

  /**
   * Hide cursor
   */
  hideCursor() {
    if (this.isConnected) {
      this.socket.emit('cursor-hide');
    }
  }

  /**
   * Change drawing tool
   * @param {Object} toolData - Tool configuration
   */
  changeTool(toolData) {
    if (this.isConnected) {
      this.socket.emit('tool-change', toolData);
    }
  }

  /**
   * Update permissions
   * @param {Object} permissionsData - New permissions
   */
  updatePermissions(permissionsData) {
    if (this.isConnected) {
      this.socket.emit('update-permissions', permissionsData);
    }
  }

  /**
   * Register event handler
   * @param {string} event - Event name
   * @param {Function} handler - Event handler function
   */
  on(event, handler) {
    if (!this.eventHandlers[event]) {
      this.eventHandlers[event] = [];
    }
    this.eventHandlers[event].push(handler);
  }

  /**
   * Unregister event handler
   * @param {string} event - Event name
   * @param {Function} handler - Event handler function to remove
   */
  off(event, handler) {
    if (this.eventHandlers[event]) {
      this.eventHandlers[event] = this.eventHandlers[event].filter(h => h !== handler);
    }
  }

  /**
   * Emit event to registered handlers
   * @param {string} event - Event name
   * @param {*} data - Event data
   */
  emit(event, data) {
    if (this.eventHandlers[event]) {
      this.eventHandlers[event].forEach(handler => handler(data));
    }
  }

  /**
   * Disconnect from socket
   */
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
      this.whiteboardId = null;
    }
  }
}

export default new WhiteboardSocket();