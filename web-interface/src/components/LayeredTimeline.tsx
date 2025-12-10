import React, { useRef, useCallback, useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Play, 
  Pause, 
  ZoomIn, 
  ZoomOut, 
  Plus, 
  Eye, 
  EyeOff, 
  Lock, 
  Unlock,
  Move,
  Trash2,
  Copy,
  Scissors,
  Volume2,
  VolumeX,
  Video,
  Image,
  Type,
  Layers,
  Sparkles,
  Download
} from 'lucide-react';
import { 
  TimelineTrack, 
  TimelineItem, 
  TrackType, 
  TimelineState, 
  TrackOperations,
  VideoTrackItem,
  AudioTrackItem,
  CaptionTrackItem,
  BRollTrackItem
} from '@/types/timeline';

interface LayeredTimelineProps {
  tracks: TimelineTrack[];
  duration: number;
  currentTime: number;
  onTimeUpdate: (time: number) => void;
  zoomLevel: number;
  onZoomChange: (zoom: number) => void;
  isPlaying: boolean;
  onPlayPause: () => void;
  onSeek: (time: number) => void;
  operations: TrackOperations;
  thumbnailMap?: Record<string, string>;
  waveformData?: number[];
  onExport?: () => void;
}

const TRACK_COLORS = {
  [TrackType.VIDEO]: '#3b82f6',      // Blue
  [TrackType.AUDIO]: '#10b981',      // Green  
  [TrackType.CAPTIONS]: '#f59e0b',   // Amber
  [TrackType.BROLL]: '#8b5cf6',      // Purple
  [TrackType.OVERLAY]: '#ef4444',    // Red
  [TrackType.TRANSITION]: '#6b7280', // Gray
  [TrackType.EFFECT]: '#ec4899'      // Pink
};

const TRACK_ICONS = {
  [TrackType.VIDEO]: Video,
  [TrackType.AUDIO]: Volume2,
  [TrackType.CAPTIONS]: Type,
  [TrackType.BROLL]: Image,
  [TrackType.OVERLAY]: Layers,
  [TrackType.TRANSITION]: Move,
  [TrackType.EFFECT]: Sparkles
};

const TRACK_HEIGHTS = {
  [TrackType.VIDEO]: 50,
  [TrackType.AUDIO]: 40,
  [TrackType.CAPTIONS]: 30,
  [TrackType.BROLL]: 40,
  [TrackType.OVERLAY]: 30,
  [TrackType.TRANSITION]: 25,
  [TrackType.EFFECT]: 30
};

