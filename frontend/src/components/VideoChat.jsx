import React, { useEffect, useRef, useState } from "react";
import { socket } from "../utils/socket";
import { v4 as uuidv4 } from "uuid";

/**
 * 🎥 VideoChat Component
 * Handles video streaming for existing meeting rooms.
 * Uses Socket.IO for signaling (offer/answer/ICE exchange).
 */
export default function VideoChat({ meetingId, userId, localStream }) {
  const [joined, setJoined] = useState(false);
  const localVideoRef = useRef(null);
  const localStreamRef = useRef(null);
  const pcRef = useRef({}); // Each user gets its own RTCPeerConnection instance

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
      console.log('VideoChat: Local stream set up');
    }
  }, [localStream]);

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

      // Notify server
      socket.emit("join-room", meetingId);
      console.log('VideoChat: Joined meeting room', meetingId);
    } catch (error) {
      console.error('Error joining meeting room:', error);
      setJoined(false);
    }
  };

  /** 🔗 WebRTC signaling logic via Socket.IO */
  useEffect(() => {
    // Existing users in the room
    socket.on("all-users", async (userIds) => {
      for (const id of userIds) await createPeerConnection(id, true);
    });

    // A new user joins
    socket.on("user-joined", async (id) => {
      await createPeerConnection(id, false);
    });

    // Receive an offer
    socket.on("offer", async ({ from, sdp }) => {
      const pc = await createPeerConnection(from, false);
      await pc.setRemoteDescription(new RTCSessionDescription(sdp));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socket.emit("answer", { to: from, sdp: answer });
    });

    // Receive an answer
    socket.on("answer", async ({ from, sdp }) => {
      const pc = pcRef.current[from];
      if (pc) await pc.setRemoteDescription(new RTCSessionDescription(sdp));
    });

    // Receive ICE candidate
    socket.on("ice-candidate", async ({ from, candidate }) => {
      const pc = pcRef.current[from];
      if (pc && candidate)
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
    });

    // When a user leaves
    socket.on("user-left", (id) => {
      const video = document.getElementById(id);
      if (video) video.remove();
      if (pcRef.current[id]) pcRef.current[id].close();
      delete pcRef.current[id];
    });

    return () => {
      socket.off("all-users");
      socket.off("user-joined");
      socket.off("offer");
      socket.off("answer");
      socket.off("ice-candidate");
      socket.off("user-left");
    };
  }, []);

  /** 🎛️ Create WebRTC Peer Connection */
  const createPeerConnection = async (id, isInitiator) => {
    const pc = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
    });

    // Send ICE candidates to the other peer
    pc.onicecandidate = (event) => {
      if (event.candidate)
        socket.emit("ice-candidate", { to: id, candidate: event.candidate });
    };

    // When remote stream arrives
    pc.ontrack = (event) => {
      const video = document.createElement("video");
      video.id = id;
      video.srcObject = event.streams[0];
      video.autoplay = true;
      video.playsInline = true;
      video.className =
        "w-48 md:w-60 border-2 border-blue-400 rounded-xl shadow-md";
      document.getElementById("video-grid").appendChild(video);
    };

    // Add local tracks to the connection
    localStreamRef.current.getTracks().forEach((track) => {
      pc.addTrack(track, localStreamRef.current);
    });

    pcRef.current[id] = pc;

    // If user is initiator, create an offer
    if (isInitiator) {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      socket.emit("offer", { to: id, sdp: offer });
    }

    return pc;
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
            <video
              ref={localVideoRef}
              autoPlay
              muted
              playsInline
              className="w-full max-w-md h-64 bg-gray-800 rounded-xl shadow-lg object-cover"
            />
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

