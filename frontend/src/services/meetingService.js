import api from '../utils/api';

/**
 * Meeting API Service
 * Handles all meeting-related API calls to the backend
 */
class MeetingService {
  /**
   * Helper method to retry failed requests
   * @param {Function} requestFn - The request function to retry
   * @param {number} maxRetries - Maximum number of retries
   * @returns {Promise} Request result
   */
  async _makeRequestWithRetry(requestFn, maxRetries = 3) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await requestFn();
      } catch (error) {
        console.log(`Request attempt ${attempt} failed:`, error.message);
        
        if (attempt === maxRetries) {
          throw error;
        }
        
        // Wait before retrying (exponential backoff)
        const waitTime = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
        console.log(`Retrying in ${waitTime}ms...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
  }
  /**
   * Create a new meeting
   * @param {Object} meetingData - Meeting creation data
   * @returns {Promise<Object>} Created meeting details
   */
  async createMeeting(meetingData) {
    try {
      console.log('MeetingService: Sending API request with data:', meetingData);
      console.log('MeetingService: Using API base URL:', api.defaults.baseURL);
      
      const response = await this._makeRequestWithRetry(() => 
        api.post('/meetings/create', meetingData, {
          timeout: 30000, // 30 second timeout for mobile
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          }
        })
      );
      
      console.log('MeetingService: Received API response:', response);
      console.log('MeetingService: Response status:', response.status);
      console.log('MeetingService: Response data:', response.data);
      return response.data;
    } catch (error) {
      console.error('MeetingService: API error:', error);
      console.error('MeetingService: Error response status:', error.response?.status);
      console.error('MeetingService: Error response data:', error.response?.data);
      console.error('MeetingService: Error message:', error.message);
      
      // More specific error handling for mobile issues
      if (error.code === 'NETWORK_ERROR' || error.code === 'ECONNABORTED') {
        throw new Error('Network connection issue. Please check your internet connection and try again.');
      }
      
      if (error.response?.status === 0) {
        throw new Error('Cannot connect to server. Please check if the server is running and accessible.');
      }
      
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
      console.log('MeetingService: Joining meeting:', meetingId, 'with user:', userId);
      
      const response = await this._makeRequestWithRetry(() =>
        api.post(`/meetings/join/${meetingId}`, { userId }, {
          timeout: 30000,
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          }
        })
      );
      
      console.log('MeetingService: Join meeting response:', response.data);
      return response.data;
    } catch (error) {
      console.error('MeetingService: Join meeting error:', error);
      
      if (error.code === 'NETWORK_ERROR' || error.code === 'ECONNABORTED') {
        throw new Error('Network connection issue. Please check your internet connection and try again.');
      }
      
      if (error.response?.status === 0) {
        throw new Error('Cannot connect to server. Please check if the server is running and accessible.');
      }
      
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
      console.log('MeetingService: getMeeting called with meetingId:', meetingId);
      
      const response = await this._makeRequestWithRetry(() =>
        api.get(`/meetings/${meetingId}`, {
          timeout: 30000,
          headers: {
            'Accept': 'application/json'
          }
        })
      );
      
      console.log('MeetingService: getMeeting response status:', response.status);
      console.log('MeetingService: getMeeting response data:', response.data);
      return response.data;
    } catch (error) {
      console.error('MeetingService: getMeeting error:', error);
      console.error('MeetingService: Error response status:', error.response?.status);
      console.error('MeetingService: Error response data:', error.response?.data);
      console.error('MeetingService: Error message:', error.message);
      
      if (error.code === 'NETWORK_ERROR' || error.code === 'ECONNABORTED') {
        throw new Error('Network connection issue. Please check your internet connection and try again.');
      }
      
      if (error.response?.status === 0) {
        throw new Error('Cannot connect to server. Please check if the server is running and accessible.');
      }
      
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