export const LayeredTimeline: React.FC<LayeredTimelineProps> = ({
  tracks,
  duration,
  currentTime,
  onTimeUpdate,
  zoomLevel,
  onZoomChange,
  isPlaying,
  onPlayPause,
  onSeek,
  operations,
  thumbnailMap = {},
  waveformData = [],
  onExport
}) => {
  const timelineRef = useRef<HTMLDivElement>(null);
  const timelineContainerRef = useRef<HTMLDivElement>(null);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [draggedItem, setDraggedItem] = useState<string | null>(null);
  const [resizingItem, setResizingItem] = useState<string | null>(null);
  const [showAddTrackMenu, setShowAddTrackMenu] = useState(false); // deprecated but kept to avoid refactor

  // Calculate timeline dimensions - UNIFIED with VideoClipTimeline
  const pixelsPerSecond = useMemo(() => 50 * zoomLevel, [zoomLevel]);
  const timelineWidth = duration * pixelsPerSecond;
  const playheadPosition = currentTime * pixelsPerSecond;

  // Auto-scroll timeline when playhead goes out of view
  useEffect(() => {
    if (!timelineContainerRef.current || !isPlaying) return;
    
    const container = timelineContainerRef.current;
    const containerWidth = container.offsetWidth;
    const currentScrollLeft = container.scrollLeft;
    const visibleAreaStart = currentScrollLeft;
    const visibleAreaEnd = currentScrollLeft + containerWidth;
    
    // Only scroll if playhead is outside the visible area
    const margin = containerWidth * 0.1; // 10% margin from edges
    
    if (playheadPosition < visibleAreaStart + margin) {
      // Playhead is too far left, scroll left
      const targetScrollLeft = Math.max(0, playheadPosition - containerWidth * 0.3);
      container.scrollTo({
        left: targetScrollLeft,
        behavior: 'smooth'
      });
    } else if (playheadPosition > visibleAreaEnd - margin) {
      // Playhead is too far right, scroll right
      const targetScrollLeft = playheadPosition - containerWidth * 0.7;
      container.scrollTo({
        left: targetScrollLeft,
        behavior: 'smooth'
      });
    }
  }, [currentTime, pixelsPerSecond, isPlaying, playheadPosition]);

  // Handle timeline click for seeking
  const handleTimelineClick = useCallback((e: React.MouseEvent) => {
    if (!timelineRef.current) return;
    
    const rect = timelineRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const time = x / pixelsPerSecond;
    
    if (time >= 0 && time <= duration) {
      onSeek(time);
    }
  }, [pixelsPerSecond, duration, onSeek]);

  // Handle item selection
  const handleItemSelect = useCallback((itemId: string, isMultiSelect: boolean) => {
    setSelectedItems(prev => {
      if (isMultiSelect) {
        return prev.includes(itemId) 
          ? prev.filter(id => id !== itemId)
          : [...prev, itemId];
      } else {
        return [itemId];
      }
    });
  }, []);

  // Format time for display
  const formatTime = useCallback((time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    const milliseconds = Math.floor((time % 1) * 100);
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(2, '0')}`;
  }, []);

  // Generate time markers
  const timeMarkers = useMemo(() => {
    const markers = [];
    const markerInterval = Math.max(1, Math.floor(10 / zoomLevel));
    
    for (let time = 0; time <= duration; time += markerInterval) {
      markers.push({
        time,
        position: time * pixelsPerSecond,
        label: formatTime(time)
      });
    }
    
    return markers;
  }, [duration, pixelsPerSecond, zoomLevel, formatTime]);

  return (
    <div className="flex flex-col h-full bg-gray-900 text-white">
      {/* Compact Timeline Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-gray-800 border-b border-gray-700">
        {/* Left placeholder - export handled in parent toolbar */}
        <div />
        
        <div className="flex items-center space-x-2">
          <span className="text-xs text-gray-400">Tracks: {tracks.length}</span>
        </div>
      </div>

      {/* Main Timeline Area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Track Controls Sidebar */}
        <div className="w-48 bg-gray-800 border-r border-gray-700 flex flex-col">
          {/* Add Track Button disabled for now */}
          <div className="p-2 border-b border-gray-700 text-center text-gray-500 text-[10px] select-none">
            Manual track creation coming soon
          </div>
          {/* Track Controls List */}
          <div className="flex-1 overflow-y-auto">
            {tracks.map(track => (
              <TrackControlPanel
                key={track.id}
                track={track}
                icon={TRACK_ICONS[track.type]}
                onToggleVisibility={() => operations.toggleTrackVisibility(track.id)}
                onToggleLock={() => operations.toggleTrackLock(track.id)}
                onRemove={() => operations.removeTrack(track.id)}
                onResize={(height) => operations.resizeTrack(track.id, height)}
              />
            ))}
          </div>
        </div>

        {/* Timeline Content */}
        <div ref={timelineContainerRef} className="flex-1 overflow-auto">
          <div className="relative" style={{ minWidth: timelineWidth + 100 }}>
            {/* Time Ruler */}
            <div className="h-8 bg-gray-750 border-b border-gray-700 relative">
              {timeMarkers.map((marker) => (
                <div
                  key={marker.time}
                  className="absolute top-0 h-full flex flex-col items-center"
                  style={{ left: marker.position }}
                >
                  <div className="w-px h-full bg-gray-600" />
                  <span className="text-xs text-gray-400 mt-1">
                    {marker.label}
                  </span>
                </div>
              ))}
            </div>

            {/* Tracks */}
            <div 
              ref={timelineRef}
              className="relative cursor-pointer"
              onClick={handleTimelineClick}
            >
              {tracks.map((track) => (
                <TrackRenderer
                  key={track.id}
                  track={track}
                  pixelsPerSecond={pixelsPerSecond}
                  selectedItems={selectedItems}
                  onItemSelect={handleItemSelect}
                  thumbnailMap={thumbnailMap}
                  waveformData={track.type === TrackType.AUDIO ? waveformData : undefined}
                  style={{ width: timelineWidth, marginBottom: 2 }}
                />
              ))}

              {/* Playhead - UNIFIED with VideoClipTimeline */}
              <div
                className="absolute top-0 bottom-0 w-0.5 bg-red-500 pointer-events-none z-50"
                style={{ left: playheadPosition }}
              >
                <div className="absolute -top-2 -left-2 w-4 h-4 bg-red-500 rounded-full" />
                {/* Time display above playhead */}
                <div className="absolute -top-8 -left-8 bg-red-500 text-white text-xs px-2 py-0.5 rounded whitespace-nowrap">
                  {formatTime(currentTime)}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {/* Add track popover disabled */}
        {false && showAddTrackMenu && (
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            className="absolute top-full left-0 right-0 mt-1 bg-gray-700 rounded-md shadow-lg border border-gray-600 z-50"
          >
            {Object.values(TrackType).map((trackType) => {
              const Icon = TRACK_ICONS[trackType];
              return (
                <button
                  key={trackType}
                  onClick={() => {
                    operations.addTrack(trackType);
                    setShowAddTrackMenu(false);
                  }}
                  className="w-full flex items-center space-x-2 p-2 hover:bg-gray-600 transition-colors text-xs first:rounded-t-md last:rounded-b-md"
                >
                  <Icon size={14} style={{ color: TRACK_COLORS[trackType] }} />
                  <span className="capitalize">{trackType}</span>
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// Track Control Panel Component
interface TrackControlPanelProps {
  track: TimelineTrack;
  icon: React.ComponentType<{ size?: number; style?: React.CSSProperties }>;
  onToggleVisibility: () => void;
  onToggleLock: () => void;
  onRemove: () => void;
  onResize: (height: number) => void;
}

const TrackControlPanel: React.FC<TrackControlPanelProps> = ({ track, icon: Icon, onToggleVisibility, onToggleLock, onRemove }) => {
  return (
    <div className="flex items-center p-1.5 border-b border-gray-700" style={{ backgroundColor: `${track.color}1A` }}>
      <div className="flex items-center gap-2 flex-1">
        <Icon size={14} style={{ color: track.color }} />
        <span className="text-xs font-medium truncate">{track.name}</span>
      </div>
      <div className="flex items-center gap-1">
        <button onClick={onToggleVisibility} className="p-1 rounded hover:bg-gray-600">
          {track.isVisible ? <Eye size={12} /> : <EyeOff size={12} className="text-gray-500" />}
        </button>
        <button onClick={onToggleLock} className="p-1 rounded hover:bg-gray-600">
          {track.isLocked ? <Lock size={12} /> : <Unlock size={12} className="text-gray-500" />}
        </button>
        <button onClick={onRemove} className="p-1 rounded hover:bg-red-500">
          <Trash2 size={12} />
        </button>
      </div>
    </div>
  );
};

// Track Renderer Component
interface TrackRendererProps {
  track: TimelineTrack;
  pixelsPerSecond: number;
  selectedItems: string[];
  onItemSelect: (itemId: string, isMultiSelect: boolean) => void;
  thumbnailMap: Record<string, string>;
  waveformData?: number[];
  style?: React.CSSProperties;
}

const TrackRenderer: React.FC<TrackRendererProps> = ({
  track,
  pixelsPerSecond,
  selectedItems,
  onItemSelect,
  thumbnailMap,
  waveformData,
  style
}) => {
  if (!track.isVisible) return null;

  return (
    <div
      className="relative border-b border-gray-700 bg-gray-800"
      style={{ 
        height: track.height,
        ...style
      }}
    >
      {/* Track Background */}
      <div className="absolute inset-0 opacity-20" style={{ backgroundColor: track.color }} />
      
      {/* Track Items */}
      {track.items.map((item) => (
        <TimelineItemRenderer
          key={item.id}
          item={item}
          track={track}
          pixelsPerSecond={pixelsPerSecond}
          isSelected={selectedItems.includes(item.id)}
          onSelect={(isMultiSelect) => onItemSelect(item.id, isMultiSelect)}
          thumbnailMap={thumbnailMap}
          waveformData={waveformData}
        />
      ))}
    </div>
  );
};

// Timeline Item Renderer Component
interface TimelineItemRendererProps {
  item: TimelineItem;
  track: TimelineTrack;
  pixelsPerSecond: number;
  isSelected: boolean;
  onSelect: (isMultiSelect: boolean) => void;
  thumbnailMap: Record<string, string>;
  waveformData?: number[];
}

const TimelineItemRenderer: React.FC<TimelineItemRendererProps> = ({
  item,
  track,
  pixelsPerSecond,
  isSelected,
  onSelect,
  thumbnailMap,
  waveformData
}) => {
  const itemWidth = item.duration * pixelsPerSecond;
  const itemLeft = item.start * pixelsPerSecond;

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelect(e.metaKey || e.ctrlKey);
  };

  const renderItemContent = () => {
    switch (track.type) {
      case TrackType.VIDEO:
        const videoItem = item as VideoTrackItem;
        return (
          <div className="flex items-center h-full p-2">
            {videoItem.data.thumbnailPath && (
              <img 
                src={videoItem.data.thumbnailPath} 
                alt="Thumbnail"
                className="w-8 h-8 object-cover rounded mr-2"
              />
            )}
            <span className="text-xs truncate">Video Clip</span>
          </div>
        );

      case TrackType.AUDIO:
        return (
          <div className="flex items-center h-full p-2">
            {/* Simple waveform visualization */}
            <div className="flex items-center space-x-1 mr-2">
              {Array.from({ length: Math.min(20, Math.floor(itemWidth / 4)) }).map((_, i) => (
                <div
                  key={i}
                  className="w-0.5 bg-green-400 rounded"
                  style={{ 
                    height: `${Math.random() * 60 + 20}%`,
                    opacity: 0.7
                  }}
                />
              ))}
            </div>
            <span className="text-xs truncate">Audio</span>
          </div>
        );

      case TrackType.CAPTIONS:
        const captionItem = item as CaptionTrackItem;
        return (
          <div className="flex items-center h-full p-2">
            <Type size={12} className="mr-2 text-amber-400" />
            <span className="text-xs truncate">{captionItem.data.text}</span>
          </div>
        );

      case TrackType.BROLL:
        const brollItem = item as BRollTrackItem;
        return (
          <div className="flex items-center h-full p-2">
            <Image size={12} className="mr-2 text-purple-400" />
            <span className="text-xs truncate">
              {brollItem.data.mediaType === 'video' ? 'B-Roll Video' : 'B-Roll Image'}
            </span>
          </div>
        );

      default:
        return (
          <div className="flex items-center h-full p-2">
            <span className="text-xs truncate capitalize">{track.type}</span>
          </div>
        );
    }
  };

  return (
    <motion.div
      className={`absolute top-1 bottom-1 rounded border-2 cursor-pointer transition-all ${
        isSelected 
          ? 'border-white shadow-lg' 
          : 'border-transparent hover:border-gray-400'
      } ${item.isLocked ? 'opacity-50 cursor-not-allowed' : ''}`}
      style={{
        left: itemLeft,
        width: Math.max(itemWidth, 20),
        backgroundColor: track.color,
        opacity: item.opacity
      }}
      onClick={handleClick}
      whileHover={{ scale: isSelected ? 1 : 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      {renderItemContent()}
      
      {/* Resize handles */}
      {isSelected && !item.isLocked && (
        <>
          <div className="absolute left-0 top-0 bottom-0 w-2 cursor-w-resize bg-white opacity-50 hover:opacity-100" />
          <div className="absolute right-0 top-0 bottom-0 w-2 cursor-e-resize bg-white opacity-50 hover:opacity-100" />
        </>
      )}
    </motion.div>
  );
}; 