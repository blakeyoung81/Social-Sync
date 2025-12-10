import { NextResponse } from 'next/server';
import { getYouTubeService } from '@/lib/youtube-auth';
import fs from 'fs';
import path from 'path';

interface ScanOptions {
  includeVideos?: boolean;
  includePlaylists?: boolean;
  forceRefresh?: boolean;
  maxVideos?: number;
}

interface VideoData {
  id: string;
  title: string;
  publishedAt: string;
  privacyStatus: string;
  publishAt?: string; // For scheduled videos
  duration?: string;
  description?: string;
  tags?: string[];
}

interface PlaylistData {
  id: string;
  title: string;
  description?: string;
  itemCount: number;
  privacyStatus: string;
}

interface ChannelScanData {
  channelId: string;
  channelTitle: string;
  videos: VideoData[];
  playlists: PlaylistData[];
  scheduledDates: string[]; // Array of YYYY-MM-DD strings
  totalVideos: number;
  scanTimestamp: number;
  scanDuration: number; // in seconds
  quotaUsed: number;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const options: ScanOptions = {
      includeVideos: body.includeVideos !== false, // Default true
      includePlaylists: body.includePlaylists !== false, // Default true  
      forceRefresh: body.forceRefresh || false,
      maxVideos: body.maxVideos || 500 // Conservative default
    };

    const youtubeService = getYouTubeService();
    
    // Verify authentication
    if (!youtubeService.isAuthenticated()) {
      return NextResponse.json({
        success: false,
        error: "YouTube authentication required",
        requiresAuth: true
      }, { status: 401 });
    }

    const scanStartTime = Date.now();
    let quotaUsed = 0;

    // Get channel info first
    const channels = await youtubeService.getChannels();
    quotaUsed += 1; // channels.list call
    
    if (!channels || channels.length === 0) {
      return NextResponse.json({
        success: false,
        error: "No YouTube channels found"
      }, { status: 404 });
    }

    const channel = channels[0]; // Use first channel
    const cacheDir = path.join(process.cwd(), '..', 'cache', 'youtube');
    const channelCacheFile = path.join(cacheDir, `${channel.id}_channel_data.json`);

    // Check if we should use existing cache
    if (!options.forceRefresh && fs.existsSync(channelCacheFile)) {
      try {
        const cachedData = JSON.parse(fs.readFileSync(channelCacheFile, 'utf8'));
        const cacheAge = Date.now() - cachedData.scanTimestamp;
        const cacheAgeHours = Math.round(cacheAge / 1000 / 60 / 60);
        
        // Use cache if less than 24 hours old
        if (cacheAge < 24 * 60 * 60 * 1000) {
          console.log(`📥 Returning cached channel data (${cacheAgeHours} hours old)`);
          return NextResponse.json({
            success: true,
            data: cachedData,
            cached: true,
            cacheAge: cacheAgeHours,
            message: `Using cached data from ${cacheAgeHours} hours ago. Use 'Force Refresh' to get fresh data.`
          });
        }
      } catch (error) {
        console.warn('Failed to read cache, proceeding with fresh scan:', error);
      }
    }

    console.log(`🔄 Starting comprehensive channel scan for: ${channel.title}`);
    
    const scanData: ChannelScanData = {
      channelId: channel.id,
      channelTitle: channel.title,
      videos: [],
      playlists: [],
      scheduledDates: [],
      totalVideos: 0,
      scanTimestamp: scanStartTime,
      scanDuration: 0,
      quotaUsed: 0
    };

    // Scan Videos
    if (options.includeVideos) {
      console.log('📹 Scanning channel videos...');
      try {
        const videoResults = await scanChannelVideos(youtubeService, options.maxVideos || 500);
        scanData.videos = videoResults.videos;
        scanData.totalVideos = videoResults.totalCount;
        scanData.scheduledDates = videoResults.scheduledDates;
        quotaUsed += videoResults.quotaUsed;
        console.log(`✅ Found ${scanData.videos.length} videos, ${scanData.scheduledDates.length} scheduled dates`);
      } catch (error: any) {
        console.error('Error scanning videos:', error);
        if (error.message?.includes('quota exceeded')) {
          return NextResponse.json({
            success: false,
            error: 'YouTube quota exceeded during video scan. Please try again when quota resets.',
            quotaExceeded: true
          }, { status: 429 });
        }
        throw error;
      }
    }

