import { useState, useCallback, useRef } from 'react';
import { debounce } from 'lodash';

export interface VideoFile {
  name: string;
  path: string;
  size: number;
  duration?: number;
  type?: 'short' | 'regular';
  aspectRatio?: number;
  width?: number;
  height?: number;
  scheduledDate?: string;
  scheduledTime?: string;
  conflict?: boolean;
  conflictReason?: string;
}

export interface VideoDiscovery {
  totalVideos: number;
  totalSize: number;
  estimatedDuration: number;
  files: VideoFile[];
  shortcuts: { file: VideoFile; scheduledDate: string; scheduledTime: string }[];
  regularVideos: { file: VideoFile; scheduledDate: string; scheduledTime: string }[];
  schedulingPreview?: {
    firstUpload: string;
    lastUpload: string;
    totalDays: number;
    shortSlots: number;
    regularSlots: number;
    conflicts: number;
  };
}

export const useVideoDiscovery = () => {
  const [videoDiscovery, setVideoDiscovery] = useState<VideoDiscovery>({
    totalVideos: 0,
    totalSize: 0,
    estimatedDuration: 0,
    files: [],
    shortcuts: [],
    regularVideos: []
  });
  const [isDiscovering, setIsDiscovering] = useState(false);
  
  const abortControllerRef = useRef<AbortController | null>(null);

  const discoverVideos = useCallback(async (inputFolder: string, options?: { 
    scheduleDate?: string; 
    scheduleMode?: string;
    conflictMode?: string;
    processingMode?: string;
  }) => {
    if (!inputFolder.trim()) {
      setVideoDiscovery({
        totalVideos: 0,
        totalSize: 0,
        estimatedDuration: 0,
        files: [],
        shortcuts: [],
        regularVideos: []
      });
      return;
    }

    // Cancel any ongoing discovery
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    setIsDiscovering(true);
    
    try {
      // 🚀 [PERFORMANCE FIX] Don't trigger expensive smart scheduling for dry-run mode
      const shouldGenerateSchedule = (
        (options?.scheduleMode === 'delayed' || options?.scheduleMode === 'smart') &&
        options?.processingMode !== 'dry-run' // Skip for dry-run
      );
      
      const requestBody = { 
        inputFolder,
        analyzeTypes: true,
        generateSchedule: shouldGenerateSchedule,
        ...options
      };
      console.log('🔧 [DEBUG] Video discovery request:', requestBody);
      
      const response = await fetch('/api/discover-videos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
        signal: abortController.signal
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (!abortController.signal.aborted) {
        setVideoDiscovery(data);
      }
    } catch (error: any) {
      if (error.name !== 'AbortError') {
      console.error('Error discovering videos:', error);
      setVideoDiscovery({
        totalVideos: 0,
          totalSize: 0,
          estimatedDuration: 0,
          files: [],
          shortcuts: [],
          regularVideos: []
      });
      }
    } finally {
      if (!abortController.signal.aborted) {
      setIsDiscovering(false);
      }
    }
  }, []);

  const discoverVideosDebounced = useCallback(
    debounce((inputFolder: string, options?: any) => {
      discoverVideos(inputFolder, options);
    }, 300),
    [discoverVideos]
  );

  // Enhanced function that updates scheduling when settings change
  const updateSchedulingPreview = useCallback(async (inputFolder: string, options: {
    scheduleDate?: string;
    scheduleMode?: string;
    schedulingStrategy?: string;
    processingMode?: string;
    postingTimes?: {
      morning: string;
      afternoon: string;
      evening: string;
    };
    slotInterval?: string;
  }) => {
    if (!inputFolder.trim() || (options.scheduleMode !== 'smart' && options.scheduleMode !== 'delayed')) {
      return;
    }
    
    // 🚀 [PERFORMANCE FIX] Skip expensive smart scheduling for dry-run mode
    if (options.processingMode === 'dry-run') {
      console.log('⏭️ [SCHEDULING DEBUG] Skipping smart scheduling preview for dry-run mode');
      return;
    }

    const isDayAndNight = options.schedulingStrategy === 'day-night';
    const morningTime = options.postingTimes?.morning || '07:00';
    const eveningTime = options.postingTimes?.evening || '19:00';
    const timePreference = options.postingTimes?.afternoon || '12:00';

    try {
      console.log('🔧 [DEBUG] Calling discover-videos API with smart scheduling parameters:', {
        inputFolder,
        scheduleMode: 'smart',
        conflictMode: 'smart-analysis',
        isDayAndNight,
        morningTime,
        eveningTime,
        timePreference,
        schedulingStrategy: options.schedulingStrategy
      });

      const response = await fetch('/api/discover-videos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          inputFolder,
          analyzeTypes: true,
          generateSchedule: true,
          scheduleDate: options.scheduleDate,
          scheduleMode: 'smart',
          conflictMode: 'smart-analysis',
          slotInterval: options.slotInterval || '24h',
          preferredTime: options.postingTimes?.morning || '07:00'
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('🔧 [DEBUG] Smart scheduling response:', data);
      
      // Update the video discovery with scheduling data
      setVideoDiscovery(data);
    } catch (error) {
      console.error('Error updating scheduling preview:', error);
    }
  }, []);

  const updateSchedulingPreviewDebounced = useCallback(
    debounce((inputFolder: string, options: any) => {
      updateSchedulingPreview(inputFolder, options);
    }, 500),
    [updateSchedulingPreview]
  );

  return {
    videoDiscovery,
    isDiscovering,
    discoverVideos,
    discoverVideosDebounced,
    updateSchedulingPreview,
    updateSchedulingPreviewDebounced
  };
}; 