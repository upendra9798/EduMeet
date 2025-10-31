import {io} from "socket.io-client"

// Get socket URL from environment or use fallback
const getSocketUrl = () => {
  if (import.meta.env.VITE_SOCKET_URL) {
    return import.meta.env.VITE_SOCKET_URL;
  }
  
  // For mobile devices, use the network IP instead of localhost
  const hostname = window.location.hostname;
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return 'http://172.23.247.244:5001';
  } else {
    return `${window.location.protocol}//${hostname}:5001`;
  }
};

export const socket = io(getSocketUrl(), {
    // Use both transports for better mobile compatibility
    transports: ["websocket", "polling"],
    // Enhanced mobile settings
    timeout: 20000,
    forceNew: true,
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionAttempts: 10,
    maxReconnectionAttempts: 10
});

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