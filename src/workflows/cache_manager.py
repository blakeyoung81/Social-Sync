"""
YouTube Cache Manager - Advanced caching system for YouTube API data.

This module provides efficient caching and retrieval of YouTube channel data,
scheduled videos, playlists, and analytics information to minimize API quota usage.
"""

import json
import os
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, List, Optional, Any, Tuple
import logging
from dataclasses import dataclass
import hashlib

logger = logging.getLogger(__name__)

@dataclass
class CacheEntry:
    """Represents a cached data entry with metadata."""
    data: Any
    created_at: datetime
    last_accessed: datetime
    access_count: int
    size_bytes: int
    
    def is_expired(self, max_age_hours: int = 24) -> bool:
        """Check if cache entry is expired."""
        return datetime.now() - self.created_at > timedelta(hours=max_age_hours)
    
    def is_stale(self, stale_hours: int = 6) -> bool:
        """Check if cache entry is stale but not expired."""
        return datetime.now() - self.created_at > timedelta(hours=stale_hours)

class YouTubeCacheManager:
    """
    Advanced cache manager for YouTube API data with intelligent quota optimization.
    
    Features:
    - Multi-channel data caching and organization
    - Platform-specific data caching (YouTube, Instagram, TikTok ready)
    - Channel-specific analytics and performance tracking
    - Intelligent cache invalidation
    - Quota usage tracking and optimization
    - Analytics data aggregation per channel
    - Automatic cache cleanup
    """
    
    def __init__(self, base_path: Path, selected_channel_id: str = None):
        self.base_path = Path(base_path)
        self.cache_dir = self.base_path / "cache"
        self.cache_dir.mkdir(exist_ok=True)
        self.selected_channel_id = selected_channel_id
        
        # Platform-specific cache paths
        self.youtube_cache = self.cache_dir / "youtube"
        self.instagram_cache = self.cache_dir / "instagram" 
        self.tiktok_cache = self.cache_dir / "tiktok"
        self.analytics_cache = self.cache_dir / "analytics"
        
        # Create platform directories
        for cache_path in [self.youtube_cache, self.instagram_cache, self.tiktok_cache, self.analytics_cache]:
            cache_path.mkdir(exist_ok=True)
        
        # Channel-specific cache organization
        if self.selected_channel_id:
            self.channel_cache = self.youtube_cache / f"channel_{self.selected_channel_id}"
            self.channel_cache.mkdir(exist_ok=True)
        
        # Cache files - channel-aware paths
        if self.selected_channel_id:
            self.youtube_files = {
                'scheduled_videos': self.channel_cache / "scheduled_videos.json",
                'playlists': self.channel_cache / "playlists_cache.json",
                'channels': self.youtube_cache / "channels.json",  # Global channels list
                'videos_metadata': self.channel_cache / "videos_metadata.json",
                'analytics': self.channel_cache / "analytics.json",
                'quota_usage': self.channel_cache / "quota_usage.json"
            }
        else:
            # Fallback to global cache files if no channel specified
            self.youtube_files = {
                'scheduled_videos': self.cache_dir / "scheduled_videos.json",
                'playlists': self.cache_dir / "playlists_cache.json",
                'channels': self.youtube_cache / "channels.json",
                'videos_metadata': self.youtube_cache / "videos_metadata.json",
                'analytics': self.youtube_cache / "analytics.json",
                'quota_usage': self.youtube_cache / "quota_usage.json"
            }
        
        self.instagram_files = {
            'posts': self.instagram_cache / "posts.json",
            'analytics': self.instagram_cache / "analytics.json",
            'stories': self.instagram_cache / "stories.json"
        }
        
        self.tiktok_files = {
            'videos': self.tiktok_cache / "videos.json",
            'analytics': self.tiktok_cache / "analytics.json"
        }
        
        # Global analytics
        self.analytics_files = {
            'platform_stats': self.analytics_cache / "platform_stats.json",
            'usage_history': self.analytics_cache / "usage_history.json",
            'quota_savings': self.analytics_cache / "quota_savings.json"
        }
        
        # Load or initialize quota tracking
        self._quota_stats = self._load_quota_stats()
    
    def _load_quota_stats(self) -> Dict[str, Any]:
        """Load quota usage statistics."""
        quota_file = self.youtube_files['quota_usage']
        if quota_file.exists():
            try:
                with open(quota_file, 'r') as f:
                    return json.load(f)
            except (json.JSONDecodeError, IOError):
                logger.warning(f"Failed to load quota stats from {quota_file}")
        
        return {
            'total_saved': 0,
            'total_used': 0,
            'cache_hits': {
                'scheduled_videos': 0,
                'playlists': 0,
                'channels': 0,
                'videos': 0
            },
            'last_reset': datetime.now().isoformat()
        }
    
    def _save_quota_stats(self):
        """Save quota usage statistics."""
        try:
            with open(self.youtube_files['quota_usage'], 'w') as f:
                json.dump(self._quota_stats, f, indent=2)
        except IOError as e:
            logger.error(f"Failed to save quota stats: {e}")
    
    def _get_file_info(self, file_path: Path) -> Dict[str, Any]:
        """Get detailed information about a cache file."""
        if not file_path.exists():
            return {
                'exists': False,
                'age_hours': None,
                'status': 'missing',
                'last_updated': None,
                'data_count': 0,
                'size_mb': 0
            }
        
        try:
            stat = file_path.stat()
            age_hours = (datetime.now().timestamp() - stat.st_mtime) / 3600
            size_mb = stat.st_size / (1024 * 1024)
            
            # Try to load and count data
            data_count = 0
            status = 'corrupted'
            
            try:
                with open(file_path, 'r') as f:
                    data = json.load(f)
                    if isinstance(data, list):
                        data_count = len(data)
                    elif isinstance(data, dict):
                        data_count = len(data) if data else 0
                    else:
                        data_count = 1 if data else 0
                
                # Determine status based on age
                if age_hours <= 2:
                    status = 'fresh'
                elif age_hours <= 12:
                    status = 'good'
                elif age_hours <= 48:
                    status = 'stale'
                else:
                    status = 'old'
                    
            except json.JSONDecodeError:
                status = 'corrupted'
                data_count = 0
            
            return {
                'exists': True,
                'age_hours': round(age_hours, 2),
                'status': status,
                'last_updated': datetime.fromtimestamp(stat.st_mtime).isoformat(),
                'data_count': data_count,
                'size_mb': round(size_mb, 2)
            }
            
        except Exception as e:
            logger.error(f"Error getting file info for {file_path}: {e}")
            return {
                'exists': True,
                'age_hours': None,
                'status': 'error',
                'last_updated': None,
                'data_count': 0,
                'size_mb': 0
            }
    
    def get_cache_status(self) -> Dict[str, Any]:
        """Get comprehensive cache status for all platforms."""
        return {
            'youtube': {
                'scheduled_videos': self._get_file_info(self.youtube_files['scheduled_videos']),
                'playlists': self._get_file_info(self.youtube_files['playlists']),
                'channels': self._get_file_info(self.youtube_files['channels']),
                'videos_metadata': self._get_file_info(self.youtube_files['videos_metadata']),
                'analytics': self._get_file_info(self.youtube_files['analytics'])
            },
            'instagram': {
                'posts': self._get_file_info(self.instagram_files['posts']),
                'analytics': self._get_file_info(self.instagram_files['analytics']),
                'stories': self._get_file_info(self.instagram_files['stories'])
            },
            'tiktok': {
                'videos': self._get_file_info(self.tiktok_files['videos']),
                'analytics': self._get_file_info(self.tiktok_files['analytics'])
            },
            'total_quota_saved': self._quota_stats['total_saved'],
            'last_updated': datetime.now().isoformat(),
            'recommendations': self._generate_cache_recommendations()
        }
    
    def _generate_cache_recommendations(self) -> List[str]:
        """Generate intelligent cache optimization recommendations."""
        recommendations = []
        
        # Check individual file status directly to avoid recursion
        scheduled_status = self._get_file_info(self.youtube_files['scheduled_videos'])['status']
        playlists_status = self._get_file_info(self.youtube_files['playlists'])['status']
        channels_status = self._get_file_info(self.youtube_files['channels'])['status']
        
        if scheduled_status in ['missing', 'old']:
            recommendations.append("Refresh scheduled videos cache - data is outdated")
        
        if playlists_status in ['missing', 'old']:
            recommendations.append("Update playlist cache for better organization")
            
        if channels_status == 'missing':
            recommendations.append("Initialize channel data cache")
        
        # Quota efficiency recommendations
        if self._quota_stats['total_saved'] < 1000:
            recommendations.append("Process more videos to build efficient cache")
        
        if len(recommendations) == 0:
            recommendations.append("Cache is operating efficiently! 🚀")
        
        return recommendations
    
    def get_quota_savings_report(self) -> Dict[str, Any]:
        """Generate detailed quota savings analysis."""
        stats = self._quota_stats
        
        # Calculate efficiency metrics
        total_saved = stats['total_saved']
        total_used = stats['total_used']
        efficiency_ratio = (total_saved + total_used) / max(total_used, 1) if total_used > 0 else 1
        
        return {
            'total_quota_saved': total_saved,
            'total_quota_used': total_used,
            'efficiency_ratio': round(efficiency_ratio, 2),
            'scheduled_videos': {
                'cache_hits': stats['cache_hits']['scheduled_videos'],
                'quota_per_hit_saved': 500,  # Estimated quota cost per API call
                'total_saved': stats['cache_hits']['scheduled_videos'] * 500
            },
            'playlists': {
                'cache_hits': stats['cache_hits']['playlists'],
                'quota_per_hit_saved': 50,
                'total_saved': stats['cache_hits']['playlists'] * 50
            },
            'channels': {
                'cache_hits': stats['cache_hits']['channels'],
                'quota_per_hit_saved': 100,
                'total_saved': stats['cache_hits']['channels'] * 100
            },
            'videos': {
                'cache_hits': stats['cache_hits']['videos'],
                'quota_per_hit_saved': 200,
                'total_saved': stats['cache_hits']['videos'] * 200
            }
        }
    
    def cache_youtube_data(self, data_type: str, data: Any, platform: str = 'youtube') -> bool:
        """Cache YouTube data with platform organization."""
        try:
            if platform == 'youtube' and data_type in self.youtube_files:
                cache_file = self.youtube_files[data_type]
            else:
                # Generic cache file
                cache_file = self.cache_dir / f"{platform}_{data_type}.json"
            
            # Ensure directory exists
            cache_file.parent.mkdir(exist_ok=True)
            
            # Add metadata
            cache_data = {
                'cached_at': datetime.now().isoformat(),
                'platform': platform,
                'data_type': data_type,
                'data': data
            }
            
            with open(cache_file, 'w') as f:
                json.dump(cache_data, f, indent=2)
            
            logger.info(f"Cached {data_type} data for {platform}: {len(data) if isinstance(data, (list, dict)) else 1} items")
            return True
            
        except Exception as e:
            logger.error(f"Failed to cache {data_type} for {platform}: {e}")
            return False
    
    def get_cached_data(self, data_type: str, platform: str = 'youtube', max_age_hours: int = 24) -> Optional[Any]:
        """Retrieve cached data with age validation."""
        try:
            if platform == 'youtube' and data_type in self.youtube_files:
                cache_file = self.youtube_files[data_type]
            else:
                cache_file = self.cache_dir / f"{platform}_{data_type}.json"
            
            if not cache_file.exists():
                return None
            
            file_info = self._get_file_info(cache_file)
            
            # Check if data is too old
            if file_info['age_hours'] and file_info['age_hours'] > max_age_hours:
                logger.info(f"Cache for {data_type} is {file_info['age_hours']:.1f}h old, exceeds {max_age_hours}h limit")
                return None
            
            with open(cache_file, 'r') as f:
                cached_data = json.load(f)
            
            # Track cache hit
            if platform == 'youtube' and data_type in self._quota_stats['cache_hits']:
                self._quota_stats['cache_hits'][data_type] += 1
                self._save_quota_stats()
            
            # Return just the data if it has our metadata structure
            if isinstance(cached_data, dict) and 'data' in cached_data:
                return cached_data['data']
            else:
                return cached_data
                
        except Exception as e:
            logger.error(f"Failed to retrieve cached {data_type} for {platform}: {e}")
            return None
    
    def record_api_usage(self, quota_cost: int, operation: str, platform: str = 'youtube'):
        """Record API quota usage for analytics."""
        self._quota_stats['total_used'] += quota_cost
        
        # Log the operation
        logger.info(f"API Usage: {operation} cost {quota_cost} quota units for {platform}")
        self._save_quota_stats()
    
    def record_quota_saved(self, quota_saved: int, operation: str, platform: str = 'youtube'):
        """Record quota savings from cache hits."""
        self._quota_stats['total_saved'] += quota_saved
        
        logger.info(f"Quota Saved: {operation} saved {quota_saved} quota units for {platform}")
        self._save_quota_stats()
    
    def cleanup_old_cache(self, max_age_days: int = 30):
        """Clean up old cache files to save disk space."""
        cutoff_date = datetime.now() - timedelta(days=max_age_days)
        cleaned_files = 0
        
        for cache_dir in [self.youtube_cache, self.instagram_cache, self.tiktok_cache, self.analytics_cache]:
            if cache_dir.exists():
                for file_path in cache_dir.glob("*.json"):
                    try:
                        if datetime.fromtimestamp(file_path.stat().st_mtime) < cutoff_date:
                            file_path.unlink()
                            cleaned_files += 1
                            logger.info(f"Cleaned old cache file: {file_path.name}")
                    except Exception as e:
                        logger.error(f"Error cleaning {file_path}: {e}")
        
        logger.info(f"Cache cleanup complete: removed {cleaned_files} old files")
        return cleaned_files
    
    def get_platform_analytics(self, platform: str = 'all', channel_id: str = None) -> Dict[str, Any]:
        """Get analytics data filtered by platform and channel."""
        analytics_data = {}
        
        if platform == 'all' or platform == 'youtube':
            if channel_id:
                # Get channel-specific analytics
                channel_cache_manager = YouTubeCacheManager(self.base_path, channel_id)
                youtube_analytics = channel_cache_manager.get_cached_data('analytics', 'youtube', max_age_hours=1)
                if youtube_analytics:
                    analytics_data['youtube'] = {
                        **youtube_analytics,
                        'channel_id': channel_id
                    }
            else:
                # Get analytics for current channel or global
                youtube_analytics = self.get_cached_data('analytics', 'youtube', max_age_hours=1)
                if youtube_analytics:
                    analytics_data['youtube'] = youtube_analytics
        
        if platform == 'all' or platform == 'instagram':
            instagram_analytics = self.get_cached_data('analytics', 'instagram', max_age_hours=1)
            if instagram_analytics:
                analytics_data['instagram'] = instagram_analytics
        
        if platform == 'all' or platform == 'tiktok':
            tiktok_analytics = self.get_cached_data('analytics', 'tiktok', max_age_hours=1)
            if tiktok_analytics:
                analytics_data['tiktok'] = tiktok_analytics
        
        return analytics_data
    
    def get_all_channels_analytics(self) -> Dict[str, Dict[str, Any]]:
        """Get analytics for all available YouTube channels."""
        all_channels_data = {}
        
        # Look for all channel directories
        if self.youtube_cache.exists():
            for channel_dir in self.youtube_cache.glob("channel_*"):
                if channel_dir.is_dir():
                    channel_id = channel_dir.name.replace("channel_", "")
                    
                    # Get analytics for this channel
                    channel_manager = YouTubeCacheManager(self.base_path, channel_id)
                    analytics = channel_manager.get_cached_data('analytics', 'youtube', max_age_hours=1)
                    quota_report = channel_manager.get_quota_savings_report()
                    
                    if analytics or quota_report:
                        all_channels_data[channel_id] = {
                            'analytics': analytics or {},
                            'quota_report': quota_report,
                            'channel_id': channel_id
                        }
        
        return all_channels_data
    
    def get_channel_performance_summary(self, channel_id: str = None) -> Dict[str, Any]:
        """Get a performance summary for a specific channel."""
        target_channel = channel_id or self.selected_channel_id
        
        if not target_channel:
            logger.warning("No channel ID specified for performance summary")
            return {}
        
        channel_manager = YouTubeCacheManager(self.base_path, target_channel)
        
        # Get cached data
        scheduled_videos = channel_manager.get_cached_data('scheduled_videos', 'youtube', max_age_hours=168)
        playlists = channel_manager.get_cached_data('playlists', 'youtube', max_age_hours=168)
        analytics = channel_manager.get_cached_data('analytics', 'youtube', max_age_hours=1)
        quota_report = channel_manager.get_quota_savings_report()
        
        # Calculate metrics
        videos_count = len(scheduled_videos) if scheduled_videos else 0
        playlists_count = len(playlists) if playlists else 0
        quota_saved = quota_report.get('total_quota_saved', 0)
        
        # Calculate cache efficiency
        total_saved = quota_report.get('total_quota_saved', 0)
        total_used = quota_report.get('total_quota_used', 1)
        cache_efficiency = (total_saved / (total_saved + total_used)) * 100 if (total_saved + total_used) > 0 else 0
        
        return {
            'channel_id': target_channel,
            'videos_scheduled': videos_count,
            'playlists_count': playlists_count,
            'quota_saved': quota_saved,
            'cache_efficiency': round(cache_efficiency, 1),
            'analytics': analytics or {},
            'last_updated': datetime.now().isoformat()
        }
    
    def export_cache_summary(self) -> Dict[str, Any]:
        """Export a comprehensive cache summary for debugging."""
        return {
            'cache_status': self.get_cache_status(),
            'quota_report': self.get_quota_savings_report(),
            'system_info': {
                'cache_directory': str(self.cache_dir),
                'total_files': len(list(self.cache_dir.rglob("*.json"))),
                'disk_usage_mb': sum(f.stat().st_size for f in self.cache_dir.rglob("*.json")) / (1024 * 1024)
            }
        } 