// sockets/whiteboardSocket.js
export default function whiteboardSocket(io) {
  // Store whiteboard state for each meeting
  const whiteboardStates = {}; // { meetingId: base64Image }
  const roomAdmins = {}; // { meetingId: [userIds] }

  io.on("connection", (socket) => {
    console.log(`🟢 User connected: ${socket.id}`);

    // -------------------------------------------------------
    // 🔹 Join a meeting room
    // -------------------------------------------------------
   socket.on("join-whiteboard", ({ meetingId, userId, isAdmin }) => {
      socket.join(meetingId);
      socket.data = { meetingId, userId, isAdmin }; // Save user info on socket

      console.log(`👤 User ${userId} joined room ${meetingId} (Admin: ${isAdmin})`);

      // Register admin
      if (isAdmin) {
        if (!roomAdmins[meetingId]) roomAdmins[meetingId] = [];
        if (!roomAdmins[meetingId].includes(userId)) {
          roomAdmins[meetingId].push(userId);
        }
      }

      // Send current whiteboard state if exists
      if (whiteboardStates[meetingId]) {
        socket.emit("canvas-state", whiteboardStates[meetingId]);
      }
    });

    // ✅ Helper function to verify admin
    const isUserAdmin = (meetingId, userId) => {
      roomAdmins[meetingId]?.includes(userId);
    }

    // -------------------------------------------------------
    // ✏️ Drawing events
    // -------------------------------------------------------
     // 🖌️ Drawing start
    socket.on("drawing-start", (data) => {
      if (!isUserAdmin(data.meetingId, data.userId)) return;
      io.to(data.meetingId).emit("drawing-event", { ...data, type: "start" });
    });

    // 🖊️ Drawing move
    socket.on("drawing", (data) => {
      if (!isUserAdmin(data.meetingId, data.userId)) return;
      io.to(data.meetingId).emit("drawing-event", { ...data, type: "draw" });
    });

    // 🏁 Drawing end
    socket.on("drawing-end", (data) => {
      if (!isUserAdmin(data.meetingId, data.userId)) return;
      io.to(data.meetingId).emit("drawing-event", { ...data, type: "end" });
    });

    // -------------------------------------------------------
    // 🧹 Clear canvas
    // -------------------------------------------------------
    // 🧹 Clear board
    socket.on("clear-canvas", ({ meetingId, userId }) => {
      if (!isUserAdmin(meetingId, userId)) return;
      whiteboardStates[meetingId] = null;
      io.to(meetingId).emit("canvas-cleared");
      console.log(`🧼 Canvas cleared by admin ${userId} in room ${meetingId}`);
    });

    // -------------------------------------------------------
    // 🔄 Canvas updates (Undo/Redo sync)
    // -------------------------------------------------------
    socket.on("canvas-update", ({ meetingId, userId, imageData }) => {
      if (!isUserAdmin(meetingId, userId)) return;
      whiteboardStates[meetingId] = imageData;
      socket.to(meetingId).emit("canvas-state", imageData);
    });

    // -------------------------------------------------------
    // ❌ Disconnect event
    // -------------------------------------------------------
    socket.on("disconnect", () => {
      const { meetingId, userId, isAdmin } = socket.data || {};
      if (isAdmin && roomAdmins[meetingId]) {
        roomAdmins[meetingId] = roomAdmins[meetingId].filter((id) => id !== userId);
      }
      console.log(`🔴 Disconnected: ${socket.id}`);
    });
  });
}
