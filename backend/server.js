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

// Enhanced CORS configuration for mobile devices
const allowedOrigins = [
    // Development origins
    "http://localhost:3000", 
    "http://localhost:5173", 
    "http://localhost:5174", 
    "http://localhost:5175", 
    "http://localhost:5176",
    
    // Network IP for mobile access (development)
    "http://172.23.247.244:5174",
    "http://172.23.247.244:5173",
    "http://172.23.247.244:3000",
    
    // Production domains (ADD YOUR ACTUAL DOMAINS HERE)
    "https://your-domain.com",
    "https://www.your-domain.com",
    "https://edumeet.your-domain.com",
    
    // Development mobile network ranges
    /^http:\/\/192\.168\.\d{1,3}\.\d{1,3}:(5173|5174|3000)$/,
    /^http:\/\/10\.\d{1,3}\.\d{1,3}\.\d{1,3}:(5173|5174|3000)$/,
    /^http:\/\/172\.\d{1,3}\.\d{1,3}\.\d{1,3}:(5173|5174|3000)$/
];

// Middleware
app.use(cors({
    origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps)
        if (!origin) return callback(null, true);
        
        // Check if origin is in allowed list
        if (allowedOrigins.some(allowedOrigin => {
            if (typeof allowedOrigin === 'string') {
                return allowedOrigin === origin;
            } else {
                return allowedOrigin.test(origin);
            }
        })) {
            return callback(null, true);
        }
        
        console.log('CORS blocked origin:', origin);
        return callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept']
}))
app.use(express.json({ limit: '50mb' }))
app.use(express.urlencoded({ extended: true, limit: '50mb' }))
app.use(cookieParser())

// Handle preflight OPTIONS requests for mobile
app.options('*', (req, res) => {
    res.header('Access-Control-Allow-Origin', req.get('Origin') || '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept, Origin, X-Requested-With');
    res.header('Access-Control-Allow-Credentials', 'true');
    res.sendStatus(200);
});

// Add request logging for debugging mobile issues
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    console.log('Origin:', req.get('Origin'));
    console.log('User-Agent:', req.get('User-Agent'));
    next();
});

//🧩 1️⃣ Importing / Creating Server
const server = http.createServer(app)
//Creates an HTTP server that wraps around your Express app (app).
// This server will handle both HTTP requests (via Express) and WebSocket connections (via Socket.IO)
//Express handles normal HTTP routes (like /api, /login, etc.), and this same server will also handle real-time connections (via Socket.IO).

// ⚡ 2️⃣ Attaching Socket.IO with enhanced mobile support
const io = new Server(server, {
    cors: { 
        origin: function (origin, callback) {
            // Allow requests with no origin (like mobile apps)
            if (!origin) return callback(null, true);
            
            // Check if origin is in allowed list
            if (allowedOrigins.some(allowedOrigin => {
                if (typeof allowedOrigin === 'string') {
                    return allowedOrigin === origin;
                } else {
                    return allowedOrigin.test(origin);
                }
            })) {
                return callback(null, true);
            }
            
            console.log('Socket.IO CORS blocked origin:', origin);
            return callback(new Error('Not allowed by CORS'));
        },
        methods: ["GET", "POST"],
        credentials: true
    },
    // Enhanced connection options for mobile
    transports: ['websocket', 'polling'],
    pingTimeout: 60000,
    pingInterval: 25000
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
  connectMongoDB()
  console.log(`Server is running on http://172.23.247.244:${PORT}`);
  console.log(`Mobile access: http://172.23.247.244:${PORT}`);
});

//Starts the HTTP + Socket.IO server on port 5000.


