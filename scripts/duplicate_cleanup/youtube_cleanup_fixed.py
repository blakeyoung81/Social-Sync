#!/usr/bin/env python3
"""
YouTube Channel Cleanup - ULTRA CONSERVATIVE version that only deletes when absolutely certain
"""

import os
import json
import re
from datetime import datetime
from collections import defaultdict

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
    """Get detailed video information including duration and statistics."""
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
                'comment_count': int(stats.get('commentCount', 0)),
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
    
    import re
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
    """Check if title has actual processing indicators (more precise)."""
    title_lower = title.lower()
    
    # VERY specific processing indicators - only clear processing terms
    processing_patterns = [
        r'\baudio enhanced\b',
        r'\bsilence removed\b', 
        r'\bsilence cut\b',
        r'\bprocessed\b',
        r'\boriginal_\b',
        r'\btemp\b',
        r'\btest\s+file\b',
        r'\btest\s+video\b',
        r'\bdraft\b',
        r'\bunfinished\b',
        r'\baudio_enhanced\b',
        r'\bsilence_removed\b',
        r'\bsilence_cut\b'
    ]
    
    for pattern in processing_patterns:
        if re.search(pattern, title_lower):
            return True
    
    return False

def identify_ultra_conservative_duplicates():
    """ULTRA CONSERVATIVE duplicate detection - only flag when absolutely certain."""
    
    videos = load_video_data()
    if not videos:
        return []
    
    print("🔍 ULTRA CONSERVATIVE ANALYSIS: Only flagging obvious duplicates...")
    print("=" * 80)
    
    deletion_list = []
    
    # 1. Find videos with ACTUAL processing indicators (these are safer to delete)
    print("🔧 STEP 1: Finding videos with clear processing indicators...")
    processing_videos = []
    for video in videos:
        if has_processing_indicator(video['title']):
            processing_videos.append(video)
            deletion_list.append({
                'video': video,
                'reason': f'Contains processing indicator: {video["title"]}',
                'confidence': 'high',
                'category': 'processing_artifact'
            })
    
    print(f"   Found {len(processing_videos)} videos with actual processing indicators")
    
    # 2. Get detailed video information including duration
    print("\n📊 STEP 2: Getting detailed video information from YouTube...")
    all_video_ids = [video['id'] for video in videos]
    
    youtube = authenticate_youtube()
    if not youtube:
        print("   ⚠️  Could not authenticate, skipping duplicate analysis")
        return deletion_list
    
    video_details = get_video_details(youtube, all_video_ids)
    
    # Add detailed info to video data
    for video in videos:
        if video['id'] in video_details:
            details = video_details[video['id']]
            video.update(details)
            video['duration_seconds'] = parse_duration_to_seconds(details['duration'])
        else:
            video['view_count'] = 0
            video['duration_seconds'] = 0
            video['actual_title'] = video['title']
    
    # 3. ULTRA CONSERVATIVE duplicate detection
    print("\n🔄 STEP 3: Ultra conservative duplicate analysis...")
    print("   ⚠️  Only flagging videos that are IDENTICAL in title AND duration")
    
    # Group by EXACT title AND duration
    exact_groups = defaultdict(list)
    for video in videos:
        # Create a key with exact title and duration
        exact_key = (video['title'].strip(), video.get('duration_seconds', 0))
        exact_groups[exact_key].append(video)
    
    # Only consider groups with multiple videos AND same non-zero duration
    true_duplicate_groups = {}
    for (title, duration), video_group in exact_groups.items():
        if len(video_group) > 1 and duration > 0:  # Must have same duration > 0
            true_duplicate_groups[(title, duration)] = video_group
    
    print(f"   Found {len(true_duplicate_groups)} groups with identical title AND duration")
    
    for (title, duration_sec), video_group in true_duplicate_groups.items():
        duration_min = duration_sec // 60
        duration_remainder = duration_sec % 60
        duration_str = f"{duration_min}:{duration_remainder:02d}"
        
        print(f"\n   📋 IDENTICAL VIDEOS: {len(video_group)} copies of:")
        print(f"      Title: {title[:70]}...")
        print(f"      Duration: {duration_str}")
        
        # Enhanced scoring for true duplicates
        def video_score(v):
            score = 0
            
            # Privacy status preference (public is best)
            if v['privacy_status'] == 'public':
                score += 10000
            elif v['privacy_status'] == 'unlisted':
                score += 5000
            elif v['privacy_status'] == 'private':
                score += 1000
            
            # View count is VERY important
            score += v.get('view_count', 0) * 100
            
            # Like count
            score += v.get('like_count', 0) * 50
            
            # Prefer newer videos (small boost)
            try:
                pub_date = datetime.fromisoformat(v['published_at'].replace('Z', '+00:00'))
                score += pub_date.timestamp() / 10000000  # Small boost for newer
            except:
                pass
            
            # HEAVILY penalize processing indicators
            if has_processing_indicator(v['title']):
                score -= 1000000  # Very heavy penalty
            
            return score
        
        # Sort by score (highest first = best to keep)
        video_group.sort(key=video_score, reverse=True)
        
        # Show detailed analysis
        print(f"      📊 Video ranking (keeping #1):")
        for i, video in enumerate(video_group):
            score = video_score(video)
            views = video.get('view_count', 0)
            status = video['privacy_status']
            processing = "⚠️ PROC" if has_processing_indicator(video['title']) else "✓ Clean"
            action = "✅ KEEP" if i == 0 else "🗑️ DELETE"
            
            print(f"         {i+1}. {action}: Views: {views:,} | {status} | {processing}")
            print(f"            URL: {video['url']}")
        
        # Keep the first (best), delete the rest
        videos_to_delete = video_group[1:]
        
        for video in videos_to_delete:
            keeper = video_group[0]
            deletion_list.append({
                'video': video,
                'reason': f'Exact duplicate (title + duration). Keeping version with {keeper.get("view_count", 0):,} views',
                'confidence': 'ultra_high',
                'category': 'exact_duplicate',
                'better_version': keeper['id'],
                'duplicate_title': title,
                'duration': duration_str
            })
    
    return deletion_list

