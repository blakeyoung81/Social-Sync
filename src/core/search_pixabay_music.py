#!/usr/bin/env python3
"""
Helper script to search Pixabay for music.
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
        print("Usage: python search_pixabay_music.py <query> [max_results]", file=sys.stderr)
        sys.exit(1)
    
    query = sys.argv[1]
    max_results = int(sys.argv[2]) if len(sys.argv) > 2 else 20
    
    try:
        manager = PixabayMusicManager()
        results = manager.search_pixabay_music(query, max_results)
        
        print(json.dumps(results, indent=2))
        
    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()