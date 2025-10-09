import express from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import dotenv from 'dotenv'
import connectMongoDB from './db/connectMongoDB.js'
import path from 'path'
import { fileURLToPath } from 'url'

import http from "http";
import { Server } from 'socket.io'

// Get current directory for ES modules
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Load environment variables
dotenv.config({ path: path.join(__dirname, '.env') })

const app = express()
const PORT = process.env.PORT || 5001

// Middleware
app.use(cors({
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    credentials: true
}))
app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(cookieParser())

//🧩 1️⃣ Importing / Creating Server
const server = http.createServer(app)
//Creates an HTTP server that wraps around your Express app (app).
// This server will handle both HTTP requests (via Express) and WebSocket connections (via Socket.IO)
//Express handles normal HTTP routes (like /api, /login, etc.), and this same server will also handle real-time connections (via Socket.IO).

// ⚡ 2️⃣ Attaching Socket.IO
const io = new Server(server, {
    cors: { origin: "http://localhost:5173", methods: ["GET", "POST"] },
})
//new Server(server, options) creates a Socket.IO server instance. Attaches Socket.IO to the HTTP server created above
// Enables real-time, bidirectional communication between client and server
// origin: "http://localhost:5173": Allows connections only from this frontend URL (typical Vite dev server port)
// methods: ["GET", "POST"]: Specifies which HTTP methods are allowed for CORS requests
// This ensures that browsers won’t block the WebSocket connection due to CORS issues.

// HANDLING MULTIPLE USERS
const users = {}; // roomId -> array of socket IDs

//👥 3️⃣ Handling New Socket Connections
io.on("connection",(socket) => {
    console.log("User connected", socket.id); //Each user (browser tab) gets a unique socket ID.
    
//🏠 4️⃣ Joining a Room
    socket.on("join-room", (roomId) => {
    if (!users[roomId]) users[roomId] = [];
    users[roomId].push(socket.id);
    socket.join(roomId);

    const otherUsers = users[roomId].filter((id) => id !== socket.id);
    socket.emit("all-users", otherUsers);

    socket.to(roomId).emit("user-joined", socket.id);
  });
/*When a client emits "join-room" with a roomId:
The server adds that socket to a Socket.IO room (like a private group chat).
Then, it notifies everyone else in the same room that a new user has joined, sending the new user’s socket.id.
✅ This is how multiple users in the same meeting room are grouped.
*/

// 5,6,7 POINTS NECESSARY FOR peer-to-peer (P2P) connection setup in WebRTC.
//Necessary only if you’re implementing WebRTC (video/audio calling or screen sharing) functionality.
//❌Not needed if We’re only using Socket.IO for:
// Chat messaging (text only).
// Collaborative whiteboard.
// Notifications, live updates, or presence status.

//🎥 5️⃣ WebRTC Offer (Peer Connection Start)
//  socket.on("offer",(data) => {
//     socket.to(data.to).emit("offer",{sdp:data.sdp, from: socket.id});
//  });   // fOR SINGLE USER
 socket.on("offer", ({ to, sdp }) => { // Multiple user
    io.to(to).emit("offer", { from: socket.id, sdp });
  });
 /*The “offer” is part of the WebRTC handshake.
One peer sends a Session Description (SDP offer) to another peer (data.to is the target socket ID).
The server forwards this message to that specific peer — it does not process it.
Socket.IO is only used here for signaling — exchanging information needed to set up the direct P2P connection.
*/
// 🎬 6️⃣ WebRTC Answer
  socket.on("answer", ({ to, sdp }) => {
    io.to(to).emit("answer", { from: socket.id, sdp });
  });
/*The second peer responds with an answer SDP.
Again, the server just relays this back to the peer who sent the offer.*/

// ❄️ 7️⃣ ICE Candidates Exchange (Exchanges network connection details (IPs, ports).)
 socket.on("ice-candidate", ({ to, candidate }) => {
    io.to(to).emit("ice-candidate", { from: socket.id, candidate });
  });
/*WebRTC needs to know the best path between two peers (network-wise).
ICE candidates are small pieces of connection info (like IP addresses and ports).
These are exchanged continuously between peers via the server.*/

// 8️⃣ Handle Disconnection
socket.on("disconnect", () => {
    for (const roomId in users) {
      users[roomId] = users[roomId].filter((id) => id !== socket.id);
      socket.to(roomId).emit("user-left", socket.id);
      if (users[roomId].length === 0) delete users[roomId];
    }
    console.log("User disconnected:", socket.id);
  });//Logs when a user disconnects or closes the browser tab.
})

// API routes (to be added)
// app.use('/api/auth', authRoutes)
// app.use('/api/users', userRoutes)
// app.use('/api/meetings', meetingRoutes)

server.listen(PORT, () => {
    connectMongoDB()
    console.log(`Server is running on port ${PORT}`)
})
//Starts the HTTP + Socket.IO server on port 5000.



/*
🧠 In Simple Terms
This code:
Lets multiple users join rooms (like a meeting room).
Helps users discover and connect to each other using WebRTC.
Acts as a signaling server (not a media server) — it just exchanges
connection info (SDP, ICE), not the actual video/audio streams.*/

/*An ICE candidate (Interactive Connectivity Establishment candidate) is a small piece of network information
 (like an IP address + port) that helps two peers (your browser and another user’s browser) find the best possible path to connect directly.
In short:
🔹 ICE Candidates = “Possible ways for two computers to reach each other directly.”
💡 Why It’s Needed
When you’re using WebRTC for video/audio:
The browsers try to connect peer-to-peer (P2P) to minimize delay.
But every user is behind different networks (Wi-Fi, 4G, office firewall, etc.).
So, the browser must figure out how to connect to the other peer.*/ 