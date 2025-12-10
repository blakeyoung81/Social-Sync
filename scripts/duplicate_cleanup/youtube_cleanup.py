#!/usr/bin/env python3
"""
YouTube Channel Cleanup - Delete duplicate and processed videos
DANGEROUS OPERATION - Use with extreme caution!
"""

import os
import json
import re
from datetime import datetime
from collections import defaultdict
import argparse

# YouTube API imports
from googleapiclient.discovery import build
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow

# YouTube API scopes - need write access for deletion
SCOPES = ['https://www.googleapis.com/auth/youtube']

def authenticate_youtube():
    """Authenticate with YouTube API using OAuth2."""
    creds = None
    
    # Check if token.json exists
    if os.path.exists('token.json'):
        creds = Credentials.from_authorized_user_file('token.json', SCOPES)
    
    # If there are no (valid) credentials available, let the user log in.
    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
        else:
            if not os.path.exists('client_secrets.json'):
                print("❌ ERROR: client_secrets.json not found!")
                return None
                
            flow = InstalledAppFlow.from_client_secrets_file(
                'client_secrets.json', SCOPES)
            creds = flow.run_local_server(port=0)
        
        # Save the credentials for the next run
        with open('token.json', 'w') as token:
            token.write(creds.to_json())
    
    return build('youtube', 'v3', credentials=creds)

def load_video_data():
    """Load the video data from our analysis."""
    try:
        with open('youtube_duplicates.json', 'r') as f:
            data = json.load(f)
        return data['all_videos']
    except FileNotFoundError:
        print("❌ youtube_duplicates.json not found. Please run the duplicate finder first.")
        return None

def identify_videos_to_delete(videos):
    """Identify which videos should be deleted based on criteria."""
    
    deletion_list = []
    
    # 1. Find videos with processing indicators
    processing_indicators = [
        'audio enhanced', 'silence removed', 'silence cut', 
        'processed', 'original_', 'temp', 'test'
    ]
    
    print("🔍 STEP 1: Finding videos with processing indicators...")
    for video in videos:
        title_lower = video['title'].lower()
        for indicator in processing_indicators:
            if indicator in title_lower:
                deletion_list.append({
                    'video': video,
                    'reason': f'Contains processing indicator: "{indicator}"',
                    'confidence': 'high',
                    'category': 'processing_artifact'
                })
                break
    
    print(f"   Found {len(deletion_list)} videos with processing indicators")
    
    # 2. Find exact duplicates and identify which to keep
    print("\n🔍 STEP 2: Analyzing exact duplicates...")
    
    # Group by exact title (case insensitive)
    title_groups = defaultdict(list)
    for video in videos:
        clean_title = video['title'].lower().strip()
        title_groups[clean_title].append(video)
    
    duplicate_groups = {title: videos_list for title, videos_list in title_groups.items() if len(videos_list) > 1}
    
    for title, video_group in duplicate_groups.items():
        if len(video_group) > 1:
            print(f"\n   📋 Found {len(video_group)} duplicates: {title[:60]}...")
            
            # Sort by preference (keep the best one)
            # Prefer: public > unlisted > private, newer dates, no processing indicators
            def video_score(v):
                score = 0
                
                # Privacy status preference
                if v['privacy_status'] == 'public':
                    score += 100
                elif v['privacy_status'] == 'unlisted':
                    score += 50
                elif v['privacy_status'] == 'private':
                    score += 10
                
                # Prefer newer videos (published date)
                try:
                    pub_date = datetime.fromisoformat(v['published_at'].replace('Z', '+00:00'))
                    score += pub_date.timestamp() / 100000  # Small boost for newer
                except:
                    pass
                
                # Penalize processing indicators in title
                title_lower = v['title'].lower()
                for indicator in processing_indicators:
                    if indicator in title_lower:
                        score -= 1000  # Heavy penalty
                
                return score
            
            # Sort by score (highest first = best to keep)
            video_group.sort(key=video_score, reverse=True)
            
            # Keep the first (best), delete the rest
            videos_to_keep = video_group[0]
            videos_to_delete = video_group[1:]
            
            print(f"      ✅ KEEPING: {videos_to_keep['title']} ({videos_to_keep['privacy_status']})")
            
            for video in videos_to_delete:
                deletion_list.append({
                    'video': video,
                    'reason': f'Exact duplicate of better video',
                    'confidence': 'high',
                    'category': 'exact_duplicate',
                    'better_version': videos_to_keep['id']
                })
                print(f"      🗑️  DELETING: {video['title']} ({video['privacy_status']})")
    
    print(f"\n   Found {len([d for d in deletion_list if d['category'] == 'exact_duplicate'])} duplicate videos to delete")
    
    return deletion_list

