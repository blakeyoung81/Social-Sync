#!/usr/bin/env python3
"""
Test script for the new video processing features:
- Background Music
- Sound Effects  
- Dynamic Zoom
"""
import sys
from pathlib import Path
from src.core.video_processing import add_background_music, add_sound_effects, apply_dynamic_zoom

def test_new_features():
    """Test the new video processing features with a sample video."""
    
    # Check if we have any test videos
    input_videos_dir = Path("data/input_videos")
    test_videos = list(input_videos_dir.glob("*.mp4"))
    
    # Also check subdirectories
    if not test_videos:
        test_videos = list(input_videos_dir.glob("**/*.mp4"))
    
    if not test_videos:
        print("❌ No test videos found in data/input_videos/")
        print("Please add a test video file to test the new features.")
        return False
    
    test_video = test_videos[0]
    print(f"🎬 Using test video: {test_video.name}")
    
    # Create output directory
    output_dir = Path("data/test_new_features_output")
    output_dir.mkdir(parents=True, exist_ok=True)
    
    # Test 1: Dynamic Zoom
    print("\n🔍 Testing Dynamic Zoom...")
    zoom_output = output_dir / f"zoomed_{test_video.stem}.mp4"
    try:
        if apply_dynamic_zoom(test_video, zoom_output, intensity='medium', frequency='medium'):
            print(f"✅ Dynamic zoom test passed! Output: {zoom_output}")
        else:
            print("❌ Dynamic zoom test failed")
    except Exception as e:
        print(f"❌ Dynamic zoom test error: {e}")
    
    # Test 2: Background Music
    print("\n🎵 Testing Background Music...")
    music_output = output_dir / f"music_{test_video.stem}.mp4"
    try:
        if add_background_music(test_video, music_output, music_track='lofi-chill'):
            print(f"✅ Background music test passed! Output: {music_output}")
        else:
            print("❌ Background music test failed (expected - no real audio files)")
    except Exception as e:
        print(f"❌ Background music test error: {e}")
    
    # Test 3: Sound Effects (requires transcript)
    print("\n🔊 Testing Sound Effects...")
    sfx_output = output_dir / f"sfx_{test_video.stem}.mp4"
    
    # Create a dummy transcript file for testing
    dummy_transcript = output_dir / f"{test_video.stem}.srt"
    dummy_transcript.write_text("""1
00:00:01,000 --> 00:00:03,000
This is a test subtitle

2
00:00:05,000 --> 00:00:07,000
Another test subtitle
""")
    
    try:
        if add_sound_effects(test_video, sfx_output, dummy_transcript, effect_pack='basic-pops'):
            print(f"✅ Sound effects test passed! Output: {sfx_output}")
        else:
            print("❌ Sound effects test failed (expected - no ASS file)")
    except Exception as e:
        print(f"❌ Sound effects test error: {e}")
    
    print(f"\n📁 Test outputs saved to: {output_dir}")
    return True

if __name__ == "__main__":
    print("🧪 Testing New Video Processing Features")
    print("=" * 50)
    
    if test_new_features():
        print("\n🎉 Feature testing completed!")
    else:
        print("\n💥 Feature testing failed!")
        sys.exit(1)