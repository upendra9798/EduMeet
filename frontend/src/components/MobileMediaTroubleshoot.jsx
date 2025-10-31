import React, { useState } from 'react';
import { Camera, Mic, AlertCircle, CheckCircle, RefreshCw } from 'lucide-react';

const MobileMediaTroubleshoot = ({ onRetry, onSkip }) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [checkedSteps, setCheckedSteps] = useState({});

  const troubleshootingSteps = [
    {
      id: 1,
      title: "Check Browser Permissions",
      description: "Camera and microphone access must be explicitly allowed",
      instructions: [
        "Look for a camera/microphone icon in your browser's address bar",
        "Tap the icon and select 'Allow' for both camera and microphone",
        "If you see 'Blocked' status, tap it and choose 'Allow'",
        "Refresh this page after changing permissions"
      ],
      icon: <AlertCircle className="w-6 h-6" />
    },
    {
      id: 2,
      title: "Check Device Settings",
      description: "Your device must allow this website to access camera/microphone",
      instructions: [
        "Go to your device Settings > Privacy & Security",
        "Find Camera and Microphone permissions",
        "Make sure your browser (Chrome/Safari/Firefox) has access",
        "Enable camera and microphone for your browser"
      ],
      icon: <Camera className="w-6 h-6" />
    },
    {
      id: 3,
      title: "Check Other Apps",
      description: "Only one app can use camera/microphone at a time",
      instructions: [
        "Close any other video calling apps (WhatsApp, Zoom, etc.)",
        "Close other browser tabs that might be using camera",
        "Make sure your camera app is closed",
        "Try again after closing other apps"
      ],
      icon: <Mic className="w-6 h-6" />
    },
    {
      id: 4,
      title: "Browser Compatibility",
      description: "Some browsers work better than others on mobile",
      instructions: [
        "Chrome (recommended): Usually has best support",
        "Safari (iOS): Should work well on iPhone/iPad",
        "Firefox: Good alternative if Chrome doesn't work",
        "Avoid using in-app browsers (Instagram, Facebook, etc.)"
      ],
      icon: <RefreshCw className="w-6 h-6" />
    }
  ];

  const markStepChecked = (stepId) => {
    setCheckedSteps(prev => ({
      ...prev,
      [stepId]: !prev[stepId]
    }));
  };

  const allStepsChecked = troubleshootingSteps.every(step => checkedSteps[step.id]);

  return (
    <div className="max-w-md mx-auto p-4 bg-white rounded-lg shadow-lg">
      <div className="text-center mb-6">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-3">
          <Camera className="w-8 h-8 text-red-600" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">
          Camera Access Needed
        </h2>
        <p className="text-gray-600 text-sm">
          To participate in video calls, we need access to your camera and microphone.
        </p>
      </div>

      <div className="space-y-4 mb-6">
        {troubleshootingSteps.map((step) => (
          <div key={step.id} className="border rounded-lg p-4">
            <div className="flex items-start gap-3">
              <div className={`flex-shrink-0 p-2 rounded-full ${
                checkedSteps[step.id] ? 'bg-green-100 text-green-600' : 'bg-blue-100 text-blue-600'
              }`}>
                {checkedSteps[step.id] ? <CheckCircle className="w-4 h-4" /> : step.icon}
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 mb-1">
                  {step.title}
                </h3>
                <p className="text-gray-600 text-sm mb-3">
                  {step.description}
                </p>
                
                <div className="space-y-1 mb-3">
                  {step.instructions.map((instruction, index) => (
                    <div key={index} className="flex items-start gap-2">
                      <span className="text-blue-600 text-xs mt-1">•</span>
                      <span className="text-xs text-gray-700">{instruction}</span>
                    </div>
                  ))}
                </div>

                <button
                  onClick={() => markStepChecked(step.id)}
                  className={`text-xs px-3 py-1 rounded-full border transition-colors ${
                    checkedSteps[step.id]
                      ? 'bg-green-100 text-green-700 border-green-300'
                      : 'bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200'
                  }`}
                >
                  {checkedSteps[step.id] ? '✓ Done' : 'Mark as checked'}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="space-y-3">
        <button
          onClick={onRetry}
          disabled={!allStepsChecked}
          className={`w-full py-3 px-4 rounded-lg font-semibold transition-colors ${
            allStepsChecked
              ? 'bg-blue-600 text-white hover:bg-blue-700'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          }`}
        >
          {allStepsChecked ? 'Try Camera Access Again' : 'Complete all steps above'}
        </button>

        <button
          onClick={onSkip}
          className="w-full py-2 px-4 text-gray-600 hover:text-gray-800 transition-colors text-sm"
        >
          Join without camera (audio only)
        </button>

        <div className="text-center text-xs text-gray-500 mt-4">
          <p>Still having issues? Try refreshing the page or using a different browser.</p>
        </div>
      </div>
    </div>
  );
};

export default MobileMediaTroubleshoot;