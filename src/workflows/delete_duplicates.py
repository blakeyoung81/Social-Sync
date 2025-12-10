#!/usr/bin/env python3
"""
Delete Duplicate Videos from YouTube Channel
Finds videos with exact same titles and deletes the least successful ones.
For unpublished videos, deletes the oldest ones.
"""

import sys
import logging
import argparse
from pathlib import Path
from datetime import datetime
from collections import defaultdict
from typing import List, Dict, Any, Optional

# Add the project root to Python path
project_root = Path(__file__).parent.parent.parent
sys.path.insert(0, str(project_root))

from src.workflows.youtube_uploader import YouTubeUploader

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout)
    ]
)

class DuplicateVideoManager:
    def __init__(self):
        self.youtube_uploader = YouTubeUploader()
        self.youtube_service = self.youtube_uploader.get_youtube_service()
        if not self.youtube_service:
            print("⚠️ WARNING: No active YouTube account selected. Dry run and cache analysis will work, but REAL DELETION is disabled.")
        
    def get_all_channel_videos(self) -> List[Dict[str, Any]]:
        """Get all videos from the YouTube channel using cached data when possible"""
        try:
            logging.info("🔍 Getting all videos from YouTube channel...")
            
            # Try to use cached data first
            cached_data = self.youtube_uploader._load_cached_channel_data()
            if cached_data and 'videos' in cached_data:
                logging.info(f"📊 Using cached data with {len(cached_data['videos'])} videos")
                all_videos = []
                
                for video in cached_data['videos']:
                    # Convert cached video format to expected format
                    video_data = {
                        'id': video.get('id', ''),
                        'title': video.get('title', ''),
                        'published_at': video.get('publishedAt', ''),
                        'privacy_status': video.get('privacyStatus', 'unknown'),
                        'view_count': int(video.get('statistics', {}).get('viewCount', 0)),
                        'like_count': int(video.get('statistics', {}).get('likeCount', 0)),
                        'comment_count': int(video.get('statistics', {}).get('commentCount', 0)),
                        'upload_status': video.get('status', {}).get('uploadStatus', 'processed')
                    }
                    all_videos.append(video_data)
                
                logging.info(f"📊 Found {len(all_videos)} total videos from cache")
                return all_videos
            
            # Fallback to API if no cache available
            logging.info("📡 No cached data available - fetching from YouTube API...")
            
            youtube = self.youtube_service
            if not youtube:
                logging.error("❌ Cannot fetch from API: YouTube service not available. Please select a channel in the UI.")
                print("❌ Cannot fetch from API: YouTube service not available. Please select a channel in the UI.")
                raise Exception("Failed to authenticate with YouTube")
            
            # Get uploads playlist ID
            channels_response = youtube.channels().list(
                part='contentDetails',
                mine=True
            ).execute()
            
            if not channels_response['items']:
                raise Exception("No channel found")
            
            uploads_playlist_id = channels_response['items'][0]['contentDetails']['relatedPlaylists']['uploads']
            
            all_videos = []
            next_page_token = None
            
            while True:
                # Get videos from uploads playlist
                playlist_items = youtube.playlistItems().list(
                    part='snippet',
                    playlistId=uploads_playlist_id,
                    maxResults=50,
                    pageToken=next_page_token
                ).execute()
                
                video_ids = [item['snippet']['resourceId']['videoId'] for item in playlist_items['items']]
                
                if video_ids:
                    # Get detailed video information including statistics
                    videos_response = youtube.videos().list(
                        part='snippet,statistics,status',
                        id=','.join(video_ids)
                    ).execute()
                    
                    for video in videos_response['items']:
                        all_videos.append({
                            'id': video['id'],
                            'title': video['snippet']['title'],
                            'published_at': video['snippet']['publishedAt'],
                            'privacy_status': video['status']['privacyStatus'],
                            'view_count': int(video['statistics'].get('viewCount', 0)),
                            'like_count': int(video['statistics'].get('likeCount', 0)),
                            'comment_count': int(video['statistics'].get('commentCount', 0)),
                            'upload_status': video['status'].get('uploadStatus', 'processed')
                        })
                
                next_page_token = playlist_items.get('nextPageToken')
                if not next_page_token:
                    break
            
            logging.info(f"📊 Found {len(all_videos)} total videos via API")
            return all_videos
            
        except Exception as e:
            logging.error(f"❌ Error fetching channel videos: {e}")
            return []
    
    def find_duplicate_groups(self, videos: List[Dict[str, Any]], cleanup_cache: bool = False) -> Dict[str, List[Dict[str, Any]]]:
        """Group videos by EXACT title matches (case-sensitive, exact string match)"""
        print(f"🔍 DEBUG: Processing {len(videos)} total videos for duplicates...")
        
        # FIRST: Handle duplicate video IDs from the cache (corrupted cache issue)
        seen_video_ids = set()
        deduplicated_videos = []
        removed_count = 0
        
        for video in videos:
            video_id = video.get('id', '')
            if video_id and video_id not in seen_video_ids:
                seen_video_ids.add(video_id)
                deduplicated_videos.append(video)
            else:
                removed_count += 1
                if cleanup_cache:
                    print(f"🗑️  REMOVED CACHE DUPLICATE: ID {video_id} - '{video.get('title', 'No title')}'")
                else:
                    print(f"⚠️  FOUND CACHE DUPLICATE: ID {video_id} - '{video.get('title', 'No title')}' (will be cleaned up if you proceed)")
        
        if cleanup_cache:
            print(f"📊 CACHE CLEANUP: Removed {removed_count} duplicate video IDs from cache")
        else:
            print(f"📊 CACHE DUPLICATES: Found {removed_count} duplicate video IDs in cache")
        print(f"📊 PROCESSING: {len(deduplicated_videos)} unique videos for title duplicates")
        
        # SECOND: Now find actual title duplicates among unique videos
        title_groups = defaultdict(list)
        
        for video in deduplicated_videos:
            # Use EXACT FULL title as key (case-sensitive, byte-for-byte match)
            title = video.get('title', '')
            
            # Only process videos with non-empty titles AND ensure FULL EXACT match
            if title and isinstance(title, str) and len(title.strip()) > 0:
                # Use the raw title as-is for exact matching (no modifications whatsoever)
                exact_title = title
                title_groups[exact_title].append(video)
                
                if len(title_groups[exact_title]) == 2:  # First time we see a duplicate
                    print(f"🚨 EXACT DUPLICATE DETECTED: '{exact_title}'")
                    print(f"   Video 1: {title_groups[exact_title][0]['id']} - {title_groups[exact_title][0]['privacy_status']}")
                    print(f"   Video 2: {title_groups[exact_title][1]['id']} - {title_groups[exact_title][1]['privacy_status']}")
                elif len(title_groups[exact_title]) > 2:  # Additional duplicates
                    print(f"   Video {len(title_groups[exact_title])}: {video['id']} - {video['privacy_status']}")
        
        # Only return groups with more than one video (duplicates)
        duplicates = {title: videos for title, videos in title_groups.items() if len(videos) > 1}
        
        print(f"🔍 FOUND {len(duplicates)} sets of REAL duplicate titles:")
        for title, duplicate_videos in duplicates.items():
            print(f"  📋 '{title}' - {len(duplicate_videos)} copies")
        
        logging.info(f"🔍 Found {len(duplicates)} sets of EXACT duplicate titles")
        
        for title, duplicate_videos in duplicates.items():
            logging.info(f"\n📋 DUPLICATE GROUP: '{title}' ({len(duplicate_videos)} copies)")
            for i, video in enumerate(duplicate_videos, 1):
                status = video['privacy_status']
                views = video['view_count']
                published = video['published_at'][:10] if video['published_at'] else 'Unknown'
                logging.info(f"    {i}. 📹 {video['id']} - Status: {status} - Views: {views:,} - Date: {published}")
        
        return duplicates
    
    def select_videos_to_delete(self, duplicate_group: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Select which videos to delete from a duplicate group - CONSERVATIVE approach"""
        if len(duplicate_group) <= 1:
            return []
        
        # Log the duplicate group being analyzed
        title = duplicate_group[0]['title']
        logging.info(f"\n🔍 ANALYZING DUPLICATES for: '{title}'")
        
        # Separate videos by status
        published_videos = [v for v in duplicate_group if v['privacy_status'] == 'public']
        scheduled_videos = [v for v in duplicate_group if v['privacy_status'] == 'private']
        other_unpublished = [v for v in duplicate_group if v['privacy_status'] not in ['public', 'private']]
        
        logging.info(f"    📊 Found: {len(published_videos)} published, {len(scheduled_videos)} scheduled, {len(other_unpublished)} other")
        
        videos_to_delete = []
        
        # CONSERVATIVE RULE 1: If multiple published videos, only keep the best performing one
        if len(published_videos) > 1:
            def performance_score(video):
                return video['view_count'] + video['like_count'] * 10 + video['comment_count'] * 5
            
            published_videos.sort(key=performance_score, reverse=True)
            best_video = published_videos[0]
            
            print(f"🎯 PUBLISHED VIDEOS ANALYSIS for '{title}':")
            for i, video in enumerate(published_videos):
                score = performance_score(video)
                print(f"   {i+1}. {video['id']} - Score: {score} (Views: {video['view_count']}, Likes: {video['like_count']})")
            
            # Only delete if there's a significant performance difference or zero views
            for video in published_videos[1:]:
                best_score = performance_score(best_video)
                video_score = performance_score(video)
                
                # Only delete if it has 0 views or significantly worse performance (10x less)
                if video_score == 0 or (best_score > 0 and video_score < best_score / 10):
                    videos_to_delete.append(video)
                    print(f"❌ MARKING FOR DELETION: {video['id']} (score: {video_score:,} vs best: {best_score:,})")
                    logging.info(f"❌ Will delete poor performing published: {video['id']} (score: {video_score:,} vs best: {best_score:,})")
                else:
                    print(f"✅ KEEPING: {video['id']} (decent performance: {video_score:,})")
                    logging.info(f"⚠️  KEEPING published duplicate with decent performance: {video['id']} (score: {video_score:,})")
        
        # CONSERVATIVE RULE 2: If published version exists, only delete scheduled duplicates
        if published_videos and scheduled_videos:
            # Only delete scheduled videos if there's already a published version
            videos_to_delete.extend(scheduled_videos)
            logging.info(f"❌ Will delete {len(scheduled_videos)} scheduled duplicates (published version exists)")
        
        # CONSERVATIVE RULE 3: For scheduled videos only, keep the most recent
        elif len(scheduled_videos) > 1 and not published_videos:
            scheduled_videos.sort(key=lambda x: x['published_at'], reverse=True)
            newest_scheduled = scheduled_videos[0]
            older_scheduled = scheduled_videos[1:]
            
            videos_to_delete.extend(older_scheduled)
            logging.info(f"✅ Keeping newest scheduled: {newest_scheduled['id']} ({newest_scheduled['published_at']})")
            logging.info(f"❌ Will delete {len(older_scheduled)} older scheduled duplicates")
        
        # CONSERVATIVE RULE 4: For other unpublished, be very conservative
        if other_unpublished:
            if published_videos:
                # Only delete if there's a clear published alternative
                videos_to_delete.extend(other_unpublished)
                logging.info(f"❌ Will delete {len(other_unpublished)} unpublished duplicates (published version exists)")
            else:
                logging.info(f"⚠️  KEEPING {len(other_unpublished)} unpublished videos (no clear published alternative)")
        
        logging.info(f"📝 DECISION: Will delete {len(videos_to_delete)} out of {len(duplicate_group)} duplicates")
        
        return videos_to_delete
    
    def delete_video(self, video_id: str, dry_run: bool = False) -> bool:
        """Delete a video from YouTube"""
        try:
            if dry_run:
                print(f"✅ [DRY RUN] Would delete video: {video_id}")
                return True
            
            print(f"🔥 DELETING video: {video_id}...")
            if not self.youtube_service:
                logging.error(f"❌ Cannot delete {video_id}: YouTube service not available.")
                print(f"❌ Cannot delete {video_id}: YouTube service not available. Select a channel and try again.")
                return False
            
            self.youtube_service.videos().delete(id=video_id).execute()
            print(f"🗑️ SUCCESS: Permanently deleted video {video_id}")
            logging.info(f"🗑️ Successfully deleted video: {video_id}")
            return True
            
        except Exception as e:
            logging.error(f"❌ Error deleting video {video_id}: {e}")
            print(f"❌ FAILED to delete video {video_id}: {e}")
            return False
    
    def process_duplicates(self, dry_run: bool = False) -> Dict[str, Any]:
        """Main function to find and delete duplicate videos"""
        logging.info("🚀 Starting duplicate video detection and cleanup...")
        
        if not self.youtube_service and not dry_run:
            print("❌ ERROR: Cannot perform live deletion without a selected YouTube channel.")
            logging.error("Aborting deletion process: YouTube service is not initialized.")
            return {"success": False, "error": "Cannot perform live deletion without a selected YouTube channel."}
        
        # Force fresh scan to get latest cache before duplicate detection
        logging.info("🔄 Forcing fresh channel scan to get latest data...")
        self.youtube_uploader.clear_cache()  # Clear any existing cache
        
        # Get all videos with fresh data
        all_videos = self.get_all_channel_videos()
        if not all_videos:
            return {"success": False, "error": "Failed to fetch channel videos"}
        
        # Find duplicates (only cleanup cache if NOT in dry run mode)
        duplicate_groups = self.find_duplicate_groups(all_videos, cleanup_cache=not dry_run)
        if not duplicate_groups:
            logging.info("✅ No duplicate videos found!")
            return {"success": True, "duplicates_found": 0, "videos_deleted": 0, "dry_run": dry_run}
        
        # Process each duplicate group
        total_deleted = 0
        total_duplicates = len(duplicate_groups)
        deletion_summary = []
        duplicate_details = []
        
        for title, duplicate_videos in duplicate_groups.items():
            logging.info(f"\n🔄 Processing duplicates for: '{title}'")
            
            # Store details about this duplicate group
            group_info = {
                'title': title,
                'total_videos': len(duplicate_videos),
                'videos': []
            }
            
            for video in duplicate_videos:
                group_info['videos'].append({
                    'video_id': video['id'],
                    'privacy_status': video['privacy_status'],
                    'view_count': video['view_count'],
                    'published_at': video['published_at']
                })
            
            videos_to_delete = self.select_videos_to_delete(duplicate_videos)
            group_info['videos_to_delete'] = len(videos_to_delete)
            group_info['videos_to_keep'] = len(duplicate_videos) - len(videos_to_delete)
            duplicate_details.append(group_info)
            
            for video in videos_to_delete:
                deletion_info = {
                    'video_id': video['id'],
                    'title': video['title'],
                    'privacy_status': video['privacy_status'],
                    'view_count': video['view_count'],
                    'published_at': video['published_at']
                }
                deletion_summary.append(deletion_info)
                
                if self.delete_video(video['id'], dry_run):
                    total_deleted += 1
        
        # Log summary
        logging.info(f"\n✅ Duplicate cleanup {'preview' if dry_run else 'complete'}!")
        logging.info(f"📊 Found {total_duplicates} sets of duplicates")
        logging.info(f"🗑️ {'Would delete' if dry_run else 'Deleted'} {total_deleted} videos")
        
        if dry_run:
            print(f"\n📋 DETAILED BREAKDOWN:")
            total_videos_in_duplicates = 0
            for detail in duplicate_details:
                total_videos_in_duplicates += detail['total_videos']
                print(f"  📹 '{detail['title']}': {detail['total_videos']} copies → delete {detail['videos_to_delete']}, keep {detail['videos_to_keep']}")
            print(f"\n📊 SUMMARY: {total_videos_in_duplicates} total videos in {total_duplicates} duplicate groups")
            print(f"🗑️  PLAN: Delete {total_deleted} duplicates, keep {total_videos_in_duplicates - total_deleted} best ones")
        
        if dry_run and deletion_summary:
            logging.info("\n📋 PREVIEW - Videos that would be deleted:")
            for info in deletion_summary:
                logging.info(f"  • {info['video_id']} - '{info['title']}' - {info['privacy_status']} - {info['view_count']:,} views")
        
        return {
            "success": True,
            "duplicates_found": total_duplicates,
            "videos_deleted": total_deleted,
            "dry_run": dry_run,
            "deletion_summary": deletion_summary,
            "duplicate_details": duplicate_details
        }

def main():
    parser = argparse.ArgumentParser(description='Delete duplicate videos from YouTube channel')
    parser.add_argument('--dry-run', action='store_true', help='Show what would be deleted without actually deleting')
    
    args = parser.parse_args()
    
    manager = DuplicateVideoManager()
    result = manager.process_duplicates(dry_run=args.dry_run)
    
    if result["success"]:
        print(f"SUCCESS: Found {result['duplicates_found']} duplicate sets, {'would delete' if result.get('dry_run') else 'deleted'} {result['videos_deleted']} videos")
    else:
        print(f"ERROR: {result.get('error', 'Unknown error')}")
        sys.exit(1)

if __name__ == "__main__":
    main() 