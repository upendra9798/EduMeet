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
                const { whiteboardId, userId: userIdParam, meetingId } = data;
                userId = userIdParam;
                currentWhiteboardId = whiteboardId;

                console.log(`Whiteboard join attempt: ${whiteboardId}, user: ${userId}, meeting: ${meetingId}`);

                // Validate whiteboard exists
                const whiteboard = await Whiteboard.findOne({ whiteboardId, isActive: true });
                if (!whiteboard) {
                    console.log('Whiteboard not found:', whiteboardId);
                    socket.emit('error', { message: 'Whiteboard not found' });
                    return;
                }

                console.log('Found whiteboard:', whiteboard.whiteboardId, 'for meeting:', whiteboard.meetingId);

                // Get meeting by meetingId instead of meeting._id
                const meeting = await Meeting.findOne({ meetingId: meetingId });
                if (!meeting) {
                    console.log('Meeting not found for whiteboard:', meetingId);
                    socket.emit('error', { message: 'Meeting not found' });
                    return;
                }

                console.log('Found meeting:', meeting.meetingId, 'host:', meeting.host);

                // Check user has access to meeting (host or participant)
                const isHost = meeting.host === userId;
                const isParticipant = meeting.participants.includes(userId);
                
                console.log(`User ${userId} - isHost: ${isHost}, isParticipant: ${isParticipant}`);

                if (!isHost && !isParticipant) {
                    console.log('Access denied for user:', userId);
                    socket.emit('error', { message: 'Access denied' });
                    return;
                }

                // Join socket room
                const roomName = `whiteboard-${whiteboardId}`;
                socket.join(roomName);

                // Find or create session
                let session = await WhiteboardSessionService.findByWhiteboard(whiteboardId);
                if (!session) {
                    const sessionId = `session_${whiteboardId}`;
                    session = await WhiteboardSessionService.createSession(sessionId, whiteboardId);
                }

                // Determine user role and permissions
                let role = 'participant';
                let canDraw = false;

                if (isHost) {
                    role = 'host';
                    canDraw = true;
                } else if (whiteboard.permissions.allowedDrawers.includes(userId)) {
                    role = 'admin';
                    canDraw = true;
                } else if (whiteboard.permissions.publicDrawing) {
                    canDraw = true;
                }

                console.log(`User ${userId} joined as ${role}, canDraw: ${canDraw}`);

                // Add participant to session
                await WhiteboardSessionService.addParticipant(session.sessionId, userId, socket.id, role);
                currentSession = session;

                // Notify user of successful join
                socket.emit('joined-whiteboard', {
                    whiteboardId,
                    sessionId: session.sessionId,
                    role,
                    canDraw,
                    permissions: whiteboard.permissions,
                    settings: whiteboard.settings
                });

                // Notify other participants
                socket.to(roomName).emit('user-joined', {
                    userId,
                    role,
                    socketId: socket.id,
                    timestamp: new Date()
                });

                // Send current whiteboard state
                socket.emit('whiteboard-state', {
                    elements: whiteboard.elements,
                    backgroundColor: whiteboard.backgroundColor,
                    backgroundImage: whiteboard.backgroundImage,
                    canvasWidth: whiteboard.canvasWidth,
                    canvasHeight: whiteboard.canvasHeight,
                    version: whiteboard.version
                });

                // Send current participants
                const activeParticipants = session.participants.filter(p => p.isActive);
                socket.emit('participants-list', {
                    participants: activeParticipants,
                    count: activeParticipants.length
                });

                console.log(`User ${userId} successfully joined whiteboard ${whiteboardId} as ${role}`);

            } catch (error) {
                console.error('Error joining whiteboard:', error);
                socket.emit('error', { message: 'Failed to join whiteboard' });
            }
        });

        // Handle drawing start
        socket.on('drawing-start', async (data) => {
            try {
                if (!currentSession || !currentWhiteboardId) return;

                const participant = await WhiteboardSessionService.getParticipantBySocket(currentSession.sessionId, socket.id);
                if (!participant) return;

                // Check drawing permissions
                const permissionCheck = await WhiteboardService.checkDrawingPermission(currentWhiteboardId, userId);
                if (!permissionCheck.canDraw) {
                    socket.emit('drawing-denied', { message: permissionCheck.reason });
                    return;
                }

                // Broadcast drawing start to room
                const roomName = `whiteboard-${currentWhiteboardId}`;
                socket.to(roomName).emit('drawing-start', {
                    ...data,
                    userId,
                    socketId: socket.id,
                    timestamp: new Date()
                });

                // Record drawing event
                await WhiteboardSessionService.incrementDrawingEvents(currentSession.sessionId);

            } catch (error) {
                console.error('Error handling drawing start:', error);
            }
        });

        // Handle drawing data
        socket.on('drawing', async (data) => {
            try {
                if (!currentSession || !currentWhiteboardId) return;

                const participant = await WhiteboardSessionService.getParticipantBySocket(currentSession.sessionId, socket.id);
                if (!participant) return;

                // Broadcast drawing data to room
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
                if (!currentSession || !currentWhiteboardId) return;

                const participant = await WhiteboardSessionService.getParticipantBySocket(currentSession.sessionId, socket.id);
                if (!participant) return;

                // Broadcast drawing end to room
                const roomName = `whiteboard-${currentWhiteboardId}`;
                socket.to(roomName).emit('drawing-end', {
                    ...data,
                    userId,
                    socketId: socket.id,
                    timestamp: new Date()
                });

                // If this was creating an element, add it to whiteboard
                if (data.elementData) {
                    const element = await WhiteboardService.addElement(currentWhiteboardId, data.elementData, userId);
                    await WhiteboardSessionService.incrementElementsCreated(currentSession.sessionId);

                    // Get updated whiteboard for version
                    const whiteboard = await Whiteboard.findOne({ whiteboardId: currentWhiteboardId });

                    // Notify about new element
                    whiteboardNamespace.to(roomName).emit('element-added', {
                        element,
                        version: whiteboard.version,
                        addedBy: userId,
                        timestamp: new Date()
                    });
                }

            } catch (error) {
                console.error('Error handling drawing end:', error);
            }
        });

        // Handle cursor movement
        socket.on('cursor-move', async (data) => {
            try {
                if (!currentSession || !currentWhiteboardId) return;

                // Update cursor in session
                await WhiteboardSessionService.updateParticipantCursor(currentSession.sessionId, socket.id, data.cursor);

                // Broadcast cursor position to room
                const roomName = `whiteboard-${currentWhiteboardId}`;
                socket.to(roomName).emit('cursor-update', {
                    userId,
                    cursor: data.cursor,
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