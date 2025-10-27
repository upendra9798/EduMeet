import Whiteboard from '../models/whiteboard.js';
import Meeting from '../models/meeting.js';

class WhiteboardService {
    
    // Add a drawing element to whiteboard
    static async addElement(whiteboardId, elementData, userId) {
        try {
            const whiteboard = await Whiteboard.findOne({ whiteboardId, isActive: true });
            if (!whiteboard) {
                throw new Error('Whiteboard not found');
            }

            const element = {
                ...elementData,
                createdBy: userId,
                createdAt: new Date()
            };
            
            whiteboard.elements.push(element);
            whiteboard.lastModified = {
                timestamp: new Date(),
                modifiedBy: userId
            };
            whiteboard.version += 1;
            
            await whiteboard.save();
            return element;
        } catch (error) {
            throw new Error(`Failed to add element: ${error.message}`);
        }
    }

    // Clear the whiteboard
    static async clearBoard(whiteboardId, userId) {
        try {
            const whiteboard = await Whiteboard.findOne({ whiteboardId, isActive: true });
            if (!whiteboard) {
                throw new Error('Whiteboard not found');
            }

            whiteboard.elements = [];
            whiteboard.snapshots = [];
            whiteboard.lastModified = {
                timestamp: new Date(),
                modifiedBy: userId
            };
            whiteboard.version += 1;
            
            // Add to collaboration history
            whiteboard.collaborationHistory.push({
                action: 'clear',
                performedBy: userId,
                timestamp: new Date()
            });

            await whiteboard.save();
            return whiteboard;
        } catch (error) {
            throw new Error(`Failed to clear whiteboard: ${error.message}`);
        }
    }

    // Add a snapshot
    static async addSnapshot(whiteboardId, imageData, userId) {
        try {
            const whiteboard = await Whiteboard.findOne({ whiteboardId, isActive: true });
            if (!whiteboard) {
                throw new Error('Whiteboard not found');
            }

            // Keep only last 20 snapshots to manage storage
            if (whiteboard.snapshots.length >= 20) {
                whiteboard.snapshots.shift();
            }
            
            whiteboard.snapshots.push({
                imageData,
                createdBy: userId,
                timestamp: new Date()
            });

            await whiteboard.save();
            return whiteboard.snapshots[whiteboard.snapshots.length - 1];
        } catch (error) {
            throw new Error(`Failed to add snapshot: ${error.message}`);
        }
    }

    // Update active user cursor
    static async updateActiveUser(whiteboardId, userId, cursorData) {
        try {
            const whiteboard = await Whiteboard.findOne({ whiteboardId, isActive: true });
            if (!whiteboard) {
                throw new Error('Whiteboard not found');
            }

            const existingUserIndex = whiteboard.activeUsers.findIndex(
                user => user.userId.toString() === userId.toString()
            );
            
            if (existingUserIndex !== -1) {
                whiteboard.activeUsers[existingUserIndex].cursor = cursorData;
                whiteboard.activeUsers[existingUserIndex].lastActive = new Date();
            } else {
                whiteboard.activeUsers.push({
                    userId,
                    cursor: cursorData,
                    lastActive: new Date()
                });
            }

            await whiteboard.save();
            return whiteboard.activeUsers[existingUserIndex !== -1 ? existingUserIndex : whiteboard.activeUsers.length - 1];
        } catch (error) {
            throw new Error(`Failed to update active user: ${error.message}`);
        }
    }

    // Remove inactive users
    static async removeInactiveUsers(whiteboardId, timeoutMinutes = 5) {
        try {
            const whiteboard = await Whiteboard.findOne({ whiteboardId, isActive: true });
            if (!whiteboard) {
                throw new Error('Whiteboard not found');
            }

            const timeoutTime = new Date(Date.now() - timeoutMinutes * 60 * 1000);
            const activeUsersBefore = whiteboard.activeUsers.length;
            
            whiteboard.activeUsers = whiteboard.activeUsers.filter(
                user => user.lastActive > timeoutTime
            );

            if (activeUsersBefore !== whiteboard.activeUsers.length) {
                await whiteboard.save();
            }

            return {
                removedCount: activeUsersBefore - whiteboard.activeUsers.length,
                activeUsers: whiteboard.activeUsers
            };
        } catch (error) {
            throw new Error(`Failed to remove inactive users: ${error.message}`);
        }
    }

    // Find whiteboard by meeting ID with populated fields
    static async findByMeeting(meetingId) {
        try {
            return await Whiteboard.findOne({ meetingId, isActive: true })
                .populate('meeting');
                // Removed user populates since we're using string userIds in demo mode
        } catch (error) {
            throw new Error(`Failed to find whiteboard by meeting: ${error.message}`);
        }
    }

    // Update whiteboard permissions
    static async updatePermissions(whiteboardId, userId, permissionData) {
        try {
            const whiteboard = await Whiteboard.findOne({ whiteboardId, isActive: true });
            if (!whiteboard) {
                throw new Error('Whiteboard not found');
            }

            // Check if user is meeting host
            const meeting = await Meeting.findById(whiteboard.meeting);
            if (meeting.host.toString() !== userId) {
                throw new Error('Only meeting host can update permissions');
            }

            // Update permissions
            if (permissionData.allowedDrawers !== undefined) {
                whiteboard.permissions.allowedDrawers = permissionData.allowedDrawers;
            }
            if (permissionData.publicDrawing !== undefined) {
                whiteboard.permissions.publicDrawing = permissionData.publicDrawing;
            }
            if (permissionData.restrictToHost !== undefined) {
                whiteboard.permissions.restrictToHost = permissionData.restrictToHost;
            }

            whiteboard.lastModified = {
                timestamp: new Date(),
                modifiedBy: userId
            };

            // Add to collaboration history
            whiteboard.collaborationHistory.push({
                action: 'permissions_updated',
                details: `Permissions updated`,
                performedBy: userId,
                timestamp: new Date()
            });

            await whiteboard.save();
            return whiteboard.permissions;
        } catch (error) {
            throw new Error(`Failed to update permissions: ${error.message}`);
        }
    }

