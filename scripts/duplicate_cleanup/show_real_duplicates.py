#!/usr/bin/env python3
"""
Show REAL duplicate groups - only videos with same title AND same duration, or processing indicators
"""

import json
import re
from collections import defaultdict

# YouTube API imports
from googleapiclient.discovery import build
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow

# YouTube API scopes
SCOPES = ['https://www.googleapis.com/auth/youtube.readonly']

def authenticate_youtube():
    """Authenticate with YouTube API using OAuth2."""
    creds = None
    
    if os.path.exists('token.json'):
        creds = Credentials.from_authorized_user_file('token.json', SCOPES)
    
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
        
        with open('token.json', 'w') as token:
            token.write(creds.to_json())
    
    return build('youtube', 'v3', credentials=creds)

def get_video_details(youtube, video_ids):
    """Get detailed video information including duration."""
    video_details = {}
    
    # YouTube API allows max 50 IDs per request
    for i in range(0, len(video_ids), 50):
        batch_ids = video_ids[i:i+50]
        
        response = youtube.videos().list(
            part='statistics,contentDetails,snippet',
            id=','.join(batch_ids)
        ).execute()
        
        for item in response['items']:
            video_id = item['id']
            stats = item.get('statistics', {})
            content = item.get('contentDetails', {})
            snippet = item.get('snippet', {})
            
            video_details[video_id] = {
                'view_count': int(stats.get('viewCount', 0)),
                'like_count': int(stats.get('likeCount', 0)),
                'duration': content.get('duration', ''),
                'actual_title': snippet.get('title', ''),
                'description': snippet.get('description', ''),
                'published_at': snippet.get('publishedAt', '')
            }
    
    return video_details

def parse_duration_to_seconds(duration_str):
    """Convert YouTube duration format (PT1M30S) to seconds."""
    if not duration_str or not duration_str.startswith('PT'):
        return 0
    
    pattern = r'PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?'
    match = re.match(pattern, duration_str)
    
    if not match:
        return 0
    
    hours = int(match.group(1) or 0)
    minutes = int(match.group(2) or 0)
    seconds = int(match.group(3) or 0)
    
    return hours * 3600 + minutes * 60 + seconds

def load_video_data():
    """Load the video data from our analysis."""
    try:
        with open('youtube_duplicates.json', 'r') as f:
            data = json.load(f)
        return data['all_videos']
    except FileNotFoundError:
        print("❌ youtube_duplicates.json not found. Please run the duplicate finder first.")
        return None

def has_processing_indicator(title):
    """Check if title has actual processing indicators."""
    title_lower = title.lower()
    
    processing_patterns = [
        'audio enhanced', 'silence removed', 'silence cut', 'processed', 
        'original_', 'temp', 'test file', 'test video', 'draft', 'unfinished'
    ]
    
    for pattern in processing_patterns:
        if pattern in title_lower:
            return True
    return False

def show_real_duplicate_groups():
    """Show actual groups of duplicate videos - same title AND same duration, or processing indicators."""
    
    videos = load_video_data()
    if not videos:
        return
    
    print("📺 REAL DUPLICATE GROUPS ON YOUR YOUTUBE CHANNEL")
    print("=" * 80)
    print("⚠️  Only showing videos that are TRUE duplicates:")
    print("   1. Same title AND same duration, OR")
    print("   2. Have processing indicators (Audio Enhanced, Silence Removed, etc.)")
    print("=" * 80)
    
    # First, show processing artifacts (these are obvious)
    print("\n🔧 PROCESSING ARTIFACTS (obvious candidates for deletion):")
    print("-" * 60)
    
    processing_count = 0
    for video in videos:
        if has_processing_indicator(video['title']):
            processing_count += 1
            status = "🌍 Public" if video['privacy_status'] == 'public' else f"🔒 {video['privacy_status'].title()}"
            print(f"{processing_count:3d}. {video['title']}")
            print(f"     {status} | {video['published_at'][:10]} | {video['url']}")
    
    if processing_count == 0:
        print("     ✅ No processing artifacts found!")
    
    # Get video durations from YouTube API
    print("\n📊 Getting video durations from YouTube API...")
    youtube = authenticate_youtube()
    if not youtube:
        print("   ⚠️  Could not authenticate, skipping duration-based duplicate analysis")
        return
    
    all_video_ids = [video['id'] for video in videos]
    video_details = get_video_details(youtube, all_video_ids)
    
    # Add duration info to videos
    for video in videos:
        if video['id'] in video_details:
            details = video_details[video['id']]
            video['duration_seconds'] = parse_duration_to_seconds(details['duration'])
            video['view_count'] = details['view_count']
        else:
            video['duration_seconds'] = 0
            video['view_count'] = 0
    
    # Group videos by EXACT title AND duration
    title_duration_groups = defaultdict(list)
    for video in videos:
        # Only consider videos with valid duration
        if video['duration_seconds'] > 0:
            key = (video['title'].strip(), video['duration_seconds'])
            title_duration_groups[key].append(video)
    
    # Find groups with multiple videos (actual duplicates)
    duplicate_groups = []
    for (title, duration_sec), video_list in title_duration_groups.items():
        if len(video_list) > 1:
            duplicate_groups.append((title, duration_sec, video_list))
    
    print(f"\n🔄 TRUE DUPLICATE GROUPS ({len(duplicate_groups)} groups found):")
    print("   📏 These have IDENTICAL title AND duration")
    print("-" * 60)
    
    if len(duplicate_groups) == 0:
        print("     ✅ No true duplicate groups found!")
        return
    
    total_duplicates_to_delete = 0
    
    for group_num, (title, duration_sec, video_list) in enumerate(duplicate_groups, 1):
        duration_min = duration_sec // 60
        duration_remainder = duration_sec % 60
        duration_str = f"{duration_min}:{duration_remainder:02d}"
        
        print(f"\n📋 GROUP {group_num}: {len(video_list)} copies of:")
        print(f"    📝 Title: {title}")
        print(f"    ⏱️  Duration: {duration_str}")
        
        # Sort by views (descending) and publication status
        video_list.sort(key=lambda v: (
            1 if v['privacy_status'] == 'public' else 0,  # Public first
            v.get('view_count', 0)  # Then by views
        ), reverse=True)
        
        for i, video in enumerate(video_list):
            status = "🌍 Public" if video['privacy_status'] == 'public' else f"🔒 {video['privacy_status'].title()}"
            views = video.get('view_count', 0)
            action = "✅ KEEP" if i == 0 else "🗑️ DELETE"
            
            print(f"       {i+1}. {action}: {status} | Views: {views:,} | {video['published_at'][:10]}")
            print(f"          🔗 {video['url']}")
            
            if i > 0:  # Count videos to delete (all except first one)
                total_duplicates_to_delete += 1
    
    print(f"\n" + "=" * 80)
    print(f"📊 SUMMARY:")
    print(f"   Processing artifacts: {processing_count}")
    print(f"   True duplicate groups: {len(duplicate_groups)}")
    print(f"   Total duplicate videos to delete: {total_duplicates_to_delete}")
    print(f"   TOTAL VIDEOS TO DELETE: {processing_count + total_duplicates_to_delete}")
    print("=" * 80)
    
    if duplicate_groups:
        print("\n💡 EXPLANATION:")
        print("   - Each GROUP shows multiple copies with IDENTICAL title AND duration")
        print("   - Videos with same title but different duration are NOT considered duplicates")
        print("   - We keep the BEST copy (public + most views)")
        print("   - We delete the remaining copies in each group")

if __name__ == "__main__":
    import os
    show_real_duplicate_groups() 