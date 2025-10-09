🧩 Overall Idea
This component creates a real-time peer-to-peer video chat using:
WebRTC → for actual audio/video streaming between users.
Socket.io → for signaling (i.e., exchanging offers, answers, and ICE candidates).
It assumes a signaling server (your Node.js backend) is already running and handling socket events.


Backend - npm i socket.io
Frontend -> npm install socket.io-client
            npm install uuid


A simple visual diagram showing how the WebRTC offer–answer–ICE signaling flow works between the Host (meeting creator) and Guest (joining user).

          ┌──────────────────────────────┐
          │         Signaling Server      │
          │      (Socket.io / WebSocket)  │
          └──────────────────────────────┘
                         ▲
                         │
     ┌───────────────────┼───────────────────┐
     │                   │                   │
     │                   │                   │
┌───────────────┐                         ┌───────────────┐
│   HOST (A)    │                         │   GUEST (B)   │
│ Creates Room  │                         │ Joins Room    │
└───────────────┘                         └───────────────┘
     │                                           │
     │ 1️⃣ Join room → "join-room"               │
     ├──────────────────────────────────────────▶│
     │                                           │
     │                                           │
     │ 2️⃣ Server says: "user-joined"            │
     │◀──────────────────────────────────────────┤
     │                                           │
     │ 3️⃣ Create Offer (SDP)                    │
     │ setLocalDescription(offer)                │
     │                                           │
     │ 4️⃣ Send Offer to Guest → "offer"         │
     ├──────────────────────────────────────────▶│
     │                                           │
     │                                           │
     │                5️⃣ Guest Receives Offer   │
     │                setRemoteDescription(offer)│
     │                createAnswer()             │
     │                setLocalDescription(answer)│
     │                                           │
     │ 6️⃣ Send Answer back → "answer"           │
     │◀──────────────────────────────────────────┤
     │                                           │
     │ 7️⃣ Host sets Remote Description (answer) │
     │                                           │
     │──────────────────────────────────────────▶│
     │                                           │
     │ 8️⃣ Exchange ICE Candidates (possible     │
     │     IP/network routes) via "ice-candidate"│
     │◀──────────────────────────────────────────▶│
     │                                           │
     │ 9️⃣ WebRTC finds best route (P2P)         │
     │                                           │
     │  🔗 ✅ DIRECT VIDEO/AUDIO CONNECTION ✅   │
     │                                           │
     ▼                                           ▼
 ┌───────────┐                            ┌───────────┐
 │Local Video│                            │Remote Video│
 └───────────┘                            └───────────┘
