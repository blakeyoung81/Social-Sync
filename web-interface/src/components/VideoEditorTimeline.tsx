'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Scissors, Image, Volume2, VolumeX, Zap, Music } from 'lucide-react';

interface TimelineMarker {
  id: string;
  time: number;
  type: 'silence' | 'broll' | 'highlight' | 'music' | 'subtitle';
  duration?: number;
  label?: string;
  color: string;
}

interface TimelineProps {
  duration: number;
  currentTime: number;
  onSeek: (time: number) => void;
  markers?: TimelineMarker[];
  silenceCuts?: Array<{ start: number; end: number }>;
  isProcessing?: boolean;
  activeStep?: string;
  showCuts?: boolean;
}

const VideoEditorTimeline: React.FC<TimelineProps> = ({
  duration,
  currentTime,
  onSeek,
  markers = [],
  silenceCuts = [],
  isProcessing = false,
  activeStep,
  showCuts = true
}) => {
  const timelineRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [scrollLeft, setScrollLeft] = useState(0);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleTimelineClick = (e: React.MouseEvent) => {
    if (!timelineRef.current) return;
    
    const rect = timelineRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = x / rect.width;
    const newTime = percentage * duration;
    onSeek(Math.max(0, Math.min(duration, newTime)));
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    handleTimelineClick(e);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      handleTimelineClick(e);
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const getMarkerIcon = (type: string) => {
    switch (type) {
      case 'silence': return <Scissors className="w-3 h-3" />;
      case 'broll': return <Image className="w-3 h-3" />;
      case 'highlight': return <Zap className="w-3 h-3" />;
      case 'music': return <Music className="w-3 h-3" />;
      default: return <div className="w-3 h-3 rounded-full bg-current" />;
    }
  };

  // Generate time markers every 10 seconds
  const timeMarkers = Array.from({ length: Math.floor(duration / 10) + 1 }, (_, i) => i * 10);

  return (
    <div className="relative bg-white border border-gray-200 rounded-lg p-4">
      {/* Timeline Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-4">
          <h3 className="text-sm font-medium text-gray-900">Timeline</h3>
          <div className="text-xs text-gray-500">
            {formatTime(currentTime)} / {formatTime(duration)}
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={() => setZoom(Math.max(0.5, zoom - 0.5))}
            className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded"
          >
            -
          </button>
          <span className="text-xs text-gray-600">{Math.round(zoom * 100)}%</span>
          <button
            onClick={() => setZoom(Math.min(3, zoom + 0.5))}
            className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded"
          >
            +
          </button>
        </div>
      </div>

      {/* Main Timeline */}
      <div className="relative">
        {/* Time Ruler */}
        <div className="h-6 bg-gray-50 border-b border-gray-200 relative overflow-hidden">
          {timeMarkers.map((time) => (
            <div
              key={time}
              className="absolute top-0 flex flex-col items-center"
              style={{ left: `${(time / duration) * 100}%` }}
            >
              <div className="w-px h-4 bg-gray-300" />
              <span className="text-xs text-gray-500 mt-1">{formatTime(time)}</span>
            </div>
          ))}
        </div>

        {/* Main Timeline Track */}
        <div
          ref={timelineRef}
          className="relative h-16 bg-gray-100 border border-gray-200 rounded cursor-pointer select-none"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          {/* Waveform Background (placeholder) */}
          <div className="absolute inset-0 opacity-20">
            <svg width="100%" height="100%" className="h-full">
              {/* Simplified waveform visualization */}
              {Array.from({ length: 100 }, (_, i) => (
                <rect
                  key={i}
                  x={`${i}%`}
                  y="30%"
                  width="0.8%"
                  height={`${20 + Math.random() * 40}%`}
                  fill="#3b82f6"
                  opacity="0.3"
                />
              ))}
            </svg>
          </div>

          {/* Silence Cuts Visualization */}
          {showCuts && silenceCuts.map((cut, index) => (
            <div
              key={`silence-${index}`}
              className="absolute top-0 h-full bg-red-200 border-l-2 border-r-2 border-red-400"
              style={{
                left: `${(cut.start / duration) * 100}%`,
                width: `${((cut.end - cut.start) / duration) * 100}%`
              }}
              title={`Silence: ${formatTime(cut.start)} - ${formatTime(cut.end)}`}
            >
              <div className="absolute top-1 left-1 text-red-600">
                <VolumeX className="w-3 h-3" />
              </div>
            </div>
          ))}

          {/* Processing Markers */}
          {markers.map((marker) => (
            <div
              key={marker.id}
              className={`absolute top-0 w-1 h-full ${marker.color} opacity-80`}
              style={{ left: `${(marker.time / duration) * 100}%` }}
              title={marker.label || `${marker.type} at ${formatTime(marker.time)}`}
            >
              <div className="absolute -top-1 left-0 transform -translate-x-1/2 text-white">
                {getMarkerIcon(marker.type)}
              </div>
            </div>
          ))}

          {/* Current Time Progress */}
          <div
            className="absolute top-0 left-0 h-full bg-blue-500 opacity-30 pointer-events-none"
            style={{ width: `${(currentTime / duration) * 100}%` }}
          />

          {/* Playhead */}
          <div
            className="absolute top-0 w-0.5 h-full bg-blue-500 pointer-events-none z-10"
            style={{ left: `${(currentTime / duration) * 100}%` }}
          >
            <div className="absolute -top-2 left-0 transform -translate-x-1/2 w-3 h-3 bg-blue-500 rounded-full" />
          </div>

          {/* Processing Overlay */}
          {isProcessing && (
            <div className="absolute inset-0 bg-blue-500 bg-opacity-20 flex items-center justify-center">
              <div className="text-blue-700 text-xs font-medium">
                Processing {activeStep}...
              </div>
            </div>
          )}
        </div>

        {/* Track Labels */}
        <div className="mt-2 space-y-1">
          <div className="flex items-center gap-2 text-xs text-gray-600">
            <Volume2 className="w-3 h-3" />
            <span>Audio Track</span>
          </div>
          {showCuts && silenceCuts.length > 0 && (
            <div className="flex items-center gap-2 text-xs text-gray-600">
              <Scissors className="w-3 h-3" />
              <span>Silence Cuts ({silenceCuts.length})</span>
            </div>
          )}
          {markers.length > 0 && (
            <div className="flex items-center gap-2 text-xs text-gray-600">
              <Zap className="w-3 h-3" />
              <span>AI Markers ({markers.length})</span>
            </div>
          )}
        </div>
      </div>

      {/* Timeline Stats */}
      <div className="mt-4 grid grid-cols-3 gap-4 text-xs">
        <div className="text-center">
          <div className="text-gray-500">Original Duration</div>
          <div className="font-medium">{formatTime(duration)}</div>
        </div>
        <div className="text-center">
          <div className="text-gray-500">Cuts Detected</div>
          <div className="font-medium">{silenceCuts.length}</div>
        </div>
        <div className="text-center">
          <div className="text-gray-500">Time Saved</div>
          <div className="font-medium text-green-600">
            {formatTime(silenceCuts.reduce((acc, cut) => acc + (cut.end - cut.start), 0))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default VideoEditorTimeline; 