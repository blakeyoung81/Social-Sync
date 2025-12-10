import { NextResponse } from 'next/server';
import { getYouTubeService } from '@/lib/youtube-auth';

export async function GET() {
  try {
    const youtubeService = getYouTubeService();
    
    // Check if we have valid authentication
    const isAuthenticated = await youtubeService.ensureAuthenticated();
    if (!isAuthenticated) {
      return NextResponse.json({
        authenticated: false,
        error: 'YouTube authentication required'
      });
    }

    // Test quota with a minimal API call
    try {
      await youtubeService.getChannels();
      
      return NextResponse.json({
        authenticated: true,
        quotaExceeded: false,
        message: 'YouTube quota is available'
      });
    } catch (error: any) {
      if (error.message?.includes('quota exceeded')) {
        return NextResponse.json({
          authenticated: true,
          quotaExceeded: true,
          message: 'YouTube quota exceeded. Quota resets at midnight Pacific Time.',
          nextReset: 'midnight Pacific Time'
        });
      }
      
      throw error; // Re-throw other errors
    }
    
  } catch (error) {
    console.error('YouTube quota check error:', error);
    return NextResponse.json({
      authenticated: false,
      error: 'Failed to check YouTube quota status'
    }, { status: 500 });
  }
} 