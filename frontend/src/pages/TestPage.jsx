import React, { useState, useEffect, useRef } from 'react';

const TestPage = () => {
  const [localStream, setLocalStream] = useState(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const videoRef = useRef(null);

  // Initialize media stream
  useEffect(() => {
    const initializeMedia = async () => {
      try {
        console.log('Requesting media access...');
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true
        });
        console.log('Media stream obtained:', stream);
        setLocalStream(stream);
        
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          console.log('Video element updated with stream');
        }
      } catch (error) {
        console.error('Error accessing media devices:', error);
        alert('Failed to access camera/microphone: ' + error.message);
      }
    };

    initializeMedia();

    return () => {
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const toggleMute = () => {
    console.log('TEST toggleMute called - isMuted:', isMuted, 'localStream:', localStream);
    if (localStream) {
      const audioTracks = localStream.getAudioTracks();
      console.log('Audio tracks found:', audioTracks.length);
      audioTracks.forEach((track, index) => {
        console.log(`Audio track ${index} - enabled before:`, track.enabled);
        track.enabled = isMuted; // If currently muted, enable; if not muted, disable
        console.log(`Audio track ${index} - enabled after:`, track.enabled);
      });
      setIsMuted(!isMuted);
      console.log('Muted state changed to:', !isMuted);
    } else {
      console.warn('No local stream available for audio control');
    }
  };

  const toggleVideo = () => {
    console.log('TEST toggleVideo called - isVideoOff:', isVideoOff, 'localStream:', localStream);
    if (localStream) {
      const videoTracks = localStream.getVideoTracks();
      console.log('Video tracks found:', videoTracks.length);
      videoTracks.forEach((track, index) => {
        console.log(`Video track ${index} - enabled before:`, track.enabled);
        track.enabled = isVideoOff; // If currently off, enable; if on, disable
        console.log(`Video track ${index} - enabled after:`, track.enabled);
      });
      setIsVideoOff(!isVideoOff);
      console.log('Video off state changed to:', !isVideoOff);
    } else {
      console.warn('No local stream available for video control');
    }
  };

  const sendTestMessage = () => {
    console.log('TEST sendMessage called - newMessage:', newMessage);
    if (newMessage.trim()) {
      const message = {
        id: Date.now(),
        text: newMessage.trim(),
        sender: 'Test User',
        timestamp: new Date(),
        isOwn: true
      };
      
      console.log('Adding test message to local state:', message);
      setMessages(prev => {
        const updated = [...prev, message];
        console.log('Updated test messages:', updated);
        return updated;
      });
      setNewMessage('');
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-8">Media Controls Test Page</h1>
        
        {/* Video Preview */}
        <div className="bg-black rounded-lg mb-8 relative">
          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
            className="w-full h-64 object-cover rounded-lg"
          />
          <div className="absolute bottom-4 left-4 text-white bg-black/50 px-2 py-1 rounded">
            Stream: {localStream ? 'Active' : 'Not Available'}
          </div>
        </div>

        {/* Media Controls */}
        <div className="flex gap-4 mb-8">
          <button
            onClick={toggleMute}
            className={`px-6 py-3 rounded-lg font-semibold transition-all ${
              isMuted 
                ? 'bg-red-600 hover:bg-red-700 text-white' 
                : 'bg-green-600 hover:bg-green-700 text-white'
            }`}
          >
            {isMuted ? '🔇 Unmute' : '🎤 Mute'}
          </button>
          
          <button
            onClick={toggleVideo}
            className={`px-6 py-3 rounded-lg font-semibold transition-all ${
              isVideoOff 
                ? 'bg-red-600 hover:bg-red-700 text-white' 
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            }`}
          >
            {isVideoOff ? '📹 Turn On Video' : '📵 Turn Off Video'}
          </button>
        </div>

        {/* Chat Test */}
        <div className="bg-gray-800 rounded-lg p-6">
          <h2 className="text-xl font-bold text-white mb-4">Chat Test</h2>
          
          {/* Messages */}
          <div className="bg-gray-700 rounded-lg p-4 h-32 overflow-y-auto mb-4">
            {messages.length === 0 ? (
              <p className="text-gray-400">No messages yet...</p>
            ) : (
              messages.map(msg => (
                <div key={msg.id} className="mb-2">
                  <span className="text-blue-400 font-semibold">{msg.sender}: </span>
                  <span className="text-white">{msg.text}</span>
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
              onKeyPress={(e) => e.key === 'Enter' && sendTestMessage()}
              placeholder="Type a test message..."
              className="flex-1 px-3 py-2 bg-gray-600 text-white rounded-lg border border-gray-500 focus:border-blue-500 focus:outline-none"
            />
            <button
              onClick={sendTestMessage}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold"
            >
              Send
            </button>
          </div>
        </div>

        {/* Debug Info */}
        <div className="mt-8 bg-gray-800 rounded-lg p-4">
          <h3 className="text-lg font-bold text-white mb-2">Debug Info</h3>
          <div className="text-sm text-gray-300 space-y-1">
            <p>Local Stream: {localStream ? 'Available' : 'Not Available'}</p>
            <p>Audio Tracks: {localStream ? localStream.getAudioTracks().length : 0}</p>
            <p>Video Tracks: {localStream ? localStream.getVideoTracks().length : 0}</p>
            <p>Is Muted: {isMuted.toString()}</p>
            <p>Is Video Off: {isVideoOff.toString()}</p>
            <p>Messages Count: {messages.length}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TestPage;