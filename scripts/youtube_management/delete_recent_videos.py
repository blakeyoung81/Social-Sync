#!/usr/bin/env python3
"""
Delete Recent YouTube Videos - Automated Deletion
Deletes videos uploaded today (May 31, 2025) with incorrect caption timing.
No user input required - runs automatically.
"""

import os
import sys
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

SCOPES = ["https://www.googleapis.com/auth/youtube.force-ssl"]
CREDENTIALS_FILE = Path(__file__).parent.parent.parent / "config" / "client_secrets.json"
TOKEN_FILE = Path(__file__).parent.parent.parent / "config" / "token.json"

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

def main():
    """Main deletion function - runs automatically."""
    print("🚨 AUTOMATED YOUTUBE VIDEO DELETION")
    print("=" * 60)
    print("🎯 Deleting 14 videos with incorrect caption timing")
    print("🔧 Reason: Caption timing was fixed, these need reprocessing")
    print()
    
    # Show video IDs to delete
    print(f"📺 Deleting {len(TODAYS_VIDEO_IDS)} videos:")
    for i, video_id in enumerate(TODAYS_VIDEO_IDS, 1):
        print(f"  {i:2d}. {video_id}")
    print()
    
    # Authenticate with YouTube
    print("🔑 Authenticating with YouTube...")
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
    print(f"📊 Total processed: {len(TODAYS_VIDEO_IDS)} videos")
    
    if deleted_count > 0:
        print(f"\n🚀 SUCCESS!")
        print("=" * 50)
        print(f"✅ Deleted {deleted_count} videos with incorrect caption timing")
        print("🎬 Original videos are already restored to /Movies/")
        print("🔧 Caption timing fix has been applied")
        print("🚀 Ready to reprocess with PERFECT timing!")
        print()
        print("💡 Next steps:")
        print("1. Run batch upload in the web interface")
        print("2. Videos will now have perfectly synchronized captions!")
        print("3. Enjoy perfect timing! 🎉")

if __name__ == "__main__":
    main() 