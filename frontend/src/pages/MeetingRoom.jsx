import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Mic, 
  MicOff, 
  Video as VideoIcon, 
  VideoOff, 
  Phone, 
  Users, 
  MessageSquare, 
  PenTool,
  Settings,
  ArrowLeft
} from 'lucide-react';
import VideoChat from '../components/VideoChat';
import Whiteboard from '../components/Whiteboard';
import MeetingService from '../services/meetingService';
import MeetingSocket from '../services/meetingSocket';

/**
 * MeetingRoom Component
 * Main meeting interface with video, whiteboard, and controls
 */
const MeetingRoom = ({ user }) => {
  const { meetingId } = useParams();
  const navigate = useNavigate();

  // Meeting state
  const [meeting, setMeeting] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [joined, setJoined] = useState(false);

  // UI state
  const [activeView, setActiveView] = useState('video'); // 'video' | 'whiteboard' | 'split'
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [participants, setParticipants] = useState([]);

  // Media controls state
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);

  // Load meeting data and join
  useEffect(() => {
    if (meetingId) {
      loadMeetingAndJoin();
    }

    return () => {
      // Cleanup when leaving
      MeetingSocket.leaveMeeting();
    };
  }, [meetingId]);

  // Load meeting data and join the socket room
  const loadMeetingAndJoin = async () => {
    try {
      setLoading(true);
      
      // Get meeting details
      const result = await MeetingService.getMeeting(meetingId);
      if (result.success) {
        setMeeting(result.meeting);
        
        // Join the meeting via API
        await MeetingService.joinMeeting(meetingId, user.id);
        
        // Connect to meeting socket
        MeetingSocket.connect(user.id);
        setupSocketListeners();
        MeetingSocket.joinMeeting(meetingId);
        
        setJoined(true);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Setup socket event listeners
  const setupSocketListeners = () => {
    MeetingSocket.on('meeting-joined', (data) => {
      console.log('Joined meeting successfully:', data);
      setParticipants(data.otherUsers || []);
    });

    MeetingSocket.on('user-joined', (data) => {
      console.log('User joined:', data);
      setParticipants(prev => [...prev, data.userId]);
    });

    MeetingSocket.on('user-left', (data) => {
      console.log('User left:', data);
      setParticipants(prev => prev.filter(p => p !== data.userId));
    });

    MeetingSocket.on('meeting-error', (error) => {
      console.error('Meeting error:', error);
      setError(error.message);
    });
  };

  // Handle leaving the meeting
  const handleLeaveMeeting = async () => {
    if (confirm('Are you sure you want to leave the meeting?')) {
      MeetingSocket.leaveMeeting();
      navigate('/dashboard');
    }
  };

  // Handle ending the meeting (host only)
  const handleEndMeeting = async () => {
    if (confirm('Are you sure you want to end this meeting for everyone?')) {
      try {
        await MeetingService.endMeeting(meetingId, user.id);
        navigate('/dashboard');
      } catch (err) {
        alert('Failed to end meeting: ' + err.message);
      }
    }
  };

  // Check if current user is the host
  const isHost = meeting && (meeting.host._id === user.id || meeting.host === user.id);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-white">Joining meeting...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-lg max-w-md">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Unable to join meeting</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => navigate('/dashboard')}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-gray-900 flex flex-col">
      {/* Top Bar */}
      <header className="bg-gray-800 text-white p-4 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate('/dashboard')}
            className="p-2 hover:bg-gray-700 rounded-md"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-lg font-semibold">{meeting?.title || 'Meeting'}</h1>
            <p className="text-sm text-gray-400">Meeting ID: {meetingId}</p>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          {/* View Toggle */}
          <div className="flex bg-gray-700 rounded-lg p-1">
            <button
              onClick={() => setActiveView('video')}
              className={`px-3 py-1 rounded text-sm ${
                activeView === 'video' ? 'bg-blue-600 text-white' : 'text-gray-300 hover:text-white'
              }`}
            >
              <VideoIcon className="w-4 h-4 inline mr-1" />
              Video
            </button>
            <button
              onClick={() => setActiveView('whiteboard')}
              className={`px-3 py-1 rounded text-sm ${
                activeView === 'whiteboard' ? 'bg-blue-600 text-white' : 'text-gray-300 hover:text-white'
              }`}
            >
              <PenTool className="w-4 h-4 inline mr-1" />
              Whiteboard
            </button>
            <button
              onClick={() => setActiveView('split')}
              className={`px-3 py-1 rounded text-sm ${
                activeView === 'split' ? 'bg-blue-600 text-white' : 'text-gray-300 hover:text-white'
              }`}
            >
              Split
            </button>
          </div>

          {/* Participants Count */}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="flex items-center space-x-2 bg-gray-700 px-3 py-2 rounded-md hover:bg-gray-600"
          >
            <Users className="w-4 h-4" />
            <span className="text-sm">{participants.length + 1}</span>
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Main View */}
        <main className="flex-1 relative">
          {activeView === 'video' && (
            <div className="h-full">
              <VideoChat meetingId={meetingId} userId={user.id} />
            </div>
          )}
          
          {activeView === 'whiteboard' && (
            <div className="h-full">
              <Whiteboard 
                whiteboardId={`wb-${meetingId}`}
                meetingId={meetingId}
                userId={user.id}
                isHost={isHost}
              />
            </div>
          )}
          
          {activeView === 'split' && (
            <div className="h-full grid grid-cols-1 lg:grid-cols-2 gap-4 p-4">
              <div className="bg-black rounded-lg overflow-hidden">
                <VideoChat meetingId={meetingId} userId={user.id} />
              </div>
              <div className="bg-white rounded-lg overflow-hidden">
                <Whiteboard 
                  whiteboardId={`wb-${meetingId}`}
                  meetingId={meetingId}
                  userId={user.id}
                  isHost={isHost}
                />
              </div>
            </div>
          )}
        </main>

        {/* Sidebar */}
        {sidebarOpen && (
          <aside className="w-80 bg-gray-800 text-white p-4 border-l border-gray-700">
            <div className="mb-4">
              <h3 className="text-lg font-semibold mb-2">Participants ({participants.length + 1})</h3>
              <div className="space-y-2">
                {/* Current User */}
                <div className="flex items-center space-x-3 p-2 bg-gray-700 rounded">
                  <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-sm">
                    {user.username.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-sm">{user.username} (You)</span>
                  {isHost && (
                    <span className="text-xs bg-blue-600 px-2 py-1 rounded">Host</span>
                  )}
                </div>
                
                {/* Other Participants */}
                {participants.map((participantId, index) => (
                  <div key={participantId} className="flex items-center space-x-3 p-2 hover:bg-gray-700 rounded">
                    <div className="w-8 h-8 bg-gray-500 rounded-full flex items-center justify-center text-sm">
                      U{index + 1}
                    </div>
                    <span className="text-sm">User {participantId.slice(-4)}</span>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Chat placeholder */}
            <div className="border-t border-gray-700 pt-4">
              <h3 className="text-lg font-semibold mb-2">Chat</h3>
              <div className="bg-gray-700 rounded p-3 text-center text-gray-400 text-sm">
                Chat functionality coming soon...
              </div>
            </div>
          </aside>
        )}
      </div>

      {/* Bottom Controls */}
      <footer className="bg-gray-800 p-4 flex items-center justify-center space-x-4">
        {/* Audio Control */}
        <button
          onClick={() => setIsMuted(!isMuted)}
          className={`p-3 rounded-full ${
            isMuted ? 'bg-red-600 hover:bg-red-700' : 'bg-gray-600 hover:bg-gray-700'
          }`}
        >
          {isMuted ? <MicOff className="w-5 h-5 text-white" /> : <Mic className="w-5 h-5 text-white" />}
        </button>

        {/* Video Control */}
        <button
          onClick={() => setIsVideoOff(!isVideoOff)}
          className={`p-3 rounded-full ${
            isVideoOff ? 'bg-red-600 hover:bg-red-700' : 'bg-gray-600 hover:bg-gray-700'
          }`}
        >
          {isVideoOff ? <VideoOff className="w-5 h-5 text-white" /> : <VideoIcon className="w-5 h-5 text-white" />}
        </button>

        {/* Leave Meeting */}
        <button
          onClick={handleLeaveMeeting}
          className="p-3 bg-red-600 hover:bg-red-700 rounded-full"
        >
          <Phone className="w-5 h-5 text-white" />
        </button>

        {/* End Meeting (Host Only) */}
        {isHost && (
          <button
            onClick={handleEndMeeting}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-md text-white text-sm font-medium"
          >
            End Meeting
          </button>
        )}

        {/* Settings */}
        <button className="p-3 bg-gray-600 hover:bg-gray-700 rounded-full">
          <Settings className="w-5 h-5 text-white" />
        </button>
      </footer>
    </div>
  );
};

export default MeetingRoom;