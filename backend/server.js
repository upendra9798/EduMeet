import express from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import dotenv from 'dotenv'
import connectMongoDB from './db/connectMongoDB.js'
import path from 'path'
import { fileURLToPath } from 'url'

import http from "http";
import { Server } from 'socket.io'
import whiteboardSocketHandler from './socket/whiteboardSocket.js'
import meetingSocket from './socket/meetingSocket.js'
import whiteboardRoutes from './routes/whiteboardRoutes.js'
import meetingRoutes from './routes/meetingRoutes.js'

// Get current directory for ES modules
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Load environment variables
dotenv.config({ path: path.join(__dirname, '.env') })

const app = express()
const PORT = process.env.PORT || 5001

// Middleware
app.use(cors({
    origin: ["http://localhost:3000", "http://localhost:5173", "http://localhost:5174", "http://localhost:5175", "http://localhost:5176"],
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
    cors: { origin: ["http://localhost:3000", "http://localhost:5173", "http://localhost:5174", "http://localhost:5175", "http://localhost:5176"], methods: ["GET", "POST"] },
})
//new Server(server, options) creates a Socket.IO server instance. Attaches Socket.IO to the HTTP server created above
// Enables real-time, bidirectional communication between client and server
// origin: "http://localhost:5173": Allows connections only from this frontend URL (typical Vite dev server port)
// methods: ["GET", "POST"]: Specifies which HTTP methods are allowed for CORS requests
// This ensures that browsers won’t block the WebSocket connection due to CORS issues.

// ✅ Initialize all socket features (whiteboard, meeting, etc.)
whiteboardSocketHandler(io);
meetingSocket(io);

// API routes
app.use('/api/whiteboard', whiteboardRoutes)
app.use('/api/meetings', meetingRoutes)
// app.use('/api/auth', authRoutes)
// app.use('/api/users', userRoutes)

// server.listen(PORT, () => {
//     connectMongoDB()
//     console.log(`Server is running on port ${PORT}`)
// })
server.listen(PORT, "0.0.0.0", () => {
  console.log(`Server is running on http://172.23.247.244: ${PORT}`);
});

//Starts the HTTP + Socket.IO server on port 5000.


