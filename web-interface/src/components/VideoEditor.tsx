'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useHotkeys } from 'react-hotkeys-hook';
import toast, { Toaster } from 'react-hot-toast';
import { 
  VideoFile, 
  VideoClip, 
  VideoAnalysis, 
  TimelineEdit, 
  Word, 
  SilenceSegment
} from '@/types';
import { VideoClipTimeline } from './VideoClipTimeline';
import { LayeredTimeline } from './LayeredTimeline';
import { useLayeredTimeline } from '@/hooks/useLayeredTimeline';
import { convertSegmentsToWords } from '@/utils/transcriptUtils';
import { 
  Play, Pause, ArrowLeft, HelpCircle, Undo, Download, Files, Edit, Sliders, 
  Search, Split, Gauge, MoreHorizontal, Folder, FileText, Scissors, Zap, 
  RotateCcw, Video, Image, Subtitles, Sparkles, X, Maximize2, MessageCircle, Trash2, Plus, Type
} from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { FillerWordPanel } from './FillerWordPanel';
import { BrollPanel } from './BrollPanel';
import { CaptionPanel } from './CaptionPanel';
import { DynamicCaption } from './DynamicCaption';
import { generateWordLevelTimestamps } from '@/utils/transcriptUtils';
import { groupWordsIntoSegments, TextSegment } from '@/lib/segmentUtils';

interface VideoEditorProps {
  video: VideoFile;
}

interface BrollClip {
  id: string;
  start: number;
  end: number;
  url: string;
  source: 'upload' | 'stock';
}

interface Caption {
  id: string;
  text: string;
  start: number;
  end: number;
  style: 'typewriter' | 'bounce' | 'glow' | 'karaoke' | 'pop' | 'slide' | 'scale' | 'rainbow';
}

