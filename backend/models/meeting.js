import mongoose from 'mongoose';

const meetingSchema = new mongoose.Schema({
    meetingId: {
        type: String,
        required: true,
        unique: true,
    },
    title: {
        type: String,
        required: true,
    },
    host: {
        type: String,
        required: true,
    },
    participants: [{
        type: String,
    }],
    startTime: {
        type: Date,
        required: true,
    },
    endTime: {
        type: Date,
    },
    isActive: {
        type: Boolean,
        default: true,
    },
    whiteboardData: {
        type: String, // You can store serialized canvas data or use a separate model
    },
    // Additional fields for meeting room management
    roomType: {
        type: String,
        enum: ['public', 'private'],
        default: 'private'
    },
    maxParticipants: {
        type: Number,
        default: 50
    },
    currentParticipants: [{
        userId: {
            type: String
        },
        socketId: String,
        joinedAt: {
            type: Date,
            default: Date.now
        },
        isHost: {
            type: Boolean,
            default: false
        }
    }],
    meetingSettings: {
        allowVideo: {
            type: Boolean,
            default: true
        },
        allowAudio: {
            type: Boolean,
            default: true
        },
        allowScreenShare: {
            type: Boolean,
            default: true
        },
        allowChat: {
            type: Boolean,
            default: true
        },
        allowWhiteboard: {
            type: Boolean,
            default: true
        }
    }
}, { timestamps: true });

export default mongoose.model('Meeting', meetingSchema);