import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';

interface ExportRequest {
  videoPath: string;
  timeline: {
    duration: number;
    tracks: Array<{
      id: string;
      type: string;
      name: string;
      zIndex: number;
      items: Array<{
        id: string;
        start: number;
        end: number;
        duration: number;
        type: string;
        opacity: number;
        data: any;
      }>;
    }>;
  };
  exportSettings: {
    format: string;
    quality: string;
    fps: number;
    resolution: string;
    includeAudio: boolean;
    enhanceAudio: boolean;
    includeSubtitles: boolean;
    subtitleStyle: string;
    outputPath: string;
  };
}

export async function POST(request: NextRequest) {
  try {
    const body: ExportRequest = await request.json();
    const { videoPath, timeline, exportSettings } = body;

    console.log('🎬 [LAYERED-EXPORT] Starting layered export:', {
      tracks: timeline.tracks.length,
      duration: timeline.duration,
      settings: exportSettings
    });

    // Validate input
    if (!videoPath || !timeline || !exportSettings) {
      return NextResponse.json({
        success: false,
        error: 'Missing required parameters'
      }, { status: 400 });
    }

    // Check if input video exists
    try {
      await fs.access(videoPath);
    } catch {
      return NextResponse.json({
        success: false,
        error: 'Input video file not found'
      }, { status: 404 });
    }

    // Process tracks by type
    const videoTracks = timeline.tracks.filter(t => t.type === 'video');
    const audioTracks = timeline.tracks.filter(t => t.type === 'audio');
    const captionTracks = timeline.tracks.filter(t => t.type === 'captions');
    const brollTracks = timeline.tracks.filter(t => t.type === 'broll');
    const overlayTracks = timeline.tracks.filter(t => t.type === 'overlay');

    console.log('📊 [TRACK-BREAKDOWN]', {
      video: videoTracks.length,
      audio: audioTracks.length,
      captions: captionTracks.length,
      broll: brollTracks.length,
      overlay: overlayTracks.length
    });

    // Build FFmpeg command
    const outputPath = exportSettings.outputPath;
    const tempDir = path.dirname(outputPath);
    
    // Ensure output directory exists
    await fs.mkdir(tempDir, { recursive: true });

    let ffmpegArgs = ['-y']; // Overwrite output files

    // Input video
    ffmpegArgs.push('-i', videoPath);

    // Add B-roll inputs if any
    const brollInputs: string[] = [];
    for (const brollTrack of brollTracks) {
      for (const item of brollTrack.items) {
        if (item.data.mediaPath) {
          ffmpegArgs.push('-i', item.data.mediaPath);
          brollInputs.push(item.data.mediaPath);
        }
      }
    }

    // Build filter complex for video composition
    let filterComplex = '';
    let videoStreamCount = 1 + brollInputs.length;
    
    // Add video cuts/segments if specified in video tracks
    if (videoTracks.length > 0) {
      const videoTrack = videoTracks[0];
      const segments = videoTrack.items.filter(item => !item.data.isCut);
      
      if (segments.length > 1) {
        // Create segments for non-cut portions
        const segmentFilters = segments.map((segment, index) => {
          const start = segment.start;
          const duration = segment.duration;
          return `[0:v]trim=start=${start}:duration=${duration},setpts=PTS-STARTPTS[v${index}]`;
        });
        
        filterComplex += segmentFilters.join(';') + ';';
        
        // Concatenate segments
        const concatInputs = segments.map((_, index) => `[v${index}]`).join('');
        filterComplex += `${concatInputs}concat=n=${segments.length}:v=1:a=0[main_video];`;
      } else if (segments.length === 1) {
        // Single segment - trim if needed
        const segment = segments[0];
        if (segment.start > 0 || segment.duration < timeline.duration) {
          filterComplex += `[0:v]trim=start=${segment.start}:duration=${segment.duration},setpts=PTS-STARTPTS[main_video];`;
        } else {
          filterComplex += '[0:v]copy[main_video];';
        }
      } else {
        filterComplex += '[0:v]copy[main_video];';
      }
    } else {
      filterComplex += '[0:v]copy[main_video];';
    }

    // Add B-roll overlays
    let currentVideoStream = '[main_video]';
    if (brollTracks.length > 0) {
      brollTracks.forEach((brollTrack, trackIndex) => {
        brollTrack.items.forEach((item, itemIndex) => {
          const inputIndex = 1 + trackIndex; // B-roll inputs start after main video
          const overlayName = `overlay_${trackIndex}_${itemIndex}`;
          
          // Position and timing for overlay
          const x = item.data.position?.x || 0;
          const y = item.data.position?.y || 0;
          const scale = item.data.scale || 1;
          const opacity = item.opacity || 1;
          
          filterComplex += `[${inputIndex}:v]scale=iw*${scale}:ih*${scale},format=yuva420p,colorchannelmixer=aa=${opacity}[${overlayName}];`;
          filterComplex += `${currentVideoStream}[${overlayName}]overlay=${x}:${y}:enable='between(t,${item.start},${item.end})'[video_with_${overlayName}];`;
          currentVideoStream = `[video_with_${overlayName}]`;
        });
      });
    }

    // Set final video output
    const finalVideoStream = currentVideoStream.replace(/[\[\]]/g, '');

    // Handle audio
    let audioFilter = '';
    if (exportSettings.includeAudio) {
      if (audioTracks.length > 0) {
        const audioTrack = audioTracks[0];
        const audioSegments = audioTrack.items.filter(item => !item.data.isCut && !item.data.isMuted);
        
        if (audioSegments.length > 1) {
          // Create audio segments
          const audioSegmentFilters = audioSegments.map((segment, index) => {
            const start = segment.start;
            const duration = segment.duration;
            const volume = segment.data.volume || 1;
            return `[0:a]atrim=start=${start}:duration=${duration},asetpts=PTS-STARTPTS,volume=${volume}[a${index}]`;
          });
          
          audioFilter += audioSegmentFilters.join(';') + ';';
          
          // Concatenate audio segments
          const audioConcatInputs = audioSegments.map((_, index) => `[a${index}]`).join('');
          audioFilter += `${audioConcatInputs}concat=n=${audioSegments.length}:v=0:a=1[final_audio]`;
        } else if (audioSegments.length === 1) {
          const segment = audioSegments[0];
          const volume = segment.data.volume || 1;
          audioFilter += `[0:a]volume=${volume}[final_audio]`;
        } else {
          audioFilter += '[0:a]copy[final_audio]';
        }
      } else {
        audioFilter += '[0:a]copy[final_audio]';
      }
    }

    // Combine filters
    if (audioFilter) {
      filterComplex += audioFilter;
    }

    // Add filter complex to FFmpeg args
    if (filterComplex) {
      ffmpegArgs.push('-filter_complex', filterComplex);
    }

    // Map outputs
    ffmpegArgs.push('-map', `[${finalVideoStream}]`);
    if (exportSettings.includeAudio) {
      ffmpegArgs.push('-map', '[final_audio]');
    }

    // Output settings
    const resolutionMap: Record<string, string> = {
      '720p': '1280x720',
      '1080p': '1920x1080',
      '1440p': '2560x1440',
      '4k': '3840x2160'
    };

    ffmpegArgs.push(
      '-c:v', 'libx264',
      '-preset', 'medium',
      '-crf', exportSettings.quality === 'ultra' ? '18' : exportSettings.quality === 'high' ? '23' : '28',
      '-s', resolutionMap[exportSettings.resolution] || '1920x1080',
      '-r', exportSettings.fps.toString()
    );

    if (exportSettings.includeAudio) {
      ffmpegArgs.push('-c:a', 'aac', '-b:a', '128k');
    }

    // Handle captions
    if (exportSettings.includeSubtitles && captionTracks.length > 0) {
      const captionTrack = captionTracks[0];
      if (exportSettings.subtitleStyle === 'burned-in') {
        // Create SRT file for burned-in subtitles
        const srtPath = outputPath.replace(/\.[^/.]+$/, '.srt');
        let srtContent = '';
        
        captionTrack.items.forEach((caption, index) => {
          const startTime = formatSRTTime(caption.start);
          const endTime = formatSRTTime(caption.end);
          srtContent += `${index + 1}\n${startTime} --> ${endTime}\n${caption.data.text}\n\n`;
        });
        
        await fs.writeFile(srtPath, srtContent);
        
        // Add subtitle filter
        ffmpegArgs.push('-vf', `subtitles=${srtPath}:force_style='FontSize=24,PrimaryColour=&H00FFFFFF,OutlineColour=&H00000000,BorderStyle=1,Outline=2'`);
      }
    }

    ffmpegArgs.push(outputPath);

    console.log('🎬 [FFMPEG-CMD]', ffmpegArgs.join(' '));

    // Execute FFmpeg
    await new Promise<void>((resolve, reject) => {
      const ffmpeg = spawn('ffmpeg', ffmpegArgs);
      
      let stderr = '';
      
      ffmpeg.stderr.on('data', (data) => {
        stderr += data.toString();
        // Extract progress if needed
        const timeMatch = stderr.match(/time=(\d+):(\d+):(\d+\.\d+)/);
        if (timeMatch) {
          const hours = parseInt(timeMatch[1]);
          const minutes = parseInt(timeMatch[2]);
          const seconds = parseFloat(timeMatch[3]);
          const currentTime = hours * 3600 + minutes * 60 + seconds;
          const progress = Math.min((currentTime / timeline.duration) * 100, 100);
          console.log(`📊 [EXPORT-PROGRESS] ${progress.toFixed(1)}%`);
        }
      });
      
      ffmpeg.on('close', (code) => {
        if (code === 0) {
          console.log('✅ [LAYERED-EXPORT] FFmpeg completed successfully');
          resolve();
        } else {
          console.error('❌ [LAYERED-EXPORT] FFmpeg failed with code:', code);
          console.error('❌ [STDERR]', stderr);
          reject(new Error(`FFmpeg failed with code ${code}`));
        }
      });
      
      ffmpeg.on('error', (error) => {
        console.error('💥 [LAYERED-EXPORT] FFmpeg error:', error);
        reject(error);
      });
    });

    console.log('🎉 [LAYERED-EXPORT] Export completed successfully');

    return NextResponse.json({
      success: true,
      outputPath,
      stats: {
        totalTracks: timeline.tracks.length,
        videoTracks: videoTracks.length,
        audioTracks: audioTracks.length,
        captionTracks: captionTracks.length,
        brollTracks: brollTracks.length,
        overlayTracks: overlayTracks.length,
        duration: timeline.duration
      }
    });

  } catch (error) {
    console.error('💥 [LAYERED-EXPORT] Error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }, { status: 500 });
  }
}

// Helper function to format time for SRT
function formatSRTTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const milliseconds = Math.floor((seconds % 1) * 1000);
  
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')},${milliseconds.toString().padStart(3, '0')}`;
} 