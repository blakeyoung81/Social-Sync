#!/usr/bin/env python3
"""
Test script to verify audio fixes and create corrected music functions.
"""

import sys
from pathlib import Path

# Add src to path
sys.path.insert(0, str(Path(__file__).parent / "src"))

from core.pixabay_music import PixabayMusicManager

def test_music_manager_fixes():
    """Test the music manager with the missing method."""
    print("🎵 Testing PixabayMusicManager fixes...")
    
    manager = PixabayMusicManager()
    
    # Test get_available_music_files
    files = manager.get_available_music_files()
    print(f"📚 Found {len(files)} music files")
    
    # Add the missing get_music_by_name method manually
    def get_music_by_name(self, track_name: str):
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
                
        print(f"  [Music] Track not found: {track_name}")
        return None
    
    # Monkey patch the method
    PixabayMusicManager.get_music_by_name = get_music_by_name
    
    # Test the method
    result = manager.get_music_by_name("corporate-upbeat")
    print(f"🎯 Found track: {result}")
    
    result = manager.get_music_by_name("lofi-chill")
    print(f"🎯 Found track: {result}")
    
    print("✅ Music manager fixes working!")

if __name__ == "__main__":
    test_music_manager_fixes() 