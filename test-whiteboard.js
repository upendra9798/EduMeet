// Test whiteboard host controls
import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:5001/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

async function testWhiteboardHostControls() {
  try {
    console.log('Testing whiteboard host controls...');
    
    // Step 1: Create a meeting
    const meetingData = {
      title: 'Whiteboard Test Meeting',
      hostId: 'demo-user-host123',
      startTime: new Date(),
      maxParticipants: 50,
      roomType: 'private',
      meetingSettings: {
        allowVideo: true,
        allowAudio: true,
        allowScreenShare: true,
        allowChat: true,
        allowWhiteboard: true
      }
    };
    
    console.log('1. Creating meeting...');
    const meetingResponse = await api.post('/meetings/create', meetingData);
    const meetingId = meetingResponse.data.meeting.meetingId;
    console.log('✅ Meeting created:', meetingId);
    
    // Step 2: Create whiteboard (as host)
    const whiteboardData = {
      meetingId,
      userId: 'demo-user-host123', // Host user
      title: 'Test Whiteboard',
      canvasWidth: 1920,
      canvasHeight: 1080,
      backgroundColor: '#ffffff'
    };
    
    console.log('2. Creating whiteboard as host...');
    const whiteboardResponse = await api.post('/whiteboard/create', whiteboardData);
    console.log('✅ Whiteboard created:', whiteboardResponse.data);
    
    // Step 3: Try to create whiteboard as non-host (should fail or return existing)
    console.log('3. Testing participant access...');
    const participantData = {
      meetingId,
      userId: 'demo-user-participant456', // Non-host user
      title: 'Participant Whiteboard',
      canvasWidth: 1920,
      canvasHeight: 1080,
      backgroundColor: '#ffffff'
    };
    
    try {
      const participantResponse = await api.post('/whiteboard/create', participantData);
      console.log('⚠️ Participant could create whiteboard (should return existing):', participantResponse.data);
    } catch (error) {
      if (error.response?.status === 403) {
        console.log('✅ Participant correctly denied whiteboard creation');
      } else {
        console.log('❌ Unexpected error for participant:', error.response?.data);
      }
    }
    
    console.log('\n✅ Whiteboard host control tests completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Full error:', error);
    if (error.response) {
      console.error('Error status:', error.response.status);
      console.error('Error data:', error.response.data);
    }
  }
}

testWhiteboardHostControls();