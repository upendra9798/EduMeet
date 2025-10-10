import React, { useState, useEffect } from 'react';
import { Calendar, Users, Clock, Video, Copy, ExternalLink, Trash2 } from 'lucide-react';
import MeetingService from '../services/meetingService';

/**
 * MeetingList Component
 * Displays list of user's meetings with management options
 */
const MeetingList = ({ userId, onJoinMeeting }) => {
  const [meetings, setMeetings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Fetch meetings on component mount
  useEffect(() => {
    fetchMeetings();
  }, [userId]);

  // Fetch user's meetings
  const fetchMeetings = async () => {
    try {
      setLoading(true);
      const result = await MeetingService.getUserMeetings(userId);
      if (result.success) {
        setMeetings(result.meetings);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Copy meeting ID to clipboard
  const copyMeetingId = async (meetingId) => {
    try {
      await navigator.clipboard.writeText(meetingId);
      // You could add a toast notification here
      alert('Meeting ID copied to clipboard!');
    } catch (err) {
      console.error('Failed to copy meeting ID:', err);
    }
  };

  // End a meeting (host only)
  const handleEndMeeting = async (meetingId) => {
    if (!confirm('Are you sure you want to end this meeting? This action cannot be undone.')) {
      return;
    }

    try {
      await MeetingService.endMeeting(meetingId, userId);
      // Refresh meetings list
      fetchMeetings();
    } catch (err) {
      alert('Failed to end meeting: ' + err.message);
    }
  };

  // Format date for display
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  // Check if user is host of the meeting
  const isHost = (meeting) => {
    return meeting.host?._id === userId || meeting.host === userId;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        <span className="ml-2 text-gray-600">Loading meetings...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
        <p>Error loading meetings: {error}</p>
        <button 
          onClick={fetchMeetings}
          className="mt-2 text-red-600 underline hover:text-red-800"
        >
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-800">My Meetings</h2>
        <button 
          onClick={fetchMeetings}
          className="text-blue-600 hover:text-blue-800 font-medium"
        >
          Refresh
        </button>
      </div>

      {meetings.length === 0 ? (
        <div className="text-center py-8">
          <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-600 mb-2">No meetings found</h3>
          <p className="text-gray-500">Create a new meeting or ask someone to invite you.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {meetings.map((meeting) => (
            <div 
              key={meeting._id} 
              className="bg-white rounded-lg shadow-md border border-gray-200 p-6 hover:shadow-lg transition-shadow"
            >
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-xl font-semibold text-gray-800 mb-2">
                    {meeting.title}
                  </h3>
                  <div className="flex items-center text-sm text-gray-600 space-x-4">
                    <span className="flex items-center">
                      <Calendar className="w-4 h-4 mr-1" />
                      {formatDate(meeting.startTime)}
                    </span>
                    <span className="flex items-center">
                      <Users className="w-4 h-4 mr-1" />
                      {meeting.currentParticipants || 0}/{meeting.maxParticipants}
                    </span>
                    {isHost(meeting) && (
                      <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs font-medium">
                        Host
                      </span>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  {/* Join Meeting Button */}
                  <button
                    onClick={() => onJoinMeeting?.(meeting)}
                    className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 flex items-center"
                  >
                    <Video className="w-4 h-4 mr-1" />
                    Join
                  </button>

                  {/* Copy Meeting ID */}
                  <button
                    onClick={() => copyMeetingId(meeting.meetingId)}
                    className="bg-gray-100 text-gray-700 px-3 py-2 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500"
                    title="Copy Meeting ID"
                  >
                    <Copy className="w-4 h-4" />
                  </button>

                  {/* End Meeting (Host only) */}
                  {isHost(meeting) && (
                    <button
                      onClick={() => handleEndMeeting(meeting.meetingId)}
                      className="bg-red-100 text-red-700 px-3 py-2 rounded-md hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-red-500"
                      title="End Meeting"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Meeting Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium text-gray-700">Meeting ID:</span>
                  <code className="ml-2 bg-gray-100 px-2 py-1 rounded text-xs">
                    {meeting.meetingId}
                  </code>
                </div>
                
                <div>
                  <span className="font-medium text-gray-700">Room Type:</span>
                  <span className="ml-2 capitalize">{meeting.roomType}</span>
                </div>

                {meeting.endTime && (
                  <div>
                    <span className="font-medium text-gray-700">End Time:</span>
                    <span className="ml-2">{formatDate(meeting.endTime)}</span>
                  </div>
                )}

                <div>
                  <span className="font-medium text-gray-700">Host:</span>
                  <span className="ml-2">
                    {meeting.host?.username || meeting.host?.email || 'Unknown'}
                  </span>
                </div>
              </div>

              {/* Meeting Settings */}
              {meeting.meetingSettings && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <span className="font-medium text-gray-700 mb-2 block">Features:</span>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(meeting.meetingSettings).map(([feature, enabled]) => (
                      enabled && (
                        <span 
                          key={feature}
                          className="bg-blue-50 text-blue-700 px-2 py-1 rounded-full text-xs font-medium"
                        >
                          {feature.replace(/([A-Z])/g, ' $1').toLowerCase()}
                        </span>
                      )
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MeetingList;