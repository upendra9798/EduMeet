# 📋 Production Deployment Checklist for Mobile Video Support

## ✅ **Required for Mobile Camera Access**
- [ ] **HTTPS Certificate** - Mobile browsers REQUIRE HTTPS for camera/microphone
- [ ] **Domain SSL Configuration** - Valid SSL certificate for your domain
- [ ] **Environment Variables** - Set production API/Socket URLs in .env.production

## ✅ **WebRTC Requirements**
- [ ] **STUN Servers** - Configure multiple STUN servers for better connectivity
- [ ] **TURN Server** - REQUIRED for mobile networks behind NAT (recommend: Coturn, Twilio, or AWS)
- [ ] **ICE Candidate Handling** - Ensure proper peer-to-peer connection establishment

## ✅ **Server Configuration**
- [ ] **CORS Policy** - Add production domain to allowed origins
- [ ] **WebSocket Support** - Ensure production server supports WebSocket connections
- [ ] **Port Configuration** - Configure proper ports for production (80/443)

## ✅ **Mobile-Specific Testing**
- [ ] **iOS Safari** - Test camera access and video streaming
- [ ] **Android Chrome** - Test camera access and video streaming  
- [ ] **Different Networks** - Test on mobile data vs WiFi
- [ ] **Permission Flows** - Test camera permission grant/deny scenarios

## ⚠️ **Common Production Issues**

### **Issue 1: "Camera access denied" in production**
**Cause**: HTTP instead of HTTPS
**Solution**: 
```bash
# Ensure HTTPS is properly configured
# Mobile browsers block camera access on HTTP
```

### **Issue 2: "Failed to establish peer connection"**
**Cause**: Missing TURN server for mobile networks
**Solution**:
```javascript
// Add TURN server configuration
{
  urls: "turn:your-turn-server.com:3478",
  username: "username",
  credential: "password"
}
```

### **Issue 3: "Socket connection failed"**
**Cause**: WebSocket not properly configured for production
**Solution**: 
```javascript
// Ensure WebSocket support in production server
// Check firewall settings for WebSocket connections
```

## 🚀 **Recommended Production Stack**
- **Frontend**: Netlify/Vercel (automatic HTTPS)
- **Backend**: Railway/Render/AWS (WebSocket support)
- **TURN Server**: Coturn on VPS or Twilio API
- **Database**: MongoDB Atlas (cloud)

## 📱 **Testing Commands**
```bash
# Test HTTPS certificate
curl -I https://your-domain.com

# Test WebSocket connection
wscat -c wss://your-domain.com

# Test API endpoints
curl https://your-domain.com/api/health
```