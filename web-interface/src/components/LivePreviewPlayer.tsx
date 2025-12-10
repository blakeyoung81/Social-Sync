'use client';

import { useEffect, useRef } from 'react';
import { ProcessingOptions } from '@/types';
import { useLivePreview } from '@/hooks/useLivePreview';
import { Loader2, RefreshCw, AlertCircle, Download, CheckCircle } from 'lucide-react';

interface LivePreviewPlayerProps {
  videoPath: string | null;
  options: ProcessingOptions;
  autoStart?: boolean;
}

export function LivePreviewPlayer({ 
  videoPath, 
  options, 
  autoStart = true 
}: LivePreviewPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  
  const {
    isProcessing,
    previewUrl,
    currentStep,
    progress,
    error,
    startPreview,
    cancelPreview,
  } = useLivePreview(videoPath, options, autoStart);

  // Update video source when preview is ready
  useEffect(() => {
    if (previewUrl && videoRef.current) {
      videoRef.current.src = previewUrl;
      videoRef.current.load();
    }
  }, [previewUrl]);

  if (!videoPath) {
    return (
      <div className="bg-gray-100 rounded-lg p-8 text-center">
        <p className="text-gray-500">No video selected for preview</p>
      </div>
    );
  }

  return (
    <div className="relative bg-black rounded-lg overflow-hidden">
      {/* Video Player */}
      <video
        ref={videoRef}
        controls
        className="w-full h-auto"
        style={{ maxHeight: '500px' }}
      >
        Your browser does not support the video tag.
      </video>

      {/* Processing Overlay */}
      {isProcessing && (
        <div className="absolute inset-0 bg-black bg-opacity-75 flex flex-col items-center justify-center text-white">
          <Loader2 className="w-12 h-12 animate-spin mb-4" />
          <p className="text-lg font-medium mb-2">{currentStep}</p>
          <div className="w-64 bg-gray-700 rounded-full h-2 mb-2">
            <div
              className="bg-blue-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-sm text-gray-300">{progress}%</p>
          <button
            onClick={cancelPreview}
            className="mt-4 px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg text-sm"
          >
            Cancel Preview
          </button>
        </div>
      )}

      {/* Error Overlay */}
      {error && !isProcessing && (
        <div className="absolute inset-0 bg-black bg-opacity-75 flex flex-col items-center justify-center text-white p-4">
          <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
          <p className="text-lg font-medium mb-2">Preview Error</p>
          <p className="text-sm text-gray-300 mb-4 text-center max-w-md">{error}</p>
          <button
            onClick={startPreview}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Retry Preview
          </button>
        </div>
      )}

      {/* Live Preview Badge */}
      <div className="absolute top-4 left-4 bg-gradient-to-r from-purple-600 to-blue-600 text-white px-3 py-1 rounded-full text-xs font-medium flex items-center gap-2">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
        </span>
        Live Preview
      </div>

      {/* Download Button (when preview is ready) */}
      {previewUrl && !isProcessing && (
        <div className="absolute top-4 right-4 flex gap-2">
          <a
            href={previewUrl}
            download="preview.mp4"
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 shadow-lg transition-colors"
          >
            <Download className="w-4 h-4" />
            Download Preview
          </a>
          <div className="bg-green-600 text-white px-3 py-2 rounded-lg flex items-center gap-2">
            <CheckCircle className="w-4 h-4" />
            <span className="text-sm">Ready</span>
          </div>
        </div>
      )}

      {/* Settings Changed Notice */}
      {isProcessing && (
        <div className="absolute top-4 right-4 bg-yellow-500 text-black px-3 py-1 rounded-lg text-xs font-medium">
          Updating preview...
        </div>
      )}
    </div>
  );
}
