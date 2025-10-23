import React, { useRef, useEffect, useState } from "react";
import io from "socket.io-client";

// ✅ Whiteboard Component — shared interactive canvas for meetings with multi-user support
const Whiteboard = ({ meetingId, userId, userDisplayName }) => {
  // References for canvas and its context (for drawing)
  const canvasRef = useRef(null);
  const contextRef = useRef(null);

  // Local state management
  const [isDrawing, setIsDrawing] = useState(false);
  const [tool, setTool] = useState("pen");
  const [color, setColor] = useState("#000000");
  const [brushSize, setBrushSize] = useState(3);
  const [socket, setSocket] = useState(null);
  const [canDraw, setCanDraw] = useState(false);
  const [remoteDrawers, setRemoteDrawers] = useState({}); // Track remote users drawing

  // Multi-user state
  const [activeUsers, setActiveUsers] = useState([]);
  const [userCursors, setUserCursors] = useState({});
  const [userRole, setUserRole] = useState('participant');
  const [whiteboardPermissions, setWhiteboardPermissions] = useState({});
  const [hasDrawingActivity, setHasDrawingActivity] = useState(false);
  const [isWhiteboardReady, setIsWhiteboardReady] = useState(false);
  const [pendingElements, setPendingElements] = useState(null);

  // History (Undo/Redo) management
  const [history, setHistory] = useState([]);
  const [historyStep, setHistoryStep] = useState(-1);

  /* ------------------------------------------------------------------
     1️⃣ Setup Socket.io connection and event listeners
  ------------------------------------------------------------------ */
  useEffect(() => {
    // Connect to whiteboard namespace
    const newSocket = io("http://localhost:5001/whiteboard");
    setSocket(newSocket);

    // Generate whiteboard ID from meeting
    const whiteboardId = `wb_${meetingId}`;

    // Join whiteboard room
    newSocket.emit("join-whiteboard", { 
      whiteboardId, 
      userId, 
      meetingId,
      displayName: userDisplayName || `User ${userId.slice(-4)}`
    });

    // Listen for successful join
    newSocket.on("joined-whiteboard", (data) => {
      console.log("Joined whiteboard:", data);
      // Save canvas permissions and role
      setCanDraw(data.canDraw);
      setUserRole(data.role);
      setWhiteboardPermissions(data.permissions);
    });

    // Listen for participants list updates
    newSocket.on("participants-list", (data) => {
      console.log("Whiteboard participants:", data.participants);
      setActiveUsers(data.participants);
    });

    // Listen for user join/leave events
    newSocket.on("user-joined", (data) => {
      console.log("User joined whiteboard:", data);
      setActiveUsers(prev => [...prev.filter(u => u.userId !== data.userId), data]);
    });

    newSocket.on("user-left", (data) => {
      console.log("User left whiteboard:", data);
      setActiveUsers(prev => prev.filter(u => u.userId !== data.userId));
      setUserCursors(prev => {
        const newCursors = { ...prev };
        delete newCursors[data.userId];
        return newCursors;
      });
    });

    // Listen for cursor movements
    newSocket.on("cursor-move", (data) => {
      if (data.userId !== userId) {
        setUserCursors(prev => ({
          ...prev,
          [data.userId]: {
            x: data.x,
            y: data.y,
            displayName: data.displayName,
            color: data.userColor || '#ff6b6b'
          }
        }));
      }
    });

    // Listen for whiteboard state (initial load)
    newSocket.on("whiteboard-state", (data) => {
      console.log("Received whiteboard state:", data);
      if (data.elements && data.elements.length > 0) {
        if (isWhiteboardReady) {
          loadWhiteboardElements(data.elements);
        } else {
          // Store elements to load once canvas is ready
          setPendingElements(data.elements);
        }
      }
      setHasDrawingActivity(data.elements && data.elements.length > 0);
    });

    // Listen for real-time drawing events
    newSocket.on("drawing-start", (data) => {
      console.log("Received drawing-start:", data, "Current userId:", userId);
      setHasDrawingActivity(true); // Mark that drawing has started
      if (data.userId !== userId) {
        console.log("Handling remote drawing start for:", data.userId);
        handleRemoteDrawingStart(data);
      } else {
        console.log("Ignoring own drawing-start event");
      }
    });

    newSocket.on("drawing", (data) => {
      console.log("Received drawing update:", data, "Current userId:", userId);
      setHasDrawingActivity(true); // Mark ongoing drawing activity
      if (data.userId !== userId) {
        console.log("Handling remote drawing for:", data.userId);
        handleRemoteDrawing(data);
      } else {
        console.log("Ignoring own drawing event");
      }
    });

    newSocket.on("drawing-end", (data) => {
      console.log("Received drawing-end:", data, "Current userId:", userId);
      if (data.userId !== userId) {
        console.log("Handling remote drawing end for:", data.userId);
        handleRemoteDrawingEnd(data);
      } else {
        console.log("Ignoring own drawing-end event");
      }
    });

    // Listen for canvas clear events
    newSocket.on("canvas-cleared", (data) => {
      clearCanvas(false);
    });

    // Listen for new elements added
    newSocket.on("element-added", (data) => {
      console.log("New element added:", data);
    });

    // Listen for errors
    newSocket.on("error", (data) => {
      console.error("Whiteboard error:", data.message);
    });

    return () => newSocket.disconnect();
  }, [meetingId, userId]);

  /* ------------------------------------------------------------------
     2️⃣ Setup Canvas size and initial context
  ------------------------------------------------------------------ */
  useEffect(() => {
    const canvas = canvasRef.current;
    canvas.width = canvas.offsetWidth * 2;
    canvas.height = canvas.offsetHeight * 2;
    canvas.style.width = `${canvas.offsetWidth}px`;
    canvas.style.height = `${canvas.offsetHeight}px`;

    const context = canvas.getContext("2d");
    context.scale(2, 2);
    context.lineCap = "round";
    context.lineJoin = "round";
    context.strokeStyle = color;
    context.lineWidth = brushSize;
    contextRef.current = context;

    // Mark whiteboard as ready
    setIsWhiteboardReady(true);

    // Load pending elements if any
    if (pendingElements && pendingElements.length > 0) {
      setTimeout(() => {
        loadWhiteboardElements(pendingElements);
        setPendingElements(null);
      }, 100);
    } else {
      // Only save initial blank state if no pending elements
      saveCanvasState();
    }
  }, [pendingElements]);

  /* ------------------------------------------------------------------
     3️⃣ Drawing Event Handlers (with proper permissions)
  ------------------------------------------------------------------ */
  const startDrawing = (e) => {
    if (!canDraw) {
      console.log("Drawing not allowed for this user");
      return;
    }

    const { offsetX, offsetY } = e.nativeEvent;
    contextRef.current.beginPath();
    contextRef.current.moveTo(offsetX, offsetY);
    setIsDrawing(true);

    // Notify others about drawing start
    console.log("Emitting drawing-start:", { x: offsetX, y: offsetY, tool, color, brushSize });
    setHasDrawingActivity(true); // Mark that user started drawing
    socket?.emit("drawing-start", { 
      x: offsetX,
      y: offsetY,
      tool,
      color,
      brushSize,
      timestamp: Date.now()
    });
  };

  const draw = (e) => {
    if (!isDrawing || !canDraw) return;
    const { offsetX, offsetY } = e.nativeEvent;

    if (tool === "pen") {
      contextRef.current.globalCompositeOperation = "source-over";
      contextRef.current.strokeStyle = color;
      contextRef.current.lineWidth = brushSize;
      contextRef.current.lineTo(offsetX, offsetY);
      contextRef.current.stroke();
    } else if (tool === "eraser") {
      contextRef.current.globalCompositeOperation = "destination-out";
      contextRef.current.beginPath();
      contextRef.current.arc(offsetX, offsetY, brushSize, 0, Math.PI * 2);
      contextRef.current.fill();
    }

    // Emit drawing data
    console.log("Emitting drawing update:", { x: offsetX, y: offsetY, tool, color, brushSize });
    socket?.emit("drawing", {
      x: offsetX,
      y: offsetY,
      tool,
      color,
      brushSize,
      timestamp: Date.now()
    });
  };

  // Handle mouse movement for cursor tracking
  const handleMouseMove = (e) => {
    const { offsetX, offsetY } = e.nativeEvent;
    
    // Emit cursor position to other users
    socket?.emit("cursor-move", {
      x: offsetX,
      y: offsetY,
      displayName: userDisplayName || `User ${userId.slice(-4)}`,
      userColor: getUserColor(userId),
      timestamp: Date.now()
    });

    // Continue with drawing if in drawing mode
    if (isDrawing) {
      draw(e);
    }
  };

  // Generate consistent color for user based on their ID
  const getUserColor = (id) => {
    const colors = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#ffeaa7', '#dda0dd', '#98d8c8', '#f7dc6f'];
    const index = id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % colors.length;
    return colors[index];
  };

  const enhanceColorVisibility = (color) => {
    // Enhance color contrast and saturation for better visibility
    // Convert hex to RGB to adjust brightness
    const hex = color.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    
    // Calculate luminance
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    
    // If color is too light (low contrast), darken it
    if (luminance > 0.7) {
      const darkenFactor = 0.6;
      const newR = Math.floor(r * darkenFactor);
      const newG = Math.floor(g * darkenFactor);
      const newB = Math.floor(b * darkenFactor);
      return `rgb(${newR}, ${newG}, ${newB})`;
    }
    
    // If color is very dark, brighten it slightly
    if (luminance < 0.1) {
      const brightenFactor = 1.5;
      const newR = Math.min(255, Math.floor(r * brightenFactor));
      const newG = Math.min(255, Math.floor(g * brightenFactor));
      const newB = Math.min(255, Math.floor(b * brightenFactor));
      return `rgb(${newR}, ${newG}, ${newB})`;
    }
    
    return color; // Color is fine as-is
  };

  const stopDrawing = () => {
    if (!isDrawing || !canDraw) return;

    contextRef.current.closePath();
    setIsDrawing(false);
    saveCanvasState();

    // Create element data for the completed drawing
    const canvas = canvasRef.current;
    const elementData = {
      type: 'canvasState',
      tool,
      color,
      brushSize,
      timestamp: Date.now(),
      imageData: canvas.toDataURL(), // Save entire canvas state
    };

    // Notify drawing end with element data
    socket?.emit("drawing-end", { 
      elementData,
      timestamp: Date.now()
    });
  };

  /* ------------------------------------------------------------------
     4️⃣ Remote drawing handlers (from other users)
  ------------------------------------------------------------------ */
  const handleRemoteDrawingStart = (data) => {
    const ctx = contextRef.current;
    const { userId: remoteUserId, x, y, tool, color, brushSize } = data;
    
    console.log("Starting remote drawing for user:", remoteUserId, "at position:", x, y);
    
    // Store remote drawer state
    setRemoteDrawers(prev => ({
      ...prev,
      [remoteUserId]: { x, y, tool, color, brushSize, isDrawing: true }
    }));

    // Set up canvas for remote drawing
    ctx.save();
    ctx.globalCompositeOperation = tool === "eraser" ? "destination-out" : "source-over";
    // Enhance color visibility for remote drawings
    const enhancedColor = tool === "eraser" ? color : enhanceColorVisibility(color);
    ctx.strokeStyle = enhancedColor;
    ctx.lineWidth = Math.max(brushSize, 2); // Minimum thickness for visibility
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const handleRemoteDrawing = (data) => {
    const ctx = contextRef.current;
    const { userId: remoteUserId, x, y, tool, color, brushSize } = data;
    
    console.log("Remote drawing update for user:", remoteUserId, "to position:", x, y);
    
    // Draw immediately without checking state (to avoid async issues)
    if (tool === "pen") {
      ctx.globalCompositeOperation = "source-over";
      // Enhance color visibility for participants
      const enhancedColor = enhanceColorVisibility(color);
      ctx.strokeStyle = enhancedColor;
      ctx.lineWidth = Math.max(brushSize, 2); // Minimum thickness for visibility
      ctx.lineTo(x, y);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x, y);
    } else if (tool === "eraser") {
      ctx.globalCompositeOperation = "destination-out";
      ctx.beginPath();
      ctx.arc(x, y, brushSize / 2, 0, Math.PI * 2);
      ctx.fill();
    }

    // Update remote drawer position
    setRemoteDrawers(prev => ({
      ...prev,
      [remoteUserId]: { ...prev[remoteUserId], x, y }
    }));
  };

  const handleRemoteDrawingEnd = (data) => {
    const ctx = contextRef.current;
    const { userId: remoteUserId } = data;
    
    console.log("Ending remote drawing for user:", remoteUserId);
    
    // Restore canvas state
    ctx.restore();
    
    // Remove remote drawer
    setRemoteDrawers(prev => {
      const newDrawers = { ...prev };
      delete newDrawers[remoteUserId];
      return newDrawers;
    });

    // Save canvas state after remote drawing
    saveCanvasState();
  };

  const loadWhiteboardElements = (elements) => {
    // Load existing whiteboard elements when joining
    console.log("Loading whiteboard elements:", elements);
    
    if (!elements || elements.length === 0) {
      console.log("No existing elements to load");
      return;
    }

    const canvas = canvasRef.current;
    const context = contextRef.current;
    
    if (!canvas || !context) {
      console.log("Canvas not ready yet, will retry loading elements");
      return;
    }

    // Clear canvas before loading elements
    context.clearRect(0, 0, canvas.width, canvas.height);
    
    // Restore elements (for now, we'll use a simpler approach with canvas state)
    elements.forEach((element, index) => {
      if (element.type === 'canvasState' && element.imageData) {
        try {
          // Create image from stored data
          const img = new Image();
          img.onload = () => {
            context.drawImage(img, 0, 0);
            console.log(`Loaded canvas state element ${index}`);
          };
          img.src = element.imageData;
        } catch (error) {
          console.error("Failed to load canvas state:", error);
        }
      }
    });
    
    // Save current state after loading
    setTimeout(() => saveCanvasState(), 100);
  };

  /* ------------------------------------------------------------------
     5️⃣ Canvas Utilities (Undo, Redo, Clear, Save)
  ------------------------------------------------------------------ */
  const clearCanvas = (emit = true) => {
    if (!canDraw && emit) {
      console.log("Clear not allowed for this user");
      return;
    }

    const canvas = canvasRef.current;
    contextRef.current.clearRect(0, 0, canvas.width, canvas.height);

    if (emit) socket?.emit("clear-canvas", {});

    setHistory([]);
    setHistoryStep(-1);
  };

  const saveCanvasState = () => {
    const canvas = canvasRef.current;
    const imageData = canvas.toDataURL();
    const updatedHistory = [...history.slice(0, historyStep + 1), imageData];
    setHistory(updatedHistory);
    setHistoryStep(updatedHistory.length - 1);
  };

  const loadCanvasState = (imageData) => {
    const canvas = canvasRef.current;
    const ctx = contextRef.current;
    const img = new Image();
    img.onload = () => ctx.drawImage(img, 0, 0);
    img.src = imageData;
  };

  const undo = () => {
    if (!canDraw || historyStep <= 0) return;
    const prev = history[historyStep - 1];
    setHistoryStep(historyStep - 1);
    loadCanvasState(prev);
    socket?.emit("canvas-action", { action: "undo", imageData: prev });
  };

  const redo = () => {
    if (!canDraw || historyStep >= history.length - 1) return;
    const next = history[historyStep + 1];
    setHistoryStep(historyStep + 1);
    loadCanvasState(next);
    socket?.emit("canvas-action", { action: "redo", imageData: next });
  };

  const downloadCanvas = () => {
    const canvas = canvasRef.current;
    const link = document.createElement("a");
    link.download = `whiteboard-${meetingId}.png`;
    link.href = canvas.toDataURL();
    link.click();
  };

  /* ------------------------------------------------------------------
     6️⃣ JSX UI with Tailwind CSS and Multi-User Support
  ------------------------------------------------------------------ */
  return (
    <div className="w-full h-full flex flex-col items-center justify-center bg-gray-100 p-4">
      {/* Multi-User Status Bar */}
      <div className="w-full max-w-4xl mb-2 flex justify-between items-center">
        <div className="text-sm">
          {canDraw ? (
            <span className="text-green-600 font-semibold bg-green-50 px-3 py-1 rounded-full border border-green-200">
              ✓ You can draw • {userRole.charAt(0).toUpperCase() + userRole.slice(1)}
            </span>
          ) : (
            <span className="text-blue-600 font-medium bg-blue-50 px-3 py-1 rounded-full border border-blue-200">
              👁️ View-only mode • Watching live session
            </span>
          )}
        </div>
        
        {/* Active Users Display */}
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-600">Active users ({activeUsers.length}):</span>
          <div className="flex space-x-1">
            {activeUsers.slice(0, 5).map((user, index) => (
              <div
                key={user.userId}
                className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-medium"
                style={{ backgroundColor: getUserColor(user.userId) }}
                title={user.displayName || `User ${user.userId.slice(-4)}`}
              >
                {(user.displayName || user.userId).charAt(0).toUpperCase()}
              </div>
            ))}
            {activeUsers.length > 5 && (
              <div className="w-8 h-8 rounded-full bg-gray-400 flex items-center justify-center text-white text-xs">
                +{activeUsers.length - 5}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Toolbar (only for users who can draw) */}
      {canDraw && (
        <div className="flex flex-wrap items-center justify-between bg-white p-3 rounded-xl shadow-md mb-4 w-full max-w-4xl">
          {/* Tool Selector */}
          <div className="flex items-center space-x-2">
            <button
              className={`p-2 rounded ${tool === "pen" ? "bg-blue-500 text-white" : "bg-gray-200"}`}
              onClick={() => setTool("pen")}
              title="Pen"
            >
              ✏️
            </button>
            <button
              className={`p-2 rounded ${tool === "eraser" ? "bg-blue-500 text-white" : "bg-gray-200"}`}
              onClick={() => setTool("eraser")}
              title="Eraser"
            >
              🧽
            </button>
          </div>

          {/* Color Picker */}
          <div className="flex items-center space-x-2">
            <label className="text-sm text-gray-700">Color:</label>
            <input
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="w-8 h-8 border rounded"
            />
          </div>

          {/* Brush Size */}
          <div className="flex items-center space-x-2">
            <label className="text-sm text-gray-700">Size:</label>
            <input
              type="range"
              min="1"
              max="50"
              value={brushSize}
              onChange={(e) => setBrushSize(Number(e.target.value))}
            />
            <span className="text-sm">{brushSize}px</span>
          </div>

          {/* Actions */}
          <div className="flex items-center space-x-2">
            <button
              className="p-2 bg-gray-200 rounded hover:bg-gray-300"
              onClick={undo}
              disabled={historyStep <= 0}
              title="Undo"
            >
              ↶
            </button>
            <button
              className="p-2 bg-gray-200 rounded hover:bg-gray-300"
              onClick={redo}
              disabled={historyStep >= history.length - 1}
              title="Redo"
            >
              ↷
            </button>
            <button
              className="p-2 bg-red-500 text-white rounded hover:bg-red-600"
              onClick={() => clearCanvas(true)}
              title="Clear"
            >
              🗑️
            </button>
            <button
              className="p-2 bg-green-500 text-white rounded hover:bg-green-600"
              onClick={downloadCanvas}
              title="Download"
            >
              💾
            </button>
          </div>
        </div>
      )}

      {/* Canvas Area with User Cursors */}
      <div className="relative w-full max-w-4xl h-[600px] bg-white rounded-xl shadow-lg overflow-hidden">
        <canvas
          ref={canvasRef}
          className="w-full h-full cursor-crosshair"
          onMouseDown={startDrawing}
          onMouseMove={handleMouseMove}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
        />
        
        {/* User Cursors */}
        {Object.entries(userCursors).map(([cursorUserId, cursor]) => (
          <div
            key={cursorUserId}
            className="absolute pointer-events-none z-10"
            style={{
              left: `${cursor.x}px`,
              top: `${cursor.y}px`,
              transform: 'translate(-50%, -50%)'
            }}
          >
            <div
              className="w-4 h-4 rounded-full border-2 border-white shadow-lg"
              style={{ backgroundColor: cursor.color }}
              title={cursor.displayName} // Show name on hover instead
            />
          </div>
        ))}
        
        {/* View Only Overlay - Hide when there's drawing activity */}
        {!canDraw && !hasDrawingActivity && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/60 text-gray-700 font-medium text-lg pointer-events-none z-10">
            <div className="text-center p-6 bg-white rounded-lg shadow-lg border-2 border-gray-200">
              <div className="text-xl mb-2">👀 View Only Mode</div>
              <div className="text-base text-gray-600 mb-3">Only the host can draw on this whiteboard</div>
              <div className="text-sm text-gray-500">You'll see real-time drawings when someone starts drawing</div>
              <button 
                onClick={() => setHasDrawingActivity(true)}
                className="mt-3 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm"
              >
                Hide this overlay
              </button>
            </div>
          </div>
        )}
        
        {/* Subtle indicator when viewing drawings */}
        {!canDraw && hasDrawingActivity && (
          <div className="absolute top-2 left-2 bg-blue-100 border-l-4 border-blue-500 text-blue-700 p-2 rounded text-sm pointer-events-none z-20">
            <div className="flex items-center">
              <span className="mr-2">👁️</span>
              <span>Viewing live whiteboard</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Whiteboard;
