import { useState, useCallback, useMemo } from 'react';
import { 
  TimelineTrack, 
  TimelineItem, 
  TrackType, 
  TimelineState,
  TrackOperations,
  VideoTrackItem,
  AudioTrackItem,
  CaptionTrackItem,
  BRollTrackItem,
  CaptionStyle
} from '@/types/timeline';

const TRACK_COLORS_MAP = {
  [TrackType.VIDEO]: '#3b82f6',      // Blue
  [TrackType.AUDIO]: '#10b981',      // Green  
  [TrackType.CAPTIONS]: '#f59e0b',   // Amber
  [TrackType.BROLL]: '#8b5cf6',      // Purple
  [TrackType.OVERLAY]: '#ef4444',    // Red
  [TrackType.TRANSITION]: '#6b7280', // Gray
  [TrackType.EFFECT]: '#ec4899'      // Pink
};

const TRACK_HEIGHTS_MAP = {
  [TrackType.VIDEO]: 40,
  [TrackType.AUDIO]: 30,
  [TrackType.CAPTIONS]: 25,
  [TrackType.BROLL]: 35,
  [TrackType.OVERLAY]: 25,
  [TrackType.TRANSITION]: 20,
  [TrackType.EFFECT]: 25
};

interface UseLayeredTimelineProps {
  duration: number;
  initialTracks?: TimelineTrack[];
}

interface ExportSettings {
  outputPath?: string;
  format?: 'mp4' | 'mov' | 'avi';
  quality?: 'low' | 'medium' | 'high' | 'ultra';
  fps?: number;
  resolution?: '720p' | '1080p' | '1440p' | '4k';
  includeAudio?: boolean;
  enhanceAudio?: boolean;
  includeSubtitles?: boolean;
  subtitleStyle?: 'burned-in' | 'soft';
}

