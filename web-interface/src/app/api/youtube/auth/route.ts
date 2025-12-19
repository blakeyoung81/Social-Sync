import { NextResponse } from 'next/server';
import { auth } from '@/app/api/auth/[...nextauth]/route';

import { getYouTubeService } from '@/lib/youtube-auth';

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.redirect(new URL('/login?error=not_authenticated', request.url));
    }

    const { searchParams } = new URL(request.url);
    const forceNew = searchParams.get('force_new');
    
    const youtubeService = getYouTubeService();
    
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