#!/usr/bin/env python3
"""
Check if videos still exist on YouTube or have been manually deleted
"""

import os
import json
import requests
from collections import defaultdict

def load_data():
    """Load the video data from our analysis."""
    try:
        with open('youtube_duplicates.json', 'r') as f:
            data = json.load(f)
        return data['all_videos']
    except FileNotFoundError:
        print("❌ youtube_duplicates.json not found.")
        return None

def get_unique_videos():
    """Get a list of unique videos by ID."""
    videos = load_data()
    if not videos:
        return []
    
    # Create a dict with video IDs as keys
    unique_videos = {}
    for video in videos:
        video_id = video['id']
        if video_id not in unique_videos:
            unique_videos[video_id] = video
    
    return list(unique_videos.values())

def check_video_exists(video_id):
    """Check if a YouTube video still exists."""
    url = f"https://www.youtube.com/oembed?url=http://www.youtube.com/watch?v={video_id}&format=json"
    response = requests.head(url)
    return response.status_code == 200

def check_all_videos():
    """Check all unique videos to see if they still exist."""
    unique_videos = get_unique_videos()
    print(f"Checking {len(unique_videos)} unique videos...")
    
    deleted_videos = []
    existing_videos = []
    
    for i, video in enumerate(unique_videos[:20]):  # Limit to first 20 for testing
        video_id = video['id']
        title = video['title']
        
        print(f"Checking {i+1}/{min(20, len(unique_videos))}: {title} ({video_id})...")
        exists = check_video_exists(video_id)
        
        if exists:
            existing_videos.append(video)
            print(f"  ✅ Video still exists")
        else:
            deleted_videos.append(video)
            print(f"  ❌ Video has been deleted")
    
    return existing_videos, deleted_videos

if __name__ == "__main__":
    existing, deleted = check_all_videos()
    
    print("\n" + "=" * 80)
    print(f"✅ Videos still on YouTube: {len(existing)}")
    print(f"❌ Videos deleted: {len(deleted)}")
    
    if deleted:
        print("\n📋 DELETED VIDEOS:")
        for video in deleted:
            print(f"- {video['title']} ({video['id']})")
            print(f"  URL: {video['url']}")
    
    print("\n🔄 CHECKING FOR PROCESSING ARTIFACTS...")
    processing_terms = ['audio enhanced', 'silence removed', 'processed', 'original_', 'temp']
    
    for video in existing:
        title_lower = video['title'].lower()
        if any(term in title_lower for term in processing_terms):
            print(f"- {video['title']} ({video['id']})")
            print(f"  URL: {video['url']}") 