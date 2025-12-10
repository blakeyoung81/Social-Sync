import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'child_process';
import path from 'path';

interface ProcessingOptions {
  cutSilences: boolean;
  cutBadTakes: boolean;
  removeFiller: boolean;
  addSmartCaptions: boolean;
  likeSubscribeButton: boolean;
  jumpCutZoom: boolean;
  enhanceAudio: boolean;
  aiBackground: boolean;
}

export async function POST(request: NextRequest) {
  try {
    const { videoPath, options }: { videoPath: string; options: ProcessingOptions } = await request.json();

    if (!videoPath || !options) {
      return NextResponse.json(
        { error: 'Video path and options are required' },
        { status: 400 }
      );
    }

    // Build processing pipeline based on options
    const processingSteps = [];
    
    if (options.addSmartCaptions) {
      processingSteps.push('transcription');
    }
    
    if (options.cutSilences) {
      processingSteps.push('silence_removal');
    }
    
    if (options.removeFiller) {
      processingSteps.push('filler_removal');
    }
    
    if (options.cutBadTakes) {
      processingSteps.push('bad_takes');
    }
    
    if (options.enhanceAudio) {
      processingSteps.push('audio_enhancement');
    }
    
    if (options.likeSubscribeButton) {
      processingSteps.push('like_subscribe');
    }
    
    if (options.jumpCutZoom) {
      processingSteps.push('jump_cut_zoom');
    }
    
    if (options.aiBackground) {
      processingSteps.push('ai_background');
    }

    // Execute processing pipeline
    const results = {
      videoPath,
      processedSteps: [] as Array<{ step: string; success: boolean; result: any }>,
      errors: [] as Array<{ step: string; error: string }>
    };

    // Run each processing step
    for (const step of processingSteps) {
      try {
        const result = await executeProcessingStep(videoPath, step);
        results.processedSteps.push({
          step,
          success: true,
          result
        });
      } catch (error) {
        results.errors.push({
          step,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Processing completed',
      results
    });

  } catch (error) {
    console.error('Error processing video batch:', error);
    return NextResponse.json(
      { error: 'Failed to process video batch' },
      { status: 500 }
    );
  }
}

async function executeProcessingStep(videoPath: string, step: string): Promise<any> {
  return new Promise((resolve, reject) => {
    const pythonPath = path.join(process.cwd(), '..', 'src', 'core');
    
    let scriptName = '';
    let args = [videoPath];
    
    switch (step) {
      case 'transcription':
        scriptName = 'transcription.py';
        break;
      case 'silence_removal':
        scriptName = 'silence_detection.py';
        break;
      case 'filler_removal':
        scriptName = 'filler_detection.py';
        break;
      case 'bad_takes':
        scriptName = 'bad_takes_detection.py';
        break;
      case 'audio_enhancement':
        scriptName = 'audio_enhancement.py';
        break;
      case 'like_subscribe':
        scriptName = 'overlay_generator.py';
        args.push('--type', 'like_subscribe');
        break;
      case 'jump_cut_zoom':
        scriptName = 'video_effects.py';
        args.push('--effect', 'jump_cut_zoom');
        break;
      case 'ai_background':
        scriptName = 'background_generator.py';
        break;
      default:
        reject(new Error(`Unknown processing step: ${step}`));
        return;
    }
    
    const scriptPath = path.join(pythonPath, scriptName);
    const pythonProcess = spawn('python3', [scriptPath, ...args]);
    
    let stdout = '';
    let stderr = '';
    
    pythonProcess.stdout.on('data', (data) => {
      stdout += data.toString();
    });
    
    pythonProcess.stderr.on('data', (data) => {
      stderr += data.toString();
    });
    
    pythonProcess.on('close', (code) => {
      if (code === 0) {
        try {
          const result = JSON.parse(stdout);
          resolve(result);
        } catch (e) {
          resolve({ success: true, output: stdout });
        }
      } else {
        reject(new Error(`Process exited with code ${code}: ${stderr}`));
      }
    });
    
    pythonProcess.on('error', (error) => {
      reject(error);
    });
  });
} 