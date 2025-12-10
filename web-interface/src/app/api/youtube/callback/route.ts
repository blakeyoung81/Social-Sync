import { NextRequest, NextResponse } from 'next/server';
import { getYouTubeService } from '@/lib/youtube-auth';

export async function GET(request: NextRequest) {
  try {
    console.log('🚀 [AUTH CALLBACK] Starting YouTube auth callback...');
    
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const error = searchParams.get('error');
    const scope = searchParams.get('scope');
    const authuser = searchParams.get('authuser');

    console.log('📋 [AUTH CALLBACK] URL parameters:', {
      hasCode: !!code,
      error: error,
      scope: scope,
      authuser: authuser,
      allParams: Object.fromEntries(searchParams.entries())
    });

    if (error) {
      console.error('❌ [AUTH CALLBACK] YouTube OAuth error:', error);
      return NextResponse.redirect(new URL('/?youtube_error=' + encodeURIComponent(error), request.url));
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

    // Immediately fetch and cache channel data after successful authentication
    try {
      console.log('📺 [AUTH CALLBACK] Fetching channels immediately after auth...');
      const channels = await youtubeService.getChannels();
      console.log('✅ [AUTH CALLBACK] Retrieved channels:', channels.map(ch => ({ id: ch.id, title: ch.title })));
      
      console.log('👤 [AUTH CALLBACK] Attempting to get account info...');
      const accountInfo = await youtubeService.getAccountInfo();
      console.log('✅ [AUTH CALLBACK] Account info retrieved:', {
        id: accountInfo.id,
        email: accountInfo.email,
        name: accountInfo.name,
        hasPicture: !!accountInfo.picture
      });
      
      // Force a cache update by calling the refresh endpoint internally
      try {
        const refreshResponse = await fetch(new URL('/api/youtube-channels/refresh', request.url).toString(), {
          method: 'POST',
          headers: {
            'Cookie': request.headers.get('Cookie') || ''
          }
        });
        
        if (refreshResponse.ok) {
          console.log('✅ [AUTH CALLBACK] Successfully updated channel cache after auth');
        } else {
          console.warn('⚠️ [AUTH CALLBACK] Failed to update channel cache:', refreshResponse.status);
        }
      } catch (refreshError) {
        console.warn('⚠️ [AUTH CALLBACK] Error updating channel cache:', refreshError);
      }

      // Automatically trigger comprehensive channel scan for persistent data
      try {
        console.log('🔄 [AUTH CALLBACK] Starting automatic channel scan for persistent data...');
        const scanResponse = await fetch(new URL('/api/youtube-channels/scan', request.url).toString(), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Cookie': request.headers.get('Cookie') || ''
          },
          body: JSON.stringify({
            includeVideos: true,
            includePlaylists: true,
            forceRefresh: false, // Use cache if recently scanned
            maxVideos: 1000 // Comprehensive scan
          })
        });
        
        if (scanResponse.ok) {
          const scanData = await scanResponse.json();
          console.log('🎉 [AUTH CALLBACK] Automatic channel scan completed:', {
            videos: scanData.data?.videos?.length || 0,
            playlists: scanData.data?.playlists?.length || 0,
            scheduledDates: scanData.data?.scheduledDates?.length || 0,
            quotaUsed: scanData.data?.quotaUsed || 0
          });
        } else {
          console.warn('⚠️ [AUTH CALLBACK] Automatic scan failed with status:', scanResponse.status);
        }
      } catch (scanError) {
        console.warn('⚠️ [AUTH CALLBACK] Error during automatic channel scan:', scanError);
        // Don't fail the auth process if scan fails
      }
      
    } catch (channelError) {
      console.error('⚠️ [AUTH CALLBACK] Could not fetch channels immediately after auth:', channelError);
    }

    console.log('🔄 [AUTH CALLBACK] Redirecting to home with success flag...');
    return NextResponse.redirect(new URL('/?youtube_connected=true', request.url));
  } catch (error) {
    console.error('❌ [AUTH CALLBACK] Error in YouTube auth callback:', error);
    return NextResponse.redirect(new URL('/?youtube_error=' + encodeURIComponent('Authentication failed'), request.url));
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