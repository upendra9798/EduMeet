import React, { useState } from 'react';
import { LogIn, Hash, User } from 'lucide-react';
import MeetingService from '../services/meetingService';

/**
 * JoinMeeting Component
 * Allows users to join existing meetings by Meeting ID
 */
const JoinMeeting = ({ onMeetingJoined, user }) => {
  const [meetingId, setMeetingId] = useState('');
  const [displayName, setDisplayName] = useState(user?.username || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!meetingId.trim()) {
      setError('Please enter a meeting ID');
      return;
    }

    if (!displayName.trim()) {
      setError('Please enter your display name');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const result = await MeetingService.joinMeeting(meetingId.trim(), user.id);
      
      if (result.success) {
        // Pass the meeting data along with the custom display name
        onMeetingJoined?.(result.meeting, displayName.trim());
        setMeetingId('');
        setDisplayName(user?.username || ''); // Reset to default
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

      <form onSubmit={handleSubmit} className="space-y-6 pb-4">
        <div>
          <label className="block text-sm font-medium text-white/90 mb-3">
            <User className="w-4 h-4 inline mr-2 text-blue-400" />
            Display Name *
          </label>
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            required
            className="w-full px-4 py-4 bg-white/10 backdrop-blur-lg border border-white/20 rounded-xl shadow-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition-all duration-200 text-center"
            placeholder="Enter your name for this meeting..."
          />
          <p className="text-sm text-white/60 mt-2 text-center">
            👋 This is how others will see you in the meeting
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-white/90 mb-3">
            <Hash className="w-4 h-4 inline mr-2 text-pink-400" />
            Meeting ID *
          </label>
          <input
            type="text"
            value={meetingId}
            onChange={(e) => setMeetingId(e.target.value)}
            required
            className="w-full px-4 py-4 bg-white/10 backdrop-blur-lg border border-white/20 rounded-xl shadow-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-pink-400 focus:border-pink-400 transition-all duration-200 text-center font-mono tracking-wider"
            placeholder="Enter meeting ID..."
          />
          <p className="text-sm text-white/60 mt-2 text-center">
            ✨ Ask the meeting host for the magical meeting ID
          </p>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 text-white py-3 px-6 rounded-xl hover:from-pink-400 hover:via-purple-400 hover:to-indigo-400 focus:outline-none focus:ring-4 focus:ring-pink-400/50 disabled:opacity-50 disabled:cursor-not-allowed font-bold shadow-2xl transition-all duration-300 transform hover:scale-105"
        >
          {loading ? (
            <div className="flex items-center justify-center">
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2"></div>
              Joining Adventure...
            </div>
          ) : (
            <div className="flex items-center justify-center">
              🚀 Join Amazing Meeting
              <LogIn className="w-4 h-4 ml-2" />
            </div>
          )}
        </button>
      </form>

      <div className="mt-6 p-4 bg-white/5 backdrop-blur-lg rounded-2xl border border-white/10">
        <h3 className="text-sm font-bold text-white/90 mb-3 flex items-center">
          💡 Quick Join Tips:
        </h3>
        <ul className="text-sm text-white/70 space-y-2">
          <li className="flex items-start">
            <span className="text-green-400 mr-2">📹</span>
            Make sure your camera and microphone are working
          </li>
          <li className="flex items-start">
            <span className="text-blue-400 mr-2">🌐</span>
            Check your internet connection
          </li>
          <li className="flex items-start">
            <span className="text-purple-400 mr-2">⏰</span>
            Join a few minutes before the scheduled time
          </li>
        </ul>
      </div>
    </div>
  );
};

export default JoinMeeting;