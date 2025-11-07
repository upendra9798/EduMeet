import { useCallback } from 'react';

/**
 * Custom hook to manage media stream (camera and microphone)
 * Handles initialization, cleanup, and control of user media
 */
const useMediaStream = ({
  localStream,
  setLocalStream,
  isMuted,
  setIsMuted,
  isVideoOff,
  setIsVideoOff,
  setShowMediaPrompt
}) => {
  
  // Initialize media stream (camera + microphone)
  const initializeMediaStream = useCallback(async () => {
    try {
      console.log('useMediaStream: Requesting user media...');
      
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
      });
      
      console.log('useMediaStream: Media stream obtained successfully');
      setLocalStream(stream);
      setShowMediaPrompt?.(false);
      
      return stream;
    } catch (error) {
      console.error('useMediaStream: Error accessing media devices:', error);
      setShowMediaPrompt?.(false);
      
      // Try audio-only fallback
      try {
        console.log('useMediaStream: Trying audio-only fallback...');
        const audioStream = await navigator.mediaDevices.getUserMedia({
          video: false,
          audio: true
        });
        
        setLocalStream(audioStream);
        setIsVideoOff(true); // Video is off since we only have audio
        
        return audioStream;
      } catch (audioError) {
        console.error('useMediaStream: Audio-only fallback failed:', audioError);
        throw new Error('Unable to access camera or microphone');
      }
    }
  }, [setLocalStream, setShowMediaPrompt, setIsVideoOff]);

  // Toggle mute state
  const toggleMute = useCallback(() => {
    console.log('useMediaStream: Toggling mute, current state:', isMuted);
    
    if (localStream) {
      const audioTracks = localStream.getAudioTracks();
      audioTracks.forEach(track => {
        track.enabled = isMuted; // If currently muted, enable; if not muted, disable
      });
    }
    
    setIsMuted(!isMuted);
  }, [localStream, isMuted, setIsMuted]);

  // Toggle video state
  const toggleVideo = useCallback(() => {
    console.log('useMediaStream: Toggling video, current state:', isVideoOff);
    
    if (localStream) {
      const videoTracks = localStream.getVideoTracks();
      videoTracks.forEach(track => {
        track.enabled = isVideoOff; // If currently off, enable; if not off, disable
      });
    }
    
    setIsVideoOff(!isVideoOff);
  }, [localStream, isVideoOff, setIsVideoOff]);

  // Cleanup media stream
  const cleanupMediaStream = useCallback(() => {
    console.log('useMediaStream: Cleaning up media stream...');
    
    if (localStream) {
      localStream.getTracks().forEach(track => {
        console.log('useMediaStream: Stopping track:', track.kind);
        track.stop();
      });
      setLocalStream(null);
    }
  }, [localStream, setLocalStream]);

  return {
    initializeMediaStream,
    toggleMute,
    toggleVideo,
    cleanupMediaStream
  };
};

export default useMediaStream;
