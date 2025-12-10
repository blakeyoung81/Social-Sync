import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const filePath = searchParams.get('path');
    
    if (!filePath) {
      return NextResponse.json({ error: 'File path is required' }, { status: 400 });
    }

    // Security check - only allow output_videos directory files
    // Allow both local temp and the YoutubeUploader/data/output_videos directory
    const allowedPaths = [
      path.join(process.cwd(), 'temp'),
      path.join(process.cwd(), '..', '..', 'data', 'output_videos'),
      '/Users/blakeyoung/Library/Mobile Documents/com~apple~CloudDocs/Coding/Social Sync/YoutubeUploader/data/output_videos'
    ];
    
    const resolvedPath = path.resolve(filePath);
    const isAllowed = allowedPaths.some(allowedPath => {
      const resolvedAllowedPath = path.resolve(allowedPath);
      return resolvedPath.startsWith(resolvedAllowedPath);
    });
    
    if (!isAllowed) {
      console.error('Access denied for path:', resolvedPath);
      console.error('Allowed paths:', allowedPaths.map(p => path.resolve(p)));
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    const stat = fs.statSync(filePath);
    const fileSize = stat.size;
    const range = request.headers.get('range');

    if (range) {
      const parts = range.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunkSize = (end - start) + 1;
      
      const file = fs.createReadStream(filePath, { start, end });
      
      const headers = new Headers({
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunkSize.toString(),
        'Content-Type': 'video/mp4',
        'Cache-Control': 'no-cache'
      });

      return new NextResponse(file as any, { status: 206, headers });
    } else {
      const file = fs.createReadStream(filePath);
      
      const headers = new Headers({
        'Content-Length': fileSize.toString(),
        'Content-Type': 'video/mp4',
        'Cache-Control': 'no-cache'
      });

      return new NextResponse(file as any, { headers });
    }
  } catch (error) {
    console.error('Error serving temp video:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 