import React, { useRef, useCallback, useState, useEffect, useMemo } from 'react';
import { VideoClip } from '@/types';
import { Play, Pause, ZoomIn, ZoomOut, SkipBack, SkipForward } from 'lucide-react';

interface VideoClipTimelineProps {
  clips: VideoClip[];
  duration: number;
  currentTime: number;
  onTimeUpdate: (time: number) => void;
  onClipSelect: (clipId: string) => void;
  selectedClip: string | null;
  zoomLevel: number;
  onZoomChange: (zoom: number) => void;
  isPlaying: boolean;
  onPlayPause: () => void;
  showCuts: boolean;
  onShowCutsChange: (show: boolean) => void;
  onSeek: (time: number) => void;
  thumbnailMap?: Record<string, string>;
  waveformData?: number[];
  textSegments?: Array<{
    id: string;
    start: number;
    end: number;
    duration: number;
    words: Array<{
      id: string;
      text: string;
      start: number;
      end: number;
      clipId?: string;
      isCut?: boolean;
    }>;
    isHighlighted?: boolean;
  }>;
  onSegmentClick?: (segmentId: string) => void;
  captions?: Array<{
    id: string;
    text: string;
    start: number;
    end: number;
    style: string;
  }>;
}

export const VideoClipTimeline: React.FC<VideoClipTimelineProps> = ({
  clips,
  duration,
  currentTime,
  onTimeUpdate,
  onClipSelect,
  selectedClip,
  zoomLevel,
  onZoomChange,
  isPlaying,
  onPlayPause,
  showCuts,
  onShowCutsChange,
  onSeek,
  thumbnailMap,
  waveformData,
  textSegments = [],
  onSegmentClick,
  captions = [],
}) => {
  const timelineRef = useRef<HTMLDivElement>(null);
  const timelineContainerRef = useRef<HTMLDivElement>(null);

  const timelinePixelsPerSecond = 50 * zoomLevel;

  const displayedSegments = useMemo(() => {
    if (showCuts) {
      return textSegments;
    }
    // Filter out segments that contain only cut/silent words
    return textSegments.filter(segment => 
      segment.words.some(word => !word.isCut)
    );
  }, [textSegments, showCuts]);

  // Calculate collapsed timeline duration (non-cut segments) when showCuts is false
  const effectiveDuration = useMemo(() => {
    if (showCuts) return duration;
    return displayedSegments.reduce((acc, seg) => acc + seg.duration, 0);
  }, [showCuts, displayedSegments, duration]);

  // Timeline width depends on whether cuts are shown
  const timelineWidth = (showCuts ? duration : effectiveDuration) * timelinePixelsPerSecond;

  // Helper to convert video time -> collapsed timeline position
  const getCollapsedPosition = useCallback((time: number) => {
    if (showCuts) return time * timelinePixelsPerSecond;
    let accumulated = 0;
    for (const seg of displayedSegments) {
      if (time < seg.start) break;
      if (time >= seg.end) {
        accumulated += seg.duration;
      } else {
        accumulated += time - seg.start;
        break;
      }
    }
    return accumulated * timelinePixelsPerSecond;
  }, [showCuts, displayedSegments, timelinePixelsPerSecond]);

  // Helper to convert collapsed x position -> real video time
  const collapsedXToTime = useCallback((x: number) => {
    if (showCuts) return x / timelinePixelsPerSecond;
    let accumulated = 0;
    for (const seg of displayedSegments) {
      const segWidth = seg.duration * timelinePixelsPerSecond;
      if (x < accumulated + segWidth) {
        const offset = x - accumulated;
        const t = seg.start + offset / timelinePixelsPerSecond;
        return Math.max(0, Math.min(duration, t));
      }
      accumulated += segWidth;
    }
    return duration;
  }, [showCuts, displayedSegments, timelinePixelsPerSecond, duration]);

  // Auto-scroll logic remains same but uses getCollapsedPosition
  useEffect(() => {
    if (!timelineContainerRef.current || !isPlaying) return;
    const container = timelineContainerRef.current;
    const containerWidth = container.offsetWidth;
    const playheadPosition = getCollapsedPosition(currentTime);
    const currentScrollLeft = container.scrollLeft;
    const visibleAreaStart = currentScrollLeft;
    const visibleAreaEnd = currentScrollLeft + containerWidth;
    const margin = containerWidth * 0.1;
    if (playheadPosition < visibleAreaStart + margin) {
      container.scrollTo({ left: Math.max(0, playheadPosition - containerWidth * 0.3), behavior: 'smooth' });
    } else if (playheadPosition > visibleAreaEnd - margin) {
      container.scrollTo({ left: playheadPosition - containerWidth * 0.7, behavior: 'smooth' });
    }
  }, [currentTime, getCollapsedPosition, isPlaying]);

  const handleTimelineClick = useCallback((e: React.MouseEvent) => {
    if (!timelineRef.current) return;
    const rect = timelineRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const time = collapsedXToTime(x);
    onSeek(time);
  }, [collapsedXToTime, onSeek]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Playhead position
  const playheadX = getCollapsedPosition(currentTime);

  return (
    <div className="bg-gray-900 border-t border-gray-700 h-full flex flex-col">
      {/* Controls */}
      <div className="flex items-center justify-between p-2 bg-gray-800 border-b border-gray-700 flex-shrink-0">
        <div className="flex items-center space-x-4">
          <button onClick={onPlayPause} className="p-2 rounded-full bg-blue-600 hover:bg-blue-700 text-white">
            {isPlaying ? <Pause size={16} /> : <Play size={16} />}
          </button>
          <div className="flex items-center space-x-2">
            <label className="text-sm text-gray-300">Speed:</label>
            <select
              className="bg-gray-700 text-white rounded px-2 py-1 text-sm"
              defaultValue="1"
              onChange={(e) => { /* Add speed control logic here */ }}
            >
              <option value="0.5">0.5x</option>
              <option value="1">1x</option>
              <option value="1.5">1.5x</option>
              <option value="2">2x</option>
            </select>
          </div>
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="showCuts"
              checked={showCuts}
              onChange={(e) => onShowCutsChange(e.target.checked)}
              className="rounded"
            />
            <label htmlFor="showCuts" className="text-sm text-gray-300">Show cuts</label>
          </div>
        </div>
        <div className="flex items-center space-x-2">
            <button onClick={() => onSeek(Math.max(0, currentTime - 5))} className="p-1 rounded bg-gray-700 hover:bg-gray-600 text-white">
                <SkipBack size={16} />
            </button>
            <button onClick={() => onSeek(Math.min(duration, currentTime + 5))} className="p-1 rounded bg-gray-700 hover:bg-gray-600 text-white">
                <SkipForward size={16} />
            </button>
        </div>
        <div className="flex items-center space-x-2">
          <button onClick={() => onZoomChange(Math.max(0.1, zoomLevel / 1.5))} className="p-1 rounded bg-gray-700 hover:bg-gray-600 text-white">
            <ZoomOut size={16} />
          </button>
          <input
            type="range"
            min="1"
            max="200"
            value={zoomLevel * 20}
            onChange={(e) => onZoomChange(parseFloat(e.target.value) / 20)}
            className="w-24"
          />
          <button onClick={() => onZoomChange(Math.min(10, zoomLevel * 1.5))} className="p-1 rounded bg-gray-700 hover:bg-gray-600 text-white">
            <ZoomIn size={16} />
          </button>
        </div>
      </div>

      {/* Main Timeline */}
      <div ref={timelineContainerRef} className="flex-1 relative overflow-x-auto overflow-y-hidden">
        <div
          ref={timelineRef}
          className="relative h-full cursor-pointer"
          style={{ width: `${timelineWidth}px` }}
          onClick={handleTimelineClick}
        >
          {/* Time Ruler */}
          <div className="sticky top-0 left-0 right-0 h-8 bg-gray-800 border-b border-gray-600 z-20">
            {Array.from({ length: Math.floor(duration) + 1 }, (_, i) => {
              const position = i * timelinePixelsPerSecond;
              const isMainMark = i % 5 === 0;
              return (
                <div key={i} className="absolute top-0 h-full">
                  <div className={`absolute top-0 ${isMainMark ? 'h-4' : 'h-2'} w-px bg-gray-400`} style={{ left: `${position}px` }} />
                  {isMainMark && (
                    <div className="absolute top-4 left-0 -translate-x-1/2 text-xs text-gray-300" style={{ left: `${position}px` }}>{formatTime(i)}</div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Text Segments - UNIFIED positioning with LayeredTimeline */}
          <div className="relative h-full">
            {displayedSegments.map((segment, index) => {
              // Always use actual video time positioning to match LayeredTimeline
              const segmentLeft = segment.start * timelinePixelsPerSecond;
              const segmentWidth = segment.duration * timelinePixelsPerSecond;

              const isSelected = selectedClip === segment.id;
              const isSkipped = segment.words.every(word => word.isCut);
              const hasAnyCuts = segment.words.some(word => word.isCut);
              
              if (segmentWidth <= 0) return null;

              // Get thumbnail from the first word's clip
              const firstWord = segment.words.find(w => w.clipId);
              const thumbnailUrl = thumbnailMap && firstWord?.clipId ? thumbnailMap[firstWord.clipId] : null;

              return (
                <div
                  key={segment.id}
                  className={`absolute top-8 h-20 rounded-lg cursor-pointer transition-all border-2 ${
                    isSelected ? 'border-blue-500' : 'border-transparent'
                  } ${isSkipped ? 'opacity-60' : ''} ${hasAnyCuts ? 'border-yellow-500/50' : ''}`}
                  style={{ left: `${segmentLeft}px`, width: `${segmentWidth}px` }}
                  onClick={(e) => {
                    e.stopPropagation();
                    console.log('🎯 [TIMELINE-CLICK] Segment:', index + 1, 'ID:', segment.id, 'Start:', segment.start.toFixed(2));
                    if (onSegmentClick) {
                      onSegmentClick(segment.id);
                    } else {
                      onClipSelect(segment.id);
                      onSeek(segment.start);
                    }
                  }}
                >
                  <div className={`w-full h-full rounded-md overflow-hidden ${
                    isSkipped ? 'bg-gray-800' : 
                    hasAnyCuts ? 'bg-yellow-900/30' : 
                    'bg-gray-700'
                  }`}>
                    <div className="h-12 w-full bg-gray-600 relative">
                        {thumbnailUrl ? (
                          <img src={thumbnailUrl} alt={`Thumbnail for segment ${segment.id}`} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full bg-gray-600" />
                        )}
                        {/* Segment number overlay */}
                        <div className="absolute top-1 left-1 bg-black/60 text-white text-xs px-1 rounded">
                          {index + 1}
                        </div>
                    </div>
                    <div className="h-8 w-full bg-gray-800 flex items-center">
                        {waveformData && waveformData.length > 0 && (
                          <Waveform
                            data={waveformData}
                            clipStart={segment.start}
                            clipDuration={segment.duration}
                            totalDuration={duration}
                            width={segmentWidth}
                            height={32}
                            color="#4a5568"
                            progressColor="#6366f1"
                          />
                        )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Captions Track */}
          <div className="absolute top-32 left-0 right-0 h-8 bg-gray-900 border-t border-gray-600">
            <div className="absolute left-2 top-1 text-xs text-gray-400">Captions</div>
            {captions.map((caption) => {
              const captionLeft = caption.start * timelinePixelsPerSecond;
              const captionWidth = (caption.end - caption.start) * timelinePixelsPerSecond;
              
              if (captionWidth <= 0) return null;

              // Different colors for different caption styles
              const getStyleColor = (style: string) => {
                switch (style) {
                  case 'typewriter': return 'bg-blue-600 border-blue-500';
                  case 'bounce': return 'bg-pink-600 border-pink-500';
                  case 'glow': return 'bg-green-600 border-green-500';
                  case 'karaoke': return 'bg-yellow-600 border-yellow-500';
                  case 'pop': return 'bg-purple-600 border-purple-500';
                  case 'slide': return 'bg-indigo-600 border-indigo-500';
                  case 'scale': return 'bg-red-600 border-red-500';
                  case 'rainbow': return 'bg-gradient-to-r from-pink-500 to-violet-500 border-white';
                  default: return 'bg-blue-600 border-blue-500';
                }
              };

              return (
                <div
                  key={caption.id}
                  className={`absolute top-1 h-6 rounded cursor-pointer border flex items-center justify-center ${getStyleColor(caption.style)}`}
                  style={{ left: `${captionLeft}px`, width: `${captionWidth}px` }}
                  title={`${caption.style}: ${caption.text}`}
                >
                  <span className="text-white text-xs truncate px-1">
                    {caption.text}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Playhead - UNIFIED with LayeredTimeline */}
          <div
            className="absolute top-0 w-0.5 bg-red-500 z-30 pointer-events-none"
            style={{ 
              left: `${playheadX}px`,
              height: '168px' // Extend through captions track (128px + 40px for captions)
            }}
          >
            <div className="absolute top-0 w-3 h-3 bg-red-500 rounded-full -translate-x-1/2" />
            {/* Time display above playhead */}
            <div className="absolute -top-6 -left-8 bg-red-500 text-white text-xs px-2 py-0.5 rounded whitespace-nowrap">
              {formatTime(currentTime)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}; 

interface WaveformProps {
  data: number[];
  clipStart: number;
  clipDuration: number;
  totalDuration: number;
  width: number;
  height: number;
  color: string;
  progressColor: string;
}

const Waveform: React.FC<WaveformProps> = ({ data, clipStart, clipDuration, totalDuration, width, height, color, progressColor }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (canvasRef.current && width > 0) {
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');
      if (context) {
        canvas.width = width;
        canvas.height = height;

        const startIndex = Math.floor((clipStart / totalDuration) * data.length);
        const endIndex = Math.floor(((clipStart + clipDuration) / totalDuration) * data.length);
        const clipData = data.slice(startIndex, endIndex);

        const barWidth = width / clipData.length;
        context.clearRect(0, 0, width, height);

        clipData.forEach((d, i) => {
          const barHeight = d * height;
          const y = (height - barHeight) / 2;
          context.fillStyle = color;
          context.fillRect(i * barWidth, y, barWidth, barHeight);
        });
      }
    }
  }, [data, clipStart, clipDuration, totalDuration, width, height, color]);

  return <canvas ref={canvasRef} />;
}; 