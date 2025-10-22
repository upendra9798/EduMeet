# Multi-User Whiteboard Testing Guide

## Quick Test Steps

### Step 1: Host User (Browser Window 1)
1. Open http://localhost:5174 in Chrome
2. Create a new meeting:
   - Title: "Whiteboard Test Meeting"
   - Click "Create Meeting"
3. Note the meeting ID from the URL or dashboard
4. Join the meeting
5. Switch to "Whiteboard" view
6. Verify you see drawing tools (pen, eraser, colors, etc.)
7. Try drawing something - you should be able to draw

### Step 2: Participant User (Browser Window 2) 
1. Open http://localhost:5174 in a NEW INCOGNITO window
2. Go to "Join Meeting" tab
3. Enter the meeting ID from Step 1
4. Join the meeting
5. Switch to "Whiteboard" view
6. Verify you see "View Only Mode" overlay
7. Verify you CANNOT draw (no drawing tools visible)
8. Verify you CAN see the host's drawings in real-time

### Step 3: Real-time Testing
1. **Host draws** something on the whiteboard
2. **Participant should see** the drawing appear instantly
3. **Host uses eraser** - participant should see erasure
4. **Host clears canvas** - participant should see clear
5. **Host changes colors** - participant should see new colors

## Expected Results:
✅ Host: Full drawing controls + can draw
✅ Participant: View-only + sees host drawings in real-time
✅ Real-time sync working between users
❌ Participant cannot draw or access tools

## Testing Different Scenarios:

### Scenario A: Different Browsers
- Window 1: Chrome (Host)
- Window 2: Firefox (Participant)
- Window 3: Edge (Another Participant)

### Scenario B: Multiple Participants
1. Host creates meeting
2. Participant 1 joins
3. Participant 2 joins
4. All participants should see the same whiteboard state
5. Only host can draw, all participants can view

### Scenario C: Host Leave/Rejoin
1. Host draws something
2. Host leaves meeting
3. Participants should still see the drawing
4. Host rejoins - should see previous drawings
5. Host should regain drawing controls

## Debug Console Messages to Watch:
- "User [userId] joined whiteboard [whiteboardId] as [role]"
- "canDraw: true/false"
- "isHost: true/false"
- Socket connection messages

## Common Issues to Check:
- Browser blocks WebSocket connections
- Users get same user ID (clear localStorage)
- Drawing not syncing (check socket connections)
- Permissions not working (check console logs)