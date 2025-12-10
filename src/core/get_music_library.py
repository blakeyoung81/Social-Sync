#!/usr/bin/env python3
"""
Helper script to get all music files in the library.
Used by the web interface API.
"""

import json
import sys
from pathlib import Path

# Add the src directory to Python path
sys.path.insert(0, str(Path(__file__).parent.parent))

from core.pixabay_music import PixabayMusicManager

def main():
    try:
        manager = PixabayMusicManager()
        files = manager.get_available_music_files()
        
        # Convert to JSON-serializable format
        for file_info in files:
            file_info['created'] = int(file_info['created'])  # Convert timestamp to int
        
        # Return in the format expected by the web API
        result = {
            "music_files": files
        }
        
        print(json.dumps(result, indent=2))
        
    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()