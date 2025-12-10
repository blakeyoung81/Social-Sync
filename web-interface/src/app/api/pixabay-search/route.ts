import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'child_process';
import path from 'path';

const PYTHON_SCRIPT_DIR = path.resolve(process.cwd(), '..', 'src', 'core');

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('q') || 'background music';
    const maxResults = searchParams.get('max_results') || '20';

    // Search Pixabay using Python script
    const result = await runPythonScript('search_pixabay_music.py', [query, maxResults]);
    
    if (result.success) {
      return NextResponse.json({ 
        success: true, 
        results: JSON.parse(result.output) 
      });
    } else {
      return NextResponse.json({ 
        success: false, 
        error: result.error 
      }, { status: 500 });
    }
  } catch (error) {
    console.error('Error searching Pixabay:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to search Pixabay' 
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { videoData, customName } = await request.json();
    
    if (!videoData || !videoData.id) {
      return NextResponse.json({ 
        success: false, 
        error: 'Video data is required' 
      }, { status: 400 });
    }

    // Download music using Python script
    const args = [JSON.stringify(videoData)];
    if (customName) {
      args.push(customName);
    }
    
    const result = await runPythonScript('download_pixabay_music.py', args);
    
    if (result.success) {
      return NextResponse.json({ 
        success: true, 
        filename: result.output.trim() 
      });
    } else {
      return NextResponse.json({ 
        success: false, 
        error: result.error 
      }, { status: 500 });
    }
  } catch (error) {
    console.error('Error downloading Pixabay music:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to download music' 
    }, { status: 500 });
  }
}

async function runPythonScript(scriptName: string, args: string[] = []): Promise<{success: boolean, output?: string, error?: string}> {
  return new Promise((resolve) => {
    const scriptPath = path.join(PYTHON_SCRIPT_DIR, scriptName);
    const pythonProcess = spawn('python3', [scriptPath, ...args], {
      cwd: path.resolve(process.cwd(), '..'),
    });

    let output = '';
    let error = '';

    pythonProcess.stdout.on('data', (data) => {
      output += data.toString();
    });

    pythonProcess.stderr.on('data', (data) => {
      error += data.toString();
    });

    pythonProcess.on('close', (code) => {
      if (code === 0) {
        resolve({ success: true, output: output.trim() });
      } else {
        resolve({ success: false, error: error.trim() || 'Unknown error' });
      }
    });

    pythonProcess.on('error', (err) => {
      resolve({ success: false, error: err.message });
    });
  });
}