import React, { useState } from 'react';
import { 
  UserMinus, 
  UserX, 
  MicOff, 
  Mic, 
  VideoOff, 
  Video, 
  Crown, 
  Shield,
  AlertTriangle 
} from 'lucide-react';
import MeetingSocket from '../services/meetingSocket';

/**
 * Host Control Panel Component
 * Comprehensive participant management interface for hosts
 */
const HostControls = ({ participants, currentUser, isHost, meetingId }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // All participants including current user for comprehensive view
  const allParticipants = [
    // Add current user (host) first
    {
      socketId: 'host-current',
      userId: currentUser.id,
      displayName: currentUser.username + ' (You - Host)',
      isMuted: false,
      isVideoOff: false,
      isHost: true
    },
    // Add other participants
    ...participants.filter(p => p.userId !== currentUser.id)
  ];

  const totalParticipants = allParticipants.length;

  if (!isHost) {
    return null; // Hide component for non-hosts
  }

  return (
    <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-lg shadow-xl border border-gray-600">
      {/* Header */}
      <div 
        className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-700/50 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center space-x-3">
          <Crown className="w-5 h-5 text-yellow-400" />
          <h3 className="text-lg font-semibold text-white">Host Controls</h3>
          <span className="bg-yellow-500 text-black text-xs px-2 py-1 rounded-full font-medium">
            HOST
          </span>
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-300">
            Manage meeting participants ({totalParticipants} total)
          </span>
          <div className="text-gray-400">
            {isExpanded ? '▲' : '▼'}
          </div>
        </div>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="border-t border-gray-600">
          {/* Bulk Actions */}
          <div className="p-4 bg-gray-800/50 border-b border-gray-600">
            <h4 className="text-sm font-medium text-white mb-3">Quick Actions</h4>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => {
                  if (confirm('Mute all participants?')) {
                    allParticipants.filter(p => !p.isHost).forEach(p => {
                      MeetingSocket.muteParticipant(p.userId, true);
                    });
                  }
                }}
                className="px-3 py-1 bg-red-600 hover:bg-red-700 rounded text-white text-sm transition-colors"
              >
                <MicOff className="w-3 h-3 inline mr-1" />
                Mute All
              </button>
              <button
                onClick={() => {
                  if (confirm('Disable video for all participants?')) {
                    allParticipants.filter(p => !p.isHost).forEach(p => {
                      MeetingSocket.disableParticipantVideo(p.userId, true);
                    });
                  }
                }}
                className="px-3 py-1 bg-orange-600 hover:bg-orange-700 rounded text-white text-sm transition-colors"
              >
                <VideoOff className="w-3 h-3 inline mr-1" />
                Disable All Video
              </button>
            </div>
          </div>

          {/* All Participants List */}
          <div className="p-4">
            <h4 className="text-sm font-medium text-white mb-3">All Participants</h4>
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {allParticipants.map((participant, index) => (
                <div 
                  key={`host-control-${participant.socketId}-${index}`} 
                  className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                    participant.isHost 
                      ? 'bg-yellow-900/20 border-yellow-600/30 hover:bg-yellow-900/30' 
                      : 'bg-gray-700/50 border-gray-600 hover:bg-gray-700'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                      participant.isHost ? 'bg-yellow-500 text-black' : 'bg-gray-600 text-white'
                    }`}>
                      {participant.displayName.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="font-medium text-white text-sm">
                        {participant.displayName}
                        {participant.isHost && (
                          <Crown className="w-3 h-3 text-yellow-400 inline ml-1" />
                        )}
                      </div>
                      <div className="text-xs text-gray-400">
                        {participant.isHost ? 'Meeting Host' : 'Participant'}
                      </div>
                    </div>
                  </div>

                  {/* Controls - Only show for non-host participants */}
                  {!participant.isHost && (
                    <div className="flex items-center space-x-1">
                      {/* Audio Status & Control */}
                      <div className="flex items-center space-x-1">
                        <div className={`w-2 h-2 rounded-full ${participant.isMuted ? 'bg-red-400' : 'bg-green-400'}`} title={participant.isMuted ? 'Muted' : 'Unmuted'} />
                        <button
                          onClick={() => {
                            console.log('Host Controls - Muting participant:', {
                              userId: participant.userId,
                              currentMuted: participant.isMuted,
                              newState: !participant.isMuted,
                              socketConnected: MeetingSocket.isConnected,
                              meetingId: MeetingSocket.meetingId
                            });
                            try {
                              MeetingSocket.muteParticipant(participant.userId, !participant.isMuted);
                              console.log('Mute participant call completed');
                            } catch (error) {
                              console.error('Error muting participant:', error);
                            }
                          }}
                          className={`p-1 rounded transition-colors ${participant.isMuted ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}`}
                          title={participant.isMuted ? 'Unmute' : 'Mute'}
                        >
                          {participant.isMuted ? (
                            <Mic className="w-3 h-3 text-white" />
                          ) : (
                            <MicOff className="w-3 h-3 text-white" />
                          )}
                        </button>
                      </div>

                      {/* Video Status & Control */}
                      <div className="flex items-center space-x-1">
                        <div className={`w-2 h-2 rounded-full ${participant.isVideoOff ? 'bg-red-400' : 'bg-green-400'}`} title={participant.isVideoOff ? 'Video Off' : 'Video On'} />
                        <button
                          onClick={() => {
                            console.log('Host Controls - Disabling video:', {
                              userId: participant.userId,
                              isVideoOff: participant.isVideoOff,
                              newState: !participant.isVideoOff,
                              socketConnected: MeetingSocket.isConnected,
                              meetingId: MeetingSocket.meetingId
                            });
                            try {
                              MeetingSocket.disableParticipantVideo(participant.userId, !participant.isVideoOff);
                              console.log('Disable video call completed');
                            } catch (error) {
                              console.error('Error disabling video:', error);
                            }
                          }}
                          className={`p-1 rounded transition-colors ${participant.isVideoOff ? 'bg-green-600 hover:bg-green-700' : 'bg-orange-600 hover:bg-orange-700'}`}
                          title={participant.isVideoOff ? 'Enable Video' : 'Disable Video'}
                        >
                          {participant.isVideoOff ? (
                            <Video className="w-3 h-3 text-white" />
                          ) : (
                            <VideoOff className="w-3 h-3 text-white" />
                          )}
                        </button>
                      </div>

                      {/* Remove Participant */}
                      <button
                        onClick={() => {
                          if (confirm(`Remove ${participant.displayName} from the meeting?`)) {
                            console.log('Host Controls - Removing participant:', {
                              userId: participant.userId,
                              socketConnected: MeetingSocket.isConnected,
                              meetingId: MeetingSocket.meetingId
                            });
                            try {
                              MeetingSocket.removeParticipant(participant.userId);
                              console.log('Remove participant call completed');
                            } catch (error) {
                              console.error('Error removing participant:', error);
                            }
                          }
                        }}
                        className="p-1 bg-gray-600 hover:bg-gray-700 rounded transition-colors"
                        title="Remove from meeting"
                      >
                        <UserMinus className="w-3 h-3 text-white" />
                      </button>

                      {/* Block Participant */}
                      <button
                        onClick={() => {
                          if (confirm(`Block ${participant.displayName} from rejoin this meeting?`)) {
                            MeetingSocket.blockParticipant(participant.userId);
                          }
                        }}
                        className="p-1 bg-red-600 hover:bg-red-700 rounded transition-colors"
                        title="Block from meeting"
                      >
                        <UserX className="w-3 h-3 text-white" />
                      </button>
                    </div>
                  )}
                </div>
              ))}

              {allParticipants.length === 1 && (
                <p className="text-gray-500 text-sm italic text-center py-4">
                  You are the only participant in this meeting
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HostControls;