const VideoEditor: React.FC<VideoEditorProps> = ({ video }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [activeTab, setActiveTab] = useState('script');
  
  const [videoAnalysis, setVideoAnalysis] = useState<VideoAnalysis | null>(null);
  const [clips, setClips] = useState<VideoClip[]>([]);
  const [wordSegments, setWordSegments] = useState<Word[]>([]);
  const [editHistory, setEditHistory] = useState<VideoClip[][]>([]);
  const [fillerWords, setFillerWords] = useState<string[]>([]);
  const [highlights, setHighlights] = useState<any[]>([]);
  const [loadingStatus, setLoadingStatus] = useState<string>('');
  const [isInitializing, setIsInitializing] = useState(true);
  const [clipThumbnails, setClipThumbnails] = useState<{[key: string]: string}>({});
  const [brollClips, setBrollClips] = useState<BrollClip[]>([]);
  const [selectedClip, setSelectedClip] = useState<string | null>(null);
  const [playheadPosition, setPlayheadPosition] = useState(0);
  const [timelineWidth, setTimelineWidth] = useState(0);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [contextMenu, setContextMenu] = useState<{
    word: Word;
    top: number;
    left: number;
  } | null>(null);
  const [correctionBox, setCorrectionBox] = useState<{
    word: Word;
    top: number;
    left: number;
  } | null>(null);
  const [isCorrecting, setIsCorrecting] = useState(false);
  const [currentSegment, setCurrentSegment] = useState<number>(0);
  const [useStudioSound, setUseStudioSound] = useState(false);
  const [studioSoundPath, setStudioSoundPath] = useState<string>('');
  const [silenceAnalysis, setSilenceAnalysis] = useState<any>(null);
  const [hasSilenceAnalysis, setHasSilenceAnalysis] = useState(false);
  const [hasHighlights, setHasHighlights] = useState(false);
  const [selectionMenu, setSelectionMenu] = useState<{
    top: number;
    left: number;
    selectedText: string;
  } | null>(null);
  const [selectionRange, setSelectionRange] = useState<{
    start: number;
    end: number;
  } | null>(null);
  const [selectionText, setSelectionText] = useState<string>('');
  const [originalSilenceAnalysis, setOriginalSilenceAnalysis] = useState<any>(null);
  const [originalClips, setOriginalClips] = useState<VideoClip[]>([]);
  const [currentPace, setCurrentPace] = useState<number>(1);
  const [deletedWords, setDeletedWords] = useState<Set<string>>(new Set());
  const [correctedWords, setCorrectedWords] = useState<Map<string, string>>(new Map());
  const [brollSearching, setBrollSearching] = useState(false);
  const [brollSearchQuery, setBrollSearchQuery] = useState('');
  const [brollSearchResults, setBrollSearchResults] = useState<any[]>([]);
  const [addingBroll, setAddingBroll] = useState(false);
  const [isBrollPanelOpen, setIsBrollPanelOpen] = useState(false);
  const [reviewingFillerWord, setReviewingFillerWord] = useState<{ word: string; instanceIndex: number } | null>(null);
  const [useMagicCut, setUseMagicCut] = useState(true);
  const [silenceThreshold, setSilenceThreshold] = useState(0.05);
  const [silenceMargin, setSilenceMargin] = useState(0.15);
  const [error, setError] = useState('');
  const [autoScroll, setAutoScroll] = useState(true);
  const [isSeeking, setIsSeeking] = useState(false);
  const scriptContainerRef = useRef<HTMLDivElement>(null);
  const [loadedClips, setLoadedClips] = useState<Set<string>>(new Set());
  const [clipCache, setClipCache] = useState<Map<string, VideoClip>>(new Map());
  const [visibleClipRange, setVisibleClipRange] = useState<{start: number, end: number}>({ start: 0, end: 10 });
  const [showCuts, setShowCuts] = useState(false);
  const [thumbnailMap, setThumbnailMap] = useState<Record<string, string>>({});
  const [waveformData, setWaveformData] = useState<number[]>([]);
  const [captions, setCaptions] = useState<Caption[]>([]);
  const [captionedRanges, setCaptionedRanges] = useState<Array<{start: number, end: number, captionId: string}>>([]);
  const [showCaptionStyleMenu, setShowCaptionStyleMenu] = useState(false);
  const [captionStyleMenuPosition, setCaptionStyleMenuPosition] = useState({ top: 0, left: 0 });
  const [showLayeredTimeline, setShowLayeredTimeline] = useState(true);

  // Initialize layered timeline
  const {
    tracks,
    operations: trackOperations,
    addCaptionFromData,
    initializeFromVideoClips,
    exportVideo: exportLayeredVideo,
    isExporting,
    exportProgress
  } = useLayeredTimeline({
    duration,
    initialTracks: []
  });
  
  const playbackClips = useMemo(() => clips.filter(c => !c.isSkipped && !c.isSilent), [clips]);

  // Initialize layered timeline with clips when they're loaded
  useEffect(() => {
    if (clips.length > 0 && tracks.length === 0) {
      initializeFromVideoClips(clips, waveformData);
    }
  }, [clips, tracks.length, initializeFromVideoClips, waveformData]);

  useEffect(() => {
    if (clips.length > 0) {
      generateThumbnails(clips);
    }
  }, [clips]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !isPlaying) return;

    const interval = setInterval(() => {
        const currentTime = video.currentTime;
        const currentPlaybackClip = playbackClips.find(c => currentTime >= c.start && currentTime < c.end);

        if (!currentPlaybackClip) {
            // We are in a "gap", find next clip to play
            const nextClip = playbackClips.find(c => c.start > currentTime);
            if (nextClip) {
                video.currentTime = nextClip.start;
            } else {
                video.pause();
                setIsPlaying(false);
            }
        }
    }, 150); // Check every 150ms for gaps

    return () => clearInterval(interval);
  }, [isPlaying, playbackClips]);

  // --- Helper Functions ---
  const generateThumbnails = async (videoClips: VideoClip[]) => {
    try {
      const response = await fetch('/api/generate-thumbnails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoPath: video.path, clips: videoClips }),
      });
      const result = await response.json();
      if (result.success) {
        setClipThumbnails(result.thumbnails);
      }
    } catch (error) {
      console.error('Thumbnail generation failed:', error);
    }
  };

  const mapWordsToClips = useCallback((words: Word[], clips: VideoClip[]): Word[] => {
    return words.map(word => {
      const containingClip = clips.find(clip =>
        word.start >= clip.sourceStart &&
        word.end <= clip.sourceEnd
      );
      return {
        ...word,
        clipId: containingClip?.id,
        isCut: containingClip?.isSkipped || containingClip?.isSilent || false
      };
    });
  }, []);

  // --- Memos for Derived State ---
  const textSegments: TextSegment[] = useMemo(() => {
    return groupWordsIntoSegments(wordSegments);
  }, [wordSegments]);

  // Update word segments with clip mapping
  const mappedWordSegments = useMemo(() => {
    return mapWordsToClips(wordSegments, clips);
  }, [wordSegments, clips, mapWordsToClips]);

  const togglePlayPause = useCallback(() => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
    }
  }, [isPlaying]);

  const seekTo = useCallback((time: number) => {
    if (videoRef.current) {
      // If Magic Cut is enabled, ensure we don't seek to a skipped/silent clip
      if (useMagicCut) {
        const targetClip = clips.find(clip => 
          time >= clip.start && 
          time < clip.end
        );
        
        if (targetClip && (targetClip.isSkipped || targetClip.isSilent)) {
          // Find the nearest non-skipped clip
          const nearestClip = clips
            .filter(clip => !clip.isSkipped && !clip.isSilent)
            .reduce((nearest, clip) => {
              const currentDistance = Math.abs(clip.start - time);
              const nearestDistance = nearest ? Math.abs(nearest.start - time) : Infinity;
              return currentDistance < nearestDistance ? clip : nearest;
            }, null as VideoClip | null);
          
          if (nearestClip) {
            videoRef.current.currentTime = nearestClip.start;
            setCurrentTime(nearestClip.start);
            return;
          }
        }
      }
      
      videoRef.current.currentTime = time;
      setCurrentTime(time);
    }
  }, [useMagicCut, clips]);

  const handleSeek = useCallback((time: number) => {
    seekTo(time);
  }, [seekTo]);

  const handleUndo = useCallback(() => {
    if (editHistory.length > 1) {
      const newHistory = editHistory.slice(0, -1);
      const previousState = newHistory[newHistory.length - 1];
      setClips(previousState);
      setEditHistory(newHistory);
    }
  }, [editHistory]);

  const saveState = useCallback(() => {
    setEditHistory(prev => [...prev, clips]);
  }, [clips]);

  const handleDeleteSilence = useCallback((clipId: string) => {
    saveState();
    setClips(prev => prev.map(clip => 
      clip.id === clipId ? { ...clip, isSkipped: true } : clip
    ));
  }, [saveState]);

  const handleSplit = useCallback(() => {
    console.log('🔪 [SPLIT] Button clicked - attempting to split at time:', currentTime);
    console.log('🔪 [SPLIT] Timeline mode:', showLayeredTimeline ? 'Layered' : 'Clip-based');
    
    if (showLayeredTimeline) {
      // Layered timeline mode - split items at playhead position
      console.log('🔪 [SPLIT] Using layered timeline split');
      
      if (tracks.length === 0) {
        toast.error('No tracks available to split');
        console.log('❌ [SPLIT] No tracks available');
        return;
      }

      // Find all items at the current playhead position
      const itemsToSplit: { item: any; trackId: string }[] = [];
      tracks.forEach(track => {
        track.items.forEach(item => {
          if (currentTime > item.start && currentTime < item.end) {
            itemsToSplit.push({ item, trackId: track.id });
          }
        });
      });

      console.log('🔪 [SPLIT] Found items to split:', itemsToSplit.length);

      if (itemsToSplit.length === 0) {
        toast.error('Playhead is not positioned within any timeline items');
        console.log('❌ [SPLIT] Playhead not within any timeline items');
        return;
      }

             // Split each item at the current time
       let splitCount = 0;
       itemsToSplit.forEach(({ item }) => {
         // Ensure we're not splitting too close to the edges (minimum 0.1 second clips)
         if (currentTime <= item.start + 0.1 || currentTime >= item.end - 0.1) {
           console.log(`⚠️ [SPLIT] Skipping item ${item.id} - too close to edges`);
           return;
         }

         console.log(`🔪 [SPLIT] Splitting item ${item.id} at time ${currentTime}`);
         try {
           trackOperations.splitItem(item.id, currentTime);
           splitCount++;
         } catch (error) {
           console.log(`❌ [SPLIT] Failed to split item ${item.id}:`, error);
         }
       });

      if (splitCount > 0) {
        toast.success(`Split ${splitCount} item(s) at ${currentTime.toFixed(1)}s`);
        console.log(`✅ [SPLIT] Successfully split ${splitCount} items`);
      } else {
        toast.error('Could not split any items - too close to edges');
        console.log('❌ [SPLIT] No items could be split');
      }
      
    } else {
      // Clip-based timeline mode - original split logic
      console.log('🔪 [SPLIT] Using clip-based split');
      
      if (clips.length === 0) {
        toast.error('No clips available to split');
        console.log('❌ [SPLIT] No clips available');
        return;
      }

      const currentClipIndex = clips.findIndex(c => currentTime >= c.start && currentTime <= c.end);
      console.log('🔪 [SPLIT] Found clip index:', currentClipIndex);
      
      if (currentClipIndex === -1) {
        toast.error('Playhead is not positioned within any clip');
        console.log('❌ [SPLIT] Playhead not within any clip');
        return;
      }

      const currentClip = clips[currentClipIndex];
      const splitTime = currentTime;

      console.log('🔪 [SPLIT] Current clip:', currentClip);
      console.log('🔪 [SPLIT] Split time:', splitTime);

      // Ensure we're not splitting too close to the edges (minimum 0.1 second clips)
      if (splitTime <= currentClip.start + 0.1 || splitTime >= currentClip.end - 0.1) {
        toast.error('Cannot split too close to clip edges');
        console.log('❌ [SPLIT] Split time too close to edges');
        return;
      }

      saveState();
      
      const firstPart = { 
        ...currentClip, 
        end: splitTime, 
        duration: splitTime - currentClip.start,
        id: `${currentClip.id}_part1`
      };
      const secondPart = { 
        ...currentClip, 
        id: `${currentClip.id}_part2_${Date.now()}`, 
        start: splitTime, 
        duration: currentClip.end - splitTime 
      };

      console.log('🔪 [SPLIT] First part:', firstPart);
      console.log('🔪 [SPLIT] Second part:', secondPart);

      const newClips = [
        ...clips.slice(0, currentClipIndex),
        firstPart,
        secondPart,
        ...clips.slice(currentClipIndex + 1)
      ];

      setClips(newClips);
      
      // Update selected clip to the first part
      setSelectedClip(firstPart.id);
      
      // Force timeline refresh by updating timeline width
      setTimelineWidth(prev => prev + 0.001);
      
      toast.success(`Split clip into ${firstPart.duration.toFixed(1)}s and ${secondPart.duration.toFixed(1)}s segments`);
      console.log('✅ [SPLIT] Split successful, new clip count:', newClips.length);
    }
  }, [clips, currentTime, saveState, showLayeredTimeline, tracks, trackOperations]);

  const handleReanalyze = useCallback(async () => {
    setLoadingStatus('Re-analyzing with new parameters...');
    try {
      const response = await fetch(`/api/analyze-video`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          videoPath: video.path,
          silenceThreshold,
          silenceMargin,
          smartDetection: true
        }),
      });
      const result = await response.json();
      if (result.success) {
        setVideoAnalysis(result);
        const allClips: VideoClip[] = result.clips || [];
        setClips(allClips);
        setEditHistory([allClips]);
        generateThumbnails(allClips);
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error("Re-analysis failed:", error);
      setError('Could not re-analyze video.');
    } finally {
      setLoadingStatus('');
    }
  }, [video.path, silenceThreshold, silenceMargin]);

  const handleStudioSoundToggle = useCallback(async (enabled: boolean) => {
    setUseStudioSound(enabled);
    
    if (enabled && !studioSoundPath) {
      setLoadingStatus('Applying Studio Sound...');
      try {
        const response = await fetch('/api/apply-studio-sound', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ videoPath: video.path }),
        });
        
        const result = await response.json();
        if (result.success) {
          setStudioSoundPath(result.outputPath);
          console.log('✅ Studio Sound applied:', result.outputPath);
        } else {
          console.error('❌ Studio Sound failed:', result.error);
          setError(`Studio Sound failed: ${result.error}`);
          setUseStudioSound(false);
        }
      } catch (error) {
        console.error('💥 Studio Sound error:', error);
        setError(`Studio Sound error: ${error instanceof Error ? error.message : 'Unknown error'}`);
        setUseStudioSound(false);
      } finally {
        setLoadingStatus('');
      }
    }
  }, [video.path, studioSoundPath]);

  const handleExport = useCallback(async () => {
    if (!clips || clips.length === 0) {
      toast.error('No clips to export. Please load and analyze a video first.');
      return;
    }

    setLoadingStatus('Exporting video...');
    
    try {
      // Calculate export statistics
      const totalOriginalDuration = clips.reduce((sum, clip) => sum + clip.duration, 0);
      const exportClips = clips.filter(clip => !clip.isSkipped && !clip.isSilent);
      const totalExportDuration = exportClips.reduce((sum, clip) => sum + clip.duration, 0);
      const timeSaved = totalOriginalDuration - totalExportDuration;

      if (exportClips.length === 0) {
        toast.error('No valid clips to export. All clips are either skipped or silent.');
        setLoadingStatus('');
        return;
      }
      
      console.log(`📤 [EXPORT] Starting export of ${exportClips.length} clips`);
      console.log(`📤 [EXPORT] Time saved: ${timeSaved.toFixed(1)}s (${(timeSaved/totalOriginalDuration*100).toFixed(1)}%)`);

      toast.loading('Processing video export...', { id: 'export-toast' });
      
      const response = await fetch('/api/export-video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          videoPath: video.path,
          clips: exportClips,
          skipSilence: useMagicCut,
          outputPath: video.path.replace(/\.[^/.]+$/, '_edited.mp4'),
          exportSettings: {
            enhanceAudio: useStudioSound,
            addCaptions: captions.length > 0
          }
        }),
      });

      if (!response.ok) {
        throw new Error(`Export request failed: ${response.status} ${response.statusText}`);
      }
      
      const result = await response.json();
      if (result.success) {
        console.log('✅ Export successful:', result.outputPath);
        
        toast.success(`Export completed! Time saved: ${timeSaved.toFixed(1)}s (${(timeSaved/totalOriginalDuration*100).toFixed(1)}%)`, {
          id: 'export-toast',
          duration: 5000
        });
        
        // Show detailed export info
        const exportInfo = `Export completed successfully!

Original duration: ${totalOriginalDuration.toFixed(1)}s
Exported duration: ${totalExportDuration.toFixed(1)}s
Time saved: ${timeSaved.toFixed(1)}s (${(timeSaved/totalOriginalDuration*100).toFixed(1)}%)

Clips exported: ${exportClips.length}
${useStudioSound ? '✓ Studio Sound enhanced' : ''}
${captions.length > 0 ? '✓ Captions included' : ''}

Saved to: ${result.outputPath}`;
        
        alert(exportInfo);
      } else {
        console.error('❌ Export failed:', result.error);
        toast.error(`Export failed: ${result.error}`, { id: 'export-toast' });
        setError(`Export failed: ${result.error}`);
      }
    } catch (error) {
      console.error('💥 Export error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      toast.error(`Export error: ${errorMessage}`, { id: 'export-toast' });
      setError(`Export error: ${errorMessage}`);
    } finally {
      setLoadingStatus('');
    }
  }, [video.path, useMagicCut, useStudioSound, clips, captions]);

  // Sync captioned ranges with captions state
  useEffect(() => {
    const ranges = captions.map(caption => ({
      start: caption.start,
      end: caption.end,
      captionId: caption.id
    }));
    setCaptionedRanges(ranges);
  }, [captions]);

  // Find current word being spoken for highlighting
  const currentSpokenWord = useMemo(() => {
    for (const segment of textSegments) {
      for (const word of segment.words) {
        if (currentTime >= word.start && currentTime <= word.end) {
          return word;
        }
      }
    }
    return null;
  }, [currentTime, textSegments]);

  // Auto-scroll to current segment in transcript and update current segment
  useEffect(() => {
    const currentSegmentObj = textSegments.find(segment => 
      currentTime >= segment.start && currentTime < segment.end
    );

    if (currentSegmentObj) {
      // Update current segment index
      const segmentIndex = textSegments.indexOf(currentSegmentObj);
      console.log('🎯 [CURRENT-SEGMENT] Time:', currentTime.toFixed(2), 'Segment:', segmentIndex + 1, 'ID:', currentSegmentObj.id);
      setCurrentSegment(segmentIndex);
      
      // Auto-scroll only when playing
      if (isPlaying && autoScroll) {
        const segmentElement = document.querySelector(`[data-segment-id="${currentSegmentObj.id}"]`);
        if (segmentElement && scriptContainerRef.current) {
          const containerRect = scriptContainerRef.current.getBoundingClientRect();
          const segmentRect = segmentElement.getBoundingClientRect();
          
          // Calculate the scroll position to center the segment
          const scrollTop = scriptContainerRef.current.scrollTop + 
                            (segmentRect.top - containerRect.top) - 
                            (containerRect.height / 2);
          
          scriptContainerRef.current.scrollTo({
            top: scrollTop,
            behavior: 'smooth'
          });
        }
      }
    }
  }, [currentTime, isPlaying, textSegments, autoScroll]);

  // --- Data Loading ---
  useEffect(() => {
    if (video?.path) {
      setIsInitializing(true);
      setLoadingStatus('Transcribing video...');
      
      // CORRECT ORDER: Transcription FIRST, then silence detection
      loadTranscription()
        .then(() => {
          setLoadingStatus('Analyzing silence...');
          return loadAnalysis();
        })
        .then(() => {
          setLoadingStatus('');
          setIsInitializing(false);
        })
        .catch(err => {
          setError('Failed to initialize editor.');
          setIsInitializing(false);
        });
    }
  }, [video]);

  const loadAnalysis = async () => {
    try {
      const response = await fetch(`/api/analyze-video`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          videoPath: video.path,
          silenceThreshold,
          silenceMargin,
          smartDetection: true
        }),
      });
      const result = await response.json();
      if (result.success) {
        setVideoAnalysis(result);
        const allClips: VideoClip[] = result.clips || [];
        setClips(allClips);
        setEditHistory([allClips]);
        setWaveformData(result.waveformData || []);
        generateThumbnails(allClips);
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error("Analysis loading failed:", error);
      setError('Could not load video analysis.');
    }
  };

  const loadTranscription = async () => {
    try {
      // First try to load existing transcription
      const checkResponse = await fetch(`/api/transcribe-video`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoPath: video.path, checkExisting: true }),
      });
      const checkResult = await checkResponse.json();
      
      if (checkResult.success) {
        // Use existing transcription
        const wordSegmentsResult = convertSegmentsToWords(checkResult.segments);
        const allWords = wordSegmentsResult.flatMap(segment => segment.words);
        setWordSegments(allWords);
        detectFillerWords(checkResult);
        return;
      }
      
      // If no existing transcription, create new one with better model for medical content
      setLoadingStatus('Transcribing video (this may take a few minutes)...');
      const transcribeResponse = await fetch(`/api/transcribe-video`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          videoPath: video.path, 
          model: 'medium', // Better model for medical accuracy
          checkExisting: false 
        }),
      });
      const transcribeResult = await transcribeResponse.json();
      
      if (transcribeResult.success) {
        const wordSegmentsResult = convertSegmentsToWords(transcribeResult.segments);
        const allWords = wordSegmentsResult.flatMap(segment => segment.words);
        setWordSegments(allWords);
        detectFillerWords(transcribeResult);
      } else {
        throw new Error(transcribeResult.error);
      }
    } catch (error) {
      console.error("Transcription loading failed:", error);
      setError('Failed to transcribe video. Please try again.');
    }
  };

  const detectFillerWords = async (transcription: any) => {
    try {
      const response = await fetch('/api/detect-filler-words', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcription }),
      });
      const result = await response.json();
      if (result.success) {
        setFillerWords(result.fillerWords);
      }
    } catch (error) {
      console.error('Filler word detection failed:', error);
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      const video = videoRef.current;
      const currentTime = video.currentTime;
      setCurrentTime(currentTime);

      const activeSegment = textSegments.find(s => currentTime >= s.start && currentTime < s.end);
      if (activeSegment && selectedClip !== activeSegment.id) {
          setSelectedClip(activeSegment.id);
      }
    }
  };

  const handleDurationChange = () => {
    if (videoRef.current) setDuration(videoRef.current.duration);
  };

  // Video playback management for clip jumping
  useEffect(() => {
    if (!isPlaying || !videoRef.current || isSeeking) return;
  
    const checkTime = () => {
      const videoEl = videoRef.current;
      if (!videoEl) return;
  
      const currentTime = videoEl.currentTime;
      if (currentTime === null) return;
  
      const currentClipIndex = playbackClips.findIndex(c => currentTime >= c.start && currentTime < c.end);
      
      if (currentClipIndex !== -1) {
        const currentClip = playbackClips[currentClipIndex];
        if (currentTime >= currentClip.end - 0.05) {
          const nextClip = playbackClips[currentClipIndex + 1];
          if (nextClip) {
            setIsSeeking(true);
            videoEl.currentTime = nextClip.start;
          } else {
            setIsPlaying(false);
          }
        }
      } else if (isPlaying) {
        const nextClip = playbackClips.find(c => c.start > currentTime);
        if (nextClip) {
          setIsSeeking(true);
          videoEl.currentTime = nextClip.start;
        } else {
          if (playbackClips.length > 0 && currentTime < playbackClips[0].start) {
            setIsSeeking(true);
            videoEl.currentTime = playbackClips[0].start;
          } else {
            setIsPlaying(false);
          }
        }
      }
    };
  
    const interval = setInterval(checkTime, 50);
    return () => clearInterval(interval);
  }, [isPlaying, playbackClips, isSeeking]);

  // Smart clip loading - only load clips that are visible or near visible area
  const loadClipBatch = useCallback(async (startIndex: number, endIndex: number) => {
    const clipsToLoad = clips.slice(startIndex, endIndex).filter(clip => !loadedClips.has(clip.id));
    
    if (clipsToLoad.length === 0) return;

    console.log(`Loading clip batch: ${startIndex}-${endIndex} (${clipsToLoad.length} clips)`);
    
    // Simulate async clip loading (replace with actual clip data loading)
    const loadPromises = clipsToLoad.map(async (clip) => {
      // Add small delay to simulate loading
      await new Promise(resolve => setTimeout(resolve, 50));
      return clip;
    });

    try {
      const loadedClipData = await Promise.all(loadPromises);
      
      setLoadedClips(prev => {
        const newSet = new Set(prev);
        loadedClipData.forEach(clip => newSet.add(clip.id));
        return newSet;
      });

      setClipCache(prev => {
        const newCache = new Map(prev);
        loadedClipData.forEach(clip => newCache.set(clip.id, clip));
        return newCache;
      });
    } catch (error) {
      console.error('Error loading clip batch:', error);
    }
  }, [clips, loadedClips]);

  // Handle timeline scroll for progressive loading
  const handleTimelineScroll = useCallback((event: React.UIEvent<HTMLDivElement>) => {
    // This function is for timeline clip loading, not script scrolling
    return;

    const container = event.currentTarget;
    const scrollLeft = container.scrollLeft;
    const containerWidth = container.clientWidth;
    const totalWidth = container.scrollWidth;

    // Calculate which clips should be visible based on scroll position
    const totalClips = clips.length;
    const clipsPerScreen = Math.ceil(containerWidth / 100); // Assuming ~100px per clip
    const scrollPercent = scrollLeft / (totalWidth - containerWidth);
    const centerClipIndex = Math.floor(scrollPercent * totalClips);
    
    // Load clips in a window around the visible area (with buffer)
    const buffer = Math.max(5, clipsPerScreen);
    const newStart = Math.max(0, centerClipIndex - buffer);
    const newEnd = Math.min(totalClips, centerClipIndex + clipsPerScreen + buffer);

    if (newStart !== visibleClipRange.start || newEnd !== visibleClipRange.end) {
      setVisibleClipRange({ start: newStart, end: newEnd });
      loadClipBatch(newStart, newEnd);
    }
  }, [clips.length, visibleClipRange, loadClipBatch]);

  // Initial load of first batch
  useEffect(() => {
    if (clips.length > 0 && loadedClips.size === 0) {
      loadClipBatch(0, Math.min(10, clips.length));
    }
  }, [clips.length, loadedClips.size, loadClipBatch]);

  // Cleanup old clips from cache to prevent memory bloat
  useEffect(() => {
    const maxCacheSize = 50;
    if (clipCache.size > maxCacheSize) {
      const sortedEntries = Array.from(clipCache.entries());
      const toKeep = sortedEntries.slice(-maxCacheSize);
      setClipCache(new Map(toKeep));
      
      const keptIds = new Set(toKeep.map(([id]) => id));
      setLoadedClips(prev => new Set(Array.from(prev).filter(id => keptIds.has(id))));
    }
  }, [clipCache.size]);

  // --- Event Handlers ---
  const handleWordClick = (e: React.MouseEvent, word: Word) => {
    // Highlight the corresponding clip
    if (word.clipId) {
      setSelectedClip(word.clipId);
    }
    // Seek to the word's position
    seekTo(word.start);
  };

  const handleWordRightClick = (e: React.MouseEvent, word: Word) => {
    e.preventDefault();
    setContextMenu({
      top: e.clientY,
      left: e.clientX,
      word: word
    });
  };

  const handleTextSelection = () => {
    const selection = window.getSelection();
    if (selection && selection.toString().trim()) {
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      
      setSelectionText(selection.toString().trim());
      setSelectionMenu({
        top: rect.top - 40,
        left: rect.left + rect.width / 2 - 50,
        selectedText: selection.toString().trim()
      });
      
      // Extract word timing information for selection
      const selectedElements = range.cloneContents().querySelectorAll('[data-word-id]');
      if (selectedElements.length > 0) {
        const firstWordId = selectedElements[0].getAttribute('data-word-id');
        const lastWordId = selectedElements[selectedElements.length - 1].getAttribute('data-word-id');
        
        const firstWord = wordSegments.find(w => w.id === firstWordId);
        const lastWord = wordSegments.find(w => w.id === lastWordId);
        
        if (firstWord && lastWord) {
          setSelectionRange({
            start: firstWord.start,
            end: lastWord.end
          });
        }
      }
    } else {
      setSelectionMenu(null);
      setSelectionRange(null);
      setSelectionText('');
    }
  };

  const handleDeleteSelection = useCallback(() => {
    if (!selectionRange) return;
    
    saveState();
    
    const { start: deleteStart, end: deleteEnd } = selectionRange;
    const deleteDuration = deleteEnd - deleteStart;
    
    // Update word segments to remove selected text
    const updatedWordSegments = wordSegments.map(word => {
      if (word.start >= deleteStart && word.end <= deleteEnd) {
        // Word is entirely within selection - mark for removal
        return { ...word, isDeleted: true } as Word & { isDeleted: boolean };
      } else if (word.start < deleteStart && word.end > deleteEnd) {
        // Word spans the selection - this is complex, keep the word but mark timing change
        return { ...word, needsRetiming: true } as Word & { needsRetiming: boolean };
      } else if (word.start >= deleteEnd) {
        // Word is after selection - shift timing back
        return { 
          ...word, 
          start: word.start - deleteDuration, 
          end: word.end - deleteDuration 
        };
      }
      return word;
    }).filter(word => !(word as any).isDeleted);
    
    setWordSegments(updatedWordSegments);
    
    // Handle video clip cutting with proper non-destructive editing
    const updatedClips = clips.map(clip => {
      if (clip.start >= deleteStart && clip.end <= deleteEnd) {
        // Clip is entirely within selection - mark as skipped (non-destructive)
        return { ...clip, isSkipped: true, skipReason: 'text-cut' };
      } else if (clip.start < deleteStart && clip.end > deleteEnd) {
        // Clip spans the selection - split it into two clips
        const firstPart = { 
          ...clip, 
          end: deleteStart, 
          duration: deleteStart - clip.start,
          id: `${clip.id}_pre_cut`
        };
        const secondPart = { 
          ...clip, 
          id: `${clip.id}_post_cut`, 
          start: deleteStart, 
          end: clip.end - deleteDuration, 
          duration: clip.end - deleteEnd,
          originalStart: deleteEnd // Store original timing for restoration
        };
        return [firstPart, secondPart];
      } else if (clip.start < deleteStart && clip.end > deleteStart && clip.end <= deleteEnd) {
        // Clip starts before and ends within selection - trim end
        return { 
          ...clip, 
          end: deleteStart, 
          duration: deleteStart - clip.start,
          originalEnd: clip.end // Store original timing for restoration
        };
      } else if (clip.start >= deleteStart && clip.start < deleteEnd && clip.end > deleteEnd) {
        // Clip starts within and ends after selection - trim start and shift
        return { 
          ...clip, 
          start: deleteStart, 
          end: clip.end - deleteDuration, 
          duration: clip.end - deleteEnd,
          originalStart: clip.start // Store original timing for restoration
        };
      } else if (clip.start >= deleteEnd) {
        // Clip is after selection - shift timing back
        return { 
          ...clip, 
          start: clip.start - deleteDuration, 
          end: clip.end - deleteDuration 
        };
      }
      return clip;
    }).flat();
    
    setClips(updatedClips);
    setSelectionRange(null);
    setSelectionMenu(null);
  }, [clips, selectionRange, saveState, wordSegments]);

  const handleCorrectSelection = useCallback(() => {
    if (!selectionRange || !selectionText) return;
    
    // Find the first word in the selection to use as anchor for correction box
    const firstWord = wordSegments.find(w => w.start >= selectionRange.start && w.start < selectionRange.end);
    
    if (firstWord) {
      // Position correction box near the selection
      const rect = selectionMenu ? { top: selectionMenu.top + 40, left: selectionMenu.left } : { top: 100, left: 100 };
      
      setCorrectionBox({
        word: { ...firstWord, text: selectionText }, // Use selection text
        top: rect.top,
        left: rect.left
      });
    }
    
    setSelectionMenu(null);
  }, [selectionRange, selectionText, selectionMenu, wordSegments]);

  const handleAddCaptionsToSelection = useCallback(() => {
    if (!selectionRange || !selectionText) return;
    
    // Show caption style selector
    setCaptionStyleMenuPosition({
      top: selectionMenu?.top || 100,
      left: selectionMenu?.left || 100
    });
    setShowCaptionStyleMenu(true);
    setSelectionMenu(null);
  }, [selectionRange, selectionText, selectionMenu]);

  const createCaptionWithStyle = useCallback((style: Caption['style']) => {
    if (!selectionRange || !selectionText) return;
    
    const newStart = selectionRange.start;
    const newEnd = selectionRange.end;
    
    // Check for overlapping or adjacent captions (more generous merging)
    const overlappingCaptions = captions.filter(caption => 
      caption.style === style && (
        // New selection overlaps with existing caption
        (newStart <= caption.end && newEnd >= caption.start) ||
        // New selection is adjacent to existing caption (within 1 second for seamless merging)
        (Math.abs(newStart - caption.end) <= 1.0) ||
        (Math.abs(newEnd - caption.start) <= 1.0)
      )
    );
    
    if (overlappingCaptions.length > 0) {
      // Merge all overlapping captions into one seamless caption
      const allStarts = [newStart, ...overlappingCaptions.map(c => c.start)];
      const allEnds = [newEnd, ...overlappingCaptions.map(c => c.end)];
      const mergedStart = Math.min(...allStarts);
      const mergedEnd = Math.max(...allEnds);
      
      console.log('🔄 [CAPTION] Merging', overlappingCaptions.length + 1, 'caption segments seamlessly');
      toast.success(`Merged ${overlappingCaptions.length + 1} caption segments`, {
        duration: 2000,
        icon: '🔄',
        style: {
          background: '#1f2937',
          color: '#fff',
        }
      });
      
      // Get merged text content
      const mergedText = getTextInRange(mergedStart, mergedEnd);
      
      // Create new merged caption with first overlapping caption's ID
      const mergedCaption: Caption = {
        id: overlappingCaptions[0]?.id || `caption_${Date.now()}`,
        text: mergedText,
        start: mergedStart,
        end: mergedEnd,
        style: style
      };
      
      // Remove all overlapping captions and add the merged one
      setCaptions(prev => [
        ...prev.filter(caption => !overlappingCaptions.includes(caption)),
        mergedCaption
      ]);
      
      // Update captioned ranges
      setCaptionedRanges(prev => [
        ...prev.filter(range => !overlappingCaptions.some(cap => cap.id === range.captionId)),
        { start: mergedStart, end: mergedEnd, captionId: mergedCaption.id }
      ]);
      
      // Update in layered timeline
      if (showLayeredTimeline) {
        addCaptionFromData({
          text: mergedText,
          start: mergedStart,
          end: mergedEnd,
          style: style
        });
      }
      
    } else {
      // No overlap, create new caption
      console.log('✨ [CAPTION] Creating new caption segment');
      toast.success('Caption added', {
        duration: 1500,
        icon: '✨',
        style: {
          background: '#1f2937',
          color: '#fff',
        }
      });
      
      const newCaption: Caption = {
        id: `caption_${Date.now()}`,
        text: selectionText,
        start: newStart,
        end: newEnd,
        style: style
      };
      
      setCaptions(prev => [...prev, newCaption]);
      
      // Add to captioned ranges for highlighting
      setCaptionedRanges(prev => [...prev, { 
        start: newStart, 
        end: newEnd, 
        captionId: newCaption.id 
      }]);
      
      // Add to layered timeline
      if (showLayeredTimeline) {
        addCaptionFromData({
          text: selectionText,
          start: newStart,
          end: newEnd,
          style: style
        });
      }
    }
    
    setShowCaptionStyleMenu(false);
    setSelectionRange(null);
    setSelectionText('');
  }, [selectionRange, selectionText, captions, showLayeredTimeline, addCaptionFromData]);
  
  // Helper function to get text content within a time range
  const getTextInRange = useCallback((start: number, end: number): string => {
    if (!textSegments) return selectionText || '';
    
    const relevantSegments = textSegments.filter(segment => 
      segment.start < end && segment.end > start
    );
    
    return relevantSegments
      .map(segment => segment.text.trim())
      .join(' ')
      .trim() || selectionText || '';
  }, [textSegments, selectionText]);

  // Layered timeline export handler
  const handleLayeredExport = useCallback(async () => {
    if (isExporting) return;
    
    try {
      const result = await exportLayeredVideo(video.path, {
        format: 'mp4',
        quality: 'high',
        resolution: '1080p',
        includeAudio: true,
        enhanceAudio: useStudioSound,
        includeSubtitles: captions.length > 0,
        subtitleStyle: 'burned-in'
      });

      if (result.success) {
        alert(`Layered export completed successfully!\n\nOutput: ${result.outputPath}\n\nStats:\n- Total tracks: ${result.stats?.totalTracks || 0}\n- Video tracks: ${result.stats?.videoTracks || 0}\n- Caption tracks: ${result.stats?.captionTracks || 0}\n- B-roll tracks: ${result.stats?.brollTracks || 0}`);
      } else {
        setError(`Layered export failed: ${result.error}`);
      }
    } catch (error) {
      setError(`Export error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }, [video.path, exportLayeredVideo, isExporting, useStudioSound, captions.length]);

  const handleStitchDrag = useCallback((clipId: string, newTime: number) => {
    saveState();
    
    const clipIndex = clips.findIndex(c => c.id === clipId);
    if (clipIndex === -1) return;
    
    const currentClip = clips[clipIndex];
    const timeDelta = newTime - currentClip.end;
    
    setClips(prevClips => {
      return prevClips.map((clip, index) => {
        if (index === clipIndex) {
          // Adjust the current clip's end time
          return { ...clip, end: newTime, duration: newTime - clip.start };
        } else if (index > clipIndex) {
          // Ripple subsequent clips
          return { 
            ...clip, 
            start: clip.start + timeDelta, 
            end: clip.end + timeDelta 
          };
        }
        return clip;
      });
    });
  }, [saveState, clips]);

  const handleClipMove = useCallback((clipId: string, newPosition: number) => {
    saveState();
    
    setClips(prevClips => {
      const clipIndex = prevClips.findIndex(c => c.id === clipId);
      if (clipIndex === -1) return prevClips;
      
      const currentClip = prevClips[clipIndex];
      const duration = currentClip.end - currentClip.start;
      const timeDelta = newPosition - currentClip.start;
      
      // Ripple edit: move all subsequent clips
      return prevClips.map((clip, index) => {
        if (index === clipIndex) {
          return { 
            ...clip, 
            start: newPosition, 
            end: newPosition + duration 
          };
        } else if (index > clipIndex && !clip.isSkipped) {
          return { 
            ...clip, 
            start: clip.start + timeDelta, 
            end: clip.end + timeDelta 
          };
        }
        return clip;
      });
    });
  }, [saveState]);

  const handleClipDelete = useCallback((clipId: string) => {
    saveState();
    
    setClips(prevClips => {
      const clipIndex = prevClips.findIndex(c => c.id === clipId);
      if (clipIndex === -1) return prevClips;
      
      const deletedClip = prevClips[clipIndex];
      const deletedDuration = deletedClip.end - deletedClip.start;
      
      // Ripple edit: move all subsequent clips backward
      return prevClips.map((clip, index) => {
        if (index === clipIndex) {
          return { ...clip, isSkipped: true };
        } else if (index > clipIndex && !clip.isSkipped) {
          return { 
            ...clip, 
            start: clip.start - deletedDuration, 
            end: clip.end - deletedDuration 
          };
        }
        return clip;
      });
    });
  }, [saveState]);

  const handleClipSplit = useCallback((clipId: string, timestamp: number) => {
    // Only allow splitting at the current playhead position
    if (Math.abs(timestamp - currentTime) > 0.1) {
      console.log('❌ [SPLIT] Can only split at playhead position. Current:', currentTime, 'Requested:', timestamp);
      return;
    }
    
    saveState();
    
    const clipIndex = clips.findIndex(c => c.id === clipId);
    if (clipIndex === -1) {
      console.log('❌ [SPLIT] Clip not found:', clipId);
      return;
    }
    
    const currentClip = clips[clipIndex];
    console.log('🔪 [SPLIT] Found clip:', currentClip);
    
    // Ensure split time is within clip bounds and prevent tiny clips
    const minClipDuration = 0.5;
    const splitTime = Math.max(currentClip.start + minClipDuration, 
                     Math.min(currentClip.end - minClipDuration, timestamp));
  
    if (splitTime <= currentClip.start || splitTime >= currentClip.end) {
      console.log('❌ [SPLIT] Split time out of valid range');
      return;
    }
    
    // Calculate source positions for proper mapping
    const sourceTimeOffset = currentTime - currentClip.start;
    const sourceSplitTime = currentClip.sourceStart + sourceTimeOffset;
    
    const firstPart = { 
      ...currentClip, 
      end: splitTime, 
      duration: splitTime - currentClip.start,
      sourceEnd: sourceSplitTime
    };
    const secondPart = { 
      ...currentClip, 
      id: `${currentClip.id}_split_${Date.now()}`, 
      start: splitTime, 
      duration: currentClip.end - splitTime,
      sourceStart: sourceSplitTime,
      originalIndex: currentClip.originalIndex + 0.5 // Maintain ordering
    };
    
    console.log('✅ [SPLIT] Created clips:', firstPart, secondPart);
    
    setClips(prevClips => [
      ...prevClips.slice(0, clipIndex),
      firstPart,
      secondPart,
      ...prevClips.slice(clipIndex + 1)
    ]);
    
    // Update selected clip to first part
    setSelectedClip(firstPart.id);
  }, [clips, saveState, currentTime]);

  const handleClipTrim = (clipId: string, handle: 'left' | 'right', newTime: number) => {
    const clip = clips.find(c => c.id === clipId);
    if (!clip) return;

    // Prevent trimming beyond the original clip's boundaries
    const newValidatedTime = handle === 'left'
      ? Math.max(newTime, clip.sourceStart)
      : Math.min(newTime, clip.sourceEnd);

    setClips(prev => prev.map(c => {
      if (c.id === clipId) {
        const updatedClip = { ...c };
        if (handle === 'left') {
          updatedClip.start = Math.min(newValidatedTime, updatedClip.end - 0.1); // Ensure start is not after end
        } else {
          updatedClip.end = Math.max(newValidatedTime, updatedClip.start + 0.1); // Ensure end is not before start
        }
        updatedClip.duration = updatedClip.end - updatedClip.start;
        return updatedClip;
      }
      return c;
    }));
  };

  const openBrollPanel = () => {
    setIsBrollPanelOpen(true);
    setContextMenu(null);
  };

  const handleAddBrollClip = (brollData: any) => {
    const newBrollClip: BrollClip = {
      id: `broll_${Date.now()}`,
      start: currentTime,
      end: currentTime + 5, // Default 5 second duration
      url: brollData.url || brollData.video_files?.[0]?.link,
      source: brollData.url ? 'upload' : 'stock'
    };
    
    setBrollClips(prev => [...prev, newBrollClip]);
    setIsBrollPanelOpen(false);
  };

  const handleAddBrollVideo = () => {
    console.log('Add broll video');
  };

  const handleAddBrollImage = () => {
    console.log('Add broll image');
  };

  const handleDeleteAllFillerWords = () => {
    console.log('Delete all filler words');
  };

  const handleReviewFillerWord = (word: string) => {
    // This function should find all instances of a filler word and allow the user to review them.
    // The current implementation is incorrect because `fillerWords` is a simple array of strings.
    // A more advanced implementation would require a different data structure for `fillerWords`.
    console.log('Reviewing filler word:', word);
  };

  const handlePaceChange = useCallback(async (pace: number) => {
    console.log('⚡ [PACE] Applying pace change:', pace);
    setCurrentPace(pace);
    
    if (!originalSilenceAnalysis) {
      console.log('❌ [PACE] No original silence analysis available');
      return;
    }
    
    saveState();
    
    // Convert pace to silence threshold adjustment
    // Pace range: -2.1 to -0.1
    // More negative = more aggressive silence removal
    const baseThreshold = 0.05; // Original threshold
    const thresholdAdjustment = Math.abs(pace + 1.6) * 0.02; // Adjust threshold based on pace
    const newThreshold = Math.max(0.01, baseThreshold + thresholdAdjustment);
    
    console.log('⚡ [PACE] New threshold:', newThreshold);
    
    try {
      // Re-analyze silence with new threshold
      const response = await fetch('/api/analyze-silence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          videoPath: video.path,
          threshold: newThreshold,
          enableCuts: true,
          margin: silenceMargin
        })
      });
      
      const result = await response.json();
      
      if (result.success) {
        console.log('⚡ [PACE] Re-analysis complete:', result.analysis);
        
        // Generate new clips based on new silence analysis
        const newClips = generateClipsFromSilenceAnalysis(originalClips, result.analysis);
        setClips(newClips);
        
        // Update the video analysis
        setVideoAnalysis(prev => prev ? {
          ...prev,
          silenceSegments: result.analysis.silenceSegments,
          timeSaved: result.analysis.timeSaved
        } : null);
        
      } else {
        console.error('❌ [PACE] Re-analysis failed:', result.error);
      }
    } catch (error) {
      console.error('❌ [PACE] Error during re-analysis:', error);
    }
  }, [video.path, originalSilenceAnalysis, originalClips, silenceMargin, saveState]);

  // Add zoom change handler
  const handleZoomChange = useCallback((newZoom: number) => {
    setZoomLevel(newZoom);
  }, []);

  // Add global scroll wheel zoom
  useEffect(() => {
    const handleGlobalWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const delta = e.deltaY > 0 ? -0.5 : 0.5;
        setZoomLevel(prev => Math.max(1, Math.min(10, prev + delta)));
      }
    };

    window.addEventListener('wheel', handleGlobalWheel, { passive: false });
    return () => window.removeEventListener('wheel', handleGlobalWheel);
  }, []);

  const navigateFillerWordInstances = (direction: 'prev' | 'next') => {
    // This function is also dependent on a more advanced filler word data structure.
    // For now, it will just log the action.
    console.log(`Navigating to ${direction} filler word instance.`);
  };

  const handleCorrectSegmentWithAI = async (word: Word) => {
    if (!word.segmentId) return;
    
    setIsCorrecting(true);
    setContextMenu(null);
    
    try {
      const response = await fetch('/api/gpt-correct-segment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          videoPath: video.path,
          segmentId: word.segmentId 
        }),
      });
      
      const result = await response.json();
      if (result.success) {
        // Update word segments with corrected text
        setWordSegments(prev => prev.map(w => 
          w.segmentId === word.segmentId ? { ...w, text: result.correctedText } : w
        ));
      }
    } catch (error) {
      console.error('AI correction failed:', error);
    } finally {
      setIsCorrecting(false);
    }
  };

  const handleAddToDictionary = (word: Word) => {
    console.log('Add to dictionary:', word.text);
    setContextMenu(null);
  };

  const handleClipGroupClick = useCallback((clipId: string | null) => {
    if (clipId) {
      setSelectedClip(clipId);
      const clip = clips.find(c => c.id === clipId);
      if (clip) {
        seekTo(clip.start);
        
        // Scroll to corresponding script location
        const clipWords = wordSegments.filter(word => 
          word.start >= clip.sourceStart && word.start < clip.sourceEnd
        );
        
        if (clipWords.length > 0 && scriptContainerRef.current) {
          // Find the first word in this clip
          const firstWord = clipWords[0];
          
          // Find the DOM element for this word
          const wordElement = document.querySelector(`[data-word-id="${firstWord.id}"]`);
          if (wordElement) {
            console.log('📜 [SCRIPT-SCROLL] Found word element, scrolling to:', wordElement);
            
            // Scroll the script container to show this word
            const containerRect = scriptContainerRef.current.getBoundingClientRect();
            const wordRect = wordElement.getBoundingClientRect();
            
            // Calculate the scroll position to center the word
            const scrollTop = scriptContainerRef.current.scrollTop + 
                              (wordRect.top - containerRect.top) - 
                              (containerRect.height / 2);
            
            scriptContainerRef.current.scrollTo({
              top: scrollTop,
              behavior: 'smooth'
            });
          }
        }
      }
    }
  }, [clips, seekTo, wordSegments]);

  const handleClipClick = useCallback((clipId: string) => {
    console.log('🎯 [CLIP-CLICK] Clicked on clip:', clipId);
    
    // Set selected clip
    setSelectedClip(clipId);
    
    // Find the corresponding segment
    const segment = textSegments.find(s => s.id === clipId);
    if (segment) {
      seekTo(segment.start);
      
      // Scroll to corresponding script location
      const segmentElement = document.querySelector(`[data-segment-id="${clipId}"]`);
      if (segmentElement && scriptContainerRef.current) {
        console.log('📜 [SCRIPT-SCROLL] Found segment element, scrolling to:', segmentElement);
        
        // Scroll the script container to show this segment
        const containerRect = scriptContainerRef.current.getBoundingClientRect();
        const segmentRect = segmentElement.getBoundingClientRect();
        
        // Calculate the scroll position to center the segment
        const scrollTop = scriptContainerRef.current.scrollTop + 
                          (segmentRect.top - containerRect.top) - 
                          (containerRect.height / 2);
        
        scriptContainerRef.current.scrollTo({
          top: scrollTop,
          behavior: 'smooth'
        });
      }
    }
  }, [textSegments, seekTo]);

  const handleSegmentClick = useCallback((segmentId: string) => {
    console.log('📜 [SEGMENT-CLICK] Clicked on segment:', segmentId);
    
    // Set selected clip to match the segment
    setSelectedClip(segmentId);
    
    // Find the segment and seek to it
    const segment = textSegments.find(s => s.id === segmentId);
    if (segment) {
      seekTo(segment.start);
    }
  }, [textSegments, seekTo]);

  const handleCommitCorrection = (correctedText: string) => {
    if (!correctionBox) return;
    
    setWordSegments(prev => prev.map(w => 
      w.id === correctionBox.word.id ? { ...w, text: correctedText } : w
    ));
    setCorrectionBox(null);
  };

  // --- Keyboard Shortcuts ---
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.metaKey || e.ctrlKey) {
        if (e.key === 'z') {
          e.preventDefault();
          handleUndo();
        }
        return;
      }

      switch (e.key) {
        case ' ':
          e.preventDefault();
          togglePlayPause();
          break;
        case '=':
        case '+':
          e.preventDefault();
          setZoomLevel(z => Math.min(10, z + 0.5));
          break;
        case '-':
          e.preventDefault();
          setZoomLevel(z => Math.max(1, z - 0.5));
          break;
        case 'Backspace':
        case 'Delete':
          if (selectionRange) {
            e.preventDefault();
            handleDeleteSelection();
          }
          break;
        default:
          break;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [togglePlayPause, handleUndo, selectionRange, handleDeleteSelection]);

  const formatTime = (seconds: number) => new Date(seconds * 1000).toISOString().substr(14, 8);

  // Gling-style hotkeys
  useHotkeys('s', () => handleSplit(), { preventDefault: true });
  useHotkeys('space', () => togglePlayPause(), { preventDefault: true });
  useHotkeys('cmd+z, ctrl+z', () => handleUndo(), { preventDefault: true });
  useHotkeys('plus', () => setZoomLevel(z => Math.min(3, z + 0.2)), { preventDefault: true });
  useHotkeys('minus', () => setZoomLevel(z => Math.max(0.1, z - 0.2)), { preventDefault: true });

  // --- UI Rendering ---
  if (isInitializing) {
    return (
      <div className="h-screen bg-[#1a1a1a] flex items-center justify-center text-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p>{loadingStatus || 'Loading...'}</p>
        </div>
      </div>
    );
  }
  
  const videoSrc = `/api/serve-video?path=${encodeURIComponent(useStudioSound && studioSoundPath ? studioSoundPath : video.path)}`;

  return (
    <div className="h-screen bg-[#1a1a1a] text-white flex flex-col font-sans overflow-hidden">
      {/* Editor Layout */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Section - Video and Script Side by Side */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Panel - Video Player */}
          <div className="flex-1 flex flex-col bg-gray-800 overflow-hidden">
          {/* Video Player - Fills remaining space */}
          <div className="flex-1 bg-black flex items-center justify-center relative overflow-hidden">
            <video
              ref={videoRef}
              className="max-w-full max-h-full"
              src={videoSrc}
              onLoadedMetadata={handleDurationChange}
              onTimeUpdate={handleTimeUpdate}
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
            />
            
            {/* Caption Overlay */}
            {captions.map((caption) => {
              const isActive = currentTime >= caption.start && currentTime <= caption.end;
              
              return (
                <DynamicCaption
                  key={caption.id}
                  text={caption.text}
                  style={caption.style}
                  isActive={isActive}
                />
              );
            })}
            
            <div className="absolute bottom-4 left-4 right-4 flex items-center justify-center">
              <button
                onClick={togglePlayPause}
                className="bg-black bg-opacity-50 text-white rounded-full p-3 hover:bg-opacity-75"
              >
                {isPlaying ? <Pause size={32} /> : <Play size={32} />}
              </button>
            </div>
          </div>

          {/* Control Bar - Gling Style */}
          <div className="flex-shrink-0 bg-gray-800 border-t border-gray-700 px-4 py-2">
            <div className="flex items-center justify-between">
              {/* Left Controls */}
              <div className="flex items-center space-x-3">
                {/* Play / Pause */}
                <button
                  onClick={togglePlayPause}
                  className="flex items-center gap-1 px-3 py-1 bg-purple-500/20 hover:bg-purple-500/40 text-purple-300 border border-purple-500/40 text-xs rounded-md transition-colors"
                  title={isPlaying ? 'Pause (Space)' : 'Play (Space)'}
                >
                  {isPlaying ? <Pause size={14} /> : <Play size={14} />}
                  <span className="font-medium">{isPlaying ? 'Pause' : 'Play'}</span>
                </button>

                {/* Split */}
                <button
                  onClick={handleSplit}
                  className="flex items-center gap-1 px-3 py-1 bg-blue-500/20 hover:bg-blue-500/40 text-blue-300 border border-blue-500/40 text-xs rounded-md transition-colors"
                  title={showLayeredTimeline ? 'Split all items at playhead (S)' : 'Split clip at playhead (S)'}
                >
                  <Scissors size={14} />
                  <span className="font-medium">Split</span>
                  {showLayeredTimeline && (
                    <span className="text-[10px] opacity-75">(All)</span>
                  )}
                </button>
                
                <div className="flex items-center space-x-2">
                  <Gauge size={16} className="text-gray-400" />
                  <span className="text-sm text-gray-300">Pace:</span>
                  <input
                    type="range"
                    min="0.5"
                    max="2.0"
                    step="0.1"
                    value={Math.abs(currentPace + 1.1)}
                    onChange={(e) => {
                      const normalizedValue = parseFloat(e.target.value);
                      const paceValue = -(normalizedValue + 0.6); // Convert back to internal range
                      handlePaceChange(paceValue);
                    }}
                    className="w-24 h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer slider-thumb"
                  />
                  <span className="text-xs text-gray-400 min-w-[3rem]">
                    {Math.abs(currentPace + 1.1).toFixed(1)}x
                  </span>
                </div>
              </div>

              {/* Center Time Display */}
              <div className="flex items-center space-x-2 text-sm text-gray-300">
                <span>{Math.floor(currentTime / 60)}:{String(Math.floor(currentTime % 60)).padStart(2, '0')}</span>
                <span className="text-gray-500">/</span>
                <span>{Math.floor(duration / 60)}:{String(Math.floor(duration % 60)).padStart(2, '0')}</span>
              </div>

              {/* Right Controls */}
              <div className="flex items-center space-x-3">
                <button
                  onClick={handleExport}
                  disabled={clips.length === 0 || loadingStatus.includes('Exporting')}
                  className="flex items-center gap-1 px-3 py-1 bg-green-500/20 hover:bg-green-500/40 border border-green-500/40 text-green-300 disabled:opacity-40 text-xs rounded-md transition-colors"
                  title="Export edited video"
                >
                  <Download size={14} />
                  <span className="font-medium">{loadingStatus.includes('Exporting') ? 'Exporting...' : 'Export'}</span>
                </button>
                
                <div className="h-4 w-px bg-gray-600"></div>
                
                <button
                  onClick={() => setZoomLevel(Math.max(0.1, zoomLevel - 0.2))}
                  className="px-2 py-1 bg-gray-700 hover:bg-gray-600 text-white text-sm rounded"
                >
                  -
                </button>
                <span className="text-xs text-gray-400 min-w-[3rem] text-center">
                  {Math.round(zoomLevel * 100)}%
                </span>
                <button
                  onClick={() => setZoomLevel(Math.min(3, zoomLevel + 0.2))}
                  className="px-2 py-1 bg-gray-700 hover:bg-gray-600 text-white text-sm rounded"
                >
                  +
                </button>
              </div>
            </div>
          </div>

        </div>

        {/* Right Panel - Text Editor */}
        <div className="flex-shrink-0 w-[600px] flex flex-col bg-gray-800 border-l border-gray-700 overflow-hidden">
          {/* Tab Navigation - Script only */}
          <div className="flex-shrink-0 flex bg-gray-900 border-b border-gray-700">
            <button
              className="px-4 py-2 text-sm font-medium border-b-2 border-blue-500 text-blue-400"
            >
              Script
            </button>
          </div>

          {/* Tab Content - Script only */}
          <div className="flex-1 overflow-hidden">
            <div className="h-full flex flex-col">
              {/* Text Segments - Correspond to Video Clips */}
              <div 
                ref={scriptContainerRef}
                className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800" 
                onMouseUp={handleTextSelection}
              >
                {textSegments.map((segment, index) => {
                  const isCurrentSegment = currentSegment === index;
                  const isSelected = selectedClip === segment.id;
                  
                  return (
                    <div
                      key={segment.id}
                      data-segment-id={segment.id}
                      className={`p-2 rounded-lg border-2 transition-all duration-200 cursor-pointer ${
                        isCurrentSegment
                          ? 'border-red-500 bg-red-900 bg-opacity-20'
                          : isSelected
                          ? 'border-blue-500 bg-blue-900 bg-opacity-20'
                          : 'border-gray-600 bg-gray-900 hover:border-gray-500'
                      } ${
                        segment.isHighlighted
                          ? 'ring-2 ring-yellow-400'
                          : ''
                      }`}
                      onClick={() => handleSegmentClick(segment.id)}
                    >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-gray-400">
                        Segment {index + 1} • {formatTime(segment.start)} - {formatTime(segment.end)}
                      </span>
                      <span className="text-xs text-gray-500">
                        {segment.duration.toFixed(1)}s
                      </span>
                    </div>
                                         <div className="text-white leading-relaxed">
                       {segment.words.map((word: Word, wordIndex: number) => {
                         const wordKey = `${word.start}-${word.end}`;
                         const isWordDeleted = deletedWords.has(wordKey);
                         const isWordCorrected = correctedWords.get(wordKey);
                         const isCurrentlySpoken = currentSpokenWord && currentSpokenWord.start === word.start && currentSpokenWord.end === word.end;
                         const isCaptioned = captionedRanges.some(range => 
                           word.start >= range.start && word.end <= range.end
                         );
                         const displayText = isWordCorrected || word.text;
                        
                        return (
                          <span
                            key={wordIndex}
                            className={`inline-block mr-1 px-1 rounded transition-all duration-150 ${
                              isCurrentlySpoken
                                ? 'bg-yellow-400 text-black font-semibold shadow-md scale-105'
                                : isCaptioned
                                ? 'bg-green-500 bg-opacity-20 text-green-300 border border-green-500 border-opacity-30'
                                : word.isCut 
                                ? 'line-through text-red-400 bg-red-900 bg-opacity-30' 
                                : isWordDeleted
                                ? 'line-through text-red-400 opacity-50'
                                : isWordCorrected
                                ? 'bg-green-900 bg-opacity-30 text-green-300'
                                : 'hover:bg-blue-900 hover:bg-opacity-30 cursor-pointer'
                            }`}
                            onClick={(e) => {
                              e.stopPropagation();
                              if (videoRef.current) {
                                videoRef.current.currentTime = word.start;
                              }
                            }}
                            onContextMenu={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setContextMenu({
                                word,
                                top: e.clientY,
                                left: e.clientX
                              });
                            }}
                            title={`${word.start.toFixed(1)}s - ${word.end.toFixed(1)}s`}
                          >
                            {displayText}
                          </span>
                        );
                      })}
                    </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
        </div>



        {/* Timeline - Full Width */}
        <div className="flex-shrink-0 h-40 bg-gray-900 border-t border-gray-700">
          {showLayeredTimeline ? (
            <LayeredTimeline
              tracks={tracks}
              duration={duration}
              currentTime={currentTime}
              onTimeUpdate={seekTo}
              zoomLevel={zoomLevel}
              onZoomChange={setZoomLevel}
              isPlaying={isPlaying}
              onPlayPause={togglePlayPause}
              onSeek={seekTo}
              operations={trackOperations}
              thumbnailMap={thumbnailMap}
              waveformData={waveformData}
              onExport={handleLayeredExport}
            />
          ) : (
            <VideoClipTimeline
              clips={clips}
              duration={duration}
              currentTime={currentTime}
              onTimeUpdate={seekTo}
              onClipSelect={setSelectedClip}
              selectedClip={selectedClip}
              zoomLevel={zoomLevel}
              onZoomChange={setZoomLevel}
              isPlaying={isPlaying}
              onPlayPause={togglePlayPause}
              onSeek={seekTo}
              showCuts={showCuts}
              onShowCutsChange={setShowCuts}
              thumbnailMap={thumbnailMap}
              waveformData={waveformData}
              textSegments={textSegments}
              onSegmentClick={handleSegmentClick}
              captions={captions}
            />
          )}
        </div>
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <div
          className="fixed z-50 bg-white border border-gray-300 rounded-md shadow-lg py-1 min-w-[160px]"
          style={{ top: contextMenu.top, left: contextMenu.left }}
          onMouseLeave={() => setContextMenu(null)}
        >
          <button
            onClick={() => {
              const fakeEvent = { stopPropagation: () => {} };
              if (videoRef.current) {
                videoRef.current.currentTime = contextMenu.word.start;
              }
              setContextMenu(null);
            }}
            className="block w-full px-4 py-2 text-left hover:bg-gray-100 text-sm"
          >
            Jump to Word
          </button>
          <button
            onClick={() => {
              const wordKey = `${contextMenu.word.start}-${contextMenu.word.end}`;
              setDeletedWords(prev => new Set([...prev, wordKey]));
              setContextMenu(null);
            }}
            className="block w-full px-4 py-2 text-left hover:bg-gray-100 text-sm text-red-600"
          >
            Delete Word
          </button>
          <button
            onClick={() => {
              setCorrectionBox({
                word: contextMenu.word,
                top: contextMenu.top,
                left: contextMenu.left
              });
              setContextMenu(null);
            }}
            className="block w-full px-4 py-2 text-left hover:bg-gray-100 text-sm"
          >
            Correct Word
          </button>
        </div>
      )}
      
      {/* Selection Menu */}
      {selectionMenu && (
        <div
          className="fixed z-50 bg-gray-800 border border-gray-600 rounded-md shadow-lg py-2 min-w-[160px]"
          style={{ top: selectionMenu.top, left: selectionMenu.left }}
        >
          <button
            onClick={handleAddCaptionsToSelection}
            className="flex items-center w-full px-4 py-2 text-left hover:bg-gray-700 text-sm text-white"
          >
            <Type size={16} className="mr-2" />
            Captions
          </button>
          <button
            onClick={() => {
              // Handle subscribe animation
              console.log('Adding subscribe animation to:', selectionText);
              setSelectionMenu(null);
            }}
            className="flex items-center w-full px-4 py-2 text-left hover:bg-gray-700 text-sm text-white"
          >
            <Sparkles size={16} className="mr-2" />
            Subscribe animation
          </button>
          <button
            onClick={() => {
              // Handle B-roll video
              console.log('Adding B-roll video to:', selectionText);
              setSelectionMenu(null);
            }}
            className="flex items-center w-full px-4 py-2 text-left hover:bg-gray-700 text-sm text-white"
          >
            <Video size={16} className="mr-2" />
            B-roll video
          </button>
          <button
            onClick={() => {
              // Handle B-roll image
              console.log('Adding B-roll image to:', selectionText);
              setSelectionMenu(null);
            }}
            className="flex items-center w-full px-4 py-2 text-left hover:bg-gray-700 text-sm text-white"
          >
            <Image size={16} className="mr-2" />
            B-roll image
          </button>
        </div>
      )}

      {/* Caption Style Selector Menu */}
      {showCaptionStyleMenu && (
        <div
          className="fixed z-50 bg-gray-800 border border-gray-600 rounded-md shadow-lg py-2 min-w-[200px]"
          style={{ top: captionStyleMenuPosition.top, left: captionStyleMenuPosition.left }}
        >
          <div className="px-4 py-2 text-xs text-gray-400 border-b border-gray-600">
            Choose Caption Style
          </div>
          
          {[
            { style: 'typewriter' as const, name: 'Typewriter', icon: '⌨️', desc: 'Types out text character by character' },
            { style: 'bounce' as const, name: 'Bounce', icon: '🏀', desc: 'Bouncy animated letters' },
            { style: 'glow' as const, name: 'Glow', icon: '✨', desc: 'Glowing neon effect' },
            { style: 'karaoke' as const, name: 'Karaoke', icon: '🎤', desc: 'Highlights words as they play' },
            { style: 'pop' as const, name: 'Pop', icon: '💥', desc: 'Pops in with rotation' },
            { style: 'slide' as const, name: 'Slide', icon: '➡️', desc: 'Slides in from the side' },
            { style: 'scale' as const, name: 'Scale', icon: '🔍', desc: 'Scales up dramatically' },
            { style: 'rainbow' as const, name: 'Rainbow', icon: '🌈', desc: 'Animated rainbow background' },
          ].map((option) => (
            <button
              key={option.style}
              onClick={() => createCaptionWithStyle(option.style)}
              className="flex items-center w-full px-4 py-2 text-left hover:bg-gray-700 text-sm text-white"
            >
              <span className="mr-3 text-lg">{option.icon}</span>
              <div className="flex-1">
                <div className="font-medium">{option.name}</div>
                <div className="text-xs text-gray-400">{option.desc}</div>
              </div>
            </button>
          ))}
          
          <div className="border-t border-gray-600 mt-2 pt-2">
            <button
              onClick={() => setShowCaptionStyleMenu(false)}
              className="flex items-center w-full px-4 py-2 text-left hover:bg-gray-700 text-sm text-gray-400"
            >
              <X size={16} className="mr-2" />
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Correction Box */}
      {correctionBox && (
        <CorrectionBox
          word={correctionBox.word}
          top={correctionBox.top}
          left={correctionBox.left}
          onApply={handleCommitCorrection}
          onClose={() => setCorrectionBox(null)}
        />
      )}

      {/* Toast Notifications */}
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3000,
          style: {
            background: '#1f2937',
            color: '#fff',
            border: '1px solid #374151',
          },
        }}
      />
    </div>
  );
};
// Simple Correction Box Component
interface CorrectionBoxProps {
  word: Word;
  top: number;
  left: number;
  onApply: (correctedText: string) => void;
  onClose: () => void;
}

const CorrectionBox: React.FC<CorrectionBoxProps> = ({ word, top, left, onApply, onClose }) => {
  const [text, setText] = useState(word.text);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onApply(text);
  };

  return (
    <div
      className="absolute z-30 bg-white border border-gray-300 rounded-md p-2 shadow-lg"
      style={{ top, left }}
    >
      <form onSubmit={handleSubmit} className="flex items-center space-x-2">
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="border border-gray-300 rounded px-2 py-1 text-sm"
          autoFocus
        />
        <button
          type="submit"
          className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700"
        >
          Apply
        </button>
        <button type="button" onClick={onClose} className="text-gray-400 hover:text-black">
          <X size={16} />
        </button>
      </form>
    </div>
  );
}

// Helper function to generate clips from silence analysis
const generateClipsFromSilenceAnalysis = (originalClips: VideoClip[], silenceAnalysis: any): VideoClip[] => {
  if (!silenceAnalysis?.silenceSegments) {
    return originalClips;
  }
  
  const silenceSegments = silenceAnalysis.silenceSegments;
  const newClips: VideoClip[] = [];
  
  // Create clips by removing silence segments from original clips
  originalClips.forEach(clip => {
    let currentStart = clip.start;
    let clipSegments: Array<{start: number, end: number}> = [];
    
    for (let i = 0; i < silenceSegments.length; i++) {
      const silence = silenceSegments[i];
      
      // If silence is within this clip
      if (silence.start >= clip.start && silence.end <= clip.end) {
        // Add segment before silence
        if (currentStart < silence.start) {
          clipSegments.push({ start: currentStart, end: silence.start });
        }
        currentStart = silence.end;
      }
    }
    
    // Add remaining segment after last silence
    if (currentStart < clip.end) {
      clipSegments.push({ start: currentStart, end: clip.end });
    }
    
    // Create new clips from segments
    clipSegments.forEach((segment, index) => {
      newClips.push({
        ...clip,
        id: `${clip.id}_pace_${index}`,
        start: segment.start,
        end: segment.end,
        duration: segment.end - segment.start
      });
    });
  });
  
  return newClips.sort((a, b) => a.start - b.start);
};

export default VideoEditor;