#!/usr/bin/env python3
"""
Delete and Restore Recent Videos
Deletes all videos uploaded to YouTube in the last X hours and restores the original files
for reprocessing in case there was a problem with the batch.
"""

import os
import sys
import json
import shutil
import logging
import argparse
from datetime import datetime, timedelta, timezone
from pathlib import Path
import google_auth_oauthlib.flow
import googleapiclient.discovery
import googleapiclient.errors
from google.oauth2.credentials import Credentials
from google.auth.transport.requests import Request

# Optional fuzzy matching (fallback to simple matching if not available)
try:
    from fuzzywuzzy import fuzz
    HAS_FUZZYWUZZY = True
except ImportError:
    HAS_FUZZYWUZZY = False

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Constants
BASE_DIR = Path(__file__).resolve().parent.parent.parent  # Go back to project root
CREDENTIALS_FILE = BASE_DIR / "config" / "client_secrets.json"
TOKEN_FILE = BASE_DIR / "config" / "token.json"
UPLOADS_DIR = BASE_DIR / "data" / "uploads"

SCOPES = [
    "https://www.googleapis.com/auth/youtube",
    "https://www.googleapis.com/auth/youtube.force-ssl"
]

class YouTubeVideoDeleter:
    """Class to handle YouTube video deletion and original file restoration."""
    
    def __init__(self):
        self.youtube = None
        self._authenticate()
    
    def _authenticate(self) -> None:
        """Authenticate with YouTube API."""
        creds = None
        if TOKEN_FILE.exists():
            try:
                creds = Credentials.from_authorized_user_file(str(TOKEN_FILE), SCOPES)
            except Exception as e:
                logger.error(f"Error loading credentials: {e}")
        
        if not creds or not creds.valid:
            if creds and creds.expired and creds.refresh_token:
                try:
                    creds.refresh(Request())
                except Exception as e:
                    logger.error(f"Error refreshing credentials: {e}")
                    return
            else:
                logger.error("No valid credentials found. Please run the main uploader first to authenticate.")
                return
        
        try:
            self.youtube = googleapiclient.discovery.build('youtube', 'v3', credentials=creds)
            logger.info("Successfully authenticated with YouTube API")
        except Exception as e:
            logger.error(f"Error building YouTube service: {e}")
    
    def get_recent_videos(self, hours: int) -> list:
        """Get all videos uploaded in the last X hours."""
        if not self.youtube:
            logger.error("YouTube service not initialized")
            return []
        
        # Calculate cutoff time
        cutoff_time = datetime.now(timezone.utc) - timedelta(hours=hours)
        logger.info(f"🔍 Searching for videos uploaded after: {cutoff_time.strftime('%Y-%m-%d %H:%M:%S UTC')}")
        
        recent_videos = []
        page_token = None
        
        try:
            while True:
                # Search for videos uploaded by the authenticated user
                search_request = self.youtube.search().list(
                    part="id,snippet",
                    forMine=True,
                    type="video",
                    order="date",
                    maxResults=50,
                    pageToken=page_token
                )
                search_response = search_request.execute()
                
                for item in search_response.get("items", []):
                    video_id = item["id"]["videoId"]
                    published_at = item["snippet"]["publishedAt"]
                    title = item["snippet"]["title"]
                    
                    # Parse publish time
                    publish_time = datetime.fromisoformat(published_at.replace('Z', '+00:00'))
                    
                    if publish_time >= cutoff_time:
                        recent_videos.append({
                            'id': video_id,
                            'title': title,
                            'published_at': published_at,
                            'publish_time': publish_time
                        })
                        logger.info(f"  📹 Found: {title} (ID: {video_id}) - {publish_time.strftime('%Y-%m-%d %H:%M:%S')}")
                    else:
                        # Videos are ordered by date, so we can break here
                        logger.info(f"  ⏰ Reached videos older than {hours} hours, stopping search")
                        return recent_videos
                
                page_token = search_response.get("nextPageToken")
                if not page_token:
                    break
        
        except Exception as e:
            logger.error(f"Error searching for recent videos: {e}")
            return []
        
        logger.info(f"📊 Found {len(recent_videos)} videos uploaded in the last {hours} hours")
        return recent_videos
    
    def delete_videos(self, video_ids: list) -> dict:
        """Delete multiple videos from YouTube."""
        if not self.youtube:
            logger.error("YouTube service not initialized")
            return {'success': [], 'failed': []}
        
        results = {'success': [], 'failed': []}
        
        for video_id in video_ids:
            try:
                logger.info(f"🗑️ Deleting video: {video_id}")
                delete_request = self.youtube.videos().delete(id=video_id)
                delete_request.execute()
                results['success'].append(video_id)
                logger.info(f"  ✅ Successfully deleted: {video_id}")
            except Exception as e:
                logger.error(f"  ❌ Failed to delete {video_id}: {e}")
                results['failed'].append({'id': video_id, 'error': str(e)})
        
        return results
    
    def find_original_files(self, video_titles: list, input_folder: str) -> dict:
        """Find original video files based on video titles."""
        input_path = Path(input_folder)
        if not input_path.exists():
            logger.error(f"Input folder does not exist: {input_folder}")
            return {}
        
        logger.info(f"🔍 Searching for original files in: {input_folder}")
        
        # Find all video files in input folder
        video_extensions = ['.mp4', '.mov', '.MP4', '.MOV', '.avi', '.mkv', '.webm']
        all_video_files = []
        for ext in video_extensions:
            all_video_files.extend(input_path.glob(f'*{ext}'))
        
        logger.info(f"📁 Found {len(all_video_files)} video files in input folder")
        
        matched_files = {}
        for title in video_titles:
            # Try to match title to filename
            title_clean = title.replace(' ', '_').replace('-', '_').lower()
            
            for video_file in all_video_files:
                filename_clean = video_file.stem.replace(' ', '_').replace('-', '_').lower()
                
                # Check if title matches filename (with some flexibility)
                if (title_clean in filename_clean or 
                    filename_clean in title_clean or
                    self._fuzzy_match(title_clean, filename_clean)):
                    matched_files[title] = video_file
                    logger.info(f"  🎯 Matched: '{title}' → {video_file.name}")
                    break
        
        logger.info(f"📊 Matched {len(matched_files)} out of {len(video_titles)} video titles to original files")
        return matched_files
    
    def _fuzzy_match(self, title: str, filename: str) -> bool:
        """Enhanced fuzzy matching for title and filename."""
        if HAS_FUZZYWUZZY:
            # Use fuzzywuzzy for more sophisticated matching
            ratio = fuzz.partial_ratio(title.lower(), filename.lower())
            return ratio >= 70  # 70% similarity threshold
        else:
            # Fallback to simple word-based matching
            common_words = ['the', 'and', 'or', 'of', 'to', 'in', 'for', 'with', 'on']
            title_words = set(word for word in title.split('_') if word not in common_words and len(word) > 2)
            filename_words = set(word for word in filename.split('_') if word not in common_words and len(word) > 2)
            
            if not title_words or not filename_words:
                return False
            
            # Check if at least 50% of words match
            overlap = title_words.intersection(filename_words)
            return len(overlap) / min(len(title_words), len(filename_words)) >= 0.5
    
    def restore_original_files(self, matched_files: dict, input_folder: str) -> dict:
        """Restore original files from uploads folder back to input folder."""
        input_path = Path(input_folder)
        results = {'restored': [], 'failed': []}
        
        # Look for files in uploads folder
        for title, original_path in matched_files.items():
            try:
                # Check if file was moved to uploads folder
                # Look in recent date folders in uploads
                restored = False
                for days_back in range(7):  # Look back up to 7 days
                    date_folder = (datetime.now() - timedelta(days=days_back)).strftime("%Y-%m-%d")
                    uploads_date_dir = UPLOADS_DIR / date_folder
                    
                    if uploads_date_dir.exists():
                        # Look for original_ and processed_ files
                        for file_pattern in [f"original_{original_path.name}", f"processed_{original_path.stem}_processed.mp4"]:
                            moved_file = uploads_date_dir / file_pattern
                            if moved_file.exists():
                                # Restore original file
                                restored_path = input_path / original_path.name
                                if not restored_path.exists():
                                    shutil.copy2(str(moved_file), str(restored_path))
                                    results['restored'].append(str(restored_path))
                                    logger.info(f"  📥 Restored: {original_path.name}")
                                    restored = True
                                    break
                    
                    if restored:
                        break
                
                if not restored:
                    logger.warning(f"  ⚠️ Could not find moved file for: {original_path.name}")
                    results['failed'].append({'title': title, 'reason': 'Original file not found in uploads'})
                    
            except Exception as e:
                logger.error(f"  ❌ Error restoring {original_path.name}: {e}")
                results['failed'].append({'title': title, 'reason': str(e)})
        
        return results

