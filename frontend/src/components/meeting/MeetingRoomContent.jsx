import React from 'react';
import { Video } from 'lucide-react';
import VideoChat from '../VideoChat';
import Whiteboard from '../Whiteboard';

/**
 * MeetingRoomContent Component
 * Main content area that switches between video, whiteboard, and split view
 */
const MeetingRoomContent = ({
  // View state
  activeView,
  
  // Meeting data
  meetingId,
  displayUser,
  user,
  participants,
  
  // Media state
  localStream,
  isMuted,
  isVideoOff
}) => {
  
  return (
    <main className="flex-1 relative">
      {activeView === "video" && (
        <div className="h-full">
          <VideoChat
            meetingId={meetingId}
            userId={displayUser.id}
            localStream={localStream}
            isMuted={isMuted}
            isVideoOff={isVideoOff}
          />
        </div>
      )}

      {/* Show whiteboard content based on view */}
      {activeView === "whiteboard" && (
        <div className="h-full">
          <Whiteboard
            meetingId={meetingId}
            userId={displayUser.id}
            userDisplayName={displayUser.username}
            participantCount={participants.length + 1}
          />
        </div>
      )}

      {activeView === "split" && (
        <div className="h-full grid grid-cols-1 lg:grid-cols-2 gap-4 p-4">
          <div className="bg-black rounded-lg overflow-hidden relative">
            <VideoChat
              meetingId={meetingId}
              userId={displayUser.id}
              localStream={localStream}
              isMuted={isMuted}
              isVideoOff={isVideoOff}
            />
            {!localStream && showMediaPrompt && (
              <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2">
                <div className="text-center p-3 bg-gray-900/95 backdrop-blur-lg rounded-lg border border-gray-700">
                  <Video className="w-6 h-6 mx-auto mb-2 text-white" />
                  <p className="text-xs text-gray-300 mb-2">Video sharing disabled</p>
                  <button
                    onClick={requestMediaAccess}
                    className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-xs transition-colors"
                  >
                    Enable
                  </button>
                </div>
              </div>
            )}

            {/* Camera access error overlay for split view */}
            {showTroubleshoot && (
              <div className="absolute inset-0 bg-black/90 backdrop-blur-sm z-20 flex items-center justify-center p-2">
                <div className="w-full max-w-sm bg-white rounded-lg p-4 text-center">
                  <h4 className="font-semibold mb-2">Camera Access Failed</h4>
                  <p className="text-sm text-gray-600 mb-3">
                    Unable to access camera/microphone.
                  </p>
                  <div className="flex space-x-2">
                    <button
                      onClick={handleMediaRetry}
                      className="flex-1 bg-blue-500 text-white px-3 py-1 rounded text-sm hover:bg-blue-600"
                    >
                      Retry
                    </button>
                    <button
                      onClick={handleSkipCamera}
                      className="flex-1 bg-gray-300 text-gray-700 px-3 py-1 rounded text-sm hover:bg-gray-400"
                    >
                      Skip
                    </button>
                  </div>
                </div>
              </div>
            )}

            {!localStream && !showMediaPrompt && !showTroubleshoot && (
              <div className="absolute bottom-2 right-2">
                <button
                  onClick={() => setShowMediaPrompt(true)}
                  className="bg-blue-500 hover:bg-blue-600 text-white p-2 rounded shadow-lg transition-all hover:scale-110"
                  title="Enable Camera & Microphone"
                >
                  <Video className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
          <div className="bg-white rounded-lg overflow-hidden">
            <Whiteboard
              meetingId={meetingId}
              userId={user.id}
              userDisplayName={displayUser.username}
              participantCount={participants.length + 1}
            />
          </div>
        </div>
      )}
    </main>
  );
};

export default MeetingRoomContent;