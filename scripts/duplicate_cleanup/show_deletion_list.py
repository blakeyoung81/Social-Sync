#!/usr/bin/env python3
"""
Show the exact list of video titles that would be deleted from YouTube channel
"""

import json
from collections import defaultdict

def load_video_data():
    """Load the video data from our analysis."""
    try:
        with open('youtube_duplicates.json', 'r') as f:
            data = json.load(f)
        return data['all_videos']
    except FileNotFoundError:
        print("❌ youtube_duplicates.json not found. Please run the duplicate finder first.")
        return None

def show_deletion_list():
    """Show exactly what video titles would be deleted."""
    
    videos = load_video_data()
    if not videos:
        return
    
    print("📺 YOUTUBE CHANNEL VIDEOS TO BE DELETED")
    print("=" * 80)
    print("⚠️  These are videos that would be DELETED from your YouTube channel")
    print("=" * 80)
    
    # 1. Processing indicators
    processing_indicators = [
        'audio enhanced', 'silence removed', 'silence cut', 
        'processed', 'original_', 'temp', 'test'
    ]
    
    processing_videos = []
    for video in videos:
        title_lower = video['title'].lower()
        for indicator in processing_indicators:
            if indicator in title_lower:
                processing_videos.append(video)
                break
    
    print(f"\n🔧 PROCESSING ARTIFACTS TO DELETE ({len(processing_videos)} videos):")
    print("-" * 60)
    for i, video in enumerate(processing_videos, 1):
        status = "🌍 Public" if video['privacy_status'] == 'public' else f"🔒 {video['privacy_status'].title()}"
        print(f"{i:3d}. {video['title']}")
        print(f"     {status} | {video['published_at'][:10]}")
    
    # 2. Exact duplicates
    title_groups = defaultdict(list)
    for video in videos:
        clean_title = video['title'].lower().strip()
        title_groups[clean_title].append(video)
    
    duplicate_groups = {title: videos_list for title, videos_list in title_groups.items() if len(videos_list) > 1}
    
    duplicate_deletions = []
    for title, video_group in duplicate_groups.items():
        if len(video_group) > 1:
            # Sort by preference (same logic as cleanup script)
            def video_score(v):
                score = 0
                if v['privacy_status'] == 'public':
                    score += 100
                elif v['privacy_status'] == 'unlisted':
                    score += 50
                elif v['privacy_status'] == 'private':
                    score += 10
                
                # Penalize processing indicators
                title_lower = v['title'].lower()
                for indicator in processing_indicators:
                    if indicator in title_lower:
                        score -= 1000
                
                return score
            
            video_group.sort(key=video_score, reverse=True)
            
            # Keep the first (best), delete the rest
            videos_to_delete = video_group[1:]
            duplicate_deletions.extend(videos_to_delete)
    
    print(f"\n🔄 DUPLICATE COPIES TO DELETE ({len(duplicate_deletions)} videos):")
    print("-" * 60)
    
    # Group duplicates by title for clearer display
    deletion_groups = defaultdict(list)
    for video in duplicate_deletions:
        clean_title = video['title'].lower().strip()
        deletion_groups[clean_title].append(video)
    
    count = 1
    for title, videos_to_delete in deletion_groups.items():
        print(f"\n   📋 Deleting {len(videos_to_delete)} duplicate(s) of: {videos_to_delete[0]['title']}")
        for video in videos_to_delete:
            status = "🌍 Public" if video['privacy_status'] == 'public' else f"🔒 {video['privacy_status'].title()}"
            print(f"{count:3d}. DELETE: {video['title']}")
            print(f"     {status} | {video['published_at'][:10]} | {video['url']}")
            count += 1
    
    print(f"\n" + "=" * 80)
    print(f"📊 SUMMARY:")
    print(f"   Processing artifacts: {len(processing_videos)}")
    print(f"   Duplicate copies: {len(duplicate_deletions)}")
    print(f"   TOTAL TO DELETE: {len(processing_videos) + len(duplicate_deletions)}")
    print("=" * 80)
    print("\n⚠️  THESE VIDEOS WOULD BE PERMANENTLY DELETED FROM YOUR YOUTUBE CHANNEL")
    print("⚠️  Local files on your computer would NOT be affected")

if __name__ == "__main__":
    show_deletion_list() 