import React, { useEffect, useRef, useState } from "react";
import MeetingSocket from "../services/meetingSocket";
import { v4 as uuidv4 } from "uuid";

// Video Tile Component for individual participants
const VideoTile = ({ participant, isLocal = false, isVideoOff = false, isMuted = false }) => {
  const videoRef = useRef(null);
  const [isAudioActive, setIsAudioActive] = useState(false);
  const [isVideoActive, setIsVideoActive] = useState(false);
  

  
  // Monitor audio/video track status
  useEffect(() => {
    if (participant.stream) {
      const audioTracks = participant.stream.getAudioTracks();
      const videoTracks = participant.stream.getVideoTracks();
      
      // Check initial track status
      setIsAudioActive(audioTracks.length > 0 && audioTracks.some(track => track.enabled));
      setIsVideoActive(videoTracks.length > 0 && videoTracks.some(track => track.enabled));
      
      // Monitor track changes
      const checkTracks = () => {
        setIsAudioActive(audioTracks.length > 0 && audioTracks.some(track => track.enabled));
        setIsVideoActive(videoTracks.length > 0 && videoTracks.some(track => track.enabled));
      };
      
      // Listen for track events
      audioTracks.forEach(track => {
        track.addEventListener('ended', checkTracks);
        track.addEventListener('mute', checkTracks);
        track.addEventListener('unmute', checkTracks);
      });
      
      videoTracks.forEach(track => {
        track.addEventListener('ended', checkTracks);
        track.addEventListener('mute', checkTracks);
        track.addEventListener('unmute', checkTracks);
      });
      
      return () => {
        // Cleanup event listeners
        audioTracks.forEach(track => {
          track.removeEventListener('ended', checkTracks);
          track.removeEventListener('mute', checkTracks);
          track.removeEventListener('unmute', checkTracks);
        });
        
        videoTracks.forEach(track => {
          track.removeEventListener('ended', checkTracks);
          track.removeEventListener('mute', checkTracks);
          track.removeEventListener('unmute', checkTracks);
        });
      };
    }
  }, [participant.stream]);

  useEffect(() => {
    if (videoRef.current && participant.stream) {
      videoRef.current.srcObject = participant.stream;
      
      // For remote streams, ensure audio is enabled
      if (!isLocal) {
        const audioTracks = participant.stream.getAudioTracks();
        audioTracks.forEach(track => {
          track.enabled = true;
        });
      }
      
      // Auto-play the video (this is required for both video and audio)
      videoRef.current.play().catch(() => {
        // Auto-play may be prevented, this is normal
      });
    }
  }, [participant.stream, isLocal, participant.displayName]);

  return (
    <div className="relative bg-gray-800 rounded-xl shadow-lg overflow-hidden aspect-video min-w-0 flex-1">
      <video
        ref={videoRef}
        autoPlay
        muted={isLocal} // Only mute local video to prevent echo, remote videos should play audio
        playsInline
        controls={false}
        className={`w-full h-full object-cover transition-opacity duration-300 ${
          isVideoOff ? 'opacity-0' : 'opacity-100'
        }`}
      />
      
      {/* Participant Name - Top Left */}
      <div className="absolute top-3 left-3 bg-black/80 text-white px-3 py-2 rounded-lg text-sm font-semibold shadow-lg border border-gray-600/50 backdrop-blur-sm">
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 rounded-full bg-green-400"></div>
          <span>{participant.displayName || 'Participant'} {isLocal && "(You)"}</span>
        </div>
      </div>
      
      {/* Video Off Overlay */}
      {(isVideoOff || !isVideoActive) && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-800">
          <div className="text-center text-white">
            <div className="w-16 h-16 bg-gray-600 rounded-full flex items-center justify-center mx-auto mb-3">
              <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-6-3a2 2 0 11-4 0 2 2 0 014 0zm-2 4a5 5 0 00-4.546 2.916A5.986 5.986 0 0010 16a5.986 5.986 0 004.546-2.084A5 5 0 0010 11z" clipRule="evenodd" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold mb-1">
              {participant.displayName || 'Participant'}
              {isLocal && " (You)"}
            </h3>
            <p className="text-sm text-gray-300">Camera is off</p>
          </div>
        </div>
      )}
      
      {/* Audio/Video Status Indicators */}
      <div className="absolute top-2 right-2 flex space-x-1">
        {/* Audio Status Indicator */}
        <div className={`p-1.5 rounded-full ${!isMuted ? 'bg-green-500' : 'bg-red-500'}`}>
          {!isMuted ? (
            // Microphone on icon
            <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" />
            </svg>
          ) : (
            // Microphone off icon
            <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM12.293 7.293a1 1 0 011.414 0L15 8.586l1.293-1.293a1 1 0 111.414 1.414L16.414 10l1.293 1.293a1 1 0 01-1.414 1.414L15 11.414l-1.293 1.293a1 1 0 01-1.414-1.414L13.586 10l-1.293-1.293a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          )}
        </div>

        {/* Video Status Indicator */}
        <div className={`p-1.5 rounded-full ${!isVideoOff ? 'bg-green-500' : 'bg-red-500'}`}>
          {!isVideoOff ? (
            // Video on icon
            <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z" />
            </svg>
          ) : (
            // Video off icon
            <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A2 2 0 0018 13V7a1 1 0 00-1.447-.894L14 7.382V6a2 2 0 00-2-2H8.586l2 2H12v3.586l2-2V9.382l2.553-1.276A1 1 0 0018 9v2.586l-2 2V13a1 1 0 01-.553.894L14 12.618V14a2 2 0 01-2 2H4a2 2 0 01-2-2V6a2 2 0 012-2h1.586l-2.293-2.293zM4 8.414L6.586 6H4v2.414zM7.414 9L12 13.586V14H8.586L7.414 9z" clipRule="evenodd" />
            </svg>
          )}
        </div>
      </div>
    </div>
  );
};

