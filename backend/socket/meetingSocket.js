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
    
    // Test event listener to verify communication works both ways
    socket.on("test-frontend-event", (data) => {
      console.log("🧪 Backend received test event from frontend:", data);
      console.log("🧪 Sending test-backend-response to:", socket.id);
      socket.emit("test-backend-response", { message: "Backend received your test event!" });
      console.log("🧪 test-backend-response sent");
    });

    // Debug host control - show backend state
    socket.on("test-host-control", (data) => {
      console.log("🔍 DEBUG: Backend received test-host-control:", data);
      console.log("🔍 DEBUG: Current userMeetings state:");
      
      for (const [socketId, session] of Object.entries(userMeetings)) {
        console.log(`   📍 Socket ${socketId}:`, {
          userId: session.userId,
          meetingId: session.meetingId,
          displayName: session.displayName
        });
      }
      
      // Try to find the target user
      const targetSocketId = Object.entries(userMeetings).find(([sid, session]) => 
        session.userId === data.targetUserId && session.meetingId === data.meetingId
      )?.[0];
      
      console.log(`🔍 DEBUG: Looking for user ${data.targetUserId} in meeting ${data.meetingId}`);
      console.log(`🔍 DEBUG: Found target socket:`, targetSocketId);
      
      socket.emit("test-host-control-response", {
        foundTarget: !!targetSocketId,
        targetSocketId,
        totalSessions: Object.keys(userMeetings).length,
        searchedUserId: data.targetUserId,
        searchedMeetingId: data.meetingId
      });
    });

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

        // Check if user is blocked
        const isBlocked = meeting.blockedParticipants.some(blocked => blocked.userId === userId);
        if (isBlocked) {
          socket.emit('meeting-error', { message: 'You have been blocked from this meeting' });
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

        console.log(`🔧 Backend Debug for meeting ${meetingId}:`);
        console.log(`   👥 users[roomId]:`, users[roomId]);
        console.log(`   🆔 socket.id:`, socket.id);
        console.log(`   👤 current userId:`, userId);
        console.log(`   📋 meeting.currentParticipants:`, meeting.currentParticipants.map(p => ({ userId: p.userId, socketId: p.socketId, displayName: p.displayName })));
        console.log(`   📋 meeting.participants (legacy):`, meeting.participants);
        console.log(`   🔗 userMeetings keys:`, Object.keys(userMeetings));
        console.log(`   ➡️ otherUsers:`, otherUsers);

        // Get existing participants info
        const existingParticipants = otherUsers.map(socketId => {
          const userSession = userMeetings[socketId];
          console.log(`   🔍 Checking socketId ${socketId}:`, userSession);
          if (userSession) {
            return {
              socketId,
              userId: userSession.userId,
              displayName: userSession.displayName || `User ${userSession.userId.slice(-4)}`
            };
          }
          return null;
        }).filter(Boolean);

        console.log(`   ✅ existingParticipants:`, existingParticipants);

        // Notify new user about existing peers
        socket.emit("meeting-joined", { 
          meetingId,
          otherUsers,
          existingParticipants,
          meetingSettings: meeting.meetingSettings,
          isHost: meeting.host.toString() === userId
        });

        // Emit user-joined events for existing participants to the new user
        console.log(`   📤 Emitting user-joined events to new user for existing participants:`, existingParticipants.length);
        existingParticipants.forEach(participant => {
          console.log(`      👤 Emitting user-joined for:`, participant);
          socket.emit("user-joined", participant);
        });

        // Notify existing users that a new user joined
        const newUserData = {
          socketId: socket.id,
          userId,
          displayName: displayName || `User ${userId.slice(-4)}`
        };
        console.log(`   📢 Broadcasting user-joined to room ${roomId} for new user:`, newUserData);
        console.log(`   👥 Broadcasting to sockets:`, otherUsers);
        socket.to(roomId).emit("user-joined", newUserData);

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

        // Handle both string and object message formats
        let safeMessage;
        if (typeof message === 'string') {
          // If message is a string, create message object
          safeMessage = {
            text: message,
            sender: userSession.displayName || 'Anonymous',
            senderId: userSession.userId,
            timestamp: new Date().toISOString(),
            messageId: Date.now() + Math.random()
          };
        } else {
          // Create a safe message object for broadcasting
          safeMessage = {
            id: message.id,
            text: message.text,
            sender: message.sender || userSession.displayName || 'Anonymous',
            senderId: message.senderId || userSession.userId,
            timestamp: message.timestamp || new Date().toISOString(),
            messageId: message.id || Date.now() + Math.random()
          };
        }

        // Broadcast message to all other participants in the room
        console.log(`💬 Broadcasting message in meeting ${meetingId} by ${safeMessage.sender}`);
        console.log(`💬 Room ${roomId} has users:`, users[roomId]);
        console.log(`💬 Broadcasting to ${users[roomId]?.length - 1} other participants (excluding sender)`);
        console.log(`💬 Message content:`, safeMessage);
        
        socket.to(roomId).emit("message-received", safeMessage);
        console.log(`💬 Message broadcast complete to room: ${roomId}`);
        
      } catch (error) {
        console.error('Error sending message:', error);
        socket.emit('meeting-error', { message: 'Failed to send message' });
      }
    });

    // Test event handlers
    socket.on('test-frontend-event', (data) => {
      console.log("🧪 TEST: Received from frontend:", data);
      socket.emit('test-backend-response', { message: "Backend received your test", received: data });
    });

    socket.on('debug-room-info', async (data) => {
      try {
        console.log("🧪 ROOM INFO: Request from socket:", socket.id, "for meeting:", data.meetingId);
        
        const rooms = Array.from(socket.rooms);
        console.log("🧪 ROOM INFO: Socket rooms:", rooms);
        
        const roomId = `meeting-${data.meetingId}`;
        const isInRoom = socket.rooms.has(roomId);
        console.log("🧪 ROOM INFO: Is in target room?", isInRoom, "Target room:", roomId);
        
        // Get all sockets in the room
        const socketsInRoom = await meetingNamespace.in(roomId).fetchSockets();
        console.log("🧪 ROOM INFO: Sockets in room:", socketsInRoom.map(s => s.id));
        
        socket.emit('debug-room-response', {
          socketId: socket.id,
          rooms: rooms,
          targetRoom: roomId,
          isInTargetRoom: isInRoom,
          socketsInTargetRoom: socketsInRoom.map(s => s.id)
        });
        
      } catch (error) {
        console.error("🧪 ROOM INFO ERROR:", error);
        socket.emit('debug-room-response', { error: error.message });
      }
    });

    // Handle audio toggle events
    socket.on("toggle-audio", (data) => {
      console.log('🔊🔊🔊 BACKEND: RECEIVED TOGGLE-AUDIO EVENT 🔊🔊🔊');
      console.log('Socket ID:', socket.id);
      console.log('Data:', data);
      console.log('User session:', userMeetings[socket.id]);
      
      try {
        const { meetingId, isMuted } = data;
        
        // Verify the user is in this meeting
        const userSession = userMeetings[socket.id];
        if (!userSession || userSession.meetingId !== meetingId) {
          console.error('User not in meeting for audio toggle:', { socketId: socket.id, meetingId });
          return;
        }

        const roomId = `meeting-${meetingId}`;
        
        // Broadcast audio status to ALL participants (including sender)
        const audioToggleData = {
          socketId: socket.id,
          isMuted: isMuted,
          participantId: userSession.userId
        };
        
        console.log(`📢 Broadcasting participant-audio-toggled to room ${roomId}:`, audioToggleData);
        
        // ENHANCED DEBUG: Check who's actually in the room before broadcasting
        meetingNamespace.in(roomId).fetchSockets().then(sockets => {
          console.log(`🎯 SOCKETS IN ROOM ${roomId}:`, sockets.map(s => s.id));
          console.log(`🎯 ABOUT TO BROADCAST TO ${sockets.length} SOCKETS`);
          
          // Broadcast to room (all participants)
          meetingNamespace.to(roomId).emit("participant-audio-toggled", audioToggleData);
          console.log(`🎯 BROADCAST SENT!`);
          
          // Also send direct to each socket for debugging
          sockets.forEach(targetSocket => {
            console.log(`🎯 DIRECT EMIT to socket ${targetSocket.id}`);
            targetSocket.emit("participant-audio-toggled-direct", audioToggleData);
          });
        });
        
        // ALSO send directly to sender to ensure they get their own update
        socket.emit("participant-audio-toggled", audioToggleData);
        
        console.log(`🔊 User ${socket.id} ${isMuted ? 'muted' : 'unmuted'} audio in meeting ${meetingId}`);
        
      } catch (error) {
        console.error('Error handling audio toggle:', error);
      }
    });

    // Handle video toggle events
    socket.on("toggle-video", (data) => {
      console.log('📹 Backend: Received toggle-video event:', {
        socketId: socket.id,
        data,
        userSession: userMeetings[socket.id]
      });
      
      try {
        const { meetingId, isVideoOff } = data;
        
        // Verify the user is in this meeting
        const userSession = userMeetings[socket.id];
        if (!userSession || userSession.meetingId !== meetingId) {
          console.error('User not in meeting for video toggle:', { socketId: socket.id, meetingId });
          return;
        }

        const roomId = `meeting-${meetingId}`;
        
        // Broadcast video status to ALL participants (including sender)
        const videoToggleData = {
          socketId: socket.id,
          isVideoOff: isVideoOff,
          participantId: userSession.userId
        };
        
        console.log(`📢 Broadcasting participant-video-toggled to room ${roomId}:`, videoToggleData);
        
        // Broadcast to room (all participants) 
        meetingNamespace.to(roomId).emit("participant-video-toggled", videoToggleData);
        
        // ALSO send directly to sender to ensure they get their own update
        socket.emit("participant-video-toggled", videoToggleData);
        
        console.log(`📹 User ${socket.id} ${isVideoOff ? 'turned off' : 'turned on'} video in meeting ${meetingId}`);
        
      } catch (error) {
        console.error('Error handling video toggle:', error);
      }
    });

    // HOST CONTROLS - Remove participant from meeting
    socket.on("host-remove-participant", async (data) => {
      console.log('🚨 Backend: host-remove-participant event received:', {
        socketId: socket.id,
        data,
        userSession: userMeetings[socket.id]
      });
      
      try {
        const { meetingId, targetUserId } = data;
        const userSession = userMeetings[socket.id];
        
        if (!userSession || userSession.meetingId !== meetingId) {
          socket.emit('meeting-error', { message: 'You are not in this meeting' });
          return;
        }

        // Verify user is host
        const meeting = await Meeting.findOne({ meetingId });
        console.log('🔍 Host verification for remove participant:', {
          meetingId,
          meetingHost: meeting?.host,
          meetingHostType: typeof meeting?.host,
          userSessionUserId: userSession.userId,
          userSessionUserIdType: typeof userSession.userId,
          isHostMatch: meeting?.host?.toString() === userSession.userId
        });
        
        if (!meeting || meeting.host.toString() !== userSession.userId) {
          socket.emit('meeting-error', { message: 'Only hosts can remove participants' });
          return;
        }

        const roomId = `meeting-${meetingId}`;
        
        // Find target participant's socket
        let targetSocketId = null;
        for (const [socketId, session] of Object.entries(userMeetings)) {
          if (session.userId === targetUserId && session.meetingId === meetingId) {
            targetSocketId = socketId;
            break;
          }
        }

        // Notify ALL participants FIRST (before disconnecting anyone)
        console.log(`📢 Broadcasting participant-removed to ALL in room ${roomId}`);
        console.log(`📢 Sockets in room before removal: ${users[roomId] || []}`);
        
        // Debug: Check which sockets are actually in the room
        const socketsInRoom = await meetingNamespace.in(roomId).allSockets();
        console.log(`🔍 Actual sockets in room ${roomId}:`, Array.from(socketsInRoom));
        console.log(`🔍 Host socket ID: ${socket.id}`);
        console.log(`🔍 Target socket ID: ${targetSocketId}`);
        
        // DIRECT APPROACH: Send to the requesting socket immediately
        console.log(`📤 DIRECT: Sending participant-removed to requesting host socket ${socket.id}`);
        socket.emit("participant-removed", {
          userId: targetUserId,
          removedBy: userSession.userId
        });
        
        // Also send with a custom event name to test
        socket.emit("CUSTOM-PARTICIPANT-REMOVED", {
          userId: targetUserId,
          removedBy: userSession.userId,
          message: "CUSTOM EVENT TEST"
        });
        
        socket.emit("test-event", { 
          message: `DIRECT to host ${socket.id}`,
          timestamp: new Date().toISOString()
        });
        
        console.log(`📤 DIRECT: Events sent to host socket ${socket.id}`);

        // Remove from database
        await Meeting.updateOne(
          { meetingId },
          { 
            $pull: { 
              currentParticipants: { userId: targetUserId },
              participants: targetUserId 
            }
          }
        );

        if (targetSocketId) {
          console.log(`🎯 Found target participant socket: ${targetSocketId}`);
          
          // Get target socket FIRST before any operations
          const targetSocket = meetingNamespace.sockets.get(targetSocketId);
          
          if (targetSocket) {
            // STEP 1: Send removal notice MULTIPLE ways to ensure delivery
            console.log(`📤 MULTI-CHANNEL: Sending removed-from-meeting to ${targetSocketId}`);
            
            // Method 1: Direct to socket
            targetSocket.emit("removed-from-meeting", {
              message: "You have been removed from the meeting by the host",
              meetingId: meetingId,
              timestamp: new Date().toISOString()
            });
            
            // Method 2: Through namespace to target socket
            meetingNamespace.to(targetSocketId).emit("removed-from-meeting", {
              message: "You have been removed from the meeting by the host",
              meetingId: meetingId,
              timestamp: new Date().toISOString()
            });
            
            // Method 3: Custom event as backup
            targetSocket.emit("FORCE-DISCONNECT", {
              reason: "removed-by-host",
              message: "You have been removed from the meeting by the host"
            });

            // STEP 2: Wait a moment to ensure message is received
            setTimeout(async () => {
              console.log(`🔌 Starting disconnection process for ${targetSocketId}`);
              
              // STEP 3: Remove from tracking BEFORE broadcast
              // Remove from users array
              if (users[roomId]) {
                const oldUsers = [...users[roomId]];
                users[roomId] = users[roomId].filter(id => id !== targetSocketId);
                console.log(`🗑️ Users in room before: ${oldUsers}, after: ${users[roomId]}`);
              }
              
              // Remove from userMeetings
              const userDisplayName = userMeetings[targetSocketId]?.displayName || 'Unknown User';
              delete userMeetings[targetSocketId];
              console.log(`🗑️ Removed ${targetSocketId} from userMeetings`);
              
              // STEP 4: Notify ALL other participants that user left
              console.log(`📢 Broadcasting user-left to ALL participants in room ${roomId}`);
              meetingNamespace.to(roomId).emit("user-left", {
                socketId: targetSocketId,
                userId: targetUserId,
                displayName: userDisplayName,
                reason: 'removed-by-host'
              });

              // STEP 5: Disconnect the participant LAST
              console.log(`🔌 Disconnecting socket ${targetSocketId}`);
              targetSocket.leave(roomId);
              targetSocket.disconnect();
              
            }, 1000); // 1 second delay to ensure message delivery

          } else {
            console.log(`❌ Could not find socket object for ${targetSocketId}`);
          }
        } else {
          console.log(`❌ Could not find target socket for user ${targetUserId}`);
        }

        console.log(`✅ Sending host-action-success to ${socket.id}`);
        socket.emit('host-action-success', { 
          action: 'remove-participant', 
          targetUserId 
        });

        console.log(`🚫 Host ${userSession.userId} removed participant ${targetUserId} from meeting ${meetingId}`);

      } catch (error) {
        console.error('Error removing participant:', error);
        socket.emit('meeting-error', { message: 'Failed to remove participant' });
      }
    });

    // HOST CONTROLS - Block participant from rejoining
    socket.on("host-block-participant", async (data) => {
      try {
        const { meetingId, targetUserId } = data;
        const userSession = userMeetings[socket.id];
        
        if (!userSession || userSession.meetingId !== meetingId) {
          socket.emit('meeting-error', { message: 'You are not in this meeting' });
          return;
        }

        // Verify user is host
        const meeting = await Meeting.findOne({ meetingId });
        console.log('🔍 Host verification for block participant:', {
          meetingId,
          meetingHost: meeting?.host,
          meetingHostType: typeof meeting?.host,
          userSessionUserId: userSession.userId,
          userSessionUserIdType: typeof userSession.userId,
          isHostMatch: meeting?.host?.toString() === userSession.userId
        });
        
        if (!meeting || meeting.host.toString() !== userSession.userId) {
          socket.emit('meeting-error', { message: 'Only hosts can block participants' });
          return;
        }

        // Add to blocked list
        await Meeting.updateOne(
          { meetingId },
          { 
            $push: { 
              blockedParticipants: {
                userId: targetUserId,
                blockedBy: userSession.userId,
                blockedAt: new Date()
              }
            }
          }
        );

        socket.emit('host-action-success', { 
          action: 'block-participant', 
          targetUserId 
        });

        console.log(`🚫 Host ${userSession.userId} blocked participant ${targetUserId} in meeting ${meetingId}`);

      } catch (error) {
        console.error('Error blocking participant:', error);
        socket.emit('meeting-error', { message: 'Failed to block participant' });
      }
    });

    // HOST CONTROLS - Force mute participant
    socket.on("host-mute-participant", async (data) => {
      try {
        const { meetingId, targetUserId, isForceMuted } = data;
        const userSession = userMeetings[socket.id];
        
        if (!userSession || userSession.meetingId !== meetingId) {
          socket.emit('meeting-error', { message: 'You are not in this meeting' });
          return;
        }

        // Verify user is host
        const meeting = await Meeting.findOne({ meetingId });
        console.log('🔍 Host verification for mute participant:', {
          meetingId,
          meetingHost: meeting?.host,
          meetingHostType: typeof meeting?.host,
          userSessionUserId: userSession.userId,
          userSessionUserIdType: typeof userSession.userId,
          isHostMatch: meeting?.host?.toString() === userSession.userId
        });
        
        if (!meeting || meeting.host.toString() !== userSession.userId) {
          socket.emit('meeting-error', { message: 'Only hosts can control participant audio' });
          return;
        }

        const roomId = `meeting-${meetingId}`;
        
        // Update participant controls in database
        await Meeting.updateOne(
          { meetingId },
          { 
            $pull: { participantControls: { userId: targetUserId } }
          }
        );
        
        if (isForceMuted) {
          await Meeting.updateOne(
            { meetingId },
            { 
              $push: { 
                participantControls: {
                  userId: targetUserId,
                  isForceMuted: true,
                  controlledBy: userSession.userId,
                  controlledAt: new Date()
                }
              }
            }
          );
        }

        // Find target participant's socket and notify them
        let targetSocketId = null;
        for (const [socketId, session] of Object.entries(userMeetings)) {
          if (session.userId === targetUserId && session.meetingId === meetingId) {
            targetSocketId = socketId;
            break;
          }
        }

        if (targetSocketId) {
          const hostControlData = {
            isForceMuted,
            controlledBy: userSession.userId
          };
          console.log(`🚨 SENDING host-control-audio to socket ${targetSocketId}:`, hostControlData);
          meetingNamespace.to(targetSocketId).emit("host-control-audio", hostControlData);
          
          // Also try direct socket emission as backup
          const targetSocket = meetingNamespace.sockets.get(targetSocketId);
          if (targetSocket) {
            console.log(`🚨 DIRECT EMIT: host-control-audio to socket ${targetSocketId}`);
            targetSocket.emit("host-control-audio", hostControlData);
            targetSocket.emit("host-control-audio-direct", hostControlData);
          }
        } else {
          console.log(`❌ Could not find target socket for user ${targetUserId}`);
        }

        // Notify other participants
        socket.to(roomId).emit("participant-audio-controlled", {
          userId: targetUserId,
          isForceMuted,
          controlledBy: userSession.userId
        });

        socket.emit('host-action-success', { 
          action: 'mute-participant', 
          targetUserId,
          isForceMuted
        });

        console.log(`🔇 Host ${userSession.userId} ${isForceMuted ? 'muted' : 'unmuted'} participant ${targetUserId} in meeting ${meetingId}`);

      } catch (error) {
        console.error('Error controlling participant audio:', error);
        socket.emit('meeting-error', { message: 'Failed to control participant audio' });
      }
    });

    // HOST CONTROLS - Disable participant video
    socket.on("host-disable-video", async (data) => {
      try {
        const { meetingId, targetUserId, isVideoDisabled } = data;
        const userSession = userMeetings[socket.id];
        
        if (!userSession || userSession.meetingId !== meetingId) {
          socket.emit('meeting-error', { message: 'You are not in this meeting' });
          return;
        }

        // Verify user is host
        const meeting = await Meeting.findOne({ meetingId });
        console.log('🔍 Host verification for disable video:', {
          meetingId,
          meetingHost: meeting?.host,
          meetingHostType: typeof meeting?.host,
          userSessionUserId: userSession.userId,
          userSessionUserIdType: typeof userSession.userId,
          isHostMatch: meeting?.host?.toString() === userSession.userId
        });
        
        if (!meeting || meeting.host.toString() !== userSession.userId) {
          socket.emit('meeting-error', { message: 'Only hosts can control participant video' });
          return;
        }

        const roomId = `meeting-${meetingId}`;
        
        // Update participant controls in database
        await Meeting.updateOne(
          { meetingId },
          { 
            $pull: { participantControls: { userId: targetUserId } }
          }
        );
        
        if (isVideoDisabled) {
          await Meeting.updateOne(
            { meetingId },
            { 
              $push: { 
                participantControls: {
                  userId: targetUserId,
                  isVideoDisabled: true,
                  controlledBy: userSession.userId,
                  controlledAt: new Date()
                }
              }
            }
          );
        }

        // Find target participant's socket and notify them
        let targetSocketId = null;
        for (const [socketId, session] of Object.entries(userMeetings)) {
          if (session.userId === targetUserId && session.meetingId === meetingId) {
            targetSocketId = socketId;
            break;
          }
        }

        if (targetSocketId) {
          const hostControlData = {
            isVideoDisabled,
            controlledBy: userSession.userId
          };
          console.log(`🚨 SENDING host-control-video to socket ${targetSocketId}:`, hostControlData);
          meetingNamespace.to(targetSocketId).emit("host-control-video", hostControlData);
          
          // Also try direct socket emission as backup
          const targetSocket = meetingNamespace.sockets.get(targetSocketId);
          if (targetSocket) {
            console.log(`🚨 DIRECT EMIT: host-control-video to socket ${targetSocketId}`);
            targetSocket.emit("host-control-video", hostControlData);
            targetSocket.emit("host-control-video-direct", hostControlData);
          }
        } else {
          console.log(`❌ Could not find target socket for user ${targetUserId}`);
        }

        // Notify other participants
        socket.to(roomId).emit("participant-video-controlled", {
          userId: targetUserId,
          isVideoDisabled,
          controlledBy: userSession.userId
        });

        socket.emit('host-action-success', { 
          action: 'disable-video', 
          targetUserId,
          isVideoDisabled
        });

        console.log(`📹 Host ${userSession.userId} ${isVideoDisabled ? 'disabled' : 'enabled'} video for participant ${targetUserId} in meeting ${meetingId}`);

      } catch (error) {
        console.error('Error controlling participant video:', error);
        socket.emit('meeting-error', { message: 'Failed to control participant video' });
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