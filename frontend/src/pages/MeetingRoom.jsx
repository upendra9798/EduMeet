import React, { useState, useEffect } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
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
  ArrowLeft,
} from "lucide-react";
import VideoChat from "../components/VideoChat";
import Whiteboard from "../components/Whiteboard";
import HostControls from "../components/HostControls";
import MeetingService from "../services/meetingService";
import MeetingSocket from "../services/meetingSocket";
import WhiteboardService from "../services/whiteboardService";

/**
 * MeetingRoom Component
 * Main meeting interface with video, whiteboard, and controls
 */
const MeetingRoom = ({ user }) => {
  console.log('MeetingRoom: Component rendered with user:', user);
  
  const { meetingId } = useParams();
  console.log('MeetingRoom: meetingId from params:', meetingId);
  
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  console.log('MeetingRoom: Current URL:', window.location.href);
  console.log('MeetingRoom: useParams result:', { meetingId });
  console.log('MeetingRoom: searchParams:', Object.fromEntries(searchParams.entries()));

  // Get display name from URL params or use default user name
  const displayName = searchParams.get("displayName") || user.username;
  console.log('MeetingRoom: Display name:', displayName);
  
  // For testing: Generate unique user ID if multiple tabs/windows
  const testUserId = searchParams.get("testUserId") || user.id;
  
  const displayUser = {
    ...user,
    id: testUserId, // Use test user ID if provided
    username: displayName,
  };
  
  console.log('MeetingRoom: Display user:', displayUser);
  console.log('MeetingRoom: Component fully initialized');

  // Meeting state
  const [meeting, setMeeting] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [joined, setJoined] = useState(false);

  // UI state
  const [activeView, setActiveView] = useState("video"); // 'video' | 'whiteboard' | 'split'
  const [participantsSidebarOpen, setParticipantsSidebarOpen] = useState(false);
  const [chatSidebarOpen, setChatSidebarOpen] = useState(false);
  const [participants, setParticipants] = useState([]);

  // Media controls state
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  
  // Clean start - no test participants
  React.useEffect(() => {
    console.log("MeetingRoom: Component mounted, starting with empty participants");
    setParticipants([]);
  }, []);

  // Chat state
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [listenersSetup, setListenersSetup] = useState(false);
  
  // Monitor participants state changes
  React.useEffect(() => {
    console.log("PARTICIPANTS STATE CHANGED:", participants.length, participants);
  }, [participants]);
  
  // Alternative approach: Use VideoChat's remote participants data
  React.useEffect(() => {
    // Try to sync with VideoChat component after a delay
    const syncWithVideoChat = () => {
      // Look for VideoChat component's remote participants in the global scope
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
    
    const syncInterval = setInterval(syncWithVideoChat, 5000); // Check every 5 seconds
    return () => clearInterval(syncInterval);
  }, [participants]);

  // Media stream state
  const [localStream, setLocalStream] = useState(null);
  const [showMediaPrompt, setShowMediaPrompt] = useState(true);
  const [showTroubleshoot, setShowTroubleshoot] = useState(false);
  const [mediaAccessFailed, setMediaAccessFailed] = useState(false);
  const [lastMessageTime, setLastMessageTime] = useState(0); // Rate limiting for messages

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
      // Cleanup when leaving
      console.log('MeetingRoom: Cleanup - leaving meeting socket');
      MeetingSocket.leaveMeeting();
    };
  }, [meetingId]);

  // Load meeting data and join the socket room
  const loadMeetingAndJoin = async () => {
    try {
      console.log('MeetingRoom: loadMeetingAndJoin started for meetingId:', meetingId);
      setLoading(true);

      // STEP 1: SETUP EVENT LISTENERS FIRST
      // This prevents race conditions where events are received before listeners are ready
      console.log('MeetingRoom: Setting up socket listeners before connection...');
      
      // Test if socket has basic functionality
      console.log('MeetingRoom: Testing socket functionality...');
      console.log('MeetingRoom: Socket object:', MeetingSocket);
      console.log('MeetingRoom: Socket.on function exists?', typeof MeetingSocket.on === 'function');
      console.log('MeetingRoom: Socket connected?', MeetingSocket.connected);
      console.log('MeetingRoom: Socket ID:', MeetingSocket.id);
      
      // Skip setupSocketListeners since we'll set up direct listeners after connection
      console.log('MeetingRoom: Skipping setupSocketListeners - will set up direct listeners after connection');
      
      // Add listeners for ANY event to see what events are actually firing
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
        await MeetingService.joinMeeting(meetingId, user.id);

        // Create whiteboard if host (or get existing one)
        try {
          await WhiteboardService.createWhiteboard({
            meetingId,
            userId: user.id, // Pass user ID for demo mode
            title: `${result.meeting.title} - Whiteboard`,
            canvasWidth: 1920,
            canvasHeight: 1080,
            backgroundColor: "#ffffff"
          });
          console.log("Whiteboard created/exists for meeting");
        } catch (error) {
          // Whiteboard might already exist, which is fine
          console.log("Whiteboard creation:", error.message);
        }

        // STEP 1: ESTABLISH SOCKET CONNECTION
        // This is the new Promise-based approach to prevent "Socket not connected" errors
        console.log(
          "Connecting to meeting socket with user ID:",
          user.id,
          "display name:",
          displayUser.username
        );
        
        try {
          // CRITICAL CHANGE: await ensures socket connection is fully established
          // Before this fix: connect() was called but joinMeeting() ran immediately
          // After this fix: joinMeeting() only runs after connection is confirmed
          await MeetingSocket.connect(displayUser.id);
          console.log("Socket connected successfully");
          
          // STEP 2: SET UP DIRECT LISTENERS AFTER CONNECTION
          console.log("DIRECT: Setting up listeners after connection...");
          
          if (MeetingSocket && MeetingSocket.socket) {
            MeetingSocket.socket.on("meeting-joined", (data) => {
              console.log("DIRECT: meeting-joined received!", data);
              if (data.existingParticipants) {
                const others = data.existingParticipants.filter(p => p.userId !== (displayUser?.id || user?.id));
                const newParticipants = others.map(p => ({
                  socketId: p.socketId,
                  userId: p.userId,
                  displayName: p.displayName,
                  isMuted: false,
                  isVideoOff: false
                }));
                
                console.log("DIRECT: Setting participants from meeting-joined:", newParticipants);
                setParticipants(newParticipants);
              }
            });
            
            MeetingSocket.socket.on("user-joined", (data) => {
              console.log("DIRECT: user-joined received!", data);
              if (data.userId !== (displayUser?.id || user?.id)) {
                setParticipants(prev => {
                  // Check for duplicates by both socketId AND userId
                  const existsBySocket = prev.find(p => p.socketId === data.socketId);
                  const existsByUser = prev.find(p => p.userId === data.userId);
                  
                  if (!existsBySocket && !existsByUser) {
                    const newParticipant = {
                      socketId: data.socketId,
                      userId: data.userId,
                      displayName: data.displayName,
                      isMuted: false,
                      isVideoOff: false
                    };
                    console.log("DIRECT: Adding new participant:", newParticipant);
                    return [...prev, newParticipant];
                  } else {
                    console.log("DIRECT: Participant already exists, skipping");
                    return prev;
                  }
                });
              }
            });
            
            console.log("DIRECT: Direct listeners set up successfully");
            
            // WRAPPER LISTENERS: Add these so MeetingSocket service tracks them
            console.log("WRAPPER: Setting up wrapper listeners for service tracking...");
            // Silent wrapper listeners (no alerts - just for service tracking)
            MeetingSocket.on("participant-removed", (data) => {
              console.log("🗑️ WRAPPER: Participant removed (silent):", data);
              setParticipants(prev => prev.filter(p => p.userId !== data.userId));
            });

            MeetingSocket.on("host-action-success", (data) => {
              console.log("✅ WRAPPER: Host action successful (silent):", data);
            });

            MeetingSocket.on("CUSTOM-PARTICIPANT-REMOVED", (data) => {
              console.log("🎯 WRAPPER: Custom event (silent):", data);
            });

            // Audio/Video status wrapper listeners
            console.log("🎵 REGISTERING: participant-audio-toggled handler");
            MeetingSocket.on("participant-audio-toggled", (data) => {
              console.log("🔊🔊🔊 MAIN HANDLER: Audio toggled received:", data);
              console.log("🔊 Updating participant with socketId:", data.socketId, "to isMuted:", data.isMuted);
              setParticipants(prev => {
                console.log("🔊 Current participants before update:", prev.map(p => ({ socketId: p.socketId, isMuted: p.isMuted })));
                const updated = prev.map(p => 
                  p.socketId === data.socketId 
                    ? { ...p, isMuted: data.isMuted }
                    : p
                );
                console.log("🔊 Updated participants after audio toggle:", updated.map(p => ({ socketId: p.socketId, isMuted: p.isMuted })));
                return updated;
              });
            });
            console.log("🎵 REGISTERED: participant-audio-toggled handler completed");
            
            // IMMEDIATE CHECK: Verify handler was registered
            console.log("🔍 IMMEDIATE CHECK: Handlers for participant-audio-toggled:", MeetingSocket.eventHandlers?.['participant-audio-toggled']?.length || 0);
            console.log("🔍 IMMEDIATE CHECK: All registered events:", Object.keys(MeetingSocket.eventHandlers || {}));
            
            // WRAPPER HOST CONTROL LISTENERS
            MeetingSocket.on("host-control-audio", (data) => {
              console.log("🚨 WRAPPER: Host control audio received:", data);
              if (data.isForceMuted) {
                console.log("🔇 WRAPPER: Force muting local participant");
                setIsMuted(true);
                if (localStream) {
                  localStream.getAudioTracks().forEach(track => {
                    track.enabled = false;
                  });
                }
                alert(`🔇 You have been muted by the host`);
              }
            });

            MeetingSocket.on("host-control-video", (data) => {
              console.log("🚨 WRAPPER: Host control video received:", data);
              if (data.isVideoDisabled) {
                console.log("📹 WRAPPER: Force disabling local participant video");
                setIsVideoOff(true);
                if (localStream) {
                  localStream.getVideoTracks().forEach(track => {
                    track.enabled = false;
                  });
                }
                alert(`📹 Your video has been disabled by the host`);
              }
            });

            MeetingSocket.on("participant-video-toggled", (data) => {
              console.log("📹 WRAPPER: Video toggled received:", data);
              setParticipants(prev => {
                const updated = prev.map(p => 
                  p.socketId === data.socketId 
                    ? { ...p, isVideoOff: data.isVideoOff }
                    : p
                );
                console.log("📹 Updated participants after video toggle:", updated.map(p => ({ socketId: p.socketId, isVideoOff: p.isVideoOff })));
                return updated;
              });
            });

            // ACTIVE wrapper listener for removed-from-meeting (backup handler)
            MeetingSocket.on("removed-from-meeting", (data) => {
              console.log("🚨 WRAPPER: Processing removal from meeting:", data);
              
              // Clean up and redirect
              setParticipants([]);
              setMeeting(null);
              MeetingSocket.leaveMeeting();
              
              alert(`You have been removed from the meeting by the host`);
              
              setTimeout(() => {
                navigate("/dashboard");
              }, 1000);
            });
            
          } else {
            console.error("DIRECT: Socket not available after connection");
          }
          
          // STEP 3: JOIN THE MEETING
          // Now safe to join because socket is guaranteed to be connected
          console.log("Joining meeting:", meetingId);
          MeetingSocket.joinMeeting(meetingId, displayUser.username);
          
          console.log('MeetingRoom: Meeting joined successfully, waiting for participants...');
          
          // Add a backup check for participants after 3 seconds
          setTimeout(() => {
            console.log('MeetingRoom: Backup participant check after 3 seconds...');
            console.log('MeetingRoom: Current participants state:', participants);
            
            if (participants.length === 0) {
              console.log('MeetingRoom: No participants detected, requesting manually...');
              MeetingSocket.emit('request-participants', { meetingId });
            }
          }, 3000);
          
        } catch (socketError) {
          // STEP 4: ERROR HANDLING
          // If socket connection fails, show user-friendly error instead of technical details
          console.error("Failed to connect to meeting socket:", socketError);
          throw new Error("Unable to connect to meeting server. Please check your connection and try again.");
        }

        setJoined(true);
        console.log('MeetingRoom: Successfully joined meeting, joined state set to true');
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
    console.log("�🚀🚀 SETUP SOCKET LISTENERS CALLED! 🚀🚀🚀");
    console.log("�🔧 MeetingRoom: Setting up socket listeners...");
    console.log("🔧 MeetingRoom: Socket connected:", MeetingSocket.isConnected);

    // TEMPORARILY COMMENTED OUT: Clear any existing listeners to avoid duplicates
    // MeetingSocket.off("meeting-joined");
    // MeetingSocket.off("user-joined");
    // MeetingSocket.off("user-left");
    // MeetingSocket.off("meeting-error");
    // MeetingSocket.off("message-received");
    // MeetingSocket.off("removed-from-meeting");
    // MeetingSocket.off("participant-removed");
    // MeetingSocket.off("host-control-audio");
    // MeetingSocket.off("host-control-video");
    // MeetingSocket.off("participant-audio-controlled");
    // MeetingSocket.off("participant-video-controlled");
    // MeetingSocket.off("host-action-success");
    // MeetingSocket.off("participant-audio-toggled");
    // MeetingSocket.off("participant-video-toggled");
    
    console.log("🔧 MeetingRoom: Cleared existing listeners, setting up new ones...");
    console.log("🔧 MeetingRoom: Socket connected?", MeetingSocket.isConnected);
    console.log("🔧 MeetingRoom: Socket ID:", MeetingSocket.id);

    MeetingSocket.on("meeting-joined", (data) => {
      console.log("🎯 Meeting joined successfully!");
      console.log("🎯 Existing participants:", data.existingParticipants);
      
      const currentUserId = displayUser?.id || user?.id;
      const otherParticipants = [];
      
      // Add only OTHER participants (not the current user)
      if (data.existingParticipants && Array.isArray(data.existingParticipants)) {
        data.existingParticipants.forEach(p => {
          // Skip current user - they're shown in the "You" section
          if (p.userId !== currentUserId) {
            otherParticipants.push({
              socketId: p.socketId,
              userId: p.userId,
              displayName: p.displayName || `User ${p.userId.slice(-4)}`,
              isMuted: false,
              isVideoOff: false
            });
          }
        });
      }
      
      console.log("🎯 Setting other participants:", otherParticipants);
      setParticipants(otherParticipants);
    });

    MeetingSocket.on("user-joined", (data) => {
      console.log("👤 New user joined:", data);
      
      if (!data?.socketId || !data?.userId) {
        console.log("👤 Invalid user-joined data");
        return;
      }
      
      // Skip if this is the current user 
      const currentUserId = displayUser?.id || user?.id;
      if (data.userId === currentUserId) {
        console.log("👤 Skipping current user");
        return;
      }
      
      const newParticipant = {
        socketId: data.socketId,
        userId: data.userId,
        displayName: data.displayName || `User ${data.userId.slice(-4)}`,
        isMuted: false,
        isVideoOff: false
      };
      
      setParticipants(prev => {
        // Check if already exists
        if (prev.find(p => p.socketId === data.socketId)) {
          console.log("👤 Participant already exists");
          return prev;
        }
        
        console.log("👤 Adding new participant:", newParticipant);
        return [...prev, newParticipant];
      });
    });    console.log("🔧 MeetingRoom: Event listeners registered successfully");
    console.log("🔧 MeetingRoom: Current participants state before events:", participants.length);

    MeetingSocket.socket.on("user-left", (data) => {
      console.log("User left:", data);
      setParticipants((prev) =>
        prev.filter((p) => p.socketId !== data.socketId)
      );
    });

    MeetingSocket.socket.on("meeting-error", (error) => {
      console.error("🚨 Meeting error from backend:", error);
      setError(error.message);
      // Log host control errors (no alert)
      if (error.message.includes('host') || error.message.includes('Host')) {
        console.error(`Host Control Error: ${error.message}`);
      }
    });

    // Chat message listeners
    MeetingSocket.socket.on("message-received", (message) => {
      try {
        console.log("MeetingRoom: Received message from socket:", message);
        
        // Validate message structure to prevent crashes
        if (!message || typeof message !== 'object') {
          console.error("Invalid message received:", message);
          return;
        }
        
        // Add received message to chat (mark as not own)
        const receivedMessage = {
          id: message.id || Date.now(),
          text: message.text || '',
          sender: message.sender || 'Unknown',
          senderId: message.senderId || '',
          timestamp: message.timestamp || new Date().toISOString(),
          isOwn: false,
        };
        
        console.log(
          "MeetingRoom: Adding received message to state:",
          receivedMessage
        );
        
        setMessages((prev) => {
          // Prevent duplicate messages
          const isDuplicate = prev.some(msg => msg.id === receivedMessage.id);
          if (isDuplicate) {
            console.log("Duplicate message ignored:", receivedMessage.id);
            return prev;
          }
          
          const updated = [...prev, receivedMessage];
          console.log(
            "MeetingRoom: Updated messages with received message:",
            updated.length
          );
          return updated;
        });
        
      } catch (error) {
        console.error("Error processing received message:", error);
        
      }
    });

    // Host control event listeners - Multiple handlers for reliability
    MeetingSocket.socket.on("removed-from-meeting", (data) => {
      console.log("🚨 DIRECT: YOU have been removed from meeting by host:", data);
      handleRemovalFromMeeting(data.message);
    });

    // Backup handler with custom event
    MeetingSocket.socket.on("FORCE-DISCONNECT", (data) => {
      console.log("🚨 FORCE-DISCONNECT: Processing forced removal:", data);
      handleRemovalFromMeeting(data.message);
    });

    // Common removal handler
    const handleRemovalFromMeeting = (message) => {
      console.log("🚫 Processing removal from meeting");
      
      // Show notification
      alert(`🚫 REMOVED FROM MEETING\n\n${message || "You have been removed from the meeting"}\n\nYou will be redirected to the dashboard.`);
      
      // Clean up local state immediately
      setParticipants([]);
      setMeeting(null);
      
      // Leave meeting socket
      MeetingSocket.leaveMeeting();
      
      // Navigate with delay to ensure cleanup
      setTimeout(() => {
        navigate("/dashboard");
      }, 1000);
    };

    // Debug socket connection
    console.log("🔍 Frontend socket info:", {
      socketId: MeetingSocket.socket?.id,
      connected: MeetingSocket.socket?.connected,
      isConnected: MeetingSocket.isConnected
    });

    // Test event listeners - register directly
    console.log("🔧 Registering test event handlers...");
    // Test event listeners (no alerts - just logging)
    MeetingSocket.on("test-event", (data) => {
      console.log("🧪 UI HANDLER: Test event received:", data);
    });

    MeetingSocket.on("test-backend-response", (data) => {
      console.log("🧪 UI HANDLER: Backend response received:", data);
    });



    // DIRECT SOCKET APPROACH - Test basic connectivity first
    console.log("🔧 Testing direct socket connectivity...", {
      socketExists: !!MeetingSocket.socket,
      socketId: MeetingSocket.socket?.id,
      socketConnected: MeetingSocket.socket?.connected
    });

    // Test event listeners
    MeetingSocket.on('test-backend-response', (data) => {
      console.log("🧪 TEST: Response from backend:", data);
    });

    MeetingSocket.on('debug-room-response', (data) => {
      console.log("🧪 ROOM RESPONSE:", data);
    });

    // CRITICAL TEST: Add explicit listeners for the audio/video events
    MeetingSocket.on('participant-audio-toggled', (data) => {
      console.log("🎯 WRAPPER: participant-audio-toggled received:", data);
    });

    MeetingSocket.socket.on('participant-audio-toggled', (data) => {
      console.log("🎯 DIRECT: participant-audio-toggled received:", data);
    });

    MeetingSocket.on('participant-video-toggled', (data) => {
      console.log("🎯 WRAPPER: participant-video-toggled received:", data);
    });

    MeetingSocket.socket.on('participant-video-toggled', (data) => {
      console.log("🎯 DIRECT: participant-video-toggled received:", data);
    });

    // Test direct emission (should always work if socket is connected)
    MeetingSocket.on('participant-audio-toggled-direct', (data) => {
      console.log("🎯🎯🎯 WRAPPER DIRECT EMIT: participant-audio-toggled-direct received:", data);
    });

    MeetingSocket.socket.on('participant-audio-toggled-direct', (data) => {
      console.log("🎯🎯🎯 SOCKET DIRECT EMIT: participant-audio-toggled-direct received:", data);
    });

    // Debug: Check the current state of event handlers
    console.log("🔍 MeetingSocket eventHandlers state:", Object.keys(MeetingSocket.eventHandlers || {}));
    console.log("🔍 Handlers for participant-audio-toggled-direct:", MeetingSocket.eventHandlers?.['participant-audio-toggled-direct']?.length || 0);

    // Test with ANY event first
    MeetingSocket.socket.onAny((eventName, ...args) => {
      console.log("� DIRECT: ANY EVENT RECEIVED:", eventName, args);
      // No alerts - just monitoring events
    });

    // Additional event monitoring for audio/video events
    MeetingSocket.socket.onAny((eventName, ...args) => {
      if (eventName.includes('audio') || eventName.includes('video')) {
        console.log("🎯🎯🎯 AUDIO/VIDEO EVENT RECEIVED:", eventName, args);
      }
    });

    // Also register specific handlers
    // NOTE: Removed duplicate direct handlers - wrapper listeners handle these events

    MeetingSocket.socket.on("host-control-audio", (data) => {
      console.log("🚨🚨🚨 MeetingRoom: HOST CONTROLLED YOUR AUDIO:", data);
      alert(`🚨 HOST CONTROL: Your audio is being controlled!`);
      
      if (data.isForceMuted) {
        console.log("🔇 FORCE MUTING LOCAL PARTICIPANT");
        // Force mute the local participant
        setIsMuted(true);
        if (localStream) {
          localStream.getAudioTracks().forEach(track => {
            track.enabled = false;
            console.log("🔇 Disabled audio track:", track);
          });
        }
        alert(`🔇 You have been muted by the host`);
        console.log(`🔇 You have been muted by the host`);
      }
    });

    MeetingSocket.socket.on("host-control-video", (data) => {
      console.log("🚨🚨🚨 MeetingRoom: HOST CONTROLLED YOUR VIDEO:", data);
      alert(`🚨 HOST CONTROL: Your video is being controlled!`);
      
      if (data.isVideoDisabled) {
        console.log("📹 FORCE DISABLING LOCAL PARTICIPANT VIDEO");
        // Force disable video for the local participant
        setIsVideoOff(true);
        if (localStream) {
          localStream.getVideoTracks().forEach(track => {
            track.enabled = false;
            console.log("📹 Disabled video track:", track);
          });
        }
        alert(`📹 Your video has been disabled by the host`);
        console.log(`📹 Your video has been disabled by the host`);
      }
    });

    MeetingSocket.socket.on("participant-audio-controlled", (data) => {
      console.log("MeetingRoom: Participant audio controlled by host:", data);
      // Update participant state to reflect host control
      setParticipants(prev => prev.map(p => 
        p.userId === data.userId 
          ? { ...p, isMuted: data.isForceMuted, controlledByHost: true }
          : p
      ));
    });

    MeetingSocket.socket.on("participant-video-controlled", (data) => {
      console.log("MeetingRoom: Participant video controlled by host:", data);
      // Update participant state to reflect host control
      setParticipants(prev => prev.map(p => 
        p.userId === data.userId 
          ? { ...p, isVideoOff: data.isVideoDisabled, videoControlledByHost: true }
          : p
      ));
    });

    MeetingSocket.socket.on("host-action-success", (data) => {
      console.log("MeetingRoom: Host action successful:", data);
      
      // Provide user feedback based on the action
      if (data.action === 'mute-participant') {
        console.log(`✅ Successfully muted participant ${data.targetUserId}`);
        alert(`✅ Participant has been muted!`);
      } else if (data.action === 'disable-video') {
        console.log(`✅ Successfully disabled video for participant ${data.targetUserId}`);
        alert(`✅ Participant's video has been disabled!`);
      } else if (data.action === 'remove-participant') {
        console.log(`✅ Successfully removed participant ${data.targetUserId}`);
        alert(`✅ Participant has been removed from the meeting!`);
      }
    });

    // DIRECT HOST CONTROL LISTENERS (backup)
    MeetingSocket.socket.on("host-control-audio-direct", (data) => {
      console.log("🚨🚨🚨 DIRECT: Host control audio received:", data);
      alert(`🚨 DIRECT HOST CONTROL: Your audio!`);
      if (data.isForceMuted) {
        setIsMuted(true);
        if (localStream) {
          localStream.getAudioTracks().forEach(track => {
            track.enabled = false;
          });
        }
      }
    });

    MeetingSocket.socket.on("host-control-video-direct", (data) => {
      console.log("🚨🚨🚨 DIRECT: Host control video received:", data);
      alert(`🚨 DIRECT HOST CONTROL: Your video!`);
      if (data.isVideoDisabled) {
        setIsVideoOff(true);
        if (localStream) {
          localStream.getVideoTracks().forEach(track => {
            track.enabled = false;
          });
        }
      }
    });

    // NOTE: Removed duplicate direct audio/video listeners - wrapper listeners handle these
  };

  // Handle leaving the meeting
  const handleLeaveMeeting = async () => {
    if (confirm("Are you sure you want to leave the meeting?")) {
      MeetingSocket.leaveMeeting();
      navigate("/dashboard");
    }
  };

  // Initialize media stream (optional - only when explicitly requested)
  // Media access is now completely optional and only happens when user clicks "Enable Camera & Microphone"
  // This prevents automatic permission requests that could block meeting access

  // Cleanup stream when component unmounts (but not when switching views)
  useEffect(() => {
    return () => {
      if (localStream) {
        console.log("MeetingRoom: Component unmounting - cleaning up media stream");
        localStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  // Debug effect to track view changes
  useEffect(() => {
    console.log('MeetingRoom: Active view changed to:', activeView, 'localStream available:', !!localStream);
  }, [activeView, localStream]);

  // Auto-hide media prompt after 2 seconds if no local stream
  useEffect(() => {
    if (!localStream && showMediaPrompt) {
      const timer = setTimeout(() => {
        setShowMediaPrompt(false);
      }, 2000);
      
      return () => clearTimeout(timer);
    }
  }, [localStream, showMediaPrompt]);



  // Media access with progressive fallbacks
  const requestMediaAccess = async () => {
    console.log('MeetingRoom: Media access requested...');
    setShowMediaPrompt(true);

    // Check if mediaDevices is supported
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setShowMediaPrompt(false);
      alert("Your browser doesn't support camera/microphone access. Please use Chrome, Firefox, or Safari.");
      return;
    }

    // Progressive fallback constraints (from most ideal to most basic)
    const constraints = [
      // Attempt 1: High quality constraints
      {
        video: {
          width: { ideal: 640, max: 1280 },
          height: { ideal: 480, max: 720 },
          frameRate: { ideal: 15, max: 30 }
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      },
      // Attempt 2: Simplified video constraints
      {
        video: {
          width: { ideal: 320 },
          height: { ideal: 240 },
          facingMode: 'user'
        },
        audio: true
      },
      // Attempt 3: Basic constraints
      {
        video: true,
        audio: true
      },
      // Attempt 4: Audio only (video might be blocked)
      {
        video: false,
        audio: true
      }
    ];

    for (let i = 0; i < constraints.length; i++) {
      try {
        console.log(`MeetingRoom: Attempting media access with constraint set ${i + 1}:`, constraints[i]);
        const stream = await navigator.mediaDevices.getUserMedia(constraints[i]);
        
        setLocalStream(stream);
        setShowMediaPrompt(false);
        console.log(`MeetingRoom: Media stream initialized with constraint set ${i + 1}:`, stream);
        
        // Log what we actually got
        const videoTracks = stream.getVideoTracks();
        const audioTracks = stream.getAudioTracks();
        console.log(`MeetingRoom: Got ${videoTracks.length} video tracks, ${audioTracks.length} audio tracks`);
        
        if (videoTracks.length > 0) {
          console.log('Video track settings:', videoTracks[0].getSettings());
        }
        
        return; // Success, exit function
      } catch (error) {
        console.error(`MeetingRoom: Constraint set ${i + 1} failed:`, error.name, error.message);
        
        // If this is the last attempt, handle the error
        if (i === constraints.length - 1) {
          setShowMediaPrompt(false);
          setMediaAccessFailed(true);
          
          // Show troubleshooting dialog
          setShowTroubleshoot(true);
          return;
        }
        
        // Continue to next constraint set
        continue;
      }
    }
  };

  // Handle retry from troubleshooting component
  const handleMediaRetry = () => {
    setShowTroubleshoot(false);
    setMediaAccessFailed(false);
    setShowMediaPrompt(true);
    // Reset any previous errors
    requestMediaAccess();
  };

  // Handle skip camera access (audio only mode)
  const handleSkipCamera = async () => {
    setShowTroubleshoot(false);
    setMediaAccessFailed(false);
    setShowMediaPrompt(false);
    
    try {
      // Try to get audio only
      const audioStream = await navigator.mediaDevices.getUserMedia({
        video: false,
        audio: true
      });
      setLocalStream(audioStream);
      console.log("MeetingRoom: Audio-only stream initialized");
    } catch (error) {
      console.log("MeetingRoom: Even audio access failed, continuing without media");
      // Continue without any media - user can still participate via chat and whiteboard
    }
  };

  // Handle ending the meeting (host only)
  const handleEndMeeting = async () => {
    if (confirm("Are you sure you want to end this meeting for everyone?")) {
      try {
        await MeetingService.endMeeting(meetingId, user.id);
        navigate("/dashboard");
      } catch (err) {
        alert("Failed to end meeting: " + err.message);
      }
    }
  };

  // Host control functions
  const hostMuteParticipant = (participantId) => {
    if (!isHost) {
      alert("Only the host can mute participants");
      return;
    }
    
    const participant = participants.find(p => p.userId === participantId);
    const participantName = participant?.displayName || 'participant';
    
    console.log("🔇 HOST: Force muting participant:", participantId);
    alert(`🔇 Force muting ${participantName}...`);
    
    MeetingSocket.socket.emit('host-mute-participant', {
      meetingId: meetingId,
      targetUserId: participantId,
      isForceMuted: true  // Force mute the participant
    });
  };

  const hostDisableVideo = (participantId) => {
    if (!isHost) {
      alert("Only the host can disable participant video");
      return;
    }
    
    const participant = participants.find(p => p.userId === participantId);
    const participantName = participant?.displayName || 'participant';
    
    console.log("📹 HOST: Force disabling video for participant:", participantId);
    alert(`📹 Force disabling video for ${participantName}...`);
    
    MeetingSocket.socket.emit('host-disable-video', {
      meetingId: meetingId,
      targetUserId: participantId,
      isVideoDisabled: true  // Force disable video
    });
  };

  // Test function to verify socket communication and room membership
  const testAudioToggle = () => {
    console.log("🧪 TEST: Starting comprehensive communication test");
    
    if (!MeetingSocket?.socket?.connected) {
      console.error("🧪 TEST: Socket not connected");
      return;
    }
    
    console.log("🧪 TEST: Socket details:", {
      socketId: MeetingSocket.socket.id,
      connected: MeetingSocket.socket.connected,
      meetingId: meetingId
    });
    
    // Test 1: Basic communication
    console.log("🧪 TEST 1: Testing basic communication");
    MeetingSocket.socket.emit("test-frontend-event", { message: "Testing from frontend" });
    
    // Test 2: Request room info
    setTimeout(() => {
      console.log("🧪 TEST 2: Requesting room membership info");
      MeetingSocket.socket.emit("debug-room-info", { meetingId: meetingId });
    }, 500);
    
    // Test 3: Audio toggle
    setTimeout(() => {
      console.log("🧪 TEST 3: Testing audio toggle");
      const testData = {
        meetingId: meetingId,
        isMuted: !isMuted
      };
      console.log("🧪 TEST: Sending toggle-audio event:", testData);
      MeetingSocket.socket.emit("toggle-audio", testData);
    }, 1000);
  };

  // Media control functions
  const toggleMute = () => {
    console.log(
      "toggleMute called - isMuted:",
      isMuted,
      "localStream:",
      localStream
    );
    
    // Always toggle the muted state
    const newMutedState = !isMuted;
    setIsMuted(newMutedState);
    console.log("Muted state changed to:", newMutedState);
    
    // Apply to local stream if available
    if (localStream) {
      const audioTracks = localStream.getAudioTracks();
      console.log("Audio tracks found:", audioTracks.length);
      audioTracks.forEach((track, index) => {
        console.log(`Audio track ${index} - enabled before:`, track.enabled);
        track.enabled = !newMutedState; // If muted, disable tracks; if unmuted, enable tracks
        console.log(`Audio track ${index} - enabled after:`, track.enabled);
      });
    } else {
      console.log("No local stream - state change only, will apply when stream is available");
    }
    
    // Always broadcast audio status to other participants
    if (MeetingSocket?.socket?.connected) {
      const audioData = {
        meetingId,
        isMuted: newMutedState
      };
      console.log("🔊 Frontend: Emitting toggle-audio to backend:", audioData);
      MeetingSocket.socket.emit("toggle-audio", audioData);
      console.log("✅ Audio toggle status sent to server");
    } else {
      console.error("❌ Cannot emit audio toggle - socket not connected:", {
        socket: MeetingSocket?.socket,
        connected: MeetingSocket?.socket?.connected
      });
    }
  };

  const toggleVideo = () => {
    console.log(
      "toggleVideo called - isVideoOff:",
      isVideoOff,
      "localStream:",
      localStream
    );
    
    // Always toggle the video state
    const newVideoOffState = !isVideoOff;
    setIsVideoOff(newVideoOffState);
    console.log("Video off state changed to:", newVideoOffState);
    
    // Apply to local stream if available
    if (localStream) {
      const videoTracks = localStream.getVideoTracks();
      console.log("Video tracks found:", videoTracks.length);
      videoTracks.forEach((track, index) => {
        console.log(`Video track ${index} - enabled before:`, track.enabled);
        track.enabled = !newVideoOffState; // If video off, disable tracks; if video on, enable tracks
        console.log(`Video track ${index} - enabled after:`, track.enabled);
      });
    } else {
      console.log("No local stream - state change only, will apply when stream is available");
    }
    
    // Always broadcast video status to other participants
    if (MeetingSocket?.socket?.connected) {
      const videoData = {
        meetingId,
        isVideoOff: newVideoOffState
      };
      console.log("📹 Frontend: Emitting toggle-video to backend:", videoData);
      MeetingSocket.socket.emit("toggle-video", videoData);
      console.log("✅ Video toggle status sent to server");
    } else {
      console.error("❌ Cannot emit video toggle - socket not connected:", {
        socket: MeetingSocket?.socket,
        connected: MeetingSocket?.socket?.connected
      });
    }
  };

  // Chat functions
  const sendMessage = () => {
    try {
      console.log("MeetingRoom sendMessage called:");
      console.log("- newMessage:", newMessage.trim());
      console.log("- joined:", joined);
      console.log("- meetingId:", meetingId);
      console.log("- user:", user);

      // Rate limiting: prevent sending messages too quickly (max 1 per second)
      const now = Date.now();
      if (now - lastMessageTime < 1000) {
        console.warn("Rate limit: Message sent too quickly, ignoring");
        return;
      }

      if (newMessage.trim() && joined) {
        setLastMessageTime(now);
        const message = {
          id: Date.now(),
          text: newMessage.trim(),
          sender: displayUser.username || 'Anonymous',
          senderId: displayUser.id || '',
          timestamp: new Date().toISOString(), // Convert to ISO string for proper serialization
          isOwn: true,
        };

        console.log("MeetingRoom: Creating message object:", message);
        
        // Add to local messages immediately
        setMessages((prev) => {
          const updated = [...prev, message];
          console.log("MeetingRoom: Updated local messages:", updated.length);
          return updated;
        });
        
        setNewMessage("");

        // Send via socket to other participants
        console.log("MeetingRoom: Sending via socket to meeting:", meetingId);
        console.log(
          "MeetingRoom: Socket connection state:",
          MeetingSocket.isConnected
        );
        console.log("MeetingRoom: Socket meetingId:", MeetingSocket.meetingId);

        MeetingSocket.sendMessage(meetingId, message);
        console.log("MeetingRoom: sendMessage call completed");
        
      } else {
        console.warn("MeetingRoom: Cannot send message - conditions not met:");
        console.warn("- newMessage valid:", !!newMessage.trim());
        console.warn("- joined:", joined);
      }
      
    } catch (error) {
      console.error("Error in sendMessage:", error);
      // Reset message input on error to prevent stuck state
      setNewMessage("");
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Check if current user is the host
  const isHost =
    meeting && (meeting.host._id === user.id || meeting.host === user.id);

  console.log('MeetingRoom: Render check - loading:', loading, 'error:', error, 'joined:', joined, 'meeting:', meeting);
  console.log('MeetingRoom: isHost:', isHost);

  // TEMPORARY: Simple test render to see if component stays mounted
  if (meetingId === 'test-simple') {
    return (
      <div className="h-screen bg-green-500 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg text-center">
          <h1 className="text-2xl font-bold text-green-800 mb-4">✅ Meeting Room Component Works!</h1>
          <p className="text-gray-600 mb-4">Meeting ID: {meetingId}</p>
          <p className="text-gray-600 mb-4">User: {user.username}</p>
          <button 
            onClick={() => navigate('/dashboard')}
            className="bg-blue-500 text-white px-4 py-2 rounded"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    console.log('MeetingRoom: Rendering loading screen');
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 flex items-center justify-center">
        <div className="text-center">
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
                className="w-2 h-2 bg-pink-400 rounded-full animate-pulse"
                style={{ animationDelay: "0.4s" }}
              ></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    console.log('MeetingRoom: Rendering error screen with error:', error);
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-900 via-gray-900 to-red-800 flex items-center justify-center p-4">
        <div className="bg-white/95 backdrop-blur-lg p-10 rounded-3xl shadow-2xl max-w-md w-full border border-red-200">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">⚠️</span>
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

  console.log('MeetingRoom: Rendering main meeting room interface');
  
  return (
    <div className="h-screen bg-gradient-to-br from-gray-900 via-slate-800 to-gray-900 flex flex-col">
      {/* Top Bar */}
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
              <VideoIcon className="w-4 h-4 text-white" />
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
              <VideoIcon className="w-3 h-3 mr-1" />
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

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Main View */}
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
              {/* Overlay for media access when no local stream - positioned at bottom to show other participants */}
              {!localStream && showMediaPrompt && (
                <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-10 animate-fade-in">
                  <div className="text-center p-6 bg-gray-900/95 backdrop-blur-lg rounded-xl border border-gray-700 shadow-2xl max-w-md">
                    <div className="w-12 h-12 mx-auto mb-3 bg-blue-500 rounded-full flex items-center justify-center">
                      <VideoIcon className="w-6 h-6" />
                    </div>
                    <h3 className="text-lg font-semibold mb-2 text-white">Enable Your Camera & Microphone</h3>
                    <p className="text-gray-300 mb-4 text-sm">
                      You can see other participants. Click below to share your camera and microphone.
                    </p>
                    <button
                      onClick={requestMediaAccess}
                      className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg font-medium transition-colors text-sm"
                    >
                      Enable Media
                    </button>
                  </div>
                </div>
              )}

              {/* Camera access error message */}
              {showTroubleshoot && (
                <div className="absolute inset-0 bg-black/80 backdrop-blur-sm z-20 flex items-center justify-center p-4">
                  <div className="w-full max-w-md bg-white rounded-lg p-6 text-center">
                    <h3 className="text-lg font-semibold mb-4">Camera Access Failed</h3>
                    <p className="text-gray-600 mb-4">
                      Unable to access camera/microphone. Please check your browser permissions.
                    </p>
                    <div className="flex space-x-3">
                      <button
                        onClick={handleMediaRetry}
                        className="flex-1 bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
                      >
                        Try Again
                      </button>
                      <button
                        onClick={handleSkipCamera}
                        className="flex-1 bg-gray-300 text-gray-700 px-4 py-2 rounded hover:bg-gray-400"
                      >
                        Skip
                      </button>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Small floating button when prompt is hidden */}
              {!localStream && !showMediaPrompt && !showTroubleshoot && (
                <div className="absolute bottom-4 right-4 z-10">
                  <button
                    onClick={() => setShowMediaPrompt(true)}
                    className="bg-blue-500 hover:bg-blue-600 text-white p-3 rounded-full shadow-lg transition-all hover:scale-110"
                    title="Enable Camera & Microphone"
                  >
                    <VideoIcon className="w-5 h-5" />
                  </button>
                </div>
              )}
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
                      <VideoIcon className="w-6 h-6 mx-auto mb-2 text-white" />
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
                      <VideoIcon className="w-4 h-4" />
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

        {/* Participants Sidebar */}
        {participantsSidebarOpen && (
          <aside className="w-96 bg-black/40 backdrop-blur-lg text-white border-l border-white/10">
            <div className="p-6">
              {/* Sidebar Header */}
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold">Participants</h3>
                <button
                  onClick={() => setParticipantsSidebarOpen(false)}
                  className="p-2 hover:bg-white/10 rounded-xl transition-colors"
                >
                  ✕
                </button>
              </div>

              {/* Participants Section */}
              <div className="mb-8">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-lg font-semibold text-blue-300">
                    Participants
                  </h4>
                  <span className="bg-blue-500/20 text-blue-300 px-3 py-1 rounded-full text-sm font-medium">
                    {participants.length + 1}
                  </span>
                </div>
                
                {/* Debug Info */}
                <div className="text-xs text-gray-400 mb-2 p-2 bg-gray-800 rounded">
                  <div>📊 Debug Info:</div>
                  <div>Participants in state: {participants.length}</div>
                  <div>Participants data: {JSON.stringify(participants.map(p => ({ userId: p.userId, socketId: p.socketId?.slice(-4), displayName: p.displayName })))}</div>
                  <div>Current user ID: {displayUser.id}</div>
                  <div>Is Host: {isHost ? 'Yes' : 'No'}</div>
                  <div>Socket connected: {MeetingSocket.isConnected ? 'Yes' : 'No'}</div>
                  <button 
                    onClick={() => console.log('Current participants:', participants)}
                    className="bg-blue-500 text-white px-2 py-1 rounded text-xs mt-1 mr-1"
                  >
                    Log Participants
                  </button>
                  <button 
                    onClick={() => {
                      console.log('Manual sync attempt...');
                      // Manually emit a request for current participants
                      MeetingSocket.emit('get-participants', { meetingId });
                      
                      // Also try to get from VideoChat component data
                      console.log('Checking VideoChat remote participants...');
                      
                      // Add a fake participant to test if UI updates
                      const fakeParticipant = {
                        socketId: 'manual-sync-' + Date.now(),
                        userId: 'manual-user-' + Date.now(),
                        displayName: 'Manual Sync Test',
                        isMuted: false,
                        isVideoOff: false
                      };
                      
                      setParticipants(prev => [...prev, fakeParticipant]);
                      console.log('Added fake participant for testing:', fakeParticipant);
                    }}
                    className="bg-orange-500 text-white px-2 py-1 rounded text-xs mt-1"
                  >
                    Manual Sync
                  </button>
                </div>

                <div className="space-y-3 max-h-40 overflow-y-auto">
                  {/* Current User */}
                  <div className="flex items-center space-x-3 p-3 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-xl border border-blue-500/30">
                    <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center font-bold">
                      {displayUser.username.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <span className="font-medium">
                          {displayUser.username}
                        </span>
                        <span className="text-xs text-blue-300">(You)</span>
                      </div>
                      {isHost && (
                        <span className="text-xs bg-gradient-to-r from-yellow-500 to-orange-500 px-2 py-1 rounded-full text-white font-medium">
                          Host
                        </span>
                      )}
                    </div>
                    <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
                  </div>

                  {/* Other Participants */}
                  {participants
                    .filter((participant, index, self) => 
                      // Remove duplicates by socketId
                      index === self.findIndex(p => p.socketId === participant.socketId)
                    )
                    .map((participant, index) => (
                    <div
                      key={`participant-${participant.socketId}-${index}`}
                      className="flex items-center space-x-3 p-3 bg-white/5 rounded-xl border border-white/10 hover:bg-white/10 transition-colors"
                    >
                      <div className="w-10 h-10 bg-gradient-to-r from-gray-500 to-gray-600 rounded-full flex items-center justify-center font-bold text-sm">
                        {participant.displayName.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1">
                        <span className="font-medium">
                          {participant.displayName}
                        </span>
                        {(participant.userId === user.id || participant.userId === displayUser.id) && (
                          <span className="text-xs text-gray-400 ml-2">
                            (Your other session)
                          </span>
                        )}
                      </div>
                      
                      {/* Individual Participant Controls - Only show if current user is host */}
                      {isHost && participant.userId !== user.id && participant.userId !== displayUser.id && (
                        <div className="flex items-center space-x-1">
                          {/* Mute/Unmute Button */}
                          <button
                            onClick={() => {
                              hostMuteParticipant(participant.userId);
                            }}
                            className="p-1 rounded-full bg-red-500/20 hover:bg-red-500/40 transition-colors"
                            title="Force mute participant"
                          >
                            <svg className="w-3 h-3 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM15.657 6.343a1 1 0 010 1.414L13.414 10l2.243 2.243a1 1 0 11-1.414 1.414L12 11.414l-2.243 2.243a1 1 0 01-1.414-1.414L10.586 10 8.343 7.757a1 1 0 011.414-1.414L12 8.586l2.243-2.243a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          </button>
                          
                          {/* Disable Video Button */}
                          <button
                            onClick={() => {
                              hostDisableVideo(participant.userId);
                            }}
                            className="p-1 rounded-full bg-orange-500/20 hover:bg-orange-500/40 transition-colors"
                            title="Force disable video"
                          >
                            <svg className="w-3 h-3 text-orange-400" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z" />
                              <path stroke="currentColor" strokeWidth="2" d="M4 14l8-8m0 8L4 6" />
                            </svg>
                          </button>
                          
                          {/* Remove Participant Button */}
                          <button
                            onClick={() => {
                              if (confirm(`Remove ${participant.displayName} from the meeting?`)) {
                                console.log('Removing participant:', participant.userId);
                                MeetingSocket.removeParticipant(participant.userId);
                              }
                            }}
                            className="p-1 rounded-full bg-gray-500/20 hover:bg-gray-500/40 transition-colors"
                            title="Remove from meeting"
                          >
                            <svg className="w-3 h-3 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                            </svg>
                          </button>
                        </div>
                      )}
                      
                      <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Host Controls Section */}
              {isHost && (
                <div className="mb-6">
                  <HostControls 
                    participants={participants}
                    currentUser={displayUser}
                    isHost={isHost}
                    meetingId={meetingId}
                  />
                </div>
              )}
            </div>
          </aside>
        )}

        {/* Chat Sidebar */}
        {chatSidebarOpen && (
          <aside className="w-96 bg-black/40 backdrop-blur-lg text-white border-l border-white/10">
            <div className="p-6 h-full flex flex-col">
              {/* Sidebar Header */}
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold">Chat</h3>
                <button
                  onClick={() => setChatSidebarOpen(false)}
                  className="p-2 hover:bg-white/10 rounded-xl transition-colors"
                >
                  ✕
                </button>
              </div>

              {/* Chat Section */}
              <div className="flex-1 flex flex-col">
                {/* Messages Area */}
                <div className="flex-1 bg-gradient-to-br from-purple-500/10 to-pink-500/10 rounded-2xl border border-purple-500/20 flex flex-col overflow-hidden mb-4">
                  <div className="flex-1 p-4 overflow-y-auto">
                    {messages.length === 0 ? (
                      <div className="text-center text-gray-400 text-sm py-8">
                        <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        <p>No messages yet</p>
                        <p className="text-xs mt-1">Start the conversation!</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {messages.map((message) => (
                          <div
                            key={message.id}
                            className={`flex ${
                              message.isOwn ? "justify-end" : "justify-start"
                            }`}
                          >
                            <div
                              className={`max-w-xs px-3 py-2 rounded-lg ${
                                message.isOwn
                                  ? "bg-gradient-to-r from-blue-500 to-purple-500 text-white"
                                  : "bg-white/20 text-gray-200"
                              }`}
                            >
                              {!message.isOwn && (
                                <div className="text-xs font-medium mb-1 opacity-75">
                                  {message.sender}
                                </div>
                              )}
                              <div className="text-sm">{message.text}</div>
                              <div className="text-xs opacity-75 mt-1">
                                {(() => {
                                  try {
                                    const date = new Date(message.timestamp);
                                    return isNaN(date.getTime()) 
                                      ? 'Invalid time'
                                      : date.toLocaleTimeString([], {
                                          hour: "2-digit",
                                          minute: "2-digit",
                                        });
                                  } catch (error) {
                                    return 'Invalid time';
                                  }
                                })()}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Message Input */}
                <div className="bg-white/5 rounded-xl p-3 border border-white/10">
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyPress={handleKeyPress}
                      placeholder="Type a message..."
                      className="flex-1 bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-purple-400"
                    />
                    <button
                      onClick={sendMessage}
                      disabled={!newMessage.trim()}
                      className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-3 py-2 rounded-lg text-sm hover:from-purple-600 hover:to-pink-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    >
                      Send
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </aside>
        )}
      </div>

      {/* Bottom Controls */}
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
                  <VideoIcon className="w-4 h-4 text-white" />
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
                <VideoIcon className="w-4 h-4 text-white" />
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
    </div>
  );
};

export default MeetingRoom;
