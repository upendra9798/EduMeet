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
  
  const displayUser = {
    ...user,
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

  // Chat state
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");

  // Media stream state
  const [localStream, setLocalStream] = useState(null);
  const [showMediaPrompt, setShowMediaPrompt] = useState(true);

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

        // Connect to meeting socket
        console.log(
          "Connecting to meeting socket with user ID:",
          user.id,
          "display name:",
          displayUser.username
        );
        MeetingSocket.connect(user.id);
        setupSocketListeners();
        console.log("Joining meeting:", meetingId);
        MeetingSocket.joinMeeting(meetingId, displayUser.username);

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
    console.log("MeetingRoom: Setting up socket listeners...");

    // Clear any existing listeners to avoid duplicates
    MeetingSocket.off("meeting-joined");
    MeetingSocket.off("user-joined");
    MeetingSocket.off("user-left");
    MeetingSocket.off("meeting-error");
    MeetingSocket.off("message-received");

    MeetingSocket.on("meeting-joined", (data) => {
      console.log("MeetingRoom: Joined meeting successfully:", data);
      // Initialize with empty array - we'll get participants via user-joined events for existing users
      setParticipants([]);
    });

    MeetingSocket.on("user-joined", (data) => {
      console.log("User joined:", data);
      setParticipants((prev) => {
        // Always add new participant with their display name and socket ID
        const newParticipant = {
          socketId: data.socketId,
          userId: data.userId,
          displayName: data.displayName || `User ${data.userId.slice(-4)}`,
        };

        // Check if this exact socket connection already exists
        const existingIndex = prev.findIndex(
          (p) => p.socketId === data.socketId
        );
        if (existingIndex === -1) {
          return [...prev, newParticipant];
        }
        return prev;
      });
    });

    MeetingSocket.on("user-left", (data) => {
      console.log("User left:", data);
      setParticipants((prev) =>
        prev.filter((p) => p.socketId !== data.socketId)
      );
    });

    MeetingSocket.on("meeting-error", (error) => {
      console.error("Meeting error:", error);
      setError(error.message);
    });

    // Chat message listeners
    MeetingSocket.on("message-received", (message) => {
      console.log("MeetingRoom: Received message from socket:", message);
      // Add received message to chat (mark as not own)
      const receivedMessage = {
        ...message,
        isOwn: false,
      };
      console.log(
        "MeetingRoom: Adding received message to state:",
        receivedMessage
      );
      setMessages((prev) => {
        const updated = [...prev, receivedMessage];
        console.log(
          "MeetingRoom: Updated messages with received message:",
          updated
        );
        return updated;
      });
    });
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

  // Manual media access request (for users who initially denied or want to enable later)
  const requestMediaAccess = async () => {
    try {
      console.log('MeetingRoom: Manual media access requested...');
      setShowMediaPrompt(true); // Show prompt while requesting
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      setLocalStream(stream);
      setShowMediaPrompt(false); // Hide prompt when successful
      console.log("MeetingRoom: Media stream initialized manually:", stream);
    } catch (error) {
      console.error("Error accessing media devices:", error);
      setShowMediaPrompt(false); // Hide prompt even if failed
      alert("Unable to access camera/microphone. Please check your browser permissions and try again.");
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

  // Media control functions
  const toggleMute = () => {
    console.log(
      "toggleMute called - isMuted:",
      isMuted,
      "localStream:",
      localStream
    );
    if (localStream) {
      const audioTracks = localStream.getAudioTracks();
      console.log("Audio tracks found:", audioTracks.length);
      audioTracks.forEach((track, index) => {
        console.log(`Audio track ${index} - enabled before:`, track.enabled);
        track.enabled = isMuted; // If currently muted, enable; if not muted, disable
        console.log(`Audio track ${index} - enabled after:`, track.enabled);
      });
      setIsMuted(!isMuted);
      console.log("Muted state changed to:", !isMuted);
    } else {
      console.warn("No local stream available for audio control");
    }
  };

  const toggleVideo = () => {
    console.log(
      "toggleVideo called - isVideoOff:",
      isVideoOff,
      "localStream:",
      localStream
    );
    if (localStream) {
      const videoTracks = localStream.getVideoTracks();
      console.log("Video tracks found:", videoTracks.length);
      videoTracks.forEach((track, index) => {
        console.log(`Video track ${index} - enabled before:`, track.enabled);
        track.enabled = isVideoOff; // If currently off, enable; if on, disable
        console.log(`Video track ${index} - enabled after:`, track.enabled);
      });
      setIsVideoOff(!isVideoOff);
      console.log("Video off state changed to:", !isVideoOff);
    } else {
      console.warn("No local stream available for video control");
    }
  };

  // Chat functions
  const sendMessage = () => {
    console.log("MeetingRoom sendMessage called:");
    console.log("- newMessage:", newMessage.trim());
    console.log("- joined:", joined);
    console.log("- meetingId:", meetingId);
    console.log("- user:", user);

    if (newMessage.trim() && joined) {
      const message = {
        id: Date.now(),
        text: newMessage.trim(),
        sender: displayUser.username,
        senderId: user.id,
        timestamp: new Date(),
        isOwn: true,
      };

      console.log("MeetingRoom: Creating message object:", message);
      // Add to local messages immediately
      setMessages((prev) => {
        const updated = [...prev, message];
        console.log("MeetingRoom: Updated local messages:", updated);
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
      <header className="bg-black/40 backdrop-blur-lg text-white p-6 flex items-center justify-between border-b border-white/10">
        <div className="flex items-center space-x-6">
          <button
            onClick={() => navigate("/dashboard")}
            className="p-3 hover:bg-white/10 rounded-xl transition-all duration-200 transform hover:scale-105"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl flex items-center justify-center">
              <VideoIcon className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold">
                {meeting?.title || "Meeting Room"}
              </h1>
              <div className="flex items-center space-x-3">
                <span className="text-sm text-gray-300">ID: {meetingId}</span>
                <div className="flex items-center space-x-1">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                  <span className="text-xs text-green-400">Live</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-6">
          {/* View Toggle */}
          <div className="flex bg-white/10 backdrop-blur-md rounded-2xl p-2 border border-white/20">
            <button
              onClick={() => setActiveView("video")}
              className={`flex items-center px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                activeView === "video"
                  ? "bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg transform scale-105"
                  : "text-gray-300 hover:text-white hover:bg-white/10"
              }`}
            >
              <VideoIcon className="w-4 h-4 mr-2" />
              Video
            </button>
            <button
              onClick={() => setActiveView("whiteboard")}
              className={`flex items-center px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                activeView === "whiteboard"
                  ? "bg-gradient-to-r from-purple-500 to-purple-600 text-white shadow-lg transform scale-105"
                  : "text-gray-300 hover:text-white hover:bg-white/10"
              }`}
            >
              <PenTool className="w-4 h-4 mr-2" />
              Whiteboard
            </button>
            <button
              onClick={() => setActiveView("split")}
              className={`flex items-center px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                activeView === "split"
                  ? "bg-gradient-to-r from-green-500 to-green-600 text-white shadow-lg transform scale-105"
                  : "text-gray-300 hover:text-white hover:bg-white/10"
              }`}
            >
              <Users className="w-4 h-4 mr-2" />
              Split View
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
          {activeView === "video" && (
            <div className="h-full">
              <VideoChat
                meetingId={meetingId}
                userId={user.id}
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
              
              {/* Small floating button when prompt is hidden */}
              {!localStream && !showMediaPrompt && (
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

          {activeView === "whiteboard" && (
            <div className="h-full">
              <Whiteboard
                meetingId={meetingId}
                userId={user.id}
                userDisplayName={displayUser.username}
              />
            </div>
          )}

          {activeView === "split" && (
            <div className="h-full grid grid-cols-1 lg:grid-cols-2 gap-4 p-4">
              <div className="bg-black rounded-lg overflow-hidden relative">
                <VideoChat
                  meetingId={meetingId}
                  userId={user.id}
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
                {!localStream && !showMediaPrompt && (
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
                  {participants.map((participant, index) => (
                    <div
                      key={participant.socketId}
                      className="flex items-center space-x-3 p-3 bg-white/5 rounded-xl border border-white/10 hover:bg-white/10 transition-colors"
                    >
                      <div className="w-10 h-10 bg-gradient-to-r from-gray-500 to-gray-600 rounded-full flex items-center justify-center font-bold text-sm">
                        {participant.displayName.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1">
                        <span className="font-medium">
                          {participant.displayName}
                        </span>
                        {participant.userId === user.id && (
                          <span className="text-xs text-gray-400 ml-2">
                            (Your other session)
                          </span>
                        )}
                      </div>
                      <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
                    </div>
                  ))}
                </div>
              </div>
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
                                {message.timestamp.toLocaleTimeString([], {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
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
      <footer className="bg-black/60 backdrop-blur-lg p-6 flex items-center justify-center border-t border-white/10">
        <div className="flex items-center space-x-6">
          {/* Media Controls - Show different UI based on media availability */}
          {localStream ? (
            <>
              {/* Audio Control */}
              <div className="flex flex-col items-center">
                <button
                  onClick={toggleMute}
                  className={`p-4 rounded-2xl transition-all duration-200 transform hover:scale-110 ${
                    isMuted
                      ? "bg-gradient-to-r from-red-500 to-red-600 shadow-lg shadow-red-500/25"
                      : "bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-500 hover:to-gray-600 shadow-lg"
                  }`}
                >
                  {isMuted ? (
                    <MicOff className="w-6 h-6 text-white" />
                  ) : (
                    <Mic className="w-6 h-6 text-white" />
                  )}
                </button>
                <span className="text-xs text-gray-300 mt-2 font-medium">
                  {isMuted ? "Unmute" : "Mute"}
                </span>
              </div>

              {/* Video Control */}
              <div className="flex flex-col items-center">
                <button
                  onClick={toggleVideo}
                  className={`p-4 rounded-2xl transition-all duration-200 transform hover:scale-110 ${
                    isVideoOff
                      ? "bg-gradient-to-r from-red-500 to-red-600 shadow-lg shadow-red-500/25"
                      : "bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-500 hover:to-gray-600 shadow-lg"
                  }`}
                >
                  {isVideoOff ? (
                    <VideoOff className="w-6 h-6 text-white" />
                  ) : (
                    <VideoIcon className="w-6 h-6 text-white" />
                  )}
                </button>
                <span className="text-xs text-gray-300 mt-2 font-medium">
                  {isVideoOff ? "Start Video" : "Stop Video"}
                </span>
              </div>
            </>
          ) : (
            /* Enable Media Button when no stream available */
            <div className="flex flex-col items-center">
              <button
                onClick={requestMediaAccess}
                className="p-4 rounded-2xl bg-gradient-to-r from-green-600 to-green-700 hover:from-green-500 hover:to-green-600 shadow-lg shadow-green-500/25 transition-all duration-200 transform hover:scale-110"
              >
                <VideoIcon className="w-6 h-6 text-white" />
              </button>
              <span className="text-xs text-gray-300 mt-2 font-medium">
                Enable Media
              </span>
            </div>
          )}

          {/* Participants */}
          <div className="flex flex-col items-center">
            <button
              onClick={() => {
                setParticipantsSidebarOpen(!participantsSidebarOpen);
                setChatSidebarOpen(false); // Close chat sidebar if open
              }}
              className={`p-4 rounded-2xl shadow-lg transition-all duration-200 transform hover:scale-110 ${
                participantsSidebarOpen
                  ? "bg-gradient-to-r from-blue-500 to-blue-600"
                  : "bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600"
              }`}
            >
              <Users className="w-6 h-6 text-white" />
            </button>
            <span className="text-xs text-gray-300 mt-2 font-medium">
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
              className={`p-4 rounded-2xl shadow-lg transition-all duration-200 transform hover:scale-110 ${
                chatSidebarOpen
                  ? "bg-gradient-to-r from-purple-500 to-purple-600"
                  : "bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-500 hover:to-purple-600"
              }`}
            >
              <MessageSquare className="w-6 h-6 text-white" />
            </button>
            <span className="text-xs text-gray-300 mt-2 font-medium">
              Chat {messages.length > 0 && `(${messages.length})`}
            </span>
          </div>

          {/* Leave Meeting */}
          <div className="flex flex-col items-center">
            <button
              onClick={handleLeaveMeeting}
              className="p-4 rounded-2xl bg-gradient-to-r from-red-500 to-red-600 hover:from-red-400 hover:to-red-500 shadow-lg shadow-red-500/25 transition-all duration-200 transform hover:scale-110"
            >
              <Phone className="w-6 h-6 text-white transform rotate-[135deg]" />
            </button>
            <span className="text-xs text-gray-300 mt-2 font-medium">
              Leave
            </span>
          </div>

          {/* End Meeting (Host Only) */}
          {isHost && (
            <div className="flex flex-col items-center ml-6 pl-6 border-l border-white/20">
              <button
                onClick={handleEndMeeting}
                className="px-6 py-3 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 rounded-xl text-white font-semibold shadow-lg shadow-red-500/25 transition-all duration-200 transform hover:scale-105"
              >
                End Meeting
              </button>
              <span className="text-xs text-gray-300 mt-2 font-medium">
                Host Controls
              </span>
            </div>
          )}

          {/* Settings */}
          <div className="flex flex-col items-center ml-6 pl-6 border-l border-white/20">
            <button className="p-4 rounded-2xl bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-500 hover:to-gray-600 shadow-lg transition-all duration-200 transform hover:scale-110">
              <Settings className="w-6 h-6 text-white" />
            </button>
            <span className="text-xs text-gray-300 mt-2 font-medium">
              Settings
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default MeetingRoom;
