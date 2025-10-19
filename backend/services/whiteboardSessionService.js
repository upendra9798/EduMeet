import WhiteboardSession from '../models/whiteboardSession.js';
import Whiteboard from '../models/whiteboard.js';

class WhiteboardSessionService {
    
    // Add participant to session
    static async addParticipant(sessionId, userId, socketId, role = 'participant') {
        try {
            let session = await WhiteboardSession.findOne({ sessionId });
            
            if (!session) {
                throw new Error('Session not found');
            }

            // Check if user already exists
            const existingIndex = session.participants.findIndex(
                p => p.userId.toString() === userId.toString()
            );
            
            if (existingIndex !== -1) {
                // Update existing participant
                session.participants[existingIndex].socketId = socketId;
                session.participants[existingIndex].isActive = true;
                session.participants[existingIndex].lastSeen = new Date();
                await session.save();
                return session.participants[existingIndex];
            }
            
            // Add new participant
            const participant = {
                userId,
                socketId,
                role,
                joinedAt: new Date(),
                lastSeen: new Date(),
                isActive: true
            };
            
            session.participants.push(participant);
            
            // Update peak participants
            const activeCount = session.participants.filter(p => p.isActive).length;
            if (activeCount > session.metrics.peakParticipants) {
                session.metrics.peakParticipants = activeCount;
            }
            
            await session.save();
            return participant;
        } catch (error) {
            throw new Error(`Failed to add participant: ${error.message}`);
        }
    }

    // Remove participant from session
    static async removeParticipant(sessionId, socketId) {
        try {
            const session = await WhiteboardSession.findOne({ sessionId });
            if (!session) {
                throw new Error('Session not found');
            }

            const participantIndex = session.participants.findIndex(
                p => p.socketId === socketId
            );
            
            if (participantIndex !== -1) {
                session.participants[participantIndex].isActive = false;
                session.participants[participantIndex].lastSeen = new Date();
                await session.save();
                return session.participants[participantIndex];
            }
            
            return null;
        } catch (error) {
            throw new Error(`Failed to remove participant: ${error.message}`);
        }
    }

    // Update participant cursor position
    static async updateParticipantCursor(sessionId, socketId, cursor) {
        try {
            const session = await WhiteboardSession.findOne({ sessionId });
            if (!session) {
                throw new Error('Session not found');
            }

            const participant = session.participants.find(p => p.socketId === socketId);
            if (participant) {
                participant.cursor = cursor;
                participant.lastSeen = new Date();
                await session.save();
                return participant;
            }
            return null;
        } catch (error) {
            throw new Error(`Failed to update cursor: ${error.message}`);
        }
    }

    // Get participant by socket ID
    static async getParticipantBySocket(sessionId, socketId) {
        try {
            const session = await WhiteboardSession.findOne({ sessionId });
            if (!session) {
                return null;
            }
            return session.participants.find(p => p.socketId === socketId && p.isActive);
        } catch (error) {
            throw new Error(`Failed to get participant by socket: ${error.message}`);
        }
    }

    // Get participant by user ID
    static async getParticipantByUser(sessionId, userId) {
        try {
            const session = await WhiteboardSession.findOne({ sessionId });
            if (!session) {
                return null;
            }
            return session.participants.find(
                p => p.userId.toString() === userId.toString() && p.isActive
            );
        } catch (error) {
            throw new Error(`Failed to get participant by user: ${error.message}`);
        }
    }

    // Increment drawing events counter
    static async incrementDrawingEvents(sessionId) {
        try {
            const session = await WhiteboardSession.findOne({ sessionId });
            if (!session) {
                throw new Error('Session not found');
            }

            session.metrics.totalDrawingEvents += 1;
            session.lastSyncAt = new Date();
            await session.save();
            return session.metrics;
        } catch (error) {
            throw new Error(`Failed to increment drawing events: ${error.message}`);
        }
    }

    // Increment elements created counter
    static async incrementElementsCreated(sessionId) {
        try {
            const session = await WhiteboardSession.findOne({ sessionId });
            if (!session) {
                throw new Error('Session not found');
            }

            session.metrics.totalElementsCreated += 1;
            await session.save();
            return session.metrics;
        } catch (error) {
            throw new Error(`Failed to increment elements created: ${error.message}`);
        }
    }

    // Find active session by whiteboard ID
    static async findByWhiteboard(whiteboardId) {
        try {
            return await WhiteboardSession.findOne({ whiteboardId, isActive: true });
            // Removed .populate() since we're using string userIds in demo mode
        } catch (error) {
            throw new Error(`Failed to find session by whiteboard: ${error.message}`);
        }
    }

    // Create new session
    static async createSession(sessionId, whiteboardId, settings = {}) {
        try {
            const session = new WhiteboardSession({
                sessionId,
                whiteboardId,
                settings: {
                    maxParticipants: settings.maxParticipants || 50,
                    allowAnonymous: settings.allowAnonymous || false,
                    requirePermission: settings.requirePermission || true
                }
            });

            await session.save();
            return session;
        } catch (error) {
            throw new Error(`Failed to create session: ${error.message}`);
        }
    }

    // Update participant tool
    static async updateParticipantTool(sessionId, socketId, tool) {
        try {
            const session = await WhiteboardSession.findOne({ sessionId });
            if (!session) {
                throw new Error('Session not found');
            }

            const participant = session.participants.find(p => p.socketId === socketId);
            if (participant) {
                participant.currentTool = tool;
                participant.lastSeen = new Date();
                await session.save();
                return participant;
            }
            return null;
        } catch (error) {
            throw new Error(`Failed to update participant tool: ${error.message}`);
        }
    }

