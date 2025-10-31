import React, { useState, useEffect, useRef } from 'react';
import { socket } from '../utils/socket';

const MobileMediaTest = () => {
  const [testResults, setTestResults] = useState([]);
  const [mediaStream, setMediaStream] = useState(null);
  const [socketConnected, setSocketConnected] = useState(false);
  const [whiteboardSocket, setWhiteboardSocket] = useState(null);
  const videoRef = useRef(null);

  const addResult = (test, status, message) => {
    setTestResults(prev => [...prev, { test, status, message, timestamp: new Date().toLocaleTimeString() }]);
  };

  // Test socket connections
  useEffect(() => {
    // Test main socket
    socket.on('connect', () => {
      setSocketConnected(true);
      addResult('Main Socket', 'success', 'Connected successfully');
    });

    socket.on('disconnect', () => {
      setSocketConnected(false);
      addResult('Main Socket', 'error', 'Disconnected');
    });

    socket.on('connect_error', (error) => {
      addResult('Main Socket', 'error', `Connection error: ${error.message}`);
    });

    // Test whiteboard socket
    const testWhiteboardSocket = async () => {
      try {
        const { io } = await import('socket.io-client');
        
        const getWhiteboardSocketUrl = () => {
          if (import.meta.env.VITE_SOCKET_URL) {
            return `${import.meta.env.VITE_SOCKET_URL}/whiteboard`;
          }
          
          const hostname = window.location.hostname;
          if (hostname === 'localhost' || hostname === '127.0.0.1') {
            return 'http://172.23.247.244:5001/whiteboard';
          } else {
            return `${window.location.protocol}//${hostname}:5001/whiteboard`;
          }
        };

        const wbSocket = io(getWhiteboardSocketUrl(), {
          transports: ["websocket", "polling"],
          timeout: 20000
        });

        wbSocket.on('connect', () => {
          setWhiteboardSocket(wbSocket);
          addResult('Whiteboard Socket', 'success', 'Connected successfully');
        });

        wbSocket.on('connect_error', (error) => {
          addResult('Whiteboard Socket', 'error', `Connection error: ${error.message}`);
        });

      } catch (error) {
        addResult('Whiteboard Socket', 'error', `Import error: ${error.message}`);
      }
    };

    testWhiteboardSocket();

    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('connect_error');
    };
  }, []);

  // Test media devices
  const testMediaDevices = async () => {
    addResult('Media Test', 'testing', 'Testing camera and microphone access...');

    try {
      // Check if mediaDevices is supported
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        addResult('Media Support', 'error', 'getUserMedia not supported');
        return;
      }

      addResult('Media Support', 'success', 'getUserMedia API supported');

      // Test basic constraints first
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true
        });

        setMediaStream(stream);
        addResult('Basic Media', 'success', 'Camera and microphone access granted');

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(e => {
            addResult('Video Playback', 'warning', `Autoplay prevented: ${e.message}`);
          });
        }

        // Test advanced constraints
        const tracks = stream.getTracks();
        tracks.forEach(track => {
          addResult('Track Info', 'info', `${track.kind}: ${track.label || 'unnamed'} - ${track.readyState}`);
        });

      } catch (error) {
        addResult('Basic Media', 'error', `Failed: ${error.name} - ${error.message}`);

        // Try with fallback constraints
        try {
          const fallbackStream = await navigator.mediaDevices.getUserMedia({
            video: { width: 320, height: 240 },
            audio: { echoCancellation: false }
          });
          
          setMediaStream(fallbackStream);
          addResult('Fallback Media', 'success', 'Fallback constraints worked');

        } catch (fallbackError) {
          addResult('Fallback Media', 'error', `Also failed: ${fallbackError.message}`);
        }
      }

    } catch (error) {
      addResult('Media Test', 'error', `General error: ${error.message}`);
    }
  };

  // Test WebRTC capabilities
  const testWebRTC = async () => {
    addResult('WebRTC Test', 'testing', 'Testing WebRTC capabilities...');

    try {
      // Check RTCPeerConnection support
      if (!window.RTCPeerConnection) {
        addResult('WebRTC Support', 'error', 'RTCPeerConnection not supported');
        return;
      }

      addResult('WebRTC Support', 'success', 'RTCPeerConnection supported');

      // Create test peer connection
      const pc = new RTCPeerConnection({
        iceServers: [
          { urls: "stun:stun.l.google.com:19302" },
          { urls: "stun:stun1.l.google.com:19302" }
        ]
      });

      // Test ICE gathering
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          addResult('ICE Candidate', 'success', `Type: ${event.candidate.type}`);
        } else {
          addResult('ICE Gathering', 'success', 'Complete');
        }
      };

      pc.oniceconnectionstatechange = () => {
        addResult('ICE Connection', 'info', `State: ${pc.iceConnectionState}`);
      };

      // Create offer to start ICE gathering
      const offer = await pc.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: true
      });

      await pc.setLocalDescription(offer);
      addResult('WebRTC Offer', 'success', 'Created and set local description');

      // Cleanup after test
      setTimeout(() => {
        pc.close();
        addResult('WebRTC Cleanup', 'info', 'Test connection closed');
      }, 5000);

    } catch (error) {
      addResult('WebRTC Test', 'error', `Failed: ${error.message}`);
    }
  };

  // Test meeting socket specifically for mobile
  const testMeetingSocket = async () => {
    addResult('Meeting Socket Test', 'testing', 'Testing meeting-specific socket connection...');

    try {
      const { default: MeetingSocket } = await import('../services/meetingSocket');
      
      // Test connection
      const testUserId = 'mobile-test-' + Date.now();
      MeetingSocket.connect(testUserId);

      // Wait for connection
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Connection timeout'));
        }, 10000);

        MeetingSocket.on('connected', () => {
          clearTimeout(timeout);
          addResult('Meeting Socket', 'success', 'Connected to meeting namespace');
          resolve();
        });
      });

      // Test joining a meeting
      const testMeetingId = 'test-meeting-' + Date.now();
      
      MeetingSocket.emit('join-meeting', {
        meetingId: testMeetingId,
        userId: testUserId,
        displayName: 'Mobile Test User'
      });

      addResult('Meeting Socket', 'info', 'Join meeting request sent');

    } catch (error) {
      addResult('Meeting Socket Test', 'error', `Failed: ${error.message}`);
    }
  };

  const runAllTests = async () => {
    setTestResults([]);
    addResult('Device Info', 'info', `User Agent: ${navigator.userAgent}`);
    addResult('Device Info', 'info', `Screen: ${window.screen.width}x${window.screen.height}`);
    addResult('Device Info', 'info', `Viewport: ${window.innerWidth}x${window.innerHeight}`);
    
    await testMediaDevices();
    await testWebRTC();
    await testMeetingSocket();
  };

  const stopMedia = () => {
    if (mediaStream) {
      mediaStream.getTracks().forEach(track => track.stop());
      setMediaStream(null);
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
      addResult('Media Stop', 'info', 'Media stream stopped');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'success': return 'text-green-600';
      case 'error': return 'text-red-600';
      case 'warning': return 'text-yellow-600';
      case 'testing': return 'text-blue-600';
      case 'info': return 'text-gray-600';
      default: return 'text-gray-600';
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold mb-4">Mobile Video & Whiteboard Test</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div>
          <h3 className="font-semibold mb-2">Socket Status</h3>
          <div className={`p-2 rounded ${socketConnected ? 'bg-green-100' : 'bg-red-100'}`}>
            Main Socket: {socketConnected ? '✅ Connected' : '❌ Disconnected'}
          </div>
          <div className={`p-2 rounded mt-2 ${whiteboardSocket ? 'bg-green-100' : 'bg-red-100'}`}>
            Whiteboard Socket: {whiteboardSocket ? '✅ Connected' : '❌ Disconnected'}
          </div>
        </div>

        <div>
          <h3 className="font-semibold mb-2">Video Preview</h3>
          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
            className="w-full h-32 bg-gray-800 rounded"
          />
        </div>
      </div>

      <div className="flex gap-3 mb-4">
        <button
          onClick={runAllTests}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Run All Tests
        </button>
        <button
          onClick={testMediaDevices}
          className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
        >
          Test Media
        </button>
        <button
          onClick={testWebRTC}
          className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
        >
          Test WebRTC
        </button>
        <button
          onClick={testMeetingSocket}
          className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
        >
          Test Meeting Socket
        </button>
        <button
          onClick={stopMedia}
          className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
        >
          Stop Media
        </button>
      </div>

      <div className="space-y-2 max-h-96 overflow-y-auto">
        <h3 className="font-semibold">Test Results:</h3>
        {testResults.map((result, index) => (
          <div key={index} className="border rounded p-2 text-sm">
            <div className="flex justify-between items-center">
              <span className="font-medium">{result.test}</span>
              <span className="text-xs text-gray-400">{result.timestamp}</span>
            </div>
            <p className={getStatusColor(result.status)}>{result.message}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default MobileMediaTest;