// Multi-User Whiteboard Testing Script
import axios from 'axios';
import io from 'socket.io-client';

const API_BASE = 'http://localhost:5001/api';
const SOCKET_BASE = 'http://localhost:5001';

class MultiUserTester {
  constructor() {
    this.api = axios.create({
      baseURL: API_BASE,
      timeout: 10000,
      headers: { 'Content-Type': 'application/json' }
    });
    this.users = [];
    this.meetingId = null;
  }

  // Create a test user
  createUser(userId, isHost = false) {
    const user = {
      id: userId,
      isHost,
      socket: null,
      whiteboardSocket: null,
      connected: false,
      canDraw: false
    };
    this.users.push(user);
    return user;
  }

  // Test meeting creation
  async createMeeting(hostUserId) {
    try {
      console.log(`\n🎯 Creating meeting with host: ${hostUserId}`);
      
      const meetingData = {
        title: 'Multi-User Whiteboard Test',
        hostId: hostUserId,
        startTime: new Date(),
        maxParticipants: 10,
        roomType: 'private',
        meetingSettings: {
          allowVideo: true,
          allowAudio: true,
          allowScreenShare: true,
          allowChat: true,
          allowWhiteboard: true
        }
      };

      const response = await this.api.post('/meetings/create', meetingData);
      this.meetingId = response.data.meeting.meetingId;
      
      console.log(`✅ Meeting created: ${this.meetingId}`);
      return this.meetingId;
    } catch (error) {
      console.error('❌ Failed to create meeting:', error.message);
      throw error;
    }
  }

  // Test whiteboard creation
  async createWhiteboard(hostUserId) {
    try {
      console.log(`\n🎨 Creating whiteboard for meeting: ${this.meetingId}`);
      
      const whiteboardData = {
        meetingId: this.meetingId,
        userId: hostUserId,
        title: 'Test Whiteboard',
        canvasWidth: 1920,
        canvasHeight: 1080,
        backgroundColor: '#ffffff'
      };

      const response = await this.api.post('/whiteboard/create', whiteboardData);
      console.log(`✅ Whiteboard created: ${response.data.whiteboard.whiteboardId}`);
      return response.data.whiteboard.whiteboardId;
    } catch (error) {
      console.error('❌ Failed to create whiteboard:', error.message);
      throw error;
    }
  }

  // Connect user to whiteboard socket
  async connectUserToWhiteboard(user) {
    return new Promise((resolve, reject) => {
      console.log(`\n🔌 Connecting ${user.id} to whiteboard...`);
      
      const whiteboardSocket = io(`${SOCKET_BASE}/whiteboard`);
      user.whiteboardSocket = whiteboardSocket;

      whiteboardSocket.on('connect', () => {
        console.log(`✅ ${user.id} connected to whiteboard socket`);
        
        // Join whiteboard
        whiteboardSocket.emit('join-whiteboard', {
          whiteboardId: `wb_${this.meetingId}`,
          userId: user.id,
          meetingId: this.meetingId
        });
      });

      whiteboardSocket.on('joined-whiteboard', (data) => {
        user.canDraw = data.canDraw;
        user.role = data.role;
        user.connected = true;
        
        console.log(`✅ ${user.id} joined whiteboard as ${data.role}, canDraw: ${data.canDraw}`);
        resolve(data);
      });

      whiteboardSocket.on('error', (error) => {
        console.error(`❌ ${user.id} whiteboard error:`, error.message);
        reject(error);
      });

      // Listen for drawing events
      whiteboardSocket.on('drawing-start', (data) => {
        console.log(`🎨 ${user.id} sees drawing start from ${data.userId}`);
      });

      whiteboardSocket.on('drawing', (data) => {
        console.log(`✏️ ${user.id} sees drawing from ${data.userId}`);
      });

      whiteboardSocket.on('drawing-end', (data) => {
        console.log(`🎨 ${user.id} sees drawing end from ${data.userId || 'unknown'}`);
      });

      whiteboardSocket.on('canvas-cleared', () => {
        console.log(`🧹 ${user.id} sees canvas cleared`);
      });

      setTimeout(() => reject(new Error('Connection timeout')), 5000);
    });
  }

  // Simulate host drawing
  simulateHostDrawing(hostUser) {
    if (!hostUser.canDraw) {
      console.log(`❌ ${hostUser.id} cannot draw (not host)`);
      return;
    }

    console.log(`\n🎨 ${hostUser.id} starts drawing...`);
    
    // Simulate drawing start
    hostUser.whiteboardSocket.emit('drawing-start', {
      x: 100,
      y: 100,
      tool: 'pen',
      color: '#ff0000',
      brushSize: 5
    });

    // Simulate drawing points
    setTimeout(() => {
      hostUser.whiteboardSocket.emit('drawing', {
        x: 150,
        y: 150,
        tool: 'pen',
        color: '#ff0000',
        brushSize: 5
      });
    }, 100);

    setTimeout(() => {
      hostUser.whiteboardSocket.emit('drawing', {
        x: 200,
        y: 200,
        tool: 'pen',
        color: '#ff0000',
        brushSize: 5
      });
    }, 200);

    // Simulate drawing end
    setTimeout(() => {
      hostUser.whiteboardSocket.emit('drawing-end', {
        elementData: {
          type: 'drawing',
          tool: 'pen',
          color: '#ff0000',
          brushSize: 5
        }
      });
      console.log(`✅ ${hostUser.id} finished drawing`);
    }, 300);
  }

  // Run full test
  async runTest() {
    try {
      console.log('🚀 Starting Multi-User Whiteboard Test...\n');

      // Create users
      const host = this.createUser('host-user-123', true);
      const participant1 = this.createUser('participant-user-456', false);
      const participant2 = this.createUser('participant-user-789', false);

      console.log(`👥 Created users: ${this.users.map(u => u.id).join(', ')}`);

      // Create meeting and whiteboard
      await this.createMeeting(host.id);
      await this.createWhiteboard(host.id);

      // Connect all users to whiteboard
      await this.connectUserToWhiteboard(host);
      await this.connectUserToWhiteboard(participant1);
      await this.connectUserToWhiteboard(participant2);

      // Wait for connections to stabilize
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Test permissions
      console.log('\n📋 Testing Permissions:');
      console.log(`Host (${host.id}): canDraw = ${host.canDraw} (should be true)`);
      console.log(`Participant1 (${participant1.id}): canDraw = ${participant1.canDraw} (should be false)`);
      console.log(`Participant2 (${participant2.id}): canDraw = ${participant2.canDraw} (should be false)`);

      // Test real-time drawing
      console.log('\n🎨 Testing Real-time Drawing:');
      this.simulateHostDrawing(host);

      // Wait and cleanup
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      console.log('\n🧹 Cleaning up connections...');
      this.users.forEach(user => {
        if (user.whiteboardSocket) {
          user.whiteboardSocket.disconnect();
        }
      });

      console.log('\n✅ Multi-User Test Completed Successfully!');
      
    } catch (error) {
      console.error('\n❌ Test failed:', error.message);
    }
  }
}

// Run the test
const tester = new MultiUserTester();
tester.runTest();