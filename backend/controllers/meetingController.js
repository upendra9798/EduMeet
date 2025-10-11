// Import necessary modules
import Meeting from '../models/meeting.js';
import { v4 as uuidv4 } from 'uuid';

/**
 * Create a new meeting
 * @route POST /api/meetings/create
 * @desc Creates a new meeting with specified settings and host information
 * @access Private (requires authentication)
 */
export const createMeeting = async (req, res) => {
    try {
        // Extract meeting details from request body
        const { title, startTime, endTime, maxParticipants, roomType, meetingSettings } = req.body;
        
        // Get host ID from authenticated user or request body (fallback for testing)
        const hostId = req.user?.id || req.body.hostId;

        // Generate unique meeting ID using UUID v4
        const meetingId = uuidv4();

        // Create new meeting instance with provided or default values
        const meeting = new Meeting({
            meetingId,
            title,
            host: hostId,
            startTime: startTime || new Date(), // Use current time if not provided
            endTime,
            maxParticipants: maxParticipants || 50, // Default to 50 participants
            roomType: roomType || 'private', // Default to private room
            meetingSettings: meetingSettings || {
                // Default meeting settings - allow all features
                allowVideo: true,
                allowAudio: true,
                allowScreenShare: true,
                allowChat: true,
                allowWhiteboard: true
            }
        });

        // Save meeting to database
        await meeting.save();

        // Return success response with meeting details
        res.status(201).json({
            success: true,
            message: 'Meeting created successfully',
            meeting: {
                meetingId: meeting.meetingId,
                title: meeting.title,
                startTime: meeting.startTime,
                endTime: meeting.endTime,
                maxParticipants: meeting.maxParticipants,
                roomType: meeting.roomType,
                meetingSettings: meeting.meetingSettings
            }
        });
    } catch (error) {
        // Handle any errors during meeting creation
        console.error('Error creating meeting:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create meeting',
            error: error.message
        });
    }
};

/**
 * Join an existing meeting
 * @route POST /api/meetings/join/:meetingId
 * @desc Allows a user to join an existing active meeting
 * @access Private (requires authentication)
 */
export const joinMeeting = async (req, res) => {
    try {
        // Extract meeting ID from URL parameters
        const { meetingId } = req.params;
        // Get user ID from authenticated user or request body (fallback for testing)
        const userId = req.user?.id || req.body.userId;

        // Find active meeting by ID
        const meeting = await Meeting.findOne({ meetingId, isActive: true });

        // Validate meeting exists and is active
        if (!meeting) {
            return res.status(404).json({
                success: false,
                message: 'Meeting not found or inactive'
            });
        }

        // Check if meeting has reached maximum capacity
        if (meeting.currentParticipants.length >= meeting.maxParticipants) {
            return res.status(400).json({
                success: false,
                message: 'Meeting is at full capacity'
            });
        }

        // Check if user is already in the participants list
        const isAlreadyParticipant = meeting.participants.includes(userId);

        // Add user to participants list if not already present
        if (!isAlreadyParticipant) {
            meeting.participants.push(userId);
            await meeting.save();
        }

        // Return success response with complete meeting information
        res.status(200).json({
            success: true,
            message: 'Successfully joined meeting',
            meeting: {
                meetingId: meeting.meetingId,
                title: meeting.title,
                host: meeting.host,
                participants: meeting.participants,
                currentParticipants: meeting.currentParticipants.length,
                maxParticipants: meeting.maxParticipants,
                meetingSettings: meeting.meetingSettings,
                startTime: meeting.startTime,
                endTime: meeting.endTime
            }
        });
    } catch (error) {
        // Handle any errors during meeting join process
        console.error('Error joining meeting:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to join meeting',
            error: error.message
        });
    }
};

/**
 * Get meeting details
 * @route GET /api/meetings/:meetingId
 * @desc Retrieves detailed information about a specific meeting
 * @access Private (requires authentication)
 */
export const getMeeting = async (req, res) => {
    try {
        // Extract meeting ID from URL parameters
        const { meetingId } = req.params;

        // Find active meeting
        const meeting = await Meeting.findOne({ meetingId, isActive: true });

        // Validate meeting exists and is active
        if (!meeting) {
            return res.status(404).json({
                success: false,
                message: 'Meeting not found or inactive'
            });
        }

        // Return complete meeting information
        res.status(200).json({
            success: true,
            meeting
        });
    } catch (error) {
        // Handle any errors during meeting retrieval
        console.error('Error fetching meeting:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch meeting',
            error: error.message
        });
    }
};

/**
 * Get all meetings for a specific user
 * @route GET /api/meetings/user/meetings
 * @desc Retrieves all meetings where user is either host or participant
 * @access Private (requires authentication)
 */
export const getUserMeetings = async (req, res) => {
    try {
        // Get user ID from authenticated user or query parameters (fallback for testing)
        const userId = req.user?.id || req.query.userId;

        // Find all active meetings where user is either host or participant
        const meetings = await Meeting.find({
            $or: [
                { host: userId },        // User is the meeting host
                { participants: userId } // User is in participants list
            ],
            isActive: true // Only fetch active meetings
        })
        .sort({ startTime: -1 });                 // Sort by start time (newest first)

        // Return user's meetings
        res.status(200).json({
            success: true,
            meetings
        });
    } catch (error) {
        // Handle any errors during meetings retrieval
        console.error('Error fetching user meetings:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch meetings',
            error: error.message
        });
    }
};

/**
 * End a meeting
 * @route PATCH /api/meetings/end/:meetingId
 * @desc Ends an active meeting (only host can end the meeting)
 * @access Private (requires authentication and host privileges)
 */
export const endMeeting = async (req, res) => {
    try {
        // Extract meeting ID from URL parameters
        const { meetingId } = req.params;
        // Get user ID from authenticated user or request body (fallback for testing)
        const userId = req.user?.id || req.body.userId;

        // Find active meeting by ID
        const meeting = await Meeting.findOne({ meetingId, isActive: true });

        // Validate meeting exists and is still active
        if (!meeting) {
            return res.status(404).json({
                success: false,
                message: 'Meeting not found or already ended'
            });
        }

        // Authorization check: Only meeting host can end the meeting
        if (meeting.host.toString() !== userId) {
            return res.status(403).json({
                success: false,
                message: 'Only the host can end the meeting'
            });
        }

        // Update meeting status to inactive
        meeting.isActive = false;
        meeting.endTime = new Date();           // Set actual end time
        meeting.currentParticipants = [];       // Clear all active participants

        // Save changes to database
        await meeting.save();

        // Return success response
        res.status(200).json({
            success: true,
            message: 'Meeting ended successfully'
        });
    } catch (error) {
        // Handle any errors during meeting termination
        console.error('Error ending meeting:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to end meeting',
            error: error.message
        });
    }
};