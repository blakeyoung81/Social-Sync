import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function POST(request: NextRequest) {
  try {
    const tempDir = path.join(process.cwd(), 'temp');
    
    if (!fs.existsSync(tempDir)) {
      return NextResponse.json({ success: true, message: 'Temp directory does not exist' });
    }

    const files = fs.readdirSync(tempDir);
    let deletedCount = 0;

    for (const file of files) {
      const filePath = path.join(tempDir, file);
      const stat = fs.statSync(filePath);
      
      // Delete files older than 1 hour
      const oneHourAgo = Date.now() - (60 * 60 * 1000);
      if (stat.mtime.getTime() < oneHourAgo) {
        try {
          fs.unlinkSync(filePath);
          deletedCount++;
          console.log(`🗑️ [CLEANUP] Deleted old temp file: ${file}`);
        } catch (error) {
          console.error(`🗑️ [CLEANUP] Failed to delete file ${file}:`, error);
        }
      }
    }

    return NextResponse.json({ 
      success: true, 
      deletedCount,
      message: `Cleaned up ${deletedCount} old temporary files`
    });

  } catch (error) {
    console.error('🗑️ [CLEANUP] Error during cleanup:', error);
    return NextResponse.json({ error: 'Cleanup failed' }, { status: 500 });
  }
} 