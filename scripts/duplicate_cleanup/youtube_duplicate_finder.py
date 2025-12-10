#!/usr/bin/env python3
"""
YouTube Channel Duplicate Finder
Searches your YouTube channel for duplicate videos based on:
- Exact same duration
- Similar titles
- Upload/scheduled status
"""

import os
import json
import re
from datetime import datetime
from difflib import SequenceMatcher
from collections import defaultdict
import argparse
from pathlib import Path

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
    
    # Check if token.json exists
    if os.path.exists('token.json'):
        creds = Credentials.from_authorized_user_file('token.json', SCOPES)
    
    # If there are no (valid) credentials available, let the user log in.
    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
        else:
            config_path = Path(__file__).parent.parent.parent / "config" / "client_secrets.json"
            if not config_path.exists():
                print("❌ ERROR: client_secrets.json not found!")
                print("Please download your OAuth2 credentials from Google Cloud Console")
                print("and save them as 'client_secrets.json' in the config directory.")
                return None
                
            flow = InstalledAppFlow.from_client_secrets_file(
                str(config_path), SCOPES)
            creds = flow.run_local_server(port=0)
        
        # Save the credentials for the next run
        with open('token.json', 'w') as token:
            token.write(creds.to_json())
    
    return build('youtube', 'v3', credentials=creds)

def get_channel_videos(youtube, max_results=500):
    """Get all videos from the authenticated user's channel."""
    print("🔍 Fetching your YouTube channel videos...")
    
    # Get the channel ID for the authenticated user
    channels_response = youtube.channels().list(
        part='contentDetails,snippet',
        mine=True
    ).execute()
    
    if not channels_response['items']:
        print("❌ No channel found for authenticated user")
        return []
    
    channel = channels_response['items'][0]
    channel_name = channel['snippet']['title']
    uploads_playlist_id = channel['contentDetails']['relatedPlaylists']['uploads']
    
    print(f"📺 Channel: {channel_name}")
    print(f"🎬 Fetching videos from uploads playlist...")
    
    videos = []
    next_page_token = None
    page_count = 0
    
    while True:
        # Get playlist items (videos)
        playlist_request = youtube.playlistItems().list(
            part='snippet,contentDetails',
            playlistId=uploads_playlist_id,
            maxResults=50,  # Max allowed per request
            pageToken=next_page_token
        )
        
        playlist_response = playlist_request.execute()
        
        # Extract video IDs for this batch
        video_ids = [item['contentDetails']['videoId'] for item in playlist_response['items']]
        
        if video_ids:
            # Get detailed video information
            videos_request = youtube.videos().list(
                part='snippet,contentDetails,status',
                id=','.join(video_ids)
            )
            videos_response = videos_request.execute()
            
            for video in videos_response['items']:
                video_info = {
                    'id': video['id'],
                    'title': video['snippet']['title'],
                    'duration': video['contentDetails']['duration'],
                    'duration_seconds': parse_duration(video['contentDetails']['duration']),
                    'published_at': video['snippet']['publishedAt'],
                    'privacy_status': video['status']['privacyStatus'],
                    'upload_status': video['status']['uploadStatus'],
                    'url': f"https://www.youtube.com/watch?v={video['id']}",
                    'scheduled_publish_time': video['status'].get('publishAt'),
                }
                videos.append(video_info)
        
        page_count += 1
        print(f"   Fetched page {page_count}, found {len(videos)} videos so far...")
        
        # Check if we have more pages and haven't hit our limit
        next_page_token = playlist_response.get('nextPageToken')
        if not next_page_token or len(videos) >= max_results:
            break
    
    print(f"✅ Found {len(videos)} total videos")
    return videos

def parse_duration(duration_str):
    """Convert YouTube duration (PT1M30S) to seconds."""
    # YouTube uses ISO 8601 duration format: PT1H2M3S
    import re
    
    pattern = r'PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?'
    match = re.match(pattern, duration_str)
    
    if not match:
        return 0
    
    hours = int(match.group(1) or 0)
    minutes = int(match.group(2) or 0)
    seconds = int(match.group(3) or 0)
    
    return hours * 3600 + minutes * 60 + seconds

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

