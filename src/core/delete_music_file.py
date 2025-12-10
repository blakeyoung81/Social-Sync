#!/usr/bin/env python3
"""
Helper script to delete music files.
Used by the web interface API.
"""

import sys
from pathlib import Path

# Add the src directory to Python path
sys.path.insert(0, str(Path(__file__).parent.parent))

from core.pixabay_music import PixabayMusicManager

def main():
    if len(sys.argv) < 2:
        print("Usage: python delete_music_file.py <filename>", file=sys.stderr)
        sys.exit(1)
    
    filename = sys.argv[1]
    
    try:
        manager = PixabayMusicManager()
        success = manager.delete_music_file(filename)
        
        if success:
            print(f"Successfully deleted {filename}")
        else:
            print(f"Failed to delete {filename}", file=sys.stderr)
            sys.exit(1)
            
    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()