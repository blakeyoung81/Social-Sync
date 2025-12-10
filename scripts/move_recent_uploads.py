#!/usr/bin/env python3
"""
Move Recently Uploaded Videos to Archive
Based on your recent upload logs, move any videos that were successfully uploaded
to prevent accidental re-processing.
"""

import os
import shutil
import glob
from pathlib import Path
from datetime import datetime

# Configuration
MOVIES_DIR = Path("/Users/blakeyoung/Library/Mobile Documents/com~apple~CloudDocs/Movies")
ARCHIVE_DIR = Path("archive")
TODAY = datetime.now().strftime("%Y-%m-%d")

# Recent successfully uploaded videos from your console logs
RECENT_UPLOADED_VIDEOS = [
    "NF1 Gene High Yield Question of the day RAS pathway",
    "Learning Enzyme Connects with IvyMed's Medical Library", 
    "SVR goes down in pregnancy",
    "Iatrogenic Cushing Syndrome",  # Recent one being processed
    # Add any other recent uploads here
]

def find_video_files(video_title):
    """Find video files matching the title pattern."""
    # Clean the title for filename matching
    clean_title = video_title.replace("?", "").replace(":", "").replace("/", "")
    
    # Try different file extensions and patterns
    patterns = [
        f"{clean_title}.mp4",
        f"{clean_title}.mov", 
        f"{clean_title}.avi",
        f"*{clean_title[:20]}*.mp4",  # Partial match
        f"*{clean_title.split()[0]}*{clean_title.split()[-1]}*.mp4"  # First and last word
    ]
    
    found_files = []
    for pattern in patterns:
        matches = list(MOVIES_DIR.glob(pattern))
        found_files.extend(matches)
    
    # Remove duplicates
    return list(set(found_files))

def main():
    print("🔍 Searching for recently uploaded videos in Movies folder...")
    print(f"📁 Source: {MOVIES_DIR}")
    print(f"📁 Archive: {ARCHIVE_DIR}/{TODAY}")
    print()
    
    # Create archive directory
    archive_target = ARCHIVE_DIR / TODAY
    archive_target.mkdir(parents=True, exist_ok=True)
    
    moved_count = 0
    not_found_count = 0
    
    for video_title in RECENT_UPLOADED_VIDEOS:
        print(f"🔍 Looking for: {video_title}")
        
        # Find matching files
        matching_files = find_video_files(video_title)
        
        if matching_files:
            for video_file in matching_files:
                try:
                    # Move to archive with timestamp
                    archive_dest = archive_target / f"recent_upload_{video_file.name}"
                    shutil.move(str(video_file), str(archive_dest))
                    print(f"  ✅ Moved: {video_file.name} → {archive_dest}")
                    moved_count += 1
                except Exception as e:
                    print(f"  ❌ Error moving {video_file.name}: {e}")
        else:
            print(f"  ⚠️ Not found (already moved or different filename)")
            not_found_count += 1
        
        print()
    
    # Summary
    print("📊 SUMMARY:")
    print(f"  ✅ Successfully moved: {moved_count} files")
    print(f"  ⚠️ Not found: {not_found_count} videos")
    print()
    
    if moved_count > 0:
        print(f"📂 Archived files are in: {archive_target}")
        print("✅ Your Movies folder is now clean of recently uploaded videos!")
    else:
        print("🎯 No recent uploads found in Movies folder (good - already moved!)")

if __name__ == "__main__":
    main() 