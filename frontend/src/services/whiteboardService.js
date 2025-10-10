import api from '../utils/api';

/**
 * Whiteboard API Service
 * Handles all whiteboard-related API calls to the backend
 */
class WhiteboardService {
  /**
   * Create a new whiteboard for a meeting
   * @param {Object} whiteboardData - Whiteboard creation data
   * @returns {Promise<Object>} Created whiteboard details
   */
  async createWhiteboard(whiteboardData) {
    try {
      const response = await api.post('/whiteboard/create', whiteboardData);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to create whiteboard');
    }
  }

  /**
   * Get whiteboard by meeting ID
   * @param {string} meetingId - ID of the meeting
   * @returns {Promise<Object>} Whiteboard details
   */
  async getWhiteboardByMeeting(meetingId) {
    try {
      const response = await api.get(`/whiteboard/meeting/${meetingId}`);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to get whiteboard');
    }
  }

  /**
   * Add a drawing element to the whiteboard
   * @param {string} whiteboardId - ID of the whiteboard
   * @param {Object} elementData - Drawing element data
   * @returns {Promise<Object>} Added element details
   */
  async addElement(whiteboardId, elementData) {
    try {
      const response = await api.post(`/whiteboard/${whiteboardId}/element`, elementData);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to add element');
    }
  }

  /**
   * Clear the whiteboard
   * @param {string} whiteboardId - ID of the whiteboard
   * @param {string} userId - ID of the user
   * @returns {Promise<Object>} Clear status
   */
  async clearWhiteboard(whiteboardId, userId) {
    try {
      const response = await api.delete(`/whiteboard/${whiteboardId}/clear`, {
        data: { userId }
      });
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to clear whiteboard');
    }
  }

  /**
   * Update whiteboard permissions
   * @param {string} whiteboardId - ID of the whiteboard
   * @param {Object} permissionsData - Permissions data
   * @returns {Promise<Object>} Updated permissions
   */
  async updatePermissions(whiteboardId, permissionsData) {
    try {
      const response = await api.patch(`/whiteboard/${whiteboardId}/permissions`, permissionsData);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to update permissions');
    }
  }

  /**
   * Save whiteboard snapshot
   * @param {string} whiteboardId - ID of the whiteboard
   * @param {Object} snapshotData - Snapshot data
   * @returns {Promise<Object>} Saved snapshot details
   */
  async saveSnapshot(whiteboardId, snapshotData) {
    try {
      const response = await api.post(`/whiteboard/${whiteboardId}/snapshot`, snapshotData);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to save snapshot');
    }
  }

  /**
   * Get whiteboard snapshots
   * @param {string} whiteboardId - ID of the whiteboard
   * @returns {Promise<Array>} List of snapshots
   */
  async getSnapshots(whiteboardId) {
    try {
      const response = await api.get(`/whiteboard/${whiteboardId}/snapshots`);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to get snapshots');
    }
  }

  /**
   * Export whiteboard
   * @param {string} whiteboardId - ID of the whiteboard
   * @param {string} format - Export format (png, pdf, etc.)
   * @returns {Promise<Blob>} Exported file data
   */
  async exportWhiteboard(whiteboardId, format = 'png') {
    try {
      const response = await api.get(`/whiteboard/${whiteboardId}/export?format=${format}`, {
        responseType: 'blob'
      });
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to export whiteboard');
    }
  }
}

export default new WhiteboardService();