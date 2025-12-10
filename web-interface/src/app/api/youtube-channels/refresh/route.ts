import { NextResponse } from 'next/server';
import { getYouTubeService } from '@/lib/youtube-auth';
import fs from 'fs';
import path from 'path';

export async function POST() {
  try {
    console.log('🚀 YouTube channels refresh API called');
    const youtubeService = getYouTubeService();
    
    // Ensure we have valid authentication
    const isAuthenticated = await youtubeService.ensureAuthenticated();
    if (!isAuthenticated) {
      console.log('❌ Authentication failed - requiring fresh authentication');
      return NextResponse.json({
        success: false,
        error: "Authentication expired. Please re-authenticate with YouTube.",
        requiresAuth: true
      }, { status: 401 });
    }
    
    console.log('✅ Authentication verified for refresh operation');

    // Clear any existing cache to force fresh data
    const cacheDir = path.join(process.cwd(), '..', 'cache', 'youtube');
    const channelsCacheFile = path.join(cacheDir, 'channels_cache.json');
    
    try {
      if (fs.existsSync(channelsCacheFile)) {
        fs.unlinkSync(channelsCacheFile);
        console.log('🗑️ Cleared channels cache - forcing fresh data fetch');
      }
    } catch (cacheError) {
      console.warn('Could not clear cache:', cacheError);
    }

    // Force fresh fetch from YouTube API
    console.log('🔄 Refreshing YouTube channels - forcing fresh API call...');
    let channels;
    
    try {
      channels = await youtubeService.getChannels();
      console.log(`📺 Retrieved ${channels.length} channels from YouTube API`);
    } catch (error: any) {
      console.error('❌ Error fetching channels:', error);
      // If quota exceeded, check if we have cached data to return
      if (error.message?.includes('quota exceeded')) {
        console.log('🚨 Quota exceeded during refresh - checking for cached data...');
        
        try {
          // Try to return existing cached data if available
          if (fs.existsSync(channelsCacheFile)) {
            const cacheData = JSON.parse(fs.readFileSync(channelsCacheFile, 'utf8'));
            const cacheAge = Date.now() - cacheData.timestamp;
            const cacheAgeHours = Math.round(cacheAge / 1000 / 60 / 60);
            
            console.log(`📥 Returning cached data from ${cacheAgeHours} hours ago due to quota limits`);
            
            return NextResponse.json({
              success: true,
              message: `YouTube quota exceeded. Showing cached data from ${cacheAgeHours} hours ago. Quota resets at midnight Pacific Time.`,
              channels: cacheData.channels,
              account: cacheData.accountInfo,
              cached: true,
              cacheAge: cacheAgeHours,
              quotaExceeded: true,
              timestamp: new Date().toISOString()
            });
          }
        } catch (cacheError) {
          console.error('Failed to read cache during quota exceeded:', cacheError);
        }
      }
      
      // Re-throw the original error if we can't handle it
      throw error;
    }
    
    // Get fresh account information
    console.log('👤 Fetching account information...');
    let accountInfo;
    try {
      accountInfo = await youtubeService.getAccountInfo();
      console.log('✅ Successfully retrieved account info:', {
        id: accountInfo.id,
        email: accountInfo.email,
        name: accountInfo.name,
        hasPicture: !!accountInfo.picture
      });
    } catch (accountError) {
      console.error('❌ Failed to refresh account info:', accountError);
      // Fallback account info
      accountInfo = {
        id: 'fallback_' + Date.now(),
        email: 'user@youtube.com',
        name: 'YouTube User'
      };
      console.log('⚠️ Using fallback account info:', accountInfo);
    }

    if (!channels || channels.length === 0) {
      console.log('❌ No YouTube channels found for this account');
      return NextResponse.json({
        success: false,
        error: "No YouTube channels found for this account.",
      }, { status: 404 });
    }

    console.log(`📋 Processing ${channels.length} channels for account: ${accountInfo.email}`);

    // Cache the fresh results
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

    console.log('📊 Channels to cache:', cacheData.channels.map(c => ({ id: c.id, title: c.title })));

    try {
      if (!fs.existsSync(cacheDir)) {
        fs.mkdirSync(cacheDir, { recursive: true });
      }
      fs.writeFileSync(channelsCacheFile, JSON.stringify(cacheData, null, 2));
      console.log(`💾 Cached ${channels.length} refreshed channels`);
    } catch (cacheError) {
      console.warn('Could not cache refreshed data:', cacheError);
    }

    const responseData = {
      success: true,
      message: 'Channels refreshed successfully',
      channels: cacheData.channels,
      account: {
        id: accountInfo.id || accountInfo.email || 'unknown',
        email: accountInfo.email || 'user@youtube.com',
        name: accountInfo.name || accountInfo.email || 'YouTube User',
        picture: accountInfo.picture
      },
      refreshed: true,
      timestamp: new Date().toISOString()
    };

    console.log('🎉 Refresh successful, returning:', {
      channelsCount: responseData.channels.length,
      accountEmail: responseData.account.email,
      channelTitles: responseData.channels.map(c => c.title)
    });

    return NextResponse.json(responseData);

  } catch (error) {
    console.error('❌ Error refreshing YouTube channels:', error);
    
    // If it's an authentication error, return specific response
    if (error instanceof Error && error.message.includes('Not authenticated')) {
      return NextResponse.json({
        success: false,
        error: 'YouTube authentication required',
        requiresAuth: true
      }, { status: 401 });
    }
    
    // Handle quota exceeded errors specifically
    if (error instanceof Error && error.message.includes('quota exceeded')) {
      return NextResponse.json({
        success: false,
        error: 'YouTube quota exceeded. Subscriber counts cannot be updated until quota resets at midnight Pacific Time. Refresh functionality will work normally once quota resets.',
        quotaExceeded: true,
        quotaResetInfo: {
          resetTime: 'Midnight Pacific Time (daily)',
          currentStatus: 'Quota Exhausted',
          suggestion: 'Try again after midnight PT or use cached data for now'
        }
      }, { status: 429 });
    }
    
    return NextResponse.json({
      success: false,
      error: 'Failed to refresh YouTube channels',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}

export async function OPTIONS() {
  return new Response(null, {
      status: 200,
      headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
  });
} 