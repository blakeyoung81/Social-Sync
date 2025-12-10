#!/usr/bin/env python3
"""
Restore Today's Original Videos for Reprocessing
Restores the original videos from today's uploads to the main Movies folder
so they can be reprocessed with the fixed caption timing.
"""

import shutil
from pathlib import Path

# Paths
UPLOADS_FOLDER = Path("/Users/blakeyoung/Library/Mobile Documents/com~apple~CloudDocs/Coding1/Python/Youtube Uploader/data/uploads/2025-05-31")
RESTORE_FOLDER = Path("/Users/blakeyoung/Library/Mobile Documents/com~apple~CloudDocs/Movies")

def restore_original_videos():
    """Restore original videos from uploads folder to main folder for reprocessing."""
    print("📁 RESTORING ORIGINAL VIDEOS FOR REPROCESSING")
    print("=" * 60)
    print("🎯 Purpose: Restore videos for reprocessing with FIXED caption timing")
    print("🔧 Fix Applied: Preserves exact Whisper timing, no GPT alterations")
    print()
    
    if not UPLOADS_FOLDER.exists():
        print(f"❌ Uploads folder not found: {UPLOADS_FOLDER}")
        return False
    
    if not RESTORE_FOLDER.exists():
        print(f"❌ Restore folder not found: {RESTORE_FOLDER}")
        return False
    
    # Find all original_ files in the uploads folder
    original_files = list(UPLOADS_FOLDER.glob("original_*.mp4"))
    
    if not original_files:
        print(f"❌ No original files found in {UPLOADS_FOLDER}")
        return False
    
    print(f"📂 Found {len(original_files)} original videos to restore")
    print()
    
    restored_count = 0
    failed_count = 0
    
    for original_file in original_files:
        try:
            # Extract the actual filename (remove "original_" prefix)
            restored_name = original_file.name.replace("original_", "")
            restore_path = RESTORE_FOLDER / restored_name
            
            print(f"📋 Restoring: {restored_name}")
            
            # Copy (don't move) the file to preserve backup
            shutil.copy2(str(original_file), str(restore_path))
            
            print(f"✅ Restored: {restored_name}")
            restored_count += 1
            
        except Exception as e:
            print(f"❌ Failed to restore {original_file.name}: {e}")
            failed_count += 1
    
    print()
    print("=" * 60)
    print("📊 RESTORATION SUMMARY:")
    print(f"✅ Successfully restored: {restored_count} videos")
    print(f"❌ Failed to restore: {failed_count} videos")
    print(f"📁 Videos restored to: {RESTORE_FOLDER}")
    
    if restored_count > 0:
        print()
        print("🚀 READY FOR REPROCESSING!")
        print("=" * 60)
        print("✅ Original videos have been restored")
        print("🎬 You can now reprocess them with PERFECT caption timing!")
        print("🎯 The caption timing fix ensures subtitles match speech exactly")
        print()
        print("💡 Next steps:")
        print("1. Run batch upload with the same videos in the web interface")
        print("2. Captions will now be perfectly synchronized!")
        print("3. No more timing issues! 🎉")
        print()
        print("⚠️  Don't forget to delete the incorrectly uploaded videos from YouTube")
        print("    You can use: python3 delete_and_restore_todays_videos.py")
    
    return restored_count > 0

if __name__ == "__main__":
    restore_original_videos() 