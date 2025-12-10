import { NextResponse } from 'next/server';
import { getYouTubeService } from '@/lib/youtube-auth';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const forceNew = searchParams.get('force_new');
    
    const youtubeService = getYouTubeService();
    
    // If force_new is true, skip authentication check and force new account selection
    if (!forceNew && youtubeService.isAuthenticated()) {
      return NextResponse.redirect(new URL('/?youtube_connected=true', process.env.NEXTAUTH_URL || 'http://localhost:3000'));
    }
    
    // Generate auth URL with appropriate prompt
    const authUrl = youtubeService.getAuthUrl(forceNew === 'true');
    return NextResponse.redirect(authUrl);
    
  } catch (error) {
    console.error('YouTube auth error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to initiate YouTube authentication',
      details: error instanceof Error ? error.message : String(error)
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