#!/usr/bin/env python3
"""
Helper script to download music from Pixabay.
Used by the web interface API.
"""

import json
import sys
from pathlib import Path

# Add the src directory to Python path
sys.path.insert(0, str(Path(__file__).parent.parent))

from core.pixabay_music import PixabayMusicManager

def main():
    if len(sys.argv) < 2:
        print("Usage: python download_pixabay_music.py <video_data_json> [custom_name]", file=sys.stderr)
        sys.exit(1)
    
    try:
        video_data = json.loads(sys.argv[1])
        custom_name = sys.argv[2] if len(sys.argv) > 2 else None
        
        manager = PixabayMusicManager()
        downloaded_path = manager.download_pixabay_music(video_data, custom_name)
        
        if downloaded_path:
            print(downloaded_path.name)  # Return just the filename
        else:
            print("Download failed", file=sys.stderr)
            sys.exit(1)
            
    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()