    // Add export record
    static async addExport(whiteboardId, userId, exportData) {
        try {
            const whiteboard = await Whiteboard.findOne({ whiteboardId, isActive: true });
            if (!whiteboard) {
                throw new Error('Whiteboard not found');
            }

            whiteboard.exports.push({
                format: exportData.format,
                url: exportData.url,
                createdBy: userId,
                createdAt: new Date()
            });

            // Add to collaboration history
            whiteboard.collaborationHistory.push({
                action: 'export',
                details: `Exported as ${exportData.format}`,
                performedBy: userId,
                timestamp: new Date()
            });

            await whiteboard.save();
            return whiteboard.exports[whiteboard.exports.length - 1];
        } catch (error) {
            throw new Error(`Failed to add export: ${error.message}`);
        }
    }

    // Check user permissions for drawing
    static async checkDrawingPermission(whiteboardId, userId) {
        try {
            const whiteboard = await Whiteboard.findOne({ whiteboardId, isActive: true });
            if (!whiteboard) {
                return { canDraw: false, reason: 'Whiteboard not found' };
            }

            const meeting = await Meeting.findById(whiteboard.meeting);
            if (!meeting) {
                return { canDraw: false, reason: 'Meeting not found' };
            }

            // Check if user is meeting host
            if (meeting.host.toString() === userId) {
                return { canDraw: true, role: 'host' };
            }

            // Check if restricted to host only
            if (whiteboard.permissions.restrictToHost) {
                return { canDraw: false, reason: 'Drawing restricted to meeting host' };
            }

            // Only host can draw - override other permission checks
            return { canDraw: false, reason: 'Only meeting host can draw on this whiteboard' };
        } catch (error) {
            throw new Error(`Failed to check drawing permission: ${error.message}`);
        }
    }

    // Get whiteboard statistics
    static async getStatistics(whiteboardId) {
        try {
            const whiteboard = await Whiteboard.findOne({ whiteboardId, isActive: true });
            // Removed .populate() since we're using string userIds in demo mode
            
            if (!whiteboard) {
                throw new Error('Whiteboard not found');
            }

            // Calculate statistics
            const stats = {
                totalElements: whiteboard.elements.length,
                totalSnapshots: whiteboard.snapshots.length,
                totalCollaborationEvents: whiteboard.collaborationHistory.length,
                activeUsers: whiteboard.activeUsers.length,
                version: whiteboard.version,
                createdAt: whiteboard.createdAt,
                lastModified: whiteboard.lastModified,
                elementsByType: {},
                elementsByUser: {},
                activityByAction: {}
            };

            // Group elements by type
            whiteboard.elements.forEach(element => {
                stats.elementsByType[element.type] = (stats.elementsByType[element.type] || 0) + 1;
            });

            // Group elements by user
            whiteboard.elements.forEach(element => {
                const userName = element.createdBy?.name || 'Unknown';
                stats.elementsByUser[userName] = (stats.elementsByUser[userName] || 0) + 1;
            });

            // Group collaboration history by action
            whiteboard.collaborationHistory.forEach(event => {
                stats.activityByAction[event.action] = (stats.activityByAction[event.action] || 0) + 1;
            });

            return stats;
        } catch (error) {
            throw new Error(`Failed to get statistics: ${error.message}`);
        }
    }

    // Cleanup old data
    static async cleanupOldData(whiteboardId, options = {}) {
        try {
            const {
                maxSnapshots = 20,
                maxCollaborationHistory = 100,
                inactiveUserTimeoutMinutes = 30
            } = options;

            const whiteboard = await Whiteboard.findOne({ whiteboardId, isActive: true });
            if (!whiteboard) {
                throw new Error('Whiteboard not found');
            }

            let cleaned = false;

            // Clean up old snapshots
            if (whiteboard.snapshots.length > maxSnapshots) {
                whiteboard.snapshots = whiteboard.snapshots
                    .sort((a, b) => b.timestamp - a.timestamp)
                    .slice(0, maxSnapshots);
                cleaned = true;
            }

            // Clean up old collaboration history
            if (whiteboard.collaborationHistory.length > maxCollaborationHistory) {
                whiteboard.collaborationHistory = whiteboard.collaborationHistory
                    .sort((a, b) => b.timestamp - a.timestamp)
                    .slice(0, maxCollaborationHistory);
                cleaned = true;
            }

            // Remove inactive users
            const timeoutTime = new Date(Date.now() - inactiveUserTimeoutMinutes * 60 * 1000);
            const activeUsersBefore = whiteboard.activeUsers.length;
            whiteboard.activeUsers = whiteboard.activeUsers.filter(
                user => user.lastActive > timeoutTime
            );
            
            if (activeUsersBefore !== whiteboard.activeUsers.length) {
                cleaned = true;
            }

            if (cleaned) {
                await whiteboard.save();
            }

            return {
                cleaned,
                snapshotsRemoved: Math.max(0, whiteboard.snapshots.length - maxSnapshots),
                historyEventsRemoved: Math.max(0, whiteboard.collaborationHistory.length - maxCollaborationHistory),
                inactiveUsersRemoved: activeUsersBefore - whiteboard.activeUsers.length
            };
        } catch (error) {
            throw new Error(`Failed to cleanup old data: ${error.message}`);
        }
    }
}

export default WhiteboardService;