def show_ultra_conservative_deletion_list():
    """Show only videos we're absolutely certain should be deleted."""
    
    print("📺 ULTRA CONSERVATIVE YOUTUBE DELETION ANALYSIS")
    print("=" * 80)
    print("⚠️  ONLY showing videos that are 100% certain to be duplicates or processing artifacts")
    print("=" * 80)
    
    deletion_list = identify_ultra_conservative_duplicates()
    
    if not deletion_list:
        print("✅ No obvious duplicates or processing artifacts found!")
        print("✅ Your channel appears clean!")
        return
    
    # Group by category
    categories = defaultdict(list)
    for item in deletion_list:
        categories[item['category']].append(item)
    
    total_count = 0
    
    for category, items in categories.items():
        total_count += len(items)
        print(f"\n📋 {category.upper().replace('_', ' ')}: {len(items)} videos")
        print("-" * 60)
        
        for i, item in enumerate(items, 1):
            video = item['video']
            views = video.get('view_count', 0)
            status = "🌍 Public" if video['privacy_status'] == 'public' else f"🔒 {video['privacy_status'].title()}"
            
            print(f"{i:3d}. {video['title']}")
            print(f"     {status} | Views: {views:,} | {video['published_at'][:10]}")
            
            if 'duration' in item:
                print(f"     Duration: {item['duration']} | Confidence: {item['confidence']}")
            
            print(f"     💡 Reason: {item['reason']}")
            print(f"     🔗 {video['url']}")
            print()
    
    print(f"📊 TOTAL VIDEOS TO DELETE: {total_count}")
    print("=" * 80)
    print("⚠️  This analysis is ULTRA CONSERVATIVE - only obvious cases are flagged")

if __name__ == "__main__":
    show_ultra_conservative_deletion_list() 