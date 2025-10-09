// frontend/src/App.jsx
import React from "react";
import VideoChat from "./components/VideoChat";
import Whiteboard from "./components/Whiteboard";

function App() {
  return (
    <div className="p-4 text-center">
      <h1 className="text-3xl font-bold mb-6">TeachSync – Real-time Meeting & Whiteboard</h1>
      <div className="flex flex-col gap-10 items-center">
        <VideoChat />
        <Whiteboard />
      </div>
    </div>
  );
}

export default App;
