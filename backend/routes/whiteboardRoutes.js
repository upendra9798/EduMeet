import express from 'express';
import {
    createWhiteboard,
    getWhiteboardByMeeting,
    addElement,
    clearWhiteboard,
    saveSnapshot,
    getSnapshots,
    updatePermissions,
    exportWhiteboard,
    getCollaborationHistory
} from '../controllers/whiteboardController.js';
import {
    joinSession,
    leaveSession,
    updateCursor,
    getSessionParticipants,
    updateParticipantTool,
    getSessionMetrics,
    cleanupInactiveSessions,
    getSessionByWhiteboard,
    recordDrawingEvent
} from '../controllers/whiteboardSessionController.js';
// import { protect } from '../middleware/auth.middleware.js'; // Removed for demo mode

const router = express.Router();

// Whiteboard management routes (removed protect middleware)
router.post('/create', createWhiteboard);
router.get('/:meetingId', getWhiteboardByMeeting);
router.post('/:whiteboardId/element', addElement);
router.delete('/:whiteboardId/clear', clearWhiteboard);
router.post('/:whiteboardId/snapshot', saveSnapshot);
router.get('/:whiteboardId/snapshots', getSnapshots);
router.put('/:whiteboardId/permissions', updatePermissions);
router.post('/:whiteboardId/export', exportWhiteboard);
router.get('/:whiteboardId/history', getCollaborationHistory);

// Session management routes (removed protect middleware)
router.post('/session/join', joinSession);
router.post('/session/leave', leaveSession);
router.put('/session/cursor', updateCursor);
router.put('/session/tool', updateParticipantTool);
router.post('/session/drawing-event', recordDrawingEvent);
router.post('/session/cleanup', cleanupInactiveSessions); // Admin only
router.get('/session/:sessionId/participants', getSessionParticipants);
router.get('/session/:sessionId/metrics', getSessionMetrics);
router.get('/:whiteboardId/session', getSessionByWhiteboard);

export default router;