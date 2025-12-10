#!/usr/bin/env python3
"""
YouTube Uploader - Handles video processing, scheduling, and uploading to YouTube.
Supports day/night mode scheduling, playlist management, automatic video enhancement,
and multi-platform posting to social media via Ayrshare API.
"""
print("--- SCRIPT START ---")

import os
print("--- os imported ---")
import sys
print("--- sys imported ---")
import json
print("--- json imported ---")
import shutil
print("--- shutil imported ---")
import logging
print("--- logging imported ---")
import subprocess
print("--- subprocess imported ---")
import time
print("--- time imported ---")
import re
print("--- re imported ---")
import math
print("--- math imported ---")
from datetime import datetime, timedelta, timezone
print("--- datetime imported ---")
from pathlib import Path
print("--- pathlib imported ---")
import io
print("--- io imported ---")
import random
print("--- random imported ---")
from typing import List, Dict, Optional, Tuple, Union, Any
print("--- typing imported ---")

import requests
print("--- requests imported ---")
from PIL import Image
print("--- PIL imported ---")
import google_auth_oauthlib.flow
print("--- google_auth_oauthlib imported ---")
import googleapiclient.discovery
print("--- googleapiclient.discovery imported ---")
import googleapiclient.errors
print("--- googleapiclient.errors imported ---")
from googleapiclient.http import MediaFileUpload
print("--- googleapiclient.http imported ---")
from google.oauth2.credentials import Credentials
print("--- google.oauth2.credentials imported ---")
from google.auth.transport.requests import Request
print("--- google.auth.transport.requests imported ---")
from googleapiclient.errors import HttpError
print("--- googleapiclient.errors.HttpError imported ---")
import openai
print("--- openai imported ---")
import whisper
print("--- whisper imported ---")
import argparse
print("--- argparse imported ---")
import tempfile
print("--- tempfile imported ---")

# Add path for custom modules
sys.path.append(str(Path(__file__).resolve().parent.parent))
print("--- sys.path appended ---")
from core.ayrshare_client import AyrshareClient, create_social_media_content, test_ayrshare_connection
print("--- ayrshare_client imported ---")
# Feature flag for optimized pipeline
USE_OPTIMIZED_PIPELINE = os.getenv('USE_OPTIMIZED_PIPELINE', 'true').lower() == 'true'

if USE_OPTIMIZED_PIPELINE:
    from core.video_processing_optimized import process_video
    print("🚀 Using OPTIMIZED single-pass rendering pipeline")
else:
    from core.video_processing import process_video
    print("⚠️ Using LEGACY multi-pass rendering pipeline")
print("--- video_processing imported ---")
from core.config import (
    LOG_LEVEL, LOG_FORMAT,
    BASE_DIR, DATA_DIR, ASSETS_DIR, BASE_INPUT_DIR, BASE_OUTPUT_DIR
)
# from core.youtube_api import get_authenticated_service, get_playlists, get_channel_id_from_username, refresh_youtube_token, get_all_user_channels, get_active_account, set_active_account, get_cached_channel_id, sync_google_token
# from core.gpt_utils import get_video_details_from_gpt
# from core.instagram_api import InstagramUploader
# from core.tiktok_api import TikTokUploader
from core.logging_config import setup_colored_logging

# Setup basic logging
# logging.basicConfig(level=LOG_LEVEL, format=LOG_FORMAT)
setup_colored_logging()

logger = logging.getLogger(__name__)

def send_progress(step: str, progress: int, total: int, message: str = ""):
    """Send progress update to the frontend via structured stdout message."""
    progress_data = {
        "step": step,
        "progress": progress,
        "total": total,
        "percentage": round((progress / total) * 100) if total > 0 else 0,
        "message": message
    }
    print(f"PROGRESS:{json.dumps(progress_data)}", flush=True)

# Constants and Directory Setup
BASE_DIR = Path(__file__).resolve().parent.parent.parent
DATA_DIR = BASE_DIR / "data"
ASSETS_DIR = DATA_DIR / "assets"
INPUT_VIDEOS_DIR = DATA_DIR / "input_videos"
OUTPUT_VIDEOS_DIR = DATA_DIR / "output_videos"
DEFAULT_DRY_RUN_DIR = Path("/Users/blakeyoung/Library/Mobile Documents/com~apple~CloudDocs/Movies/DryRunOutput")
PRODUCED_THUMBNAILS_DIR = ASSETS_DIR / "Produced Thumbnails"
BEST_THUMBNAILS_DIR = ASSETS_DIR / "Best Thumbnails"
OUTRO_DIR = ASSETS_DIR / "Outro"
TEMP_IMAGES_DIR = ASSETS_DIR / "Temporary Images"
DEFAULT_INPUT_DIR = Path("/Users/blakeyoung/Library/Mobile Documents/com~apple~CloudDocs/Movies")

# Credentials and cache files
CREDENTIALS_FILE = BASE_DIR / "config" / "client_secrets.json"
TOKEN_FILE = BASE_DIR / "config" / "token.json"
PLAYLISTS_CACHE_FILE = BASE_DIR / "cache" / "playlists_cache.json"
PLAYLISTS_CACHE_MAX_AGE = 24 * 60 * 60  # 24 hours in seconds

# Create directories if they don't exist
for directory in [
    DATA_DIR, ASSETS_DIR, INPUT_VIDEOS_DIR, OUTPUT_VIDEOS_DIR,
    PRODUCED_THUMBNAILS_DIR, BEST_THUMBNAILS_DIR, OUTRO_DIR,
    OUTRO_DIR / "1080x1920", OUTRO_DIR / "1920x1080",
    TEMP_IMAGES_DIR, DEFAULT_DRY_RUN_DIR
]:
    directory.mkdir(parents=True, exist_ok=True)

# YouTube API Scopes
SCOPES = [
    "https://www.googleapis.com/auth/youtube.upload",
    "https://www.googleapis.com/auth/youtube",
    "https://www.googleapis.com/auth/youtube.force-ssl"
]

