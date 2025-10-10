import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Plus, LogIn, Calendar } from 'lucide-react';
import CreateMeeting from '../components/CreateMeeting';
import JoinMeeting from '../components/JoinMeeting';
import MeetingList from '../components/MeetingList';

/**
 * Dashboard Component
 * Central hub for meeting management
 */
const Dashboard = ({ user }) => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'meetings';
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Handle successful meeting creation
  const handleMeetingCreated = (meeting) => {
    alert(`Meeting created successfully!\nMeeting ID: ${meeting.meetingId}`);
    setRefreshTrigger(prev => prev + 1); // Trigger refresh of meeting list
    setSearchParams({ tab: 'meetings' }); // Switch to meetings tab
  };

  // Handle successful meeting join
  const handleMeetingJoined = (meeting) => {
    navigate(`/meeting/${meeting.meetingId}`);
  };

  // Handle join from meeting list
  const handleJoinFromList = (meeting) => {
    navigate(`/meeting/${meeting.meetingId}`);
  };

  const tabs = [
    { id: 'meetings', label: 'My Meetings', icon: <Calendar className="w-4 h-4" /> },
    { id: 'create', label: 'Create Meeting', icon: <Plus className="w-4 h-4" /> },
    { id: 'join', label: 'Join Meeting', icon: <LogIn className="w-4 h-4" /> }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <button
                onClick={() => navigate('/')}
                className="mr-4 p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <h1 className="text-2xl font-bold text-blue-600">EduMeet</h1>
              <span className="ml-4 text-gray-600">Dashboard</span>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-blue-600 font-medium text-sm">
                    {user.username.charAt(0).toUpperCase()}
                  </span>
                </div>
                <span className="text-sm text-gray-700">{user.username}</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Welcome back, {user.username}!
          </h1>
          <p className="text-gray-600">
            Manage your meetings, create new sessions, and collaborate with others.
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="border-b border-gray-200 mb-8">
          <nav className="-mb-px flex space-x-8">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setSearchParams({ tab: tab.id })}
                className={`flex items-center py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.icon}
                <span className="ml-2">{tab.label}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="mb-8">
          {activeTab === 'meetings' && (
            <div>
              <MeetingList 
                userId={user.id} 
                onJoinMeeting={handleJoinFromList}
                key={refreshTrigger} // Force re-render when meetings are updated
              />
            </div>
          )}
          
          {activeTab === 'create' && (
            <div className="max-w-2xl mx-auto">
              <div className="mb-6 text-center">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Create New Meeting</h2>
                <p className="text-gray-600">
                  Set up a new meeting with custom settings and invite participants.
                </p>
              </div>
              <CreateMeeting onMeetingCreated={handleMeetingCreated} />
            </div>
          )}
          
          {activeTab === 'join' && (
            <div className="max-w-2xl mx-auto">
              <div className="mb-6 text-center">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Join Existing Meeting</h2>
                <p className="text-gray-600">
                  Enter a meeting ID to join an ongoing session.
                </p>
              </div>
              <JoinMeeting onMeetingJoined={handleMeetingJoined} />
            </div>
          )}
        </div>

        {/* Quick Stats */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Quick Stats</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">0</div>
              <div className="text-sm text-gray-600">Active Meetings</div>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-green-600">0</div>
              <div className="text-sm text-gray-600">Meetings Today</div>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">0</div>
              <div className="text-sm text-gray-600">Total Hours</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;