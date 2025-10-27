# Multi-User Video Testing Guide

## 🎯 Issue Identified
The problem was that both browser windows were using the same `user.id`, so the system treated them as the same participant instead of different users.

## ✅ Solution Implemented
Added support for `testUserId` URL parameter to simulate different users during testing.

## 🧪 How to Test Multi-User Video

### Method 1: Using URL Parameters (Recommended)

1. **First User (Host):**
   - Open: `http://localhost:5174`
   - Create a meeting
   - Note the meeting ID from the URL

2. **Second User (Participant):**
   - Open in new incognito window: `http://localhost:5174/meeting/MEETING_ID?testUserId=user2`
   - Replace `MEETING_ID` with the actual meeting ID
   - This will simulate a different user joining

3. **Third User (Optional):**
   - Open another incognito window: `http://localhost:5174/meeting/MEETING_ID?testUserId=user3`

### Method 2: Different Display Names

1. **First User:**
   - Normal meeting creation and joining

2. **Second User:**
   - Join with: `http://localhost:5174/meeting/MEETING_ID?testUserId=participant1&displayName=Alice`

3. **Third User:**
   - Join with: `http://localhost:5174/meeting/MEETING_ID?testUserId=participant2&displayName=Bob`

## 🔍 Debug Information Added

Each video chat now shows debug information including:
- Join status
- Number of remote participants
- Participant socket IDs
- Local stream availability
- Meeting and User IDs

## 🎮 Expected Behavior

### With Proper Testing:
- ✅ Each user sees their own video labeled "(You)"
- ✅ Each user sees other participants' videos
- ✅ Video grid adjusts automatically (1x1, 2x1, 2x2, etc.)
- ✅ Audio from remote participants is audible
- ✅ Participants can join/leave smoothly

### Debug Console Output:
Look for these messages in browser console:
```
VideoChat: Meeting joined event received: {existingParticipants: [...]}
VideoChat: New user joined event received: {socketId: "...", displayName: "..."}
VideoChat: Received remote stream from: socketId
VideoChat: Updated participant with stream: socketId
```

## 🚫 Common Issues & Solutions

### Issue: "Waiting for others to join" on both windows
**Cause:** Both windows using same user ID
**Solution:** Use `?testUserId=uniqueId` in URL

### Issue: Can see participants but no video
**Cause:** WebRTC connection failed or no media permissions
**Solution:** 
1. Grant camera/microphone permissions
2. Check browser console for WebRTC errors
3. Ensure both users have media enabled

### Issue: One-way video (only see yourself)
**Cause:** Peer connection or signaling issue
**Solution:**
1. Check network connectivity
2. Look for WebRTC connection errors in console
3. Verify both users are in same meeting room

## 🛠️ Debugging Steps

1. **Check Debug Panel:** Each video chat shows current state
2. **Browser Console:** Look for connection and WebRTC logs
3. **Network Tab:** Verify WebSocket connections to `/meeting` namespace
4. **Manual Debug:** Click "Log Debug Info" button for detailed state

## 🎯 Test URLs

Replace `MEETING_ID` with your actual meeting ID:

```
# Host (creates meeting first)
http://localhost:5174

# Participant 1
http://localhost:5174/meeting/MEETING_ID?testUserId=participant1&displayName=Alice

# Participant 2  
http://localhost:5174/meeting/MEETING_ID?testUserId=participant2&displayName=Bob

# Participant 3
http://localhost:5174/meeting/MEETING_ID?testUserId=participant3&displayName=Charlie
```

## ✅ Success Indicators

- Debug panel shows: "Remote Participants: 1+" (not 0)
- Video grid shows multiple video tiles
- Console logs show successful peer connections
- Audio is audible from remote participants
- Participants can see each other's video streams

## 🔄 If Still Not Working

1. Clear browser cache and localStorage
2. Restart backend server
3. Use different browsers (Chrome + Firefox)
4. Check firewall/antivirus WebRTC blocking
5. Test on different networks

The video chat system should now properly support multiple participants with unique user IDs!