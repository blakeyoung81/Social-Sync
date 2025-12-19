import { NextRequest, NextResponse } from 'next/server';
import { getYouTubeService } from '@/lib/youtube-auth';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    console.log('🚀 [AUTH CALLBACK] Starting YouTube auth callback...');
    
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.redirect(new URL('/login?error=not_authenticated', request.url));
    }

    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const error = searchParams.get('error');

    if (error) {
      console.error('❌ [AUTH CALLBACK] YouTube OAuth error:', error);
      return NextResponse.redirect(new URL('/dashboard?youtube_error=' + encodeURIComponent(error), request.url));
    }

    if (!code) {
      console.error('❌ [AUTH CALLBACK] No authorization code provided');
      return NextResponse.json({
        success: false,
        error: 'No authorization code provided'
      }, { status: 400 });
    }

    console.log('🔄 [AUTH CALLBACK] Processing authorization code...');
    const youtubeService = getYouTubeService();
    await youtubeService.handleAuthCallback(code);

    // Get account info and channels
    const accountInfo = await youtubeService.getAccountInfo();
    const channels = await youtubeService.getChannels();
    const activeChannel = channels[0];

    // Save connection to database
    await prisma.socialConnection.upsert({
      where: {
        userId_platform: {
          userId: session.user.id,
          platform: 'youtube',
        },
      },
      update: {
        platformUserId: accountInfo.id,
        platformUsername: accountInfo.email,
        accessToken: 'stored_in_config', // Token is stored in config/token.json
        metadata: JSON.stringify({
          email: accountInfo.email,
          name: accountInfo.name,
          channels: channels.map(ch => ({ id: ch.id, title: ch.title })),
          activeChannelId: activeChannel?.id,
        }),
        updatedAt: new Date(),
      },
      create: {
        userId: session.user.id,
        platform: 'youtube',
        platformUserId: accountInfo.id,
        platformUsername: accountInfo.email,
        accessToken: 'stored_in_config',
        metadata: JSON.stringify({
          email: accountInfo.email,
          name: accountInfo.name,
          channels: channels.map(ch => ({ id: ch.id, title: ch.title })),
          activeChannelId: activeChannel?.id,
        }),
      },
    });

    console.log('✅ [AUTH CALLBACK] YouTube connection saved to database');

    return NextResponse.redirect(new URL('/dashboard?youtube_connected=true', request.url));
    
  } catch (error) {
    console.error('❌ [AUTH CALLBACK] Error:', error);
    return NextResponse.redirect(new URL('/dashboard?youtube_error=callback_failed', request.url));
  }
}
