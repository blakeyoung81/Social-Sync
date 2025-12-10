import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import { VideoAnalysis, VideoClip, SilenceSegment } from '@/types';

export async function POST(request: NextRequest) {
  try {
    const { 
      videoPath, 
      silenceThreshold = 0.05, 
      smartDetection = true, 
      silenceMargin = 0.15
    } = await request.json();
    
    if (!videoPath) {
      return NextResponse.json({ error: 'Video path is required' }, { status: 400 });
    }

    // Resolve the video path to absolute path
    const resolvedVideoPath = path.isAbsolute(videoPath) 
      ? videoPath 
      : path.resolve(process.cwd(), '..', videoPath.replace(/^\.\.\//, ''));
    
    // Check if video file exists
    if (!fs.existsSync(resolvedVideoPath)) {
      return NextResponse.json({ error: 'Video file not found' }, { status: 404 });
    }

    // Check for existing analysis data
    const videoBaseName = path.basename(videoPath, path.extname(videoPath));
    const processingDir = path.join(process.cwd(), '..', 'data', 'uploads', 'temp_processing');
    const analysisFile = path.join(processingDir, `${videoBaseName}_video_analysis.json`);
    
    if (fs.existsSync(analysisFile)) {
      try {
        const existingData = JSON.parse(fs.readFileSync(analysisFile, 'utf8'));
        console.log('🎬 [VIDEO ANALYSIS] Found existing analysis for:', videoBaseName);
        return NextResponse.json({
          success: true,
          ...existingData,
          fromCache: true
        });
      } catch (error) {
        console.error('🎬 [VIDEO ANALYSIS] Error reading existing analysis:', error);
        // Continue with new analysis
      }
    }

    // Continue with new analysis if no existing data found

    // Create enhanced Python script for video analysis
    const pythonScript = `
import sys
import os
sys.path.append('${path.resolve(process.cwd(), '..')}')

import json
import librosa
import numpy as np
from pathlib import Path
import subprocess
import whisper
import uuid

def convert_numpy_types(obj):
    """Convert numpy types to Python native types for JSON serialization"""
    if isinstance(obj, np.integer):
        return int(obj)
    elif isinstance(obj, np.floating):
        return float(obj)
    elif isinstance(obj, np.ndarray):
        return obj.tolist()
    elif isinstance(obj, dict):
        return {key: convert_numpy_types(value) for key, value in obj.items()}
    elif isinstance(obj, list):
        return [convert_numpy_types(item) for item in obj]
    else:
        return obj

def get_video_duration(video_path):
    """Get video duration using ffprobe"""
    try:
        result = subprocess.run([
            'ffprobe', '-v', 'quiet', '-show_entries', 
            'format=duration', '-of', 'csv=p=0', video_path
        ], capture_output=True, text=True)
        return float(result.stdout.strip())
    except:
        return None

def analyze_video_complete(video_path, silence_threshold=0.05, smart_detection=True, silence_margin=0.15):
    """Complete video analysis for Gling-style editing"""
    try:
        # Get video duration
        duration = get_video_duration(video_path)
        if not duration:
            return {"success": False, "error": "Could not determine video duration"}
        
        # Load audio with librosa
        y, sr = librosa.load(video_path, sr=22050)
        
        # Calculate RMS energy with higher resolution
        frame_length = 2048
        hop_length = 512
        rms = librosa.feature.rms(y=y, frame_length=frame_length, hop_length=hop_length)[0]
        
        # Create time axis
        times = librosa.frames_to_time(np.arange(len(rms)), sr=sr, hop_length=hop_length)
        
        # --- Advanced Silence Detection ---
        rms_db = librosa.amplitude_to_db(rms, ref=np.max)
        
        # Create a histogram of RMS values to find a bimodal distribution
        hist, bin_edges = np.histogram(rms_db, bins=50, range=(-60, 0))
        
        # Find peaks of the histogram (representing silence and speech)
        from scipy.signal import find_peaks
        peaks, _ = find_peaks(hist, height=np.max(hist)*0.1, distance=5)
        
        silence_threshold_db = -40.0 # Default fallback
        
        if len(peaks) >= 2:
            # We have distinct silence and speech peaks
            peak_levels = bin_edges[peaks]
            # Find the valley between the two lowest (most prominent) peaks
            lowest_peaks = sorted(peak_levels)[:2]
            valley_index = np.argmin(hist[peaks[0]:peaks[1]]) + peaks[0]
            silence_threshold_db = bin_edges[valley_index]
        elif len(peaks) == 1:
            # Only one peak, likely mostly speech or mostly silence
            # Set threshold significantly below the single peak
            silence_threshold_db = bin_edges[peaks[0]] - 10
        
        # Add a small margin to be safer
        silence_threshold_db = float(min(-25, silence_threshold_db + 5))

        # Detect silence segments using the DB threshold
        is_silence = rms_db < silence_threshold_db
        silence_segments = []
        speech_segments = []
        
        in_silence = False
        segment_start = 0
        
        for i, silent in enumerate(is_silence):
            if silent and not in_silence:
                # Start of silence - end previous speech segment
                if i > 0:
                    speech_segments.append({
                        'start': segment_start,
                        'end': times[i],
                        'type': 'speech'
                    })
                in_silence = True
                segment_start = times[i]
            elif not silent and in_silence:
                # End of silence - create silence segment if long enough
                silence_duration = times[i] - segment_start
                if silence_duration >= silence_margin:
                    # Use rms_db for confidence, not undefined rms_normalized
                    confidence = 1.0 - (np.mean(rms_db[int(segment_start * sr / hop_length):int(times[i] * sr / hop_length)]) / -60.0)
                    silence_segments.append({
                        'start': segment_start,
                        'end': times[i],
                        'duration': silence_duration,
                        'confidence': confidence
                    })
                in_silence = False
                segment_start = times[i]
        
        # Handle final segment carefully
        last_time = times[-1] if len(times) > 0 else duration
        if in_silence:
            # If the video ends in silence, add it
            silence_duration = last_time - segment_start
            if silence_duration >= silence_margin:
                confidence = 1.0 - (np.mean(rms_db[int(segment_start * sr / hop_length):]) / -60.0)
                silence_segments.append({
                    'start': float(segment_start),
                    'end': float(last_time),
                    'duration': float(silence_duration),
                    'confidence': float(confidence)
                })
        else:
            # If the video ends in speech, ensure the last speech segment is added
            if segment_start < last_time:
                speech_segments.append({
                    'start': float(segment_start),
                    'end': float(last_time),
                    'type': 'speech'
                })
        
        # Create video clips from speech segments
        clips = []
        for i, segment in enumerate(speech_segments):
            start_time = float(segment['start'])
            end_time = float(segment['end'])
            clips.append({
                'id': f'clip_{uuid.uuid4()}',
                'start': start_time,
                'end': end_time,
                'sourceStart': start_time,
                'sourceEnd': end_time,
                'duration': end_time - start_time,
                'isSilent': False,
                'video_path': video_path
            })
        
        # Add silence clips if needed for visualization
        for i, segment in enumerate(silence_segments):
            start_time = float(segment['start'])
            end_time = float(segment['end'])
            clips.append({
                'id': f'silence_{uuid.uuid4()}',
                'start': start_time,
                'end': end_time,
                'sourceStart': start_time,
                'sourceEnd': end_time,
                'duration': end_time - start_time,
                'isSilent': True,
                'video_path': video_path
            })
        
        # Sort clips by start time
        clips.sort(key=lambda x: x['start'])
        
        # Prepare waveform data (downsample for performance)
        # Normalize rms_db for waveform visualization
        rms_db_normalized = (rms_db - np.min(rms_db)) / (np.max(rms_db) - np.min(rms_db))
        target_points = 1000
        downsample_factor = max(1, len(rms_db_normalized) // target_points)
        waveform_data = rms_db_normalized[::downsample_factor].tolist()
        
        # Calculate statistics
        total_silence_duration = float(sum(seg['duration'] for seg in silence_segments))
        time_saved_percentage = float((total_silence_duration / duration * 100) if duration > 0 else 0)
        
        result = {
            'success': True,
            'duration': duration,
            'silenceSegments': silence_segments,
            'speechSegments': [{'id': f'speech_{i}', 'start': seg['start'], 'end': seg['end'], 'type': seg['type']} for i, seg in enumerate(speech_segments)],
            'clips': clips,
            'waveformData': waveform_data,
            'recommendedThreshold': silence_threshold_db,
            'statistics': {
                'totalSilenceDuration': total_silence_duration,
                'timeSavedPercentage': time_saved_percentage,
                'speechSegmentCount': len(speech_segments),
                'silenceSegmentCount': len(silence_segments)
            }
        }
        
        return convert_numpy_types(result)
        
    except Exception as e:
        return {
            'success': False,
            'error': str(e)
        }

def convert_numpy_types(obj):
    """Convert numpy types to native Python types for JSON serialization"""
    if isinstance(obj, dict):
        return {k: convert_numpy_types(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [convert_numpy_types(item) for item in obj]
    elif hasattr(obj, 'dtype'):  # numpy array or scalar
        if obj.dtype.kind in 'fc':  # float or complex
            return float(obj)
        elif obj.dtype.kind in 'iu':  # int or uint
            return int(obj)
        else:
            return obj.item() if hasattr(obj, 'item') else obj
    else:
        return obj

if __name__ == '__main__':
    video_path = sys.argv[1]
    silence_threshold = float(sys.argv[2]) if len(sys.argv) > 2 else 0.05
    smart_detection = sys.argv[3].lower() == 'true' if len(sys.argv) > 3 else True
    silence_margin = float(sys.argv[4]) if len(sys.argv) > 4 else 0.15
    
    result = analyze_video_complete(video_path, silence_threshold, smart_detection, silence_margin)
    print(json.dumps(result))
`;

    // Write the Python script to a temporary file
    const tempScriptPath = path.join(process.cwd(), 'temp', `video_analysis_${Date.now()}.py`);
    
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
      silenceThreshold.toString(),
      smartDetection.toString(),
      silenceMargin.toString()
    ];

    console.log(`🎬 [VIDEO ANALYSIS] Running: ${pythonPath} ${args.join(' ')}`);

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
            const analysisResult = JSON.parse(output);
            
            // Save analysis to cache
            if (analysisResult.success) {
              try {
                if (!fs.existsSync(processingDir)) {
                  fs.mkdirSync(processingDir, { recursive: true });
                }
                fs.writeFileSync(analysisFile, JSON.stringify(analysisResult, null, 2));
                console.log('🎬 [VIDEO ANALYSIS] Saved analysis to cache:', analysisFile);
              } catch (cacheError) {
                console.warn('🎬 [VIDEO ANALYSIS] Could not save to cache:', cacheError);
              }
            }
            
            resolve(analysisResult);
          } catch (parseError) {
            console.error('🎬 [VIDEO ANALYSIS] JSON parse error:', parseError);
            console.error('🎬 [VIDEO ANALYSIS] Raw output:', output);
            reject(new Error('Failed to parse analysis result'));
          }
        } else {
          console.error(`🎬 [VIDEO ANALYSIS] Python process exited with code ${code}`);
          console.error('🎬 [VIDEO ANALYSIS] Error output:', errorOutput);
          reject(new Error(`Video analysis failed with code ${code}`));
        }
      });

      pythonProcess.on('error', (error) => {
        console.error('🎬 [VIDEO ANALYSIS] Process error:', error);
        reject(error);
      });
    });

    return NextResponse.json(result);

  } catch (error) {
    console.error('🎬 [VIDEO ANALYSIS] API error:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
} 