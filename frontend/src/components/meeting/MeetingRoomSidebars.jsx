import React from 'react';
import { MessageSquare } from 'lucide-react';
import HostControls from '../HostControls';
import MeetingSocket from '../../services/meetingSocket';

/**
 * MeetingRoomSidebars Component
 * Contains both participants and chat sidebars
 */
const MeetingRoomSidebars = ({
  // Sidebar visibility
  participantsSidebarOpen,
  setParticipantsSidebarOpen,
  chatSidebarOpen,
  setChatSidebarOpen,
  
  // Participants data
  participants,
  setParticipants,
  displayUser,
  user,
  isHost,
  meetingId,
  
  // Chat data
  messages,
  newMessage,
  setNewMessage,
  
  // Functions
  hostMuteParticipant,
  hostDisableVideo,
  sendMessage,
  handleKeyPress
}) => {
  
  return (
    <>
      {/* Participants Sidebar */}
      {participantsSidebarOpen && (
        <aside className="w-96 bg-black/40 backdrop-blur-lg text-white border-l border-white/10">
          <div className="p-6">
            {/* Sidebar Header */}
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold">Participants</h3>
              <button
                onClick={() => setParticipantsSidebarOpen(false)}
                className="p-2 hover:bg-white/10 rounded-xl transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Participants Section */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-lg font-semibold text-blue-300">
                  Participants
                </h4>
                <span className="bg-blue-500/20 text-blue-300 px-3 py-1 rounded-full text-sm font-medium">
                  {participants.length + 1}
                </span>
              </div>
              
              {/* Debug Info */}
              <div className="text-xs text-gray-400 mb-2 p-2 bg-gray-800 rounded">
                <div>📊 Debug Info:</div>
                <div>Participants in state: {participants.length}</div>
                <div>Participants data: {JSON.stringify(participants.map(p => ({ userId: p.userId, socketId: p.socketId?.slice(-4), displayName: p.displayName })))}</div>
                <div>Current user ID: {displayUser.id}</div>
                <div>Is Host: {isHost ? 'Yes' : 'No'}</div>
                <div>Socket connected: {MeetingSocket.isConnected ? 'Yes' : 'No'}</div>
                <button 
                  onClick={() => console.log('Current participants:', participants)}
                  className="bg-blue-500 text-white px-2 py-1 rounded text-xs mt-1 mr-1"
                >
                  Log Participants
                </button>
                <button 
                  onClick={() => {
                    console.log('Manual sync attempt...');
                    // Manually emit a request for current participants
                    MeetingSocket.emit('get-participants', { meetingId });
                    
                    // Also try to get from VideoChat component data
                    console.log('Checking VideoChat remote participants...');
                    
                    // Add a fake participant to test if UI updates
                    const fakeParticipant = {
                      socketId: 'manual-sync-' + Date.now(),
                      userId: 'manual-user-' + Date.now(),
                      displayName: 'Manual Sync Test',
                      isMuted: false,
                      isVideoOff: false
                    };
                    
                    setParticipants(prev => [...prev, fakeParticipant]);
                    console.log('Added fake participant for testing:', fakeParticipant);
                  }}
                  className="bg-orange-500 text-white px-2 py-1 rounded text-xs mt-1"
                >
                  Manual Sync
                </button>
              </div>

              <div className="space-y-3 max-h-40 overflow-y-auto">
                {/* Current User */}
                <div className="flex items-center space-x-3 p-3 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-xl border border-blue-500/30">
                  <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center font-bold">
                    {displayUser.username.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-medium">
                        {displayUser.username}
                      </span>
                      <span className="text-xs text-blue-300">(You)</span>
                    </div>
                    {isHost && (
                      <span className="text-xs bg-gradient-to-r from-yellow-500 to-orange-500 px-2 py-1 rounded-full text-white font-medium">
                        Host
                      </span>
                    )}
                  </div>
                  <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
                </div>

                {/* Other Participants */}
                {participants
                  .filter((participant, index, self) => 
                    // Remove duplicates by socketId
                    index === self.findIndex(p => p.socketId === participant.socketId)
                  )
                  .map((participant, index) => (
                  <div
                    key={`participant-${participant.socketId}-${index}`}
                    className="flex items-center space-x-3 p-3 bg-white/5 rounded-xl border border-white/10 hover:bg-white/10 transition-colors"
                  >
                    <div className="w-10 h-10 bg-gradient-to-r from-gray-500 to-gray-600 rounded-full flex items-center justify-center font-bold text-sm">
                      {participant.displayName.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <span className="font-medium">
                          {participant.displayName}
                        </span>
                        
                        {/* Audio/Video Status Icons */}
                        <div className="flex items-center space-x-1">
                          {/* Audio Status */}
                          {participant.isMuted || participant.isHostMuted ? (
                            <div className="p-1 rounded-full bg-red-500/20" title="Muted">
                              <svg className="w-3 h-3 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.617.814L4.172 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.172l4.211-3.814zm5.617-.814a1 1 0 011.414 0L18 3.848l1.586-1.586a1 1 0 111.414 1.414L19.414 5.262 21 6.848a1 1 0 11-1.414 1.414L18 6.676l-1.586 1.586a1 1 0 11-1.414-1.414L16.586 5.262 15 3.676a1 1 0 010-1.414z" clipRule="evenodd" />
                              </svg>
                            </div>
                          ) : (
                            <div className="p-1 rounded-full bg-green-500/20" title="Unmuted">
                              <svg className="w-3 h-3 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" />
                              </svg>
                            </div>
                          )}
                          
                          {/* Video Status */}
                          {participant.isVideoOff || participant.isHostVideoDisabled ? (
                            <div className="p-1 rounded-full bg-red-500/20" title="Video Off">
                              <svg className="w-3 h-3 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A2 2 0 0017 14V8a2 2 0 00-2-2h-5.586l-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2h5.586L3.707 2.293zM7 11a1 1 0 112 0 1 1 0 01-2 0z" clipRule="evenodd" />
                              </svg>
                            </div>
                          ) : (
                            <div className="p-1 rounded-full bg-green-500/20" title="Video On">
                              <svg className="w-3 h-3 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
                              </svg>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {(participant.userId === user.id || participant.userId === displayUser.id) && (
                        <span className="text-xs text-gray-400">
                          (Your other session)
                        </span>
                      )}
                      
                      {/* Host Control Status */}
                      {participant.isHostMuted && (
                        <span className="text-xs text-red-400">
                          Host muted
                        </span>
                      )}
                      {participant.isHostVideoDisabled && (
                        <span className="text-xs text-red-400">
                          Host disabled video
                        </span>
                      )}
                    </div>
                    
                    {/* Individual Participant Controls - Only show if current user is host */}
                    {isHost && participant.userId !== user.id && participant.userId !== displayUser.id && (
                      <div className="flex items-center space-x-1">
                        {/* Mute/Unmute Button */}
                        <button
                          onClick={() => {
                            hostMuteParticipant(participant.userId);
                          }}
                          className="p-1 rounded-full bg-red-500/20 hover:bg-red-500/40 transition-colors"
                          title="Force mute participant"
                        >
                          <svg className="w-3 h-3 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM15.657 6.343a1 1 0 010 1.414L13.414 10l2.243 2.243a1 1 0 11-1.414 1.414L12 11.414l-2.243 2.243a1 1 0 01-1.414-1.414L10.586 10 8.343 7.757a1 1 0 011.414-1.414L12 8.586l2.243-2.243a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        </button>
                        
                        {/* Disable Video Button */}
                        <button
                          onClick={() => {
                            hostDisableVideo(participant.userId);
                          }}
                          className="p-1 rounded-full bg-orange-500/20 hover:bg-orange-500/40 transition-colors"
                          title="Force disable video"
                        >
                          <svg className="w-3 h-3 text-orange-400" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z" />
                            <path stroke="currentColor" strokeWidth="2" d="M4 14l8-8m0 8L4 6" />
                          </svg>
                        </button>
                        
                        {/* Remove Participant Button */}
                        <button
                          onClick={() => {
                            if (confirm(`Remove ${participant.displayName} from the meeting?`)) {
                              console.log('Removing participant:', participant.userId);
                              MeetingSocket.removeParticipant(participant.userId);
                            }
                          }}
                          className="p-1 rounded-full bg-gray-500/20 hover:bg-gray-500/40 transition-colors"
                          title="Remove from meeting"
                        >
                          <svg className="w-3 h-3 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                          </svg>
                        </button>
                      </div>
                    )}
                    
                    <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
                  </div>
                ))}
              </div>
            </div>

            {/* Host Controls Section */}
            {isHost && (
              <div className="mb-6">
                <HostControls 
                  participants={participants}
                  currentUser={displayUser}
                  isHost={isHost}
                  meetingId={meetingId}
                />
              </div>
            )}
          </div>
        </aside>
      )}

      {/* Chat Sidebar */}
      {chatSidebarOpen && (
        <aside className="w-96 bg-black/40 backdrop-blur-lg text-white border-l border-white/10">
          <div className="p-6 h-full flex flex-col">
            {/* Sidebar Header */}
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold">Chat</h3>
              <button
                onClick={() => setChatSidebarOpen(false)}
                className="p-2 hover:bg-white/10 rounded-xl transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Chat Section */}
            <div className="flex-1 flex flex-col">
              {/* Messages Area */}
              <div className="flex-1 bg-gradient-to-br from-purple-500/10 to-pink-500/10 rounded-2xl border border-purple-500/20 flex flex-col overflow-hidden mb-4">
                <div className="flex-1 p-4 overflow-y-auto">
                  {messages.length === 0 ? (
                    <div className="text-center text-gray-400 text-sm py-8">
                      <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p>No messages yet</p>
                      <p className="text-xs mt-1">Start the conversation!</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {messages.map((message) => (
                        <div
                          key={message.id}
                          className={`flex ${
                            message.isOwn ? "justify-end" : "justify-start"
                          }`}
                        >
                          <div
                            className={`max-w-xs px-3 py-2 rounded-lg ${
                              message.isOwn
                                ? "bg-gradient-to-r from-blue-500 to-purple-500 text-white"
                                : "bg-white/20 text-gray-200"
                            }`}
                          >
                            {!message.isOwn && (
                              <div className="text-xs font-medium mb-1 opacity-75">
                                {message.sender}
                              </div>
                            )}
                            <div className="text-sm">{message.text}</div>
                            <div className="text-xs opacity-75 mt-1">
                              {(() => {
                                try {
                                  const date = new Date(message.timestamp);
                                  return isNaN(date.getTime()) 
                                    ? 'Invalid time'
                                    : date.toLocaleTimeString([], {
                                        hour: "2-digit",
                                        minute: "2-digit",
                                      });
                                } catch (error) {
                                  return 'Invalid time';
                                }
                              })()}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Message Input */}
              <div className="bg-white/5 rounded-xl p-3 border border-white/10">
                <div className="flex space-x-2">
                  <input
                    id="chat-message-input"
                    name="chatMessage"
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Type a message..."
                    className="flex-1 bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-purple-400"
                  />
                  <button
                    onClick={sendMessage}
                    disabled={!newMessage.trim()}
                    className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-3 py-2 rounded-lg text-sm hover:from-purple-600 hover:to-pink-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    Send
                  </button>
                </div>
              </div>
            </div>
          </div>
        </aside>
      )}
    </>
  );
};

export default MeetingRoomSidebars;