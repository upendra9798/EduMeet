import React, { useRef, useEffect, useState } from "react";
import io from "socket.io-client";

// ✅ Whiteboard Component — shared interactive canvas for meetings
const Whiteboard = ({ meetingId, isAdmin, userId }) => {
  // References for canvas and its context (for drawing)
  const canvasRef = useRef(null);
  const contextRef = useRef(null);

  // Local state management
  const [isDrawing, setIsDrawing] = useState(false);
  const [tool, setTool] = useState("pen");
  const [color, setColor] = useState("#000000");
  const [brushSize, setBrushSize] = useState(3);
  const [socket, setSocket] = useState(null);

  // History (Undo/Redo) management
  const [history, setHistory] = useState([]);
  const [historyStep, setHistoryStep] = useState(-1);

  /* ------------------------------------------------------------------
     1️⃣ Setup Socket.io connection and event listeners
  ------------------------------------------------------------------ */
  useEffect(() => {
    // Connect to backend socket server
    const newSocket = io("http://localhost:5001");
    setSocket(newSocket);

    // Join meeting-specific whiteboard room
    newSocket.emit("join-whiteboard", { meetingId, userId, isAdmin });

    // Listen for drawing updates from others
    newSocket.on("drawing-event", (data) => {
      if (data.userId !== userId) {
        drawFromServer(data);
      }
    });

    // Listen for clear events
    newSocket.on("canvas-cleared", () => {
      clearCanvas(false);
    });

    // Listen for complete canvas updates (undo/redo sync)
    newSocket.on("canvas-state", (imageData) => {
      loadCanvasState(imageData);
    });

    return () => newSocket.disconnect();
  }, [meetingId, userId, isAdmin]);

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
     3️⃣ Drawing Event Handlers (for Admin)
  ------------------------------------------------------------------ */
  const startDrawing = (e) => {
    if (!isAdmin) return;

    const { offsetX, offsetY } = e.nativeEvent;
    contextRef.current.beginPath();
    contextRef.current.moveTo(offsetX, offsetY);
    setIsDrawing(true);

    // Notify others about start
    socket?.emit("drawing-start", { 
      meetingId,
      userId,
      x: offsetX,
      y: offsetY,
      tool,
      color,
      brushSize,
    });
  };

  const draw = (e) => {
    if (!isDrawing || !isAdmin) return;
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

    // Emit draw event
    socket?.emit("drawing", {
      meetingId,
      userId,
      x: offsetX,
      y: offsetY,
      tool,
      color,
      brushSize,
    });
  };

  const stopDrawing = () => {
    if (!isDrawing || !isAdmin) return;

    contextRef.current.closePath();
    setIsDrawing(false);
    saveCanvasState();

    // Notify stop
    socket?.emit("drawing-end", { meetingId, userId });
  };

  /* ------------------------------------------------------------------
     4️⃣ Draw updates from server (other users)
  ------------------------------------------------------------------ */
  const drawFromServer = (data) => {
    const ctx = contextRef.current;

    if (data.type === "start") {
      ctx.beginPath();
      ctx.moveTo(data.x, data.y);
    } else if (data.type === "draw") {
      if (data.tool === "pen") {
        ctx.globalCompositeOperation = "source-over";
        ctx.strokeStyle = data.color;
        ctx.lineWidth = data.brushSize;
        ctx.lineTo(data.x, data.y);
        ctx.stroke();
      } else if (data.tool === "eraser") {
        ctx.globalCompositeOperation = "destination-out";
        ctx.beginPath();
        ctx.arc(data.x, data.y, data.brushSize, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (data.type === "end") {
      ctx.closePath();
    }
  };

  /* ------------------------------------------------------------------
     5️⃣ Canvas Utilities (Undo, Redo, Clear, Save)
  ------------------------------------------------------------------ */
  const clearCanvas = (emit = true) => {
    if (!isAdmin && emit) return;

    const canvas = canvasRef.current;
    contextRef.current.clearRect(0, 0, canvas.width, canvas.height);

    if (emit) socket?.emit("clear-canvas", { meetingId, userId });

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
    if (!isAdmin || historyStep <= 0) return;
    const prev = history[historyStep - 1];
    setHistoryStep(historyStep - 1);
    loadCanvasState(prev);
    socket?.emit("canvas-update", { meetingId, userId, imageData: prev });
  };

  const redo = () => {
    if (!isAdmin || historyStep >= history.length - 1) return;
    const next = history[historyStep + 1];
    setHistoryStep(historyStep + 1);
    loadCanvasState(next);
    socket?.emit("canvas-update", { meetingId, userId, imageData: next });
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
      {/* Toolbar (only for admin) */}
      {isAdmin && (
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
        {!isAdmin && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/70 text-gray-600 font-medium text-lg">
            View Only Mode — Only Admin Can Draw ✋
          </div>
        )}
      </div>
    </div>
  );
};

export default Whiteboard;