export const useLayeredTimeline = ({ 
  duration, 
  initialTracks = [] 
}: UseLayeredTimelineProps) => {
  const [tracks, setTracks] = useState<TimelineTrack[]>(initialTracks);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [clipboard, setClipboard] = useState<TimelineItem[]>([]);
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);

  // Generate unique ID
  const generateId = useCallback(() => {
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
  }, []);

  // Add a new track
  const addTrack = useCallback((type: TrackType, name?: string) => {
    const trackId = generateId();
    const defaultName = name || `${type.charAt(0).toUpperCase() + type.slice(1)} Track`;
    
    const newTrack: TimelineTrack = {
      id: trackId,
      type,
      name: defaultName,
      isVisible: true,
      isLocked: false,
      height: TRACK_HEIGHTS_MAP[type],
      color: TRACK_COLORS_MAP[type],
      items: [],
      zIndex: tracks.length
    };

    setTracks(prev => [...prev, newTrack]);
  }, [tracks.length, generateId]);

  // Remove a track
  const removeTrack = useCallback((trackId: string) => {
    setTracks(prev => prev.filter(track => track.id !== trackId));
    // Remove any selected items from the deleted track
    setSelectedItems(prev => {
      const trackItems = tracks.find(t => t.id === trackId)?.items || [];
      const trackItemIds = trackItems.map(item => item.id);
      return prev.filter(id => !trackItemIds.includes(id));
    });
  }, [tracks]);

  // Reorder tracks
  const reorderTracks = useCallback((trackIds: string[]) => {
    const trackMap = new Map(tracks.map(track => [track.id, track]));
    const reorderedTracks = trackIds
      .map(id => trackMap.get(id))
      .filter(Boolean) as TimelineTrack[];
    
    // Update zIndex based on new order
    const updatedTracks = reorderedTracks.map((track, index) => ({
      ...track,
      zIndex: index
    }));
    
    setTracks(updatedTracks);
  }, [tracks]);

  // Toggle track visibility
  const toggleTrackVisibility = useCallback((trackId: string) => {
    setTracks(prev => prev.map(track => 
      track.id === trackId 
        ? { ...track, isVisible: !track.isVisible }
        : track
    ));
  }, []);

  // Toggle track lock
  const toggleTrackLock = useCallback((trackId: string) => {
    setTracks(prev => prev.map(track => 
      track.id === trackId 
        ? { ...track, isLocked: !track.isLocked }
        : track
    ));
  }, []);

  // Resize track
  const resizeTrack = useCallback((trackId: string, height: number) => {
    setTracks(prev => prev.map(track => 
      track.id === trackId 
        ? { ...track, height: Math.max(30, Math.min(200, height)) }
        : track
    ));
  }, []);

  // Add item to track
  const addItem = useCallback((trackId: string, itemData: Omit<TimelineItem, 'id' | 'trackId'>) => {
    const itemId = generateId();
    const newItem: TimelineItem = {
      ...itemData,
      id: itemId,
      trackId
    };

    setTracks(prev => prev.map(track => 
      track.id === trackId 
        ? { ...track, items: [...track.items, newItem] }
        : track
    ));

    return itemId;
  }, [generateId]);

  // Remove item
  const removeItem = useCallback((itemId: string) => {
    setTracks(prev => prev.map(track => ({
      ...track,
      items: track.items.filter(item => item.id !== itemId)
    })));
    setSelectedItems(prev => prev.filter(id => id !== itemId));
  }, []);

  // Simple move item implementation
  const moveItem = useCallback((itemId: string, newTrackId: string, newStart: number) => {
    // This is a simplified version - will enhance later
    console.log('Moving item:', itemId, 'to track:', newTrackId, 'at time:', newStart);
  }, []);

  // Resize item
  const resizeItem = useCallback((itemId: string, newStart: number, newEnd: number) => {
    setTracks(prev => prev.map(track => ({
      ...track,
      items: track.items.map(item => 
        item.id === itemId 
          ? { 
              ...item, 
              start: Math.max(0, newStart),
              end: Math.min(duration, newEnd),
              duration: Math.min(duration, newEnd) - Math.max(0, newStart)
            }
          : item
      )
    })));
  }, [duration]);

  // Duplicate item
  const duplicateItem = useCallback((itemId: string) => {
    const allItems = tracks.flatMap(track => track.items);
    const itemToDuplicate = allItems.find(item => item.id === itemId);
    
    if (!itemToDuplicate) return;

    const newItemId = generateId();
    const duplicatedItem: TimelineItem = {
      ...itemToDuplicate,
      id: newItemId,
      start: itemToDuplicate.end,
      end: itemToDuplicate.end + itemToDuplicate.duration,
      isSelected: false
    };

    setTracks(prev => prev.map(track => 
      track.id === itemToDuplicate.trackId 
        ? { ...track, items: [...track.items, duplicatedItem] }
        : track
    ));

    return newItemId;
  }, [tracks, generateId]);

  // Cut item at specific time
  const cutItem = useCallback((itemId: string, cutTime: number) => {
    const allItems = tracks.flatMap(track => track.items);
    const itemToCut = allItems.find(item => item.id === itemId);
    
    if (!itemToCut || cutTime <= itemToCut.start || cutTime >= itemToCut.end) return;

    const firstPartId = generateId();
    const secondPartId = generateId();

    const firstPart: TimelineItem = {
      ...itemToCut,
      id: firstPartId,
      end: cutTime,
      duration: cutTime - itemToCut.start,
      isSelected: false
    };

    const secondPart: TimelineItem = {
      ...itemToCut,
      id: secondPartId,
      start: cutTime,
      duration: itemToCut.end - cutTime,
      isSelected: false
    };

    setTracks(prev => prev.map(track => 
      track.id === itemToCut.trackId 
        ? { 
            ...track, 
            items: track.items
              .filter(item => item.id !== itemId)
              .concat([firstPart, secondPart])
          }
        : track
    ));

    setSelectedItems(prev => prev.filter(id => id !== itemId));
    return [firstPartId, secondPartId];
  }, [tracks, generateId]);

  // Split item (alias for cutItem)
  const splitItem = useCallback((itemId: string, splitTime: number) => {
    return cutItem(itemId, splitTime);
  }, [cutItem]);

  // Export function for layered timeline
  const exportVideo = useCallback(async (
    videoPath: string, 
    settings: ExportSettings = {}
  ): Promise<{ success: boolean; outputPath?: string; error?: string; stats?: any }> => {
    if (isExporting) {
      return { success: false, error: 'Export already in progress' };
    }

    setIsExporting(true);
    setExportProgress(0);

    try {
      // Prepare export data with all tracks
      const exportData = {
        timeline: {
          duration,
          tracks: tracks.filter(track => track.isVisible && track.items.length > 0).map(track => ({
            id: track.id,
            type: track.type,
            name: track.name,
            zIndex: track.zIndex,
            items: track.items.filter(item => !item.isLocked && item.opacity > 0).map(item => ({
              id: item.id,
              start: item.start,
              end: item.end,
              duration: item.duration,
              type: item.type,
              opacity: item.opacity,
              data: item.data
            }))
          }))
        },
        exportSettings: {
          format: settings.format || 'mp4',
          quality: settings.quality || 'high',
          fps: settings.fps || 30,
          resolution: settings.resolution || '1080p',
          includeAudio: settings.includeAudio !== false,
          enhanceAudio: settings.enhanceAudio || false,
          includeSubtitles: settings.includeSubtitles || false,
          subtitleStyle: settings.subtitleStyle || 'burned-in',
          outputPath: settings.outputPath || videoPath.replace(/\.[^/.]+$/, '_layered_export.mp4')
        }
      };

      console.log('🎬 [LAYERED-EXPORT] Starting export with data:', exportData);

      // Call the enhanced export API
      const response = await fetch('/api/export-layered-video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          videoPath,
          ...exportData
        })
      });

      const result = await response.json();

      if (result.success) {
        setExportProgress(100);
        console.log('✅ [LAYERED-EXPORT] Export successful:', result.outputPath);
        
        // Calculate export statistics
        const videoTracks = tracks.filter(t => t.type === TrackType.VIDEO && t.isVisible);
        const captionTracks = tracks.filter(t => t.type === TrackType.CAPTIONS && t.isVisible);
        const brollTracks = tracks.filter(t => t.type === TrackType.BROLL && t.isVisible);
        
        const stats = {
          totalTracks: tracks.filter(t => t.isVisible).length,
          videoTracks: videoTracks.length,
          captionTracks: captionTracks.length,
          brollTracks: brollTracks.length,
          totalItems: tracks.reduce((sum, track) => sum + (track.isVisible ? track.items.length : 0), 0)
        };

        return { 
          success: true, 
          outputPath: result.outputPath,
          stats 
        };
      } else {
        console.error('❌ [LAYERED-EXPORT] Export failed:', result.error);
        return { success: false, error: result.error };
      }
    } catch (error) {
      console.error('💥 [LAYERED-EXPORT] Export error:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown export error' 
      };
    } finally {
      setIsExporting(false);
      setExportProgress(0);
    }
  }, [tracks, duration, isExporting]);

  // Add caption from existing caption data
  const addCaptionFromData = useCallback((captionData: {
    text: string;
    start: number;
    end: number;
    style: string;
  }) => {
    // Find or create a captions track
    let captionsTrack = tracks.find(track => track.type === TrackType.CAPTIONS);
    
    if (!captionsTrack) {
      const trackId = generateId();
      captionsTrack = {
        id: trackId,
        type: TrackType.CAPTIONS,
        name: 'Captions',
        isVisible: true,
        isLocked: false,
        height: TRACK_HEIGHTS_MAP[TrackType.CAPTIONS],
        color: TRACK_COLORS_MAP[TrackType.CAPTIONS],
        items: [],
        zIndex: tracks.length
      };
      
      setTracks(prev => [...prev, captionsTrack!]);
    }

    // Check for overlapping captions with the same style
    const existingCaptionItems = captionsTrack.items as CaptionTrackItem[];
    const overlappingItem = existingCaptionItems.find(item => 
      item.data.style === captionData.style && (
        // New caption overlaps with existing
        (captionData.start <= item.end && captionData.end >= item.start) ||
        // New caption is adjacent (within 0.5 seconds)
        (Math.abs(captionData.start - item.end) <= 0.5) ||
        (Math.abs(captionData.end - item.start) <= 0.5)
      )
    );

    if (overlappingItem) {
      // Expand existing caption instead of creating new one
      console.log('🔄 [TIMELINE] Expanding existing caption item');
      
      const expandedStart = Math.min(captionData.start, overlappingItem.start);
      const expandedEnd = Math.max(captionData.end, overlappingItem.end);
      
      setTracks(prev => prev.map(track => 
        track.id === captionsTrack!.id 
          ? {
              ...track, 
              items: track.items.map(item => 
                item.id === overlappingItem.id
                  ? {
                      ...item,
                      start: expandedStart,
                      end: expandedEnd,
                      duration: expandedEnd - expandedStart,
                      data: {
                        ...item.data,
                        text: captionData.text // Use the new expanded text
                      }
                    }
                  : item
              )
            }
          : track
      ));
      
      return overlappingItem.id;
    } else {
      // Create new caption item
      console.log('✨ [TIMELINE] Creating new caption item');
      
      const captionItem: CaptionTrackItem = {
        id: generateId(),
        trackId: captionsTrack.id,
        start: captionData.start,
        end: captionData.end,
        duration: captionData.end - captionData.start,
        type: TrackType.CAPTIONS,
        isSelected: false,
        isLocked: false,
        opacity: 1,
        data: {
          text: captionData.text,
          style: captionData.style as CaptionStyle,
          position: { x: 50, y: 80 }, // Default position (center-bottom)
          fontSize: 24,
          fontFamily: 'Arial',
          color: '#ffffff',
          backgroundColor: '#000000'
        }
      };

      if (captionsTrack.items) {
        setTracks(prev => prev.map(track => 
          track.id === captionsTrack!.id 
            ? { ...track, items: [...track.items, captionItem] }
            : track
        ));
      }

      return captionItem.id;
    }
  }, [tracks, generateId]);

  // Convert existing video clips to timeline items
  const initializeFromVideoClips = useCallback((clips: any[], waveformData?: number[]) => {
    // Create video track
    const videoTrackId = generateId();
    const videoTrack: TimelineTrack = {
      id: videoTrackId,
      type: TrackType.VIDEO,
      name: 'Main Video',
      isVisible: true,
      isLocked: false,
      height: TRACK_HEIGHTS_MAP[TrackType.VIDEO],
      color: TRACK_COLORS_MAP[TrackType.VIDEO],
      items: [],
      zIndex: 0
    };

    // Create audio track
    const audioTrackId = generateId();
    const audioTrack: TimelineTrack = {
      id: audioTrackId,
      type: TrackType.AUDIO,
      name: 'Main Audio',
      isVisible: true,
      isLocked: false,
      height: TRACK_HEIGHTS_MAP[TrackType.AUDIO],
      color: TRACK_COLORS_MAP[TrackType.AUDIO],
      items: [],
      zIndex: 1
    };

    // Convert clips to timeline items
    const videoItems: VideoTrackItem[] = clips.map(clip => ({
      id: generateId(),
      trackId: videoTrackId,
      start: clip.start,
      end: clip.end,
      duration: clip.duration,
      type: TrackType.VIDEO,
      isSelected: false,
      isLocked: false,
      opacity: 1,
      data: {
        videoPath: clip.path || '',
        thumbnailPath: clip.thumbnail,
        isCut: clip.isCut,
        clipId: clip.id
      }
    }));

    const audioItems: AudioTrackItem[] = clips.map(clip => ({
      id: generateId(),
      trackId: audioTrackId,
      start: clip.start,
      end: clip.end,
      duration: clip.duration,
      type: TrackType.AUDIO,
      isSelected: false,
      isLocked: false,
      opacity: 1,
      data: {
        waveformData,
        volume: 1,
        isMuted: false,
        isCut: clip.isCut
      }
    }));

    videoTrack.items = videoItems;
    audioTrack.items = audioItems;

    setTracks([videoTrack, audioTrack]);
  }, [generateId]);

  // Create operations object
  const operations: TrackOperations = useMemo(() => ({
    addTrack,
    removeTrack,
    reorderTracks,
    toggleTrackVisibility,
    toggleTrackLock,
    resizeTrack,
    addItem,
    removeItem,
    moveItem,
    resizeItem,
    duplicateItem,
    cutItem,
    splitItem
  }), [
    addTrack,
    removeTrack,
    reorderTracks,
    toggleTrackVisibility,
    toggleTrackLock,
    resizeTrack,
    addItem,
    removeItem,
    moveItem,
    resizeItem,
    duplicateItem,
    cutItem,
    splitItem
  ]);

  return {
    tracks,
    selectedItems,
    setSelectedItems,
    operations,
    addCaptionFromData,
    initializeFromVideoClips,
    clipboard,
    setClipboard,
    exportVideo,
    isExporting,
    exportProgress
  };
}; 