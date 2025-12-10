import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs/promises';
import { randomUUID } from 'crypto';
import { activeProcesses, ProcessInfo, getAllProcesses } from '@/lib/previewStore';

export async function POST(req: NextRequest) {
  try {
    const { videoPath, options, previewMode } = await req.json();

    if (!videoPath) {
      return NextResponse.json(
        { error: 'Video path is required' },
        { status: 400 }
      );
    }

    // Generate unique processing ID
    const processingId = randomUUID();

    // Create temp directory for preview
    const previewDir = path.join(process.cwd(), 'temp', 'previews', processingId);
    await fs.mkdir(previewDir, { recursive: true });

    const previewPath = path.join(previewDir, 'preview.mp4');

    // Build Python command for preview processing
    const pythonScript = path.join(process.cwd(), '..', 'src', 'core', 'video_processing.py');
    const venvPython = path.join(process.cwd(), '..', 'venv', 'bin', 'python3');

    const args = [
      pythonScript,
      '--video-path', videoPath,
      '--output-path', previewPath,
      '--preview-mode', 'true',
      '--processing-id', processingId,
    ];

    // Add all options as CLI arguments
    if (options.skipSilence !== undefined) args.push('--skip-silence', String(options.skipSilence));
    if (options.skipTranscription !== undefined) args.push('--skip-transcription', String(options.skipTranscription));
    if (options.skipGpt !== undefined) args.push('--skip-gpt', String(options.skipGpt));
    if (options.skipSubtitles !== undefined) args.push('--skip-subtitles', String(options.skipSubtitles));
    
    // Bad Take Removal - AI settings
    if (options.skipBadTakeRemoval !== undefined) args.push('--skip-bad-take-removal', String(options.skipBadTakeRemoval));
    if (options.badTakeDetectionMode) args.push('--bad-take-detection-mode', options.badTakeDetectionMode);
    if (options.badTakeAIModel) args.push('--bad-take-ai-model', options.badTakeAIModel);
    if (options.badTakeConfidenceThreshold !== undefined) args.push('--bad-take-confidence-threshold', String(options.badTakeConfidenceThreshold));
    if (options.badTakeUseAudioAnalysis !== undefined) args.push('--bad-take-use-audio-analysis', String(options.badTakeUseAudioAnalysis));
    if (options.badTakeContextWindow !== undefined) args.push('--bad-take-context-window', String(options.badTakeContextWindow));
    if (options.badTakeCustomInstructions) args.push('--bad-take-custom-instructions', options.badTakeCustomInstructions);

    // Add other processing options...
    // (You can extend this with all other options)

    // Spawn Python process
    const pythonProcess = spawn(venvPython, args, {
      env: {
        ...process.env,
        PYTHONUNBUFFERED: '1',
      },
    });

    // Store process info
    activeProcesses.set(processingId, {
      process: pythonProcess,
      progress: {
        step: 'Initializing...',
        progress: 0,
        status: 'processing',
      },
      previewPath,
    });

    // Handle process output
    pythonProcess.stdout.on('data', (data: Buffer) => {
      const output = data.toString();
      console.log('[Preview]', output);

      // Parse progress updates
      const progressMatch = output.match(/PROGRESS:(\d+):(.+)/);
      if (progressMatch) {
        const [, progress, step] = progressMatch;
        const processInfo = activeProcesses.get(processingId);
        if (processInfo) {
          processInfo.progress = {
            step,
            progress: parseInt(progress),
            status: 'processing',
          };
        }
      }
    });

    pythonProcess.stderr.on('data', (data: Buffer) => {
      console.error('[Preview Error]', data.toString());
    });

    pythonProcess.on('close', async (code) => {
      const processInfo = activeProcesses.get(processingId);
      if (processInfo) {
        if (code === 0) {
          processInfo.progress = {
            step: 'Complete',
            progress: 100,
            status: 'complete',
            previewUrl: `/api/preview/video/${processingId}`,
          };
        } else {
          processInfo.progress = {
            step: 'Error',
            progress: 0,
            status: 'error',
            message: `Process exited with code ${code}`,
          };
        }
      }
    });

    return NextResponse.json({
      processingId,
      message: 'Preview processing started',
    });
  } catch (error: any) {
    console.error('Preview error:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

// Get active processes (for debugging)
export async function GET() {
  const processes = getAllProcesses();
  return NextResponse.json({ processes });
}