    // Scan Playlists  
    if (options.includePlaylists) {
      console.log('📝 Scanning channel playlists...');
      try {
        const playlistResults = await scanChannelPlaylists(youtubeService);
        scanData.playlists = playlistResults.playlists;
        quotaUsed += playlistResults.quotaUsed;
        console.log(`✅ Found ${scanData.playlists.length} playlists`);
      } catch (error: any) {
        console.error('Error scanning playlists:', error);
        if (error.message?.includes('quota exceeded')) {
          return NextResponse.json({
            success: false,
            error: 'YouTube quota exceeded during playlist scan. Please try again when quota resets.',
            quotaExceeded: true
          }, { status: 429 });
        }
        // Continue without playlists if they fail
        console.warn('Continuing without playlist data due to error');
      }
    }

    // Calculate scan duration
    scanData.scanDuration = Math.round((Date.now() - scanStartTime) / 1000);
    scanData.quotaUsed = quotaUsed;

    // Cache the results
    try {
      if (!fs.existsSync(cacheDir)) {
        fs.mkdirSync(cacheDir, { recursive: true });
      }
      fs.writeFileSync(channelCacheFile, JSON.stringify(scanData, null, 2));
      console.log(`💾 Cached channel data to: ${channelCacheFile}`);
    } catch (cacheError) {
      console.warn('Failed to cache scan results:', cacheError);
    }

