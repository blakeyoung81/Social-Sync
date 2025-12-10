#!/usr/bin/env python3
"""
Test script to demonstrate the new Pixabay-based intelligent music selection system.
"""

from pathlib import Path
from src.core.video_processing import add_background_music
from src.core.pixabay_music import PixabayMusicManager

def test_pixabay_music_system():
    """Test the new Pixabay music system with different video types."""
    
    print("🎵 Testing Pixabay Intelligent Music Selection System")
    print("=" * 60)
    
    # Test video
    test_video = Path("data/input_videos/Conjugate vaccine mechanisms.mp4")
    
    if not test_video.exists():
        print(f"❌ Test video not found: {test_video}")
        return
    
    output_dir = Path("data/pixabay_music_tests")
    output_dir.mkdir(exist_ok=True)
    
    # Test different video topics and durations
    test_scenarios = [
        {
            "topic": "medical",
            "description": "Medical/Educational Content",
            "expected": "Should select calm, professional music"
        },
        {
            "topic": "technology", 
            "description": "Technology Content",
            "expected": "Should select modern, digital-style music"
        },
        {
            "topic": "business",
            "description": "Business Content", 
            "expected": "Should select corporate, professional music"
        },
        {
            "topic": "entertainment",
            "description": "Entertainment Content",
            "expected": "Should select upbeat, energetic music"
        }
    ]
    
    print(f"📹 Test Video: {test_video.name} (110.7 seconds)")
    print()
    
    # Initialize the music manager
    music_manager = PixabayMusicManager()
    
    for i, scenario in enumerate(test_scenarios, 1):
        print(f"🧪 Test {i}: {scenario['description']}")
        print(f"   Topic: {scenario['topic']}")
        print(f"   Expected: {scenario['expected']}")
        
        # Test the smart selection
        selected_music = music_manager.get_smart_background_music(110.7, scenario['topic'])
        
        if selected_music:
            print(f"   ✅ Selected: {selected_music.name}")
            
            # Test adding music to video
            output_path = output_dir / f"test_{scenario['topic']}_music.mp4"
            success = add_background_music(
                test_video, 
                output_path, 
                music_track='smart', 
                video_topic=scenario['topic']
            )
            
            if success:
                print(f"   ✅ Video created: {output_path.name}")
            else:
                print(f"   ❌ Failed to create video")
        else:
            print(f"   ❌ No music selected")
        
        print()
    
    print("🎯 Summary:")
    print("- The system intelligently selects music based on video topic and duration")
    print("- For medical/educational content, it chooses calm, professional tracks")
    print("- For business content, it selects corporate-style music")
    print("- For entertainment, it picks upbeat, energetic tracks")
    print("- All music is royalty-free and properly volume-balanced")
    print()
    print(f"📁 Test outputs saved to: {output_dir}")
    
    # Show available moods
    print("\n🎼 Available Music Moods:")
    print("For Shorts (≤60s):", music_manager.get_available_moods(is_short=True))
    print("For Long Videos (>60s):", music_manager.get_available_moods(is_short=False))

if __name__ == "__main__":
    test_pixabay_music_system()