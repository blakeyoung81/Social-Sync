import { NextResponse } from 'next/server';
import { getYouTubeService } from '@/lib/youtube-auth';
import fs from 'fs';
import path from 'path';

export async function GET() {
  try {
    const youtubeService = getYouTubeService();
    
    // Check if user is authenticated
    if (!youtubeService.isAuthenticated()) {
      return NextResponse.json({
        success: false,
        error: "Not authenticated with YouTube. Please authenticate first.",
        requiresAuth: true
      }, { status: 401 });
    }

    // Try to load from cache first (24 hour cache for persistent login)
    const cacheDir = path.join(process.cwd(), '..', 'cache', 'youtube');
    const channelsCacheFile = path.join(cacheDir, 'channels_cache.json');
    const cacheMaxAge = 24 * 60 * 60 * 1000; // 24 hours for persistent login

    let cachedData = null;
    try {
      if (fs.existsSync(channelsCacheFile)) {
        const stats = fs.statSync(channelsCacheFile);
        const age = Date.now() - stats.mtime.getTime();
        if (age < cacheMaxAge) {
          cachedData = JSON.parse(fs.readFileSync(channelsCacheFile, 'utf8'));
          console.log(`📥 Using cached channel data (age: ${Math.round(age / 1000 / 60)}min)`);
        } else {
          console.log('🕒 Cache expired, will fetch fresh data');
        }
      }
    } catch (cacheError) {
      console.warn('Cache read error:', cacheError);
    }

    let channels, accountInfo;

    if (cachedData) {
      // Use cached data
      channels = cachedData.channels;
      accountInfo = cachedData.accountInfo;
    } else {
      // Fetch fresh data from YouTube API
      console.log('🔄 Fetching fresh channel data from YouTube API...');
      channels = await youtubeService.getChannels();
    
      // Get account information
      try {
        accountInfo = await youtubeService.getAccountInfo();
        console.log('Account info retrieved:', accountInfo);
      } catch (accountError) {
        console.error('Failed to get account info:', accountError);
        // Fallback account info
        accountInfo = {
          id: 'fallback_' + Date.now(),
          email: 'user@youtube.com',
          name: 'YouTube User'
        };
      }

      // Cache the fresh data
      const cacheData = {
        channels: channels.map(channel => ({
          id: channel.id,
          title: channel.title,
          customUrl: channel.customUrl,
          thumbnailUrl: channel.thumbnailUrl,
          subscriberCount: channel.subscriberCount
        })),
        accountInfo,
        timestamp: Date.now()
      };

      try {
        if (!fs.existsSync(cacheDir)) {
          fs.mkdirSync(cacheDir, { recursive: true });
        }
        fs.writeFileSync(channelsCacheFile, JSON.stringify(cacheData, null, 2));
        console.log(`💾 Cached ${channels.length} channels for future requests`);
      } catch (cacheError) {
        console.warn('Could not cache data:', cacheError);
      }
    }

    if (!channels || channels.length === 0) {
      return NextResponse.json({
        success: false,
        error: "No YouTube channels found for this account.",
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      channels: channels.map(channel => ({
        id: channel.id,
        title: channel.title,
        customUrl: channel.customUrl,
        thumbnailUrl: channel.thumbnailUrl,
        subscriberCount: channel.subscriberCount
      })),
      account: {
        id: accountInfo.id || accountInfo.email || 'unknown',
        email: accountInfo.email || 'user@youtube.com',
        name: accountInfo.name || accountInfo.email || 'YouTube User',
        picture: accountInfo.picture
      },
      authenticated: true
    });

  } catch (error) {
    console.error('Error in /api/youtube-channels route:', error);
    
    // If it's an authentication error, return specific response
    if (error instanceof Error && error.message.includes('Not authenticated')) {
      return NextResponse.json({
        success: false,
        error: 'YouTube authentication required',
        requiresAuth: true
      }, { status: 401 });
    }
    
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch YouTube channels',
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