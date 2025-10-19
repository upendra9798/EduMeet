// Simple API test to check if authentication issues are resolved
import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:5001/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

async function testAPI() {
  try {
    console.log('Testing API without authentication...');
    
    // Test creating a meeting
    const meetingData = {
      title: 'Test Meeting',
      hostId: 'demo-user-test123',
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
    
    console.log('Creating meeting with data:', meetingData);
    const response = await api.post('/meetings/create', meetingData);
    console.log('SUCCESS - Meeting created!');
    console.log('Response status:', response.status);
    console.log('Response data:', response.data);
    
    // Test getting the meeting
    const meetingId = response.data.meeting.meetingId;
    console.log('\nTesting getMeeting with ID:', meetingId);
    const getResponse = await api.get(`/meetings/${meetingId}`);
    console.log('SUCCESS - Meeting retrieved!');
    console.log('Get response status:', getResponse.status);
    console.log('Get response data:', getResponse.data);
    
  } catch (error) {
    console.error('API ERROR:', error.message);
    if (error.response) {
      console.error('Error status:', error.response.status);
      console.error('Error data:', error.response.data);
    }
  }
}

testAPI();