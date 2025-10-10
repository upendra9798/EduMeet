import Whiteboard from '../models/whiteboard.js';
import WhiteboardSession from '../models/whiteboardSession.js';
import Meeting from '../models/meeting.js';
import WhiteboardService from '../services/whiteboardService.js';
import WhiteboardSessionService from '../services/whiteboardSessionService.js';
import { v4 as uuidv4 } from 'uuid';

// @desc    Create a new whiteboard for a meeting
// @route   POST /api/whiteboard/create
// @access  Private (Meeting Host/Admin)
export const createWhiteboard = async (req, res) => {
    try {
        const { meetingId, title, canvasWidth, canvasHeight, backgroundColor } = req.body;
        const userId = req.user.id;

        // Check if meeting exists and user has permission
        const meeting = await Meeting.findOne({ meetingId }).populate('host');
        if (!meeting) {
            return res.status(404).json({ message: 'Meeting not found' });
        }

        // Check if user is host or admin
        if (meeting.host._id.toString() !== userId && !meeting.participants.includes(userId)) {
            return res.status(403).json({ message: 'Access denied' });
        }

        // Check if whiteboard already exists for this meeting
        const existingWhiteboard = await Whiteboard.findOne({ meetingId, isActive: true });
        if (existingWhiteboard) {
            return res.status(400).json({ 
                message: 'Whiteboard already exists for this meeting',
                whiteboard: existingWhiteboard
            });
        }

        // Create new whiteboard
        const whiteboardId = `wb_${meetingId}_${uuidv4()}`;
        const whiteboard = new Whiteboard({
            whiteboardId,
            meetingId,
            meeting: meeting._id,
            title: title || `${meeting.title} - Whiteboard`,
            canvasWidth: canvasWidth || 1920,
            canvasHeight: canvasHeight || 1080,
            backgroundColor: backgroundColor || '#ffffff',
            permissions: {
                allowedDrawers: [userId],
                restrictToHost: meeting.host._id.toString() === userId
            },
            lastModified: {
                timestamp: new Date(),
                modifiedBy: userId
            }
        });

        await whiteboard.save();

        // Create associated session
        const sessionId = `session_${whiteboardId}`;
        const session = await WhiteboardSessionService.createSession(sessionId, whiteboardId);

        res.status(201).json({
            message: 'Whiteboard created successfully',
            whiteboard: {
                whiteboardId: whiteboard.whiteboardId,
                title: whiteboard.title,
                canvasWidth: whiteboard.canvasWidth,
                canvasHeight: whiteboard.canvasHeight,
                backgroundColor: whiteboard.backgroundColor,
                sessionId: session.sessionId
            }
        });

    } catch (error) {
        console.error('Error creating whiteboard:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// @desc    Get whiteboard by meeting ID
// @route   GET /api/whiteboard/:meetingId
// @access  Private
// 👉 Used when a user joins a meeting and needs to load the whiteboard data.
export const getWhiteboardByMeeting = async (req, res) => {
    try {
        const { meetingId } = req.params;
        const userId = req.user.id;

        // Find whiteboard
        const whiteboard = await WhiteboardService.findByMeeting(meetingId);
        if (!whiteboard) {
            return res.status(404).json({ message: 'Whiteboard not found' });
        }

        // Check if user has access to the meeting
        const meeting = await Meeting.findOne({ meetingId });
        if (!meeting || (!meeting.participants.includes(userId) && meeting.host.toString() !== userId)) {
            return res.status(403).json({ message: 'Access denied' });
        }

        // Get session info
        const session = await WhiteboardSessionService.findByWhiteboard(whiteboard.whiteboardId);

        res.json({
            whiteboard: {
                whiteboardId: whiteboard.whiteboardId,
                title: whiteboard.title,
                canvasWidth: whiteboard.canvasWidth,
                canvasHeight: whiteboard.canvasHeight,
                backgroundColor: whiteboard.backgroundColor,
                backgroundImage: whiteboard.backgroundImage,
                elements: whiteboard.elements,
                settings: whiteboard.settings,
                permissions: whiteboard.permissions,
                version: whiteboard.version,
                lastModified: whiteboard.lastModified,
                elementCount: whiteboard.elementCount
            },
            session: session ? {
                sessionId: session.sessionId,
                activeParticipantCount: session.activeParticipantCount,
                participants: session.participants.filter(p => p.isActive)
            } : null
        });

    } catch (error) {
        console.error('Error fetching whiteboard:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// @desc    Add drawing element to whiteboard
// @route   POST /api/whiteboard/:whiteboardId/element
// @access  Private
export const addElement = async (req, res) => {
    try {
        const { whiteboardId } = req.params;
        const { type, tool, color, brushSize, points, text, fontSize, startPoint, endPoint } = req.body;
        const userId = req.user.id;

        // Find whiteboard
        const whiteboard = await Whiteboard.findOne({ whiteboardId, isActive: true });
        if (!whiteboard) {
            return res.status(404).json({ message: 'Whiteboard not found' });
        }

        // Check permissions
        if (whiteboard.permissions.restrictToHost) {
            const meeting = await Meeting.findById(whiteboard.meeting);
            if (meeting.host.toString() !== userId) {
                return res.status(403).json({ message: 'Only meeting host can draw' });
            }
        } else if (!whiteboard.permissions.publicDrawing && 
                   !whiteboard.permissions.allowedDrawers.includes(userId)) {
            return res.status(403).json({ message: 'Drawing permission denied' });
        }

        // Create element
        const elementData = {
            type,
            tool,
            color,
            brushSize,
            points,
            text,
            fontSize,
            startPoint,
            endPoint
        };

        const element = await WhiteboardService.addElement(whiteboardId, elementData, userId);

        // Update session metrics
        const session = await WhiteboardSessionService.findByWhiteboard(whiteboardId);
        if (session) {
            await WhiteboardSessionService.incrementElementsCreated(session.sessionId);
        }

        res.status(201).json({
            message: 'Element added successfully',
            element,
            version: whiteboard.version
        });

    } catch (error) {
        console.error('Error adding element:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// @desc    Clear whiteboard
// @route   DELETE /api/whiteboard/:whiteboardId/clear
// @access  Private (Admin/Host only)
export const clearWhiteboard = async (req, res) => {
    try {
        const { whiteboardId } = req.params;
        const userId = req.user.id;

        // Find whiteboard
        const whiteboard = await Whiteboard.findOne({ whiteboardId, isActive: true });
        if (!whiteboard) {
            return res.status(404).json({ message: 'Whiteboard not found' });
        }

        // Check if user has permission to clear
        const meeting = await Meeting.findById(whiteboard.meeting);
        if (meeting.host.toString() !== userId && 
            !whiteboard.permissions.allowedDrawers.includes(userId)) {
            return res.status(403).json({ message: 'Permission denied' });
        }

        // Clear the whiteboard
        const clearedWhiteboard = await WhiteboardService.clearBoard(whiteboardId, userId);

        res.json({
            message: 'Whiteboard cleared successfully',
            version: clearedWhiteboard.version
        });

    } catch (error) {
        console.error('Error clearing whiteboard:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// @desc    Save whiteboard snapshot
// @route   POST /api/whiteboard/:whiteboardId/snapshot
// @access  Private
export const saveSnapshot = async (req, res) => {
    try {
        const { whiteboardId } = req.params;
        const { imageData } = req.body;
        const userId = req.user.id;

        // Find whiteboard
        const whiteboard = await Whiteboard.findOne({ whiteboardId, isActive: true });
        if (!whiteboard) {
            return res.status(404).json({ message: 'Whiteboard not found' });
        }

        // Add snapshot
        const snapshot = await WhiteboardService.addSnapshot(whiteboardId, imageData, userId);

        res.json({
            message: 'Snapshot saved successfully',
            snapshot
        });

    } catch (error) {
        console.error('Error saving snapshot:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// @desc    Get whiteboard snapshots
// @route   GET /api/whiteboard/:whiteboardId/snapshots
// @access  Private
export const getSnapshots = async (req, res) => {
    try {
        const { whiteboardId } = req.params;
        const { limit = 10 } = req.query;

        // Find whiteboard
        const whiteboard = await Whiteboard.findOne({ whiteboardId, isActive: true })
            .populate('snapshots.createdBy', 'name email');
        
        if (!whiteboard) {
            return res.status(404).json({ message: 'Whiteboard not found' });
        }

        // Get recent snapshots
        const snapshots = whiteboard.snapshots
            .sort((a, b) => b.timestamp - a.timestamp)
            .slice(0, parseInt(limit));

        res.json({
            snapshots,
            totalCount: whiteboard.snapshots.length
        });

    } catch (error) {
        console.error('Error fetching snapshots:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// @desc    Update whiteboard permissions
// @route   PUT /api/whiteboard/:whiteboardId/permissions
// @access  Private (Host only)
export const updatePermissions = async (req, res) => {
    try {
        const { whiteboardId } = req.params;
        const { allowedDrawers, publicDrawing, restrictToHost } = req.body;
        const userId = req.user.id;

        // Find whiteboard
        const whiteboard = await Whiteboard.findOne({ whiteboardId, isActive: true });
        if (!whiteboard) {
            return res.status(404).json({ message: 'Whiteboard not found' });
        }

        // Check if user is meeting host
        const meeting = await Meeting.findById(whiteboard.meeting);
        if (meeting.host.toString() !== userId) {
            return res.status(403).json({ message: 'Only meeting host can update permissions' });
        }

        // Update permissions
        const permissionData = { allowedDrawers, publicDrawing, restrictToHost };
        const updatedPermissions = await WhiteboardService.updatePermissions(whiteboardId, userId, permissionData);

        res.json({
            message: 'Permissions updated successfully',
            permissions: updatedPermissions
        });

    } catch (error) {
        console.error('Error updating permissions:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// @desc    Export whiteboard
// @route   POST /api/whiteboard/:whiteboardId/export
// @access  Private
// Create an export URL (in a real app, generate PNG/PDF).
export const exportWhiteboard = async (req, res) => {
    try {
        const { whiteboardId } = req.params;
        const { format = 'png', quality = 0.9 } = req.body;
        const userId = req.user.id;

        // Find whiteboard
        const whiteboard = await Whiteboard.findOne({ whiteboardId, isActive: true });
        if (!whiteboard) {
            return res.status(404).json({ message: 'Whiteboard not found' });
        }

        // In a real implementation, you would generate the export file here
        // For now, we'll just create a placeholder URL
        const exportUrl = `/exports/${whiteboardId}_${Date.now()}.${format}`;

        // Save export record
        const exportRecord = await WhiteboardService.addExport(whiteboardId, userId, { format, url: exportUrl });

        res.json({
            message: 'Export created successfully',
            exportUrl,
            format
        });

    } catch (error) {
        console.error('Error exporting whiteboard:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// @desc    Get whiteboard collaboration history
// @route   GET /api/whiteboard/:whiteboardId/history
// @access  Private
export const getCollaborationHistory = async (req, res) => {
    try {
        const { whiteboardId } = req.params;
        const { limit = 50, page = 1 } = req.query;

        // Find whiteboard
        const whiteboard = await Whiteboard.findOne({ whiteboardId, isActive: true })
            .populate('collaborationHistory.performedBy', 'name email');
        
        if (!whiteboard) {
            return res.status(404).json({ message: 'Whiteboard not found' });
        }

        // Paginate history
        const startIndex = (page - 1) * limit;
        const endIndex = startIndex + parseInt(limit);
        
        const history = whiteboard.collaborationHistory
            .sort((a, b) => b.timestamp - a.timestamp)
            .slice(startIndex, endIndex);

        res.json({
            history,
            pagination: {
                currentPage: parseInt(page),
                totalPages: Math.ceil(whiteboard.collaborationHistory.length / limit),
                totalItems: whiteboard.collaborationHistory.length
            }
        });

    } catch (error) {
        console.error('Error fetching collaboration history:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};