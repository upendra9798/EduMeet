/**
 * Test script to verify participant synchronization logic
 * Run this with: node test-participant-sync.js
 */

// Simulate the meeting-joined event handler logic
function testParticipantSync() {
  console.log("🧪 Testing participant synchronization logic...\n");

  // Test Case 1: First user joins (no existing participants)
  console.log("📋 Test Case 1: First user joins empty meeting");
  const existingParticipants1 = [];
  const currentUser1 = {
    id: "user123",
    username: "Alice"
  };

  const result1 = simulateMeetingJoined(existingParticipants1, currentUser1, "socket123");
  console.log("✅ Result:", result1);
  console.log("Expected: 1 participant (Alice)\n");

  // Test Case 2: Second user joins (one existing participant)
  console.log("📋 Test Case 2: Second user joins meeting with existing participant");
  const existingParticipants2 = [
    {
      socketId: "socket123",
      userId: "user123",
      displayName: "Alice"
    }
  ];
  const currentUser2 = {
    id: "user456",
    username: "Bob"
  };

  const result2 = simulateMeetingJoined(existingParticipants2, currentUser2, "socket456");
  console.log("✅ Result:", result2);
  console.log("Expected: 2 participants (Alice + Bob)\n");

  // Test Case 3: User refreshes (existing participant with same userId but new socketId)
  console.log("📋 Test Case 3: User refreshes (same userId, new socketId)");
  const existingParticipants3 = [
    {
      socketId: "socket456", // Bob's old socket
      userId: "user456",
      displayName: "Bob"
    }
  ];
  const currentUser3 = {
    id: "user456", // Same user ID as existing participant
    username: "Bob"
  };

  const result3 = simulateMeetingJoined(existingParticipants3, currentUser3, "socket789");
  console.log("✅ Result:", result3);
  console.log("Expected: 1 participant (Bob with new socket) - should not duplicate\n");
}

function simulateMeetingJoined(existingParticipants, currentUser, currentSocketId) {
  const initialParticipants = [];
  
  // Add existing participants
  if (existingParticipants && Array.isArray(existingParticipants)) {
    const existingParts = existingParticipants.map(p => ({
      socketId: p.socketId,
      userId: p.userId,
      displayName: p.displayName || `User ${p.userId.slice(-4)}`,
      isMuted: false,
      isVideoOff: false
    }));
    initialParticipants.push(...existingParts);
  }
  
  // Check if current user is already in existing participants
  const currentUserExists = initialParticipants.some(p => p.userId === currentUser.id);
  
  if (!currentUserExists) {
    const currentUserParticipant = {
      socketId: currentSocketId,
      userId: currentUser.id,
      displayName: currentUser.username || 'You',
      isMuted: false,
      isVideoOff: false
    };
    
    initialParticipants.push(currentUserParticipant);
  }
  
  return {
    participantCount: initialParticipants.length,
    participants: initialParticipants.map(p => `${p.displayName} (${p.socketId.slice(-3)})`)
  };
}

// Run the test
testParticipantSync();