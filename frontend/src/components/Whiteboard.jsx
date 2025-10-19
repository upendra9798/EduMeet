import React, { useRef, useEffect, useState } from "react";
import io from "socket.io-client";

// ✅ Whiteboard Component — shared interactive canvas for meetings
const Whiteboard = ({ meetingId, userId }) => {
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
      meetingId 
    });

    // Listen for successful join
    newSocket.on("joined-whiteboard", (data) => {
      console.log("Joined whiteboard:", data);
      // Save canvas permissions
      setCanDraw(data.canDraw);
    });

    // Listen for whiteboard state (initial load)
    newSocket.on("whiteboard-state", (data) => {
      if (data.elements && data.elements.length > 0) {
        loadWhiteboardElements(data.elements);
      }
    });

    // Listen for real-time drawing events
    newSocket.on("drawing-start", (data) => {
      if (data.userId !== userId) {
        handleRemoteDrawingStart(data);
      }
    });

    newSocket.on("drawing", (data) => {
      if (data.userId !== userId) {
        handleRemoteDrawing(data);
      }
    });

    newSocket.on("drawing-end", (data) => {
      if (data.userId !== userId) {
        handleRemoteDrawingEnd(data);
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

    // Save initial blank state
    saveCanvasState();
  }, []);

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
    socket?.emit("drawing", {
      x: offsetX,
      y: offsetY,
      tool,
      color,
      brushSize,
      timestamp: Date.now()
    });
  };

  const stopDrawing = () => {
    if (!isDrawing || !canDraw) return;

    contextRef.current.closePath();
    setIsDrawing(false);
    saveCanvasState();

    // Create element data for the completed drawing
    const canvas = canvasRef.current;
    const elementData = {
      type: 'drawing',
      tool,
      color,
      brushSize,
      timestamp: Date.now(),
      // Could add path data here for vector storage
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
    
    // Store remote drawer state
    setRemoteDrawers(prev => ({
      ...prev,
      [remoteUserId]: { x, y, tool, color, brushSize, isDrawing: true }
    }));

    // Start path for remote user
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const handleRemoteDrawing = (data) => {
    const ctx = contextRef.current;
    const { userId: remoteUserId, x, y, tool, color, brushSize } = data;
    
    const remoteDrawer = remoteDrawers[remoteUserId];
    if (!remoteDrawer || !remoteDrawer.isDrawing) return;

    if (tool === "pen") {
      ctx.globalCompositeOperation = "source-over";
      ctx.strokeStyle = color;
      ctx.lineWidth = brushSize;
      ctx.lineTo(x, y);
      ctx.stroke();
    } else if (tool === "eraser") {
      ctx.globalCompositeOperation = "destination-out";
      ctx.beginPath();
      ctx.arc(x, y, brushSize, 0, Math.PI * 2);
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
    
    // End path for remote user
    ctx.closePath();
    ctx.restore();
    
    // Remove remote drawer
    setRemoteDrawers(prev => {
      const newDrawers = { ...prev };
      delete newDrawers[remoteUserId];
      return newDrawers;
    });
  };

  const loadWhiteboardElements = (elements) => {
    // Load existing whiteboard elements when joining
    console.log("Loading whiteboard elements:", elements);
    // Implementation depends on how elements are stored
    // For now, this could reconstruct the canvas from stored paths
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
     6️⃣ JSX UI with Tailwind CSS
  ------------------------------------------------------------------ */
  return (
    <div className="w-full h-full flex flex-col items-center justify-center bg-gray-100 p-4">
      {/* Permission Status */}
      <div className="mb-2 text-sm">
        {canDraw ? (
          <span className="text-green-600 font-medium">✓ You can draw on this whiteboard</span>
        ) : (
          <span className="text-gray-600">👁️ View-only mode (only host can draw)</span>
        )}
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

      {/* Canvas Area */}
      <div className="relative w-full max-w-4xl h-[600px] bg-white rounded-xl shadow-lg overflow-hidden">
        <canvas
          ref={canvasRef}
          className="w-full h-full cursor-crosshair"
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
        />
        {!canDraw && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/70 text-gray-600 font-medium text-lg pointer-events-none">
            View Only Mode — Only Host Can Draw ✋
          </div>
        )}
      </div>
    </div>
  );
};

export default Whiteboard;
