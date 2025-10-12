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
  const handleMeetingCreated = (meeting, displayName) => {
    // Navigate to the meeting room with display name if provided
    if (displayName && displayName !== user.username) {
      navigate(`/meeting/${meeting.meetingId}?displayName=${encodeURIComponent(displayName)}`);
    } else {
      navigate(`/meeting/${meeting.meetingId}`);
    }
  };

  // Handle successful meeting join
  const handleMeetingJoined = (meeting, displayName) => {
    // If a custom display name is provided, pass it as a query parameter
    if (displayName && displayName !== user.username) {
      navigate(`/meeting/${meeting.meetingId}?displayName=${encodeURIComponent(displayName)}`);
    } else {
      navigate(`/meeting/${meeting.meetingId}`);
    }
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
    <div className="h-screen overflow-hidden bg-gradient-to-br from-violet-900 via-purple-900 to-indigo-900 flex flex-col">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-0 left-0 w-72 h-72 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse"></div>
        <div className="absolute top-0 right-0 w-72 h-72 bg-yellow-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse animation-delay-2000"></div>
        <div className="absolute -bottom-8 left-20 w-72 h-72 bg-pink-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse animation-delay-4000"></div>
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-blue-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse animation-delay-1000"></div>
      </div>

      {/* Header */}
      <header className="relative z-10 bg-black/20 backdrop-blur-xl border-b border-white/10 flex-shrink-0">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <button
                onClick={() => navigate('/')}
                className="mr-4 p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-all duration-200"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-gradient-to-r from-pink-500 to-violet-500 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold">E</span>
                </div>
                <h1 className="text-xl font-bold text-white">EduMeet</h1>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2 bg-green-500/20 rounded-full px-3 py-1">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                <span className="text-green-300 text-sm font-medium">Online</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-white/90 font-medium">{user.username}</span>
                <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
                  {user.username.charAt(0).toUpperCase()}
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="relative z-10 flex-1 flex flex-col min-h-0">
        <div className="flex-1 max-w-7xl mx-auto px-6 py-4 flex flex-col min-h-0 w-full">
          {/* Welcome Section */}
          <div className="mb-4 flex-shrink-0">
            <div className="text-center">
              <h1 className="text-3xl font-bold text-white mb-1">
                Welcome back, <span className="bg-gradient-to-r from-pink-400 to-violet-400 bg-clip-text text-transparent">{user.username}!</span>
              </h1>
              <p className="text-white/70">Ready to learn? Start or join a meeting now</p>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-2 mb-4 border border-white/20">
            <nav className="flex space-x-2">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setSearchParams({ tab: tab.id })}
                  className={`flex items-center py-2 px-4 rounded-xl font-medium text-sm transition-all duration-300 ${
                    activeTab === tab.id
                      ? 'bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 text-white shadow-2xl transform scale-105'
                      : 'text-white/70 hover:text-white hover:bg-white/10 hover:scale-102'
                  }`}
                >
                  <div className="mr-2">
                    {tab.icon}
                  </div>
                  <span className="font-semibold">{tab.label}</span>
                </button>
              ))}
            </nav>
          </div>

          {/* Tab Content */}
          <div className="flex-1 min-h-0 flex flex-col">
            {activeTab === 'meetings' && (
              <div className="h-full bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 overflow-hidden flex flex-col">
                <div className="bg-gradient-to-r from-blue-500/20 to-purple-500/20 p-4 border-b border-white/10 flex-shrink-0">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-xl font-bold text-white mb-1">My Meetings</h2>
                      <p className="text-white/70">Manage and join your scheduled meetings</p>
                    </div>
                    <div className="bg-white/20 rounded-xl p-3">
                      <Calendar className="w-6 h-6 text-white" />
                    </div>
                  </div>
                </div>
                <div className="p-6 flex-1 overflow-y-auto">
                  <MeetingList 
                    userId={user.id} 
                    onJoinMeeting={handleJoinFromList}
                    key={refreshTrigger}
                  />
                </div>
              </div>
            )}
            
            {activeTab === 'create' && (
              <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-white/5">
                <div className="flex justify-center py-4">
                  <div className="w-full max-w-xl bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 overflow-hidden">
                    <div className="bg-gradient-to-r from-green-500/20 to-emerald-500/20 p-4 text-center border-b border-white/10">
                      <div className="inline-flex items-center justify-center w-12 h-12 bg-gradient-to-r from-green-400 to-emerald-400 rounded-full text-white mb-2 shadow-2xl">
                        <Plus className="w-6 h-6" />
                      </div>
                      <h2 className="text-lg font-bold text-white mb-1">Create New Meeting</h2>
                      <p className="text-white/70 text-sm">
                        Set up a new meeting with custom settings
                      </p>
                    </div>
                    <div className="p-6">
                      <CreateMeeting onMeetingCreated={handleMeetingCreated} user={user} />
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {activeTab === 'join' && (
              <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-white/5">
                <div className="flex justify-center py-4">
                  <div className="w-full max-w-xl bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 overflow-hidden">
                    <div className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 p-4 text-center border-b border-white/10">
                      <div className="inline-flex items-center justify-center w-12 h-12 bg-gradient-to-r from-purple-400 to-pink-400 rounded-full text-white mb-2 shadow-2xl">
                        <LogIn className="w-6 h-6" />
                      </div>
                      <h2 className="text-lg font-bold text-white mb-1">Join Existing Meeting</h2>
                      <p className="text-white/70 text-sm">
                        Enter a meeting ID to join an ongoing session
                      </p>
                    </div>
                    <div className="p-6">
                      <JoinMeeting onMeetingJoined={handleMeetingJoined} user={user} />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Quick Stats - Bottom Bar */}
          <div className="mt-2 bg-white/10 backdrop-blur-xl rounded-xl border border-white/20 p-3 flex-shrink-0">
            <div className="grid grid-cols-3 gap-3">
              <div className="text-center group cursor-pointer">
                <div className="bg-gradient-to-r from-blue-400 to-cyan-400 rounded-lg p-2 mb-1 group-hover:scale-110 transition-transform">
                  <div className="text-lg font-bold text-white">0</div>
                </div>
                <div className="text-white/70 text-xs font-medium">Active Meetings</div>
              </div>
              <div className="text-center group cursor-pointer">
                <div className="bg-gradient-to-r from-green-400 to-emerald-400 rounded-lg p-2 mb-1 group-hover:scale-110 transition-transform">
                  <div className="text-lg font-bold text-white">0</div>
                </div>
                <div className="text-white/70 text-xs font-medium">Today's Sessions</div>
              </div>
              <div className="text-center group cursor-pointer">
                <div className="bg-gradient-to-r from-purple-400 to-pink-400 rounded-lg p-2 mb-1 group-hover:scale-110 transition-transform">
                  <div className="text-lg font-bold text-white">0</div>
                </div>
                <div className="text-white/70 text-xs font-medium">Total Hours</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;