import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import { writeFile, unlink } from 'fs/promises';
import path, { join } from 'path';
import { tmpdir } from 'os';

const execAsync = promisify(exec);

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const platform = searchParams.get('platform') || 'all';
    const channelId = searchParams.get('channelId') || searchParams.get('channel_id');

    // Create a temporary Python file for analytics gathering
    const tempFile = join(tmpdir(), `platform_analytics_${Date.now()}.py`);
    const pythonScript = `
import sys
import os
sys.path.append("../src")
from workflows.cache_manager import YouTubeCacheManager
from pathlib import Path
import json
import math
from datetime import datetime, timedelta

def clean_data(obj):
    if isinstance(obj, dict):
        return {k: clean_data(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [clean_data(item) for item in obj]
    elif isinstance(obj, float) and (math.isinf(obj) or math.isnan(obj)):
        return None
    else:
        return obj

def get_youtube_analytics(cache_manager, channel_id=None):
    """Get comprehensive YouTube analytics for a specific channel or all channels."""
    try:
        if channel_id:
            # Get channel-specific performance summary
            performance = cache_manager.get_channel_performance_summary(channel_id)
            if performance:
                return {
                    'videos_uploaded': performance.get('videos_scheduled', 0),
                    'videos_processed': performance.get('videos_scheduled', 0),
                    'quota_saved': performance.get('quota_saved', 0),
                    'cache_efficiency': performance.get('cache_efficiency', 0),
                    'last_updated': performance.get('last_updated', datetime.now().isoformat()),
                    'playlist_count': performance.get('playlists_count', 0),
                    'scheduled_videos_count': performance.get('videos_scheduled', 0),
                    'channel_id': channel_id
                }
        
        # Get all channels analytics if no specific channel or fallback
        all_channels = cache_manager.get_all_channels_analytics()
        
        if all_channels:
            # Aggregate metrics across all channels
            total_videos = sum(ch.get('analytics', {}).get('videos_scheduled', 0) for ch in all_channels.values())
            total_quota_saved = sum(ch.get('quota_report', {}).get('total_quota_saved', 0) for ch in all_channels.values())
            total_quota_used = sum(ch.get('quota_report', {}).get('total_quota_used', 1) for ch in all_channels.values())
            
            # Calculate aggregate cache efficiency
            cache_efficiency = (total_quota_saved / (total_quota_saved + total_quota_used)) * 100 if (total_quota_saved + total_quota_used) > 0 else 0
            
            return {
                'videos_uploaded': total_videos,
                'videos_processed': total_videos,
                'quota_saved': total_quota_saved,
                'cache_efficiency': round(cache_efficiency, 1),
                'last_updated': datetime.now().isoformat(),
                'playlist_count': 0,  # Would need to aggregate from all channels
                'scheduled_videos_count': total_videos,
                'channels_count': len(all_channels),
                'channel_breakdown': {ch_id: {
                    'videos': ch.get('analytics', {}).get('videos_scheduled', 0),
                    'quota_saved': ch.get('quota_report', {}).get('total_quota_saved', 0)
                } for ch_id, ch in all_channels.items()}
            }
        
        # Fallback to global cache if no channel data
        scheduled_videos = cache_manager.get_cached_data('scheduled_videos', 'youtube', max_age_hours=168)
        playlists = cache_manager.get_cached_data('playlists', 'youtube', max_age_hours=168)
        quota_report = cache_manager.get_quota_savings_report()
        
        videos_uploaded = len(scheduled_videos) if scheduled_videos else 0
        quota_saved = quota_report.get('total_quota_saved', 0)
        total_saved = quota_report.get('total_quota_saved', 0)
        total_used = quota_report.get('total_quota_used', 1)
        cache_efficiency = (total_saved / (total_saved + total_used)) * 100 if (total_saved + total_used) > 0 else 0
        
        return {
            'videos_uploaded': videos_uploaded,
            'videos_processed': videos_uploaded,
            'quota_saved': quota_saved,
            'cache_efficiency': round(cache_efficiency, 1),
            'last_updated': datetime.now().isoformat(),
            'playlist_count': len(playlists) if playlists else 0,
            'scheduled_videos_count': videos_uploaded
        }
        
    except Exception as e:
        print(f"Error getting YouTube analytics: {e}", file=sys.stderr)
        return {
            'videos_uploaded': 0,
            'videos_processed': 0,
            'quota_saved': 0,
            'cache_efficiency': 0,
            'last_updated': datetime.now().isoformat(),
            'playlist_count': 0,
            'scheduled_videos_count': 0
        }

def get_instagram_analytics():
    """Get Instagram analytics (placeholder for future implementation)."""
    return {
        'posts_created': 0,
        'stories_posted': 0,
        'engagement_rate': 0,
        'last_updated': datetime.now().isoformat(),
        'followers_gained': 0,
        'reach': 0
    }

def get_tiktok_analytics():
    """Get TikTok analytics (placeholder for future implementation)."""
    return {
        'videos_posted': 0,
        'views_total': 0,
        'engagement_rate': 0,
        'last_updated': datetime.now().isoformat(),
        'likes_total': 0,
        'shares_total': 0
    }

try:
    cache_manager = YouTubeCacheManager(Path("..").resolve())
    platform = "${platform}"
    channel_id = "${channelId || ''}"
    
    analytics_data = {}
    
    if platform == "all" or platform == "youtube":
        analytics_data['youtube'] = get_youtube_analytics(cache_manager, channel_id if channel_id else None)
    
    if platform == "all" or platform == "instagram":
        analytics_data['instagram'] = get_instagram_analytics()
    
    if platform == "all" or platform == "tiktok":
        analytics_data['tiktok'] = get_tiktok_analytics()
    
    # If specific platform requested, return just that platform's data
    if platform != "all" and platform in analytics_data:
        result = {platform: analytics_data[platform]}
    else:
        result = analytics_data
    
    cleaned_result = clean_data(result)
    print(json.dumps(cleaned_result))
    
except Exception as e:
    print(json.dumps({"error": str(e)}), file=sys.stderr)
`;

    await writeFile(tempFile, pythonScript);
    
    try {
              // Use the virtual environment Python
        const pythonPath = path.resolve(process.cwd(), '..', '.venv', 'bin', 'python');
        const { stdout, stderr } = await execAsync(`"${pythonPath}" "${tempFile}"`, { cwd: process.cwd() });
      await unlink(tempFile); // Clean up temp file

      if (stderr) {
        console.error('Platform analytics stderr:', stderr);
      }

      const data = JSON.parse(stdout);
      
      if (data.error) {
        throw new Error(data.error);
      }
      
      return NextResponse.json(data);
    } catch (execError) {
      await unlink(tempFile).catch(() => {}); // Clean up on error
      throw execError;
    }
  } catch (error) {
    console.error('Error getting platform analytics:', error);
    
    // Return mock data if Python fails
    const mockData = {
      youtube: {
        videos_uploaded: 0,
        videos_processed: 0,
        quota_saved: 0,
        cache_efficiency: 0,
        last_updated: new Date().toISOString(),
        playlist_count: 0,
        scheduled_videos_count: 0
      },
      instagram: {
        posts_created: 0,
        stories_posted: 0,
        engagement_rate: 0,
        last_updated: new Date().toISOString(),
        followers_gained: 0,
        reach: 0
      },
      tiktok: {
        videos_posted: 0,
        views_total: 0,
        engagement_rate: 0,
        last_updated: new Date().toISOString(),
        likes_total: 0,
        shares_total: 0
      }
    };
    
    const platform = new URL(request.url).searchParams.get('platform') || 'all';
    
    if (platform !== 'all' && platform in mockData) {
      return NextResponse.json({ [platform]: mockData[platform as keyof typeof mockData] });
    }
    
    return NextResponse.json(mockData);
  }
} 