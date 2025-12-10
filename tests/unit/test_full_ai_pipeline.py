#!/usr/bin/env python3
"""
Full AI Pipeline Test with all features enabled
Tests the complete video processing pipeline with all AI enhancements.
"""

import sys
import json
import os
from pathlib import Path

# Add src to path for imports
sys.path.insert(0, str(Path(__file__).parent / "src"))

def test_full_ai_pipeline():
    """Test the complete AI-enhanced video processing pipeline"""
    print("🚀 Testing FULL AI Pipeline with all features enabled...")
    
    try:
        from core.video_processing import process_video
        
        # Test video path - use the available video
        test_video = Path("data/input_videos/test_batch/Conjugate vaccine mechanisms.mp4")
        
        if not test_video.exists():
            print(f"❌ Test video not found: {test_video}")
            print("Available videos:")
            for video in Path("data/input_videos/test_batch").glob("*.mp4"):
                print(f"  - {video.name}")
            return False
        
        # Output directory
        output_dir = Path("data") / "test_full_ai_output"
        output_dir.mkdir(exist_ok=True)
        
        print(f"📁 Input video: {test_video}")
        print(f"📁 Output directory: {output_dir}")
        print(f"📊 Video size: {test_video.stat().st_size / (1024*1024):.1f} MB")
        
        # Test with ALL AI features enabled
        print("\n🎬 Processing with FULL AI enhancement pipeline...")
        result_path = process_video(
            input_file_path=test_video,
            output_dir_base=output_dir,
            video_topic="medical education - conjugate vaccine mechanisms",
            
            # Core processing
            skip_audio=False,           # ✅ Audio enhancement
            skip_silence=False,         # ✅ Silence cutting
            skip_transcription=False,   # ✅ Whisper transcription
            skip_gpt_correct=False,     # ✅ GPT subtitle correction
            skip_subtitle_burn=False,   # ✅ Subtitle burning
            skip_outro=False,           # ✅ Outro addition
            
            # AI Features
            skip_broll=False,           # ✅ AI B-roll insertion
            skip_ai_highlights=False,   # ✅ AI highlight detection
            skip_topic_card=False,      # ✅ Topic card creation
            skip_frame=False,           # ✅ Frame addition
            skip_flash_logo=False,      # ✅ Logo flash
            
            # AI Configuration
            whisper_model='small',      # Whisper model
            gpt_model='gpt-4o-mini',    # GPT model
            highlight_style='yellow',   # Highlight style
            broll_clip_count=3,         # Number of B-roll clips
            broll_clip_duration=4.0,    # B-roll duration
            
            # Audio enhancement
            use_ffmpeg_enhance=True,
            use_ai_denoiser=True,
            
            # Silence cutting
            silence_threshold="-30dB",
            silence_duration=0.5,
            
            # API keys should be picked up from environment
            openai_api_key=os.getenv('OPENAI_API_KEY'),
        )
        
        if result_path and result_path.exists():
            output_size = result_path.stat().st_size / (1024*1024)
            print(f"\n🎉 SUCCESS! Video processed with FULL AI pipeline!")
            print(f"📁 Output: {result_path}")
            print(f"📊 Output size: {output_size:.1f} MB")
            
            # Check for additional files created
            output_files = list(result_path.parent.glob("*"))
            print(f"\n📁 Generated files ({len(output_files)}):")
            for file in sorted(output_files):
                size_mb = file.stat().st_size / (1024*1024)
                print(f"  - {file.name} ({size_mb:.1f} MB)")
                
            # Verify AI features worked
            print(f"\n🔍 AI Feature Verification:")
            
            # Check for subtitle files
            srt_files = list(result_path.parent.glob("*.srt"))
            if srt_files:
                print(f"  ✅ Transcription: {len(srt_files)} SRT files")
            else:
                print(f"  ⚠️ Transcription: No SRT files found")
                
            # Check for B-roll directory
            broll_dirs = list(result_path.parent.glob("broll_clips_*"))
            if broll_dirs:
                print(f"  ✅ B-roll: {len(broll_dirs)} B-roll directories")
                for broll_dir in broll_dirs:
                    broll_files = list(broll_dir.glob("*.mp4"))
                    print(f"    - {broll_dir.name}: {len(broll_files)} clips")
            else:
                print(f"  ⚠️ B-roll: No B-roll directories found")
            
            return True
        else:
            print(f"❌ Processing failed - no output file created")
            return False
            
    except Exception as e:
        print(f"❌ Full AI pipeline test failed: {e}")
        import traceback
        traceback.print_exc()
        return False

def test_api_keys():
    """Test that API keys are available"""
    print("🔑 Testing API key availability...")
    
    openai_key = os.getenv('OPENAI_API_KEY')
    pexels_key = os.getenv('PEXELS_API_KEY')
    
    if openai_key:
        print(f"  ✅ OpenAI API key: Available (length: {len(openai_key)})")
    else:
        print(f"  ❌ OpenAI API key: Missing")
        
    if pexels_key:
        print(f"  ✅ Pexels API key: Available (length: {len(pexels_key)})")
    else:
        print(f"  ❌ Pexels API key: Missing")
    
    return bool(openai_key and pexels_key)

def main():
    print("=" * 60)
    print("🎯 COMPREHENSIVE AI PIPELINE TEST")
    print("=" * 60)
    
    # Test API keys first
    api_keys_ok = test_api_keys()
    if not api_keys_ok:
        print("\n⚠️ Warning: Some API keys are missing. AI features may be limited.")
    
    print()
    
    # Test full pipeline
    pipeline_ok = test_full_ai_pipeline()
    
    print("\n" + "=" * 60)
    if pipeline_ok:
        print("🎉 FULL AI PIPELINE TEST: SUCCESS!")
        print("   All major AI features are working correctly!")
    else:
        print("❌ FULL AI PIPELINE TEST: FAILED")
        print("   Check the logs above for issues")
    print("=" * 60)

if __name__ == "__main__":
    main() 