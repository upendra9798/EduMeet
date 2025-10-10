import React, { useState } from 'react';
import { LogIn, Hash } from 'lucide-react';
import MeetingService from '../services/meetingService';

/**
 * JoinMeeting Component
 * Allows users to join existing meetings by Meeting ID
 */
const JoinMeeting = ({ onMeetingJoined }) => {
  const [meetingId, setMeetingId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!meetingId.trim()) {
      setError('Please enter a meeting ID');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // In a real app, get user ID from auth context
      const userId = 'current-user-id'; 
      
      const result = await MeetingService.joinMeeting(meetingId.trim(), userId);
      
      if (result.success) {
        onMeetingJoined?.(result.meeting);
        setMeetingId('');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto bg-white rounded-lg shadow-lg p-6">
      <div className="flex items-center mb-6">
        <LogIn className="w-6 h-6 text-green-500 mr-2" />
        <h2 className="text-2xl font-bold text-gray-800">Join Meeting</h2>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <Hash className="w-4 h-4 inline mr-1" />
            Meeting ID *
          </label>
          <input
            type="text"
            value={meetingId}
            onChange={(e) => setMeetingId(e.target.value)}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
            placeholder="Enter meeting ID (e.g., 123e4567-e89b-12d3-a456-426614174000)"
          />
          <p className="text-sm text-gray-500 mt-1">
            Ask the meeting host for the meeting ID
          </p>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Joining Meeting...' : 'Join Meeting'}
        </button>
      </form>

      <div className="mt-4 p-4 bg-gray-50 rounded-md">
        <h3 className="text-sm font-medium text-gray-700 mb-2">Quick Join Tips:</h3>
        <ul className="text-sm text-gray-600 space-y-1">
          <li>• Make sure your camera and microphone are working</li>
          <li>• Check your internet connection</li>
          <li>• Join a few minutes before the scheduled time</li>
        </ul>
      </div>
    </div>
  );
};

export default JoinMeeting;