/**
 * 🎥 VideoChat Component
 * Handles video streaming for existing meeting rooms.
 * Uses Socket.IO for signaling (offer/answer/ICE exchange).
 */
export default function VideoChat({ meetingId, userId, localStream, isMuted, isVideoOff, onParticipantsChange, onHostControlVideo, onHostControlAudio }) {
  const [joined, setJoined] = useState(false);
  const [remoteParticipants, setRemoteParticipants] = useState({}); // Track remote participants and their streams
  const localVideoRef = useRef(null);
  const localStreamRef = useRef(null);
  const pcRef = useRef({}); // Each user gets its own RTCPeerConnection instance



  // Notify parent when remote participants change
  useEffect(() => {
    if (onParticipantsChange) {
      const participantsArray = Object.values(remoteParticipants).map(p => ({
        socketId: p.socketId,
        userId: p.userId || 'unknown',
        displayName: p.displayName || 'Remote User',
        isMuted: p.isMuted || false,
        isVideoOff: p.isVideoOff || false
      }));
      onParticipantsChange(participantsArray);
    }
  }, [remoteParticipants, onParticipantsChange]);

  /** 🚪 Auto-join the meeting room */
  useEffect(() => {
    if (meetingId && userId && !joined) {
      joinMeetingRoom();
    }
  }, [meetingId, userId]);

  /** 🎥 Set up local video stream */
  useEffect(() => {
    if (localStream && localVideoRef.current) {
      localVideoRef.current.srcObject = localStream;
      localStreamRef.current = localStream;
      
      // Ensure video plays
      localVideoRef.current.play().catch(() => {
        // Auto-play may be prevented
      });
    }
  }, [localStream]);

  /** 🎥 Additional effect to handle video ref changes */
  useEffect(() => {
    if (localVideoRef.current && localStreamRef.current) {
      localVideoRef.current.srcObject = localStreamRef.current;
      
      localVideoRef.current.play().catch(() => {
        // Auto-play may be prevented
      });
    }
  }, [localVideoRef.current]);

  const joinMeetingRoom = async () => {
    if (!meetingId) return;
    
    try {
      setJoined(true);

      // Use the passed localStream instead of creating a new one
      if (localStream) {
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = localStream;
        }
        localStreamRef.current = localStream;
      }
    } catch (error) {
      console.error('Error setting up video chat:', error);
      setJoined(false);
    }
  };

  // Keep the local stream ref updated when props change
  useEffect(() => {
    if (localStream) {
      localStreamRef.current = localStream;
    }
  }, [localStream]);

  // Ensure audio context is resumed for all remote streams
  useEffect(() => {
    const resumeAudioContext = async () => {
      try {
        // Modern browsers require user interaction to resume audio context
        // This will be called after user joins the meeting (which is a user interaction)
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        if (audioContext.state === 'suspended') {
          await audioContext.resume();
        }
        audioContext.close();
      } catch (error) {
        // Audio context handling not needed/supported
      }
    };

    if (Object.keys(remoteParticipants).length > 0) {
      resumeAudioContext();
    }
  }, [remoteParticipants]);

  /** 🔗 WebRTC signaling logic via MeetingSocket */
  useEffect(() => {
    // Listen for existing participants when we join
    MeetingSocket.on("meeting-joined", async (data) => {
      console.log('VideoChat: Meeting joined event received:', data);
      console.log('VideoChat: Existing participants:', data.existingParticipants);
      
      // Create peer connections with existing participants regardless of local stream
      if (data.existingParticipants && data.existingParticipants.length > 0) {
        console.log(`VideoChat: Found ${data.existingParticipants.length} existing participants`);
        
        for (const participant of data.existingParticipants) {
          console.log('VideoChat: Processing existing participant:', participant);
          
          // Initialize participant in state before creating peer connection
          setRemoteParticipants(prev => {
            console.log('VideoChat: Adding existing participant to state:', participant.socketId);
            return {
              ...prev,
              [participant.socketId]: {
                socketId: participant.socketId,
                userId: participant.userId,
                displayName: participant.displayName || `Participant ${participant.socketId.slice(-4)}`,
                stream: null // Will be set when ontrack fires
              }
            };
          });
          
          console.log('VideoChat: Creating peer connection with existing participant:', participant.socketId);
          await createPeerConnection(participant.socketId, true);
        }
      } else {
        console.log('VideoChat: No existing participants found');
      }
    });

    // A new user joins
    MeetingSocket.on("user-joined", async (participant) => {
      console.log('VideoChat: New user joined event received:', participant);
      
      // Initialize participant in state before creating peer connection
      setRemoteParticipants(prev => {
        console.log('VideoChat: Adding new participant to state:', participant.socketId);
        return {
          ...prev,
          [participant.socketId]: {
            socketId: participant.socketId,
            userId: participant.userId,
            displayName: participant.displayName || `Participant ${participant.socketId.slice(-4)}`,
            stream: null // Will be set when ontrack fires
          }
        };
      });
      
      console.log('VideoChat: Creating peer connection with new participant:', participant.socketId);
      await createPeerConnection(participant.socketId, false);
    });

    // Receive an offer
    MeetingSocket.on("offer", async ({ from, sdp }) => {
      console.log('📥 VideoChat: Received offer from:', from);
      console.log('📥 VideoChat: Offer SDP type:', sdp.type);
      try {
        const pc = await createPeerConnection(from, false);
        console.log('📥 VideoChat: Setting remote description...');
        await pc.setRemoteDescription(new RTCSessionDescription(sdp));
        console.log('📥 VideoChat: Remote description set successfully');
        
        const answer = await pc.createAnswer({
          offerToReceiveAudio: true,
          offerToReceiveVideo: true,
          voiceActivityDetection: false
        });
        await pc.setLocalDescription(answer);
        console.log('📥 VideoChat: Answer created with SDP type:', answer.type);
        console.log('📥 VideoChat: Local description set, connection state:', pc.connectionState);
        
        MeetingSocket.emit("answer", { to: from, sdp: answer });
        console.log('📥 VideoChat: Sent answer to:', from);
      } catch (error) {
        console.error('❌ VideoChat: Error handling offer from', from, ':', error);
      }
    });

    // Receive an answer
    MeetingSocket.on("answer", async ({ from, sdp }) => {
      console.log('📨 VideoChat: Received answer from:', from);
      console.log('📨 VideoChat: Answer SDP type:', sdp.type);
      try {
        const pc = pcRef.current[from];
        if (pc) {
          console.log('📨 VideoChat: Setting remote description from answer...');
          await pc.setRemoteDescription(new RTCSessionDescription(sdp));
          console.log('📨 VideoChat: Remote description set from answer, connection state:', pc.connectionState);
        } else {
          console.error('❌ VideoChat: No peer connection found for:', from);
        }
      } catch (error) {
        console.error('❌ VideoChat: Error handling answer from', from, ':', error);
      }
    });

    // Receive ICE candidate
    MeetingSocket.on("ice-candidate", async ({ from, candidate }) => {
      console.log('VideoChat: Received ICE candidate from:', from);
      try {
        const pc = pcRef.current[from];
        if (pc && candidate) {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
          console.log('VideoChat: Added ICE candidate');
        }
      } catch (error) {
        console.error('VideoChat: Error adding ICE candidate:', error);
      }
    });

    // When a user leaves
    MeetingSocket.on("user-left", (data) => {
      console.log('VideoChat: User left:', data);
      
      // Close peer connection
      if (pcRef.current[data.socketId]) {
        pcRef.current[data.socketId].close();
        delete pcRef.current[data.socketId];
        console.log('VideoChat: Closed peer connection for:', data.socketId);
      }
      
      // Remove participant from React state
      setRemoteParticipants(prev => {
        const updated = { ...prev };
        delete updated[data.socketId];
        console.log('VideoChat: Removed participant from state:', data.socketId);
        return updated;
      });
    });

    // When a participant toggles their audio
    MeetingSocket.on("participant-audio-toggled", (data) => {
      console.log('VideoChat: Participant audio toggled:', data);
      setRemoteParticipants(prev => ({
        ...prev,
        [data.socketId]: {
          ...prev[data.socketId],
          isMuted: data.isMuted
        }
      }));
    });

    // When a participant toggles their video
    MeetingSocket.on("participant-video-toggled", (data) => {
      console.log('VideoChat: Participant video toggled:', data);
      setRemoteParticipants(prev => ({
        ...prev,
        [data.socketId]: {
          ...prev[data.socketId],
          isVideoOff: data.isVideoOff
        }
      }));
    });

    // Handle host control audio command
    console.log('📡 VideoChat: Registering host-control-audio listener...');
    MeetingSocket.on("host-control-audio", (data) => {
      console.log('🔇 VideoChat: RECEIVED HOST AUDIO CONTROL:', data);
      console.log('🔇 VideoChat: My userId is:', userId);
      console.log('🔇 VideoChat: Local stream available:', !!localStream);
      console.log('🔇 VideoChat: Current mute state:', isMuted);
      
      if (data.isForceMuted) {
        console.log('🔇 VideoChat: FORCE MUTING AUDIO');
        
        // Mute the audio tracks if stream is available
        if (localStream) {
          localStream.getAudioTracks().forEach((track, index) => {
            console.log(`🔇 VideoChat: Muting audio track ${index}:`, track);
            track.enabled = false;
          });
        }
        
        // Notify the parent component about the mute state change
        if (onHostControlAudio) {
          onHostControlAudio(true); // true = muted
          console.log('🔇 VideoChat: Notified parent that audio is muted by host');
        }
      } else {
        console.log('🔇 VideoChat: Host allowing audio to be unmuted');
        
        // Unmute audio tracks if stream is available
        if (localStream) {
          localStream.getAudioTracks().forEach((track, index) => {
            console.log(`🔇 VideoChat: Unmuting audio track ${index}:`, track);
            track.enabled = true;
          });
        }
        
        // Notify the parent component
        if (onHostControlAudio) {
          onHostControlAudio(false); // false = unmuted
          console.log('🔇 VideoChat: Notified parent that audio is unmuted by host');
        }
      }
    });

    // Handle host control video command  
    MeetingSocket.on("host-control-video", (data) => {
      console.log('📹 VideoChat: RECEIVED HOST VIDEO CONTROL:', data);
      console.log('📹 VideoChat: My userId is:', userId);
      console.log('📹 VideoChat: Local stream available:', !!localStream);
      console.log('📹 VideoChat: Current video state - off:', isVideoOff);
      
      if (data.isVideoDisabled) {
        console.log('📹 VideoChat: FORCE DISABLING VIDEO');
        
        // Disable the video tracks if stream is available
        if (localStream) {
          localStream.getVideoTracks().forEach((track, index) => {
            console.log(`📹 VideoChat: Disabling video track ${index}:`, track);
            track.enabled = false;
          });
        }
        
        // Notify the parent component about the state change
        if (onHostControlVideo) {
          onHostControlVideo(true); // true = video is off
          console.log('📹 VideoChat: Notified parent that video is disabled by host');
        }
      } else {
        console.log('📹 VideoChat: Host allowing video to be enabled');
        
        // Enable video tracks if stream is available
        if (localStream) {
          localStream.getVideoTracks().forEach((track, index) => {
            console.log(`📹 VideoChat: Enabling video track ${index}:`, track);
            track.enabled = true;
          });
        }
        
        // Notify the parent component about the state change
        if (onHostControlVideo) {
          onHostControlVideo(false); // false = video is on
          console.log('📹 VideoChat: Notified parent that video is enabled by host');
        }
      }
    });

    // Handle backup host control events (direct socket emission)
    MeetingSocket.on("host-control-audio-direct", (data) => {
      console.log('🔇 VideoChat: RECEIVED DIRECT HOST AUDIO CONTROL:', data);
      // Same logic as above
      if (data.isForceMuted && localStream) {
        console.log('🔇 VideoChat: DIRECT - FORCE MUTING AUDIO TRACKS');
        localStream.getAudioTracks().forEach(track => {
          track.enabled = false;
        });
        setIsMuted(true);
        console.log('🔇 VideoChat: DIRECT - Audio muted by host');
      }
    });

    MeetingSocket.on("host-control-video-direct", (data) => {
      console.log('📹 VideoChat: RECEIVED DIRECT HOST VIDEO CONTROL:', data);
      if (data.isVideoDisabled && localStream) {
        localStream.getVideoTracks().forEach(track => {
          track.enabled = false;
        });
        setIsVideoOff(true);
        console.log('📹 VideoChat: DIRECT - Video disabled by host');
      }
    });

    return () => {
      MeetingSocket.off("meeting-joined");
      MeetingSocket.off("user-joined");
      MeetingSocket.off("offer");
      MeetingSocket.off("answer");
      MeetingSocket.off("ice-candidate");
      MeetingSocket.off("user-left");
      MeetingSocket.off("participant-audio-toggled");
      MeetingSocket.off("participant-video-toggled");
      MeetingSocket.off("host-control-audio");
      MeetingSocket.off("host-control-video");
      MeetingSocket.off("host-control-audio-direct");
      MeetingSocket.off("host-control-video-direct");
    };
  }, []);

  /** 🎛️ Create WebRTC Peer Connection */
  const createPeerConnection = async (id, isInitiator) => {
    try {
      console.log(`📹 VideoChat: Creating peer connection with ${id}`);
      console.log(`📹 VideoChat: - isInitiator: ${isInitiator}`);
      console.log(`📹 VideoChat: - hasLocalStream: ${!!localStreamRef.current}`);
      console.log(`📹 VideoChat: - User Agent: ${navigator.userAgent.slice(0, 50)}...`);
      console.log(`📹 VideoChat: - Screen size: ${window.screen.width}x${window.screen.height}`);
      
      // Production-ready ICE servers with fallbacks
      const iceServers = [
        // Google STUN servers (free)
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" },
        { urls: "stun:stun2.l.google.com:19302" },
        
        // Additional STUN servers for better connectivity
        { urls: "stun:stun.cloudflare.com:3478" },
        { urls: "stun:stun.nextcloud.com:443" }
        
        // TODO: Add TURN server for production (required for NAT traversal)
        // { 
        //   urls: "turn:your-turn-server.com:3478",
        //   username: "your-username",
        //   credential: "your-password"
        // }
      ];

      const pc = new RTCPeerConnection({
        iceServers,
        iceCandidatePoolSize: 10,
        // Mobile-optimized RTCConfiguration
        bundlePolicy: 'balanced',
        rtcpMuxPolicy: 'require',
        iceTransportPolicy: 'all'
      });

      // Send ICE candidates to the other peer
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          console.log('VideoChat: Sending ICE candidate to:', id, 'Type:', event.candidate.type);
          MeetingSocket.emit("ice-candidate", { to: id, candidate: event.candidate });
        } else {
          console.log('VideoChat: ICE gathering complete for:', id);
        }
      };

      // Monitor connection state for mobile debugging
      pc.oniceconnectionstatechange = () => {
        console.log('VideoChat: ICE connection state changed to:', pc.iceConnectionState, 'for peer:', id);
        if (pc.iceConnectionState === 'failed' || pc.iceConnectionState === 'disconnected') {
          console.warn('VideoChat: Connection issues detected for peer:', id);
        }
      };

      pc.onconnectionstatechange = () => {
        console.log('VideoChat: Connection state changed to:', pc.connectionState, 'for peer:', id);
      };

      // Enhanced ICE gathering state monitoring
      pc.onicegatheringstatechange = () => {
        console.log('VideoChat: ICE gathering state:', pc.iceGatheringState, 'for peer:', id);
      };

      // When remote stream arrives - this works regardless of local stream
      pc.ontrack = (event) => {
        console.log('🎬 VideoChat: Received remote stream from:', id);
        const [remoteStream] = event.streams;
        
        // Log stream details
        console.log('🎬 VideoChat: Remote stream details:', {
          id: remoteStream.id,
          active: remoteStream.active,
          videoTracks: remoteStream.getVideoTracks().length,
          audioTracks: remoteStream.getAudioTracks().length
        });
        
        // Log video track details if any
        const videoTracks = remoteStream.getVideoTracks();
        if (videoTracks.length > 0) {
          console.log('🎥 VideoChat: Video track settings:', videoTracks[0].getSettings());
          console.log('🎥 VideoChat: Video track state:', videoTracks[0].readyState);
        }
        
        // Update existing participant with stream, preserving display name
        setRemoteParticipants(prev => ({
          ...prev,
          [id]: {
            ...prev[id],
            socketId: id,
            stream: remoteStream,
            displayName: prev[id]?.displayName || `Participant ${id.slice(-4)}`
          }
        }));
        
        console.log('✅ VideoChat: Updated participant with stream:', id);
      };

      // Add local tracks to the connection ONLY if available
      // This allows receiving without sending
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => {
          pc.addTrack(track, localStreamRef.current);
        });
        console.log('VideoChat: Added local tracks to peer connection for', id);
      } else {
        console.log('VideoChat: No local stream - will receive only for', id);
      }

      pcRef.current[id] = pc;

      // If user is initiator, create an offer
      if (isInitiator) {
        console.log('📤 VideoChat: Creating offer for:', id);
        const offer = await pc.createOffer({
          offerToReceiveAudio: true,
          offerToReceiveVideo: true,
          voiceActivityDetection: false, // Helps with audio quality
          // Mobile-specific constraints
          iceRestart: false
        });
        await pc.setLocalDescription(offer);
        console.log('📤 VideoChat: Offer created with SDP type:', offer.type);
        console.log('📤 VideoChat: Local description set, gathering state:', pc.iceGatheringState);
        
        MeetingSocket.emit("offer", { to: id, sdp: offer });
        console.log('📤 VideoChat: Sent offer to:', id);
      }

      return pc;
    } catch (error) {
      console.error('VideoChat: Error creating peer connection:', error);
      throw error;
    }
  };

  /** 🖥️ UI */
  return (
    <div className="flex flex-col items-center justify-center h-full bg-black text-white p-4">
      {!joined && meetingId ? (
        // 🔹 Connecting Screen
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500/30 rounded-full animate-spin border-t-blue-400 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold mb-2">Connecting to video...</h2>
          <p className="text-gray-400">Setting up your camera and microphone</p>
        </div>
      ) : joined ? (
        // 🔹 Meeting Screen with Video Grid
        <div className="w-full h-full p-4">
          {/* Dynamic Video Grid */}
          <div className={`grid gap-4 h-full ${
            Object.keys(remoteParticipants).length === 0 ? 'grid-cols-1' :
            Object.keys(remoteParticipants).length === 1 ? 'grid-cols-1 md:grid-cols-2' :
            Object.keys(remoteParticipants).length <= 3 ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' :
            'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
          }`}>
            
            {/* Local Video - Always show, even without stream */}
            <VideoTile
              participant={{
                displayName: "You",
                stream: localStream
              }}
              isLocal={true}
              isMuted={isMuted}
              isVideoOff={isVideoOff}
            />
            
            {/* Remote Participants */}
            {Object.values(remoteParticipants).map(participant => (
              <VideoTile
                key={participant.socketId}
                participant={participant}
                isLocal={false}
                onToggleVideo={() => {}}
                onToggleMute={() => {}}
                isMuted={participant.isMuted || false}
                isVideoOff={participant.isVideoOff || false}
              />
            ))}
            


            {/* Empty State when no participants */}
            {Object.keys(remoteParticipants).length === 0 && (
              <div className="flex items-center justify-center text-gray-400 text-center p-8">
                <div>
                  <div className="w-16 h-16 bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 13V5a2 2 0 00-2-2H4a2 2 0 00-2 2v8a2 2 0 002 2h3l3 3 3-3h3a2 2 0 002-2zM5 7a1 1 0 011-1h8a1 1 0 110 2H6a1 1 0 01-1-1zm1 3a1 1 0 100 2h3a1 1 0 100-2H6z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold mb-2">Waiting for others to join</h3>
                  <p className="text-sm">Share the meeting ID with participants to get started</p>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        // 🔹 No meeting ID provided
        <div className="text-center">
          <p className="text-gray-400">No meeting room specified</p>
        </div>
      )}
    </div>
  );
}

/**
 * 🧭 WebRTC Connection Flow
 * 1️⃣ User joins room → Client → Server
 * 2️⃣ Server notifies others → “user-joined”
 * 3️⃣ Offer created & sent → Peer A → Peer B
 * 4️⃣ Answer created & sent → Peer B → Peer A
 * 5️⃣ ICE candidates exchanged → Both ways
 * 6️⃣ Media streams connected → Direct P2P WebRTC
 */


/*🎥 WebRTC Connection in a Nutshell

WebRTC allows two browsers (peers) to connect directly to each other — for video, audio, or data.
But to do that, both browsers must first exchange connection details — how to reach each other, what media formats they support, etc.

This information exchange is called Signaling — and that’s where the terms offer and answer come in.
*/

/*🟢 1. Offer

The offer is created by the user who starts the connection (caller / initiator).

It contains details such as:
Supported codecs (video/audio formats)
Network info (IP/ports)
Media descriptions (camera/mic tracks)

This is done using:
const offer = await pc.createOffer();
await pc.setLocalDescription(offer);
The offer SDP (Session Description Protocol) is then sent to the other peer 
using a signaling method — in your case, Socket.io:
socket.emit("offer", { sdp: offer, to: id });

🔵 2. Answer

The answer is created by the peer who receives the offer (callee / receiver).
It tells the caller:
“Yes, I accept your offer, and here’s how I can connect back.”

This is done using:
await pc.setRemoteDescription(new RTCSessionDescription(offer));
const answer = await pc.createAnswer();
await pc.setLocalDescription(answer);
socket.emit("answer", { sdp: answer, to: from });
So now both peers have:
The other’s SDP information (offer/answer)
Each knows how to send media to the other
At this point, the connection can be established (once ICE candidates finish exchanging).

⚙️ 3. ICE Candidates (Next Step)
Even after offer/answer exchange, the peers need to figure out the best network route between them.
That’s where ICE candidates (Interactive Connectivity Establishment) come in — they describe possible 
network paths (e.g., public IP, private IP, relay).


💡 Simple Analogy
Stage	         Description	                                          Analogy
Offer	         “Here’s how I can talk — can you hear me?”	             Caller sends details
Answer	         “Yes, I can — here’s how you can talk to me.”	          Receiver replies
ICE Candidates	“Here are my possible routes.”	                          They exchange IP addresses 
*/
/*🎯 In a WebRTC call:
Role	                                                Action	                  Description
Person who creates the meeting / starts the call	Creates an offer	This user’s browser prepares its media setup (video/audio info, codecs, connection details) and sends it to others.
Person who joins the meeting / receives the call	Creates an answer	This user’s browser receives the offer, sets it as the remote description, then generates its own connection info and sends it back as an answer.
*/

