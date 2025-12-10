import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'child_process';
import path from 'path';

export async function POST(request: NextRequest) {
  try {
    const { videoPath, silenceThreshold, smartDetection, silenceMargin } = await request.json();
    
    if (!videoPath) {
      return NextResponse.json({ error: 'Video path is required' }, { status: 400 });
    }

    // Call Python script for audio analysis using python3 with virtual environment
    const pythonScript = path.resolve(process.cwd(), '..', 'scripts', 'analyze_audio.py');
    const pythonPath = path.resolve(process.cwd(), '..', 'venv', 'bin', 'python3');
    
    const args = [
      pythonScript,
      videoPath,
      (silenceThreshold || 0.07).toString(),
      (smartDetection || false).toString(),
      (silenceMargin || 0.2).toString()
    ];

    console.log(`🎵 [AUDIO ANALYSIS] Running: ${pythonPath} ${args.join(' ')}`);

    const pythonProcess = spawn(pythonPath, args, {
      cwd: path.resolve(process.cwd(), '..'),
      env: {
        ...process.env,
        PYTHONPATH: path.resolve(process.cwd(), '..'),
        PATH: `${path.resolve(process.cwd(), '..', 'venv', 'bin')}:${process.env.PATH}`,
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
        if (code === 0) {
          try {
            // Parse the JSON output from Python script
            const jsonOutput = output.trim();
            console.log(`🎵 [AUDIO ANALYSIS] Raw output: ${jsonOutput.substring(0, 200)}...`);
            
            const analysis = JSON.parse(jsonOutput);
            
            if (analysis.success) {
              console.log(`🎵 [AUDIO ANALYSIS] Success: ${analysis.estimatedCuts} cuts, ${analysis.timePercentageSaved.toFixed(1)}% time saved`);
            } else {
              console.error('🎵 [AUDIO ANALYSIS] Analysis failed:', analysis.error);
            }
            
            resolve(analysis);
          } catch (parseError) {
            console.error('🎵 [AUDIO ANALYSIS] Failed to parse output:', output);
            console.error('🎵 [AUDIO ANALYSIS] Parse error:', parseError);
            reject(new Error('Failed to parse analysis results'));
          }
        } else {
          console.error('🎵 [AUDIO ANALYSIS] Python script error:', errorOutput);
          reject(new Error(`Audio analysis failed with code ${code}`));
        }
      });

      pythonProcess.on('error', (error) => {
        console.error('🎵 [AUDIO ANALYSIS] Process error:', error);
        reject(error);
      });
    });

    return NextResponse.json(result);

  } catch (error) {
    console.error('🎵 [AUDIO ANALYSIS] API Error:', error);
    return NextResponse.json({ 
      error: 'Failed to analyze audio',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 