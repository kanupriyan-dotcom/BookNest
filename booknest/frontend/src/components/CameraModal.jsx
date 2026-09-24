import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Camera, RefreshCw, Upload, Check, X, SwitchCamera, AlertCircle } from 'lucide-react';

export default function CameraModal({
  isOpen,
  onClose,
  onCapture,
  title = 'Capture Book Image',
  description = 'Position the book cover within the frame and capture a clear photo.',
}) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const fileInputRef = useRef(null);

  const [facingMode, setFacingMode] = useState('environment'); // 'environment' (back) or 'user' (front)
  const [capturedImage, setCapturedImage] = useState(null);
  const [cameraError, setCameraError] = useState(null);
  const [loadingCamera, setLoadingCamera] = useState(false);
  const [activeTab, setActiveTab] = useState('camera'); // 'camera' or 'upload'

  // Start webcam stream
  const startCamera = async () => {
    setLoadingCamera(true);
    setCameraError(null);

    // Stop existing stream if any
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
    }

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera access is not supported by your browser. Please upload a file instead.');
      }

      const constraints = {
        video: {
          facingMode: { ideal: facingMode },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
    } catch (err) {
      console.warn('Camera access issue:', err);
      setCameraError(err.message || 'Unable to access camera. Please allow camera permissions or upload an image.');
    } finally {
      setLoadingCamera(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  };

  useEffect(() => {
    if (isOpen && activeTab === 'camera' && !capturedImage) {
      startCamera();
    } else {
      stopCamera();
    }

    return () => {
      stopCamera();
    };
  }, [isOpen, activeTab, facingMode, capturedImage]);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') handleClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  // Capture snapshot from video stream
  const handleSnap = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;

    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);

    setCapturedImage(dataUrl);
    stopCamera();
  };

  // Switch facing mode (back / front camera)
  const toggleCameraFacing = () => {
    setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
  };

  // Handle file upload fallback
  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please select an image file (PNG, JPG, WebP).');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setCapturedImage(reader.result);
      stopCamera();
    };
    reader.readAsDataURL(file);
  };

  // Confirm image selection
  const handleConfirm = () => {
    if (capturedImage) {
      onCapture(capturedImage);
      handleClose();
    }
  };

  // Retake photo
  const handleRetake = () => {
    setCapturedImage(null);
    if (activeTab === 'camera') {
      startCamera();
    }
  };

  const handleClose = () => {
    stopCamera();
    setCapturedImage(null);
    setCameraError(null);
    onClose();
  };

  if (!isOpen) return null;

  const modalNode = (
    <div
      className="fixed inset-0 z-[110] overflow-y-auto p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200 flex justify-center items-center"
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      <div
        className="bg-white rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl border border-slate-200 flex flex-col my-auto max-h-[92vh] relative z-10"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50/70 shrink-0">
          <div>
            <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
              <Camera className="w-5 h-5 text-sky-600" />
              <span>{title}</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">{description}</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden sm:inline text-[10px] font-mono font-semibold text-slate-400 bg-slate-200/60 px-2 py-0.5 rounded">
              ESC
            </span>
            <button
              onClick={handleClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/70 rounded-lg transition-colors cursor-pointer"
              title="Close (ESC)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab selection (Camera vs File Upload) */}
        {!capturedImage && (
          <div className="flex border-b border-slate-100 text-xs font-semibold text-slate-500">
            <button
              onClick={() => setActiveTab('camera')}
              className={`flex-1 py-2.5 flex items-center justify-center gap-1.5 transition-colors ${
                activeTab === 'camera'
                  ? 'text-sky-600 border-b-2 border-sky-600 font-bold bg-sky-50/40'
                  : 'hover:text-slate-800'
              }`}
            >
              <Camera className="w-4 h-4" />
              <span>Camera</span>
            </button>
            <button
              onClick={() => setActiveTab('upload')}
              className={`flex-1 py-2.5 flex items-center justify-center gap-1.5 transition-colors ${
                activeTab === 'upload'
                  ? 'text-sky-600 border-b-2 border-sky-600 font-bold bg-sky-50/40'
                  : 'hover:text-slate-800'
              }`}
            >
              <Upload className="w-4 h-4" />
              <span>Upload File</span>
            </button>
          </div>
        )}

        {/* Viewfinder / Preview Body */}
        <div className="p-4 bg-slate-950 flex flex-col items-center justify-center min-h-[300px] relative overflow-hidden">
          {capturedImage ? (
            /* Snapshot Review */
            <div className="relative w-full flex flex-col items-center">
              <img
                src={capturedImage}
                alt="Captured Preview"
                className="max-h-[340px] w-auto rounded-lg object-contain shadow-lg border border-white/10"
              />
              <span className="absolute top-2 right-2 bg-emerald-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-xs">
                Snapshot Ready
              </span>
            </div>
          ) : activeTab === 'camera' ? (
            /* Live Camera Stream */
            <div className="relative w-full aspect-4/3 flex items-center justify-center bg-black rounded-xl overflow-hidden">
              {cameraError ? (
                <div className="p-6 text-center text-slate-300 space-y-3">
                  <AlertCircle className="w-8 h-8 text-amber-400 mx-auto" />
                  <p className="text-xs">{cameraError}</p>
                  <button
                    onClick={() => setActiveTab('upload')}
                    className="px-3 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-semibold"
                  >
                    Upload Photo Instead
                  </button>
                </div>
              ) : (
                <>
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                  />
                  {/* Framing Overlay */}
                  <div className="absolute inset-8 border-2 border-dashed border-white/50 rounded-xl pointer-events-none flex items-center justify-center">
                    <span className="text-[11px] font-medium text-white/70 bg-black/40 px-2 py-0.5 rounded backdrop-blur-xs">
                      Frame Book Here
                    </span>
                  </div>

                  {/* Switch Camera Button */}
                  <button
                    onClick={toggleCameraFacing}
                    title="Switch camera"
                    className="absolute top-3 right-3 p-2 bg-black/60 hover:bg-black/80 text-white rounded-full backdrop-blur-xs transition-colors"
                  >
                    <SwitchCamera className="w-4 h-4" />
                  </button>
                </>
              )}
            </div>
          ) : (
            /* File Upload Area */
            <div
              onClick={() => fileInputRef.current?.click()}
              className="w-full aspect-4/3 flex flex-col items-center justify-center border-2 border-dashed border-slate-700 hover:border-sky-500 rounded-xl cursor-pointer p-6 text-center transition-colors group"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />
              <div className="p-4 bg-slate-800 group-hover:bg-sky-600/20 text-slate-300 group-hover:text-sky-400 rounded-2xl transition-colors mb-3">
                <Upload className="w-8 h-8" />
              </div>
              <p className="text-sm font-semibold text-slate-200">Click to select book photo</p>
              <p className="text-xs text-slate-400 mt-1">Supports JPG, PNG, WEBP (camera photos or scans)</p>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
          <button
            onClick={handleClose}
            className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors"
          >
            Cancel
          </button>

          <div className="flex items-center gap-2">
            {capturedImage ? (
              <>
                <button
                  onClick={handleRetake}
                  className="px-3.5 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 shadow-2xs"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Retake</span>
                </button>
                <button
                  onClick={handleConfirm}
                  className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>Use Photo</span>
                </button>
              </>
            ) : activeTab === 'camera' && !cameraError ? (
              <button
                onClick={handleSnap}
                className="px-5 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors flex items-center gap-2"
              >
                <Camera className="w-4 h-4" />
                <span>Snap Photo</span>
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalNode, document.body) : modalNode;
}
