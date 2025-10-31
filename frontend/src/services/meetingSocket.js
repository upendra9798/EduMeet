import { io } from 'socket.io-client';

/**
 * MEETING SOCKET ARCHITECTURE & PROMISE IMPLEMENTATION
 * ====================================================
 * 
 * PROBLEM SOLVED:
 * Previously, the meeting join process had a race condition:
 * 1. connect() was called (asynchronous)
 * 2. joinMeeting() was called immediately (before connection established)
 * 3. Result: "Socket not connected" error on first join attempt
 * 
 * SOLUTION IMPLEMENTED:
 * 1. Made connect() return a Promise that resolves when connected
 * 2. MeetingRoom now awaits connect() before calling joinMeeting()
 * 3. Result: Guaranteed connection before join attempt
 * 
 * MEETING JOIN FLOW (New):
 * 1. User clicks "Join Meeting"
 * 2. MeetingRoom calls await MeetingSocket.connect(userId)
 * 3. Promise waits for socket 'connect' event
 * 4. Promise resolves, connection confirmed
 * 5. MeetingRoom calls MeetingSocket.joinMeeting(meetingId)
 * 6. Server receives join request and processes it
 * 7. Meeting interface loads successfully
 * 
 * KEY BENEFITS:
 * - Eliminates "Socket not connected" errors
 * - Reliable meeting joins on first attempt
 * - Proper error handling for connection failures
 * - Better user experience with clear error messages
 */

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
   * 
   * PROMISE-BASED CONNECTION:
   * This method now returns a Promise to ensure proper async handling.
   * The calling code can await this method to ensure socket connection
   * is fully established before proceeding with meeting operations.
   * 
   * @param {string} userId - Current user ID
   * @returns {Promise} Promise that resolves when connected, rejects on error
   */
  connect(userId) {
    console.log('MeetingSocket.connect called with userId:', userId);
    console.log('Current connection state - isConnected:', this.isConnected, 'socket:', !!this.socket);
    
    // OPTIMIZATION: Avoid reconnecting if already connected with same user
    // This prevents unnecessary disconnection/reconnection cycles
    if (this.isConnected && this.userId === userId && this.socket) {
      console.log('Already connected with same userId, skipping reconnect');
      return Promise.resolve(); // Return resolved Promise immediately
    }
    
    // PROMISE WRAPPER: Wrap socket connection in Promise for async/await support
    // This ensures the calling code can wait for connection establishment
    return new Promise((resolve, reject) => {
      
      // CLEANUP: Disconnect any existing socket to avoid conflicts
      if (this.socket) {
        console.log('Disconnecting existing socket connection');
        this.socket.disconnect();
      }
      
      // SETUP: Store user ID and prepare connection details
      this.userId = userId;
      console.log('Creating new socket connection to:', `${SOCKET_URL}/meeting`);
      console.log('User Agent:', navigator.userAgent);
      console.log('Is Mobile:', /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent));
      
      // SOCKET CREATION: Create new socket.io connection with configuration
      this.socket = io(`${SOCKET_URL}/meeting`, {
        transports: ['websocket', 'polling'], // Try WebSocket first, fallback to polling
        timeout: 20000,                       // 20 second connection timeout
        reconnection: true,                   // Enable automatic reconnection
        reconnectionDelay: 1000,             // Wait 1 second before reconnecting
        reconnectionAttempts: 10             // Try up to 10 reconnection attempts
      });

      // SUCCESS HANDLER: Called when socket successfully connects
      this.socket.on('connect', () => {
        console.log('✅ MeetingSocket: Connected to meeting socket:', this.socket.id);
        console.log('✅ MeetingSocket: Connection URL was:', `${SOCKET_URL}/meeting`);
        this.isConnected = true;
        this.emit('connected', { socketId: this.socket.id });
        
        // CRITICAL: Resolve the Promise to notify calling code connection is ready
        // This allows MeetingRoom component to proceed with joining the meeting
        resolve();
      });

      // ERROR HANDLER: Called if socket connection fails
      this.socket.on('connect_error', (error) => {
        console.error('❌ MeetingSocket: Connection error:', error);
        console.error('❌ MeetingSocket: Failed URL:', `${SOCKET_URL}/meeting`);
        
        // CRITICAL: Reject the Promise to notify calling code of connection failure
        // This will trigger error handling in MeetingRoom component
        reject(error);
      });

      // DISCONNECT HANDLERS: Handle when socket connection is lost
      this.socket.on('disconnect', (reason) => {
        console.log('🔌 MeetingSocket: Disconnected:', reason);
        this.isConnected = false; // Update connection status
      });

      this.socket.on('disconnect', () => {
        console.log('Disconnected from meeting socket');
        this.isConnected = false;
        this.emit('disconnected'); // Notify listeners of disconnection
      });

      // MEETING EVENT HANDLERS: Set up listeners for meeting-related events
      // These are registered inside the Promise to ensure they're set up
      // before the connection completes
      
      this.socket.on('meeting-joined', (data) => {
        console.log('Joined meeting:', data);
        this.emit('meeting-joined', data); // Forward to component listeners
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

      // CHAT EVENT HANDLERS: Handle real-time chat messages
      this.socket.on('message-received', (message) => {
        console.log('MeetingSocket received message from server:', message);
        this.emit('message-received', message); // Forward to UI components
      });
      
    }); // End of Promise - All event handlers are now set up
  }

  /**
   * Join a meeting room
   * 
   * SYNCHRONOUS METHOD: This method is called AFTER the Promise-based connect()
   * has resolved, ensuring the socket is connected before attempting to join.
   * 
   * MEETING JOIN FLOW:
   * 1. MeetingRoom calls await connect() - waits for socket connection
   * 2. MeetingRoom calls joinMeeting() - sends join request to server
   * 3. Server processes join and emits 'meeting-joined' event back
   * 4. UI updates to show meeting interface
   * 
   * @param {string} meetingId - Meeting ID to join
   * @param {string} displayName - Display name for this session (optional)
   */
  joinMeeting(meetingId, displayName) {
    // SAFETY CHECK: Ensure socket is connected before attempting to join
    // This should never fail now because connect() is awaited in MeetingRoom
    if (!this.isConnected) {
      throw new Error('Socket not connected');
    }
    
    // STORE MEETING ID: Keep track of current meeting for message routing
    this.meetingId = meetingId;
    
    // EMIT JOIN REQUEST: Send join request to server with user details
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
    try {
      console.log('MeetingSocket.sendMessage called:');
      console.log('- meetingId:', meetingId);
      console.log('- this.meetingId:', this.meetingId);
      console.log('- isConnected:', this.isConnected);
      console.log('- message:', message);
      
      // Validate inputs
      if (!meetingId || !message) {
        console.error('Invalid parameters for sendMessage:', { meetingId, message });
        return;
      }
      
      if (this.isConnected && this.meetingId === meetingId) {
        console.log('Sending message via socket...');
        
        // Create a clean message object to prevent serialization issues
        const cleanMessage = {
          id: message.id,
          text: message.text,
          sender: message.sender,
          senderId: message.senderId,
          timestamp: message.timestamp,
          // Don't send isOwn property as it's client-specific
        };
        
        this.socket.emit('send-message', {
          meetingId,
          message: cleanMessage
        });
        console.log('Message sent via socket');
        
      } else {
        console.warn('Cannot send message - conditions not met:');
        console.warn('- isConnected:', this.isConnected);
        console.warn('- meetingId match:', this.meetingId === meetingId);
      }
      
    } catch (error) {
      console.error('Error in MeetingSocket.sendMessage:', error);
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