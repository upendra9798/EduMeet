import WhiteboardSession from '../models/whiteboardSession.js';
import Whiteboard from '../models/whiteboard.js';
import Meeting from '../models/meeting.js';
import WhiteboardService from '../services/whiteboardService.js';
import WhiteboardSessionService from '../services/whiteboardSessionService.js';

// Real-time whiteboard socket handler
const whiteboardSocketHandler = (io) => {
    // Namespace for whiteboard events
    const whiteboardNamespace = io.of('/whiteboard');

    whiteboardNamespace.on('connection', (socket) => {
        console.log(`Whiteboard client connected: ${socket.id}`);
        
        let currentSession = null;
        let currentWhiteboardId = null;
        let userId = null;

        // Join whiteboard room
        socket.on('join-whiteboard', async (data) => {
            try {
                const { whiteboardId, userId: userIdParam, meetingId, displayName } = data;
                userId = userIdParam;
                currentWhiteboardId = whiteboardId;

                console.log(`Whiteboard join attempt: ${whiteboardId}, user: ${userId} (${displayName}), meeting: ${meetingId}`);

                // Join socket room immediately (fallback mode for testing)
                const roomName = `whiteboard-${whiteboardId}`;
                socket.join(roomName);
                console.log(`User ${userId} joined room: ${roomName}`);

                // Try to validate with database, but continue if it fails
                let whiteboard = null;
                let meeting = null;
                let isHost = true; // Default to host for testing
                let canDraw = true; // Allow drawing for testing
                
                try {
                    // Validate whiteboard exists
                    whiteboard = await Whiteboard.findOne({ whiteboardId, isActive: true });
                    if (whiteboard) {
                        console.log('Found whiteboard:', whiteboard.whiteboardId, 'for meeting:', whiteboard.meetingId);
                        
                        // Get meeting by meetingId
                        meeting = await Meeting.findOne({ meetingId: meetingId });
                        if (meeting) {
                            console.log('Found meeting:', meeting.meetingId, 'host:', meeting.host);
                            // Check user permissions
                            isHost = meeting.host === userId || meeting.host.toString() === userId;
                            const isParticipant = meeting.participants.includes(userId);
                            canDraw = isHost || whiteboard.permissions.publicDrawing || !whiteboard.permissions.restrictToHost;
                        }
                    }
                } catch (dbError) {
                    console.log('Database connection failed, using fallback mode:', dbError.message);
                }

                console.log(`User ${userId} (${displayName}) - isHost: ${isHost}, canDraw: ${canDraw}`);
                
                // Try to find or create session (fallback if DB fails)
                let session = null;
                try {
                    session = await WhiteboardSessionService.findByWhiteboard(whiteboardId);
                    if (!session) {
                        const sessionId = `session_${whiteboardId}`;
                        session = await WhiteboardSessionService.createSession(sessionId, whiteboardId);
                    }
                } catch (sessionError) {
                    console.log('Session creation failed, using in-memory session:', sessionError.message);
                    // Create a mock session for fallback
                    session = { 
                        sessionId: `session_${whiteboardId}`,
                        whiteboardId: whiteboardId 
                    };
                }

                // Determine user role and permissions  
                let role = isHost ? 'host' : 'participant';
                
                // Check additional permissions if whiteboard exists
                if (whiteboard && whiteboard.permissions) {
                    if (whiteboard.permissions.allowedDrawers.includes(userId)) {
                        role = 'admin';
                        canDraw = true;
                    } else if (whiteboard.permissions.publicDrawing) {
                        canDraw = true;
                    } else {
                        // Default for participants - allow drawing unless restricted
                        canDraw = !whiteboard.permissions.restrictToHost;
                    }
                }

                console.log(`User ${userId} (${displayName}) joined as ${role}, canDraw: ${canDraw}`);

                // Try to add participant to session (fallback if DB fails)
                try {
                    await WhiteboardSessionService.addParticipant(session.sessionId, userId, socket.id, role, displayName);
                } catch (sessionError) {
                    console.log('Failed to add participant to session, continuing:', sessionError.message);
                }
                currentSession = session;

                // Notify user of successful join
                socket.emit('joined-whiteboard', {
                    whiteboardId,
                    sessionId: session.sessionId,
                    role,
                    canDraw,
                    permissions: whiteboard ? whiteboard.permissions : { publicDrawing: true, restrictToHost: false },
                    settings: whiteboard ? whiteboard.settings : {}
                });

                // Notify other participants about new user
                socket.to(roomName).emit('user-joined', {
                    userId,
                    displayName,
                    role,
                    socketId: socket.id,
                    timestamp: new Date()
                });

                // Send current whiteboard state (fallback if no whiteboard)
                socket.emit('whiteboard-state', {
                    elements: whiteboard ? whiteboard.elements : [],
                    backgroundColor: whiteboard ? whiteboard.backgroundColor : '#ffffff',
                    backgroundImage: whiteboard ? whiteboard.backgroundImage : null,
                    canvasWidth: whiteboard ? whiteboard.canvasWidth : 800,
                    canvasHeight: whiteboard ? whiteboard.canvasHeight : 600,
                    version: whiteboard ? whiteboard.version : 1
                });

                // Send current participants (fallback if no session)
                try {
                    const activeParticipants = session.participants ? session.participants.filter(p => p.isActive) : [];
                    socket.emit('participants-list', {
                        participants: activeParticipants,
                        count: activeParticipants.length
                    });
                } catch (participantError) {
                    console.log('Failed to get participants, sending empty list');
                    socket.emit('participants-list', { participants: [], count: 0 });
                }

                console.log(`User ${userId} successfully joined whiteboard ${whiteboardId} as ${role}`);

            } catch (error) {
                console.error('Error joining whiteboard:', error);
                socket.emit('error', { message: 'Failed to join whiteboard' });
            }
        });

        // Handle drawing start
        socket.on('drawing-start', async (data) => {
            try {
                if (!currentWhiteboardId || !userId) {
                    console.log('Missing whiteboard ID or user ID for drawing-start');
                    return;
                }

                console.log(`Drawing started by user ${userId}:`, data);

                // Broadcast drawing start to room (simplified - no permission check for testing)
                const roomName = `whiteboard-${currentWhiteboardId}`;
                socket.to(roomName).emit('drawing-start', {
                    ...data,
                    userId,
                    socketId: socket.id,
                    timestamp: new Date()
                });

                // Try to record drawing event (fallback if DB fails)
                try {
                    if (currentSession && currentSession.sessionId) {
                        await WhiteboardSessionService.incrementDrawingEvents(currentSession.sessionId);
                    }
                } catch (sessionError) {
                    console.log('Failed to record drawing event, continuing:', sessionError.message);
                }

            } catch (error) {
                console.error('Error handling drawing start:', error);
            }
        });

        // Handle drawing data
        socket.on('drawing', async (data) => {
            try {
                if (!currentWhiteboardId || !userId) {
                    console.log('Missing whiteboard ID or user ID for drawing');
                    return;
                }

                console.log(`Drawing update by user ${userId}:`, data);

                // Broadcast drawing data to room (simplified - no participant check for testing)
                const roomName = `whiteboard-${currentWhiteboardId}`;
                socket.to(roomName).emit('drawing', {
                    ...data,
                    userId,
                    socketId: socket.id,
                    timestamp: new Date()
                });

            } catch (error) {
                console.error('Error handling drawing:', error);
            }
        });

        // Handle drawing end
        socket.on('drawing-end', async (data) => {
            try {
                if (!currentWhiteboardId || !userId) {
                    console.log('Missing whiteboard ID or user ID for drawing-end');
                    return;
                }

                console.log(`Drawing ended by user ${userId}:`, data);

                // Broadcast drawing end to room (simplified - no participant check for testing)
                const roomName = `whiteboard-${currentWhiteboardId}`;
                socket.to(roomName).emit('drawing-end', {
                    ...data,
                    userId,
                    socketId: socket.id,
                    timestamp: new Date()
                });

                // Try to handle element creation (fallback if DB fails)
                if (data.elementData) {
                    try {
                        const element = await WhiteboardService.addElement(currentWhiteboardId, data.elementData, userId);
                        if (currentSession && currentSession.sessionId) {
                            await WhiteboardSessionService.incrementElementsCreated(currentSession.sessionId);
                        }

                        // Get updated whiteboard for version
                        const whiteboard = await Whiteboard.findOne({ whiteboardId: currentWhiteboardId });

                        // Notify about new element
                        whiteboardNamespace.to(roomName).emit('element-added', {
                            element,
                            version: whiteboard ? whiteboard.version : 1,
                            addedBy: userId,
                            timestamp: new Date()
                        });
                    } catch (elementError) {
                        console.log('Failed to save element to database, continuing:', elementError.message);
                    }
                }

            } catch (error) {
                console.error('Error handling drawing end:', error);
            }
        });

        // Handle cursor movement
        socket.on('cursor-move', async (data) => {
            try {
                if (!currentSession || !currentWhiteboardId) return;

                // Broadcast cursor position to room (including display name and user info)
                const roomName = `whiteboard-${currentWhiteboardId}`;
                socket.to(roomName).emit('cursor-move', {
                    userId,
                    x: data.x,
                    y: data.y,
                    displayName: data.displayName,
                    userColor: data.userColor,
                    timestamp: new Date()
                });

            } catch (error) {
                console.error('Error handling cursor move:', error);
            }
        });

        // Handle tool change
        socket.on('tool-change', async (data) => {
            try {
                if (!currentSession) return;

                const participant = await WhiteboardSessionService.updateParticipantTool(currentSession.sessionId, socket.id, data.tool);
                if (participant) {
                    // Broadcast tool change to room
                    const roomName = `whiteboard-${currentWhiteboardId}`;
                    socket.to(roomName).emit('tool-changed', {
                        userId,
                        tool: data.tool,
                        timestamp: new Date()
                    });
                }

            } catch (error) {
                console.error('Error handling tool change:', error);
            }
        });

        // Handle canvas clear
        socket.on('clear-canvas', async (data) => {
            try {
                if (!currentSession || !currentWhiteboardId) return;

                const participant = await WhiteboardSessionService.getParticipantBySocket(currentSession.sessionId, socket.id);
                if (!participant || (participant.role !== 'host' && participant.role !== 'admin')) {
                    socket.emit('action-denied', { message: 'Clear permission denied' });
                    return;
                }

                // Clear whiteboard
                const clearedWhiteboard = await WhiteboardService.clearBoard(currentWhiteboardId, userId);

                // Broadcast clear to all participants
                const roomName = `whiteboard-${currentWhiteboardId}`;
                whiteboardNamespace.to(roomName).emit('canvas-cleared', {
                    clearedBy: userId,
                    version: clearedWhiteboard.version,
                    timestamp: new Date()
                });

            } catch (error) {
                console.error('Error handling canvas clear:', error);
            }
        });

        // Handle undo/redo
        socket.on('canvas-action', async (data) => {
            try {
                if (!currentSession || !currentWhiteboardId) return;

                const participant = await WhiteboardSessionService.getParticipantBySocket(currentSession.sessionId, socket.id);
                if (!participant || (participant.role !== 'host' && participant.role !== 'admin')) {
                    socket.emit('action-denied', { message: 'Action permission denied' });
                    return;
                }

                const { action, imageData } = data; // action: 'undo' | 'redo'
                const whiteboard = await Whiteboard.findOne({ whiteboardId: currentWhiteboardId });
                
                if (whiteboard && imageData) {
                    // Update whiteboard state
                    whiteboard.lastModified = {
                        timestamp: new Date(),
                        modifiedBy: userId
                    };
                    whiteboard.version += 1;
                    await whiteboard.save();

                    // Broadcast action to room
                    const roomName = `whiteboard-${currentWhiteboardId}`;
                    socket.to(roomName).emit('canvas-action', {
                        action,
                        imageData,
                        performedBy: userId,
                        version: whiteboard.version,
                        timestamp: new Date()
                    });
                }

            } catch (error) {
                console.error('Error handling canvas action:', error);
            }
        });

        // Handle permission update
        socket.on('update-permissions', async (data) => {
            try {
                if (!currentSession || !currentWhiteboardId) return;

                const participant = await WhiteboardSessionService.getParticipantBySocket(currentSession.sessionId, socket.id);
                if (!participant || participant.role !== 'host') {
                    socket.emit('action-denied', { message: 'Permission update denied' });
                    return;
                }

                // Update permissions using service
                const updatedPermissions = await WhiteboardService.updatePermissions(currentWhiteboardId, userId, data);

                // Broadcast permission update
                const roomName = `whiteboard-${currentWhiteboardId}`;
                whiteboardNamespace.to(roomName).emit('permissions-updated', {
                    permissions: updatedPermissions,
                    updatedBy: userId,
                    timestamp: new Date()
                });

            } catch (error) {
                console.error('Error updating permissions:', error);
            }
        });

        // Handle save snapshot
        socket.on('save-snapshot', async (data) => {
            try {
                if (!currentWhiteboardId) return;

                const snapshot = await WhiteboardService.addSnapshot(currentWhiteboardId, data.imageData, userId);
                
                socket.emit('snapshot-saved', {
                    message: 'Snapshot saved successfully',
                    snapshot
                });

            } catch (error) {
                console.error('Error saving snapshot:', error);
            }
        });

        // Handle disconnect
        socket.on('disconnect', async () => {
            try {
                console.log(`Whiteboard client disconnected: ${socket.id}`);

                if (currentSession) {
                    // Remove participant from session
                    const participant = await WhiteboardSessionService.removeParticipant(currentSession.sessionId, socket.id);

                    // Notify room about user leaving
                    if (currentWhiteboardId && participant) {
                        const roomName = `whiteboard-${currentWhiteboardId}`;
                        socket.to(roomName).emit('user-left', {
                            userId: participant.userId,
                            role: participant.role,
                            timestamp: new Date()
                        });
                    }
                }

            } catch (error) {
                console.error('Error handling disconnect:', error);
            }
        });

        // Handle ping for connection health
        socket.on('ping', () => {
            socket.emit('pong', { timestamp: new Date() });
        });
    });

    return whiteboardNamespace;
};

export default whiteboardSocketHandler;