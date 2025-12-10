#!/usr/bin/env python3
"""
Test Pixabay Music Download Functionality
"""

import sys
from pathlib import Path
sys.path.append(str(Path(__file__).parent / "src"))

from src.core.pixabay_music import PixabayMusicManager

def test_pixabay_download():
    print("🎵 Testing Pixabay Music Download")
    print("=" * 50)
    
    manager = PixabayMusicManager()
    
    # Test search and download for a short video
    print("\n🔍 Testing search and download for 30s business video...")
    result = manager.search_and_download_music(30, "business")
    
    if result:
        print(f"✅ Successfully downloaded: {result.name}")
        print(f"📁 Location: {result}")
        
        # Check if file exists and has content
        if result.exists() and result.stat().st_size > 0:
            print(f"📊 File size: {result.stat().st_size / (1024*1024):.1f} MB")
            print("🎉 Download test PASSED!")
        else:
            print("❌ File exists but is empty")
    else:
        print("❌ Download failed - this might be due to API rate limits or key issues")
        print("💡 This is expected with the demo API key")
    
    # Show current library
    print("\n📚 Current Music Library:")
    files = manager.get_available_music_files()
    for file in files:
        print(f"  🎵 {file['display_name']} ({file['duration']:.0f}s)")

if __name__ == "__main__":
    test_pixabay_download() 