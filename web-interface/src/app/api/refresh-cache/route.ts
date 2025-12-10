import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export async function POST(request: NextRequest) {
  try {
        // Call Python script to force refresh cache
    // Use the virtual environment Python
    const pythonPath = path.resolve(process.cwd(), '..', '.venv', 'bin', 'python');
    const { stdout, stderr } = await execAsync(
        `"${pythonPath}" -c "` +
      'import sys; sys.path.append(\\"../src\\"); ' +
      'from workflows.youtube_uploader import YouTubeUploader; ' +
      'uploader = YouTubeUploader(); ' +
      'uploader.force_refresh_cache(); ' +
      'print(\\"Cache refreshed successfully\\")"',
      { 
        cwd: process.cwd(),
        timeout: 60000 // 60 second timeout for cache refresh
      }
    );

    if (stderr) {
      console.error('Cache refresh stderr:', stderr);
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Cache refreshed successfully',
      output: stdout.trim()
    });
  } catch (error) {
    console.error('Error refreshing cache:', error);
    
    return NextResponse.json({ 
      success: false, 
      message: 'Failed to refresh cache',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 