def clean_title(title):
    """Clean title for better comparison."""
    # Remove common prefixes/suffixes that might vary
    title = title.lower()
    
    # Remove common medical education prefixes
    prefixes_to_remove = [
        'step 1', 'step1', 'usmle', 'high yield', 'hy', 'quick review',
        'med school', 'medical', 'pathology', 'pharmacology', 'anatomy',
        'physiology', 'micro', 'microbiology', 'review', 'explained',
        'made easy', 'simplified', 'crash course', 'rapid', 'quiz'
    ]
    
    # Remove special characters and extra whitespace
    title = re.sub(r'[^\w\s-]', ' ', title)
    title = re.sub(r'\s+', ' ', title).strip()
    
    return title

def similarity_ratio(title1, title2):
    """Calculate similarity ratio between two titles."""
    return SequenceMatcher(None, clean_title(title1), clean_title(title2)).ratio()

def find_duplicates(videos):
    """Find potential duplicate videos."""
    print("\n🔍 Analyzing for duplicates...")
    
    duplicates = {
        'exact_duration': defaultdict(list),
        'similar_titles': [],
        'exact_titles': defaultdict(list),
        'near_duration': defaultdict(list)  # Within 5 seconds
    }
    
    # Group by exact duration
    duration_groups = defaultdict(list)
    for video in videos:
        duration_groups[video['duration_seconds']].append(video)
    
    for duration, video_list in duration_groups.items():
        if len(video_list) > 1:
            duplicates['exact_duration'][duration] = video_list
    
    # Group by exact title (case insensitive)
    title_groups = defaultdict(list)
    for video in videos:
        clean_video_title = clean_title(video['title'])
        title_groups[clean_video_title].append(video)
    
    for title, video_list in title_groups.items():
        if len(video_list) > 1:
            duplicates['exact_titles'][title] = video_list
    
    # Find similar titles (but not exact)
    processed_videos = set()
    for i, video1 in enumerate(videos):
        if video1['id'] in processed_videos:
            continue
            
        similar_group = [video1]
        processed_videos.add(video1['id'])
        
        for j, video2 in enumerate(videos[i+1:], i+1):
            if video2['id'] in processed_videos:
                continue
                
            similarity = similarity_ratio(video1['title'], video2['title'])
            if similarity > 0.85:  # Very similar titles
                similar_group.append(video2)
                processed_videos.add(video2['id'])
        
        if len(similar_group) > 1:
            duplicates['similar_titles'].append(similar_group)
    
    # Find videos with near-identical duration (within 5 seconds)
    for i, video1 in enumerate(videos):
        near_matches = [video1]
        
        for j, video2 in enumerate(videos[i+1:], i+1):
            duration_diff = abs(video1['duration_seconds'] - video2['duration_seconds'])
            if 1 <= duration_diff <= 5:  # 1-5 seconds difference
                near_matches.append(video2)
        
        if len(near_matches) > 1:
            duplicates['near_duration'][video1['duration_seconds']] = near_matches
    
    return duplicates

