import mongoose from 'mongoose';

// Schema for whiteboard session management
const whiteboardSessionSchema = new mongoose.Schema({
    // Session identifier
    sessionId: {
        type: String,
        required: true,
        unique: true
    },
    
    // Associated whiteboard
    whiteboardId: {
        type: String,
        required: true,
        ref: 'Whiteboard'
    },
    
    // Session participants
    participants: [{
        userId: {
            type: String, // Changed from ObjectId to String for demo mode
            required: true
        },
        socketId: {
            type: String,
            required: true
        },
        role: {
            type: String,
            enum: ['host', 'admin', 'participant'],
            default: 'participant'
        },
        joinedAt: {
            type: Date,
            default: Date.now
        },
        lastSeen: {
            type: Date,
            default: Date.now
        },
        isActive: {
            type: Boolean,
            default: true
        },
        cursor: {
            x: { type: Number, default: 0 },
            y: { type: Number, default: 0 }
        },
        currentTool: {
            type: String,
            default: 'pen'
        }
    }],
    
    // Session status
    isActive: {
        type: Boolean,
        default: true
    },
    
    // Session settings
    settings: {
        maxParticipants: {
            type: Number,
            default: 50
        },
        allowAnonymous: {
            type: Boolean,
            default: false
        },
        requirePermission: {
            type: Boolean,
            default: true
        }
    },
    
    // Real-time sync data
    lastSyncAt: {
        type: Date,
        default: Date.now
    },
    
    // Session metrics
    metrics: {
        totalDrawingEvents: {
            type: Number,
            default: 0
        },
        totalElementsCreated: {
            type: Number,
            default: 0
        },
        peakParticipants: {
            type: Number,
            default: 0
        }
    }
    
}, { 
    timestamps: true
});

// Indexes for better performance
whiteboardSessionSchema.index({ whiteboardId: 1 });
whiteboardSessionSchema.index({ 'participants.userId': 1 });
whiteboardSessionSchema.index({ 'participants.socketId': 1 });
whiteboardSessionSchema.index({ isActive: 1 });

// Virtual for active participant count
whiteboardSessionSchema.virtual('activeParticipantCount').get(function() {
    return this.participants.filter(p => p.isActive).length;
});

export default mongoose.model('WhiteboardSession', whiteboardSessionSchema);