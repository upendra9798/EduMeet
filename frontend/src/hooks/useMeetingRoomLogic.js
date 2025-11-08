import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import MeetingService from '../services/meetingService';
import MeetingSocket from '../services/meetingSocket';
import WhiteboardService from '../services/whiteboardService';

/**
 * useMeetingRoomLogic Hook
 * Handles all the complex meeting logic, socket connections, and state management
 */
const useMeetingRoomLogic = (meetingId, displayUser, user) => {
  const navigate = useNavigate();
  
  // Meeting state
  const [meeting, setMeeting] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [joined, setJoined] = useState(false);

  // UI state
  const [activeView, setActiveView] = useState("video");
  const [participantsSidebarOpen, setParticipantsSidebarOpen] = useState(false);
  const [chatSidebarOpen, setChatSidebarOpen] = useState(false);
  const [participants, setParticipants] = useState([]);

  // Media controls state
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [localStream, setLocalStream] = useState(null);
  const [showMediaPrompt, setShowMediaPrompt] = useState(true);
  const [showTroubleshoot, setShowTroubleshoot] = useState(false);
  const [mediaAccessFailed, setMediaAccessFailed] = useState(false);

  // Chat state
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [listenersSetup, setListenersSetup] = useState(false);
  const [lastMessageTime, setLastMessageTime] = useState(0);

  // Derived state
  const isHost = meeting && meeting.host ? meeting.host.toString() === displayUser.id : false;

  // Clean start - no test participants
  useEffect(() => {
    console.log("MeetingRoom: Component mounted, starting with empty participants");
    setParticipants([]);
  }, []);

  // Monitor participants state changes
  useEffect(() => {
    console.log("PARTICIPANTS STATE CHANGED:", participants.length, participants);
  }, [participants]);

  // Alternative approach: Use VideoChat's remote participants data
  useEffect(() => {
    const syncWithVideoChat = () => {
      if (window.videoChat && window.videoChat.remoteParticipants) {
        console.log("Syncing with VideoChat remote participants:", window.videoChat.remoteParticipants);
        
        const videoParticipants = Object.values(window.videoChat.remoteParticipants).map(p => ({
          socketId: p.socketId,
          userId: p.userId || 'unknown',
          displayName: p.displayName || 'Remote User',
          isMuted: false,
          isVideoOff: false
        }));
        
        if (videoParticipants.length > 0 && participants.length === 0) {
          console.log("Adding participants from VideoChat:", videoParticipants);
          setParticipants(videoParticipants);
        }
      }
    };
    
    const syncInterval = setInterval(syncWithVideoChat, 5000);
    return () => clearInterval(syncInterval);
  }, [participants]);

  // Load meeting data and join
  useEffect(() => {
    console.log('MeetingRoom: useEffect called with meetingId:', meetingId);
    if (meetingId) {
      console.log('MeetingRoom: Starting to load meeting and join');
      loadMeetingAndJoin();
    } else {
      console.log('MeetingRoom: No meetingId provided');
    }

    return () => {
      console.log('MeetingRoom: Cleanup - leaving meeting socket');
      MeetingSocket.leaveMeeting();
    };
  }, [meetingId]);

  // Load meeting data and join the socket room
  const loadMeetingAndJoin = async () => {
    try {
      console.log('MeetingRoom: loadMeetingAndJoin started for meetingId:', meetingId);
      setLoading(true);

      // Setup socket listeners first
      console.log('MeetingRoom: Setting up socket listeners before connection...');
      
      // Test if socket has basic functionality
      console.log('MeetingRoom: Testing socket functionality...');
      console.log('MeetingRoom: Socket object:', MeetingSocket);
      console.log('MeetingRoom: Socket.on function exists?', typeof MeetingSocket.on === 'function');
      
      if (!MeetingSocket.on || typeof MeetingSocket.on !== 'function') {
        throw new Error('Socket object is missing required methods');
      }

      // Wrap socket methods for debugging
      const originalOn = MeetingSocket.on.bind(MeetingSocket);
      const originalEmit = MeetingSocket.emit.bind(MeetingSocket);

      // Log all incoming events
      const eventLogger = (eventName) => {
        return (...args) => {
          console.log(`🔥 EVENT RECEIVED: ${eventName}`, args);
        };
      };
      
      // Monitor common events
      ['meeting-joined', 'user-joined', 'user-left', 'connect', 'disconnect'].forEach(event => {
        MeetingSocket.on(event, eventLogger(event));
      });
      
      console.log('MeetingRoom: Event monitoring enabled');

      // Get meeting details
      console.log('MeetingRoom: Fetching meeting details...');
      const result = await MeetingService.getMeeting(meetingId);
      console.log('MeetingRoom: getMeeting result:', result);
      
      if (result.success) {
        console.log('MeetingRoom: Meeting found, setting meeting data:', result.meeting);
        setMeeting(result.meeting);
        console.log('MeetingRoom: Meeting state updated, meeting object:', result.meeting);

        // Join the meeting via API
        await MeetingService.joinMeeting(meetingId, displayUser.id);

        // Create whiteboard if host (or get existing one)
        if (result.meeting.host.toString() === displayUser.id) {
          console.log('MeetingRoom: User is host, creating/getting whiteboard');
          try {
            const whiteboardResult = await WhiteboardService.getOrCreateWhiteboard(meetingId, displayUser.id);
            console.log('MeetingRoom: Whiteboard result:', whiteboardResult);
          } catch (whiteboardError) {
            console.warn('MeetingRoom: Whiteboard setup failed:', whiteboardError);
          }
        }

        // Connect to socket AFTER getting meeting data
        console.log('MeetingRoom: About to connect to socket...');
        try {
          await MeetingSocket.connect(displayUser.id);
          console.log('MeetingRoom: Socket connected successfully');
        } catch (socketError) {
          console.error('MeetingRoom: Socket connection failed:', socketError);
          throw new Error('Failed to connect to meeting service');
        }

        // Setup socket event listeners
        setupSocketListeners();
        
        // Join the meeting room via socket
        console.log('MeetingRoom: Joining meeting room via socket...');
        MeetingSocket.joinMeeting(meetingId, displayUser.username);
        
        console.log('MeetingRoom: Setting joined state to true');
        setJoined(true);
        setError(null);
        console.log('MeetingRoom: Final state - loading:', false, 'error:', null, 'joined:', true, 'meeting:', result.meeting);
      } else {
        console.error('MeetingRoom: Failed to get meeting - result.success is false');
        setError('Meeting not found or access denied');
      }
    } catch (err) {
      console.error('MeetingRoom: Error in loadMeetingAndJoin:', err);
      setError(err.message);
      console.log('MeetingRoom: Error state set, should show error UI');
    } finally {
      setLoading(false);
      console.log('MeetingRoom: loadMeetingAndJoin completed, loading:', false, 'error:', error);
    }
  };

  // Setup socket event listeners
  const setupSocketListeners = () => {
    console.log("🚀🚀 SETUP SOCKET LISTENERS CALLED! 🚀🚀🚀");
    console.log("🔧 MeetingRoom: Setting up socket listeners...");
    console.log("🔧 MeetingRoom: Socket connected:", MeetingSocket.isConnected);
    
    if (!MeetingSocket.on) {
      console.error("🚨 CRITICAL: MeetingSocket.on is not available!");
      return;
    }

    // Connection events
    MeetingSocket.on('connected', (data) => {
      console.log('🔗 Socket connected event received:', data);
    });

    MeetingSocket.on('disconnected', () => {
      console.log('🔌 Socket disconnected');
      // Handle reconnection logic if needed
    });

    // Meeting events - Handle successful join
    MeetingSocket.on('meeting-joined', (data) => {
      console.log('✅ Successfully joined meeting:', data);
      
      if (data.existingParticipants && Array.isArray(data.existingParticipants)) {
        console.log('🧑‍🤝‍🧑 Processing existing participants:', data.existingParticipants.length);
        
        // Filter out current user from participants list
        const others = data.existingParticipants.filter(p => p.userId !== (displayUser?.id || user?.id));
        const newParticipants = others.map(p => ({
          ...p,
          isMuted: p.isMuted || false,
          isVideoOff: p.isVideoOff || false
        }));
        
        console.log('🧑‍🤝‍🧑 Setting participants to:', newParticipants);
        setParticipants(newParticipants);
      }
    });

    // Handle new user joining
    MeetingSocket.on('user-joined', (data) => {
      console.log('👋 New user joined:', data);
      
      if (data && data.userId !== displayUser.id && data.userId !== user.id) {
        setParticipants(prev => {
          // Check if participant already exists
          const existsBySocket = prev.find(p => p.socketId === data.socketId);
          const existsByUser = prev.find(p => p.userId === data.userId);
          
          if (!existsBySocket && !existsByUser) {
            const newParticipant = {
              socketId: data.socketId,
              userId: data.userId,
              displayName: data.displayName || `User ${data.userId?.slice(-4)}`,
              isMuted: false,
              isVideoOff: false
            };
            
            console.log('➕ Adding new participant:', newParticipant);
            return [...prev, newParticipant];
          } else {
            console.log('🔄 Participant already exists, skipping');
            return prev;
          }
        });
      }
    });

    // Handle user leaving
    MeetingSocket.on('user-left', (data) => {
      console.log('👋 User left:', data);
      
      if (data && (data.socketId || data.userId)) {
        setParticipants(prev => {
          const updated = prev.filter(p => 
            p.socketId !== data.socketId && p.userId !== data.userId
          );
          console.log('➖ Removing participant, new list:', updated);
          return updated;
        });
      }
    });

    // Handle meeting errors
    MeetingSocket.on('meeting-error', (error) => {
      console.error('❌ Meeting error:', error);
      setError(error.message || 'An error occurred during the meeting');
    });

    // Chat message received
    MeetingSocket.on('message-received', (messageData) => {
      console.log('💬 Message received:', messageData);
      
      if (messageData && messageData.text) {
        const receivedMessage = {
          id: messageData.messageId || Date.now() + Math.random(),
          text: messageData.text,
          sender: messageData.senderDisplayName || messageData.sender || 'Anonymous',
          timestamp: messageData.timestamp || new Date().toISOString(),
          isOwn: messageData.senderId === displayUser.id
        };
        
        setMessages(prev => [...prev, receivedMessage]);
      }
    });

    console.log('✅ MeetingRoom: All socket listeners set up');
    setListenersSetup(true);
  };

  // Media functions
  const requestMediaAccess = async () => {
    try {
      setShowMediaPrompt(false);
      setShowTroubleshoot(false);
      
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
      });
      
      setLocalStream(stream);
      console.log('Media stream obtained:', stream);
    } catch (error) {
      console.error('Failed to get media stream:', error);
      setMediaAccessFailed(true);
      setShowTroubleshoot(true);
    }
  };

  const handleMediaRetry = () => {
    setShowTroubleshoot(false);
    setMediaAccessFailed(false);
    requestMediaAccess();
  };

  const handleSkipCamera = () => {
    setShowMediaPrompt(false);
    setShowTroubleshoot(false);
    setMediaAccessFailed(false);
  };

  const toggleMute = () => {
    if (localStream) {
      const audioTracks = localStream.getAudioTracks();
      audioTracks.forEach(track => {
        track.enabled = isMuted;
      });
    }
    setIsMuted(!isMuted);
  };

  const toggleVideo = () => {
    if (localStream) {
      const videoTracks = localStream.getVideoTracks();
      videoTracks.forEach(track => {
        track.enabled = isVideoOff;
      });
    }
    setIsVideoOff(!isVideoOff);
  };

  const testAudioToggle = () => {
    console.log('Test audio toggle - Current mute state:', isMuted);
    toggleMute();
  };

  // Chat functions
  const sendMessage = () => {
    if (!newMessage.trim()) return;

    const now = Date.now();
    if (now - lastMessageTime < 1000) {
      console.log('Rate limiting: Message sent too recently');
      return;
    }

    try {
      MeetingSocket.sendMessage(meetingId, newMessage.trim());
      setNewMessage('');
      setLastMessageTime(now);
      console.log('Message sent successfully');
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const handleKeyPress = (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      sendMessage();
    }
  };

  // Host control functions
  const hostMuteParticipant = (participantId) => {
    console.log('Host muting participant:', participantId);
    MeetingSocket.emit('host-mute-participant', {
      meetingId,
      participantId
    });
  };

  const hostDisableVideo = (participantId) => {
    console.log('Host disabling video for participant:', participantId);
    MeetingSocket.emit('host-disable-video', {
      meetingId,
      participantId
    });
  };

  // Meeting control functions
  const handleLeaveMeeting = () => {
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
    }
    MeetingSocket.leaveMeeting();
    navigate("/dashboard");
  };

  const handleEndMeeting = async () => {
    if (!confirm('Are you sure you want to end this meeting for everyone?')) {
      return;
    }
    
    try {
      console.log('Host ending meeting:', meetingId);
      const response = await MeetingService.endMeeting(meetingId, displayUser.id);
      
      if (response.success) {
        console.log('Meeting ended successfully');
        if (localStream) {
          localStream.getTracks().forEach(track => track.stop());
        }
        MeetingSocket.leaveMeeting();
        navigate("/dashboard");
      } else {
        console.error('Failed to end meeting:', response.message);
        alert('Failed to end meeting: ' + response.message);
      }
    } catch (error) {
      console.error('Error ending meeting:', error);
      alert('Error ending meeting: ' + error.message);
    }
  };

  return {
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
    setIsMuted,
    isVideoOff,
    setIsVideoOff,
    localStream,
    setLocalStream,
    showMediaPrompt,
    setShowMediaPrompt,
    showTroubleshoot,
    mediaAccessFailed,
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
    handleEndMeeting
  };
};

export default useMeetingRoomLogic;