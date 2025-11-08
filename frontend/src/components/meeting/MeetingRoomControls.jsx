import React from 'react';
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  Phone,
  Users,
  MessageSquare,
  Settings
} from 'lucide-react';

/**
 * MeetingRoomControls Component
 * Bottom control bar with media controls and meeting actions
 */
const MeetingRoomControls = ({
  // Media state
  isMuted,
  isVideoOff,
  localStream,
  
  // Functions
  toggleMute,
  toggleVideo,
  requestMediaAccess,
  testAudioToggle,
  handleLeaveMeeting,
  handleEndMeeting,
  
  // Sidebar controls
  participants,
  participantsSidebarOpen,
  setParticipantsSidebarOpen,
  setChatSidebarOpen,
  chatSidebarOpen,
  messages,
  
  // User state
  isHost
}) => {
  
  return (
    <footer className="bg-black/60 backdrop-blur-lg p-3 flex items-center justify-center border-t border-white/10">
      <div className="flex items-center space-x-4">
        {/* Media Controls - Audio always available, Video conditional */}
        
        {/* Audio Control - Always Available */}
        <div className="flex flex-col items-center">
          <button
            onClick={toggleMute}
            className={`p-2 rounded-lg transition-all duration-200 transform hover:scale-110 ${
              isMuted
                ? "bg-gradient-to-r from-red-500 to-red-600 shadow-lg shadow-red-500/25"
                : "bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-500 hover:to-gray-600 shadow-lg"
            }`}
          >
            {isMuted ? (
              <MicOff className="w-4 h-4 text-white" />
            ) : (
              <Mic className="w-4 h-4 text-white" />
            )}
          </button>
          <span className="text-xs text-gray-300 mt-1 font-medium">
            {isMuted ? "Unmute" : "Mute"}
          </span>
        </div>

        {/* Video Control - Conditional on Stream */}
        {localStream ? (
          <div className="flex flex-col items-center">
            <button
              onClick={toggleVideo}
              className={`p-2 rounded-lg transition-all duration-200 transform hover:scale-110 ${
                isVideoOff
                  ? "bg-gradient-to-r from-red-500 to-red-600 shadow-lg shadow-red-500/25"
                  : "bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-500 hover:to-gray-600 shadow-lg"
              }`}
            >
              {isVideoOff ? (
                <VideoOff className="w-4 h-4 text-white" />
              ) : (
                <Video className="w-4 h-4 text-white" />
              )}
            </button>
            <span className="text-xs text-gray-300 mt-1 font-medium">
              {isVideoOff ? "Start Video" : "Stop Video"}
            </span>
          </div>
        ) : (
          /* Enable Media Button when no stream available */
          <div className="flex flex-col items-center">
            <button
              onClick={requestMediaAccess}
              className="p-2 rounded-lg bg-gradient-to-r from-green-600 to-green-700 hover:from-green-500 hover:to-green-600 shadow-lg shadow-green-500/25 transition-all duration-200 transform hover:scale-110"
            >
              <Video className="w-4 h-4 text-white" />
            </button>
            <span className="text-xs text-gray-300 mt-1 font-medium">
              Enable Media
            </span>
          </div>
        )}

        {/* Test Button - Remove after testing */}
        <div className="flex flex-col items-center">
          <button
            onClick={testAudioToggle}
            className="p-2 rounded-lg bg-yellow-500 hover:bg-yellow-600 shadow-lg"
          >
            🧪
          </button>
          <span className="text-xs text-gray-300 mt-1 font-medium">
            Test
          </span>
        </div>

        {/* Participants */}
        <div className="flex flex-col items-center">
          <button
            onClick={() => {
              setParticipantsSidebarOpen(!participantsSidebarOpen);
              setChatSidebarOpen(false); // Close chat sidebar if open
            }}
            className={`p-2 rounded-lg shadow-lg transition-all duration-200 transform hover:scale-110 ${
              participantsSidebarOpen
                ? "bg-gradient-to-r from-blue-500 to-blue-600"
                : "bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600"
            }`}
          >
            <Users className="w-4 h-4 text-white" />
          </button>
          <span className="text-xs text-gray-300 mt-1 font-medium">
            Participants ({participants.length + 1})
          </span>
        </div>

        {/* Chat */}
        <div className="flex flex-col items-center">
          <button
            onClick={() => {
              setChatSidebarOpen(!chatSidebarOpen);
              setParticipantsSidebarOpen(false); // Close participants sidebar if open
            }}
            className={`p-2 rounded-lg shadow-lg transition-all duration-200 transform hover:scale-110 ${
              chatSidebarOpen
                ? "bg-gradient-to-r from-purple-500 to-purple-600"
                : "bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-500 hover:to-purple-600"
            }`}
          >
            <MessageSquare className="w-4 h-4 text-white" />
          </button>
          <span className="text-xs text-gray-300 mt-1 font-medium">
            Chat {messages.length > 0 && `(${messages.length})`}
          </span>
        </div>

        {/* Leave Meeting */}
        <div className="flex flex-col items-center">
          <button
            onClick={handleLeaveMeeting}
            className="p-2 rounded-lg bg-gradient-to-r from-red-500 to-red-600 hover:from-red-400 hover:to-red-500 shadow-lg shadow-red-500/25 transition-all duration-200 transform hover:scale-110"
          >
            <Phone className="w-4 h-4 text-white transform rotate-[135deg]" />
          </button>
          <span className="text-xs text-gray-300 mt-1 font-medium">
            Leave
          </span>
        </div>

        {/* End Meeting (Host Only) */}
        {isHost && (
          <div className="flex flex-col items-center ml-4 pl-4 border-l border-white/20">
            <button
              onClick={handleEndMeeting}
              className="px-3 py-2 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 rounded-lg text-white text-xs font-semibold shadow-lg shadow-red-500/25 transition-all duration-200 transform hover:scale-105"
            >
              End Meeting
            </button>
            <span className="text-xs text-gray-300 mt-1 font-medium">
              Host Controls
            </span>
          </div>
        )}

        {/* Debug Test Button */}
        <div className="flex flex-col items-center ml-4 pl-4 border-l border-white/20">
          <button
            onClick={testAudioToggle}
            className="px-3 py-2 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-500 hover:to-purple-600 rounded-lg text-white text-xs font-semibold shadow-lg shadow-purple-500/25 transition-all duration-200 transform hover:scale-105"
          >
            🧪 Test
          </button>
          <span className="text-xs text-gray-300 mt-1 font-medium">
            Debug
          </span>
        </div>

        {/* Settings */}
        <div className="flex flex-col items-center ml-4 pl-4 border-l border-white/20">
          <button className="p-2 rounded-lg bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-500 hover:to-gray-600 shadow-lg transition-all duration-200 transform hover:scale-110">
            <Settings className="w-4 h-4 text-white" />
          </button>
          <span className="text-xs text-gray-300 mt-1 font-medium">
            Settings
          </span>
        </div>
      </div>
    </footer>
  );
};

export default MeetingRoomControls;