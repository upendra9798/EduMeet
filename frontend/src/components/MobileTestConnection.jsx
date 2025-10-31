import React, { useState, useEffect } from 'react';
import meetingService from '../services/meetingService';

const MobileTestConnection = () => {
  const [connectionStatus, setConnectionStatus] = useState('testing');
  const [testResults, setTestResults] = useState([]);
  const [apiUrl, setApiUrl] = useState('');

  const addResult = (test, status, message) => {
    setTestResults(prev => [...prev, { test, status, message, timestamp: new Date().toISOString() }]);
  };

  const testConnection = async () => {
    setConnectionStatus('testing');
    setTestResults([]);
    
    try {
      // Test 1: Check API URL
      const currentApiUrl = import.meta.env.VITE_API_URL || 'http://172.23.247.244:5001/api';
      setApiUrl(currentApiUrl);
      addResult('API URL', 'info', `Using: ${currentApiUrl}`);
      
      // Test 2: Test basic connectivity
      addResult('Basic Connectivity', 'testing', 'Testing connection to backend...');
      
      // Test 3: Create a test meeting
      const testMeetingData = {
        title: 'Mobile Test Meeting',
        hostId: 'mobile-test-user-' + Date.now(),
        maxParticipants: 10,
        roomType: 'private'
      };
      
      addResult('Create Meeting Test', 'testing', 'Attempting to create meeting...');
      
      const createResult = await meetingService.createMeeting(testMeetingData);
      
      if (createResult.success) {
        addResult('Create Meeting Test', 'success', `Meeting created: ${createResult.meeting.meetingId}`);
        
        // Test 4: Join the meeting
        addResult('Join Meeting Test', 'testing', 'Attempting to join meeting...');
        
        const joinResult = await meetingService.joinMeeting(
          createResult.meeting.meetingId, 
          'mobile-test-joiner-' + Date.now()
        );
        
        if (joinResult.success) {
          addResult('Join Meeting Test', 'success', 'Successfully joined meeting');
          setConnectionStatus('success');
          addResult('Overall Status', 'success', 'All tests passed! Mobile connection working.');
        } else {
          addResult('Join Meeting Test', 'error', joinResult.message || 'Failed to join meeting');
          setConnectionStatus('partial');
        }
      } else {
        addResult('Create Meeting Test', 'error', createResult.message || 'Failed to create meeting');
        setConnectionStatus('error');
      }
      
    } catch (error) {
      console.error('Mobile test error:', error);
      addResult('Connection Test', 'error', `Error: ${error.message}`);
      setConnectionStatus('error');
      
      // Additional error analysis
      if (error.message.includes('Network Error') || error.message.includes('NETWORK_ERROR')) {
        addResult('Error Analysis', 'error', 'Network connectivity issue. Check if backend server is accessible from mobile device.');
      } else if (error.message.includes('CORS')) {
        addResult('Error Analysis', 'error', 'CORS policy issue. Backend may not be configured for mobile access.');
      } else if (error.message.includes('timeout')) {
        addResult('Error Analysis', 'error', 'Request timeout. Mobile network may be slow or backend unresponsive.');
      }
    }
  };

  useEffect(() => {
    // Auto-run test on component mount
    testConnection();
  }, []);

  const getStatusColor = (status) => {
    switch (status) {
      case 'success': return 'text-green-600';
      case 'error': return 'text-red-600';
      case 'testing': return 'text-blue-600';
      case 'info': return 'text-gray-600';
      default: return 'text-gray-600';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'success': return '✅';
      case 'error': return '❌';
      case 'testing': return '🔄';
      case 'info': return 'ℹ️';
      default: return '❓';
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold mb-4 text-center">Mobile Connection Test</h2>
      
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="font-semibold">Overall Status:</span>
          <span className={`font-bold ${getStatusColor(connectionStatus)}`}>
            {connectionStatus.toUpperCase()}
          </span>
        </div>
        
        <div className="text-sm text-gray-600 mb-4">
          <p><strong>Current API URL:</strong> {apiUrl}</p>
          <p><strong>User Agent:</strong> {navigator.userAgent}</p>
          <p><strong>Screen Size:</strong> {window.screen.width}x{window.screen.height}</p>
          <p><strong>Network:</strong> {navigator.onLine ? 'Online' : 'Offline'}</p>
        </div>
      </div>

      <div className="space-y-3">
        <h3 className="font-semibold text-lg">Test Results:</h3>
        
        {testResults.length === 0 ? (
          <div className="text-center py-4 text-gray-500">
            Running tests...
          </div>
        ) : (
          testResults.map((result, index) => (
            <div key={index} className="border rounded-lg p-3 bg-gray-50">
              <div className="flex items-center justify-between">
                <span className="font-medium">{result.test}</span>
                <span className={getStatusColor(result.status)}>
                  {getStatusIcon(result.status)}
                </span>
              </div>
              <p className={`text-sm mt-1 ${getStatusColor(result.status)}`}>
                {result.message}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                {new Date(result.timestamp).toLocaleTimeString()}
              </p>
            </div>
          ))
        )}
      </div>

      <div className="mt-6 flex gap-3">
        <button
          onClick={testConnection}
          disabled={connectionStatus === 'testing'}
          className="flex-1 py-3 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {connectionStatus === 'testing' ? 'Testing...' : 'Run Test Again'}
        </button>
        
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
        >
          Refresh Page
        </button>
      </div>
      
      <div className="mt-4 p-3 bg-blue-50 rounded-lg">
        <p className="text-sm text-blue-800">
          <strong>For Mobile Users:</strong> Make sure you're connected to the same network as the server. 
          If tests fail, try accessing this page from a desktop browser first to verify the backend is running.
        </p>
      </div>
    </div>
  );
};

export default MobileTestConnection;