// /socket/meetingSocket.js
import { Server } from "socket.io";
import Meeting from '../models/meeting.js';

/**
 * Handles meeting room creation, joining, and WebRTC signaling.
 * @param {Server} io - The Socket.IO server instance.
 */
const meetingSocket = (io) => {
  // Create a namespace for meeting functionality
  const meetingNamespace = io.of('/meeting');
  
  // Object to track users in each room: { roomId: [socketIds] }
  const users = {}; // roomId -> array of socket IDs
  const userMeetings = {}; // socketId -> { userId, meetingId, roomId }

  meetingNamespace.on("connection", (socket) => {
    console.log("Meeting client connected:", socket.id);

    //🏠 4️⃣ Joining a Meeting Room
    socket.on("join-meeting", async (data) => {
      try {
        const { meetingId, userId, displayName } = data;
        
        // Validate meeting exists and is active
        const meeting = await Meeting.findOne({ meetingId, isActive: true });
        if (!meeting) {
          socket.emit('meeting-error', { message: 'Meeting not found or inactive' });
          return;
        }

        // Check if user has access (host or participant)
        const hasAccess = meeting.host.toString() === userId || 
                         meeting.participants.includes(userId);
        
        if (!hasAccess) {
          socket.emit('meeting-error', { message: 'Access denied to this meeting' });
          return;
        }

        // Check capacity
        if (meeting.currentParticipants.length >= meeting.maxParticipants) {
          socket.emit('meeting-error', { message: 'Meeting is at full capacity' });
          return;
        }

        const roomId = `meeting-${meetingId}`;
        
        // Initialize room if it doesn't exist
        if (!users[roomId]) users[roomId] = [];
        
        // Add user to room
        users[roomId].push(socket.id);
        socket.join(roomId);
        
        // Store user-meeting association
        userMeetings[socket.id] = { userId, meetingId, roomId, displayName };

        // Update current participants in database - check if user already exists
        const existingParticipant = meeting.currentParticipants.find(p => p.userId === userId);
        
        if (!existingParticipant) {
          // Add new participant only if user not already in meeting
          meeting.currentParticipants.push({
            userId,
            socketId: socket.id,
            displayName: displayName || `User ${userId.slice(-4)}`,
            joinedAt: new Date(),
            isHost: meeting.host.toString() === userId
          });
        } else {
          // Update existing participant's socket ID (in case they reconnected)
          existingParticipant.socketId = socket.id;
          existingParticipant.displayName = displayName || existingParticipant.displayName;
        }
        await meeting.save();

        const otherUsers = users[roomId].filter((id) => id !== socket.id);

        // Get existing participants info
        const existingParticipants = otherUsers.map(socketId => {
          const userSession = userMeetings[socketId];
          if (userSession) {
            return {
              socketId,
              userId: userSession.userId,
              displayName: userSession.displayName || `User ${userSession.userId.slice(-4)}`
            };
          }
          return null;
        }).filter(Boolean);

        // Notify new user about existing peers
        socket.emit("meeting-joined", { 
          meetingId,
          otherUsers,
          existingParticipants,
          meetingSettings: meeting.meetingSettings,
          isHost: meeting.host.toString() === userId
        });

        // Emit user-joined events for existing participants to the new user
        existingParticipants.forEach(participant => {
          socket.emit("user-joined", participant);
        });

        // Notify existing users that a new user joined
        socket.to(roomId).emit("user-joined", {
          socketId: socket.id,
          userId,
          displayName: displayName || `User ${userId.slice(-4)}`
        });

        console.log(`👥 User ${userId} joined meeting ${meetingId} (room: ${roomId})`);
      } catch (error) {
        console.error('Error joining meeting:', error);
        socket.emit('meeting-error', { message: 'Failed to join meeting' });
      }
    });
    /* 
     🧩 When a user joins a room:
      - Add them to the room’s user list.
      - Emit “all-users” to let the new user know who’s already in the room.
      - Emit “user-joined” to let others know a new user joined.
      ✅ This enables multiple users in the same meeting room to discover each other.
    */

    // 5,6,7 POINTS NECESSARY FOR peer-to-peer (P2P) connection setup in WebRTC.
    //Necessary only if you’re implementing WebRTC (video/audio calling or screen sharing) functionality.
    //❌Not needed if We’re only using Socket.IO for:
    // Chat messaging (text only).
    // Collaborative whiteboard.
    // Notifications, live updates, or presence status.

    //🎥 5️⃣ WebRTC Offer (Peer Connection Start)
    //  socket.on("offer",(data) => {
    //     socket.to(data.to).emit("offer",{sdp:data.sdp, from: socket.id});
    //  });   // fOR SINGLE USER
    socket.on("offer", ({ to, sdp }) => {
      // Multiple user
      io.to(to).emit("offer", { from: socket.id, sdp });
    });
    /*The “offer” is part of the WebRTC handshake.
     One peer sends a WebRTC offer (Session Description Protocol(SDP offer)) to another peer (data.to is the target socket ID).
     The server forwards this message to that specific peer — it does not process it.
     Socket.IO is only used here for signaling — exchanging information needed to set up the direct P2P connection.
    */

    /* 
     A peer sends a WebRTC offer (Session Description Protocol).
     The server relays this to the target peer (via socket ID).
     🧠 Socket.IO acts only as a *signaling* layer, not for streaming.
    */

    // 🎬 3️⃣ WebRTC Answer (Response from target peer)
    socket.on("answer", ({ to, sdp }) => {
      io.to(to).emit("answer", { from: socket.id, sdp });
    });

    /* 
     The target peer sends an answer back.
     Server forwards it to the original peer who sent the offer.
    */

    // ❄️ 4️⃣ ICE Candidate Exchange
    socket.on("ice-candidate", ({ to, candidate }) => {
      io.to(to).emit("ice-candidate", { from: socket.id, candidate });
    });

    /* 
     ICE candidates contain potential network routes (IP + port).
     These are exchanged continuously between peers via this signaling server.
     Helps establish the best possible direct P2P connection.
    */

    // 🚪 5️⃣ Handle User Disconnection
    socket.on("disconnect", async () => {
      try {
        const userSession = userMeetings[socket.id];
        
        if (userSession) {
          const { userId, meetingId, roomId } = userSession;
          
          // Remove from room users list
          if (users[roomId]) {
            users[roomId] = users[roomId].filter((id) => id !== socket.id);
            
            // Check if this user has any other active connections in this room
            const userStillInRoom = users[roomId].some(socketId => {
              const session = userMeetings[socketId];
              return session && session.userId === userId;
            });
            
            // Only notify others if this was the user's last connection
            if (!userStillInRoom) {
              socket.to(roomId).emit("user-left", {
                socketId: socket.id,
                userId
              });
            }

            // Clean up empty rooms
            if (users[roomId].length === 0) {
              delete users[roomId];
            }
          }

          // Update database - remove participant only if no other connections exist
          const meeting = await Meeting.findOne({ meetingId });
          if (meeting) {
            // Check if user has other active connections
            const hasOtherConnections = Object.values(userMeetings).some(session => 
              session.userId === userId && session.socketId !== socket.id
            );
            
            if (!hasOtherConnections) {
              // Remove user completely from current participants
              meeting.currentParticipants = meeting.currentParticipants.filter(
                p => p.userId !== userId
              );
            } else {
              // Just update the socket ID to another active connection
              const otherConnection = Object.entries(userMeetings).find(([socketId, session]) => 
                session.userId === userId && socketId !== socket.id
              );
              if (otherConnection) {
                const participant = meeting.currentParticipants.find(p => p.userId === userId);
                if (participant) {
                  participant.socketId = otherConnection[0];
                }
              }
            }
            await meeting.save();
          }

          // Clean up user session
          delete userMeetings[socket.id];
          
          console.log(`🔴 Socket ${socket.id} for user ${userId} disconnected from meeting ${meetingId}`);
        }
      } catch (error) {
        console.error('Error handling disconnect:', error);
      }
    });

    // Handle manual leave meeting
    socket.on("leave-meeting", async () => {
      try {
        const userSession = userMeetings[socket.id];
        
        if (userSession) {
          const { userId, meetingId, roomId } = userSession;
          
          // Leave the socket room
          socket.leave(roomId);
          
          // Remove from room users list
          if (users[roomId]) {
            users[roomId] = users[roomId].filter((id) => id !== socket.id);
            
            // Notify others in the room
            socket.to(roomId).emit("user-left", {
              socketId: socket.id,
              userId
            });
          }

          // Update database
          const meeting = await Meeting.findOne({ meetingId });
          if (meeting) {
            meeting.currentParticipants = meeting.currentParticipants.filter(
              p => p.socketId !== socket.id
            );
            await meeting.save();
          }

          // Clean up user session
          delete userMeetings[socket.id];
          
          socket.emit("meeting-left", { meetingId });
          console.log(`👋 User ${userId} left meeting ${meetingId}`);
        }
      } catch (error) {
        console.error('Error leaving meeting:', error);
        socket.emit('meeting-error', { message: 'Failed to leave meeting' });
      }
    });

    // Chat message handling
    socket.on("send-message", (data) => {
      try {
        console.log('Backend received send-message:', data);
        
        const { meetingId, message } = data;
        
        // Validate input data
        if (!meetingId || !message) {
          console.error('Invalid message data:', data);
          socket.emit('meeting-error', { message: 'Invalid message data' });
          return;
        }
        
        const roomId = `meeting-${meetingId}`;
        
        // Verify the user is in this meeting
        const userSession = userMeetings[socket.id];
        if (!userSession || userSession.meetingId !== meetingId) {
          console.error('User not in meeting:', { socketId: socket.id, meetingId });
          socket.emit('meeting-error', { message: 'You are not in this meeting' });
          return;
        }

        // Create a safe message object for broadcasting
        const safeMessage = {
          id: message.id,
          text: message.text,
          sender: message.sender,
          senderId: message.senderId,
          timestamp: message.timestamp
        };

        // Broadcast message to all other participants in the room
        console.log(`💬 Broadcasting message in meeting ${meetingId} by ${message.sender}`);
        socket.to(roomId).emit("message-received", safeMessage);
        console.log(`💬 Message broadcast complete`);
        
      } catch (error) {
        console.error('Error sending message:', error);
        socket.emit('meeting-error', { message: 'Failed to send message' });
      }
    });

    // Handle audio toggle events
    socket.on("toggle-audio", (data) => {
      try {
        const { meetingId, isMuted } = data;
        
        // Verify the user is in this meeting
        const userSession = userMeetings[socket.id];
        if (!userSession || userSession.meetingId !== meetingId) {
          console.error('User not in meeting for audio toggle:', { socketId: socket.id, meetingId });
          return;
        }

        const roomId = `meeting-${meetingId}`;
        
        // Broadcast audio status to other participants
        socket.to(roomId).emit("participant-audio-toggled", {
          socketId: socket.id,
          isMuted: isMuted,
          participantId: userSession.userId
        });
        
        console.log(`🔊 User ${socket.id} ${isMuted ? 'muted' : 'unmuted'} audio in meeting ${meetingId}`);
        
      } catch (error) {
        console.error('Error handling audio toggle:', error);
      }
    });

    // Handle video toggle events
    socket.on("toggle-video", (data) => {
      try {
        const { meetingId, isVideoOff } = data;
        
        // Verify the user is in this meeting
        const userSession = userMeetings[socket.id];
        if (!userSession || userSession.meetingId !== meetingId) {
          console.error('User not in meeting for video toggle:', { socketId: socket.id, meetingId });
          return;
        }

        const roomId = `meeting-${meetingId}`;
        
        // Broadcast video status to other participants
        socket.to(roomId).emit("participant-video-toggled", {
          socketId: socket.id,
          isVideoOff: isVideoOff,
          participantId: userSession.userId
        });
        
        console.log(`📹 User ${socket.id} ${isVideoOff ? 'turned off' : 'turned on'} video in meeting ${meetingId}`);
        
      } catch (error) {
        console.error('Error handling video toggle:', error);
      }
    });

    /*
     When a user disconnects:
      - Remove them from all rooms they were part of.
      - Notify others in the same room via "user-left".
      - Delete empty rooms to free memory.
    */
  });
};

export default meetingSocket;



/*
🧠 In Simple Terms
This code:
Lets multiple users join rooms (like a meeting room).
Helps users discover and connect to each other using WebRTC.
Acts as a signaling server (not a media server) — it just exchanges
connection info (SDP, ICE), not the actual video/audio streams.*/

/*An ICE candidate (Interactive Connectivity Establishment candidate) is a small piece of network information
 (like an IP address + port) that helps two peers (your browser and another user’s browser) find the best possible path to connect directly.
In short:
🔹 ICE Candidates = “Possible ways for two computers to reach each other directly.”
💡 Why It’s Needed
When you’re using WebRTC for video/audio:
The browsers try to connect peer-to-peer (P2P) to minimize delay.
But every user is behind different networks (Wi-Fi, 4G, office firewall, etc.).
So, the browser must figure out how to connect to the other peer.*/ 