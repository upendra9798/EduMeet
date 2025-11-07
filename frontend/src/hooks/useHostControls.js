import { useCallback } from 'react';
import MeetingSocket from '../services/meetingSocket';

/**
 * Custom hook to manage host controls in a meeting
 * Provides functions for host to control participants
 */
const useHostControls = ({
  meetingId,
  participants,
  setParticipants
}) => {

  // Mute a participant (host only)
  const hostMuteParticipant = useCallback((participantId) => {
    console.log('useHostControls: Muting participant:', participantId);
    
    try {
      // Send host control command via socket
      MeetingSocket.emit('host-mute-participant', {
        meetingId,
        participantId
      });
    } catch (error) {
      console.error('useHostControls: Error muting participant:', error);
    }
  }, [meetingId]);

  // Disable video for a participant (host only)
  const hostDisableVideo = useCallback((participantId) => {
    console.log('useHostControls: Disabling video for participant:', participantId);
    
    try {
      // Send host control command via socket
      MeetingSocket.emit('host-disable-video', {
        meetingId,
        participantId
      });
    } catch (error) {
      console.error('useHostControls: Error disabling video:', error);
    }
  }, [meetingId]);

  // Remove a participant from the meeting (host only)
  const hostRemoveParticipant = useCallback((participantId) => {
    console.log('useHostControls: Removing participant:', participantId);
    
    try {
      // Send host control command via socket
      MeetingSocket.emit('host-remove-participant', {
        meetingId,
        participantId
      });

      // Update local participants list
      setParticipants(prev => prev.filter(p => p.userId !== participantId));
    } catch (error) {
      console.error('useHostControls: Error removing participant:', error);
    }
  }, [meetingId, setParticipants]);

  return {
    hostMuteParticipant,
    hostDisableVideo,
    hostRemoveParticipant
  };
};

export default useHostControls;
