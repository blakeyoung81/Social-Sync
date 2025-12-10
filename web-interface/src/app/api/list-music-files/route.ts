import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

export async function GET(request: NextRequest) {
  try {
    const musicDir = path.resolve(process.cwd(), '..', 'data', 'assets', 'music');
    
    try {
      await fs.access(musicDir);
    } catch {
      return NextResponse.json({ files: [], error: 'Music directory not found' });
    }

    const files = await fs.readdir(musicDir);
    const musicFiles = files
      .filter(file => {
        const ext = path.extname(file).toLowerCase();
        return ['.mp3', '.wav', '.m4a', '.aac', '.flac'].includes(ext);
      })
      .map(file => ({
        name: file,
        displayName: path.basename(file, path.extname(file))
          .replace(/[-_]/g, ' ')
          .replace(/\b\w/g, c => c.toUpperCase()),
        path: file
      }));

    return NextResponse.json({ files: musicFiles });
  } catch (error) {
    console.error('Error listing music files:', error);
    return NextResponse.json({ files: [], error: 'Failed to list music files' });
  }
} 