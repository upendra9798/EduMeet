import React from "react";
import { Video } from "lucide-react";
import VideoChat from "../VideoChat";
import Whiteboard from "../Whiteboard";

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
  isVideoOff,

  // Callbacks
  onParticipantsChange,
  handleHostControlVideo,
  handleHostControlAudio,
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
            onParticipantsChange={onParticipantsChange}
            onHostControlVideo={handleHostControlVideo}
            onHostControlAudio={handleHostControlAudio}
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
              onParticipantsChange={onParticipantsChange}
              onHostControlVideo={handleHostControlVideo}
              onHostControlAudio={handleHostControlAudio}
            />
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
