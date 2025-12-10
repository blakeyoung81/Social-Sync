import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';

export async function POST(request: NextRequest) {
  try {
    const { videoPath, checkExisting = false } = await request.json();
    
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

    // Check for existing silence analysis data
    const videoBaseName = path.basename(videoPath, path.extname(videoPath));
    const processingDir = path.join(process.cwd(), '..', 'data', 'uploads', 'temp_processing');
    const silenceFile = path.join(processingDir, `${videoBaseName}_silence_analysis.json`);
    
    if (checkExisting && fs.existsSync(silenceFile)) {
      try {
        const existingData = JSON.parse(fs.readFileSync(silenceFile, 'utf8'));
        console.log('🔇 [SILENCE ANALYSIS] Found existing silence analysis for:', videoBaseName);
        return NextResponse.json({
          success: true,
          ...existingData,
          fromCache: true
        });
      } catch (error) {
        console.error('🔇 [SILENCE ANALYSIS] Error reading existing analysis:', error);
        // Continue with new analysis
      }
    }

    // If checkExisting is true but no existing data found, return empty result
    if (checkExisting) {
      return NextResponse.json({
        success: false,
        error: 'No existing silence analysis found'
      });
    }

    // Call Python script for audio analysis using python3 with virtual environment
    const pythonScript = path.resolve(process.cwd(), '..', 'scripts', 'analyze_audio.py');
    const pythonPath = path.resolve(process.cwd(), '..', 'venv', 'bin', 'python3');
    
    const args = [
      pythonScript,
      resolvedVideoPath,
      '0.05', // silenceThreshold - lower = more aggressive silence detection
      'true', // smartDetection
      '0.15'  // silenceMargin - shorter margin for tighter cuts
    ];

    console.log(`🔇 [SILENCE ANALYSIS] Running: ${pythonPath} ${args.join(' ')}`);

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
        if (code === 0) {
          try {
            // Parse the JSON output from Python script
            const jsonOutput = output.trim();
            console.log(`🔇 [SILENCE ANALYSIS] Raw output: ${jsonOutput.substring(0, 200)}...`);
            
            const analysis = JSON.parse(jsonOutput);
            
            if (analysis.success) {
              console.log(`🔇 [SILENCE ANALYSIS] Success: ${analysis.estimatedCuts} cuts, ${analysis.timePercentageSaved.toFixed(1)}% time saved`);
              
              // Save silence analysis result to file for future use
              try {
                if (!fs.existsSync(processingDir)) {
                  fs.mkdirSync(processingDir, { recursive: true });
                }
                fs.writeFileSync(silenceFile, JSON.stringify(analysis, null, 2));
                console.log('🔇 [SILENCE ANALYSIS] Saved analysis data to:', silenceFile);
              } catch (saveError) {
                console.error('🔇 [SILENCE ANALYSIS] Error saving analysis data:', saveError);
              }
            } else {
              console.error('🔇 [SILENCE ANALYSIS] Analysis failed:', analysis.error);
            }
            
            resolve(analysis);
          } catch (parseError) {
            console.error('🔇 [SILENCE ANALYSIS] Failed to parse output:', output);
            console.error('🔇 [SILENCE ANALYSIS] Parse error:', parseError);
            resolve({
              success: false,
              error: 'Failed to parse analysis results',
              details: output
            });
          }
        } else {
          console.error('🔇 [SILENCE ANALYSIS] Python script error:', errorOutput);
          resolve({
            success: false,
            error: `Silence analysis failed with code ${code}`,
            details: errorOutput
          });
        }
      });

      pythonProcess.on('error', (error) => {
        console.error('🔇 [SILENCE ANALYSIS] Process error:', error);
        reject(error);
      });
    });

    return NextResponse.json(result);

  } catch (error) {
    console.error('🔇 [SILENCE ANALYSIS] API Error:', error);
    return NextResponse.json({ 
      success: false,
      error: 'Failed to analyze silence',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 