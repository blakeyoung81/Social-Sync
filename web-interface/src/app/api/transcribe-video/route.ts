import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';

export async function POST(request: NextRequest) {
  try {
    const { videoPath, model = 'small', checkExisting = false } = await request.json();
    
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

    // Check for existing transcription data
    const videoBaseName = path.basename(videoPath, path.extname(videoPath));
    const processingDir = path.join(process.cwd(), '..', 'data', 'uploads', 'temp_processing');
    const transcriptionFile = path.join(processingDir, `${videoBaseName}_transcription.json`);
    
    if (checkExisting && fs.existsSync(transcriptionFile)) {
      try {
        const existingData = JSON.parse(fs.readFileSync(transcriptionFile, 'utf8'));
        console.log('🎙️ [TRANSCRIPTION] Found existing transcription data for:', videoBaseName);
        return NextResponse.json({
          success: true,
          ...existingData,
          fromCache: true
        });
      } catch (error) {
        console.error('🎙️ [TRANSCRIPTION] Error reading existing transcription:', error);
        // Continue with new transcription
      }
    }

    // If checkExisting is true but no existing data found, return empty result
    if (checkExisting) {
      return NextResponse.json({
        success: false,
        error: 'No existing transcription found'
      });
    }

    // Create a temporary Python script to handle transcription
    const pythonScript = `
import sys
import os
sys.path.append('${path.resolve(process.cwd(), '..')}')

import whisper
import json
from pathlib import Path

def format_time_srt(time_seconds):
    """Converts seconds to SRT time format HH:MM:SS,mmm"""
    millisec = int(round((time_seconds - int(time_seconds)) * 1000))
    seconds = int(time_seconds)
    minutes, seconds = divmod(seconds, 60)
    hours, minutes = divmod(minutes, 60)
    return f"{hours:02d}:{minutes:02d}:{seconds:02d},{millisec:03d}"

def transcribe_video(video_path, model_name="small"):
    """Transcribe video using Whisper and return segments with timing"""
    try:
        # Fix SSL certificate verification issue for Whisper model downloads
        import ssl
        ssl._create_default_https_context = ssl._create_unverified_context
        
        model = whisper.load_model(model_name)
        result = model.transcribe(video_path, verbose=False, word_timestamps=True)
        
        # Format segments for frontend
        segments = []
        for i, segment in enumerate(result["segments"]):
            words = []
            if 'words' in segment:
                for word_info in segment['words']:
                    words.append({
                        "text": word_info['word'],
                        "start": word_info['start'],
                        "end": word_info['end'],
                        "confidence": word_info.get('probability', 0)
                    })

            segments.append({
                "id": i + 1,
                "start": segment["start"],
                "end": segment["end"],
                "startTime": format_time_srt(segment["start"]),
                "endTime": format_time_srt(segment["end"]),
                "text": segment["text"].strip(),
                "confidence": segment.get("avg_logprob", 0),
                "words": words
            })
        
        # Create full transcript text
        full_text = " ".join([seg["text"] for seg in segments])
        
        # Create SRT format
        srt_content = ""
        for segment in segments:
            srt_content += f"{segment['id']}\\n"
            srt_content += f"{segment['startTime']} --> {segment['endTime']}\\n"
            srt_content += f"{segment['text']}\\n\\n"
        
        return {
            "success": True,
            "segments": segments,
            "fullText": full_text,
            "srtContent": srt_content,
            "duration": result.get("duration", 0),
            "language": result.get("language", "en")
        }
        
    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }

# Main execution
if __name__ == "__main__":
    video_path = "${resolvedVideoPath}"
    model_name = "${model}"
    
    result = transcribe_video(video_path, model_name)
    print(json.dumps(result))
`;

    // Write the Python script to a temporary file
    const tempDir = path.join(process.cwd(), 'temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    
    const tempScriptPath = path.join(tempDir, `transcribe_${Date.now()}.py`);
    fs.writeFileSync(tempScriptPath, pythonScript);

    try {
      // Execute the Python script
      const pythonPath = path.resolve(process.cwd(), '..', 'venv', 'bin', 'python3');
      
      console.log(`🎙️ [TRANSCRIPTION] Starting transcription for: ${path.basename(videoPath)}`);
      console.log(`🎙️ [TRANSCRIPTION] Using model: ${model}`);
      console.log(`🎙️ [TRANSCRIPTION] Running: ${pythonPath} ${tempScriptPath}`);

      const pythonProcess = spawn(pythonPath, [tempScriptPath], {
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
          } catch (e) {
            console.warn('Could not clean up temp script file:', e);
          }

          if (code === 0) {
            try {
              const fullOutput = output.trim();
              
              // Check if output is empty
              if (!fullOutput) {
                console.error('🎙️ [TRANSCRIPTION] Empty output from Python script');
                resolve({
                  success: false,
                  error: 'Empty response from transcription service'
                });
                return;
              }
              
              // Extract JSON from output (it might have extra text before/after)
              let jsonOutput = fullOutput;
              const jsonStartIndex = fullOutput.indexOf('{');
              const jsonEndIndex = fullOutput.lastIndexOf('}');
              
              if (jsonStartIndex !== -1 && jsonEndIndex !== -1 && jsonEndIndex > jsonStartIndex) {
                jsonOutput = fullOutput.substring(jsonStartIndex, jsonEndIndex + 1);
              }
              
              console.log('🎙️ [TRANSCRIPTION] Attempting to parse JSON:', jsonOutput.substring(0, 200) + '...');
              
              const transcriptionResult = JSON.parse(jsonOutput);
              
              if (transcriptionResult.success) {
                console.log(`🎙️ [TRANSCRIPTION] Success: ${transcriptionResult.segments.length} segments transcribed`);
                console.log(`🎙️ [TRANSCRIPTION] Language: ${transcriptionResult.language}`);
                console.log(`🎙️ [TRANSCRIPTION] Duration: ${transcriptionResult.duration}s`);
              } else {
                console.error('🎙️ [TRANSCRIPTION] Transcription failed:', transcriptionResult.error);
              }
              
              // Save transcription result to file for future use
              if (transcriptionResult.success) {
                try {
                  if (!fs.existsSync(processingDir)) {
                    fs.mkdirSync(processingDir, { recursive: true });
                  }
                  fs.writeFileSync(transcriptionFile, JSON.stringify(transcriptionResult, null, 2));
                  console.log('🎙️ [TRANSCRIPTION] Saved transcription data to:', transcriptionFile);
                } catch (saveError) {
                  console.error('🎙️ [TRANSCRIPTION] Error saving transcription data:', saveError);
                }
              }
              
              resolve(transcriptionResult);
            } catch (parseError) {
              console.error('🎙️ [TRANSCRIPTION] Failed to parse output:', output);
              console.error('🎙️ [TRANSCRIPTION] Parse error:', parseError);
              resolve({
                success: false,
                error: 'Failed to parse transcription results',
                details: output
              });
            }
          } else {
            console.error('🎙️ [TRANSCRIPTION] Python script error:', errorOutput);
            resolve({
              success: false,
              error: `Transcription failed with code ${code}`,
              details: errorOutput
            });
          }
        });

        pythonProcess.on('error', (error) => {
          console.error('🎙️ [TRANSCRIPTION] Process error:', error);
          // Clean up temp file
          try {
            fs.unlinkSync(tempScriptPath);
          } catch (e) {
            console.warn('Could not clean up temp script file:', e);
          }
          reject(error);
        });
      });

      return NextResponse.json(result);

    } catch (error) {
      // Clean up temp file in case of error
      try {
        fs.unlinkSync(tempScriptPath);
      } catch (e) {
        console.warn('Could not clean up temp script file:', e);
      }
      throw error;
    }

  } catch (error) {
    console.error('🎙️ [TRANSCRIPTION] API Error:', error);
    return NextResponse.json({ 
      success: false,
      error: 'Failed to transcribe video',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 