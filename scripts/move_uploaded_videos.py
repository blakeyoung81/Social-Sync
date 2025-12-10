#!/usr/bin/env python3
"""
Move Successfully Uploaded Videos to Archive
Moves videos that were successfully uploaded to YouTube to prevent accidental re-processing.
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

# Successfully uploaded videos from console logs
UPLOADED_VIDEOS = [
    "Cushing And Cortisol",
    "High Yield Reflexes you need to know for step 1", 
    "Is my baby normal? 18 months expected speech",
    "Atrial Septal Defect - what causes the fixed wide split?",
    "Nitroprusside Hard Step 1 Question",
    "How do you treat Generalized Anxiety Disorder? SSRIs?"
]

# YouTube video IDs for verification
VIDEO_IDS = {
    "Cushing And Cortisol": "wmLm83Tc3r0",
    "High Yield Reflexes you need to know for step 1": "1cuKzsAeruU",
    "Is my baby normal? 18 months expected speech": "YUG9s26nfAM",
    "Atrial Septal Defect - what causes the fixed wide split?": "UYRAofXOs5k",
    "Nitroprusside Hard Step 1 Question": "t882Ti71TJI",
    "How do you treat Generalized Anxiety Disorder? SSRIs?": "Gtm6Q5fhH3Y"
}

def find_video_files(title):
    """Find video files matching the title with various extensions."""
    extensions = ['*.mp4', '*.mov', '*.avi', '*.mkv', '*.webm']
    found_files = []
    
    for ext in extensions:
        # Try exact match first
        pattern = MOVIES_DIR / f"{title}{ext}"
        matches = glob.glob(str(pattern))
        found_files.extend(matches)
        
        # Try pattern with spaces replaced by dots/underscores
        title_variations = [
            title.replace(" ", "."),
            title.replace(" ", "_"),
            title.replace("?", ""),
            title.replace(":", ""),
        ]
        
        for variation in title_variations:
            pattern = MOVIES_DIR / f"{variation}{ext}"
            matches = glob.glob(str(pattern))
            found_files.extend(matches)
    
    # Remove duplicates
    return list(set(found_files))

def move_video_safely(video_path, title, video_id):
    """Move a video file to archive with safety checks."""
    try:
        video_file = Path(video_path)
        if not video_file.exists():
            print(f"❌ File not found: {video_path}")
            return False
            
        # Create archive directory structure
        archive_subdir = ARCHIVE_DIR / TODAY
        archive_subdir.mkdir(parents=True, exist_ok=True)
        
        # Create destination path
        dest_path = archive_subdir / video_file.name
        
        # Add video ID to filename for easy identification
        name_parts = video_file.stem, video_id, video_file.suffix
        dest_with_id = archive_subdir / f"{name_parts[0]}_[{name_parts[1]}]{name_parts[2]}"
        
        print(f"📦 Moving: {video_file.name}")
        print(f"    From: {video_file}")
        print(f"    To: {dest_with_id}")
        
        # Move the file
        shutil.move(str(video_file), str(dest_with_id))
        
        print(f"✅ Successfully moved: {video_file.name}")
        print(f"🔗 YouTube URL: https://www.youtube.com/watch?v={video_id}")
        print()
        
        return True
        
    except Exception as e:
        print(f"❌ Error moving {video_path}: {e}")
        return False

def main():
    """Main function to move all uploaded videos."""
    print("🎬 Moving Successfully Uploaded Videos to Archive")
    print("=" * 60)
    print(f"📁 Source: {MOVIES_DIR}")
    print(f"📁 Archive: {ARCHIVE_DIR / TODAY}")
    print()
    
    if not MOVIES_DIR.exists():
        print(f"❌ Movies directory not found: {MOVIES_DIR}")
        return
        
    moved_count = 0
    not_found_count = 0
    
    for title in UPLOADED_VIDEOS:
        video_id = VIDEO_IDS.get(title, "unknown")
        print(f"🔍 Searching for: {title}")
        
        # Find matching files
        video_files = find_video_files(title)
        
        if not video_files:
            print(f"⚠️  No files found matching: {title}")
            not_found_count += 1
            print()
            continue
            
        # Move each found file
        for video_file in video_files:
            if move_video_safely(video_file, title, video_id):
                moved_count += 1
                
    print("=" * 60)
    print(f"📊 SUMMARY:")
    print(f"✅ Videos moved: {moved_count}")
    print(f"⚠️  Videos not found: {not_found_count}")
    print(f"📁 Archive location: {ARCHIVE_DIR / TODAY}")
    
    if moved_count > 0:
        print()
        print("🎯 SUCCESS! Your uploaded videos have been safely archived.")
        print("🚀 You can now run batch processing without accidentally re-uploading these videos!")
        print()
        print("💡 The videos are still accessible in the archive folder if needed.")

if __name__ == "__main__":
    main() 