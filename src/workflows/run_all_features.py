#!/usr/bin/env python3
"""
Test script to run the full video processing pipeline with all features enabled.
This script is designed for debugging and verification purposes.
"""

import os
import sys
import logging
from pathlib import Path
from dotenv import load_dotenv

# Add the src directory to the Python path to allow for absolute imports
sys.path.insert(0, str(Path(__file__).parent.parent))

# Load environment variables from .env file
load_dotenv()

from core.video_processing import process_video
from core.config import BASE_DIR, LOG_LEVEL, LOG_FORMAT

# --- Logging Setup ---
logging.basicConfig(level=LOG_LEVEL, format=LOG_FORMAT)
logger = logging.getLogger(__name__)

def run_test_pipeline():
    """
    Executes the video processing pipeline with a predefined set of parameters
    to test all integrated features.
    """
    logger.info("🚀 Starting full video processing pipeline test...")

    # --- Configuration ---
    # Define the input video and output directory
    input_video_name = "Conjugate vaccine mechanisms.mp4"
    input_video_path = BASE_DIR / "data" / "input_videos" / input_video_name
    output_dir_base = BASE_DIR / "data" / "test_outputs"

    # Create the output directory if it doesn't exist
    output_dir_base.mkdir(parents=True, exist_ok=True)
    logger.info(f"Output directory set to: {output_dir_base}")

    if not input_video_path.exists():
        logger.error(f"❌ Input video not found at: {input_video_path}")
        logger.error("Please make sure the video 'Conjugate vaccine mechanisms.mp4' is in the 'data/input_videos' directory.")
        return

    # --- Feature Flags and Parameters ---
    # This dictionary defines all the parameters that will be passed to the process_video function.
    # We are enabling all the features we've been working on.
    processing_params = {
        "video_topic": "Medical Science: Conjugate Vaccines",
        "use_ffmpeg_enhance": True,
        "use_ai_denoiser": True,
        "skip_silence": False,
        "silence_threshold": "-30dB",
        "skip_transcription": False,
        "whisper_model": "small",
        "skip_gpt_correct": False,
        "gpt_model": "gpt-4o-mini",
        "skip_ai_highlights": False,
        "highlight_style": "yellow",
        "skip_subtitle_burn": False,
        "skip_broll": False,
        "broll_clip_count": 5,
        "broll_clip_duration": 4.0,
        "broll_transition_style": "fade",
        "skip_topic_card": False,
        "skip_frame": False,
        "skip_flash_logo": False,
        "skip_dynamic_zoom": False,
        "zoom_intensity": "subtle",
        "zoom_frequency": "medium",
        "skip_background_music": False,
        "music_track": "cinematic",  # A good default for a medical topic
        "skip_sound_effects": False,  # Re-enabled after fixing the AttributeError
        "sound_effect_pack": "sound-effects",
        "skip_outro": False,
        # API keys will be picked up from the environment by the processing function
        "openai_api_key": os.getenv("OPENAI_API_KEY"),
        "pexels_api_key": os.getenv("PEXELS_API_KEY"),
        "pixabay_api_key": os.getenv("PIXABAY_API_KEY"),
    }

    logger.info("Processing parameters:")
    for key, value in processing_params.items():
        logger.info(f"  - {key}: {value}")
    
    try:
        # --- Execute Processing ---
        logger.info(f"Processing video: {input_video_path.name}")
        final_video_path = process_video(
            input_file_path=input_video_path,
            output_dir_base=output_dir_base,
            **processing_params
        )

        if final_video_path and final_video_path.exists():
            logger.info("✅ Pipeline completed successfully!")
            logger.info(f"🎬 Final video saved at: {final_video_path}")
        else:
            logger.error("❌ Pipeline finished, but the final video path was not returned or does not exist.")

    except Exception as e:
        logger.critical("💥 A critical error occurred during the video processing pipeline.", exc_info=True)

if __name__ == "__main__":
    run_test_pipeline() 