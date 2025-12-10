import { NextRequest } from 'next/server';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';

export async function POST(request: NextRequest) {
  const encoder = new TextEncoder();
  
  const stream = new ReadableStream({
    async start(controller) {
      try {
        const body = await request.json();
        const { videoPath, options, timestamp } = body;

        if (!videoPath) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'error', message: 'No video path provided' })}\n\n`));
          controller.close();
          return;
        }

        // Create output directory for preview
        const tempDir = path.join(process.cwd(), '..', 'data', 'output_videos', `preview_${timestamp}`);
        const tempProcessingDir = path.join(tempDir, 'temp_processing');
        if (!fs.existsSync(tempDir)) {
          fs.mkdirSync(tempDir, { recursive: true });
        }

        const pythonScriptPath = path.resolve(process.cwd(), '..', 'src', 'workflows', 'youtube_uploader.py');
        const venvPythonPath = path.resolve(process.cwd(), '..', 'venv', 'bin', 'python3');

        // Build arguments for Python script with all options
        // Note: positional arguments (video_files) must come AFTER all flags
        const args = [
          pythonScriptPath,
          '--output-dir', tempDir,
          '--mode', 'process-only', // Force process-only mode for preview
        ];

        // Add processing options
        if (options.skipAudio) args.push('--skip-audio');
        if (options.skipSilence) args.push('--skip-silence');
        if (options.skipTranscription) args.push('--skip-transcription');
        if (options.skipGpt) args.push('--skip-gpt');
        if (options.skipSubtitles) args.push('--skip-subtitles');
        if (options.skipBroll) args.push('--skip-broll');
        if (options.skipDynamicZoom) args.push('--skip-dynamic-zoom');
        if (options.skipBackgroundMusic) args.push('--skip-background-music');
        if (options.skipSoundEffects) args.push('--skip-sound-effects');
        if (options.skipImageGeneration) args.push('--skip-image-generation');
        if (options.skipBadTakeRemoval) args.push('--skip-bad-take-removal');
        
        // Add configuration options
        if (options.silenceThreshold) args.push('--silence-threshold', String(options.silenceThreshold));
        if (options.silenceDuration) args.push('--silence-duration', String(options.silenceDuration));
        if (options.whisperModel) args.push('--whisper-model', options.whisperModel);
        if (options.gptModel) args.push('--gpt-model', options.gptModel);
        if (options.subtitleFontSize) args.push('--subtitle-font-size', String(options.subtitleFontSize));
        if (options.zoomIntensity) args.push('--zoom-intensity', options.zoomIntensity);
        if (options.zoomFrequency) args.push('--zoom-frequency', options.zoomFrequency);
        if (options.musicTrack) args.push('--music-track', options.musicTrack);
        if (options.frameStyle) args.push('--frame-style', options.frameStyle);
        if (options.highlightStyle) args.push('--highlight-style', options.highlightStyle);
        
        // Add video path as positional argument at the END
        args.push(videoPath);

        // Log the command for debugging
        console.log('[Full Render] Running command:', venvPythonPath, args.join(' '));
        
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
          type: 'progress', 
          progress: 0, 
          message: 'Starting full render...' 
        })}\n\n`));

        const pythonProcess = spawn(venvPythonPath, args, {
          env: {
            ...process.env,
            PYTHONUNBUFFERED: '1',
            PYTHONIOENCODING: 'utf-8',
            OPENAI_API_KEY: process.env.OPENAI_API_KEY,
            PEXELS_API_KEY: process.env.PEXELS_API_KEY,
          },
        });

        let currentProgress = 0;
        let outputVideoPath = '';
        let stderrOutput = '';

        pythonProcess.stdout.on('data', (data) => {
          const output = data.toString();
          console.log('[Full Render STDOUT]', output);

          // Parse PROGRESS JSON from Python script (most accurate)
          const progressMatch = output.match(/PROGRESS:({.*})/);
          if (progressMatch) {
            try {
              const progressData = JSON.parse(progressMatch[1]);
              const percentage = progressData.percentage || 0;
              currentProgress = Math.min(percentage, 100);
              
              try {
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
                  type: 'progress', 
                  progress: currentProgress, 
                  message: `[${progressData.current_step}/${progressData.total_steps}] ${progressData.step}: ${progressData.message}` 
                })}\n\n`));
              } catch (err) {
                console.log('[Full Render] Controller closed during progress');
              }
              return; // Don't process further if we found PROGRESS JSON
            } catch (e) {
              console.log('[Full Render] Failed to parse PROGRESS JSON:', e);
            }
          }

          // Fallback: Parse percentage from step messages
          const stepMatch = output.match(/\[(\d+)\/(\d+)\]/);
          if (stepMatch) {
            const currentStep = parseInt(stepMatch[1]);
            const totalSteps = parseInt(stepMatch[2]);
            currentProgress = Math.min(Math.round((currentStep / totalSteps) * 100), 100);
            
            try {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
                type: 'progress', 
                progress: currentProgress, 
                message: output.trim().substring(0, 200) 
              })}\n\n`));
            } catch (err) {
              console.log('[Full Render] Controller closed');
            }
            return;
          }

          // Send any INFO messages as progress updates
          if (output.includes('INFO') || output.includes('Processing:')) {
            try {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
                type: 'progress', 
                progress: currentProgress, 
                message: output.trim().substring(0, 200) 
              })}\n\n`));
            } catch (err) {
              console.log('[Full Render] Controller closed during info');
            }
          }

          // Extract video path from output
          const videoPathMatch = output.match(/Final video saved to: (.+\.mp4)/);
          if (videoPathMatch) {
            outputVideoPath = videoPathMatch[1].trim();
          }
        });

        pythonProcess.stderr.on('data', (data) => {
          const error = data.toString();
          stderrOutput += error;
          
          // Filter out normal progress bars (tqdm, batch progress, etc.)
          const isProgressBar = error.includes('frames/s]') || 
                               error.includes('it/s]') || 
                               error.includes('|') && error.includes('%') ||
                               error.includes('Batches:');
          
          // Only log actual errors, not progress bars
          if (!isProgressBar) {
            console.error('[Full Render STDERR]', error);
          }
          
          // Don't send progress bars to client - they spam the UI
          if (!isProgressBar) {
            try {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
                type: 'progress', 
                message: error.substring(0, 200) 
              })}\n\n`));
            } catch (err) {
              // Controller already closed, ignore
              console.log('[Full Render] Controller already closed');
            }
          }
        });

        pythonProcess.on('close', (code) => {
          console.log('[Full Render] Process exited with code:', code);
          
          // Filter progress bars from error output for cleaner display
          const actualErrors = stderrOutput
            .split('\n')
            .filter(line => {
              const isProgressBar = line.includes('frames/s]') || 
                                   line.includes('it/s]') || 
                                   (line.includes('|') && line.includes('%')) ||
                                   line.includes('Batches:');
              return !isProgressBar && line.trim().length > 0;
            })
            .join('\n');
          
          if (actualErrors.length > 0) {
            console.error('[Full Render] Actual errors:', actualErrors);
          }
          
          // Code 0 = success, always try to find output video
          if (code === 0) {
            // Try to find the video file in the output directory
            try {
              if (!fs.existsSync(tempDir)) {
                console.error('[Full Render] Temp dir does not exist:', tempDir);
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
                  type: 'error', 
                  message: `Output directory not found: ${tempDir}`
                })}\n\n`));
                controller.close();
                return;
              }
              
              // Check both root and temp_processing subdirectory
              const dirsToCheck = [
                tempDir,
                tempProcessingDir,
                path.join(tempDir, 'edited_videos')
              ].filter(d => fs.existsSync(d));
              
              console.log('[Full Render] Checking directories:', dirsToCheck);
              
              let mp4Files: string[] = [];
              let mp4FileMap: Map<string, string> = new Map(); // filename -> full path
              
              for (const dir of dirsToCheck) {
                try {
                  const files = fs.readdirSync(dir);
                  const dirMp4s = files.filter(f => f.endsWith('.mp4'));
                  dirMp4s.forEach(f => {
                    mp4FileMap.set(f, path.join(dir, f));
                  });
                  mp4Files.push(...dirMp4s);
                  console.log(`[Full Render] Found in ${dir}:`, dirMp4s);
                } catch (err) {
                  console.log(`[Full Render] Could not read ${dir}:`, err);
                }
              }
              
              console.log('[Full Render] All MP4 files found:', mp4Files);
              
              // Prefer files with "final" or "music" in the name (last processing steps)
              // Otherwise use any processed video (including silence_cut)
              const finalVideoName = mp4Files.find(f => f.includes('final') || f.includes('music')) || 
                                     mp4Files.find(f => !f.includes('temp')) ||
                                     mp4Files[mp4Files.length - 1]; // Last file as fallback
              
              if (finalVideoName) {
                const foundPath = mp4FileMap.get(finalVideoName) || path.join(tempDir, finalVideoName);
                console.log('[Full Render] Found final video:', foundPath);
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
                  type: 'complete', 
                  progress: 100,
                  videoPath: foundPath,
                  message: 'Rendering complete!' 
                })}\n\n`));
              } else if (outputVideoPath) {
                // Use the path we found during processing
                console.log('[Full Render] Using captured output path:', outputVideoPath);
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
                  type: 'complete', 
                  progress: 100,
                  videoPath: outputVideoPath,
                  message: 'Rendering complete!' 
                })}\n\n`));
              } else {
                console.error('[Full Render] No MP4 files found in any directory');
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
                  type: 'error', 
                  message: `Process completed but no output video found. Checked directories: ${dirsToCheck.join(', ')}`
                })}\n\n`));
              }
            } catch (err) {
              console.error('[Full Render] Error finding output:', err);
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
                type: 'error', 
                message: `Error finding output video: ${err}`
              })}\n\n`));
            }
          } else {
            // Non-zero exit code = actual error
            const errorMsg = actualErrors.length > 0 
              ? actualErrors.substring(0, 500) 
              : `Process exited with code ${code}`;
            console.error('[Full Render] Process failed:', errorMsg);
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
              type: 'error', 
              message: errorMsg
            })}\n\n`));
          }
          controller.close();
        });

        pythonProcess.on('error', (error) => {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
            type: 'error', 
            message: error.message 
          })}\n\n`));
          controller.close();
        });

      } catch (error: any) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
          type: 'error', 
          message: error.message 
        })}\n\n`));
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}

