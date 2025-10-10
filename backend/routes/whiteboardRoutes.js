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
import { protect } from '../middleware/auth.js'; // Assuming you have auth middleware

const router = express.Router();

// Whiteboard management routes
router.post('/create', protect, createWhiteboard);
router.get('/:meetingId', protect, getWhiteboardByMeeting);
router.post('/:whiteboardId/element', protect, addElement);
router.delete('/:whiteboardId/clear', protect, clearWhiteboard);
router.post('/:whiteboardId/snapshot', protect, saveSnapshot);
router.get('/:whiteboardId/snapshots', protect, getSnapshots);
router.put('/:whiteboardId/permissions', protect, updatePermissions);
router.post('/:whiteboardId/export', protect, exportWhiteboard);
router.get('/:whiteboardId/history', protect, getCollaborationHistory);

// Session management routes
router.post('/session/join', protect, joinSession);
router.post('/session/leave', protect, leaveSession);
router.put('/session/cursor', protect, updateCursor);
router.put('/session/tool', protect, updateParticipantTool);
router.post('/session/drawing-event', protect, recordDrawingEvent);
router.post('/session/cleanup', protect, cleanupInactiveSessions); // Admin only
router.get('/session/:sessionId/participants', protect, getSessionParticipants);
router.get('/session/:sessionId/metrics', protect, getSessionMetrics);
router.get('/:whiteboardId/session', protect, getSessionByWhiteboard);

export default router;