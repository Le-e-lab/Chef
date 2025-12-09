import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Camera, Mic, Square, AlertTriangle, RefreshCw, X, SlidersHorizontal } from 'lucide-react';
import { CaptureData } from '../types';

interface CameraCaptureProps {
  onCapture: (data: CaptureData) => void;
  onBack: () => void;
  isProcessing: boolean;
}

const CONSTRAINTS = [
  "Vegetarian", "Vegan", "No Stove", "Microwave Only", "Under 15m", "One Pot", "High Protein", "Low Carb"
];

const CameraCapture: React.FC<CameraCaptureProps> = ({ onCapture, onBack, isProcessing }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  
  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorType, setErrorType] = useState<'PERMISSION' | 'HARDWARE' | 'GENERIC'>('GENERIC');
  const [recordingTime, setRecordingTime] = useState(0);
  const [selectedConstraints, setSelectedConstraints] = useState<string[]>([]);
  const [showConstraints, setShowConstraints] = useState(false);

  // Initialize Camera
  useEffect(() => {
    const startCamera = async () => {
      setError(null);
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: true 
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err: any) {
        console.error("Error accessing media devices:", err);
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          setError("Access Denied. Please enable camera and microphone permissions in your browser settings.");
          setErrorType('PERMISSION');
        } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
          setError("No camera or microphone detected on this device.");
          setErrorType('HARDWARE');
        } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
          setError("Hardware in use. Please close other apps using the camera/mic.");
          setErrorType('HARDWARE');
        } else {
          setError(`Unable to access media devices: ${err.message}`);
          setErrorType('GENERIC');
        }
      }
    };

    startCamera();

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  // Timer for recording
  useEffect(() => {
    let interval: number;
    if (isRecording) {
      interval = window.setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } else {
      setRecordingTime(0);
    }
    return () => clearInterval(interval);
  }, [isRecording]);

  const captureFrame = useCallback(() => {
    if (videoRef.current && canvasRef.current) {
      const context = canvasRef.current.getContext('2d');
      if (context) {
        canvasRef.current.width = videoRef.current.videoWidth;
        canvasRef.current.height = videoRef.current.videoHeight;
        context.drawImage(videoRef.current, 0, 0);
        // Return base64 without prefix for Gemini API
        return canvasRef.current.toDataURL('image/jpeg', 0.8).split(',')[1];
      }
    }
    return null;
  }, []);

  const toggleConstraint = (c: string) => {
    setSelectedConstraints(prev => 
      prev.includes(c) ? prev.filter(i => i !== c) : [...prev, c]
    );
  };

  const startRecording = () => {
    if (!streamRef.current || isProcessing) return;

    // Verify audio track exists before starting
    const audioTracks = streamRef.current.getAudioTracks();
    if (audioTracks.length === 0) {
      setError("Microphone not active. Please check input settings.");
      setErrorType('HARDWARE');
      return;
    }

    setIsRecording(true);
    audioChunksRef.current = [];
    
    // Capture initial frame
    const frames: string[] = [];
    const firstFrame = captureFrame();
    if(firstFrame) frames.push(firstFrame);

    // Setup MediaRecorder for audio
    let mimeType = 'audio/webm';
    if (MediaRecorder.isTypeSupported('audio/mp4')) {
      mimeType = 'audio/mp4'; 
    } else if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
      mimeType = 'audio/webm;codecs=opus'; 
    }

    try {
      // Create a new stream containing ONLY the audio track for the recorder
      const audioStream = new MediaStream([audioTracks[0]]);

      const mediaRecorder = new MediaRecorder(audioStream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      // Capture frames periodically
      const frameInterval = setInterval(() => {
        const frame = captureFrame();
        if (frame) frames.push(frame);
      }, 1000); // 1 frame per second

      mediaRecorder.onstop = async () => {
        clearInterval(frameInterval);
        
        // Convert audio blob to base64
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        if (audioBlob.size === 0) {
           console.warn("Audio recording empty");
           // We can still proceed with images only if audio failed, but let's be strict for the "Vibe"
        }

        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = () => {
          const base64Audio = (reader.result as string).split(',')[1];
          onCapture({
            images: frames, // Send all captured frames
            audio: base64Audio,
            audioMimeType: mimeType,
            constraints: selectedConstraints
          });
        };
      };

      mediaRecorder.start();
    } catch (e: any) {
      console.error("MediaRecorder error", e);
      setError(`Failed to start recording: ${e.message}`);
      setErrorType('GENERIC');
      setIsRecording(false);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      try {
        mediaRecorderRef.current.stop();
      } catch (e) {
        console.error("Error stopping recorder:", e);
      }
      setIsRecording(false);
    }
  };

  // Helper for formatting time
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center bg-stone-900 p-8 space-y-6">
        <div className="p-4 bg-red-900/20 rounded-full text-red-400 border border-red-900/50 shadow-[0_0_30px_rgba(239,68,68,0.2)]">
          <AlertTriangle size={48} strokeWidth={1.5} />
        </div>
        <div className="space-y-2">
          <h3 className="text-2xl font-serif text-white">
            {errorType === 'PERMISSION' ? 'Permission Required' : 
             errorType === 'HARDWARE' ? 'Device Error' : 'Connection Error'}
          </h3>
          <p className="text-stone-400 max-w-xs mx-auto text-sm leading-relaxed">{error}</p>
        </div>
        
        <div className="flex gap-4">
          <button 
            onClick={onBack}
            className="px-6 py-3 border border-stone-700 text-stone-300 rounded-full hover:bg-stone-800 transition-colors"
          >
            Cancel
          </button>
          <button 
            onClick={() => window.location.reload()} 
            className="flex items-center gap-2 px-6 py-3 bg-stone-800 hover:bg-stone-700 text-white rounded-full transition-all text-sm font-medium tracking-wide uppercase"
          >
            <RefreshCw size={16} />
            Reload
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-full w-full bg-black overflow-hidden flex flex-col">
      {/* Video Preview */}
      <video 
        ref={videoRef} 
        autoPlay 
        playsInline 
        muted 
        className="absolute inset-0 w-full h-full object-cover opacity-80"
      />
      <canvas ref={canvasRef} className="hidden" />

      {/* Overlay UI */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/80 flex flex-col justify-between p-6">
        
        {/* Header with Back Button */}
        <div className="flex items-start justify-between">
          <button 
            onClick={onBack}
            className="p-3 bg-black/40 backdrop-blur-md rounded-full text-white/80 hover:bg-black/60 transition-colors"
          >
            <X size={20} />
          </button>

          <div className="text-right pt-2">
             <h2 className="text-stone-300 text-[10px] font-medium tracking-widest uppercase mb-1">The Chef's Muse</h2>
             <div className="flex items-center gap-2 justify-end">
               <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
               <span className="text-stone-400 text-xs">Live Vision</span>
             </div>
          </div>
        </div>

        {/* Center Prompt (Hidden if recording) */}
        {!isRecording && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center w-full max-w-xs pointer-events-none">
            <h1 className="text-white font-serif text-3xl italic drop-shadow-lg mb-2">What's in your fridge?</h1>
            <p className="text-white/70 text-xs drop-shadow-md">Pan over ingredients & speak your cravings.</p>
          </div>
        )}

        {/* Bottom Controls */}
        <div className="flex flex-col items-center gap-6 mb-8">
          
          {/* Constraints Selector */}
          {!isRecording && (
            <div className="w-full">
              <div className="flex justify-center mb-2">
                 <button 
                  onClick={() => setShowConstraints(!showConstraints)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-medium transition-all ${selectedConstraints.length > 0 || showConstraints ? 'bg-amber-350 text-stone-900' : 'bg-black/40 text-stone-300 backdrop-blur-md'}`}
                 >
                   <SlidersHorizontal size={14} />
                   {selectedConstraints.length > 0 ? `${selectedConstraints.length} Filter${selectedConstraints.length > 1 ? 's' : ''}` : 'Kitchen Constraints'}
                 </button>
              </div>
              
              {/* Expandable constraints */}
              <div className={`overflow-hidden transition-all duration-300 ease-out ${showConstraints ? 'max-h-40 opacity-100' : 'max-h-0 opacity-0'}`}>
                <div className="flex flex-wrap justify-center gap-2 max-w-sm mx-auto p-2">
                  {CONSTRAINTS.map(c => (
                    <button
                      key={c}
                      onClick={() => toggleConstraint(c)}
                      className={`px-3 py-1 rounded-full text-[10px] uppercase tracking-wider border transition-all ${
                        selectedConstraints.includes(c) 
                          ? 'bg-amber-350 border-amber-350 text-stone-900 font-bold' 
                          : 'bg-black/60 border-stone-600 text-stone-400 hover:border-amber-350/50'
                      }`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Recording Status */}
          {isRecording && (
            <div className="bg-red-500/20 backdrop-blur-sm px-4 py-1 rounded-full border border-red-500/50 flex items-center gap-2 animate-pulse">
              <div className="w-2 h-2 rounded-full bg-red-500" />
              <span className="text-red-100 font-mono text-sm">{formatTime(recordingTime)}</span>
            </div>
          )}
          
          {/* Record Button */}
          <button
            onMouseDown={startRecording}
            onMouseUp={stopRecording}
            onTouchStart={startRecording}
            onTouchEnd={stopRecording}
            disabled={isProcessing}
            className={`
              relative w-20 h-20 rounded-full border-4 flex items-center justify-center transition-all duration-300 shadow-xl
              ${isRecording 
                ? 'border-red-500 bg-red-500/20 scale-110 shadow-[0_0_30px_rgba(239,68,68,0.4)]' 
                : 'border-white/80 hover:border-amber-350 hover:bg-white/10'
              }
              ${isProcessing ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
            `}
          >
            {isRecording ? (
              <Square className="w-6 h-6 text-red-500 fill-current" />
            ) : (
              <Mic className="w-8 h-8 text-white" />
            )}
            
            {/* Helper Text */}
            {!isRecording && !isProcessing && (
              <span className="absolute -bottom-8 whitespace-nowrap text-stone-400 text-[10px] tracking-widest uppercase">
                Hold to Speak
              </span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CameraCapture;