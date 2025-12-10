import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import { logger } from '@/utils/logger';
import { DEFAULT_SETTINGS } from '@/constants/processing';
import type { ProcessingOptions } from '@/types';

function buildArgs(options: ProcessingOptions): string[] {
    const args = [];
    // Dynamically build args from options
    for (const key in options) {
        const value = options[key as keyof ProcessingOptions];
        if (key.startsWith('skip') && value) {
            const argName = key.replace(/([A-Z])/g, '-$1').toLowerCase();
            args.push(`--${argName}`);
        }
    }
    
    // Add args with values
    args.push('--whisper-model', options.whisperModel);
    args.push('--gpt-model', options.gptModel);
    args.push('--highlight-style', options.highlightStyle);
    args.push('--broll-clip-count', options.brollClipCount.toString());
    args.push('--broll-clip-duration', options.brollClipDuration.toString());
    args.push('--caption-style', options.captionStyle);
    args.push('--topic-card-style', options.topicCardStyle);
    args.push('--frame-style', options.frameStyle);
    args.push('--subtitle-font-size', options.subtitleFontSize?.toString() || '8');
    if(options.logoPath) args.push('--logo-path', options.logoPath);
    
    // Add boolean flags that are not 'skip' flags
    if (options.useFfmpegEnhance) args.push('--use-ffmpeg-enhance');
    if (options.useAiDenoiser) args.push('--use-ai-denoiser');

    return args;
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const pythonScript = path.resolve(process.cwd(), '..', 'src', 'workflows', 'youtube_uploader.py');
  
  if (!fs.existsSync(pythonScript)) {
    logger.error('Python script not found at:', pythonScript);
    return new NextResponse(JSON.stringify({ error: 'Python script not found' }), { status: 500 });
  }
  
  try {
      const { files, options } = await req.json();
      const allOptions: ProcessingOptions = { ...DEFAULT_SETTINGS, ...options };

      if (!files || files.length === 0) {
          return NextResponse.json({ error: 'No files to process' }, { status: 400 });
      }

      const baseArgs = files.map((f: { path: string }) => f.path);
      const processingArgs = buildArgs(allOptions);
      
      const allSpawnArgs = [...baseArgs, ...processingArgs];

              // Use the virtual environment Python
        const pythonPath = path.resolve(process.cwd(), '..', 'venv', 'bin', 'python');
        const process = spawn(pythonPath, [pythonScript, ...allSpawnArgs]);
      let stdout = '';
      let stderr = '';

      process.stdout.on('data', (data) => {
          stdout += data.toString();
          logger.info(`Python stdout: ${data.toString()}`);
      });

      process.stderr.on('data', (data) => {
          stderr += data.toString();
          logger.error(`Python stderr: ${data.toString()}`);
      });

      process.on('close', (code) => {
          logger.info(`Python script finished with code ${code}`);
          if (code === 0) {
              return NextResponse.json({ success: true, message: 'Processing complete', output: stdout });
          } else {
              return NextResponse.json({ error: 'Processing failed', details: stderr }, { status: 500 });
          }
      });

      process.on('error', (err) => {
        logger.error('Failed to start python process:', err);
        return NextResponse.json({ error: 'Failed to start processing script', details: err.message }, { status: 500 });
      });

  } catch (error) {
      logger.error('Error in process-videos endpoint:', error);
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      return NextResponse.json({ error: 'Server error', details: errorMessage }, { status: 500 });
  }
} 