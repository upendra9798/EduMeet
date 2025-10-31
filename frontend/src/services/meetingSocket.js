import { io } from 'socket.io-client';

// Socket URL configuration
const getSocketUrl = () => {
  if (import.meta.env.VITE_SOCKET_URL) {
    return import.meta.env.VITE_SOCKET_URL;
  }
  
  // Auto-detect based on current environment
  const hostname = window.location.hostname;
  const protocol = window.location.protocol;
  
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    // Development - use localhost
    return 'http://localhost:5001';
  } else if (hostname.includes('your-domain.com')) {
    // Production - use HTTPS WebSocket endpoint
    return 'https://your-domain.com';
  } else {
    // Fallback - use same host as frontend
    const port = protocol === 'https:' ? '' : ':5001';
    return `${protocol}//${hostname}${port}`;
  }
};

const SOCKET_URL = getSocketUrl();

/**
 * Meeting Socket Manager
 * Handles WebRTC signaling and meeting room management
 */
class MeetingSocket {
  constructor() {
    this.socket = null;
    this.isConnected = false;
    this.meetingId = null;
    this.userId = null;
    this.eventHandlers = {};
  }

  /**
   * Connect to meeting socket namespace
   * @param {string} userId - Current user ID
   */
  connect(userId) {
    console.log('MeetingSocket.connect called with userId:', userId);
    console.log('Current connection state - isConnected:', this.isConnected, 'socket:', !!this.socket);
    
    // If already connected with the same user, don't reconnect
    if (this.isConnected && this.userId === userId && this.socket) {
      console.log('Already connected with same userId, skipping reconnect');
      return;
    }
    
    // Disconnect existing connection if any
    if (this.socket) {
      console.log('Disconnecting existing socket connection');
      this.socket.disconnect();
    }
    
    this.userId = userId;
    console.log('Creating new socket connection to:', `${SOCKET_URL}/meeting`);
    console.log('User Agent:', navigator.userAgent);
    console.log('Is Mobile:', /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent));
    
    this.socket = io(`${SOCKET_URL}/meeting`, {
      transports: ['websocket', 'polling'],
      timeout: 20000,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 10
    });

    this.socket.on('connect', () => {
      console.log('✅ MeetingSocket: Connected to meeting socket:', this.socket.id);
      console.log('✅ MeetingSocket: Connection URL was:', `${SOCKET_URL}/meeting`);
      this.isConnected = true;
      this.emit('connected', { socketId: this.socket.id });
    });

    this.socket.on('connect_error', (error) => {
      console.error('❌ MeetingSocket: Connection error:', error);
      console.error('❌ MeetingSocket: Failed URL:', `${SOCKET_URL}/meeting`);
    });

    this.socket.on('disconnect', (reason) => {
      console.log('🔌 MeetingSocket: Disconnected:', reason);
      this.isConnected = false;
    });

    this.socket.on('disconnect', () => {
      console.log('Disconnected from meeting socket');
      this.isConnected = false;
      this.emit('disconnected');
    });

    // Meeting-specific events
    this.socket.on('meeting-joined', (data) => {
      console.log('Joined meeting:', data);
      this.emit('meeting-joined', data);
    });

    this.socket.on('meeting-left', (data) => {
      console.log('Left meeting:', data);
      this.emit('meeting-left', data);
    });

    this.socket.on('user-joined', (data) => {
      console.log('User joined meeting:', data);
      this.emit('user-joined', data);
    });

    this.socket.on('user-left', (data) => {
      console.log('User left meeting:', data);
      this.emit('user-left', data);
    });

    this.socket.on('meeting-error', (error) => {
      console.error('Meeting error:', error);
      this.emit('meeting-error', error);
    });

    // WebRTC signaling events
    this.socket.on('offer', (data) => {
      this.emit('offer', data);
    });

    this.socket.on('answer', (data) => {
      this.emit('answer', data);
    });

    this.socket.on('ice-candidate', (data) => {
      this.emit('ice-candidate', data);
    });

    // Chat message events
    this.socket.on('message-received', (message) => {
      console.log('MeetingSocket received message from server:', message);
      this.emit('message-received', message);
    });
  }

  /**
   * Join a meeting room
   * @param {string} meetingId - Meeting ID to join
   * @param {string} displayName - Display name for this session (optional)
   */
  joinMeeting(meetingId, displayName) {
    if (!this.isConnected) {
      throw new Error('Socket not connected');
    }
    
    this.meetingId = meetingId;
    this.socket.emit('join-meeting', {
      meetingId,
      userId: this.userId,
      displayName: displayName || null
    });
  }

  /**
   * Leave current meeting
   */
  leaveMeeting() {
    if (this.isConnected && this.meetingId) {
      this.socket.emit('leave-meeting');
      this.meetingId = null;
    }
  }

  /**
   * Send WebRTC offer to another peer
   * @param {string} to - Target socket ID
   * @param {Object} sdp - Session Description Protocol data
   */
  sendOffer(to, sdp) {
    if (this.isConnected) {
      this.socket.emit('offer', { to, sdp });
    }
  }

  /**
   * Send WebRTC answer to another peer
   * @param {string} to - Target socket ID
   * @param {Object} sdp - Session Description Protocol data
   */
  sendAnswer(to, sdp) {
    if (this.isConnected) {
      this.socket.emit('answer', { to, sdp });
    }
  }

  /**
   * Send ICE candidate to another peer
   * @param {string} to - Target socket ID
   * @param {Object} candidate - ICE candidate data
   */
  sendIceCandidate(to, candidate) {
    if (this.isConnected) {
      this.socket.emit('ice-candidate', { to, candidate });
    }
  }

  /**
   * Send chat message to meeting participants
   * @param {string} meetingId - Meeting ID
   * @param {Object} message - Message object with text, sender, timestamp
   */
  sendMessage(meetingId, message) {
    console.log('MeetingSocket.sendMessage called:');
    console.log('- meetingId:', meetingId);
    console.log('- this.meetingId:', this.meetingId);
    console.log('- isConnected:', this.isConnected);
    console.log('- message:', message);
    
    if (this.isConnected && this.meetingId === meetingId) {
      console.log('Sending message via socket...');
      this.socket.emit('send-message', {
        meetingId,
        message
      });
      console.log('Message sent via socket');
    } else {
      console.warn('Cannot send message - conditions not met:');
      console.warn('- isConnected:', this.isConnected);
      console.warn('- meetingId match:', this.meetingId === meetingId);
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
   * @param {Function} handler - Event handler function to remove (optional - if not provided, removes all handlers for the event)
   */
  off(event, handler) {
    if (this.eventHandlers[event]) {
      if (handler) {
        this.eventHandlers[event] = this.eventHandlers[event].filter(h => h !== handler);
      } else {
        // Remove all handlers for this event
        this.eventHandlers[event] = [];
      }
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
      this.meetingId = null;
    }
  }
}

export default new MeetingSocket();