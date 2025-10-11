import React, { useState, useEffect } from 'react';
import MeetingSocket from '../services/meetingSocket';

const ChatTest = () => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [socketId, setSocketId] = useState('');
  const testMeetingId = 'test-meeting-123';
  const testUserId = 'test-user-456';

  useEffect(() => {
    // Connect to socket
    console.log('ChatTest: Connecting to socket...');
    MeetingSocket.connect(testUserId);

    // Set up listeners
    MeetingSocket.on('connected', (data) => {
      console.log('ChatTest: Socket connected:', data);
      setIsConnected(true);
      setSocketId(data.socketId);
    });

    MeetingSocket.on('disconnected', () => {
      console.log('ChatTest: Socket disconnected');
      setIsConnected(false);
      setSocketId('');
    });

    MeetingSocket.on('meeting-joined', (data) => {
      console.log('ChatTest: Meeting joined:', data);
    });

    MeetingSocket.on('message-received', (message) => {
      console.log('ChatTest: Message received:', message);
      const receivedMessage = {
        ...message,
        isOwn: false
      };
      setMessages(prev => [...prev, receivedMessage]);
    });

    // Join test meeting after a short delay
    setTimeout(() => {
      if (MeetingSocket.isConnected) {
        console.log('ChatTest: Joining meeting:', testMeetingId);
        MeetingSocket.joinMeeting(testMeetingId);
      }
    }, 1000);

    return () => {
      MeetingSocket.disconnect();
    };
  }, []);

  const sendMessage = () => {
    console.log('ChatTest: Sending message:', newMessage);
    if (newMessage.trim()) {
      const message = {
        id: Date.now(),
        text: newMessage.trim(),
        sender: 'Test User',
        senderId: testUserId,
        timestamp: new Date(),
        isOwn: true
      };
      
      // Add to local messages
      setMessages(prev => [...prev, message]);
      setNewMessage('');
      
      // Send via socket
      MeetingSocket.sendMessage(testMeetingId, message);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-8">Socket Chat Test</h1>
        
        {/* Connection Status */}
        <div className="bg-gray-800 rounded-lg p-4 mb-6">
          <h2 className="text-xl font-bold text-white mb-2">Connection Status</h2>
          <div className="text-sm text-gray-300 space-y-1">
            <p>Connected: {isConnected ? '✅ Yes' : '❌ No'}</p>
            <p>Socket ID: {socketId || 'Not connected'}</p>
            <p>Meeting ID: {testMeetingId}</p>
            <p>User ID: {testUserId}</p>
          </div>
        </div>

        {/* Chat Area */}
        <div className="bg-gray-800 rounded-lg p-6">
          <h2 className="text-xl font-bold text-white mb-4">Chat Messages</h2>
          
          {/* Messages */}
          <div className="bg-gray-700 rounded-lg p-4 h-64 overflow-y-auto mb-4">
            {messages.length === 0 ? (
              <p className="text-gray-400">No messages yet...</p>
            ) : (
              messages.map(msg => (
                <div key={msg.id} className={`mb-2 ${msg.isOwn ? 'text-right' : 'text-left'}`}>
                  <div className={`inline-block px-3 py-2 rounded-lg max-w-xs ${
                    msg.isOwn 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-gray-600 text-gray-100'
                  }`}>
                    <div className="text-xs opacity-75 mb-1">{msg.sender}</div>
                    <div>{msg.text}</div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Message Input */}
          <div className="flex gap-2">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
              placeholder="Type a message..."
              className="flex-1 px-3 py-2 bg-gray-600 text-white rounded-lg border border-gray-500 focus:border-blue-500 focus:outline-none"
              disabled={!isConnected}
            />
            <button
              onClick={sendMessage}
              disabled={!isConnected || !newMessage.trim()}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg font-semibold"
            >
              Send
            </button>
          </div>
        </div>

        {/* Debug Buttons */}
        <div className="mt-6 flex gap-4">
          <button
            onClick={() => {
              console.log('Manual join meeting');
              MeetingSocket.joinMeeting(testMeetingId);
            }}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg"
          >
            Join Meeting
          </button>
          
          <button
            onClick={() => {
              console.log('Manual socket connect');
              MeetingSocket.connect(testUserId);
            }}
            className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg"
          >
            Reconnect
          </button>

          <button
            onClick={() => {
              const testMsg = {
                id: Date.now(),
                text: 'Test message from debug button',
                sender: 'Debug',
                senderId: testUserId,
                timestamp: new Date(),
                isOwn: true
              };
              setMessages(prev => [...prev, testMsg]);
              MeetingSocket.sendMessage(testMeetingId, testMsg);
            }}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg"
          >
            Send Test Message
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatTest;