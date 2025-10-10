import WhiteboardSession from '../models/whiteboardSession.js';
import Whiteboard from '../models/whiteboard.js';
import Meeting from '../models/meeting.js';
import WhiteboardSessionService from '../services/whiteboardSessionService.js';

// @desc    Join whiteboard session
// @route   POST /api/whiteboard/session/join
// @access  Private
export const joinSession = async (req, res) => {
    try {
        const { whiteboardId, socketId } = req.body;
        const userId = req.user.id;

        // Find whiteboard
        const whiteboard = await Whiteboard.findOne({ whiteboardId, isActive: true });
        if (!whiteboard) {
            return res.status(404).json({ message: 'Whiteboard not found' });
        }

        // Check if user has access to the meeting
        const meeting = await Meeting.findById(whiteboard.meeting);
        if (!meeting.participants.includes(userId) && meeting.host.toString() !== userId) {
            return res.status(403).json({ message: 'Access denied to meeting' });
        }

        // Find or create session
        let session = await WhiteboardSessionService.findByWhiteboard(whiteboardId);
        
        if (!session) {
            // Create new session if it doesn't exist
            const sessionId = `session_${whiteboardId}`;
            session = await WhiteboardSessionService.createSession(sessionId, whiteboardId);
        }

        // Determine user role
        let role = 'participant';
        if (meeting.host.toString() === userId) {
            role = 'host';
        } else if (whiteboard.permissions.allowedDrawers.includes(userId)) {
            role = 'admin';
        }

        // Add participant to session
        const participant = await WhiteboardSessionService.addParticipant(session.sessionId, userId, socketId, role);

        res.json({
            message: 'Joined session successfully',
            session: {
                sessionId: session.sessionId,
                participant: {
                    userId: participant.userId,
                    role: participant.role,
                    joinedAt: participant.joinedAt
                },
                activeParticipants: session.participants ? session.participants.filter(p => p.isActive).length : 0,
                canDraw: role === 'host' || role === 'admin' || whiteboard.permissions.publicDrawing
            }
        });

    } catch (error) {
        console.error('Error joining session:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// @desc    Leave whiteboard session
// @route   POST /api/whiteboard/session/leave
// @access  Private
export const leaveSession = async (req, res) => {
    try {
        const { socketId } = req.body;

        // Find session by socket ID
        const session = await WhiteboardSession.findOne({
            'participants.socketId': socketId,
            isActive: true
        });

        if (!session) {
            return res.status(404).json({ message: 'Session not found' });
        }

        // Remove participant
        const participant = await WhiteboardSessionService.removeParticipant(session.sessionId, socketId);

        res.json({
            message: 'Left session successfully',
            participant: participant ? {
                userId: participant.userId,
                role: participant.role,
                duration: new Date() - participant.joinedAt
            } : null
        });

    } catch (error) {
        console.error('Error leaving session:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// @desc    Update participant cursor position
// @route   PUT /api/whiteboard/session/cursor
// @access  Private
export const updateCursor = async (req, res) => {
    try {
        const { socketId, cursor } = req.body;

        // Find session
        const session = await WhiteboardSession.findOne({
            'participants.socketId': socketId,
            isActive: true
        });

        if (!session) {
            return res.status(404).json({ message: 'Session not found' });
        }

        // Update cursor position
        const participant = await WhiteboardSessionService.updateParticipantCursor(session.sessionId, socketId, cursor);
        
        if (!participant) {
            return res.status(404).json({ message: 'Participant not found' });
        }

        res.json({
            message: 'Cursor updated successfully',
            participant: {
                userId: participant.userId,
                cursor: participant.cursor,
                lastSeen: participant.lastSeen
            }
        });

    } catch (error) {
        console.error('Error updating cursor:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// @desc    Get session participants
// @route   GET /api/whiteboard/session/:sessionId/participants
// @access  Private
export const getSessionParticipants = async (req, res) => {
    try {
        const { sessionId } = req.params;

        // Get active participants
        const activeParticipants = await WhiteboardSessionService.getActiveParticipants(sessionId);

        res.json({
            sessionId,
            participants: activeParticipants,
            totalActiveParticipants: activeParticipants.length
        });

    } catch (error) {
        console.error('Error fetching participants:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// @desc    Update participant tool
// @route   PUT /api/whiteboard/session/tool
// @access  Private
export const updateParticipantTool = async (req, res) => {
    try {
        const { socketId, tool } = req.body;

        // Find session
        const session = await WhiteboardSession.findOne({
            'participants.socketId': socketId,
            isActive: true
        });

        if (!session) {
            return res.status(404).json({ message: 'Session not found' });
        }

        // Update participant tool
        const participant = await WhiteboardSessionService.updateParticipantTool(session.sessionId, socketId, tool);
        if (!participant) {
            return res.status(404).json({ message: 'Participant not found' });
        }

        res.json({
            message: 'Tool updated successfully',
            participant: {
                userId: participant.userId,
                currentTool: participant.currentTool,
                lastSeen: participant.lastSeen
            }
        });

    } catch (error) {
        console.error('Error updating tool:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// @desc    Get session metrics and analytics
// @route   GET /api/whiteboard/session/:sessionId/metrics
// @access  Private
export const getSessionMetrics = async (req, res) => {
    try {
        const { sessionId } = req.params;

        // Get session statistics
        const statistics = await WhiteboardSessionService.getSessionStatistics(sessionId);
        res.json(statistics);

    } catch (error) {
        console.error('Error fetching session metrics:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// @desc    Cleanup inactive sessions
// @route   POST /api/whiteboard/session/cleanup
// @access  Private (Admin only)
export const cleanupInactiveSessions = async (req, res) => {
    try {
        const { hoursOld = 24 } = req.body;

        // Cleanup inactive sessions
        const result = await WhiteboardSessionService.cleanupInactiveSessions(hoursOld);

        res.json({
            message: 'Cleanup completed successfully',
            sessionsDeactivated: result.modifiedCount,
            cutoffTime: new Date(Date.now() - hoursOld * 60 * 60 * 1000)
        });

    } catch (error) {
        console.error('Error cleaning up sessions:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// @desc    Get session by whiteboard ID
// @route   GET /api/whiteboard/:whiteboardId/session
// @access  Private
export const getSessionByWhiteboard = async (req, res) => {
    try {
        const { whiteboardId } = req.params;

        // Find active session
        const session = await WhiteboardSessionService.findByWhiteboard(whiteboardId);
        
        if (!session) {
            return res.status(404).json({ message: 'No active session found' });
        }

        res.json({
            session: {
                sessionId: session.sessionId,
                whiteboardId: session.whiteboardId,
                activeParticipants: session.participants.filter(p => p.isActive),
                totalParticipants: session.participants.length,
                metrics: session.metrics,
                settings: session.settings,
                isActive: session.isActive,
                lastSyncAt: session.lastSyncAt,
                createdAt: session.createdAt,
                updatedAt: session.updatedAt
            }
        });

    } catch (error) {
        console.error('Error fetching session:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// @desc    Record drawing event for metrics
// @route   POST /api/whiteboard/session/drawing-event
// @access  Private
export const recordDrawingEvent = async (req, res) => {
    try {
        const { sessionId, eventType } = req.body;

        // Find session
        const session = await WhiteboardSession.findOne({ sessionId, isActive: true });
        if (!session) {
            return res.status(404).json({ message: 'Session not found' });
        }

        // Increment appropriate counter
        let metrics;
        if (eventType === 'draw') {
            metrics = await WhiteboardSessionService.incrementDrawingEvents(sessionId);
        } else if (eventType === 'element') {
            metrics = await WhiteboardSessionService.incrementElementsCreated(sessionId);
        }

        res.json({
            message: 'Event recorded successfully',
            metrics: metrics
        });

    } catch (error) {
        console.error('Error recording drawing event:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};