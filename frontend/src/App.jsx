import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import MeetingRoom from './pages/MeetingRoom';
import HomePage from './pages/HomePage';
import TestPage from './pages/TestPage';
import ChatTest from './components/ChatTest';

/**
 * Main App Component
 * Handles routing and global state management
 */
function App() {
  // Global state (in a real app, use Context API or Redux)
  const [user, setUser] = useState({
    id: 'demo-user-' + Math.random().toString(36).substr(2, 9),
    username: 'Demo User',
    email: 'demo@edumeet.com'
  });

  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        <Routes>
          {/* Home/Landing Page */}
          <Route 
            path="/" 
            element={<HomePage user={user} />} 
          />
          
          {/* Dashboard - Meeting Management */}
          <Route 
            path="/dashboard" 
            element={<Dashboard user={user} />} 
          />
          
          {/* Meeting Room */}
          <Route 
            path="/meeting/:meetingId" 
            element={<MeetingRoom user={user} />} 
          />
          
          {/* Test Page */}
          <Route 
            path="/test" 
            element={<TestPage />} 
          />

          {/* Chat Test */}
          <Route 
            path="/chat-test" 
            element={<ChatTest />} 
          />
          
          {/* Redirect unknown routes to home */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
