import React, { useEffect, useRef, useState } from "react";
import MeetingSocket from "../services/meetingSocket";
import { v4 as uuidv4 } from "uuid";

/**
 * 🎥 VideoChat Component
 * Handles video streaming for existing meeting rooms.
 * Uses Socket.IO for signaling (offer/answer/ICE exchange).
 */
export default function VideoChat({ meetingId, userId, localStream, isMuted, isVideoOff }) {
  const [joined, setJoined] = useState(false);
  const localVideoRef = useRef(null);
  const localStreamRef = useRef(null);
  const pcRef = useRef({}); // Each user gets its own RTCPeerConnection instance

  /** 🚪 Auto-join the meeting room */
  useEffect(() => {
    if (meetingId && userId) {
      console.log('VideoChat: Auto-joining meeting room - meetingId:', meetingId, 'userId:', userId, 'joined:', joined);
      if (!joined) {
        joinMeetingRoom();
      }
    }
  }, [meetingId, userId]);

  /** 🎥 Set up local video stream */
  useEffect(() => {
    console.log('VideoChat: Stream effect triggered', { localStream: !!localStream, videoRef: !!localVideoRef.current });
    if (localStream && localVideoRef.current) {
      localVideoRef.current.srcObject = localStream;
      localStreamRef.current = localStream;
      console.log('VideoChat: Local stream assigned to video element');
      
      // Ensure video plays
      localVideoRef.current.play().catch(err => {
        console.log('VideoChat: Video play failed (this is normal):', err);
      });
    }
  }, [localStream]);

  /** 🎥 Additional effect to handle video ref changes */
  useEffect(() => {
    if (localVideoRef.current && localStreamRef.current) {
      localVideoRef.current.srcObject = localStreamRef.current;
      console.log('VideoChat: Re-assigned stream to new video ref');
      
      localVideoRef.current.play().catch(err => {
        console.log('VideoChat: Video play failed on ref change:', err);
      });
    }
  }, [localVideoRef.current]);

  const joinMeetingRoom = async () => {
    if (!meetingId) return;
    
    try {
      setJoined(true);

      // Use the passed localStream instead of creating a new one
      if (localStream) {
        console.log('VideoChat: Using provided local stream');
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = localStream;
          console.log('VideoChat: Stream assigned to video element');
        }
        localStreamRef.current = localStream;
      } else {
        console.warn('VideoChat: No local stream provided');
      }

      // VideoChat doesn't need to join again - the meeting is already joined via MeetingSocket
      // We just set up WebRTC peer connections based on existing participants
      console.log('VideoChat: Ready for WebRTC connections in meeting', meetingId);
    } catch (error) {
      console.error('Error setting up video chat:', error);
      setJoined(false);
    }
  };

  // Effect to re-assign stream when video ref changes (component remount)
  useEffect(() => {
    const videoElement = localVideoRef.current;
    if (videoElement && localStreamRef.current) {
      console.log('VideoChat: Video element ready, assigning stream');
      videoElement.srcObject = localStreamRef.current;
      
      // Auto-play the video
      videoElement.play().catch(err => {
        console.log('VideoChat: Auto-play prevented (normal behavior):', err.message);
      });
    }
  }, [localVideoRef.current]);

  /** 🔗 WebRTC signaling logic via MeetingSocket */
  useEffect(() => {
    // Listen for existing participants when we join
    MeetingSocket.on("meeting-joined", async (data) => {
      console.log('VideoChat: Meeting joined, existing participants:', data.existingParticipants);
      // Create peer connections with existing participants regardless of local stream
      if (data.existingParticipants) {
        for (const participant of data.existingParticipants) {
          console.log('VideoChat: Creating connection with existing participant:', participant.socketId);
          await createPeerConnection(participant.socketId, true);
        }
      }
    });

    // A new user joins
    MeetingSocket.on("user-joined", async (participant) => {
      console.log('VideoChat: New user joined for WebRTC:', participant);
      await createPeerConnection(participant.socketId, false);
    });

    // Receive an offer
    MeetingSocket.on("offer", async ({ from, sdp }) => {
      console.log('VideoChat: Received offer from:', from);
      try {
        const pc = await createPeerConnection(from, false);
        await pc.setRemoteDescription(new RTCSessionDescription(sdp));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        MeetingSocket.emit("answer", { to: from, sdp: answer });
        console.log('VideoChat: Sent answer to:', from);
      } catch (error) {
        console.error('VideoChat: Error handling offer:', error);
      }
    });

    // Receive an answer
    MeetingSocket.on("answer", async ({ from, sdp }) => {
      console.log('VideoChat: Received answer from:', from);
      try {
        const pc = pcRef.current[from];
        if (pc) {
          await pc.setRemoteDescription(new RTCSessionDescription(sdp));
          console.log('VideoChat: Set remote description from answer');
        }
      } catch (error) {
        console.error('VideoChat: Error handling answer:', error);
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
      const video = document.getElementById(data.socketId);
      if (video) {
        video.remove();
        console.log('VideoChat: Removed video element for:', data.socketId);
      }
      if (pcRef.current[data.socketId]) {
        pcRef.current[data.socketId].close();
        delete pcRef.current[data.socketId];
        console.log('VideoChat: Closed peer connection for:', data.socketId);
      }
    });

    return () => {
      MeetingSocket.off("meeting-joined");
      MeetingSocket.off("user-joined");
      MeetingSocket.off("offer");
      MeetingSocket.off("answer");
      MeetingSocket.off("ice-candidate");
      MeetingSocket.off("user-left");
    };
  }, []);

  /** 🎛️ Create WebRTC Peer Connection */
  const createPeerConnection = async (id, isInitiator) => {
    try {
      console.log(`VideoChat: Creating peer connection with ${id}, isInitiator: ${isInitiator}, hasLocalStream: ${!!localStreamRef.current}`);
      
      const pc = new RTCPeerConnection({
        iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
      });

      // Send ICE candidates to the other peer
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          console.log('VideoChat: Sending ICE candidate to:', id);
          MeetingSocket.emit("ice-candidate", { to: id, candidate: event.candidate });
        }
      };

      // When remote stream arrives - this works regardless of local stream
      pc.ontrack = (event) => {
        console.log('VideoChat: Received remote stream from:', id);
        const existingVideo = document.getElementById(id);
        if (existingVideo) {
          console.log('VideoChat: Updating existing video element');
          existingVideo.srcObject = event.streams[0];
          return;
        }

        const video = document.createElement("video");
        video.id = id;
        video.srcObject = event.streams[0];
        video.autoplay = true;
        video.playsInline = true;
        video.muted = false; // Don't mute remote streams
        video.className = 
          "w-full max-w-lg h-64 md:h-80 border-2 border-blue-400 rounded-xl shadow-lg object-cover";
        
        const videoGrid = document.getElementById("video-grid");
        if (videoGrid) {
          videoGrid.appendChild(video);
          console.log('VideoChat: Added remote video element for:', id);
        } else {
          console.error('VideoChat: video-grid not found!');
        }
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
        console.log('VideoChat: Creating offer for:', id);
        const offer = await pc.createOffer({
          offerToReceiveAudio: true,
          offerToReceiveVideo: true
        });
        await pc.setLocalDescription(offer);
        MeetingSocket.emit("offer", { to: id, sdp: offer });
        console.log('VideoChat: Sent offer to:', id);
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
        // 🔹 Meeting Screen
        <div className="w-full h-full">
          <div
            id="video-grid"
            className="flex flex-wrap justify-center gap-4 h-full items-center"
          >
            {/* Local video - only show if we have a stream */}
            {localStream && (
              <div className="relative w-full max-w-md h-64 bg-gray-800 rounded-xl shadow-lg overflow-hidden">
                <video
                  ref={localVideoRef}
                  autoPlay
                  muted
                  playsInline
                  className={`w-full h-full object-cover transition-opacity duration-300 ${
                    isVideoOff ? 'opacity-0' : 'opacity-100'
                  }`}
                />
                {isVideoOff && (
                  <div className="absolute inset-0 flex items-center justify-center bg-gray-800">
                    <div className="text-center text-white">
                      <div className="w-16 h-16 bg-gray-600 rounded-full flex items-center justify-center mx-auto mb-3">
                        <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-6-3a2 2 0 11-4 0 2 2 0 014 0zm-2 4a5 5 0 00-4.546 2.916A5.986 5.986 0 0010 16a5.986 5.986 0 004.546-2.084A5 5 0 0010 11z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <p className="text-sm text-gray-300">Camera is off</p>
                    </div>
                  </div>
                )}
              </div>
            )}
            {/* Remote videos will be dynamically added here via createPeerConnection */}
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