def main():
    """Main entry point."""
    parser = argparse.ArgumentParser(description="Delete recent YouTube videos and restore original files")
    parser.add_argument("--hours", type=int, required=True, help="Delete videos uploaded in the last X hours (1-48)")
    parser.add_argument("--input-folder", default="/Users/blakeyoung/Library/Mobile Documents/com~apple~CloudDocs/Movies", 
                       help="Folder where original video files should be restored")
    parser.add_argument("--confirm", action="store_true", help="Confirm deletion (required)")
    parser.add_argument("--preview", action="store_true", help="Preview what would be deleted without deleting")
    parser.add_argument("--json-output", action="store_true", help="Output results in JSON format for web interface")
    
    args = parser.parse_args()
    
    if not args.confirm and not args.preview:
        logger.error("❌ This action will DELETE YouTube videos! Use --confirm or --preview")
        return
    
    if args.hours < 1 or args.hours > 48:
        logger.error("❌ Hours must be between 1 and 48")
        return
    
    deleter = YouTubeVideoDeleter()
    
    # Step 1: Find recent videos
    logger.info(f"🚀 Starting {'preview' if args.preview else 'delete/restore'} process for videos from last {args.hours} hours")
    recent_videos = deleter.get_recent_videos(args.hours)
    
    if not recent_videos:
        message = "✅ No recent videos found to delete"
        logger.info(message)
        if args.json_output:
            print(json.dumps({
                "success": True,
                "message": message,
                "videos_found": 0,
                "videos_to_delete": [],
                "files_to_restore": []
            }))
        return
    
    # Step 2: Show what would be deleted
    logger.info(f"\n📋 Videos that will be {'PREVIEWED' if args.preview else 'DELETED'}:")
    video_ids = []
    video_titles = []
    video_details = []
    
    for video in recent_videos:
        logger.info(f"  • {video['title']} (ID: {video['id']}, Published: {video.get('published_at', 'Unknown')})")
        video_ids.append(video['id'])
        video_titles.append(video['title'])
        video_details.append({
            'id': video['id'],
            'title': video['title'],
            'published_at': video.get('published_at', 'Unknown'),
            'url': f"https://www.youtube.com/watch?v={video['id']}"
        })
    
    # Step 3: Find what original files would be restored
    matched_files = deleter.find_original_files(video_titles, args.input_folder)
    
    restore_details = []
    for title, filepath in matched_files.items():
        restore_details.append({
            'title': title,
            'filename': filepath.name,
            'filepath': str(filepath)
        })
    
    if args.preview:
        logger.info(f"\n🔍 PREVIEW SUMMARY:")
        logger.info(f"  📺 Would delete {len(video_ids)} YouTube videos")
        logger.info(f"  📁 Would restore {len(matched_files)} original files")
        
        if matched_files:
            logger.info(f"\n📁 Files that would be restored:")
            for title, filepath in matched_files.items():
                logger.info(f"  • {filepath.name}")
        
        if args.json_output:
            print(json.dumps({
                "success": True,
                "preview": True,
                "message": f"Found {len(video_ids)} videos to delete and {len(matched_files)} files to restore",
                "videos_found": len(video_ids),
                "videos_to_delete": video_details,
                "files_to_restore": restore_details
            }, indent=2))
        return
    
    # Step 4: Delete videos (only if not preview mode)
    logger.info(f"\n🗑️ Deleting {len(video_ids)} YouTube videos...")
    delete_results = deleter.delete_videos(video_ids)
    
    logger.info(f"\n📊 Deletion Results:")
    logger.info(f"  ✅ Successfully deleted: {len(delete_results['success'])} videos")
    logger.info(f"  ❌ Failed to delete: {len(delete_results['failed'])} videos")
    
    if delete_results['failed']:
        logger.info(f"\n❌ Failed deletions:")
        for failure in delete_results['failed']:
            logger.info(f"  • {failure['id']}: {failure['error']}")
    
    # Step 5: Restore original files
    restore_results = {'restored': [], 'failed': []}
    if matched_files:
        logger.info(f"\n📥 Restoring {len(matched_files)} original files...")
        restore_results = deleter.restore_original_files(matched_files, args.input_folder)
        
        logger.info(f"\n📊 Restoration Results:")
        logger.info(f"  ✅ Successfully restored: {len(restore_results['restored'])} files")
        logger.info(f"  ❌ Failed to restore: {len(restore_results['failed'])} files")
        
        if restore_results['restored']:
            logger.info(f"\n📁 Restored files (ready for reprocessing):")
            for filepath in restore_results['restored']:
                logger.info(f"  • {Path(filepath).name}")
        
        if restore_results['failed']:
            logger.info(f"\n❌ Failed restorations:")
            for failure in restore_results['failed']:
                logger.info(f"  • {failure.get('title', 'Unknown')}: {failure['reason']}")
    
    logger.info(f"\n🎯 Delete and restore process completed!")
    logger.info(f"   YouTube videos deleted: {len(delete_results['success'])}")
    logger.info(f"   Original files restored: {len(restore_results['restored'])}")
    logger.info(f"   Ready for reprocessing: {len(restore_results['restored'])} files")
    
    if args.json_output:
        print(json.dumps({
            "success": True,
            "preview": False,
            "message": f"Deleted {len(delete_results['success'])} videos and restored {len(restore_results['restored'])} files",
            "videos_deleted": len(delete_results['success']),
            "videos_failed": len(delete_results['failed']),
            "files_restored": len(restore_results['restored']),
            "files_failed": len(restore_results['failed']),
            "deleted_videos": video_details,
            "restored_files": restore_results['restored']
        }, indent=2))

if __name__ == "__main__":
    main() 