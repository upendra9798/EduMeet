import { useState } from 'react';

/**
 * Custom hook to manage all meeting-related state
 * Centralizes state management for the MeetingRoom component
 */
const useMeetingState = () => {
  // Meeting data and connection state
  const [meeting, setMeeting] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [joined, setJoined] = useState(false);

  // UI state
  const [activeView, setActiveView] = useState('video'); // 'video', 'whiteboard', 'split'
  const [participantsSidebarOpen, setParticipantsSidebarOpen] = useState(false);
  const [chatSidebarOpen, setChatSidebarOpen] = useState(false);

  // Participants and user interactions
  const [participants, setParticipants] = useState([]);

  // Media controls
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [localStream, setLocalStream] = useState(null);
  const [showMediaPrompt, setShowMediaPrompt] = useState(true);

  // Chat functionality
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');

  // Host permissions (derived from meeting data)
  const isHost = meeting && meeting.host ? 
    meeting.host.toString() === meeting.currentUserId : false;

  // Helper functions
  const resetMeetingState = () => {
    setMeeting(null);
    setLoading(true);
    setError(null);
    setJoined(false);
    setParticipants([]);
    setMessages([]);
    setNewMessage('');
    setActiveView('video');
    setParticipantsSidebarOpen(false);
    setChatSidebarOpen(false);
  };

  const updateMeetingData = (newMeetingData) => {
    setMeeting(prev => ({
      ...prev,
      ...newMeetingData
    }));
  };

  return {
    // Meeting data
    meeting,
    setMeeting,
    updateMeetingData,
    
    // Connection state
    loading,
    setLoading,
    error,
    setError,
    joined,
    setJoined,
    
    // UI state
    activeView,
    setActiveView,
    participantsSidebarOpen,
    setParticipantsSidebarOpen,
    chatSidebarOpen,
    setChatSidebarOpen,
    
    // Participants
    participants,
    setParticipants,
    
    // Media controls
    isMuted,
    setIsMuted,
    isVideoOff,
    setIsVideoOff,
    localStream,
    setLocalStream,
    showMediaPrompt,
    setShowMediaPrompt,
    
    // Chat
    messages,
    setMessages,
    newMessage,
    setNewMessage,
    
    // Permissions
    isHost,
    
    // Helpers
    resetMeetingState
  };
};

export default useMeetingState;
