import React, { useEffect, useRef, useState } from "react";
import { socket } from "../utils/socket";
import { v4 as uuidv4 } from "uuid";

/**
 * 🎥 VideoChat Component
 * Handles joining/creating meeting rooms and connecting users with WebRTC.
 * Uses Socket.IO for signaling (offer/answer/ICE exchange).
 */
export default function VideoChat() {
  const [roomId, setRoomId] = useState("");
  const [joined, setJoined] = useState(false);
  const localVideoRef = useRef(null);
  const localStreamRef = useRef(null);
  const pcRef = useRef({}); // Each user gets its own RTCPeerConnection instance

  /** 🏠 Create unique Room ID */
  const createRoom = () => {
    const id = uuidv4().slice(0, 8);
    setRoomId(id);
  };

  /** 🚪 Join a room (existing or new) */
  const joinRoom = async () => {
    if (!roomId.trim()) return alert("Please enter or create a Room ID!");
    setJoined(true);

    // Access camera and microphone
    const stream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: true,
    });

    // Attach local video stream
    localVideoRef.current.srcObject = stream;
    localStreamRef.current = stream;

    // Notify server
    socket.emit("join-room", roomId);
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
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 text-gray-800 p-4">
      {!joined ? (
        // 🔹 Lobby Screen
        <div className="bg-white p-6 rounded-2xl shadow-lg w-full max-w-md text-center">
          <h2 className="text-2xl font-bold mb-4 text-gray-700">
            🎥 Join or Create a Meeting
          </h2>

          <div className="flex gap-2 mb-3">
            <input
              type="text"
              placeholder="Enter Room ID"
              value={roomId}
              onChange={(e) => setRoomId(e.target.value)}
              className="flex-1 border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-400 outline-none"
            />
            <button
              onClick={createRoom}
              className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              New
            </button>
          </div>

          <button
            onClick={joinRoom}
            className="w-full py-2 mt-2 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition"
          >
            Join Room
          </button>
        </div>
      ) : (
        // 🔹 Meeting Screen
        <div className="w-full max-w-5xl bg-white p-6 rounded-2xl shadow-lg">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">
              Room ID: <span className="text-blue-600">{roomId}</span>
            </h3>
            <button
              onClick={() => window.location.reload()}
              className="text-red-500 hover:underline"
            >
              Leave
            </button>
          </div>

          <div
            id="video-grid"
            className="flex flex-wrap justify-center gap-4 border-t pt-4"
          >
            <video
              ref={localVideoRef}
              autoPlay
              muted
              playsInline
              className="w-48 md:w-60 border-2 border-green-400 rounded-xl shadow-md"
            />
          </div>
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

