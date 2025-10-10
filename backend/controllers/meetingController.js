import Meeting from '../models/meeting.js';
import { v4 as uuidv4 } from 'uuid';

export const createMeeting = async (req, res) => {
    try {
        const { title, startTime, endTime, maxParticipants, roomType, meetingSettings } = req.body;
        const hostId = req.user?.id || req.body.hostId; // Assuming auth middleware sets req.user

        // Generate unique meeting ID
        const meetingId = uuidv4();

        const meeting = new Meeting({
            meetingId,
            title,
            host: hostId,
            startTime: startTime || new Date(),
            endTime,
            maxParticipants: maxParticipants || 50,
            roomType: roomType || 'private',
            meetingSettings: meetingSettings || {
                allowVideo: true,
                allowAudio: true,
                allowScreenShare: true,
                allowChat: true,
                allowWhiteboard: true
            }
        });

        await meeting.save();

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
        console.error('Error creating meeting:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create meeting',
            error: error.message
        });
    }
};

export const joinMeeting = async (req, res) => {
    try {
        const { meetingId } = req.params;
        const userId = req.user?.id || req.body.userId;

        const meeting = await Meeting.findOne({ meetingId, isActive: true })
            .populate('host', 'username email')
            .populate('participants', 'username email');

        if (!meeting) {
            return res.status(404).json({
                success: false,
                message: 'Meeting not found or inactive'
            });
        }

        // Check if meeting is at capacity
        if (meeting.currentParticipants.length >= meeting.maxParticipants) {
            return res.status(400).json({
                success: false,
                message: 'Meeting is at full capacity'
            });
        }

        // Check if user is already a participant
        const isAlreadyParticipant = meeting.participants.some(
            participant => participant._id.toString() === userId
        );

        if (!isAlreadyParticipant) {
            meeting.participants.push(userId);
            await meeting.save();
        }

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
        console.error('Error joining meeting:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to join meeting',
            error: error.message
        });
    }
};

export const getMeeting = async (req, res) => {
    try {
        const { meetingId } = req.params;

        const meeting = await Meeting.findOne({ meetingId, isActive: true })
            .populate('host', 'username email')
            .populate('participants', 'username email')
            .populate('currentParticipants.userId', 'username email');

        if (!meeting) {
            return res.status(404).json({
                success: false,
                message: 'Meeting not found or inactive'
            });
        }

        res.status(200).json({
            success: true,
            meeting
        });
    } catch (error) {
        console.error('Error fetching meeting:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch meeting',
            error: error.message
        });
    }
};

export const getUserMeetings = async (req, res) => {
    try {
        const userId = req.user?.id || req.query.userId;

        const meetings = await Meeting.find({
            $or: [
                { host: userId },
                { participants: userId }
            ],
            isActive: true
        })
        .populate('host', 'username email')
        .populate('participants', 'username email')
        .sort({ startTime: -1 });

        res.status(200).json({
            success: true,
            meetings
        });
    } catch (error) {
        console.error('Error fetching user meetings:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch meetings',
            error: error.message
        });
    }
};

export const endMeeting = async (req, res) => {
    try {
        const { meetingId } = req.params;
        const userId = req.user?.id || req.body.userId;

        const meeting = await Meeting.findOne({ meetingId, isActive: true });

        if (!meeting) {
            return res.status(404).json({
                success: false,
                message: 'Meeting not found or already ended'
            });
        }

        // Check if user is the host
        if (meeting.host.toString() !== userId) {
            return res.status(403).json({
                success: false,
                message: 'Only the host can end the meeting'
            });
        }

        meeting.isActive = false;
        meeting.endTime = new Date();
        meeting.currentParticipants = []; // Clear active participants

        await meeting.save();

        res.status(200).json({
            success: true,
            message: 'Meeting ended successfully'
        });
    } catch (error) {
        console.error('Error ending meeting:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to end meeting',
            error: error.message
        });
    }
};