class YouTubeUploader:
    """Class to handle YouTube video uploading and processing."""

    def __init__(self, openai_api_key: Optional[str] = None, ayrshare_api_key: Optional[str] = None, pexels_api_key: Optional[str] = None):
        """Initialize the uploader with optional OpenAI, Ayrshare, and Pexels API keys."""
        self.youtube = None
        self.openai_client = None
        self.ayrshare_client = None
        self.pexels_api_key = pexels_api_key
        self.playlists = {}
        
        if openai_api_key:
            self.openai_client = openai.OpenAI(api_key=openai_api_key)
            
        if ayrshare_api_key:
            self.ayrshare_client = AyrshareClient(ayrshare_api_key)
            logger.info("Ayrshare client initialized for multi-platform posting")
            
        self._authenticate()
        self._load_playlists()
    
    def _get_current_channel_id(self) -> Optional[str]:
        """Get the current channel ID from active account file or YouTube API."""
        try:
            # First try to get from active account file
            active_account_file = BASE_DIR / "config" / "active_youtube_account.json"
            if active_account_file.exists():
                active_account = json.loads(active_account_file.read_text())
                return active_account.get('channelId')
            
            # Fallback: get from YouTube API
            if self.youtube:
                request = self.youtube.channels().list(part="id", mine=True, maxResults=1)
                response = request.execute()
                items = response.get('items', [])
                if items:
                    return items[0]['id']
        except Exception as e:
            logger.warning(f"Could not determine current channel ID: {e}")
        
        return None

    def ensure_authentication(self) -> bool:
        """Ensure valid authentication, refresh if needed."""
        try:
            if not self.youtube:
                logger.warning("YouTube service not initialized - attempting authentication...")
                self._authenticate()
                return self.youtube is not None
            
            # Test the current authentication by making a simple API call
            try:
                # Simple test to verify authentication is working
                request = self.youtube.channels().list(part="id", mine=True, maxResults=1)
                response = request.execute()
                logger.info("✅ YouTube authentication verified successfully")
                return True
            except Exception as auth_error:
                logger.warning(f"Authentication test failed: {auth_error}")
                # Try to re-authenticate
                logger.info("🔄 Attempting to re-authenticate...")
                self._authenticate()
                return self.youtube is not None
                
        except Exception as e:
            logger.error(f"Error ensuring authentication: {e}")
            return False

    def get_youtube_service(self):
        """Get the YouTube API service object"""
        if not self.youtube:
            self.ensure_authentication()
        return self.youtube
    
    def clear_cache(self):
        """Clear cached channel data to force fresh scan"""
        logging.info("🗑️ Clearing cached channel data...")
        
        # Clear the main cache file if it exists
        if hasattr(self, 'cache_file') and os.path.exists(self.cache_file):
            try:
                os.remove(self.cache_file)
                logging.info("✅ Main cache file cleared successfully")
            except Exception as e:
                logging.warning(f"⚠️ Could not clear main cache file: {e}")
        
        # Also clear channel-specific cache files
        cache_dir = BASE_DIR / "cache" / "youtube"
        if cache_dir.exists():
            try:
                for cache_file in cache_dir.glob("channel_*.json"):
                    cache_file.unlink()
                    logging.info(f"✅ Cleared channel cache: {cache_file.name}")
            except Exception as e:
                logging.warning(f"⚠️ Could not clear channel-specific cache: {e}")
        
        logging.info("🔄 Cache cleared - next scan will fetch fresh data from YouTube API")

    def _authenticate(self) -> None:
        """Authenticate with YouTube API."""
        creds = None
        
        # Check for active account info from web interface first
        active_account_file = BASE_DIR / "config" / "active_youtube_account.json"
        if active_account_file.exists():
            try:
                active_account = json.loads(active_account_file.read_text())
                logger.info(f"Found active account: {active_account.get('accountEmail')} for channel: {active_account.get('channelId')}")
            except Exception as e:
                logger.warning(f"Could not read active account info: {e}")
        
        if TOKEN_FILE.exists():
            try:
                # Try to load the token - convert web interface format if needed
                with open(TOKEN_FILE, 'r') as f:
                    token_data = json.load(f)
                
                # Check if token has the required fields for Python compatibility
                required_fields = ['access_token', 'client_id', 'client_secret', 'type']
                missing_fields = [field for field in required_fields if field not in token_data or not token_data[field]]
                
                if missing_fields:
                    logger.info(f"🔄 Token is missing required fields: {missing_fields}")
                    
                    # Legacy format conversion for backwards compatibility
                    if 'token' in token_data and 'access_token' not in token_data:
                        logger.info("🔄 Converting legacy web interface token format...")
                        token_data['access_token'] = token_data.pop('token')
                    
                    if 'type' not in token_data:
                        token_data['type'] = 'authorized_user'
                    
                    # Add client credentials if missing
                    if 'client_id' not in token_data or 'client_secret' not in token_data:
                        creds_file = BASE_DIR / "config" / "credentials.json"
                        if creds_file.exists():
                            with open(creds_file, 'r') as f:
                                creds_data = json.load(f)
                                if 'installed' in creds_data:
                                    token_data['client_id'] = creds_data['installed']['client_id']
                                    token_data['client_secret'] = creds_data['installed']['client_secret']
                                    logger.info("✅ Added client_id and client_secret from credentials file")
                    
                    # Convert expiry format if needed
                    if 'expiry' in token_data and 'expiry_date' not in token_data:
                        from datetime import datetime
                        expiry_dt = datetime.fromisoformat(token_data['expiry'].replace('Z', '+00:00'))
                        token_data['expiry_date'] = int(expiry_dt.timestamp() * 1000)
                        del token_data['expiry']
                    
                    # Save the converted format
                    with open(TOKEN_FILE, 'w') as f:
                        json.dump(token_data, f, indent=2)
                    logger.info("✅ Token format updated and saved")
                
                creds = Credentials.from_authorized_user_file(str(TOKEN_FILE), SCOPES)
                logger.info("✅ Successfully loaded credentials from token file")
            except Exception as e:
                logger.error(f"❌ Error loading credentials from token file: {e}")
                # Don't delete the token file - just continue with fresh auth
                logger.info("🔄 Will attempt fresh authentication")
        
        if not creds or not creds.valid:
            if creds and creds.expired and creds.refresh_token:
                try:
                    logger.info("🔄 Attempting to refresh expired YouTube credentials...")
                    creds.refresh(Request())
                    logger.info("✅ Successfully refreshed expired credentials")
                    # Save refreshed credentials
                    with open(TOKEN_FILE, 'w') as token:
                        token.write(creds.to_json())
                    logger.info("💾 Refreshed credentials saved to token file")
                except Exception as e:
                    logger.error(f"❌ Error refreshing credentials: {e}")
                    logger.warning("Will require fresh authentication")
                    creds = None
            
            if not creds:
                try:
                    logger.info("Starting fresh OAuth authentication flow...")
                    flow = google_auth_oauthlib.flow.InstalledAppFlow.from_client_secrets_file(
                        str(CREDENTIALS_FILE), SCOPES)
                    creds = flow.run_local_server(port=0)
                    with open(TOKEN_FILE, 'w') as token:
                        token.write(creds.to_json())
                    logger.info("Fresh authentication completed and saved")
                except Exception as e:
                    logger.error(f"Error during OAuth flow: {e}")
                    return
        
        try:
            self.youtube = googleapiclient.discovery.build('youtube', 'v3', credentials=creds)
            logger.info("Successfully authenticated with YouTube API")
        except Exception as e:
            logger.error(f"Error building YouTube service: {e}")

    def _load_playlists(self) -> None:
        """Load playlists from YouTube channel with per-channel caching."""
        try:
            # Get current channel ID for channel-specific caching
            channel_id = self._get_current_channel_id()
            if not channel_id:
                logger.warning("No channel ID available - using global playlist cache")
                channel_id = "global"
            
            # Use channel-specific cache file
            channel_playlists_cache = BASE_DIR / "cache" / "youtube" / f"{channel_id}_playlists.json"
            
            # Check if cached playlists exist and are recent
            if channel_playlists_cache.exists():
                cache_age = time.time() - channel_playlists_cache.stat().st_mtime
                if cache_age < PLAYLISTS_CACHE_MAX_AGE:
                    with open(channel_playlists_cache, 'r') as f:
                        cached_data = json.load(f)
                        self.playlists = cached_data.get('playlists', {})
                    logger.info(f"Loaded {len(self.playlists)} playlists from channel-specific cache ({channel_id})")
                    return
            
            # Fetch playlists from YouTube API
            if not self.youtube:
                logger.warning("YouTube API not available for playlist loading")
                return
                
            logger.info("Fetching playlists from YouTube...")
            request = self.youtube.playlists().list(
                part="snippet",
                mine=True,
                maxResults=50
            )
            response = request.execute()
            
            self.playlists = {}
            for item in response.get('items', []):
                playlist_id = item['id']
                playlist_title = item['snippet']['title']
                self.playlists[playlist_title.lower()] = {
                    'id': playlist_id,
                    'title': playlist_title
                }
            
                            # Cache the playlists with channel-specific file
                cache_data = {
                    'playlists': self.playlists,
                    'channel_id': channel_id,
                    'timestamp': time.time()
                }
                
                # Ensure cache directory exists
                channel_playlists_cache.parent.mkdir(parents=True, exist_ok=True)
                
                with open(channel_playlists_cache, 'w') as f:
                    json.dump(cache_data, f, indent=2)
                
                logger.info(f"Loaded {len(self.playlists)} playlists from YouTube API and cached for channel {channel_id}")
            
        except Exception as e:
            logger.error(f"Error loading playlists: {e}")
            self.playlists = {}

    def determine_playlists_for_video(self, title: str, description: str, is_short: bool = False) -> List[str]:
        """Use GPT to determine which playlists a video should be added to."""
        if not self.openai_client:
            return []
            
        try:
            # If it's a YouTube Short, always add to "factoids" playlist
            playlist_names = []
            if is_short and 'factoids' in self.playlists:
                playlist_names.append('factoids')
                logger.info("Adding YouTube Short to 'factoids' playlist")
            
            # Use GPT to determine other relevant playlists
            available_playlists = list(self.playlists.keys())
            if not available_playlists:
                return playlist_names
                
            playlist_list = "\n".join([f"- {name}" for name in available_playlists])
            
            prompt = f"""
Given this medical education video:
Title: {title}
Description: {description[:200]}...

Available playlists:
{playlist_list}

Determine which playlist(s) this video belongs to. Consider:
- Medical specialty (cardiology, nephrology, etc.)
- Body system (cardiovascular, renal, respiratory, etc.)
- Subject area (pathology, pharmacology, microbiology, etc.)
- Video type (if it's a short factoid, it goes in "factoids")

Return ONLY the playlist names that match, one per line. Be specific and only choose playlists that clearly relate to the content.
"""

            response = self.openai_client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[{"role": "user", "content": prompt}],
                temperature=0.3
            )
            
            suggested_playlists = response.choices[0].message.content.strip().split('\n')
            
            for suggestion in suggested_playlists:
                suggestion = suggestion.strip().lower().replace('- ', '')
                if suggestion in self.playlists and suggestion not in playlist_names:
                    playlist_names.append(suggestion)
                    
            logger.info(f"GPT suggested playlists: {playlist_names}")
            return playlist_names
            
        except Exception as e:
            logger.error(f"Error determining playlists with GPT: {e}")
            return playlist_names if 'playlist_names' in locals() else []

    def add_video_to_playlists(self, video_id: str, playlist_names: List[str]) -> bool:
        """Add video to specified playlists."""
        if not self.youtube or not playlist_names:
            return True
            
        success_count = 0
        for playlist_name in playlist_names:
            try:
                if playlist_name in self.playlists:
                    playlist_id = self.playlists[playlist_name]['id']
                    
                    request = self.youtube.playlistItems().insert(
                        part="snippet",
                        body={
                            "snippet": {
                                "playlistId": playlist_id,
                                "resourceId": {
                                    "kind": "youtube#video",
                                    "videoId": video_id
                                }
                            }
                        }
                    )
                    request.execute()
                    success_count += 1
                    logger.info(f"Added video to playlist: {self.playlists[playlist_name]['title']}")
                else:
                    logger.warning(f"Playlist not found: {playlist_name}")
                    
            except Exception as e:
                logger.error(f"Error adding video to playlist {playlist_name}: {e}")
                
        return success_count > 0

    def burn_subtitles_ffmpeg(self, video_path: Path, srt_path: Path, output_path: Path, font_size: int = 8) -> bool:
        """Burn subtitles into video using FFmpeg with size 8 font."""
        logger.info(f"[Burn Subs] Starting subtitle burning for: {video_path.name}")
        
        try:
            # Validate inputs
            if not video_path.exists():
                logger.error(f"[Burn Subs] Video file not found: {video_path}")
                return False

            if not srt_path.exists():
                logger.error(f"[Burn Subs] Subtitle file not found: {srt_path}")
                return False
            
            # Validate SRT content
            srt_content = srt_path.read_text(encoding='utf-8')
            if len(srt_content.strip()) < 10:
                logger.error("[Burn Subs] SRT file is empty or too short")
                return False
            
            # Create temporary file with simple path
            temp_dir = Path(tempfile.gettempdir())
            simple_srt_path = temp_dir / f"subtitles_{int(time.time())}.srt"
            
            try:
                # Copy SRT to temp location
                shutil.copy2(str(srt_path), str(simple_srt_path))
                
                # Basic subtitles filter with font size 8
                basic_cmd = [
                    "ffmpeg", "-y", "-v", "info",
                    "-i", str(video_path),
                    "-vf", f"subtitles={str(simple_srt_path.resolve())}:force_style='FontSize={font_size},PrimaryColour=&H00FFFFFF,OutlineColour=&H00000000,Outline=2,Shadow=1'",
                    "-c:a", "copy",
                    "-c:v", "libx264",
                    "-preset", "medium",
                    str(output_path)
                ]
                
                process = subprocess.run(basic_cmd, capture_output=True, text=True, check=False, timeout=300)
                if process.returncode == 0 and output_path.exists():
                    logger.info(f"[Burn Subs] SUCCESS! Font size {font_size}")
                    return True
                else:
                    logger.error(f"[Burn Subs] Failed. Return code: {process.returncode}")
                    return False
                    
            finally:
                # Cleanup temp files
                if simple_srt_path.exists():
                    try:
                        simple_srt_path.unlink()
                    except:
                        pass

        except Exception as e:
            logger.error(f"[Burn Subs] Error: {e}")
            return False

    def burn_advanced_subtitles(self, video_path: Path, srt_path: Path, output_path: Path,
                               caption_style: str = 'social', caption_animation: str = 'slide',
                               caption_background: str = 'bar', caption_position: str = 'bottom',
                               auto_keyword_bold: bool = True, max_words_per_line: int = 4) -> bool:
        """Burn advanced social media style subtitles with AI cleanup and animations."""
        logger.info(f"[Advanced Subs] Creating {caption_style} style captions for: {video_path.name}")
        
        try:
            # Check if this is a vertical video (Short)
            probe_cmd = [
                "ffprobe", "-v", "error", "-select_streams", "v:0",
                "-show_entries", "stream=width,height",
                "-of", "csv=s=x:p=0", str(video_path)
            ]
            probe_result = subprocess.run(probe_cmd, capture_output=True, text=True, check=False)
            if probe_result.returncode != 0:
                logger.warning("Could not probe video dimensions, falling back to basic subtitles")
                return self.burn_subtitles_ffmpeg(video_path, srt_path, output_path, font_size=8)
            
            dimensions = probe_result.stdout.strip()
            if not dimensions or 'x' not in dimensions:
                logger.warning("Could not parse video dimensions, falling back to basic subtitles")
                return self.burn_subtitles_ffmpeg(video_path, srt_path, output_path, font_size=8)
            
            width, height = map(int, dimensions.split('x'))
            is_vertical = width < height
            
            # 🎯 [LANDSCAPE FIX] Apply improved subtitle processing to ALL videos, not just vertical ones
            # For landscape videos, we still want better chunking and timing, just with simpler styling
            
            # Process SRT for better chunking and timing
            enhanced_srt_path = srt_path.parent / f"{srt_path.stem}_enhanced.srt"
            
            # 🎯 [LANDSCAPE FIX] For landscape videos, use smaller max_words_per_line for better readability
            effective_max_words = max_words_per_line if is_vertical else min(max_words_per_line, 2)
            logger.info(f"[Advanced Subs] Using max words per line: {effective_max_words} ({'vertical' if is_vertical else 'landscape'} video)")
            
            if caption_style == 'social' and self.openai_client:
                # AI-enhanced subtitle processing
                if not self._create_social_media_subtitles(srt_path, enhanced_srt_path, auto_keyword_bold, effective_max_words):
                    logger.warning("AI subtitle enhancement failed, using original subtitles")
                    enhanced_srt_path = srt_path
            else:
                # Basic chunking without AI
                if not self._chunk_subtitles_basic(srt_path, enhanced_srt_path, effective_max_words):
                    enhanced_srt_path = srt_path
            
            # For vertical videos, use advanced styling. For landscape, use basic but with improved SRT
            if is_vertical:
                # Create FFmpeg filter for advanced styling (vertical videos only)
                filter_complex = self._create_subtitle_filter(
                    enhanced_srt_path, caption_animation, caption_background, 
                    caption_position, width, height
                )
                
                if not filter_complex:
                    logger.warning("Could not create advanced filter, falling back to basic subtitles")
                    return self.burn_subtitles_ffmpeg(video_path, enhanced_srt_path, output_path, font_size=8)
                
                # Apply advanced subtitles with FFmpeg
                temp_dir = Path(tempfile.gettempdir())
                simple_srt_path = temp_dir / f"advanced_subs_{int(time.time())}.srt"
                
                try:
                    shutil.copy2(str(enhanced_srt_path), str(simple_srt_path))
                    
                    cmd = [
                        "ffmpeg", "-y", "-v", "info",
                        "-i", str(video_path),
                        "-filter_complex", filter_complex,
                        "-map", "[out]",
                        "-c:a", "copy",
                        "-c:v", "libx264",
                        "-preset", "medium",
                        "-crf", "18",
                        str(output_path)
                    ]
                    
                    process = subprocess.run(cmd, capture_output=True, text=True, check=False, timeout=600)
                    if process.returncode == 0 and output_path.exists():
                        logger.info(f"[Advanced Subs] SUCCESS! Applied {caption_style} style with {caption_animation} animation")
                        return True
                    else:
                        logger.error(f"[Advanced Subs] Failed. Return code: {process.returncode}")
                        logger.error(f"Error output: {process.stderr}")
                        # Fallback to basic subtitles
                        return self.burn_subtitles_ffmpeg(video_path, enhanced_srt_path, output_path, font_size=8)
                        
                finally:
                    if simple_srt_path.exists():
                        try:
                            simple_srt_path.unlink()
                        except:
                            pass
            else:
                # 🎯 [LANDSCAPE FIX] For landscape videos, use basic subtitle burning but with improved SRT
                logger.info("[Advanced Subs] Landscape video detected, using basic styling with improved timing")
                success = self.burn_subtitles_ffmpeg(video_path, enhanced_srt_path, output_path, font_size=8)
                
                # Cleanup enhanced SRT if it's different from original
                if enhanced_srt_path != srt_path and enhanced_srt_path.exists():
                    try:
                        enhanced_srt_path.unlink()
                    except:
                        pass
                
                return success
            
        except Exception as e:
            logger.error(f"[Advanced Subs] Error: {e}")
            # Fallback to basic subtitles
            return self.burn_subtitles_ffmpeg(video_path, srt_path, output_path, font_size=8)

    def _create_social_media_subtitles(self, srt_path: Path, output_path: Path, 
                                     auto_keyword_bold: bool, max_words_per_line: int) -> bool:
        """Use AI to clean up and enhance subtitles for social media."""
        try:
            # Read original SRT
            with open(srt_path, 'r', encoding='utf-8') as f:
                srt_content = f.read()
            
            # Parse SRT into segments
            import re
            srt_pattern = r'(\d+)\n(\d{2}:\d{2}:\d{2},\d{3}) --> (\d{2}:\d{2}:\d{2},\d{3})\n(.*?)(?=\n\d+\n|\n*$)'
            matches = re.findall(srt_pattern, srt_content, re.DOTALL)
            
            if not matches:
                logger.error("Could not parse SRT file")
                return False

            # Extract all text for AI processing
            all_text = ' '.join([match[3].replace('\n', ' ').strip() for match in matches])
            
            # Clean up with AI
            logger.info("[AI Subs] Cleaning up transcript with GPT...")
            response = self.openai_client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[{
                    "role": "user",
                    "content": f"""Clean up this video transcript for social media captions:

"{all_text}"

Please:
1. Remove filler words (um, uh, like, you know, etc.)
2. Fix any grammatical errors
3. Make sentences more concise and punchy
4. Keep the medical terminology accurate
5. Make it engaging for social media

Return ONLY the cleaned text, nothing else. Keep it natural but polished."""
                }],
                temperature=0.3
            )
            
            cleaned_text = response.choices[0].message.content.strip()
            logger.info(f"[AI Subs] Cleaned text: {cleaned_text[:100]}...")
            
            # Split into short phrases and reassign timing
            phrases = self._chunk_text_into_phrases(cleaned_text, max_words_per_line)
            
            # Bold keywords if enabled
            if auto_keyword_bold:
                phrases = self._bold_keywords(phrases)
            
            # Redistribute timing evenly across phrases
            new_srt_content = self._redistribute_timing(phrases, matches)
            
            # Write enhanced SRT
            with open(output_path, 'w', encoding='utf-8') as f:
                f.write(new_srt_content)
            
            logger.info(f"[AI Subs] Created enhanced SRT with {len(phrases)} phrases")
            return True
            
        except Exception as e:
            logger.error(f"[AI Subs] Error during AI processing: {e}")
            return False
    
    def _chunk_subtitles_basic(self, srt_path: Path, output_path: Path, max_words_per_line: int) -> bool:
        """Basic subtitle chunking without AI cleanup."""
        try:
            import re
            with open(srt_path, 'r', encoding='utf-8') as f:
                srt_content = f.read()
            
            srt_pattern = r'(\d+)\n(\d{2}:\d{2}:\d{2},\d{3}) --> (\d{2}:\d{2}:\d{2},\d{3})\n(.*?)(?=\n\d+\n|\n*$)'
            matches = re.findall(srt_pattern, srt_content, re.DOTALL)
            
            if not matches:
                return False
                
            all_text = ' '.join([match[3].replace('\n', ' ').strip() for match in matches])
            phrases = self._chunk_text_into_phrases(all_text, max_words_per_line)
            new_srt_content = self._redistribute_timing(phrases, matches)
            
            with open(output_path, 'w', encoding='utf-8') as f:
                f.write(new_srt_content)
            
            return True
            
        except Exception as e:
            logger.error(f"Error in basic chunking: {e}")
            return False

    def _chunk_text_into_phrases(self, text: str, max_words_per_line: int) -> List[str]:
        """Split text into short phrases suitable for social media."""
        words = text.split()
        phrases = []
        current_phrase = []
        
        # 🎯 [LANDSCAPE FIX] For landscape videos, use much shorter phrases (max 2 sentences)
        # This prevents too much text on screen at once for long-form content
        max_words_landscape = min(max_words_per_line, 8)  # Cap at 8 words max for landscape
        
        for word in words:
            current_phrase.append(word)
            
            # Break on natural boundaries or when hitting word limit
            # For landscape videos, prioritize sentence boundaries over word count
            if (word.endswith('.') or word.endswith('!') or word.endswith('?') or
                (len(current_phrase) >= max_words_landscape and 
                 (word.endswith(',') or word.endswith(';')))):
                if current_phrase:
                    phrases.append(' '.join(current_phrase))
                    current_phrase = []
            # Hard limit to prevent overly long phrases
            elif len(current_phrase) >= max_words_landscape * 1.5:
                if current_phrase:
                    phrases.append(' '.join(current_phrase))
                    current_phrase = []
        
        # Add remaining words
        if current_phrase:
            phrases.append(' '.join(current_phrase))
        
        return phrases

    def _bold_keywords(self, phrases: List[str]) -> List[str]:
        """Bold important medical keywords in phrases."""
        # Common medical keywords that should be emphasized
        keywords = {
            'heart', 'cardiac', 'blood', 'pressure', 'diagnosis', 'treatment', 'patient',
            'disease', 'infection', 'bacteria', 'virus', 'symptoms', 'pathology',
            'medicine', 'drug', 'therapy', 'clinical', 'medical', 'health',
            'syndrome', 'disorder', 'condition', 'acute', 'chronic', 'severe'
        }
        
        bolded_phrases = []
        for phrase in phrases:
            words = phrase.split()
            for i, word in enumerate(words):
                clean_word = word.lower().strip('.,!?')
                if clean_word in keywords:
                    words[i] = f"<b>{word}</b>"
            bolded_phrases.append(' '.join(words))
        
        return bolded_phrases

    def _redistribute_timing(self, phrases: List[str], original_matches: List) -> str:
        """Redistribute timing while preserving speech synchronization."""
        if not phrases or not original_matches:
            return ""
        
        # Convert to seconds for easier calculation
        def time_to_seconds(time_str):
            h, m, s = time_str.split(':')
            s, ms = s.split(',')
            return int(h) * 3600 + int(m) * 60 + int(s) + int(ms) / 1000
        
        def seconds_to_time(seconds):
            h = int(seconds // 3600)
            m = int((seconds % 3600) // 60)
            s = int(seconds % 60)
            ms = int((seconds % 1) * 1000)
            return f"{h:02d}:{m:02d}:{s:02d},{ms:03d}"
        
        # 🎯 [SYNC FIX] Instead of even distribution, map phrases to original timing segments
        # This preserves the natural speech rhythm and prevents sync issues
        
        # Get all original text and timing segments
        original_segments = []
        for match in original_matches:
            segment_text = match[3].replace('\n', ' ').strip()
            start_time = time_to_seconds(match[1])
            end_time = time_to_seconds(match[2])
            original_segments.append({
                'text': segment_text,
                'start': start_time,
                'end': end_time,
                'words': segment_text.split()
            })
        
        # Calculate total words in original and new phrases
        total_original_words = sum(len(seg['words']) for seg in original_segments)
        total_phrase_words = sum(len(phrase.split()) for phrase in phrases)
        
        # Map each phrase to appropriate timing based on word position
        new_srt = ""
        current_word_position = 0
        
        for i, phrase in enumerate(phrases):
            phrase_words = phrase.split()
            phrase_word_count = len(phrase_words)
            
            # Calculate what percentage of the original content this phrase represents
            start_ratio = current_word_position / total_original_words
            end_ratio = (current_word_position + phrase_word_count) / total_original_words
            
            # Find the corresponding time range in original segments
            total_duration = original_segments[-1]['end'] - original_segments[0]['start']
            phrase_start = original_segments[0]['start'] + (start_ratio * total_duration)
            phrase_end = original_segments[0]['start'] + (end_ratio * total_duration)
            
            # Ensure minimum duration of 1 second per phrase
            min_duration = 1.0
            if phrase_end - phrase_start < min_duration:
                phrase_end = phrase_start + min_duration
            
            # Ensure we don't exceed the original end time
            if phrase_end > original_segments[-1]['end']:
                phrase_end = original_segments[-1]['end']
                phrase_start = max(phrase_end - min_duration, original_segments[0]['start'])
            
            new_srt += f"{i + 1}\n"
            new_srt += f"{seconds_to_time(phrase_start)} --> {seconds_to_time(phrase_end)}\n"
            new_srt += f"{phrase}\n\n"
            
            current_word_position += phrase_word_count
        
        return new_srt

    def _create_subtitle_filter(self, srt_path: Path, animation: str, background: str, 
                              position: str, width: int, height: int) -> str:
        """Create FFmpeg filter for advanced subtitle styling."""
        try:
            # Base subtitle filter with styling
            font_size = 36 if width >= 1080 else 24
            
            # Position calculation - moved further down for better visibility
            if position == 'bottom':
                y_pos = f"h-th-{height//8}"  # 12.5% from bottom (was 10%)
            elif position == 'center':
                y_pos = "(h-th)/2"
            elif position == 'top':
                y_pos = str(height//10)  # 10% from top
            else:
                y_pos = f"h-th-{height//8}"  # default to bottom with better positioning
            
            # Background styling
            if background == 'bar':
                bg_style = f"BorderStyle=4,BackColour=&H80000000,Outline=0"
            elif background == 'box':
                bg_style = f"BorderStyle=3,BackColour=&H80000000,Outline=2"
            elif background == 'outline':
                bg_style = f"Outline=3,OutlineColour=&H00000000,BackColour=&H00000000"
            else:
                bg_style = f"Outline=2,OutlineColour=&H00000000"
            
            # Create subtitle filter
            subtitle_filter = f"subtitles={srt_path}:force_style='FontSize={font_size},{bg_style}'"
            return subtitle_filter
            
        except Exception as e:
            logger.error(f"Error creating subtitle filter: {e}")
            return f"subtitles={srt_path}"

    def process_video(self, video_path: Path, output_dir: Path, args: argparse.Namespace) -> Optional[Dict]:
        """Process video using the core video processing pipeline with topic card support."""
        try:
            logger.info(f"🎬 Starting video processing: {video_path.name}")
            send_progress("audio_enhancement", 1, 11, f"Starting processing for {video_path.name}")
            
            # Set up GPT prompt configurations
            gpt_configs = json.loads(args.gpt_prompt_configs) if args.gpt_prompt_configs else {}

            # Ensure multimedia analysis is enabled by default if B-roll or images are requested
            if not args.skip_multimedia_analysis or not args.skip_image_generation:
                if 'topic_detection' not in gpt_configs:
                    gpt_configs['topic_detection'] = {'enabled': True, 'prompt': ''}
                if 'multimedia_analysis' not in gpt_configs:
                    gpt_configs['multimedia_analysis'] = {'enabled': True, 'prompt': ''}
                if 'image_generation' not in gpt_configs:
                    gpt_configs['image_generation'] = {'enabled': True, 'prompt': ''}

            if args.openai_key:
                # Override the config key with the one provided in arguments
                OPENAI_API_KEY = args.openai_key
            else:
                OPENAI_API_KEY = self.openai_client.api_key if self.openai_client else None
            
            if args.pexels_api_key:
                # Override the config key with the one provided in arguments
                PEXELS_API_KEY = args.pexels_api_key
            else:
                PEXELS_API_KEY = getattr(self, 'pexels_api_key', None)
            
            if args.pixabay_api_key:
                # Override the config key with the one provided in arguments
                PIXABAY_API_KEY = args.pixabay_api_key
            else:
                PIXABAY_API_KEY = None
            
            result_path = process_video(
                input_file_path=video_path,
                output_dir_base=output_dir,
                video_topic="medical",  # This will be auto-detected later
                skip_audio=args.skip_audio or args.skip_audio_enhance,
                skip_silence=args.skip_silence or args.skip_silence_cut,
                skip_transcription=args.skip_transcription,
                skip_gpt_correct=args.skip_gpt or args.skip_gpt_correct,
                skip_subtitle_burn=args.skip_subtitles or args.skip_subtitle_burn,
                skip_outro=args.skip_outro,
                skip_broll=args.skip_broll,
                skip_ai_highlights=args.skip_ai_highlights,
                skip_multimedia_analysis=args.skip_multimedia_analysis,
                skip_image_generation=args.skip_image_generation,
                skip_dynamic_zoom=args.skip_dynamic_zoom,
                skip_background_music=args.skip_background_music,
                skip_sound_effects=args.skip_sound_effects,
                skip_topic_card=args.skip_topic_card,
                skip_frame=args.skip_frame,
                skip_flash_logo=args.skip_flash_logo,
                use_ffmpeg_enhance=args.use_ffmpeg_enhance,
                use_ai_denoiser=args.use_ai_denoiser,
                use_voicefixer=args.use_voicefixer,
                silence_threshold=f"-{int(20 * abs(math.log10(args.silence_threshold)) + 10)}dB",
                silence_duration=args.silence_margin,
                highlight_style=args.highlight_style,
                broll_clip_count=args.broll_clip_count,
                broll_clip_duration=args.broll_clip_duration,
                broll_transition_style=args.broll_transition_style,
                zoom_intensity=args.zoom_intensity,
                zoom_frequency=args.zoom_frequency,
                music_track=args.music_track,
                music_speech_volume=args.music_speech_volume,
                music_background_volume=args.music_background_volume,
                music_fade_in_duration=args.music_fade_in_duration,
                music_fade_out_duration=args.music_fade_out_duration,
                sound_effect_pack=args.sound_effect_pack,
                sound_effect_duration=args.sound_effect_duration,
                subtitle_font_size=args.subtitle_font_size,
                frame_style=args.frame_style,
                use_ai_word_highlighting=args.use_ai_word_highlighting,
                openai_api_key=OPENAI_API_KEY,
                pexels_api_key=PEXELS_API_KEY,
                topic_detection_prompt=args.topic_detection_prompt,
                transcription_correction_prompt=args.transcription_correction_prompt,
                ai_highlights_prompt=args.ai_highlights_prompt,
                broll_analysis_prompt=args.broll_analysis_prompt,
                image_analysis_prompt=args.image_analysis_prompt,
                broll_keywords_prompt=args.broll_keywords_prompt,
                image_generation_prompt=args.image_generation_prompt,
                video_title_prompt=args.video_title_prompt,
                video_description_prompt=args.video_description_prompt,
                video_tags_prompt=args.video_tags_prompt,
                image_generation_count=args.image_generation_count,
                image_display_duration=args.image_display_duration,
                image_quality=args.image_quality,
                image_transition_style=args.image_transition_style,
                gpt_prompt_configs=gpt_configs,
                # Smart Mode parameters
                use_smart_mode=args.use_smart_mode,
                smart_broll_ratio=args.smart_broll_ratio,
                smart_image_ratio=args.smart_image_ratio,
                # Random Mode parameters
                random_mode_enabled=args.random_mode_enabled,
                random_frame_style=args.random_frame_style,
                random_music_track=args.random_music_track,
                random_broll_transition=args.random_broll_transition,
                random_image_transition=args.random_image_transition,
                random_highlight_style=args.random_highlight_style,
                random_zoom_intensity=args.random_zoom_intensity,
                random_zoom_frequency=args.random_zoom_frequency,
                random_caption_style=args.random_caption_style,
                random_caption_animation=args.random_caption_animation,
                random_topic_card_style=args.random_topic_card_style,
                random_outro_style=args.random_outro_style,
                random_sound_effect_pack=args.random_sound_effect_pack
            )
            
            if result_path:
                logger.info(f"✅ Video processing completed: {result_path.name}")
                return {"success": True, "processed_file": result_path, "original_file": video_path}
            else:
                logger.error("❌ Video processing failed")
                return None
            
        except Exception as e:
            logger.error(f"❌ Error in video processing for {video_path.name}: {e}", exc_info=True)
            return None


def main():
    parser = argparse.ArgumentParser(description="YouTube Uploader and Video Processor")
    parser.add_argument('video_files', nargs='*', default=[], help="Paths to the video files to upload.")
    parser.add_argument('--input-folder', type=str, help="Directory containing video files to process.")
    parser.add_argument('--mode', type=str, default='dry-run', choices=['dry-run', 'full-upload', 'batch-upload', 'process-only'], help="Processing mode.")
    parser.add_argument('--output-dir', type=str, help="Directory to save processed videos.")
    parser.add_argument('--schedule', type=str, help="Schedule date in YYYY-MM-DD format.")
    parser.add_argument('--schedule-mode', type=str, default='delayed', choices=['delayed', 'custom', 'immediate', 'standard'], help="Scheduling mode.")
    parser.add_argument('--preferred-time', type=str, help="Preferred time for scheduling (e.g., '09:00').")
    parser.add_argument('--scheduling-strategy', type=str, default='standard', help="Smart scheduling strategy.")
    parser.add_argument('--slot-interval', type=str, default='24h', help="Time interval between smart schedule slots.")
    parser.add_argument('--posting-times', type=str, help='JSON string of posting times (e.g., \'{"morning":"07:00"}\').')
    parser.add_argument('--openai-key', type=str, help="OpenAI API key for AI features.")
    parser.add_argument('--pexels-api-key', type=str, help="Pexels API key for B-roll footage.")
    parser.add_argument('--pixabay-api-key', type=str, help="Pixabay API key for background music.")
    parser.add_argument('--ayrshare-key', type=str, help="Ayrshare API key.")
    parser.add_argument('--multi-platform-config', type=str, help="JSON string of the multi-platform configuration.")
    parser.add_argument('--social-platforms', nargs='+', default=['youtube'], help="List of social platforms to upload to.")

    # Processing options from UI
    parser.add_argument('--title', type=str, help="Video title.")
    parser.add_argument('--description', type=str, help="Video description.")
    parser.add_argument('--tags', nargs='+', help="List of video tags.")
    
    # Boolean flags for skipping steps
    parser.add_argument('--skip-audio-enhance', action='store_true', default=True, help="Skip audio enhancement (default: True).")
    parser.add_argument('--skip-silence-cut', action='store_true', help="Skip silence cutting.")
    parser.add_argument('--skip-gpt-correct', action='store_true', help="Skip GPT correction.")
    parser.add_argument('--skip-subtitle-burn', action='store_true', help="Skip burning subtitles.")
    parser.add_argument('--skip-audio', action='store_true', default=True, help="Alias for skip-audio-enhance (default: True).")
    parser.add_argument('--skip-silence', action='store_true', help="Alias for skip-silence-cut.")
    parser.add_argument('--skip-gpt', action='store_true', help="Alias for skip-gpt-correct.")
    parser.add_argument('--skip-subtitles', action='store_true', help="Alias for skip-subtitle-burn.")
    
    parser.add_argument('--skip-transcription', action='store_true', help="Skip transcription.")
    parser.add_argument('--skip-ai-highlights', action='store_true', help="Skip AI highlights.")
    parser.add_argument('--skip-broll', action='store_true', help="Skip AI B-roll.")
    parser.add_argument('--skip-multimedia-analysis', action='store_true', help="Skip AI multimedia analysis.")
    parser.add_argument('--skip-image-generation', action='store_true', help="Skip AI image generation.")
    parser.add_argument('--skip-topic-card', action='store_true', help="Skip topic card generation.")
    parser.add_argument('--skip-frame', action='store_true', help="Skip adding a frame.")
    parser.add_argument('--skip-flash-logo', action='store_true', help="Skip flashing the logo.")
    parser.add_argument('--skip-outro', action='store_true', help="Skip adding an outro.")
    parser.add_argument('--skip-thumbnail', action='store_true', help="Skip thumbnail generation.")
    parser.add_argument('--skip-playlist', action='store_true', help="Skip playlist management.")
    parser.add_argument('--skip-dynamic-zoom', action='store_true', help="Skip dynamic zoom.")
    parser.add_argument('--skip-background-music', action='store_true', help="Skip background music.")
    parser.add_argument('--skip-sound-effects', action='store_true', help="Skip sound effects.")

    # Processing flags with values
    parser.add_argument('--use-ffmpeg-enhance', action='store_true', default=True, help="Use FFmpeg for audio enhancement (default: True).")
    parser.add_argument('--use-ai-denoiser', action='store_true', help="Use AI-based audio denoising.")
    parser.add_argument('--use-voicefixer', action='store_true', help="Use VoiceFixer for audio enhancement.")
    parser.add_argument('--use-ai-highlights', action='store_true', help="Use AI to generate highlights.")
    parser.add_argument('--use-ai-broll', action='store_true', help="Use AI to add b-roll.")
    parser.add_argument('--use-gpt-for-description', action='store_true', help="Use GPT for description.")
    parser.add_argument('--use-gpt-for-tags', action='store_true', help="Use GPT for tags.")
    parser.add_argument('--use-gpt-for-title', action='store_true', help="Use GPT for title.")
    
    parser.add_argument('--whisper-model', type=str, default='base', choices=['tiny', 'base', 'small', 'medium', 'large'], help='Whisper model size.')
    parser.add_argument('--gpt-model', type=str, default='gpt-4o-mini', choices=['gpt-4o-mini', 'gpt-4-turbo'], help='GPT model.')
    
    # Frame & Style options
    parser.add_argument('--silence-threshold', type=float, default=0.075, help='Silence threshold for cutting.')
    parser.add_argument('--silence-margin', type=float, default=0.19, help='Silence margin.')
    parser.add_argument('--highlight-style', type=str, default='yellow', choices=['yellow', 'cyan', 'lime'], help='Style for highlighted keywords.')
    parser.add_argument('--broll-clip-count', type=int, default=5, help='Number of B-roll clips.')
    parser.add_argument('--broll-clip-duration', type=int, default=4, help='Duration of B-roll clips.')
    parser.add_argument('--broll-transition-style', type=str, default='fade', choices=['fade', 'none', 'slide', 'zoom'], help='Transition style for B-roll clips.')
    parser.add_argument('--image-generation-count', type=int, default=3, help='Number of AI generated images.')
    parser.add_argument('--image-display-duration', type=int, default=4, help='Duration to display AI generated images.')
    parser.add_argument('--image-quality', type=str, default='standard', choices=['standard', 'hd'], help='Quality of AI generated images.')
    parser.add_argument('--image-transition-style', type=str, default='fade', choices=['fade', 'none', 'slide', 'zoom'], help='Transition style for AI generated images.')
    parser.add_argument('--zoom-intensity', type=str, default='subtle', choices=['subtle', 'medium', 'strong'], help='Intensity of dynamic zoom effect.')
    parser.add_argument('--zoom-frequency', type=str, default='medium', choices=['low', 'medium', 'high'], help='Frequency of dynamic zoom effect.')
    parser.add_argument('--music-track', type=str, default='random', help='Background music track name or "random" for random selection.')
    parser.add_argument('--music-background-volume', type=float, default=0.15, help='Background music volume (0.0-1.0).')
    parser.add_argument('--music-speech-volume', type=float, default=1.0, help='Speech volume when music is playing (0.0-1.0).')
    parser.add_argument('--music-fade-in-duration', type=float, default=2.0, help='Music fade-in duration in seconds.')
    parser.add_argument('--music-fade-out-duration', type=float, default=3.0, help='Music fade-out duration in seconds.')
    parser.add_argument('--sound-effect-pack', type=str, default='sound-effects', help='Sound effect pack to use.')
    parser.add_argument('--sound-effect-duration', type=float, default=0.5, help='Sound effect duration in seconds.')
    parser.add_argument('--subtitle-font-size', type=int, default=8, help='Font size for subtitles.')
    parser.add_argument('--frame-style', type=str, default='rainbow', help='Style for the subtitle frame background.')
    parser.add_argument('--use-ai-word-highlighting', action='store_true', help='Use AI to highlight key words in subtitles.')
    
    # Smart Mode Settings
    parser.add_argument('--use-smart-mode', action='store_true', help="Enable Smart Mode for dynamic parameter adjustments.")
    parser.add_argument('--smart-broll-ratio', type=float, default=1.5, help='Number of B-roll clips per 30 seconds of content (smart mode).')
    parser.add_argument('--smart-image-ratio', type=float, default=6.0, help='Number of generated images per 30 seconds of content (smart mode).')
    
    # Random Mode settings - NEW
    parser.add_argument('--random-mode-enabled', action='store_true', help='Enable random mode for batch processing variation.')
    parser.add_argument('--random-frame-style', action='store_true', help='Randomly select frame style for each video.')
    parser.add_argument('--random-music-track', action='store_true', help='Randomly select music track for each video.')
    parser.add_argument('--random-broll-transition', action='store_true', help='Randomly select B-roll transition style for each video.')
    parser.add_argument('--random-image-transition', action='store_true', help='Randomly select image transition style for each video.')
    parser.add_argument('--random-highlight-style', action='store_true', help='Randomly select highlight style for each video.')
    parser.add_argument('--random-zoom-intensity', action='store_true', help='Randomly select zoom intensity for each video.')
    parser.add_argument('--random-zoom-frequency', action='store_true', help='Randomly select zoom frequency for each video.')
    parser.add_argument('--random-caption-style', action='store_true', help='Randomly select caption style for each video.')
    parser.add_argument('--random-caption-animation', action='store_true', help='Randomly select caption animation for each video.')
    parser.add_argument('--random-topic-card-style', action='store_true', help='Randomly select topic card style for each video.')
    parser.add_argument('--random-outro-style', action='store_true', help='Randomly select outro style for each video.')
    parser.add_argument('--random-sound-effect-pack', action='store_true', help='Randomly select sound effect pack for each video.')
    
    # Custom AI Prompts
    parser.add_argument('--topic-detection-prompt', type=str, help='Custom prompt for topic detection.')
    parser.add_argument('--transcription-correction-prompt', type=str, help="Custom prompt for GPT transcript correction.")
    parser.add_argument('--ai-highlights-prompt', type=str, help="Custom prompt for AI word highlighting.")
    parser.add_argument('--broll-analysis-prompt', type=str, help="Custom prompt for B-roll analysis.")
    parser.add_argument('--image-analysis-prompt', type=str, help="Custom prompt for image analysis.")
    parser.add_argument('--broll-keywords-prompt', type=str, help="Custom prompt for B-roll keywords.")
    parser.add_argument('--image-generation-prompt', type=str, help="Custom prompt for AI image generation.")
    parser.add_argument('--video-title-prompt', type=str, help="Custom prompt for video title generation.")
    parser.add_argument('--video-description-prompt', type=str, help="Custom prompt for video description generation.")
    parser.add_argument('--video-tags-prompt', type=str, help="Custom prompt for video tags generation.")
    parser.add_argument('--gpt-prompt-configs', type=str, help="JSON string of GPT prompt configurations.")

    args = parser.parse_args()
    
    # Log the social platforms for debugging
    logger.info(f"Social platforms: {args.social_platforms}")
    
    uploader = YouTubeUploader(openai_api_key=args.openai_key, ayrshare_api_key=args.ayrshare_key, pexels_api_key=args.pexels_api_key)
    
    multi_platform_config = json.loads(args.multi_platform_config) if args.multi_platform_config else {}
    
    files_to_process = []
    
    # Priority: Specific video files take precedence over folder scanning
    if args.video_files and len(args.video_files) > 0:
        # Use specific video files (for single upload mode)
        files_to_process.extend([Path(f) for f in args.video_files])
        logger.info(f"🎯 Using specific video files: {[f.name for f in files_to_process]}")
    elif args.input_folder:
        # Fallback to folder scanning (for batch mode)
        input_path = Path(args.input_folder)
        if input_path.exists():
            files_to_process.extend(list(input_path.glob('*.mp4')))
            files_to_process.extend(list(input_path.glob('*.mov')))
            logger.info(f"📁 Scanning folder: {args.input_folder}")

    if not files_to_process:
        logger.error("No video files found to process.")
        return

    # 🎯 [SINGLE UPLOAD FIX] For single upload mode, only process the first video
    if args.mode == 'full-upload' and len(files_to_process) > 1:
        logger.info(f"🎯 [SINGLE UPLOAD] Mode is 'full-upload' - limiting to first video only")
        logger.info(f"🎯 [SINGLE UPLOAD] Found {len(files_to_process)} videos, but will only process: {files_to_process[0].name}")
        files_to_process = files_to_process[:1]
    
    logger.info(f"Found {len(files_to_process)} videos to process in {args.mode} mode.")

    total_videos = len(files_to_process)
    for i, video_path in enumerate(files_to_process, 1):
        logger.info(f"--- Processing: {video_path.name} ---")
        send_progress("processing", i, total_videos, f"Processing {video_path.name}")

        result = uploader.process_video(
            video_path=video_path,
            output_dir=Path(args.output_dir) if args.output_dir else DEFAULT_DRY_RUN_DIR,
            args=args
        )

        if result and args.mode != 'process-only':
            # This is where the upload logic would go
            logger.info(f"Video ready for upload: {result['processed_file']}")
            # uploader.upload_video(...)
        elif not result:
            logger.error(f"Processing failed for {video_path.name}")


if __name__ == '__main__':
    main() 