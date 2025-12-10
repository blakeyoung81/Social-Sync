import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import { VideoClip, TimelineEdit } from '@/types';

export async function POST(request: NextRequest) {
  try {
    const { 
      videoPath, 
      clips, 
      skipSilence = false,
      editHistory = [],
      outputFormat = 'mp4'
    } = await request.json();
    
    if (!videoPath || !clips || clips.length === 0) {
      return NextResponse.json({ error: 'Video path and clips are required' }, { status: 400 });
    }

    // Resolve the video path to absolute path
    const resolvedVideoPath = path.isAbsolute(videoPath) 
      ? videoPath 
      : path.resolve(process.cwd(), '..', videoPath.replace(/^\.\.\//, ''));
    
    // Check if video file exists
    if (!fs.existsSync(resolvedVideoPath)) {
      return NextResponse.json({ error: 'Video file not found' }, { status: 404 });
    }

    // Create output directory
    const outputDir = path.join(process.cwd(), '..', 'data', 'output_videos');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Generate output filename
    const videoBaseName = path.basename(videoPath, path.extname(videoPath));
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const outputPath = path.join(outputDir, `${videoBaseName}_edited_${timestamp}.${outputFormat}`);

    // Create Python script for video processing
    const pythonScript = `
import sys
import os
sys.path.append('${path.resolve(process.cwd(), '..')}')

import json
import subprocess
import tempfile
from pathlib import Path

def create_clip_segments(clips, skip_silence=False):
    """Create FFmpeg filter segments from clips"""
    segments = []
    
    if skip_silence:
        # Only include speech clips
        speech_clips = [clip for clip in clips if clip.get('type') == 'speech' and not clip.get('isSkipped', False)]
        speech_clips.sort(key=lambda x: x['start'])
        
        for i, clip in enumerate(speech_clips):
            segments.append({
                'start': clip['start'],
                'end': clip['end'],
                'duration': clip['duration'],
                'index': i
            })
    else:
        # Include all clips in their original positions
        all_clips = [clip for clip in clips if not clip.get('isSkipped', False)]
        all_clips.sort(key=lambda x: x['start'])
        
        for i, clip in enumerate(all_clips):
            segments.append({
                'start': clip['start'],
                'end': clip['end'],
                'duration': clip['duration'],
                'index': i
            })
    
    return segments

def build_ffmpeg_command(input_path, output_path, segments, skip_silence=False):
    """Build FFmpeg command for video editing"""
    if not segments:
        return None
    
    if len(segments) == 1:
        # Single segment - simple trim
        segment = segments[0]
        return [
            'ffmpeg', '-i', input_path,
            '-ss', str(segment['start']),
            '-t', str(segment['duration']),
            '-c:v', 'libx264',
            '-c:a', 'aac',
            '-y',
            output_path
        ]
    
    # Multiple segments - complex filter
    filter_parts = []
    input_parts = []
    
    for i, segment in enumerate(segments):
        # Create input segment
        input_parts.extend([
            '-ss', str(segment['start']),
            '-t', str(segment['duration']),
            '-i', input_path
        ])
        
        # Add to filter
        filter_parts.append(f'[{i}:v][{i}:a]')
    
    # Build concat filter
    concat_filter = f"{''.join(filter_parts)}concat=n={len(segments)}:v=1:a=1[outv][outa]"
    
    command = ['ffmpeg'] + input_parts + [
        '-filter_complex', concat_filter,
        '-map', '[outv]',
        '-map', '[outa]',
        '-c:v', 'libx264',
        '-c:a', 'aac',
        '-y',
        output_path
    ]
    
    return command

def export_video(input_path, output_path, clips, skip_silence=False):
    """Export edited video using FFmpeg"""
    try:
        # Create segments from clips
        segments = create_clip_segments(clips, skip_silence)
        
        if not segments:
            return {"success": False, "error": "No valid segments to export"}
        
        # Build FFmpeg command
        command = build_ffmpeg_command(input_path, output_path, segments, skip_silence)
        
        if not command:
            return {"success": False, "error": "Failed to build FFmpeg command"}
        
        print(f"🎬 [EXPORT] Running FFmpeg command: {' '.join(command)}")
        
        # Execute FFmpeg
        result = subprocess.run(command, capture_output=True, text=True, check=True)
        
        # Get output file info
        output_size = os.path.getsize(output_path)
        
        # Calculate statistics
        total_original_duration = sum(clip['duration'] for clip in clips)
        total_exported_duration = sum(segment['duration'] for segment in segments)
        time_saved = total_original_duration - total_exported_duration
        
        return {
            "success": True,
            "outputPath": output_path,
            "outputSize": output_size,
            "statistics": {
                "originalDuration": total_original_duration,
                "exportedDuration": total_exported_duration,
                "timeSaved": time_saved,
                "timeSavedPercentage": (time_saved / total_original_duration * 100) if total_original_duration > 0 else 0,
                "segmentCount": len(segments)
            }
        }
        
    except subprocess.CalledProcessError as e:
        return {
            "success": False,
            "error": f"FFmpeg failed: {e.stderr}"
        }
    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }

if __name__ == '__main__':
    input_path = sys.argv[1]
    output_path = sys.argv[2]
    clips_json = sys.argv[3]
    skip_silence = sys.argv[4].lower() == 'true' if len(sys.argv) > 4 else False
    
    clips = json.loads(clips_json)
    result = export_video(input_path, output_path, clips, skip_silence)
    print(json.dumps(result))
`;

    // Write the Python script to a temporary file
    const tempScriptPath = path.join(process.cwd(), 'temp', `video_export_${Date.now()}.py`);
    
    // Ensure temp directory exists
    const tempDir = path.dirname(tempScriptPath);
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    
    fs.writeFileSync(tempScriptPath, pythonScript);

    // Execute the Python script
    const pythonPath = path.resolve(process.cwd(), '..', 'venv', 'bin', 'python3');
    const args = [
      tempScriptPath,
      resolvedVideoPath,
      outputPath,
      JSON.stringify(clips),
      skipSilence.toString()
    ];

    console.log(`📹 [VIDEO EXPORT] Running: ${pythonPath} ${args.slice(0, 3).join(' ')} [clips] ${skipSilence}`);

    const pythonProcess = spawn(pythonPath, args, {
      cwd: path.resolve(process.cwd(), '..'),
      env: {
        ...process.env,
        PYTHONPATH: path.resolve(process.cwd(), '..'),
        PATH: `${path.resolve(process.cwd(), '..', '.venv', 'bin')}:${process.env.PATH}`,
      }
    });

    let output = '';
    let errorOutput = '';

    pythonProcess.stdout.on('data', (data) => {
      output += data.toString();
    });

    pythonProcess.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });

    const result = await new Promise<any>((resolve, reject) => {
      pythonProcess.on('close', (code) => {
        // Clean up temp file
        try {
          fs.unlinkSync(tempScriptPath);
        } catch (error) {
          console.warn('Could not clean up temp script file:', error);
        }

        if (code === 0) {
          try {
            const exportResult = JSON.parse(output);
            resolve(exportResult);
          } catch (parseError) {
            console.error('📹 [VIDEO EXPORT] JSON parse error:', parseError);
            console.error('📹 [VIDEO EXPORT] Raw output:', output);
            reject(new Error('Failed to parse export result'));
          }
        } else {
          console.error(`📹 [VIDEO EXPORT] Python process exited with code ${code}`);
          console.error('📹 [VIDEO EXPORT] Error output:', errorOutput);
          reject(new Error(`Video export failed with code ${code}`));
        }
      });

      pythonProcess.on('error', (error) => {
        console.error('📹 [VIDEO EXPORT] Process error:', error);
        reject(error);
      });
    });

    // Add additional metadata
    const finalResult = {
      ...result,
      originalPath: videoPath,
      exportedPath: outputPath,
      timestamp: new Date().toISOString(),
      editHistory: editHistory.length,
      exportSettings: {
        skipSilence,
        outputFormat,
        clipCount: clips.length,
        speechClips: clips.filter((c: VideoClip) => c.type === 'speech').length,
        silenceClips: clips.filter((c: VideoClip) => c.type === 'silence').length
      }
    };

    return NextResponse.json(finalResult);

  } catch (error) {
    console.error('📹 [VIDEO EXPORT] API error:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
} 