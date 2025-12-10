import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs';

const execAsync = promisify(exec);

export async function POST(request: NextRequest) {
  try {
    const { videoPath, clips } = await request.json();
    
    if (!videoPath || !clips || !Array.isArray(clips)) {
      return NextResponse.json({ error: 'Invalid request data' }, { status: 400 });
    }

    const thumbnailDir = path.join(process.cwd(), 'public', 'thumbnails');
    const videoName = path.basename(videoPath, path.extname(videoPath));
    const videoThumbnailDir = path.join(thumbnailDir, videoName);
    
    // Ensure thumbnail directory exists
    if (!fs.existsSync(videoThumbnailDir)) {
      fs.mkdirSync(videoThumbnailDir, { recursive: true });
    }

    const thumbnailMap: Record<string, string> = {};
    
    // Generate thumbnails for each clip
    for (const clip of clips) {
      const thumbnailPath = path.join(videoThumbnailDir, `clip_${clip.id}.jpg`);
      const thumbnailUrl = `/thumbnails/${videoName}/clip_${clip.id}.jpg`;
      
      // Skip if thumbnail already exists
      if (fs.existsSync(thumbnailPath)) {
        thumbnailMap[clip.id] = thumbnailUrl;
        continue;
      }

      // Calculate the middle timestamp of the clip for thumbnail
      const middleTime = clip.sourceStart + (clip.duration / 2);
      
      // Generate thumbnail using ffmpeg
      const ffmpegCmd = [
        'ffmpeg',
        '-i', `"${videoPath}"`,
        '-ss', middleTime.toString(),
        '-vframes', '1',
        '-q:v', '2',
        '-vf', 'scale=320:180',
        '-y',
        `"${thumbnailPath}"`
      ].join(' ');
      
      try {
        await execAsync(ffmpegCmd);
        thumbnailMap[clip.id] = thumbnailUrl;
      } catch (error) {
        console.error(`Failed to generate thumbnail for clip ${clip.id}:`, error);
        // Continue with other clips even if one fails
      }
    }

    return NextResponse.json({ thumbnailMap });
  } catch (error) {
    console.error('Error generating thumbnails:', error);
    return NextResponse.json({ error: 'Failed to generate thumbnails' }, { status: 500 });
  }
} 