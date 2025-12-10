'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Pause, Volume2, RotateCcw, Zap, Info, Clock, Scissors, ZoomIn, ZoomOut, SkipForward, FastForward } from 'lucide-react';
import type { ProcessingOptions } from '../types';

interface VideoPreviewProps {
  inputFolder: string;
  options: ProcessingOptions;
  onOptionsChange: (options: ProcessingOptions) => void;
}

interface VideoInfo {
  path: string;
  name: string;
  duration: number;
  size: number;
  width: number;
  height: number;
}

interface AudioAnalysis {
  peaks: number[];
  silenceSegments: Array<{ start: number; end: number }>;
  speechLevel: number;
  recommendedThreshold: number;
  totalSilenceDuration: number;
  estimatedCuts: number;
  timePercentageSaved: number;
}

interface SilenceCut {
  start: number;
  end: number;
  duration: number;
}

export default function VideoPreview({ 
  inputFolder, 
  options, 
  onOptionsChange 
}: VideoPreviewProps) {
  const [firstVideo, setFirstVideo] = useState<VideoInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [audioAnalysis, setAudioAnalysis] = useState<AudioAnalysis | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [showCutPreview, setShowCutPreview] = useState(false);
  const [silenceCuts, setSilenceCuts] = useState<SilenceCut[]>([]);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [zoomOffset, setZoomOffset] = useState(0);
  const [hoveredCut, setHoveredCut] = useState<number | null>(null);
  const [previewMode, setPreviewMode] = useState<'original' | 'cut' | 'full'>('original');
  const [generatingCutPreview, setGeneratingCutPreview] = useState(false);
  const [cutPreviewPath, setCutPreviewPath] = useState<string | null>(null);
  const [generatingFullPreview, setGeneratingFullPreview] = useState(false);
  const [fullPreviewPath, setFullPreviewPath] = useState<string | null>(null);
  const [fullPreviewProgress, setFullPreviewProgress] = useState(0);
  const [fullPreviewStatus, setFullPreviewStatus] = useState('');
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const cutVideoRef = useRef<HTMLVideoElement>(null);
  const fullVideoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();

  // Calculate dynamic aspect ratio based on video dimensions
  const getVideoAspectRatio = () => {
    if (!firstVideo || !firstVideo.width || !firstVideo.height) {
      return 'aspect-video'; // Default to 16:9 if dimensions unknown
    }
    
    const aspectRatio = firstVideo.width / firstVideo.height;
    
    // Common aspect ratios
    if (aspectRatio > 1.7) return 'aspect-video'; // 16:9 or wider (landscape)
    if (aspectRatio > 1.2) return 'aspect-[4/3]'; // 4:3 (landscape)
    if (aspectRatio > 0.8) return 'aspect-square'; // Square-ish
    return 'aspect-[9/16]'; // Vertical/shorts format
  };

  // Get container styles for video preview
  const getVideoContainerStyle = () => {
    if (!firstVideo || !firstVideo.width || !firstVideo.height) {
      return { aspectRatio: '16/9' }; // Default fallback
    }
    
    const aspectRatio = firstVideo.width / firstVideo.height;
    return { aspectRatio: `${firstVideo.width}/${firstVideo.height}` };
  };

  // Fetch first video from the input folder
  useEffect(() => {
    const fetchFirstVideo = async () => {
      console.log('📹 [VIDEO PREVIEW] Fetching first video from:', inputFolder);
      setLoading(true);
      try {
        const response = await fetch('/api/preview-video', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ inputFolder })
        });
        
        console.log('📹 [VIDEO PREVIEW] Response:', {
          ok: response.ok,
          status: response.status
        });
        
        if (response.ok) {
          const videoInfo = await response.json();
          console.log('📹 [VIDEO PREVIEW] Video info received:', videoInfo);
          setFirstVideo(videoInfo);
        } else {
          console.error('📹 [VIDEO PREVIEW] Failed to fetch video - response not ok');
        }
      } catch (error) {
        console.error('📹 [VIDEO PREVIEW] Failed to fetch video:', error);
      } finally {
        console.log('📹 [VIDEO PREVIEW] Loading complete, setting loading to false');
        setLoading(false);
      }
    };

    if (inputFolder) {
      console.log('📹 [VIDEO PREVIEW] inputFolder provided, fetching video');
      fetchFirstVideo();
    } else {
      console.log('📹 [VIDEO PREVIEW] No inputFolder provided');
    }
  }, [inputFolder]);

  // Analyze audio when video loads or threshold changes
  useEffect(() => {
    if (!firstVideo) {
      console.log('🎵 [AUDIO ANALYSIS] No firstVideo, skipping analysis');
      return;
    }

    const analyzeAudio = async () => {
      console.log('🎵 [AUDIO ANALYSIS] Starting audio analysis...', {
        videoPath: firstVideo.path,
        threshold: options.silenceThreshold,
        margin: options.silenceMargin
      });
      
      setAnalyzing(true);
      try {
        const response = await fetch('/api/analyze-audio', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            videoPath: firstVideo.path,
            silenceThreshold: options.silenceThreshold || 0.07,
            smartDetection: options.smartSilenceDetection || false,
            silenceMargin: options.silenceMargin || 0.2
          })
        });
        
        console.log('🎵 [AUDIO ANALYSIS] Response:', {
          ok: response.ok,
          status: response.status
        });
        
        if (response.ok) {
          const analysis = await response.json();
          console.log('🎵 [AUDIO ANALYSIS] Analysis complete:', {
            peaks: analysis.peaks?.length,
            segments: analysis.silenceSegments?.length,
            recommendedThreshold: analysis.recommendedThreshold
          });
          
          setAudioAnalysis(analysis);
          
          // Calculate silence cuts for preview
          const cuts = analysis.silenceSegments
            .filter((segment: any) => segment.end - segment.start > (options.silenceMargin || 0.2))
            .map((segment: any) => ({
              start: segment.start,
              end: segment.end,
              duration: segment.end - segment.start
            }));
          
          console.log('🎵 [AUDIO ANALYSIS] Calculated cuts:', cuts.length);
          setSilenceCuts(cuts);
          
          // Clear existing cut preview when settings change
          if (cutPreviewPath) {
            console.log('🔄 [AUDIO ANALYSIS] Settings changed, clearing old cut preview');
            setCutPreviewPath(null);
            setPreviewMode('original');
          }
        } else {
          console.error('🎵 [AUDIO ANALYSIS] Failed - response not ok');
        }
      } catch (error) {
        console.error('🎵 [AUDIO ANALYSIS] Failed to analyze audio:', error);
      } finally {
        console.log('🎵 [AUDIO ANALYSIS] Analysis complete, setting analyzing to false');
        setAnalyzing(false);
      }
    };

    analyzeAudio();
  }, [firstVideo, options.silenceThreshold, options.smartSilenceDetection, options.silenceMargin]);

  // DISABLED: Auto-generate cut preview after audio analysis completes
  // User must manually click "Silence Cuts" tab to generate preview
  useEffect(() => {
    // Only auto-generate if user is already on the "cut" tab
    if (previewMode === 'cut' && audioAnalysis && silenceCuts.length > 0 && !cutPreviewPath && !generatingCutPreview && firstVideo) {
      console.log('🎬 Auto-generating cut preview after audio analysis (user is on Cuts tab)');
      // Use a timeout to ensure state has settled
      setTimeout(async () => {
        if (!firstVideo || silenceCuts.length === 0) return;
        
        setGeneratingCutPreview(true);
        try {
          const cutsToUse = audioAnalysis?.silenceSegments
            .filter((segment: any) => segment.end - segment.start > (options.silenceMargin || 0.2))
            .map((segment: any) => ({
              start: segment.start,
              end: segment.end,
              duration: segment.end - segment.start
            })) || silenceCuts;

          console.log('🎬 Generating cut preview with current settings:', {
            threshold: options.silenceThreshold,
            margin: options.silenceMargin,
            cuts: cutsToUse.length
          });

          const response = await fetch('/api/preview-video-cuts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              videoPath: firstVideo.path,
              cuts: cutsToUse,
              timestamp: Date.now()
            })
          });
          
          if (response.ok) {
            const result = await response.json();
            setCutPreviewPath(result.previewPath);
            setPreviewMode('cut'); // Auto-switch to cut preview mode
          } else {
            console.error('Failed to generate cut preview');
          }
        } catch (error) {
          console.error('Error generating cut preview:', error);
        } finally {
          setGeneratingCutPreview(false);
        }
      }, 100);
    }
  }, [previewMode, audioAnalysis, silenceCuts.length, cutPreviewPath, generatingCutPreview, firstVideo, options.silenceMargin, options.silenceThreshold]);

  // Generate full render preview with all processing steps
  const generateFullPreview = async () => {
    console.log('🎬 [FULL PREVIEW] generateFullPreview called', {
      hasVideo: !!firstVideo,
      isAlreadyGenerating: generatingFullPreview
    });
    
    if (!firstVideo || generatingFullPreview) {
      console.log('🎬 [FULL PREVIEW] Skipping - no video or already generating');
      return;
    }
    
    console.log('🎬 [FULL PREVIEW] Starting generation...', {
      videoPath: firstVideo.path,
      options
    });
    
    setGeneratingFullPreview(true);
    setFullPreviewProgress(0);
    setFullPreviewStatus('Starting full render...');
    
    try {
      console.log('🎬 [FULL PREVIEW] Fetching /api/preview-full-render...');
      const response = await fetch('/api/preview-full-render', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          videoPath: firstVideo.path,
          options: options,
          timestamp: Date.now()
        })
      });
      
      console.log('🎬 [FULL PREVIEW] Response received:', {
        ok: response.ok,
        status: response.status,
        statusText: response.statusText
      });
      
      if (response.ok) {
        const reader = response.body?.getReader();
        const decoder = new TextDecoder();
        
        console.log('🎬 [FULL PREVIEW] Reader created:', { hasReader: !!reader });
        
        if (reader) {
          let chunkCount = 0;
          while (true) {
            const { done, value } = await reader.read();
            chunkCount++;
            console.log(`🎬 [FULL PREVIEW] Chunk ${chunkCount}:`, { done, hasValue: !!value });
            
            if (done) {
              console.log('🎬 [FULL PREVIEW] Stream complete');
              break;
            }
            
            const chunk = decoder.decode(value);
            console.log('🎬 [FULL PREVIEW] Decoded chunk:', chunk);
            
            const lines = chunk.split('\n').filter(line => line.trim());
            
            for (const line of lines) {
              if (line.startsWith('data: ')) {
                try {
                  const data = JSON.parse(line.slice(6));
                  console.log('🎬 [FULL PREVIEW] Parsed SSE data:', data);
                  
                  if (data.type === 'progress') {
                    console.log('🎬 [FULL PREVIEW] Progress update:', data.progress, data.message);
                    setFullPreviewProgress(data.progress || 0);
                    setFullPreviewStatus(data.message || 'Processing...');
                  } else if (data.type === 'complete') {
                    console.log('🎬 [FULL PREVIEW] Complete!', data.videoPath);
                    setFullPreviewPath(data.videoPath);
                    setFullPreviewProgress(100);
                    setFullPreviewStatus('Complete!');
                    setPreviewMode('full');
                  } else if (data.type === 'error') {
                    console.error('🎬 [FULL PREVIEW] Error:', data.message);
                    setFullPreviewStatus('Error: ' + data.message);
                  }
                } catch (e) {
                  console.error('🎬 [FULL PREVIEW] Failed to parse SSE data:', e, 'Line:', line);
                }
              }
            }
          }
        } else {
          console.error('🎬 [FULL PREVIEW] No reader available');
          setFullPreviewStatus('No reader available');
        }
      } else {
        console.error('🎬 [FULL PREVIEW] Response not OK:', response.status, response.statusText);
        const errorText = await response.text();
        console.error('🎬 [FULL PREVIEW] Error response:', errorText);
        setFullPreviewStatus(`Failed to start rendering: ${response.status}`);
      }
    } catch (error) {
      console.error('🎬 [FULL PREVIEW] Exception caught:', error);
      setFullPreviewStatus('Error occurred during rendering');
    } finally {
      console.log('🎬 [FULL PREVIEW] Finally block - setting generatingFullPreview to false');
      setGeneratingFullPreview(false);
    }
  };

  // Calculate zoom parameters
  const getZoomedRange = () => {
    if (!audioAnalysis || !firstVideo) return { start: 0, end: 1 };
    
    const totalSamples = audioAnalysis.peaks.length;
    const visibleSamples = Math.floor(totalSamples / zoomLevel);
    const maxOffset = Math.max(0, totalSamples - visibleSamples);
    const actualOffset = Math.min(zoomOffset, maxOffset);
    
    return {
      start: actualOffset,
      end: actualOffset + visibleSamples,
      startTime: (actualOffset / totalSamples) * firstVideo.duration,
      endTime: ((actualOffset + visibleSamples) / totalSamples) * firstVideo.duration
    };
  };

  // Draw enhanced waveform with clear cut indicators
  const drawWaveform = useCallback(() => {
    if (!canvasRef.current || !audioAnalysis || !firstVideo) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { width, height } = canvas;
    ctx.clearRect(0, 0, width, height);

    const zoomedRange = getZoomedRange();
    const visiblePeaks = audioAnalysis.peaks.slice(zoomedRange.start, zoomedRange.end);
    
    if (visiblePeaks.length === 0) return;

    const barWidth = width / visiblePeaks.length;
    
    // Draw background grid for better visualization
    ctx.strokeStyle = '#1f2937';
    ctx.lineWidth = 1;
    ctx.globalAlpha = 0.1;
    for (let i = 0; i < 10; i++) {
      const y = (height / 10) * i;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;

    // Draw waveform peaks with enhanced cut visualization
    visiblePeaks.forEach((peak, i) => {
      const globalIndex = zoomedRange.start + i;
      const barHeight = (peak / 1.0) * height * 0.8;
      const x = i * barWidth;
      const y = (height - barHeight) / 2;
      
      // Determine if this segment will be cut
      const time = (globalIndex / audioAnalysis.peaks.length) * firstVideo.duration;
      const cutIndex = silenceCuts.findIndex(cut => time >= cut.start && time <= cut.end);
      const willBeCut = cutIndex !== -1;
      
      // Enhanced color coding with better contrast
      let color = '#10b981'; // Bright green for speech
      let shadowColor = '#065f46'; // Dark green shadow
      
      if (willBeCut) {
        if (hoveredCut === cutIndex) {
          color = '#f59e0b'; // Yellow when hovered
          shadowColor = '#92400e';
        } else {
          color = '#ef4444'; // Bright red for cuts
          shadowColor = '#991b1b';
        }
      } else if (peak < (options.silenceThreshold || 0.07)) {
        color = '#f59e0b'; // Yellow for below threshold but not cut
        shadowColor = '#92400e';
      }
      
      // Draw shadow for depth
      ctx.fillStyle = shadowColor;
      ctx.fillRect(x + 1, y + 1, Math.max(1, barWidth - 1), barHeight);
      
      // Draw main bar
      ctx.fillStyle = color;
      ctx.fillRect(x, y, Math.max(1, barWidth - 1), barHeight);
      
      // Add cut markers at segment boundaries
      if (willBeCut && i > 0) {
        const prevTime = ((globalIndex - 1) / audioAnalysis.peaks.length) * firstVideo.duration;
        const prevWillBeCut = silenceCuts.some(cut => prevTime >= cut.start && prevTime <= cut.end);
        
        if (!prevWillBeCut) {
          // Start of cut
          ctx.strokeStyle = '#dc2626';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x, height);
          ctx.stroke();
          
          // Add cut icon
          ctx.fillStyle = '#dc2626';
          ctx.font = '12px Arial';
          ctx.fillText('✂️', x - 6, 15);
        }
      }
    });

    // Draw current time indicator
    let timeForProgress = currentTime;
    
    // If in cut preview mode, map the cut video time back to original timeline
    if (previewMode === 'cut' && silenceCuts.length > 0) {
      let mappedTime = 0;
      let cutVideoTime = currentTime;
      
      // Find where we are in the original timeline based on cut video time
      for (let i = 0; i < silenceCuts.length + 1; i++) {
        const segmentStart = i === 0 ? 0 : silenceCuts[i - 1].end;
        const segmentEnd = i < silenceCuts.length ? silenceCuts[i].start : firstVideo.duration;
        const segmentDuration = segmentEnd - segmentStart;
        
        if (cutVideoTime <= segmentDuration) {
          mappedTime = segmentStart + cutVideoTime;
          break;
        } else {
          cutVideoTime -= segmentDuration;
          if (i === silenceCuts.length) {
            mappedTime = segmentStart + cutVideoTime;
          }
        }
      }
      timeForProgress = mappedTime;
    }
    
    const progress = (timeForProgress - zoomedRange.startTime) / (zoomedRange.endTime - zoomedRange.startTime);
    if (progress >= 0 && progress <= 1) {
      const x = progress * width;
      
      // Draw playhead with glow effect
      ctx.shadowColor = previewMode === 'cut' ? '#8b5cf6' : '#3b82f6';
      ctx.shadowBlur = 10;
      ctx.strokeStyle = previewMode === 'cut' ? '#8b5cf6' : '#3b82f6';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
      ctx.shadowBlur = 0;
      
      // Draw playhead triangle
      ctx.fillStyle = previewMode === 'cut' ? '#8b5cf6' : '#3b82f6';
      ctx.beginPath();
      ctx.moveTo(x - 8, 0);
      ctx.lineTo(x + 8, 0);
      ctx.lineTo(x, 16);
      ctx.closePath();
      ctx.fill();
      
      // Add mode indicator
      if (previewMode === 'cut') {
        ctx.fillStyle = '#8b5cf6';
        ctx.font = 'bold 10px Arial';
        ctx.fillText('CUT', x - 12, height - 5);
      }
    }

    // Draw silence threshold line with animation
    const thresholdY = height - ((options.silenceThreshold || 0.07) * height);
    const dashOffset = Date.now() * 0.01;
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 2;
    ctx.setLineDash([8, 4]);
    ctx.lineDashOffset = dashOffset % 12;
    ctx.beginPath();
    ctx.moveTo(0, thresholdY);
    ctx.lineTo(width, thresholdY);
    ctx.stroke();
    ctx.setLineDash([]);
    
    // Add threshold label
    ctx.fillStyle = '#f59e0b';
    ctx.font = 'bold 12px Arial';
    ctx.fillText(`Threshold: ${(options.silenceThreshold || 0.07).toFixed(3)}`, 10, thresholdY - 10);
  }, [audioAnalysis, currentTime, firstVideo, options.silenceThreshold, silenceCuts, zoomLevel, zoomOffset, hoveredCut]);

  // Draw cut preview waveform with skip visualization
  const drawCutPreview = useCallback(() => {
    if (!previewCanvasRef.current || !audioAnalysis || !firstVideo) return;
    
    const canvas = previewCanvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { width, height } = canvas;
    ctx.clearRect(0, 0, width, height);

    // Calculate compressed timeline (after cuts)
    let compressedDuration = firstVideo.duration;
    silenceCuts.forEach(cut => {
      compressedDuration -= cut.duration;
    });

    // Draw compressed waveform with jump indicators
    const barWidth = width / audioAnalysis.peaks.length;
    let compressedX = 0;
    const compressionRatio = compressedDuration / firstVideo.duration;
    
    audioAnalysis.peaks.forEach((peak, i) => {
      const time = (i / audioAnalysis.peaks.length) * firstVideo.duration;
      const willBeCut = silenceCuts.some(cut => time >= cut.start && time <= cut.end);
      
      if (!willBeCut) {
        const barHeight = (peak / 1.0) * height * 0.8;
        const y = (height - barHeight) / 2;
        
        // Draw remaining audio with enhanced styling
        ctx.fillStyle = '#10b981';
        ctx.fillRect(compressedX, y, Math.max(1, barWidth * compressionRatio), barHeight);
        compressedX += barWidth * compressionRatio;
      } else {
        // Draw skip indicators where cuts happen
        const prevTime = ((i - 1) / audioAnalysis.peaks.length) * firstVideo.duration;
        const prevWillBeCut = silenceCuts.some(cut => prevTime >= cut.start && prevTime <= cut.end);
        
        if (!prevWillBeCut && compressedX > 0) {
          // Draw skip arrow
          ctx.fillStyle = '#dc2626';
          ctx.font = 'bold 16px Arial';
          ctx.textAlign = 'center';
          ctx.fillText('⏭️', compressedX + 10, height / 2);
          compressedX += 20; // Small gap for visual indication
        }
      }
    });
    
    // Add compression info
    ctx.fillStyle = '#059669';
    ctx.font = 'bold 14px Arial';
    ctx.textAlign = 'left';
    ctx.fillText(`Compressed: ${Math.round(compressedDuration)}s (${(compressionRatio * 100).toFixed(1)}% remaining)`, 10, height - 10);
  }, [audioAnalysis, firstVideo, silenceCuts]);

  // Animation loop
  useEffect(() => {
    drawWaveform();
    if (showCutPreview) {
      drawCutPreview();
    }
  }, [drawWaveform, drawCutPreview, showCutPreview]);

  useEffect(() => {
    if (isPlaying) {
      animationRef.current = requestAnimationFrame(() => {
        drawWaveform();
      });
    }
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [drawWaveform, isPlaying]);

  // Video event handlers
  const handleTimeUpdate = () => {
    const activeVideo = previewMode === 'cut' ? cutVideoRef.current : videoRef.current;
    if (activeVideo) {
      setCurrentTime(activeVideo.currentTime);
    }
  };

  const handlePlay = () => setIsPlaying(true);
  const handlePause = () => setIsPlaying(false);

  // Zoom controls
  const handleZoomIn = () => {
    setZoomLevel(prev => Math.min(prev * 2, 16));
  };

  const handleZoomOut = () => {
    setZoomLevel(prev => Math.max(prev / 2, 1));
    if (zoomLevel <= 2) setZoomOffset(0);
  };

  const handleZoomScroll = (direction: number) => {
    if (!audioAnalysis) return;
    const maxOffset = Math.max(0, audioAnalysis.peaks.length - Math.floor(audioAnalysis.peaks.length / zoomLevel));
    const step = Math.floor(audioAnalysis.peaks.length / (zoomLevel * 10));
    setZoomOffset(prev => Math.max(0, Math.min(maxOffset, prev + direction * step)));
  };

  // Generate cut preview video
  const generateCutPreview = async () => {
    if (!firstVideo || silenceCuts.length === 0) return;
    
    setGeneratingCutPreview(true);
    try {
      // Always regenerate cuts with current settings
      const cutsToUse = audioAnalysis?.silenceSegments
        .filter((segment: any) => segment.end - segment.start > (options.silenceMargin || 0.2))
        .map((segment: any) => ({
          start: segment.start,
          end: segment.end,
          duration: segment.end - segment.start
        })) || silenceCuts;

      console.log('🎬 Generating cut preview with current settings:', {
        threshold: options.silenceThreshold,
        margin: options.silenceMargin,
        cuts: cutsToUse.length
      });

      const response = await fetch('/api/preview-video-cuts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          videoPath: firstVideo.path,
          cuts: cutsToUse,
          // Add timestamp to force new preview generation
          timestamp: Date.now()
        })
      });
      
      if (response.ok) {
        const result = await response.json();
        setCutPreviewPath(result.previewPath);
        setPreviewMode('cut');
      } else {
        console.error('Failed to generate cut preview');
      }
    } catch (error) {
      console.error('Error generating cut preview:', error);
    } finally {
      setGeneratingCutPreview(false);
    }
  };

  // Preview video with cuts applied
  const jumpToNextSegment = () => {
    const videoElement = previewMode === 'cut' ? cutVideoRef.current : videoRef.current;
    if (!videoElement || !firstVideo) return;
    
    const currentTime = videoElement.currentTime;
    const nextCut = silenceCuts.find(cut => cut.start > currentTime);
    
    if (nextCut) {
      videoElement.currentTime = nextCut.end;
    }
  };

  const simulateCutPlayback = () => {
    const videoElement = previewMode === 'cut' ? cutVideoRef.current : videoRef.current;
    if (!videoElement || !firstVideo) return;
    
    const currentTime = videoElement.currentTime;
    const currentCut = silenceCuts.find(cut => currentTime >= cut.start && currentTime <= cut.end);
    
    if (currentCut) {
      // Skip to end of current cut
      videoElement.currentTime = currentCut.end;
    }
  };

  // Settings change handlers
  const updateSilenceThreshold = (value: number) => {
    onOptionsChange({
      ...options,
      silenceThreshold: value
    });
  };

  const updateSmartDetection = (enabled: boolean) => {
    onOptionsChange({
      ...options,
      smartSilenceDetection: enabled
    });
  };

  const updateSilenceMargin = (value: number) => {
    onOptionsChange({
      ...options,
      silenceMargin: value
    });
  };

  // Calculate statistics
  const totalSilenceDuration = silenceCuts.reduce((total, cut) => total + cut.duration, 0);
  const timePercentageSaved = firstVideo ? (totalSilenceDuration / firstVideo.duration) * 100 : 0;
  const newDuration = firstVideo ? firstVideo.duration - totalSilenceDuration : 0;

  console.log('📹 [VIDEO PREVIEW] Render state:', {
    loading,
    hasFirstVideo: !!firstVideo,
    analyzing,
    previewMode,
    generatingCutPreview,
    generatingFullPreview,
    fullPreviewStatus
  });

  if (loading) {
    console.log('📹 [VIDEO PREVIEW] Rendering loading state');
    return (
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h3 className="text-lg font-semibold mb-4">🎬 Video Preview</h3>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-3">Loading first video...</span>
        </div>
      </div>
    );
  }

  if (!firstVideo) {
    console.log('📹 [VIDEO PREVIEW] Rendering no video state');
    return (
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h3 className="text-lg font-semibold mb-4">🎬 Video Preview</h3>
        <div className="text-center text-gray-500 py-8">
          <p>No videos found in the selected folder.</p>
          <p className="text-sm mt-2">Please select a folder containing video files.</p>
        </div>
      </div>
    );
  }
  
  console.log('📹 [VIDEO PREVIEW] Rendering main component');

  return (
    <div className="bg-white rounded-lg shadow-sm border p-6">
      {/* Tabs for Original vs Live Preview */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">
          🎬 Video Preview
          <span className="text-sm font-normal text-gray-500 ml-2">
            {firstVideo.name}
          </span>
        </h3>
        
        <div className="flex gap-2 bg-gray-100 p-1 rounded-lg">
          <button
            onClick={() => setPreviewMode('original')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              previewMode === 'original'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            📹 Original
          </button>
          <button
            onClick={() => {
              if (cutPreviewPath) {
                setPreviewMode('cut');
              } else if (!generatingCutPreview) {
                generateCutPreview();
              }
            }}
            disabled={generatingCutPreview}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              previewMode === 'cut'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900 disabled:text-gray-400'
            }`}
          >
            ✂️ Silence Cuts
          </button>
          <button
            onClick={() => {
              if (fullPreviewPath) {
                setPreviewMode('full');
              } else if (!generatingFullPreview) {
                generateFullPreview();
              }
            }}
            disabled={generatingFullPreview}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              previewMode === 'full'
                ? 'bg-gradient-to-r from-purple-500 to-blue-500 text-white shadow-sm'
                : 'text-gray-600 hover:text-gray-900 disabled:text-gray-400'
            }`}
          >
            {generatingFullPreview ? (
              <>
                <span className="inline-block animate-spin mr-1">⚙️</span>
                {fullPreviewProgress > 0 ? `${fullPreviewProgress}%` : 'Rendering...'}
              </>
            ) : (
              '🎬 Full Render'
            )}
          </button>
        </div>
      </div>
      
      {/* Video preview section */}
      <>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Video Player */}
        <div className="space-y-4">
          {/* Video Mode Toggle */}
          <div className="flex bg-gray-100 rounded-lg p-1 max-w-[350px] mx-auto gap-1">
            <button
              onClick={() => setPreviewMode('original')}
              className={`flex-1 px-3 py-2 text-xs rounded-md transition-colors ${
                previewMode === 'original' 
                  ? 'bg-white text-gray-900 shadow' 
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              📹 Original
            </button>
            <button
              onClick={() => {
                if (cutPreviewPath) {
                  setPreviewMode('cut');
                } else if (!generatingCutPreview) {
                  generateCutPreview();
                }
              }}
              disabled={generatingCutPreview}
              className={`flex-1 px-3 py-2 text-xs rounded-md transition-colors ${
                previewMode === 'cut' 
                  ? 'bg-white text-gray-900 shadow' 
                  : 'text-gray-600 hover:text-gray-900 disabled:text-gray-400 disabled:cursor-not-allowed'
              }`}
            >
              {generatingCutPreview ? (
                <>
                  <div className="animate-spin w-3 h-3 border border-gray-600 border-t-transparent rounded-full inline mr-1"></div>
                  Cuts...
                </>
              ) : (
                '✂️ Cuts'
              )}
            </button>
            <button
              onClick={() => {
                if (fullPreviewPath) {
                  setPreviewMode('full');
                } else if (!generatingFullPreview) {
                  generateFullPreview();
                }
              }}
              disabled={generatingFullPreview}
              className={`flex-1 px-3 py-2 text-xs rounded-md transition-colors ${
                previewMode === 'full' 
                  ? 'bg-gradient-to-r from-purple-500 to-blue-500 text-white shadow' 
                  : 'text-gray-600 hover:text-gray-900 disabled:text-gray-400 disabled:cursor-not-allowed'
              }`}
            >
              {generatingFullPreview ? (
                <>
                  <div className="animate-spin w-3 h-3 border border-white border-t-transparent rounded-full inline mr-1"></div>
                  {fullPreviewProgress > 0 ? `${fullPreviewProgress}%` : 'Rendering...'}
                </>
              ) : (
                '🎬 Full'
              )}
            </button>
          </div>

          <div 
            className="bg-black rounded-lg overflow-hidden relative max-w-[400px] mx-auto"
            style={getVideoContainerStyle()}
          >
            {previewMode === 'original' ? (
              <video
                ref={videoRef}
                src={`/api/serve-video?path=${encodeURIComponent(firstVideo.path)}`}
                className="w-full h-full object-contain"
                controls
                onTimeUpdate={handleTimeUpdate}
                onPlay={handlePlay}
                onPause={handlePause}
                preload="metadata"
              />
            ) : previewMode === 'cut' ? (
              cutPreviewPath ? (
                <video
                  ref={cutVideoRef}
                  src={`/api/serve-temp-video?path=${encodeURIComponent(cutPreviewPath)}`}
                  className="w-full h-full object-contain"
                  controls
                  onTimeUpdate={handleTimeUpdate}
                  onPlay={handlePlay}
                  onPause={handlePause}
                  preload="metadata"
                />
              ) : (
                <div className="flex items-center justify-center h-full text-white text-xs text-center p-4">
                  {generatingCutPreview ? (
                    <div className="text-center">
                      <div className="animate-spin w-6 h-6 border-2 border-white border-t-transparent rounded-full mx-auto mb-2"></div>
                      Generating cut preview...
                    </div>
                  ) : (
                    'Click "Cuts" to generate preview'
                  )}
                </div>
              )
            ) : previewMode === 'full' ? (
              fullPreviewPath ? (
                <video
                  ref={fullVideoRef}
                  src={`/api/serve-temp-video?path=${encodeURIComponent(fullPreviewPath)}`}
                  className="w-full h-full object-contain"
                  controls
                  preload="metadata"
                />
              ) : (
                <div className="flex items-center justify-center h-full text-white text-xs text-center p-4">
                  {generatingFullPreview ? (
                    <div className="text-center w-full px-4">
                      <div className="animate-spin w-8 h-8 border-2 border-white border-t-transparent rounded-full mx-auto mb-2"></div>
                      <div className="mb-2 font-semibold">{fullPreviewStatus}</div>
                      {fullPreviewProgress > 0 && (
                        <div className="w-full bg-gray-700 rounded-full h-2 mb-2">
                          <div 
                            className="bg-gradient-to-r from-purple-500 to-blue-500 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${fullPreviewProgress}%` }}
                          ></div>
                        </div>
                      )}
                      <div className="text-xs text-gray-400">This may take several minutes...</div>
                    </div>
                  ) : (
                    'Click "Full" to generate fully rendered preview'
                  )}
                </div>
              )
            ) : null}
          </div>
          
          {/* Video Controls */}
          <div className="flex gap-2 justify-center flex-wrap">
            <button
              onClick={jumpToNextSegment}
              className="px-3 py-1 bg-blue-100 text-blue-700 rounded text-xs hover:bg-blue-200 transition-colors"
              title="Jump to next speech segment"
            >
              <SkipForward className="w-4 h-4 inline mr-1" />
              Next Segment
            </button>
            <button
              onClick={simulateCutPlayback}
              className="px-3 py-1 bg-red-100 text-red-700 rounded text-xs hover:bg-red-200 transition-colors"
              title="Skip current silence (simulate cut)"
            >
              <FastForward className="w-4 h-4 inline mr-1" />
              Skip Silence
            </button>

          </div>
          
          <div className="text-sm text-gray-600 text-center space-y-1">
            <p className={`font-medium ${previewMode === 'cut' ? 'text-purple-700' : ''}`}>
              {previewMode === 'cut' ? '✂️ Cut Preview' : '📹 Original Video'}
            </p>
            <p>Duration: {Math.round(firstVideo.duration)}s</p>
            <p>Size: {(firstVideo.size / (1024 * 1024)).toFixed(1)} MB</p>
            {audioAnalysis && (
              <div className={`text-xs p-2 rounded ${
                previewMode === 'cut' 
                  ? 'bg-purple-50 border border-purple-200' 
                  : 'bg-blue-50'
              }`}>
                <p className={`font-medium ${
                  previewMode === 'cut' ? 'text-purple-900' : 'text-blue-900'
                }`}>
                  {previewMode === 'cut' ? 'Cut Preview Stats:' : 'After Silence Removal:'}
                </p>
                <p>⏱️ {Math.round(newDuration)}s ({timePercentageSaved.toFixed(1)}% shorter)</p>
                <p>✂️ {silenceCuts.length} cuts • {totalSilenceDuration.toFixed(1)}s removed</p>
                {previewMode === 'cut' && cutPreviewPath && (
                  <p className="text-purple-600 mt-1">✨ Real-time cut preview active</p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Enhanced Audio Waveform & Analysis */}
        <div className="lg:col-span-2 space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-medium">🎵 Audio Silence Analysis</h4>
              <div className="flex gap-2">
                <div className="flex bg-gray-100 rounded">
                  <button
                    onClick={handleZoomOut}
                    className="px-2 py-1 text-xs hover:bg-gray-200 transition-colors rounded-l"
                    disabled={zoomLevel <= 1}
                  >
                    <ZoomOut className="w-3 h-3" />
                  </button>
                  <span className="px-2 py-1 text-xs bg-white border-x">
                    {zoomLevel}x
                  </span>
                  <button
                    onClick={handleZoomIn}
                    className="px-2 py-1 text-xs hover:bg-gray-200 transition-colors rounded-r"
                    disabled={zoomLevel >= 16}
                  >
                    <ZoomIn className="w-3 h-3" />
                  </button>
                </div>
                <button
                  onClick={() => setShowCutPreview(!showCutPreview)}
                  className={`px-3 py-1 text-xs rounded transition-colors ${
                    showCutPreview 
                      ? 'bg-purple-100 text-purple-700' 
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  <Scissors className="w-3 h-3 inline mr-1" />
                  Preview Cuts
                </button>
              </div>
            </div>
            
            {analyzing ? (
              <div className="flex items-center justify-center h-32 bg-gray-50 rounded border-2 border-dashed">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                <span className="ml-2 text-sm">Analyzing audio...</span>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="relative">
                  <canvas
                    ref={canvasRef}
                    width={600}
                    height={120}
                    className="w-full h-32 bg-gray-900 rounded border cursor-crosshair"
                    onMouseMove={(e) => {
                      if (!audioAnalysis || !firstVideo) return;
                      const rect = e.currentTarget.getBoundingClientRect();
                      const x = e.clientX - rect.left;
                      const progress = x / rect.width;
                      const zoomedRange = getZoomedRange();
                      const time = zoomedRange.startTime + progress * (zoomedRange.endTime - zoomedRange.startTime);
                      const cutIndex = silenceCuts.findIndex(cut => time >= cut.start && time <= cut.end);
                      setHoveredCut(cutIndex >= 0 ? cutIndex : null);
                    }}
                    onMouseLeave={() => setHoveredCut(null)}
                  />
                  
                  {/* Zoom scroll controls */}
                  {zoomLevel > 1 && (
                    <div className="absolute bottom-2 right-2 flex gap-1">
                      <button
                        onClick={() => handleZoomScroll(-1)}
                        className="px-2 py-1 bg-black bg-opacity-50 text-white text-xs rounded hover:bg-opacity-70"
                      >
                        ←
                      </button>
                      <button
                        onClick={() => handleZoomScroll(1)}
                        className="px-2 py-1 bg-black bg-opacity-50 text-white text-xs rounded hover:bg-opacity-70"
                      >
                        →
                      </button>
                    </div>
                  )}
                </div>
                
                {showCutPreview && (
                  <div className="relative">
                    <div className="text-xs text-purple-700 font-medium mb-1 flex items-center">
                      <Scissors className="w-3 h-3 mr-1" />
                      After Cuts Preview (Compressed Timeline):
                    </div>
                    <canvas
                      ref={previewCanvasRef}
                      width={600}
                      height={80}
                      className="w-full h-20 bg-purple-50 rounded border-2 border-purple-200"
                    />
                  </div>
                )}
              </div>
            )}
            
                          {audioAnalysis && (
                <div className="mt-2 space-y-2">
                  <div className="text-xs text-gray-600">
                    <div className="flex items-center space-x-6 flex-wrap">
                      <div className="flex items-center">
                        <div className="w-3 h-3 bg-green-500 rounded mr-1"></div>
                        Speech (Keep)
                      </div>
                      <div className="flex items-center">
                        <div className="w-3 h-3 bg-red-500 rounded mr-1"></div>
                        Silence (Cut) ✂️
                      </div>
                      <div className="flex items-center">
                        <div className="w-3 h-3 bg-yellow-500 rounded mr-1"></div>
                        Below threshold
                      </div>
                      <div className="flex items-center">
                        <div className="w-3 h-1 bg-yellow-500 rounded mr-1"></div>
                        Threshold line
                      </div>
                      <div className="flex items-center">
                        <div className={`w-3 h-3 rounded mr-1 ${previewMode === 'cut' ? 'bg-purple-500' : 'bg-blue-500'}`}></div>
                        {previewMode === 'cut' ? 'Cut preview position' : 'Original position'}
                      </div>
                    </div>
                  </div>
                  {silenceCuts.length > 0 && (
                    <div className="text-xs bg-red-50 border border-red-200 rounded p-2">
                      <p className="font-medium text-red-800 mb-1">🎯 Cut Detection Tips:</p>
                      <ul className="text-red-700 space-y-1">
                        <li>• <strong>Red sections</strong> show silence that will be removed</li>
                        <li>• <strong>✂️ Scissors icons</strong> mark exact cut points</li>
                        <li>• <strong>Hover over red areas</strong> to see cut details</li>
                        <li>• <strong>Zoom in</strong> for precise cut visualization</li>
                        <li>• <strong>Generate Cut Preview</strong> to see final result</li>
                      </ul>
                    </div>
                  )}
                </div>
              )}
          </div>

          {/* Enhanced Controls */}
          <div className="space-y-4 bg-gray-50 p-4 rounded-lg">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Silence Threshold: {(options.silenceThreshold || 0.07).toFixed(3)}
              </label>
              <input
                type="range"
                min="0.001"
                max="0.5"
                step="0.001"
                value={options.silenceThreshold || 0.07}
                onChange={(e) => updateSilenceThreshold(parseFloat(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider-thumb"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>Lenient (0.001)</span>
                <span>Moderate (0.1)</span>
                <span>Strict (0.5)</span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Silence Margin: {(options.silenceMargin || 0.2).toFixed(1)}s
              </label>
              <input
                type="range"
                min="0.1"
                max="2.0"
                step="0.1"
                value={options.silenceMargin || 0.2}
                onChange={(e) => updateSilenceMargin(parseFloat(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>0.1s (Aggressive)</span>
                <span>1.0s (Balanced)</span>
                <span>2.0s (Conservative)</span>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Minimum silence duration to cut (shorter silences will be kept)
              </p>
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="smartDetection"
                checked={options.smartSilenceDetection || false}
                onChange={(e) => updateSmartDetection(e.target.checked)}
                className="rounded"
              />
              <label htmlFor="smartDetection" className="text-sm text-gray-700">
                <Zap className="w-4 h-4 inline mr-1 text-yellow-500" />
                Smart Silence Detection (AI-powered optimal threshold)
              </label>
            </div>

            {audioAnalysis?.recommendedThreshold && (
              <div className="bg-blue-50 border border-blue-200 rounded p-3">
                <div className="flex items-start space-x-2">
                  <Info className="w-4 h-4 text-blue-600 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium text-blue-900">🤖 AI Recommendation</p>
                    <p className="text-blue-700">
                      Optimal threshold: {audioAnalysis.recommendedThreshold.toFixed(3)} 
                      <span className="text-xs ml-1">(Based on speech pattern analysis)</span>
                    </p>
                    <button
                      onClick={() => updateSilenceThreshold(audioAnalysis.recommendedThreshold)}
                      className="text-blue-600 hover:text-blue-800 text-xs underline mt-1"
                    >
                      ✨ Apply AI recommendation
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

        </div>
      </div>

      <style jsx>{`
        .slider-thumb::-webkit-slider-thumb {
          appearance: none;
          height: 20px;
          width: 20px;
          border-radius: 50%;
          background: linear-gradient(45deg, #3b82f6, #1d4ed8);
          cursor: pointer;
          box-shadow: 0 2px 4px rgba(0,0,0,0.2);
          border: 2px solid white;
        }
        
        .slider-thumb::-moz-range-thumb {
          height: 20px;
          width: 20px;
          border-radius: 50%;
          background: linear-gradient(45deg, #3b82f6, #1d4ed8);
          cursor: pointer;
          border: 2px solid white;
          box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        }
      `}</style>
      </>
    </div>
  );
} 