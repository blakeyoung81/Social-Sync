import { NextResponse } from 'next/server';
import { spawn } from 'child_process';
import path from 'path';

const MUSIC_DIR = path.resolve(process.cwd(), '..', 'data', 'assets', 'music');

export async function POST() {
  try {
    // Open the music folder in the system file explorer
    const platform = process.platform;
    
    let command: string;
    let args: string[];
    
    switch (platform) {
      case 'darwin': // macOS
        command = 'open';
        args = [MUSIC_DIR];
        break;
      case 'win32': // Windows
        command = 'explorer';
        args = [MUSIC_DIR];
        break;
      case 'linux': // Linux
        command = 'xdg-open';
        args = [MUSIC_DIR];
        break;
      default:
        return NextResponse.json({ 
          success: false, 
          error: 'Unsupported platform' 
        }, { status: 400 });
    }
    
    spawn(command, args, { detached: true });
    
    return NextResponse.json({ 
      success: true, 
      message: 'Music folder opened' 
    });
    
  } catch (error) {
    console.error('Error opening music folder:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to open music folder' 
    }, { status: 500 });
  }
}