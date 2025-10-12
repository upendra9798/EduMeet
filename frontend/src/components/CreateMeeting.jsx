import React, { useState } from 'react';
import { Calendar, Clock, Users, Settings, Plus, User } from 'lucide-react';
import MeetingService from '../services/meetingService';

/**
 * CreateMeeting Component
 * Allows users to create new meetings with customizable settings
 */
const CreateMeeting = ({ onMeetingCreated, user }) => {
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
  
  const [displayName, setDisplayName] = useState(user?.username || '');
  
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
      // Add current user as host
      const meetingData = {
        ...formData,
        hostId: user.id
      };

      const result = await MeetingService.createMeeting(meetingData);
      
      if (result.success) {
        onMeetingCreated?.(result.meeting, displayName.trim());
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
    <div className="max-w-md mx-auto">
      {error && (
        <div className="bg-red-500/20 border border-red-400/50 rounded-2xl p-4 backdrop-blur-lg mb-6">
          <div className="text-red-100 font-medium">{error}</div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4 pb-4">
        {/* Host Display Name */}
        <div>
          <label className="block text-sm font-medium text-white/90 mb-2">
            <User className="w-4 h-4 inline mr-1 text-blue-400" />
            Your Display Name *
          </label>
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            required
            className="w-full px-3 py-2 bg-white/10 backdrop-blur-lg border border-white/20 rounded-lg shadow-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition-all duration-200"
            placeholder="Enter your name for this meeting..."
          />
        </div>

        {/* Meeting Title */}
        <div>
          <label className="block text-sm font-medium text-white/90 mb-2">
            ✨ Meeting Title *
          </label>
          <input
            type="text"
            name="title"
            value={formData.title}
            onChange={handleChange}
            required
            className="w-full px-3 py-2 bg-white/10 backdrop-blur-lg border border-white/20 rounded-lg shadow-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400 transition-all duration-200"
            placeholder="Enter meeting title..."
          />
        </div>

        {/* Date and Time Row */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-white/90 mb-1">
              <Calendar className="w-3 h-3 inline mr-1 text-green-400" />
              Start Time
            </label>
            <input
              type="datetime-local"
              name="startTime"
              value={formData.startTime}
              onChange={handleChange}
              className="w-full px-3 py-2 bg-white/10 backdrop-blur-lg border border-white/20 rounded-lg shadow-lg text-white focus:outline-none focus:ring-1 focus:ring-green-400 focus:border-green-400 transition-all duration-200"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-white/90 mb-1">
              <Clock className="w-3 h-3 inline mr-1 text-purple-400" />
              End Time
            </label>
            <input
              type="datetime-local"
              name="endTime"
              value={formData.endTime}
              onChange={handleChange}
              className="w-full px-3 py-2 bg-white/10 backdrop-blur-lg border border-white/20 rounded-lg shadow-lg text-white focus:outline-none focus:ring-1 focus:ring-purple-400 focus:border-purple-400 transition-all duration-200"
            />
          </div>
        </div>

        {/* Max Participants and Room Type Row */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-white/90 mb-1">
              <Users className="w-3 h-3 inline mr-1 text-blue-400" />
              Max Participants
            </label>
            <input
              type="number"
              name="maxParticipants"
              value={formData.maxParticipants}
              onChange={handleChange}
              min="2"
              max="100"
              className="w-full px-3 py-2 bg-white/10 backdrop-blur-lg border border-white/20 rounded-lg shadow-lg text-white focus:outline-none focus:ring-1 focus:ring-blue-400 focus:border-blue-400 transition-all duration-200"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-white/90 mb-1">
              🔒 Room Type
            </label>
            <select
              name="roomType"
              value={formData.roomType}
              onChange={handleChange}
              className="w-full px-3 py-2 bg-white/10 backdrop-blur-lg border border-white/20 rounded-lg shadow-lg text-white focus:outline-none focus:ring-1 focus:ring-yellow-400 focus:border-yellow-400 transition-all duration-200"
            >
              <option value="private" className="bg-gray-800 text-white">� Private</option>
              <option value="public" className="bg-gray-800 text-white">� Public</option>
            </select>
          </div>
        </div>

        {/* Meeting Settings */}
        <div>
          <label className="block text-xs font-medium text-white/90 mb-2">
            <Settings className="w-3 h-3 inline mr-1 text-orange-400" />
            Meeting Features
          </label>
          <div className="grid grid-cols-2 gap-1">
            {Object.entries(formData.meetingSettings).map(([key, value]) => (
              <label key={key} className="flex items-center p-1.5 bg-white/5 rounded border border-white/10 hover:bg-white/10 transition-all cursor-pointer">
                <input
                  type="checkbox"
                  name={`meetingSettings.${key}`}
                  checked={value}
                  onChange={handleChange}
                  className="mr-1.5 h-3 w-3 text-cyan-400 focus:ring-cyan-400 border-white/20 rounded bg-white/10"
                />
                <span className="text-xs text-white/80 capitalize font-medium">
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
          className="w-full bg-gradient-to-r from-cyan-500 via-blue-500 to-purple-500 text-white py-2.5 px-4 rounded-lg hover:from-cyan-400 hover:via-blue-400 hover:to-purple-400 focus:outline-none focus:ring-2 focus:ring-cyan-400/50 disabled:opacity-50 disabled:cursor-not-allowed font-semibold shadow-lg transition-all duration-300 transform hover:scale-105"
        >
          {loading ? (
            <div className="flex items-center justify-center">
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2"></div>
              Creating...
            </div>
          ) : (
            <div className="flex items-center justify-center">
              ✨ Create Meeting
              <Plus className="w-4 h-4 ml-2" />
            </div>
          )}
        </button>
      </form>
    </div>
  );
};

export default CreateMeeting;