// frontend/src/components/VideoChat.jsx
import React, { useEffect, useRef, useState } from "react";
import { socket } from "../utils/socket";

export default function VideoChat() {
  // Room ID for users to join (here fixed to "main-room")
  const [roomId] = useState("main-room");

  // References to local and remote video elements
  const localVideoRef = useRef();
  const remoteVideoRef = useRef();
  //localVideoRef: reference to your local video element (self-view).
// remoteVideoRef: reference to the remote user’s video stream.

  // Reference to WebRTC PeerConnection
  const pcRef = useRef();

//Main WebRTC logic
  useEffect(() => { //Everything inside useEffect runs once when the component mounts.
    // Create a new RTCPeerConnection with a public STUN server
    // STUN helps devices discover their public IP to connect directly
    const pc = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
    });
    pcRef.current = pc;

    // Step 1: Join a specific meeting room
    socket.emit("join-room", roomId);
    //Tells the signaling server this user wants to join a specific room.
    // The server will then notify other users in that room.

    // Step 2: Get local camera + microphone stream
    navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      .then((stream) => {
        // Show your own camera stream
        localVideoRef.current.srcObject = stream;

        // Add each media track to the PeerConnection (so the other peer can receive it)
        stream.getTracks().forEach((track) => pc.addTrack(track, stream));
      });

    // 6️⃣ Handle New User Joining
    // Step 3: When another user joins the room
    socket.on("user-joined", async (id) => {
      // Create an offer (your connection details)
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      // Send the offer SDP to the other user through socket
      socket.emit("offer", { sdp: offer, to: id });
    });

// 7️⃣ Handle Receiving an Offer
    // Step 4: When you receive an offer from another user
    socket.on("offer", async ({ sdp, from }) => {
      // Set their offer as your remote description
      await pc.setRemoteDescription(new RTCSessionDescription(sdp));

      // Create an answer (your connection info)
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      // Send the answer SDP back to the offer sender
      socket.emit("answer", { sdp: answer, to: from });
    });

// 8️⃣ Handle Receiving an Answer
    // Step 5: When you receive the answer to your offer
    socket.on("answer", async ({ sdp }) => {
      // Set the remote description so connection can complete
      await pc.setRemoteDescription(new RTCSessionDescription(sdp));
    });//Now both peers have exchanged SDP info, and connection setup can complete.

// 9️⃣ ICE Candidates (Network Path Discovery)
    // Step 6: When you receive an ICE candidate from the other peer
    socket.on("ice-candidate", async ({ candidate }) => {
      if (candidate) {
        // Add their ICE candidate to your connection
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      }
    });
    //Each peer discovers possible network paths (ICE candidates).
    // They send them to each other through Socket.io.

    // Step 7: When your browser finds a new ICE candidate
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        // Send your candidate to the other peer via socket
        socket.emit("ice-candidate", {
          to: roomId,
          candidate: event.candidate,
        });
      }
    };

//🔟 Handling Incoming Media
    // Step 8: When remote media (video/audio) is received
    pc.ontrack = (event) => {
      // Display the other user’s video stream
      remoteVideoRef.current.srcObject = event.streams[0];
    };//When the remote peer sends you media, attach it to your remote video element.

    // Cleanup when the component unmounts
    return () => {
      socket.disconnect();
      pc.close();
    };
  }, [roomId]);

  return (
    <div className="flex flex-col items-center gap-4">
      <h2 className="text-xl font-semibold">Live Video Meeting</h2>

      <div className="flex gap-4">
        {/* Local video (muted to prevent echo) */}
        <video ref={localVideoRef} autoPlay muted className="w-64 border rounded" />

        {/* Remote video (from the connected user) */}
        <video ref={remoteVideoRef} autoPlay className="w-64 border rounded" />
      </div>
    {/* //Displays two video elements:
Local video (muted to prevent echo)
Remote video (for the other user) */}
    </div>
  );
}

// Step	 Action	                            Who does it
// 1	User joins room	                    Client → Server
// 2	Server tells others “user joined”	Server → Clients
// 3	Offer is created and sent	        Peer A → Peer B
// 4	Answer is created and sent	        Peer B → Peer A
// 5	ICE candidates exchanged	        Both ways
// 6	Streams connected	                WebRTC

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




MAKE IT FOR MULTI USERS AND
 MAKE GIT REPO