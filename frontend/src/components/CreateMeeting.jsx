import React, { useState } from 'react';
import { Calendar, Clock, Users, Settings, Plus } from 'lucide-react';
import MeetingService from '../services/meetingService';

/**
 * CreateMeeting Component
 * Allows users to create new meetings with customizable settings
 */
const CreateMeeting = ({ onMeetingCreated }) => {
  const [formData, setFormData] = useState({
    title: '',
    startTime: '',
    endTime: '',
    maxParticipants: 50,
    roomType: 'private',
    meetingSettings: {
      allowVideo: true,
      allowAudio: true,
      allowScreenShare: true,
      allowChat: true,
      allowWhiteboard: true
    }
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Handle form input changes
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    if (name.startsWith('meetingSettings.')) {
      const settingKey = name.split('.')[1];
      setFormData(prev => ({
        ...prev,
        meetingSettings: {
          ...prev.meetingSettings,
          [settingKey]: checked
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: type === 'checkbox' ? checked : value
      }));
    }
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Add current user as host (in a real app, get from auth context)
      const meetingData = {
        ...formData,
        hostId: 'current-user-id' // Replace with actual user ID from auth
      };

      const result = await MeetingService.createMeeting(meetingData);
      
      if (result.success) {
        onMeetingCreated?.(result.meeting);
        // Reset form
        setFormData({
          title: '',
          startTime: '',
          endTime: '',
          maxParticipants: 50,
          roomType: 'private',
          meetingSettings: {
            allowVideo: true,
            allowAudio: true,
            allowScreenShare: true,
            allowChat: true,
            allowWhiteboard: true
          }
        });
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
        <Plus className="w-6 h-6 text-blue-500 mr-2" />
        <h2 className="text-2xl font-bold text-gray-800">Create Meeting</h2>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Meeting Title */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Meeting Title *
          </label>
          <input
            type="text"
            name="title"
            value={formData.title}
            onChange={handleChange}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Enter meeting title"
          />
        </div>

        {/* Start Time */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <Calendar className="w-4 h-4 inline mr-1" />
            Start Time
          </label>
          <input
            type="datetime-local"
            name="startTime"
            value={formData.startTime}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* End Time */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <Clock className="w-4 h-4 inline mr-1" />
            End Time (Optional)
          </label>
          <input
            type="datetime-local"
            name="endTime"
            value={formData.endTime}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Max Participants */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <Users className="w-4 h-4 inline mr-1" />
            Max Participants
          </label>
          <input
            type="number"
            name="maxParticipants"
            value={formData.maxParticipants}
            onChange={handleChange}
            min="2"
            max="100"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Room Type */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Room Type
          </label>
          <select
            name="roomType"
            value={formData.roomType}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="private">Private</option>
            <option value="public">Public</option>
          </select>
        </div>

        {/* Meeting Settings */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            <Settings className="w-4 h-4 inline mr-1" />
            Meeting Settings
          </label>
          <div className="space-y-2">
            {Object.entries(formData.meetingSettings).map(([key, value]) => (
              <label key={key} className="flex items-center">
                <input
                  type="checkbox"
                  name={`meetingSettings.${key}`}
                  checked={value}
                  onChange={handleChange}
                  className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <span className="text-sm text-gray-700 capitalize">
                  {key.replace(/([A-Z])/g, ' $1').toLowerCase()}
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Creating Meeting...' : 'Create Meeting'}
        </button>
      </form>
    </div>
  );
};

export default CreateMeeting;