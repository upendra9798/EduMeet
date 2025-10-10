import mongoose from 'mongoose';

// Schema for individual drawing strokes/elements
const drawingElementSchema = new mongoose.Schema({
    type: {
        type: String,
        enum: ['stroke', 'eraser', 'text', 'shape'],
        required: true
    },
    tool: {
        type: String,
        enum: ['pen', 'eraser', 'highlighter', 'text', 'rectangle', 'circle', 'line'],
        required: true
    },
    color: {
        type: String,
        default: '#000000'
    },
    brushSize: {
        type: Number,
        default: 2,
        min: 1,
        max: 50
    },
    opacity: {
        type: Number,
        default: 1,
        min: 0,
        max: 1
    },
    points: [{
        x: { type: Number, required: true },
        y: { type: Number, required: true },
        timestamp: { type: Date, default: Date.now }
    }],
    // For text elements
    text: {
        type: String
    },
    fontSize: {
        type: Number,
        default: 16
    },
    fontFamily: {
        type: String,
        default: 'Arial'
    },
    // For shapes
    startPoint: {
        x: Number,
        y: Number
    },
    endPoint: {
        x: Number,
        y: Number
    },
    // Metadata
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Main whiteboard schema
const whiteboardSchema = new mongoose.Schema({
    // Unique identifier for the whiteboard
    whiteboardId: {
        type: String,
        required: true,
        unique: true
    },
    
    // Associated meeting
    meetingId: {
        type: String,
        required: true,
        index: true
    },
    
    // Meeting reference
    meeting: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Meeting',
        required: true
    },
    
    // Whiteboard title/name
    title: {
        type: String,
        default: 'Meeting Whiteboard'
    },
    
    // Canvas dimensions
    canvasWidth: {
        type: Number,
        default: 1920
    },
    canvasHeight: {
        type: Number,
        default: 1080
    },
    
    // Background settings
    backgroundColor: {
        type: String,
        default: '#ffffff'
    },
    backgroundImage: {
        type: String, // URL or base64 for background image
        default: null
    },
    
    // All drawing elements on the whiteboard
    elements: [drawingElementSchema],
    
    // Canvas state snapshots for undo/redo (stored as base64 images)
    snapshots: [{
        imageData: {
            type: String,
            required: true
        },
        timestamp: {
            type: Date,
            default: Date.now
        },
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        }
    }],
    
    // Current active users on the whiteboard
    activeUsers: [{
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        cursor: {
            x: Number,
            y: Number
        },
        isDrawing: {
            type: Boolean,
            default: false
        },
        lastActive: {
            type: Date,
            default: Date.now
        }
    }],
    
    // Whiteboard permissions
    permissions: {
        // Who can draw on the whiteboard
        allowedDrawers: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        }],
        // Public drawing access
        publicDrawing: {
            type: Boolean,
            default: false
        },
        // Only meeting host can modify permissions
        restrictToHost: {
            type: Boolean,
            default: true
        }
    },
    
    // Whiteboard settings
    settings: {
        // Grid settings
        showGrid: {
            type: Boolean,
            default: false
        },
        gridSize: {
            type: Number,
            default: 20
        },
        gridColor: {
            type: String,
            default: '#e0e0e0'
        },
        
        // Zoom and pan
        zoomLevel: {
            type: Number,
            default: 1,
            min: 0.1,
            max: 5
        },
        panX: {
            type: Number,
            default: 0
        },
        panY: {
            type: Number,
            default: 0
        },
        
        // Tool settings
        defaultTool: {
            type: String,
            enum: ['pen', 'eraser', 'highlighter', 'text', 'rectangle', 'circle', 'line'],
            default: 'pen'
        },
        defaultColor: {
            type: String,
            default: '#000000'
        },
        defaultBrushSize: {
            type: Number,
            default: 2
        }
    },
    
    // Version control for collaborative editing
    version: {
        type: Number,
        default: 1
    },
    
    // Last modification info
    lastModified: {
        timestamp: {
            type: Date,
            default: Date.now
        },
        modifiedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        }
    },
    
    // Whiteboard status
    isActive: {
        type: Boolean,
        default: true
    },
    
    // Export/Save options
    exports: [{
        format: {
            type: String,
            enum: ['png', 'jpg', 'pdf', 'svg'],
            required: true
        },
        url: {
            type: String,
            required: true
        },
        createdAt: {
            type: Date,
            default: Date.now
        },
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        }
    }],
    
    // Collaboration history
    collaborationHistory: [{
        action: {
            type: String,
            enum: ['create', 'draw', 'erase', 'clear', 'undo', 'redo', 'export', 'share'],
            required: true
        },
        details: {
            type: String
        },
        performedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
        timestamp: {
            type: Date,
            default: Date.now
        }
    }]
    
}, { 
    timestamps: true
});

// Indexes for better performance
//Indexes tell MongoDB to create special data structures for quick lookup.
whiteboardSchema.index({ meetingId: 1, isActive: 1 });
whiteboardSchema.index({ 'meeting': 1 });
whiteboardSchema.index({ 'elements.createdBy': 1 });
whiteboardSchema.index({ 'activeUsers.userId': 1 });

// Virtual for element count
whiteboardSchema.virtual('elementCount').get(function() {
    return this.elements ? this.elements.length : 0;
});

// Virtual for active user count
whiteboardSchema.virtual('activeUserCount').get(function() {
    return this.activeUsers ? this.activeUsers.length : 0;
});

// Pre-save middleware for cleanup
whiteboardSchema.pre('save', function(next) {
    // Clean up old collaboration history (keep only last 100 entries)
    if (this.collaborationHistory && this.collaborationHistory.length > 100) {
        this.collaborationHistory = this.collaborationHistory
            .sort((a, b) => b.timestamp - a.timestamp)
            .slice(0, 100);
    }
    next();
 /*   This code runs automatically before each .save() on the whiteboard document.
It:
Checks if there’s a collaborationHistory array.
If it has more than 100 entries:
Sorts by most recent (b.timestamp - a.timestamp)
Keeps only the latest 100 records
Removes old ones (to save database space and keep performance high)
So your history doesn’t grow endlessly and slow down queries.*/
});

export default mongoose.model('Whiteboard', whiteboardSchema);
