import {io} from "socket.io-client"

export const socket = io("http://172.23.247.244:5173",{//This line creates a socket connection to your backend server.
    transports: ["websocket"],
})//This line creates a socket connection to your backend server.

//io is a function provided by the library that helps you connect 
// your frontend to a Socket.IO server (usually running on your backend).

/*
3. transports: ["websocket"]
Socket.IO supports two main transport mechanisms:
HTTP long polling (fallback)
WebSocket (real-time, full-duplex)
By default, Socket.IO starts with HTTP polling and upgrades to WebSocket.
Setting transports: ["websocket"] forces it to connect directly via WebSocket, skipping the fallback.
This is faster and often preferred in controlled environments (like local development
 or production with proper setup).
*/