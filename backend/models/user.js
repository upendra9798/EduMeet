import mongoose from 'mongoose';
import bcryptjs from 'bcryptjs';

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true
    },
    password: {
        type: String,
        required: true,
        minlength: 6
    },
    avatar: {
        type: String,
        default: ''
    },
    role: {
        type: String,
        enum: ['user', 'admin', 'host'],
        default: 'user'
    },
    isEmailVerified: {
        type: Boolean,
        default: false
    },
    profile: {
        bio: String,
        organization: String,
        title: String,
        location: String
    },
    preferences: {
        theme: {
            type: String,
            enum: ['light', 'dark'],
            default: 'light'
        },
        notifications: {
            email: {
                type: Boolean,
                default: true
            },
            meetingReminders: {
                type: Boolean,
                default: true
            }
        }
    },
    lastActive: {
        type: Date,
        default: Date.now
    }
}, { 
    timestamps: true 
});

// Index for better query performance  
userSchema.index({ role: 1 });

// Hash password before saving
userSchema.pre('save', async function(next) {
    if (!this.isModified('password')) return next();
    
    try {
        const salt = await bcryptjs.genSalt(10);
        this.password = await bcryptjs.hash(this.password, salt);
        next();
    } catch (error) {
        next(error);
    }
});

// Compare password method
userSchema.methods.matchPassword = async function(enteredPassword) {
    return await bcryptjs.compare(enteredPassword, this.password);
};

// Virtual for full name display
userSchema.virtual('displayName').get(function() {
    return this.name || this.email.split('@')[0];
});

// Method to update last active
userSchema.methods.updateLastActive = function() {
    this.lastActive = new Date();
    return this.save();
};

export default mongoose.model('User', userSchema);