import api from '../utils/api';

/**
 * Meeting API Service
 * Handles all meeting-related API calls to the backend
 */
class MeetingService {
  /**
   * Create a new meeting
   * @param {Object} meetingData - Meeting creation data
   * @returns {Promise<Object>} Created meeting details
   */
  async createMeeting(meetingData) {
    try {
      const response = await api.post('/meetings/create', meetingData);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to create meeting');
    }
  }

  /**
   * Join an existing meeting
   * @param {string} meetingId - ID of the meeting to join
   * @param {string} userId - ID of the user joining
   * @returns {Promise<Object>} Meeting details and join status
   */
  async joinMeeting(meetingId, userId) {
    try {
      const response = await api.post(`/meetings/join/${meetingId}`, { userId });
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to join meeting');
    }
  }

  /**
   * Get meeting details
   * @param {string} meetingId - ID of the meeting to retrieve
   * @returns {Promise<Object>} Meeting details
   */
  async getMeeting(meetingId) {
    try {
      const response = await api.get(`/meetings/${meetingId}`);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to get meeting details');
    }
  }

  /**
   * Get all meetings for the current user
   * @param {string} userId - ID of the user
   * @returns {Promise<Array>} List of user's meetings
   */
  async getUserMeetings(userId) {
    try {
      const response = await api.get(`/meetings/user/meetings?userId=${userId}`);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to get user meetings');
    }
  }

  /**
   * End a meeting (host only)
   * @param {string} meetingId - ID of the meeting to end
   * @param {string} userId - ID of the user (must be host)
   * @returns {Promise<Object>} End meeting status
   */
  async endMeeting(meetingId, userId) {
    try {
      const response = await api.patch(`/meetings/end/${meetingId}`, { userId });
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to end meeting');
    }
  }
}

export default new MeetingService();