def create_deletion_report(deletion_list):
    """Create a detailed report of what will be deleted."""
    
    print("\n" + "=" * 80)
    print("🚨 DELETION REPORT - REVIEW CAREFULLY!")
    print("=" * 80)
    
    categories = defaultdict(list)
    for item in deletion_list:
        categories[item['category']].append(item)
    
    total_count = 0
    
    for category, items in categories.items():
        total_count += len(items)
        print(f"\n📋 {category.upper().replace('_', ' ')}: {len(items)} videos")
        print("-" * 60)
        
        for i, item in enumerate(items[:10], 1):  # Show first 10
            video = item['video']
            status_emoji = get_status_emoji(video)
            print(f"   {i}. {status_emoji} {video['title']}")
            print(f"      📅 {video['published_at'][:10]} | ⏱️  {format_duration(video['duration_seconds'])}")
            print(f"      🔗 {video['url']}")
            print(f"      💡 Reason: {item['reason']}")
        
        if len(items) > 10:
            print(f"   ... and {len(items) - 10} more")
    
    print(f"\n" + "=" * 80)
    print(f"📊 TOTAL VIDEOS TO DELETE: {total_count}")
    print("=" * 80)
    
    return total_count

def get_status_emoji(video):
    """Get emoji for video status."""
    if video['privacy_status'] == 'private':
        if video.get('scheduled_publish_time'):
            return '📅'  # Scheduled
        else:
            return '🔒'  # Private
    elif video['privacy_status'] == 'unlisted':
        return '🔗'  # Unlisted
    elif video['privacy_status'] == 'public':
        return '🌍'  # Public
    else:
        return '❓'  # Unknown

def format_duration(seconds):
    """Convert seconds to readable format."""
    if seconds < 60:
        return f"{seconds}s"
    elif seconds < 3600:
        minutes = seconds // 60
        secs = seconds % 60
        return f"{minutes}m {secs}s"
    else:
        hours = seconds // 3600
        minutes = (seconds % 3600) // 60
        secs = seconds % 60
        return f"{hours}h {minutes}m {secs}s"

def save_deletion_plan(deletion_list):
    """Save the deletion plan to a file for safety."""
    plan = {
        'created_at': datetime.now().isoformat(),
        'total_videos': len(deletion_list),
        'deletion_list': deletion_list
    }
    
    filename = f"deletion_plan_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
    with open(filename, 'w') as f:
        json.dump(plan, f, indent=2, default=str)
    
    print(f"\n💾 Deletion plan saved to: {filename}")
    return filename

def execute_deletions(youtube, deletion_list, dry_run=True):
    """Execute the deletions (or dry run)."""
    
    if dry_run:
        print("\n🔍 DRY RUN MODE - No videos will actually be deleted")
        print("=" * 60)
        return
    
    print("\n🚨 EXECUTING DELETIONS - THIS CANNOT BE UNDONE!")
    print("=" * 60)
    
    success_count = 0
    error_count = 0
    
    for i, item in enumerate(deletion_list, 1):
        video = item['video']
        video_id = video['id']
        
        try:
            print(f"[{i}/{len(deletion_list)}] Deleting: {video['title'][:60]}...")
            
            # Delete the video
            youtube.videos().delete(id=video_id).execute()
            
            print(f"   ✅ Successfully deleted: {video_id}")
            success_count += 1
            
        except Exception as e:
            print(f"   ❌ Failed to delete {video_id}: {str(e)}")
            error_count += 1
    
    print(f"\n📊 DELETION SUMMARY:")
    print(f"   Successfully deleted: {success_count}")
    print(f"   Failed: {error_count}")
    print(f"   Total processed: {len(deletion_list)}")

def main():
    parser = argparse.ArgumentParser(description='Clean up YouTube channel duplicates')
    parser.add_argument('--dry-run', action='store_true', default=True,
                       help='Show what would be deleted without actually deleting (default: True)')
    parser.add_argument('--execute', action='store_true',
                       help='Actually delete the videos (DANGEROUS!)')
    
    args = parser.parse_args()
    
    print("🧹 YouTube Channel Cleanup Tool")
    print("=" * 50)
    print("⚠️  WARNING: This tool can permanently delete videos!")
    print("⚠️  Always run with --dry-run first!")
    print()
    
    # Load video data
    videos = load_video_data()
    if not videos:
        return
    
    print(f"📊 Loaded {len(videos)} videos from analysis")
    
    # Identify videos to delete
    deletion_list = identify_videos_to_delete(videos)
    
    # Create report
    total_count = create_deletion_report(deletion_list)
    
    if total_count == 0:
        print("✅ No videos found for deletion!")
        return
    
    # Save deletion plan
    plan_file = save_deletion_plan(deletion_list)
    
    if args.execute and not args.dry_run:
        print("\n🚨 YOU ARE ABOUT TO PERMANENTLY DELETE VIDEOS!")
        print("This action CANNOT be undone!")
        
        confirmation = input("\nType 'DELETE FOREVER' to confirm: ")
        if confirmation != 'DELETE FOREVER':
            print("❌ Operation cancelled")
            return
        
        # Authenticate with write permissions
        youtube = authenticate_youtube()
        if not youtube:
            print("❌ Authentication failed")
            return
        
        # Execute deletions
        execute_deletions(youtube, deletion_list, dry_run=False)
    else:
        print(f"\n🔍 DRY RUN COMPLETE")
        print(f"📄 Review the deletion plan in: {plan_file}")
        print(f"🚀 To execute deletions, run: python youtube_cleanup.py --execute")

if __name__ == "__main__":
    main() 