    // Get session statistics
    static async getSessionStatistics(sessionId) {
        try {
            const session = await WhiteboardSession.findOne({ sessionId });
            // Removed .populate() since we're using string userIds in demo mode
            
            if (!session) {
                throw new Error('Session not found');
            }

            // Calculate session duration
            const sessionDuration = session.updatedAt - session.createdAt;
            
            // Calculate average participation time
            const totalParticipationTime = session.participants.reduce((total, p) => {
                const endTime = p.isActive ? new Date() : p.lastSeen;
                return total + (endTime - p.joinedAt);
            }, 0);
            
            const avgParticipationTime = session.participants.length > 0 ? 
                totalParticipationTime / session.participants.length : 0;

            // Group participants by role
            const participantsByRole = session.participants.reduce((acc, p) => {
                acc[p.role] = (acc[p.role] || 0) + 1;
                return acc;
            }, {});

            return {
                sessionId: session.sessionId,
                whiteboardId: session.whiteboardId,
                sessionMetrics: {
                    totalParticipants: session.participants.length,
                    activeParticipants: session.participants.filter(p => p.isActive).length,
                    peakParticipants: session.metrics.peakParticipants,
                    totalDrawingEvents: session.metrics.totalDrawingEvents,
                    totalElementsCreated: session.metrics.totalElementsCreated,
                    sessionDuration: Math.floor(sessionDuration / 1000), // in seconds
                    averageParticipationTime: Math.floor(avgParticipationTime / 1000), // in seconds
                    isActive: session.isActive,
                    lastSyncAt: session.lastSyncAt,
                    participantsByRole
                },
                participantDetails: session.participants.map(p => ({
                    userId: p.userId,
                    name: p.userId?.name || 'Unknown',
                    email: p.userId?.email || 'Unknown',
                    role: p.role,
                    joinedAt: p.joinedAt,
                    lastSeen: p.lastSeen,
                    participationTime: Math.floor(((p.isActive ? new Date() : p.lastSeen) - p.joinedAt) / 1000),
                    isActive: p.isActive,
                    currentTool: p.currentTool
                }))
            };
        } catch (error) {
            throw new Error(`Failed to get session statistics: ${error.message}`);
        }
    }

    // Cleanup inactive sessions
    static async cleanupInactiveSessions(hoursOld = 24) {
        try {
            const cutoffTime = new Date(Date.now() - hoursOld * 60 * 60 * 1000);
            const result = await WhiteboardSession.updateMany(
                { 
                    lastSyncAt: { $lt: cutoffTime },
                    isActive: true 
                },
                { 
                    isActive: false 
                }
            );
            return result;
        } catch (error) {
            throw new Error(`Failed to cleanup inactive sessions: ${error.message}`);
        }
    }

    // Get all active participants in session
    static async getActiveParticipants(sessionId) {
        try {
            const session = await WhiteboardSession.findOne({ sessionId });
            // Removed .populate() since we're using string userIds in demo mode
            
            if (!session) {
                throw new Error('Session not found');
            }

            return session.participants
                .filter(p => p.isActive)
                .map(p => ({
                    userId: p.userId._id,
                    name: p.userId.name,
                    email: p.userId.email,
                    avatar: p.userId.avatar,
                    role: p.role,
                    joinedAt: p.joinedAt,
                    lastSeen: p.lastSeen,
                    cursor: p.cursor,
                    currentTool: p.currentTool,
                    isActive: p.isActive
                }));
        } catch (error) {
            throw new Error(`Failed to get active participants: ${error.message}`);
        }
    }

    // Update session sync time
    static async updateSyncTime(sessionId) {
        try {
            const session = await WhiteboardSession.findOne({ sessionId });
            if (!session) {
                throw new Error('Session not found');
            }

            session.lastSyncAt = new Date();
            await session.save();
            return session.lastSyncAt;
        } catch (error) {
            throw new Error(`Failed to update sync time: ${error.message}`);
        }
    }

    // Deactivate session
    static async deactivateSession(sessionId) {
        try {
            const session = await WhiteboardSession.findOne({ sessionId });
            if (!session) {
                throw new Error('Session not found');
            }

            session.isActive = false;
            // Mark all participants as inactive
            session.participants.forEach(p => {
                p.isActive = false;
                p.lastSeen = new Date();
            });
            
            await session.save();
            return session;
        } catch (error) {
            throw new Error(`Failed to deactivate session: ${error.message}`);
        }
    }

    // Remove inactive participants from session
    static async removeInactiveParticipants(sessionId, timeoutMinutes = 30) {
        try {
            const session = await WhiteboardSession.findOne({ sessionId });
            if (!session) {
                throw new Error('Session not found');
            }

            const timeoutTime = new Date(Date.now() - timeoutMinutes * 60 * 1000);
            const activeParticipantsBefore = session.participants.filter(p => p.isActive).length;
            
            // Mark inactive participants
            session.participants.forEach(p => {
                if (p.isActive && p.lastSeen < timeoutTime) {
                    p.isActive = false;
                }
            });

            await session.save();

            const activeParticipantsAfter = session.participants.filter(p => p.isActive).length;
            
            return {
                removedCount: activeParticipantsBefore - activeParticipantsAfter,
                activeParticipants: activeParticipantsAfter,
                totalParticipants: session.participants.length
            };
        } catch (error) {
            throw new Error(`Failed to remove inactive participants: ${error.message}`);
        }
    }
}

export default WhiteboardSessionService;