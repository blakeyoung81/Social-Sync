import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs/promises';

const VIDEO_EXTENSIONS = ['.mp4', '.mov', '.avi', '.mkv', '.webm', '.m4v'];

export async function POST(request: NextRequest) {
  try {
    const { inputFolder } = await request.json();
    
    if (!inputFolder) {
      return NextResponse.json({ error: 'Input folder is required' }, { status: 400 });
    }

    // Check if directory exists
    try {
      await fs.access(inputFolder);
    } catch (error) {
      return NextResponse.json({ error: 'Directory not found' }, { status: 404 });
    }

    // Read directory contents
    const files = await fs.readdir(inputFolder);
    
    // Filter for video files
    const videoFiles = files.filter(file => 
      VIDEO_EXTENSIONS.some(ext => file.toLowerCase().endsWith(ext))
    );

    if (videoFiles.length === 0) {
      return NextResponse.json({ error: 'No video files found' }, { status: 404 });
    }

    // Get the first video file
    const firstVideoFile = videoFiles[0];
    const firstVideoPath = path.join(inputFolder, firstVideoFile);
    
    // Get file stats
    const stats = await fs.stat(firstVideoPath);
    
    // Get video metadata using ffprobe (duration and dimensions)
    let duration = 0;
    let width = 0;
    let height = 0;
    try {
      const { spawn } = require('child_process');
      const ffprobe = spawn('ffprobe', [
        '-v', 'quiet',
        '-show_entries', 'format=duration:stream=width,height',
        '-of', 'csv=p=0',
        firstVideoPath
      ]);
      
      const metadataPromise = new Promise<{duration: number, width: number, height: number}>((resolve) => {
        let output = '';
        ffprobe.stdout.on('data', (data: Buffer) => {
          output += data.toString();
        });
        
        ffprobe.on('close', () => {
          const lines = output.trim().split('\n');
          let dur = 0;
          let w = 0; 
          let h = 0;
          
          for (const line of lines) {
            const values = line.split(',');
            if (values.length === 1 && !isNaN(parseFloat(values[0]))) {
              // Duration line
              dur = parseFloat(values[0]);
            } else if (values.length >= 2 && !isNaN(parseInt(values[0])) && !isNaN(parseInt(values[1]))) {
              // Width,height line  
              w = parseInt(values[0]);
              h = parseInt(values[1]);
            }
          }
          
          resolve({ duration: dur, width: w, height: h });
        });
      });
      
      const metadata = await metadataPromise;
      duration = metadata.duration;
      width = metadata.width;
      height = metadata.height;
    } catch (error) {
      console.warn('Could not get video metadata:', error);
    }

    return NextResponse.json({
      path: firstVideoPath,
      name: firstVideoFile,
      duration: duration,
      size: stats.size,
      width: width,
      height: height
    });

  } catch (error) {
    console.error('Error in preview-video API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 