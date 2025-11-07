import { useEffect } from 'react';
import MeetingSocket from '../services/meetingSocket';
import MeetingService from '../services/meetingService';

/**
 * Custom hook to manage meeting socket connection and initialization
 * Handles the complete flow of connecting to socket, joining meeting, and setting up listeners
 */
const useMeetingSocket = ({
  meetingId,
  displayUser,
  setLoading,
  setError,
  setJoined,
  setMeeting,
  setParticipants,
  setIsMuted,
  setIsVideoOff,
  setMessages
}) => {
  useEffect(() => {
    if (!meetingId || !displayUser) {
      console.log('useMeetingSocket: Missing meetingId or user, skipping initialization');
      return;
    }

    console.log('useMeetingSocket: Initializing for meetingId:', meetingId, 'user:', displayUser);

    let mounted = true; // Track if component is still mounted

    const initializeMeeting = async () => {
      try {
        console.log('useMeetingSocket: Starting meeting initialization...');
        setLoading(true);
        setError(null);

        // Step 1: Get meeting details from API
        console.log('useMeetingSocket: Fetching meeting details...');
        const meetingResult = await MeetingService.getMeeting(meetingId);
        
        if (!meetingResult.success) {
          throw new Error(meetingResult.message || 'Failed to fetch meeting details');
        }

        if (!mounted) return; // Component unmounted during API call

        console.log('useMeetingSocket: Meeting details received:', meetingResult.meeting);
        setMeeting(meetingResult.meeting);

        // Step 2: Join meeting via API (adds user to participants list)
        console.log('useMeetingSocket: Joining meeting via API...');
        const joinResult = await MeetingService.joinMeeting(meetingId, displayUser.id);
        
        if (!joinResult.success) {
          throw new Error(joinResult.message || 'Failed to join meeting');
        }

        if (!mounted) return;

        console.log('useMeetingSocket: API join successful, now connecting to socket...');

        // Step 3: Connect to socket server
        await MeetingSocket.connect(displayUser.id);

        if (!mounted) return;

        console.log('useMeetingSocket: Socket connected, setting up event listeners...');

        // Step 4: Set up socket event listeners
        setupSocketListeners();

        // Step 5: Join the socket room
        console.log('useMeetingSocket: Joining socket room...');
        MeetingSocket.joinMeeting(meetingId, displayUser.username);

        console.log('useMeetingSocket: Meeting initialization complete');

      } catch (error) {
        console.error('useMeetingSocket: Error during initialization:', error);
        if (mounted) {
          setError(error.message || 'Failed to join meeting');
          setLoading(false);
        }
      }
    };

    const setupSocketListeners = () => {
      console.log('useMeetingSocket: Setting up socket event listeners...');

      // Meeting successfully joined
      MeetingSocket.on('meeting-joined', (data) => {
        console.log('useMeetingSocket: Received meeting-joined event:', data);
        if (mounted) {
          setJoined(true);
          setLoading(false);
          
          // Initialize participants list with existing users
          if (data.existingParticipants) {
            console.log('useMeetingSocket: Setting initial participants:', data.existingParticipants);
            setParticipants(data.existingParticipants);
          }
        }
      });

      // New user joined the meeting
      MeetingSocket.on('user-joined', (userData) => {
        console.log('useMeetingSocket: User joined:', userData);
        if (mounted) {
          setParticipants(prev => {
            // Check if user already exists (avoid duplicates)
            const exists = prev.some(p => p.socketId === userData.socketId || p.userId === userData.userId);
            if (exists) {
              console.log('useMeetingSocket: User already in participants list, skipping');
              return prev;
            }
            console.log('useMeetingSocket: Adding new participant:', userData);
            return [...prev, userData];
          });
        }
      });

      // User left the meeting
      MeetingSocket.on('user-left', (userData) => {
        console.log('useMeetingSocket: User left:', userData);
        if (mounted) {
          setParticipants(prev => {
            const updated = prev.filter(p => p.socketId !== userData.socketId);
            console.log('useMeetingSocket: Participants after user left:', updated);
            return updated;
          });
        }
      });

      // Chat message received
      MeetingSocket.on('message-received', (message) => {
        console.log('useMeetingSocket: Chat message received:', message);
        if (mounted) {
          setMessages(prev => [...prev, message]);
        }
      });

      // Meeting error
      MeetingSocket.on('meeting-error', (error) => {
        console.error('useMeetingSocket: Meeting error:', error);
        if (mounted) {
          setError(error.message || 'Meeting error occurred');
          setLoading(false);
        }
      });

      // Socket disconnected
      MeetingSocket.on('disconnect', () => {
        console.log('useMeetingSocket: Socket disconnected');
        if (mounted) {
          setError('Connection lost. Please refresh and try again.');
        }
      });

      console.log('useMeetingSocket: All socket listeners set up');
    };

    // Start the initialization process
    initializeMeeting();

    // Cleanup function
    return () => {
      console.log('useMeetingSocket: Cleaning up...');
      mounted = false;
      
      // Remove all event listeners
      MeetingSocket.off('meeting-joined');
      MeetingSocket.off('user-joined');
      MeetingSocket.off('user-left');
      MeetingSocket.off('message-received');
      MeetingSocket.off('meeting-error');
      MeetingSocket.off('disconnect');
      
      // Leave meeting socket room
      MeetingSocket.leaveMeeting();
    };
  }, [meetingId, displayUser?.id]); // Only re-run if meetingId or userId changes
};

export default useMeetingSocket;
