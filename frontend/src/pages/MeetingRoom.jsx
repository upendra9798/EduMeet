import React, { useEffect } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";

// Import the new components
import MeetingRoomHeader from "../components/meeting/MeetingRoomHeader";
import MeetingRoomContent from "../components/meeting/MeetingRoomContent";
import MeetingRoomSidebars from "../components/meeting/MeetingRoomSidebars";
import MeetingRoomControls from "../components/meeting/MeetingRoomControls";

// Import the logic hook
import useMeetingRoomLogic from "../hooks/useMeetingRoomLogic";

/**
 * MeetingRoom Component (Refactored)
 * Main meeting interface - now much cleaner and smaller!
 */
const MeetingRoom = ({ user }) => {
  const { meetingId } = useParams();
  const [searchParams] = useSearchParams();
  
  // Only log on initial mount or when meetingId changes
  useEffect(() => {
    console.log('MeetingRoom: Component initialized with:', {
      user: user?.username,
      meetingId,
      url: window.location.href,
      searchParams: Object.fromEntries(searchParams.entries())
    });
  }, [meetingId, user?.id]);

  // Get display name from URL params or use default user name
  const displayName = searchParams.get("displayName") || user.username;
  const testUserId = searchParams.get("testUserId") || user.id;
  
  const displayUser = {
    ...user,
    id: testUserId,
    username: displayName,
  };

  // Use the extracted logic hook
  const {
    // State
    meeting,
    loading,
    error,
    joined,
    activeView,
    setActiveView,
    participantsSidebarOpen,
    setParticipantsSidebarOpen,
    chatSidebarOpen,
    setChatSidebarOpen,
    participants,
    setParticipants,
    isMuted,
    isVideoOff,
    localStream,
    showMediaPrompt,
    setShowMediaPrompt,
    showTroubleshoot,
    messages,
    newMessage,
    setNewMessage,
    isHost,
    
    // Functions
    requestMediaAccess,
    handleMediaRetry,
    handleSkipCamera,
    toggleMute,
    toggleVideo,
    testAudioToggle,
    sendMessage,
    handleKeyPress,
    hostMuteParticipant,
    hostDisableVideo,
    handleLeaveMeeting,
    handleEndMeeting,
    handleVideoParticipantsChange
  } = useMeetingRoomLogic(meetingId, displayUser, user);

  // Show loading state
  if (loading) {
    return (
      <div className="h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center relative overflow-hidden">
        {/* Animated Background */}
        <div className="absolute inset-0">
          <div className="absolute top-0 left-0 w-72 h-72 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse"></div>
          <div className="absolute top-0 right-0 w-72 h-72 bg-blue-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse animation-delay-2000"></div>
          <div className="absolute -bottom-8 left-20 w-72 h-72 bg-indigo-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse animation-delay-4000"></div>
        </div>
        
        {/* Loading Content */}
        <div className="relative z-10 text-center">
          <div className="relative mb-8">
            <div className="w-20 h-20 border-4 border-blue-500/30 rounded-full animate-spin border-t-blue-400"></div>
            <div
              className="absolute inset-0 w-20 h-20 border-4 border-purple-500/30 rounded-full animate-spin border-t-purple-400"
              style={{
                animationDirection: "reverse",
                animationDuration: "1.5s",
              }}
            ></div>
          </div>
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20">
            <h2 className="text-2xl font-bold text-white mb-2">
              Joining Meeting
            </h2>
            <p className="text-blue-200">Setting up your connection...</p>
            <div className="flex justify-center items-center mt-4 space-x-2">
              <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
              <div
                className="w-2 h-2 bg-purple-400 rounded-full animate-pulse"
                style={{ animationDelay: "0.2s" }}
              ></div>
              <div
                className="w-2 h-2 bg-indigo-400 rounded-full animate-pulse"
                style={{ animationDelay: "0.4s" }}
              ></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="h-screen bg-gradient-to-br from-red-900 via-gray-900 to-red-900 flex items-center justify-center relative overflow-hidden">
        <div className="relative z-10 text-center max-w-md mx-auto p-8">
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-red-500/30">
            <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Unable to Join Meeting
            </h2>
            <div className="w-16 h-1 bg-gradient-to-r from-red-500 to-pink-500 rounded mx-auto"></div>
          </div>
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4 mb-6">
            <p className="text-red-800 text-center font-medium">{error}</p>
          </div>
          <button
            onClick={() => navigate("/dashboard")}
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 px-6 rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all duration-200 transform hover:scale-105 font-semibold shadow-lg"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="h-screen bg-gradient-to-br from-gray-900 via-slate-800 to-gray-900 flex flex-col">
      {/* Header */}
      <MeetingRoomHeader 
        meetingId={meetingId}
        meeting={meeting}
        activeView={activeView}
        setActiveView={setActiveView}
        participants={participants}
        sidebarOpen={participantsSidebarOpen || chatSidebarOpen}
        setSidebarOpen={(open) => {
          if (open) {
            setParticipantsSidebarOpen(true);
            setChatSidebarOpen(false);
          } else {
            setParticipantsSidebarOpen(false);
            setChatSidebarOpen(false);
          }
        }}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Main View */}
        <MeetingRoomContent 
          activeView={activeView}
          meetingId={meetingId}
          displayUser={displayUser}
          user={user}
          participants={participants}
          localStream={localStream}
          isMuted={isMuted}
          isVideoOff={isVideoOff}
          onParticipantsChange={handleVideoParticipantsChange}
        />

        {/* Sidebars */}
        <MeetingRoomSidebars 
          participantsSidebarOpen={participantsSidebarOpen}
          setParticipantsSidebarOpen={setParticipantsSidebarOpen}
          chatSidebarOpen={chatSidebarOpen}
          setChatSidebarOpen={setChatSidebarOpen}
          participants={participants}
          setParticipants={setParticipants}
          displayUser={displayUser}
          user={user}
          isHost={isHost}
          meetingId={meetingId}
          messages={messages}
          newMessage={newMessage}
          setNewMessage={setNewMessage}
          hostMuteParticipant={hostMuteParticipant}
          hostDisableVideo={hostDisableVideo}
          sendMessage={sendMessage}
          handleKeyPress={handleKeyPress}
        />
      </div>

      {/* Bottom Controls */}
      <MeetingRoomControls 
        isMuted={isMuted}
        isVideoOff={isVideoOff}
        localStream={localStream}
        toggleMute={toggleMute}
        toggleVideo={toggleVideo}
        requestMediaAccess={requestMediaAccess}
        testAudioToggle={testAudioToggle}
        handleLeaveMeeting={handleLeaveMeeting}
        handleEndMeeting={handleEndMeeting}
        participants={participants}
        participantsSidebarOpen={participantsSidebarOpen}
        setParticipantsSidebarOpen={setParticipantsSidebarOpen}
        setChatSidebarOpen={setChatSidebarOpen}
        chatSidebarOpen={chatSidebarOpen}
        messages={messages}
        isHost={isHost}
      />
    </div>
  );
};

export default MeetingRoom;