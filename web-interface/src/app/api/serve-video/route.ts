import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const videoPath = url.searchParams.get('path');
  
  if (!videoPath) {
    return new Response('Missing video path', { status: 400 });
  }

  try {
    const stat = await fs.stat(videoPath);
    const range = request.headers.get('range');
    
    if (range) {
      // Handle range requests for smooth playback
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : stat.size - 1;
      
      // Ensure we don't create tiny chunks for better performance
      const chunkSize = Math.max(end - start + 1, 262144); // Minimum 256KB chunks
      const actualEnd = Math.min(start + chunkSize - 1, stat.size - 1);
      
      const stream = (await import('fs')).createReadStream(videoPath, { start, end: actualEnd });
      
      return new Response(stream as any, {
        status: 206,
        headers: {
          'Content-Range': `bytes ${start}-${actualEnd}/${stat.size}`,
          'Accept-Ranges': 'bytes',
          'Content-Length': (actualEnd - start + 1).toString(),
          'Content-Type': 'video/mp4',
          'Cache-Control': 'public, max-age=3600, immutable', // Better caching
        },
      });
    }
    
    // Serve full file if no range requested
    const stream = (await import('fs')).createReadStream(videoPath);
    return new Response(stream as any, {
      headers: {
        'Content-Type': 'video/mp4',
        'Content-Length': stat.size.toString(),
        'Accept-Ranges': 'bytes',
        'Cache-Control': 'public, max-age=3600, immutable',
      },
    });
    
  } catch (error) {
    console.error('Error serving video:', error);
    return new Response('Video not found', { status: 404 });
  }
} 