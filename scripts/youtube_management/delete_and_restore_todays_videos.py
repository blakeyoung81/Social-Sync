#!/usr/bin/env python3
"""
Delete Today's YouTube Videos and Restore Originals
Deletes videos uploaded today (May 31, 2025) with incorrect caption timing
and restores the original videos for reprocessing with fixed timing.
"""

import os
import sys
import shutil
from pathlib import Path
import google_auth_oauthlib.flow
import googleapiclient.discovery
from google.oauth2.credentials import Credentials
from google.auth.transport.requests import Request

# Add path for project
sys.path.append(str(Path(__file__).resolve().parent))

# Today's video IDs to delete (uploaded with incorrect caption timing)
TODAYS_VIDEO_IDS = [
    "VlVL5LIh8M0",  # Type 2 vs Type 3 hypersensitivity reaction
    "4rKhl1NjmgY",  # What to do when the cancer cell explodes?
    "dXkRcTXjKFE",  # NF1 Gene Mutation Question of the day Step 1 NF1
    "yPW1E6zmrgk",  # NF1 Gene High Yield Question of the day RAS pathway
    "5rA29nQ3k2w",  # Mycobacterium avium complex step 1 question of the day
    "owf_NHcJd2Y",  # Il-2 High Yield Mechanism How it works
    "vrlzcB_h8aU",  # HY biochemistry step 1 question of the day #345
    "X0pKut5eWJI",  # How Cortisol can save a baby's life
    "EgCC_O9TSOY",  # HIV Therapy HY Step 1 Question of the day Efavirenz
    "HJtzLRGZzRU",  # Glutamate excitotoxicity
    "91MqmmXknu4",  # Can you identify this cancer
    "ew86yr9KkFQ",  # Cafe-au-lait spots NF1
    "10ln07sAkbo",  # Swimming in warm lakes can kill you... how?
    "d_hjm-sYUnY"   # Bladder is vulnerable to invasion in anterior placenta percreta
]

# Paths
UPLOADS_FOLDER = Path("/Users/blakeyoung/Library/Mobile Documents/com~apple~CloudDocs/Coding1/Python/Youtube Uploader/data/uploads/2025-05-31")
RESTORE_FOLDER = Path("/Users/blakeyoung/Library/Mobile Documents/com~apple~CloudDocs/Movies")

SCOPES = ["https://www.googleapis.com/auth/youtube.force-ssl"]
CREDENTIALS_FILE = Path(__file__).parent / "client_secrets.json"
TOKEN_FILE = Path(__file__).parent / "token.json"

def authenticate_youtube():
    """Authenticate with YouTube API."""
    creds = None
    
    if TOKEN_FILE.exists():
        try:
            creds = Credentials.from_authorized_user_file(str(TOKEN_FILE), SCOPES)
        except Exception as e:
            print(f"Error loading credentials: {e}")
    
    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            try:
                creds.refresh(Request())
            except Exception as e:
                print(f"Error refreshing credentials: {e}")
                creds = None
        
        if not creds:
            flow = google_auth_oauthlib.flow.InstalledAppFlow.from_client_secrets_file(
                str(CREDENTIALS_FILE), SCOPES)
            creds = flow.run_local_server(port=0)
            
            with open(TOKEN_FILE, 'w') as token:
                token.write(creds.to_json())
    
    return googleapiclient.discovery.build('youtube', 'v3', credentials=creds)

def delete_video(youtube, video_id):
    """Delete a single video by ID."""
    try:
        # First, get video details to show what we're deleting
        response = youtube.videos().list(
            part="snippet",
            id=video_id
        ).execute()
        
        if not response['items']:
            print(f"❌ Video {video_id} not found (may already be deleted)")
            return False
            
        video_title = response['items'][0]['snippet']['title']
        print(f"🗑️  Deleting: {video_title} (ID: {video_id})")
        
        # Delete the video
        youtube.videos().delete(id=video_id).execute()
        print(f"✅ Successfully deleted: {video_title}")
        return True
        
    except Exception as e:
        print(f"❌ Error deleting video {video_id}: {e}")
        return False

def restore_original_videos():
    """Restore original videos from uploads folder to main folder for reprocessing."""
    print("\n📁 RESTORING ORIGINAL VIDEOS")
    print("=" * 50)
    
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
    
    print(f"\n📊 RESTORATION SUMMARY:")
    print(f"✅ Successfully restored: {restored_count} videos")
    print(f"❌ Failed to restore: {failed_count} videos")
    print(f"📁 Videos restored to: {RESTORE_FOLDER}")
    
    return restored_count > 0

def main():
    """Main deletion and restoration function."""
    print("🚨 DELETE TODAY'S UPLOADS & RESTORE ORIGINALS")
    print("=" * 60)
    print("This script will:")
    print("1. Delete 14 videos uploaded today with incorrect caption timing")
    print("2. Restore original videos to /Movies/ for reprocessing")
    print()
    print("🎯 Reason: Caption timing was WAY off - now fixed!")
    print("🔧 Fixed: Preserved exact Whisper timing, no GPT alterations")
    print()
    
    # Show video IDs to delete
    print(f"📺 Video IDs to delete ({len(TODAYS_VIDEO_IDS)} videos):")
    for i, video_id in enumerate(TODAYS_VIDEO_IDS, 1):
        print(f"  {i:2d}. {video_id}")
    print()
    
    # Safety confirmation
    confirm = input("⚠️  Confirm deletion and restoration? (type 'YES' to proceed): ")
    if confirm != "YES":
        print("❌ Operation cancelled.")
        return
    
    # Step 1: Delete YouTube videos
    print("\n🔑 Authenticating with YouTube...")
    try:
        youtube = authenticate_youtube()
        print("✅ Authentication successful!")
    except Exception as e:
        print(f"❌ Authentication failed: {e}")
        return
    
    print(f"\n🗑️  Starting deletion of {len(TODAYS_VIDEO_IDS)} videos...")
    
    deleted_count = 0
    failed_count = 0
    
    for i, video_id in enumerate(TODAYS_VIDEO_IDS, 1):
        print(f"\n[{i}/{len(TODAYS_VIDEO_IDS)}]", end=" ")
        if delete_video(youtube, video_id):
            deleted_count += 1
        else:
            failed_count += 1
    
    print("\n" + "=" * 50)
    print("🎯 DELETION SUMMARY:")
    print(f"✅ Successfully deleted: {deleted_count} videos")
    print(f"❌ Failed to delete: {failed_count} videos")
    
    # Step 2: Restore original videos
    if restore_original_videos():
        print("\n🚀 READY FOR REPROCESSING!")
        print("=" * 50)
        print("✅ Original videos have been restored")
        print("🎬 You can now reprocess them with PERFECT caption timing!")
        print("🎯 The caption timing fix ensures subtitles match speech exactly")
        print()
        print("💡 Next steps:")
        print("1. Run batch upload with the same videos")
        print("2. Captions will now be perfectly synchronized!")
        print("3. No more timing issues! 🎉")
    else:
        print("\n❌ Video restoration failed!")
        print("Please check the uploads folder and restore manually.")

if __name__ == "__main__":
    main() 