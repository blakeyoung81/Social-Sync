#!/usr/bin/env python3
"""
Pixabay Music Library Management for YouTube Video Processing

This module provides:
1. Intelligent background music selection
2. Pixabay API integration for downloading new music
3. Music library management for user-added files
4. Growing collection of royalty-free music
"""

import requests
import json
import logging
import subprocess
import hashlib
from pathlib import Path
from typing import Optional, Dict, List, Tuple
import time
import re
from urllib.parse import urlparse

from .config import PIXABAY_API_KEY, ASSETS_DIR

logger = logging.getLogger(__name__)

# Music categories and moods for intelligent selection
MUSIC_PROFILES = {
    'shorts': {
        'upbeat': ['energetic', 'upbeat', 'motivational'],
        'chill': ['chill', 'relaxing', 'lofi'],
        'corporate': ['corporate', 'business', 'professional'],
        'dramatic': ['cinematic', 'dramatic', 'epic']
    },
    'long_form': {
        'educational': ['educational', 'documentary', 'learning'],
        'medical': ['scientific', 'medical', 'professional'],
        'tech': ['technology', 'modern', 'digital'],
        'general': ['background', 'neutral', 'ambient']
    }
}

class PixabayMusicManager:
    """Handles music search and download from Pixabay."""
    
    def __init__(self, api_key: str = None):
        self.api_key = api_key or PIXABAY_API_KEY
        self.music_dir = ASSETS_DIR / "music"
        self.music_dir.mkdir(parents=True, exist_ok=True)
        self.cache_file = self.music_dir / "music_cache.json"
        self.music_cache = self._load_cache()
        
    def _load_cache(self) -> Dict:
        """Load the music cache to avoid re-downloading."""
        if self.cache_file.exists():
            try:
                with open(self.cache_file, 'r') as f:
                    return json.load(f)
            except Exception as e:
                logger.warning(f"Failed to load music cache: {e}")
        return {}
    
    def _save_cache(self):
        """Save the music cache."""
        try:
            with open(self.cache_file, 'w') as f:
                json.dump(self.music_cache, f, indent=2)
        except Exception as e:
            logger.warning(f"Failed to save music cache: {e}")
    
    def search_and_download_music(self, video_duration: float, video_topic: str = "general") -> Optional[Path]:
        """
        Search and download appropriate music for a video.
        Falls back to existing library if download fails.
        """
        logger.info(f"  [Music AI] Requesting music for {video_duration:.1f}s {video_topic} video")
        
        # First try to find suitable music in existing library
        existing_music = self.get_random_music()
        if existing_music:
            logger.info(f"  [Music AI] Found suitable existing music: {existing_music.name}")
            return existing_music
        
        # If no existing music found, try downloading from Pixabay
        logger.info(f"  [Music AI] No suitable existing music found, trying Pixabay download...")
        
        # Get search queries based on topic
        search_queries = self._get_search_queries_for_topic(video_topic)
        
        for query in search_queries:
            logger.info(f"  [Music Search] Trying query: '{query}'")
            try:
                search_results = self.search_pixabay_music(query, max_results=10)
                
                if not search_results:
                    logger.warning(f"  [Music Search] No results for query '{query}'")
                    continue
                
                # Try to find a video with suitable duration
                suitable_videos = [
                    video for video in search_results 
                    if video.get('duration', 0) >= min(video_duration, 20)  # At least video duration or 20s
                ]
                
                if not suitable_videos:
                    logger.info(f"  [Music Search] No suitable duration tracks for '{query}'")
                    continue
                
                # Try to download the first suitable video
                video_to_download = suitable_videos[0]
                custom_name = f"{query.replace(' ', '_')}_{video_topic}_{int(time.time())}"
                
                logger.info(f"  [Music Download] Downloading: {video_to_download.get('title', 'Unknown')}")
                downloaded_path = self.download_pixabay_music(video_to_download, custom_name)
                
                if downloaded_path:
                    logger.info(f"  [Music AI] Successfully downloaded: {downloaded_path.name}")
                    return downloaded_path
                else:
                    logger.warning(f"  [Music Download] Failed to download from query '{query}'")
                    
            except Exception as e:
                logger.error(f"  [Music Search] Error with query '{query}': {e}")
                continue
        
        # If all downloads failed, fall back to any existing music
        logger.warning(f"  [Music AI] Failed to download music from Pixabay")
        logger.warning(f"  [Music AI] Pixabay download failed, falling back to existing library")
        
        fallback_music = self.get_random_music()
        if fallback_music:
            logger.info(f"  [Music AI] Using fallback music: {fallback_music.name}")
            return fallback_music
        
        # Create a silent MP3 as absolute last resort
        logger.warning(f"  [Music AI] No music available, creating silent track")
        return self._create_silent_track(video_duration)
    
    def _create_silent_track(self, duration: float) -> Optional[Path]:
        """Create a silent MP3 track as last resort."""
        try:
            silent_path = self.music_dir / f"silent_track_{int(duration)}s.mp3"
            if silent_path.exists():
                return silent_path
                
            cmd = [
                'ffmpeg', '-y', '-f', 'lavfi', 
                '-i', f'anullsrc=channel_layout=stereo:sample_rate=44100',
                '-t', str(duration),
                '-acodec', 'libmp3lame', '-ab', '128k',
                str(silent_path)
            ]
            
            result = subprocess.run(cmd, capture_output=True, text=True)
            if result.returncode == 0:
                logger.info(f"  [Music AI] Created silent track: {silent_path.name}")
                return silent_path
            else:
                logger.error(f"  [Music AI] Failed to create silent track: {result.stderr}")
                return None
                
        except Exception as e:
            logger.error(f"  [Music AI] Error creating silent track: {e}")
            return None
    
    def get_random_music(self) -> Optional[Path]:
        """
        Randomly select a music file from the existing library.
        
        Returns:
            Path to a randomly selected music file, or None if no music available
        """
        logger.info(f"  [Music] Getting random music from library...")
        
        # Get available music files
        music_files = self.get_available_music_files()
        if not music_files:
            logger.warning(f"  [Music] No music files found in library")
            return None
        
        # Simple random selection from available MP3s
        import random
        selected_file = random.choice(music_files)
        logger.info(f"  [Music] Randomly selected: {selected_file['display_name']}")
        return Path(selected_file['path'])
    

    
    def get_available_moods(self, is_short: bool = False) -> List[str]:
        """Get list of available music moods."""
        profile_key = 'shorts' if is_short else 'long_form'
        return list(MUSIC_PROFILES.get(profile_key, {}).keys())
    
    def get_available_music_files(self) -> List[Dict]:
        """Get all available music files in the library."""
        music_files = []
        
        for file_path in self.music_dir.glob("*.mp3"):
            try:
                # Get basic file info
                file_info = {
                    'filename': file_path.name,
                    'path': str(file_path),
                    'size': file_path.stat().st_size,
                    'created': file_path.stat().st_ctime,
                    'display_name': file_path.stem.replace('_', ' ').title(),
                    'duration': self._get_audio_duration(file_path)
                }
                music_files.append(file_info)
            except Exception as e:
                logger.warning(f"Error reading music file {file_path}: {e}")
        
        # Sort by creation time (newest first)
        music_files.sort(key=lambda x: x['created'], reverse=True)
        return music_files
    
    def get_music_by_name(self, track_name: str) -> Optional[Path]:
        """Get a music file by its track name or filename."""
        music_files = self.get_available_music_files()
        
        # Try exact filename match first (without extension)
        for music_file in music_files:
            if music_file['filename'].replace('.mp3', '') == track_name:
                return Path(music_file['path'])
        
        # Try display name match
        for music_file in music_files:
            if music_file['display_name'].lower() == track_name.lower().replace('-', ' ').title():
                return Path(music_file['path'])
                
        # Try partial match
        track_name_lower = track_name.lower().replace('-', ' ')
        for music_file in music_files:
            if track_name_lower in music_file['display_name'].lower():
                return Path(music_file['path'])
                
        logger.warning(f"  [Music] Track not found: {track_name}")
        return None
    
    def _get_audio_duration(self, audio_path: Path) -> float:
        """Get the duration of an audio file using ffprobe."""
        try:
            cmd = [
                'ffprobe', '-v', 'quiet', '-print_format', 'json',
                '-show_format', str(audio_path)
            ]
            result = subprocess.run(cmd, capture_output=True, text=True)
            if result.returncode == 0:
                data = json.loads(result.stdout)
                return float(data['format']['duration'])
        except Exception as e:
            logger.warning(f"Could not get duration for {audio_path}: {e}")
        return 0.0
    
    def search_pixabay_music(self, query: str, max_results: int = 20) -> List[Dict]:
        """
        Search for music on Pixabay using their video API.
        
        Args:
            query: Search query (e.g., "upbeat", "chill", "corporate")
            max_results: Maximum number of results to return
            
        Returns:
            List of music video results from Pixabay
        """
        if not self.api_key:
            logger.error("No Pixabay API key provided")
            return []
        
        try:
            params = {
                'key': self.api_key,
                'q': f"{query} music instrumental background royalty free",
                'video_type': 'all',
                'category': 'music',
                'safesearch': 'true',
                'order': 'popular',
                'per_page': min(max_results, 20),
                'min_duration': 20  # At least 20 seconds
            }
            
            logger.info(f"  [Pixabay] Searching for: {query}")
            response = requests.get('https://pixabay.com/api/videos/', params=params, timeout=10)
            response.raise_for_status()
            data = response.json()
            
            results = []
            for video in data.get('hits', []):
                # Clean up tags and create a proper title
                tags = video.get('tags', '').replace(',', ' ').strip()
                title = tags.split()[0:3]  # Take first 3 words
                title = ' '.join(title).title() if title else f"Music {video['id']}"
                
                result = {
                    'id': video['id'],
                    'title': title,
                    'tags': tags,
                    'duration': video.get('duration', 0),
                    'user': video.get('user', 'Unknown'),
                    'views': video.get('views', 0),
                    'downloads': video.get('downloads', 0),
                    'videos': video.get('videos', {}),
                    'preview_url': video.get('videos', {}).get('tiny', {}).get('url', ''),
                    'download_url': video.get('videos', {}).get('small', {}).get('url', '')
                }
                results.append(result)
            
            logger.info(f"  [Pixabay] Found {len(results)} music tracks")
            return results
            
        except Exception as e:
            logger.error(f"  [Pixabay] Search failed: {e}")
            return []
    
    def download_pixabay_music(self, video_data: Dict, custom_name: str = None) -> Optional[Path]:
        """
        Download a music video from Pixabay and extract its audio.
        
        Args:
            video_data: Video data from Pixabay search results
            custom_name: Optional custom filename (without extension)
            
        Returns:
            Path to the downloaded MP3 file
        """
        try:
            # Get the best quality video URL for audio extraction
            videos = video_data.get('videos', {})
            video_url = None
            
            # Prefer small size for faster download while maintaining audio quality
            for size in ['small', 'tiny', 'medium']:
                if size in videos and videos[size].get('url'):
                    video_url = videos[size]['url']
                    break
            
            if not video_url:
                logger.error(f"  [Pixabay] No video URL found for {video_data.get('title', 'Unknown')}")
                return None
            
            # Generate filename
            if custom_name:
                filename = self._sanitize_filename(custom_name)
            else:
                title = video_data.get('title', f"music_{video_data['id']}")
                filename = self._sanitize_filename(title)
            
            # Ensure unique filename
            base_filename = filename
            counter = 1
            mp3_path = self.music_dir / f"{filename}.mp3"
            while mp3_path.exists():
                filename = f"{base_filename}_{counter}"
                mp3_path = self.music_dir / f"{filename}.mp3"
                counter += 1
            
            logger.info(f"  [Pixabay] Downloading: {video_data.get('title', 'Unknown')}")
            logger.info(f"  [Pixabay] Saving as: {mp3_path.name}")
            
            # Download video
            temp_video = self.music_dir / f"temp_{filename}.mp4"
            
            response = requests.get(video_url, stream=True, timeout=30)
            response.raise_for_status()
            
            with open(temp_video, 'wb') as f:
                for chunk in response.iter_content(chunk_size=8192):
                    f.write(chunk)
            
            # Check if video has audio stream first
            probe_cmd = ['ffprobe', '-v', 'quiet', '-show_streams', '-select_streams', 'a', str(temp_video)]
            probe_result = subprocess.run(probe_cmd, capture_output=True, text=True)
            
            if not probe_result.stdout.strip():
                logger.warning(f"  [Pixabay] Video has no audio streams: {temp_video.name}")
                # Use free music from Pixabay Audio instead of generating silence
                logger.info(f"  [Pixabay] Switching to Pixabay Audio API for audio content")
                temp_video.unlink(missing_ok=True)
                return self._download_pixabay_audio(video_data, filename)
                cmd = [
                    'ffmpeg', '-y', '-f', 'lavfi', '-i', f'anullsrc=channel_layout=stereo:sample_rate=44100',
                    '-t', '30',  # 30 seconds of silence
                    '-acodec', 'libmp3lame',
                    '-ab', '192k',
                    str(mp3_path)
                ]
            else:
                # Extract audio using ffmpeg
                cmd = [
                    'ffmpeg', '-y', '-i', str(temp_video),
                    '-vn',  # No video
                    '-acodec', 'libmp3lame',  # Use libmp3lame encoder
                    '-ab', '192k',  # Higher quality audio
                    '-ar', '44100',
                    '-ac', '2',
                    '-map', '0:a',  # Map audio stream explicitly
                    str(mp3_path)
                ]
            
            result = subprocess.run(cmd, capture_output=True, text=True)
            
            if result.returncode == 0:
                # Add metadata
                self._add_pixabay_metadata(mp3_path, video_data)
                
                # Clean up temp video file
                temp_video.unlink(missing_ok=True)
                
                # Update cache
                cache_key = f"pixabay_{video_data['id']}"
                self.music_cache[cache_key] = {
                    'filename': mp3_path.name,
                    'pixabay_id': video_data['id'],
                    'title': video_data.get('title', ''),
                    'downloaded_at': time.time()
                }
                self._save_cache()
                
                logger.info(f"  [Pixabay] Successfully downloaded: {mp3_path.name}")
                return mp3_path
            else:
                logger.error(f"  [Pixabay] FFmpeg failed: {result.stderr}")
                temp_video.unlink(missing_ok=True)
                return None
                
        except Exception as e:
            logger.error(f"  [Pixabay] Download failed: {e}")
            return None
    
    def _sanitize_filename(self, filename: str) -> str:
        """Sanitize filename for filesystem compatibility."""
        # Remove or replace invalid characters
        filename = re.sub(r'[<>:"/\\|?*]', '', filename)
        filename = re.sub(r'\s+', '_', filename)  # Replace spaces with underscores
        filename = filename.lower()
        return filename[:50]  # Limit length
    
    def _add_pixabay_metadata(self, audio_path: Path, video_data: Dict):
        """Add metadata to the downloaded audio file."""
        try:
            # Use ffmpeg to add metadata
            temp_path = audio_path.with_suffix('.tmp.mp3')
            
            cmd = [
                'ffmpeg', '-y', '-i', str(audio_path),
                '-metadata', f"title={video_data.get('title', 'Background Music')}",
                '-metadata', f"artist={video_data.get('user', 'Pixabay')}",
                '-metadata', f"album=Pixabay Royalty-Free Music",
                '-metadata', f"comment=Downloaded from Pixabay - ID: {video_data['id']}",
                '-codec', 'copy',
                str(temp_path)
            ]
            
            result = subprocess.run(cmd, capture_output=True, text=True)
            
            if result.returncode == 0:
                temp_path.replace(audio_path)
            else:
                temp_path.unlink(missing_ok=True)
                
        except Exception as e:
            logger.warning(f"  [Pixabay] Failed to add metadata: {e}")
    
    def delete_music_file(self, filename: str) -> bool:
        """Delete a music file from the library."""
        try:
            file_path = self.music_dir / filename
            if file_path.exists():
                file_path.unlink()
                logger.info(f"  [Music] Deleted: {filename}")
                return True
            else:
                logger.warning(f"  [Music] File not found: {filename}")
                return False
        except Exception as e:
            logger.error(f"  [Music] Error deleting {filename}: {e}")
            return False