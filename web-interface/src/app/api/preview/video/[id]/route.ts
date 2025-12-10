import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs/promises';
import { createReadStream } from 'fs';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const processingId = params.id;
    const previewPath = path.join(
      process.cwd(),
      'temp',
      'previews',
      processingId,
      'preview.mp4'
    );

    // Check if file exists
    try {
      await fs.access(previewPath);
    } catch {
      return NextResponse.json(
        { error: 'Preview not found' },
        { status: 404 }
      );
    }

    // Get file stats for proper headers
    const stats = await fs.stat(previewPath);
    const range = req.headers.get('range');

    if (range) {
      // Handle range requests for video seeking
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : stats.size - 1;
      const chunksize = end - start + 1;

      const stream = createReadStream(previewPath, { start, end });
      
      return new NextResponse(stream as any, {
        status: 206,
        headers: {
          'Content-Range': `bytes ${start}-${end}/${stats.size}`,
          'Accept-Ranges': 'bytes',
          'Content-Length': chunksize.toString(),
          'Content-Type': 'video/mp4',
        },
      });
    } else {
      // Full file request
      const stream = createReadStream(previewPath);
      
      return new NextResponse(stream as any, {
        headers: {
          'Content-Length': stats.size.toString(),
          'Content-Type': 'video/mp4',
        },
      });
    }
  } catch (error: any) {
    console.error('Error serving preview video:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
