# 📱 Mobile Testing Setup Guide for EduMeet

## ✅ Changes Made

1. **Fixed socket connection**: Now connects to correct backend port (5001)
2. **Updated CORS configuration**: Added network IP for mobile access
3. **Configured Vite dev server**: Now accepts external connections
4. **Backend network binding**: Server now listens on all network interfaces

## 🚀 How to Test on Your Phone

### Step 1: Start the Servers

```bash
# Terminal 1 - Backend
cd backend
npm start

# Terminal 2 - Frontend  
cd frontend
npm run dev
```

### Step 2: Get Your Network URLs

After starting, you should see:
```
Backend: Server is running on http://172.23.247.244:5001
Frontend: Local: http://localhost:5174/
          Network: http://172.23.247.244:5174/
```

### Step 3: Test Multi-User Video on Mobile

#### Option 1: Computer + Phone Testing
1. **Computer**: Open `http://localhost:5174` and create a meeting
2. **Phone**: Connect to same WiFi, open `http://172.23.247.244:5174/meeting/MEETING_ID?testUserId=mobile1`

#### Option 2: Two Phones Testing  
1. **Phone 1**: `http://172.23.247.244:5174` (create meeting)
2. **Phone 2**: `http://172.23.247.244:5174/meeting/MEETING_ID?testUserId=mobile2`

#### Option 3: Multiple Devices
1. **Computer**: `http://localhost:5174` (host)
2. **Phone 1**: `http://172.23.247.244:5174/meeting/MEETING_ID?testUserId=phone1&displayName=Phone1`  
3. **Phone 2**: `http://172.23.247.244:5174/meeting/MEETING_ID?testUserId=phone2&displayName=Phone2`
4. **Tablet**: `http://172.23.247.244:5174/meeting/MEETING_ID?testUserId=tablet1&displayName=Tablet`

## 📱 Mobile Browser Requirements

### Recommended Browsers:
- ✅ **Chrome Mobile** (best WebRTC support)
- ✅ **Safari Mobile** (iOS)
- ✅ **Samsung Internet**
- ⚠️ **Firefox Mobile** (limited WebRTC features)

### Required Permissions:
- 📷 **Camera access**
- 🎤 **Microphone access** 
- 🌐 **Network access**

## 🔧 Troubleshooting

### Issue: "Cannot connect to server"
**Solutions:**
1. Ensure phone and computer are on **same WiFi network**
2. Check if firewall is blocking ports 5001 and 5174
3. Verify IP address is correct (`ipconfig` on Windows)
4. Try disabling Windows Firewall temporarily

### Issue: "Camera/microphone not working"
**Solutions:**
1. Grant permissions when browser prompts
2. Use HTTPS for production (some features need secure context)
3. Check browser settings for media permissions

### Issue: "Can't see other participants"
**Solutions:**
1. Use different `testUserId` parameters for each device
2. Check browser console for WebRTC errors
3. Ensure all devices are using the same meeting ID
4. Clear browser cache and refresh

### Issue: "Video quality is poor"
**Solutions:**
1. Ensure good WiFi signal on all devices
2. Close other apps using camera/microphone
3. Reduce number of participants for testing
4. Check network bandwidth

## 🧪 Testing Scenarios

### Basic Connection Test:
1. Computer creates meeting → Phone joins → Both should see each other's video

### Multi-Device Test:
1. 3+ devices join same meeting → All should see everyone's video in grid

### Host Controls Test:
1. Host draws on whiteboard → Only host should be able to draw
2. Participants see drawing updates in real-time

### Network Resilience Test:
1. Temporarily disconnect/reconnect WiFi → Should auto-reconnect
2. Switch between mobile data and WiFi → Should maintain connection

## 🔍 Debug Information

Each device will show debug panel with:
- Connection status
- Number of remote participants  
- Local stream availability
- Meeting and user IDs

## 📋 Quick Test URLs

Replace `MEETING_ID` with actual meeting ID and `YOUR_IP` with your computer's IP:

```
# Host (Computer)
http://localhost:5174

# Phone 1  
http://YOUR_IP:5174/meeting/MEETING_ID?testUserId=phone1&displayName=Phone1

# Phone 2
http://YOUR_IP:5174/meeting/MEETING_ID?testUserId=phone2&displayName=Phone2

# Tablet
http://YOUR_IP:5174/meeting/MEETING_ID?testUserId=tablet&displayName=Tablet
```

## ⚡ Performance Tips

1. **Use Chrome on mobile** for best WebRTC performance
2. **Close other apps** to free up camera/mic resources  
3. **Good WiFi signal** essential for video quality
4. **Landscape mode** often works better for video meetings
5. **Charge devices** - video calls drain battery quickly

## 🔒 Security Notes

- This setup is for **local testing only**
- For production, use HTTPS and proper domain
- Consider using TURN servers for better connectivity
- Implement proper authentication for production use

## ✅ Success Indicators

- ✅ Multiple devices can join the same meeting
- ✅ Video streams from all participants are visible
- ✅ Audio is clear and synchronized  
- ✅ Host-only whiteboard controls work
- ✅ Participants can join/leave smoothly
- ✅ Debug panel shows correct participant count

Your EduMeet app is now ready for mobile testing! 🎉