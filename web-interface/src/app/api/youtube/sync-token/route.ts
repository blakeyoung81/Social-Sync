import { NextResponse } from 'next/server';
import { getYouTubeService } from '@/lib/youtube-auth';
import fs from 'fs';
import path from 'path';

export async function POST() {
  try {
    console.log('🔄 [TOKEN SYNC] Checking token synchronization...');
    
    // Both web and Python should use the same token file
    const tokenPath = path.join(process.cwd(), '..', 'config', 'token.json');
    
    if (!fs.existsSync(tokenPath)) {
      console.log('❌ [TOKEN SYNC] Token file not found');
      return NextResponse.json({
        success: false,
        error: "Token file not found"
      }, { status: 404 });
    }

    console.log('✅ [TOKEN SYNC] Token file exists at:', tokenPath);

    // Get account info for response
    const youtubeService = getYouTubeService();
    let accountInfo;
    try {
      accountInfo = await youtubeService.getAccountInfo();
      console.log('👤 [TOKEN SYNC] Account info:', {
        id: accountInfo.id,
        email: accountInfo.email,
        name: accountInfo.name
      });
    } catch (error) {
      console.error('⚠️ [TOKEN SYNC] Could not get account info:', error);
      accountInfo = {
        id: 'unknown',
        email: 'user@youtube.com',
        name: 'YouTube User'
      };
    }

    return NextResponse.json({
      success: true,
      message: "Web and Python script share the same token file - already synchronized",
      accountInfo: {
        id: accountInfo.id,
        email: accountInfo.email,
        name: accountInfo.name
      },
      tokenPath: tokenPath
    });

  } catch (error) {
    console.error('❌ [TOKEN SYNC] Error checking token:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to check authentication token',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}

export async function GET() {
  try {
    // Check token status
    const tokenPath = path.join(process.cwd(), '..', 'config', 'token.json');
    const tokenExists = fs.existsSync(tokenPath);
    
    let tokenInfo = {
      tokenExists,
      tokenPath: tokenPath,
      accountInfo: null as any,
      lastModified: null as string | null
    };

    if (tokenExists) {
      try {
        const stats = fs.statSync(tokenPath);
        tokenInfo.lastModified = stats.mtime.toISOString();
        
        const tokenData = JSON.parse(fs.readFileSync(tokenPath, 'utf8'));
        tokenInfo.accountInfo = tokenData.accountInfo;
      } catch (error) {
        console.error('Error reading token:', error);
      }
    }

    return NextResponse.json({
      success: true,
      tokenInfo
    });
    
  } catch (error) {
    console.error('Error checking token status:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to check token status'
    }, { status: 500 });
  }
} 