    return NextResponse.json({
      success: true,
      data: scanData,
      cached: false,
      message: `Channel scan completed in ${scanData.scanDuration}s using ${quotaUsed} quota units`,
      summary: {
        videos: scanData.videos.length,
        scheduledVideos: scanData.scheduledDates.length,
        playlists: scanData.playlists.length,
        totalVideos: scanData.totalVideos,
        quotaUsed,
        duration: scanData.scanDuration
      }
    });

  } catch (error) {
    console.error('Channel scan error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to scan channel data',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}

async function scanChannelVideos(youtubeService: any, maxVideos: number) {
  const videos: VideoData[] = [];
  const scheduledDates: string[] = [];
  let quotaUsed = 0;
  let totalCount = 0;
  
  console.log(`📊 Fetching up to ${maxVideos} videos...`);
  
  // Get all video IDs using the uploads playlist (more quota efficient)
  const allVideoIds: string[] = [];
  let pageToken: string | undefined;
  
  // First get the channel info to find the uploads playlist
    try {
      const youtube = youtubeService.youtube;
    const channelsResponse = await youtube.channels.list({
      part: ['contentDetails'],
      mine: true
    });
    
    quotaUsed += 1; // channels.list costs 1 unit
    
    const uploadsPlaylistId = channelsResponse.data.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;
    if (!uploadsPlaylistId) {
      throw new Error('Could not find uploads playlist for channel');
    }
    
    console.log(`📂 Found uploads playlist: ${uploadsPlaylistId}`);
    
    // Now get videos from the uploads playlist
    const isCompleteChannelScan = maxVideos >= 10000;
    const quotaLimit = isCompleteChannelScan ? 2000 : 300; // Higher limit for complete scans
    
    while (allVideoIds.length < maxVideos && quotaUsed < quotaLimit) {
      const playlistItemsResponse = await youtube.playlistItems.list({
        part: ['snippet'],
        playlistId: uploadsPlaylistId,
        maxResults: 50,
        pageToken
      });
      
      quotaUsed += 1; // playlistItems.list costs 1 unit
      
      const videoIds = playlistItemsResponse.data.items?.map((item: any) => item.snippet.resourceId.videoId) || [];
      allVideoIds.push(...videoIds);
      
      pageToken = playlistItemsResponse.data.nextPageToken;
      if (!pageToken) break;
      
      if (isCompleteChannelScan) {
        console.log(`📊 Complete Channel Scan: ${allVideoIds.length} video IDs (${quotaUsed} quota used)`);
      } else {
      console.log(`📊 Fetched ${allVideoIds.length} video IDs (${quotaUsed} quota used)`);
      }
    }
    } catch (error: any) {
      if (error.code === 403 && error.message?.includes('quota')) {
        throw new Error('YouTube quota exceeded while fetching video IDs');
      }
      throw error;
  }

  totalCount = allVideoIds.length;
  const videosToCheck = allVideoIds.slice(0, maxVideos);
  
  console.log(`🔍 Getting detailed info for ${videosToCheck.length} videos...`);
  
  // Get video details in batches
  for (let i = 0; i < videosToCheck.length; i += 50) {
    const batchIds = videosToCheck.slice(i, i + 50);
    
    try {
      const youtube = youtubeService.youtube;
      const videoRequest = await youtube.videos.list({
        part: ['snippet', 'status', 'contentDetails', 'fileDetails'],
        id: batchIds.join(',')
      });
      
      quotaUsed += batchIds.length; // 1 unit per video
      
      const items = videoRequest.data.items || [];
      
      for (const item of items) {
        const snippet = item.snippet || {};
        const status = item.status || {};
        const contentDetails = item.contentDetails || {};
        
        const videoData: VideoData = {
          id: item.id,
          title: snippet.title || 'Untitled',
          publishedAt: snippet.publishedAt || '',
          privacyStatus: status.privacyStatus || 'unknown',
          duration: contentDetails.duration,
          description: snippet.description,
          tags: snippet.tags,
          publishAt: status.publishAt
        };
        
        // Extract dimensions if available
        if (item.fileDetails && item.fileDetails.videoStreams && item.fileDetails.videoStreams.length > 0) {
          const stream = item.fileDetails.videoStreams[0];
          if (typeof stream.widthPixels === 'number' && typeof stream.heightPixels === 'number') {
            (videoData as any).width = stream.widthPixels;
            (videoData as any).height = stream.heightPixels;
          }
        }
        
        // Check for scheduled publish time
        if (status.publishAt) {
          videoData.publishAt = status.publishAt;
          // Extract date for scheduled dates array
          const publishDate = new Date(status.publishAt).toISOString().split('T')[0];
          if (!scheduledDates.includes(publishDate)) {
            scheduledDates.push(publishDate);
          }
        }
        
        videos.push(videoData);
      }
      
      console.log(`📊 Processed ${videos.length}/${videosToCheck.length} videos...`);
    } catch (error: any) {
      if (error.code === 403 && error.message?.includes('quota')) {
        console.warn('Quota exceeded during video details fetch');
        break;
      }
      throw error;
    }
  }
  
  // Sort scheduled dates
  scheduledDates.sort();
  
  return {
    videos,
    scheduledDates,
    totalCount,
    quotaUsed
  };
}

async function scanChannelPlaylists(youtubeService: any) {
  const playlists: PlaylistData[] = [];
  let quotaUsed = 0;
  
  try {
    let pageToken: string | undefined;
    
    while (quotaUsed < 100) { // Conservative limit for playlists
      const youtube = youtubeService.youtube;
      const playlistRequest = await youtube.playlists.list({
        part: ['snippet', 'status', 'contentDetails'],
        mine: true,
        maxResults: 50,
        pageToken
      });
      
      quotaUsed += 1; // playlists.list costs 1 unit
      
      const items = playlistRequest.data.items || [];
      
      for (const item of items) {
        const snippet = item.snippet || {};
        const status = item.status || {};
        const contentDetails = item.contentDetails || {};
        
        playlists.push({
          id: item.id,
          title: snippet.title || 'Untitled Playlist',
          description: snippet.description,
          itemCount: contentDetails.itemCount || 0,
          privacyStatus: status.privacyStatus || 'unknown'
        });
      }
      
      pageToken = playlistRequest.data.nextPageToken;
      if (!pageToken) break;
    }
    
    console.log(`✅ Found ${playlists.length} playlists using ${quotaUsed} quota`);
    
    return {
      playlists,
      quotaUsed
    };
  } catch (error) {
    console.error('Error fetching playlists:', error);
    return {
      playlists: [],
      quotaUsed
    };
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