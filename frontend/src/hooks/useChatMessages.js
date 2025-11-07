import { useCallback } from 'react';
import MeetingSocket from '../services/meetingSocket';

/**
 * Custom hook to manage chat messages in a meeting
 * Handles sending messages and keyboard interactions
 */
const useChatMessages = ({
  meetingId,
  newMessage,
  setNewMessage,
  setMessages
}) => {

  // Send a chat message
  const sendMessage = useCallback(() => {
    if (!newMessage.trim()) {
      return;
    }

    console.log('useChatMessages: Sending message:', newMessage);

    try {
      // Send message via socket
      MeetingSocket.sendMessage(meetingId, newMessage.trim());
      
      // Clear input
      setNewMessage('');
      
      console.log('useChatMessages: Message sent successfully');
    } catch (error) {
      console.error('useChatMessages: Error sending message:', error);
    }
  }, [meetingId, newMessage, setNewMessage]);

  // Handle keyboard interactions (Enter to send)
  const handleKeyPress = useCallback((event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      sendMessage();
    }
  }, [sendMessage]);

  return {
    sendMessage,
    handleKeyPress
  };
};

export default useChatMessages;
