import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';

interface CutSegment {
  start: number;
  end: number;
  duration: number;
}

export async function POST(request: NextRequest) {
  try {
    const { videoPath, cuts, outputPath, timestamp } = await request.json();
    
    if (!videoPath || !cuts || !Array.isArray(cuts)) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    // Create filter for removing silence segments
    let filterComplex = '';
    let inputs = '';
    let concat = '';
    
    if (cuts.length === 0) {
      // No cuts needed, just copy the video
      return NextResponse.json({ 
        success: true, 
        message: 'No cuts needed',
        previewPath: videoPath 
      });
    }

    // Sort cuts by start time
    const sortedCuts = [...cuts].sort((a, b) => a.start - b.start);
    
    // Build filter to extract segments between cuts
    let segmentIndex = 0;
    let lastEnd = 0;
    const segments: Array<{start: number, end: number}> = [];
    
    // Add segments between cuts
    for (const cut of sortedCuts) {
      if (lastEnd < cut.start) {
        segments.push({ start: lastEnd, end: cut.start });
      }
      lastEnd = cut.end;
    }
    
    // Add final segment if there's video after the last cut
    // We'll need to get video duration first
    const videoDuration = await getVideoDuration(videoPath);
    if (lastEnd < videoDuration) {
      segments.push({ start: lastEnd, end: videoDuration });
    }

    if (segments.length === 0) {
      return NextResponse.json({ error: 'No segments remaining after cuts' }, { status: 400 });
    }

    // Build ffmpeg filter
    const segmentFilters = segments.map((segment, i) => 
      `[0:v]trim=start=${segment.start}:end=${segment.end},setpts=PTS-STARTPTS[v${i}]; [0:a]atrim=start=${segment.start}:end=${segment.end},asetpts=PTS-STARTPTS[a${i}];`
    ).join(' ');
    
    const videoConcat = segments.map((_, i) => `[v${i}]`).join('');
    const audioConcat = segments.map((_, i) => `[a${i}]`).join('');
    
    filterComplex = `${segmentFilters} ${videoConcat}concat=n=${segments.length}:v=1:a=0[outv]; ${audioConcat}concat=n=${segments.length}:v=0:a=1[outa]`;

    // Generate temporary output path
    const tempDir = path.join(process.cwd(), 'temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    
    const tempOutputPath = path.join(tempDir, `preview_cut_${timestamp || Date.now()}.mp4`);

    // Execute ffmpeg command
    const ffmpegArgs = [
      '-i', videoPath,
      '-filter_complex', filterComplex,
      '-map', '[outv]',
      '-map', '[outa]',
      '-c:v', 'libx264',
      '-preset', 'ultrafast',
      '-crf', '28',
      '-c:a', 'aac',
      '-b:a', '128k',
      '-y', // Overwrite output file
      tempOutputPath
    ];

    console.log('🎬 [VIDEO CUTS] Running ffmpeg:', ffmpegArgs.join(' '));

    return new Promise((resolve) => {
      const ffmpeg = spawn('ffmpeg', ffmpegArgs);
      
      let stderr = '';
      
      ffmpeg.stderr.on('data', (data) => {
        stderr += data.toString();
      });
      
      ffmpeg.on('close', (code) => {
        if (code === 0) {
          console.log('🎬 [VIDEO CUTS] Success: Preview generated');
          resolve(NextResponse.json({ 
            success: true, 
            previewPath: tempOutputPath,
            segments: segments.length,
            originalDuration: videoDuration,
            newDuration: segments.reduce((total, seg) => total + (seg.end - seg.start), 0)
          }));
        } else {
          console.error('🎬 [VIDEO CUTS] Error:', stderr);
          resolve(NextResponse.json({ 
            error: 'Failed to generate preview', 
            details: stderr 
          }, { status: 500 }));
        }
      });
    });

  } catch (error) {
    console.error('🎬 [VIDEO CUTS] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

async function getVideoDuration(videoPath: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const ffprobe = spawn('ffprobe', [
      '-v', 'quiet',
      '-show_entries', 'format=duration',
      '-of', 'csv=p=0',
      videoPath
    ]);

    let stdout = '';
    ffprobe.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    ffprobe.on('close', (code) => {
      if (code === 0) {
        resolve(parseFloat(stdout.trim()));
      } else {
        reject(new Error('Failed to get video duration'));
      }
    });
  });
} 