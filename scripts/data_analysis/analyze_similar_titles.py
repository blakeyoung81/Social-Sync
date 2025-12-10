#!/usr/bin/env python3
"""
Analyze YouTube duplicates for videos with very similar titles
- More than 4 words in common
- Same title length
"""

import json
import re
from collections import Counter

def clean_and_tokenize(title):
    """Clean title and return list of meaningful words."""
    # Convert to lowercase and remove special characters
    cleaned = re.sub(r'[^\w\s-]', ' ', title.lower())
    # Split into words and filter out common stop words and short words
    words = cleaned.split()
    
    # Remove common stop words and short words
    stop_words = {'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'the', 'is', 'are', 'was', 'were', 'be', 'been', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'can', 'this', 'that', 'these', 'those', 'i', 'you', 'he', 'she', 'it', 'we', 'they'}
    
    meaningful_words = [word for word in words if len(word) > 2 and word not in stop_words]
    return meaningful_words

def count_common_words(title1, title2):
    """Count how many words are common between two titles."""
    words1 = clean_and_tokenize(title1)
    words2 = clean_and_tokenize(title2)
    
    # Use Counter to handle duplicate words properly
    counter1 = Counter(words1)
    counter2 = Counter(words2)
    
    # Find intersection (common words)
    common = counter1 & counter2
    return sum(common.values())

def analyze_similar_titles():
    """Analyze the YouTube duplicates data for very similar titles."""
    
    try:
        with open('youtube_duplicates.json', 'r') as f:
            data = json.load(f)
    except FileNotFoundError:
        print("❌ youtube_duplicates.json not found. Please run the duplicate finder first.")
        return
    
    videos = data['all_videos']
    print(f"📊 Analyzing {len(videos)} videos for similar titles...")
    print("=" * 80)
    
    similar_groups = []
    processed_videos = set()
    
    for i, video1 in enumerate(videos):
        if video1['id'] in processed_videos:
            continue
            
        # Find all videos similar to this one
        similar_group = [video1]
        processed_videos.add(video1['id'])
        
        for j, video2 in enumerate(videos[i+1:], i+1):
            if video2['id'] in processed_videos:
                continue
                
            # Check if titles have similar length (within 2 words)
            words1 = len(clean_and_tokenize(video1['title']))
            words2 = len(clean_and_tokenize(video2['title']))
            
            if abs(words1 - words2) <= 1:  # Similar length
                common_words = count_common_words(video1['title'], video2['title'])
                
                if common_words >= 4:  # More than 4 words in common
                    similar_group.append(video2)
                    processed_videos.add(video2['id'])
        
        if len(similar_group) > 1:
            similar_groups.append(similar_group)
    
    # Sort groups by number of videos (largest first)
    similar_groups.sort(key=len, reverse=True)
    
    print(f"🔍 Found {len(similar_groups)} groups with very similar titles")
    print("=" * 80)
    
    total_duplicates = 0
    
    for i, group in enumerate(similar_groups, 1):
        total_duplicates += len(group) - 1
        
        print(f"\n📋 GROUP {i}: {len(group)} videos with similar titles")
        print("-" * 60)
        
        # Show common words analysis
        if len(group) >= 2:
            common_words = count_common_words(group[0]['title'], group[1]['title'])
            print(f"💬 Common words: {common_words}")
        
        for j, video in enumerate(group):
            status_emoji = get_status_emoji(video)
            duration = format_duration(video['duration_seconds'])
            
            print(f"   {j+1}. {status_emoji} {video['title']}")
            print(f"      ⏱️  {duration} | 📅 {video['published_at'][:10]}")
            print(f"      🔗 {video['url']}")
        
        # Analysis of differences
        if len(group) >= 2:
            print(f"   📝 Title Analysis:")
            for j, video in enumerate(group):
                words = clean_and_tokenize(video['title'])
                print(f"      {j+1}. Words: {len(words)} | Key terms: {', '.join(words[:8])}")
    
    print(f"\n" + "=" * 80)
    print(f"📊 SUMMARY:")
    print(f"   Groups found: {len(similar_groups)}")
    print(f"   Total duplicate videos: {total_duplicates}")
    print(f"   Criteria: >4 common words + similar length")
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

def create_deletion_list():
    """Create a list of videos that could be safely deleted."""
    
    try:
        with open('youtube_duplicates.json', 'r') as f:
            data = json.load(f)
    except FileNotFoundError:
        print("❌ youtube_duplicates.json not found.")
        return
    
    videos = data['all_videos']
    deletion_candidates = []
    
    # Look for clear patterns that indicate duplicates
    for video in videos:
        title = video['title'].lower()
        
        # Videos with processing indicators
        if any(indicator in title for indicator in [
            'audio enhanced', 'silence removed', 'silence cut', 
            'processed', 'original_', 'temp', 'test'
        ]):
            deletion_candidates.append({
                'video': video,
                'reason': 'Processing indicator in title',
                'confidence': 'high'
            })
    
    print(f"\n🗑️  DELETION CANDIDATES ({len(deletion_candidates)} videos):")
    print("-" * 60)
    
    for candidate in deletion_candidates[:20]:  # Show first 20
        video = candidate['video']
        status_emoji = get_status_emoji(video)
        print(f"   {status_emoji} {video['title']}")
        print(f"      📅 {video['published_at'][:10]} | Reason: {candidate['reason']}")
        print(f"      🔗 {video['url']}")
    
    if len(deletion_candidates) > 20:
        print(f"   ... and {len(deletion_candidates) - 20} more")

if __name__ == "__main__":
    print("🎬 YouTube Similar Title Analyzer")
    print("Finding videos with >4 common words and similar length")
    print("=" * 60)
    
    analyze_similar_titles()
    create_deletion_list() 