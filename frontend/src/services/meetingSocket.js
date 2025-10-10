import { io } from 'socket.io-client';

// Socket connection configuration
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5001';

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
    this.userId = userId;
    this.socket = io(`${SOCKET_URL}/meeting`, {
      transports: ['websocket', 'polling'],
      timeout: 20000,
    });

    this.socket.on('connect', () => {
      console.log('Connected to meeting socket:', this.socket.id);
      this.isConnected = true;
      this.emit('connected', { socketId: this.socket.id });
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
  }

  /**
   * Join a meeting room
   * @param {string} meetingId - Meeting ID to join
   */
  joinMeeting(meetingId) {
    if (!this.isConnected) {
      throw new Error('Socket not connected');
    }
    
    this.meetingId = meetingId;
    this.socket.emit('join-meeting', {
      meetingId,
      userId: this.userId
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
      this.meetingId = null;
    }
  }
}

export default new MeetingSocket();