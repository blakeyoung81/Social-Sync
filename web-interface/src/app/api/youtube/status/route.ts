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
        error: 'YouTube authentication required',
        requiresAuth: true
      });
    }

    // Get basic account information to verify connection
    try {
      const accountInfo = await youtubeService.getAccountInfo();
      const channels = await youtubeService.getChannels();
      
      return NextResponse.json({
        authenticated: true,
        account: accountInfo,
        channelCount: channels.length,
        message: 'YouTube authentication is valid'
      });
    } catch (error) {
      console.error('Error fetching account details:', error);
    return NextResponse.json({
        authenticated: false,
        error: 'Failed to verify YouTube account details',
        requiresAuth: true
      });
    }
    
  } catch (error) {
    console.error('YouTube status check error:', error);
    return NextResponse.json({
      authenticated: false,
      error: 'Failed to check YouTube authentication status',
      requiresAuth: true
    }, { status: 500 });
  }
}

export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
} 