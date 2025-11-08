import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Video, 
  PenTool, 
  Users 
} from 'lucide-react';

/**
 * MeetingRoomHeader Component
 * Top navigation bar for the meeting room
 */
const MeetingRoomHeader = ({
  meetingId,
  meeting,
  activeView,
  setActiveView,
  participants,
  sidebarOpen,
  setSidebarOpen
}) => {
  const navigate = useNavigate();

  return (
    <header className="bg-black/40 backdrop-blur-lg text-white p-3 flex items-center justify-between border-b border-white/10">
      <div className="flex items-center space-x-3">
        <button
          onClick={() => navigate("/dashboard")}
          className="p-2 hover:bg-white/10 rounded-lg transition-all duration-200 transform hover:scale-105"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg flex items-center justify-center">
            <Video className="w-4 h-4 text-white" />
          </div>
          <div>
            <h1 className="text-sm font-bold">
              {meeting?.title || "Meeting Room"}
            </h1>
            <div className="flex items-center space-x-2">
              <span className="text-xs text-gray-300">ID: {meetingId}</span>
              <div className="flex items-center space-x-1">
                <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse"></div>
                <span className="text-xs text-green-400">Live</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center space-x-3">
        {/* View Toggle */}
        <div className="flex bg-white/10 backdrop-blur-md rounded-lg p-1 border border-white/20">
          <button
            onClick={() => setActiveView("video")}
            className={`flex items-center px-2 py-1 rounded-md text-xs font-medium transition-all duration-200 ${
              activeView === "video"
                ? "bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg transform scale-105"
                : "text-gray-300 hover:text-white hover:bg-white/10"
            }`}
          >
            <Video className="w-3 h-3 mr-1" />
            Video
          </button>
          <button
            onClick={() => setActiveView("whiteboard")}
            className={`flex items-center px-2 py-1 rounded-md text-xs font-medium transition-all duration-200 ${
              activeView === "whiteboard"
                ? "bg-gradient-to-r from-purple-500 to-purple-600 text-white shadow-lg transform scale-105"
                : "text-gray-300 hover:text-white hover:bg-white/10"
            }`}
          >
            <PenTool className="w-3 h-3 mr-1" />
            Whiteboard
          </button>
          <button
            onClick={() => setActiveView("split")}
            className={`flex items-center px-2 py-1 rounded-md text-xs font-medium transition-all duration-200 ${
              activeView === "split"
                ? "bg-gradient-to-r from-green-500 to-green-600 text-white shadow-lg transform scale-105"
                : "text-gray-300 hover:text-white hover:bg-white/10"
            }`}
          >
            <Users className="w-3 h-3 mr-1" />
            Split View
          </button>
        </div>

        {/* Participants Count */}
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="flex items-center space-x-1 bg-gray-700 px-2 py-1 rounded-md hover:bg-gray-600"
        >
          <Users className="w-3 h-3" />
          <span className="text-xs">{participants.length + 1}</span>
        </button>
      </div>
    </header>
  );
};

export default MeetingRoomHeader;