def print_duplicate_report(duplicates, videos):
    """Print comprehensive duplicate report."""
    print("\n" + "=" * 80)
    print("🎬 YOUTUBE CHANNEL DUPLICATE ANALYSIS REPORT")
    print("=" * 80)
    
    total_potential_duplicates = 0
    
    # Exact duration matches
    if duplicates['exact_duration']:
        print(f"\n⏱️  EXACT DURATION MATCHES ({len(duplicates['exact_duration'])} groups):")
        print("-" * 60)
        for duration, video_list in duplicates['exact_duration'].items():
            total_potential_duplicates += len(video_list) - 1
            print(f"\n🕐 Duration: {format_duration(duration)}")
            for video in video_list:
                status_emoji = get_status_emoji(video)
                print(f"   {status_emoji} {video['title']}")
                print(f"      📅 {video['published_at'][:10]} | 🔗 {video['url']}")
    
    # Exact title matches
    if duplicates['exact_titles']:
        print(f"\n📝 EXACT TITLE MATCHES ({len(duplicates['exact_titles'])} groups):")
        print("-" * 60)
        for title, video_list in duplicates['exact_titles'].items():
            if len(video_list) > 1:  # Skip single videos
                total_potential_duplicates += len(video_list) - 1
                print(f"\n📋 Title: {title}")
                for video in video_list:
                    status_emoji = get_status_emoji(video)
                    duration_str = format_duration(video['duration_seconds'])
                    print(f"   {status_emoji} Duration: {duration_str}")
                    print(f"      📅 {video['published_at'][:10]} | 🔗 {video['url']}")
    
    # Similar titles
    if duplicates['similar_titles']:
        print(f"\n🔍 SIMILAR TITLE MATCHES ({len(duplicates['similar_titles'])} groups):")
        print("-" * 60)
        for group in duplicates['similar_titles']:
            total_potential_duplicates += len(group) - 1
            print(f"\n📊 Similar titles detected:")
            for video in group:
                status_emoji = get_status_emoji(video)
                duration_str = format_duration(video['duration_seconds'])
                print(f"   {status_emoji} {video['title']}")
                print(f"      ⏱️  {duration_str} | 📅 {video['published_at'][:10]}")
                print(f"      🔗 {video['url']}")
    
    # Near duration matches
    if duplicates['near_duration']:
        print(f"\n⏰ NEAR-DURATION MATCHES ({len(duplicates['near_duration'])} groups):")
        print("-" * 60)
        print("(Videos within 1-5 seconds of each other)")
        for base_duration, video_list in duplicates['near_duration'].items():
            if len(video_list) > 1:
                print(f"\n🕒 Base duration: {format_duration(base_duration)}")
                for video in video_list:
                    status_emoji = get_status_emoji(video)
                    duration_str = format_duration(video['duration_seconds'])
                    print(f"   {status_emoji} {video['title']} ({duration_str})")
                    print(f"      📅 {video['published_at'][:10]} | 🔗 {video['url']}")
    
    # Summary
    print(f"\n" + "=" * 80)
    print(f"📊 SUMMARY:")
    print(f"   Total videos analyzed: {len(videos)}")
    print(f"   Potential duplicate videos: {total_potential_duplicates}")
    print(f"   Exact duration groups: {len(duplicates['exact_duration'])}")
    print(f"   Exact title groups: {len(duplicates['exact_titles'])}")
    print(f"   Similar title groups: {len(duplicates['similar_titles'])}")
    print(f"   Near-duration groups: {len(duplicates['near_duration'])}")
    print("=" * 80)

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

def save_results(duplicates, videos, filename='youtube_duplicates.json'):
    """Save results to JSON file."""
    # Convert defaultdict to regular dict for JSON serialization
    results = {
        'analysis_date': datetime.now().isoformat(),
        'total_videos': len(videos),
        'duplicates': {
            'exact_duration': dict(duplicates['exact_duration']),
            'similar_titles': duplicates['similar_titles'],
            'exact_titles': dict(duplicates['exact_titles']),
            'near_duration': dict(duplicates['near_duration'])
        },
        'all_videos': videos
    }
    
    with open(filename, 'w') as f:
        json.dump(results, f, indent=2, default=str)
    
    print(f"\n💾 Results saved to: {filename}")

def main():
    parser = argparse.ArgumentParser(description='Find duplicate videos on your YouTube channel')
    parser.add_argument('--max-videos', type=int, default=500,
                       help='Maximum number of videos to analyze (default: 500)')
    parser.add_argument('--save', action='store_true',
                       help='Save results to JSON file')
    
    args = parser.parse_args()
    
    print("🎬 YouTube Channel Duplicate Finder")
    print("=" * 50)
    
    # Authenticate with YouTube
    youtube = authenticate_youtube()
    if not youtube:
        return
    
    # Get channel videos
    videos = get_channel_videos(youtube, args.max_videos)
    if not videos:
        print("❌ No videos found or error occurred")
        return
    
    # Find duplicates
    duplicates = find_duplicates(videos)
    
    # Print report
    print_duplicate_report(duplicates, videos)
    
    # Save results if requested
    if args.save:
        save_results(duplicates, videos)
    
    print(f"\n✅ Analysis complete!")

if __name__ == "__main__":
    main() 