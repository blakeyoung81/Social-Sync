#!/usr/bin/env python3
"""
Delete Today's YouTube Videos - Videos uploaded without silence cutting
Only deletes the 14 videos from May 30-31 batches that need to be re-processed.
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

# Today's video IDs to delete (uploaded without silence cutting)
VIDEO_IDS_TO_DELETE = [
    "IaR38Wb55C0",  # May 30 batch
    "-2wKZQubxsw",
    "SiiI3J6LPtc", 
    "6w2lwPL3z3A",
    "B4oxIg8UM14",
    "_5TRJLLIi4E",
    "TQDNXADG334",
    "ZZeVuRZdYHY",
    "cUks7qc0WAU",
    "y99uw3j7EnU",
    "-wB0aIplH-c",
    "R8iYGpSOxuI",
    "EYSPbLOeGag",
    "qI-IRu0nOug"   # May 31 batch
]

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

def main():
    """Main deletion function."""
    print("🚨 YouTube Video Deletion Script")
    print("=" * 50)
    print(f"About to delete {len(VIDEO_IDS_TO_DELETE)} videos from today's batches")
    print("These videos were uploaded without proper silence cutting and need to be re-processed.")
    print()
    
    # Safety confirmation
    print("Video IDs to delete:")
    for i, video_id in enumerate(VIDEO_IDS_TO_DELETE, 1):
        print(f"  {i:2d}. {video_id}")
    print()
    
    confirm = input("⚠️  Are you sure you want to delete these 14 videos? (type 'DELETE' to confirm): ")
    if confirm != "DELETE":
        print("❌ Deletion cancelled.")
        return
    
    print("\n🔑 Authenticating with YouTube...")
    try:
        youtube = authenticate_youtube()
        print("✅ Authentication successful!")
    except Exception as e:
        print(f"❌ Authentication failed: {e}")
        return
    
    print(f"\n🗑️  Starting deletion of {len(VIDEO_IDS_TO_DELETE)} videos...")
    
    deleted_count = 0
    failed_count = 0
    
    for i, video_id in enumerate(VIDEO_IDS_TO_DELETE, 1):
        print(f"\n[{i}/{len(VIDEO_IDS_TO_DELETE)}]", end=" ")
        if delete_video(youtube, video_id):
            deleted_count += 1
        else:
            failed_count += 1
    
    print("\n" + "=" * 50)
    print("🎯 DELETION SUMMARY:")
    print(f"✅ Successfully deleted: {deleted_count} videos")
    print(f"❌ Failed to delete: {failed_count} videos")
    print(f"📊 Total processed: {len(VIDEO_IDS_TO_DELETE)} videos")
    
    if deleted_count > 0:
        print(f"\n🔄 Next step: Re-process the {deleted_count} videos with fixed silence cutting!")
        print("   📁 Videos are ready in: /Users/blakeyoung/Library/Mobile Documents/com~apple~CloudDocs/Movies/REPROCESS_BATCH/")

if __name__ == "__main__":
    main() 