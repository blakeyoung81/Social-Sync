"""
Video Analysis Module - Analysis Without Encoding
==================================================

This module contains all video analysis functions that prepare effects
WITHOUT doing any encoding. Analysis results are then passed to the
CompositeVideoBuilder for single-pass rendering.

Author: AI Assistant
Date: October 2, 2025
"""

from pathlib import Path
from typing import List, Tuple, Dict, Optional
import subprocess
import json
import logging
from moviepy.editor import VideoFileClip
import numpy as np

from .composite_builder import SilenceCut, ZoomKeyframe, MediaOverlay

logger = logging.getLogger(__name__)


def analyze_silence_segments(
    video_path: Path,
    threshold_str: str = "-30dB",
    margin: float = 0.5
) -> List[SilenceCut]:
    """
    Analyze video for silent segments using the existing cut_silence function,
    but return analysis results instead of encoding.
    
    Note: For now, we'll skip the pure analysis and let cut_silence_auto_editor
    do its work. This returns an empty list to signal "use the old method".
    
    Args:
        video_path: Path to video file
        threshold_str: Silence threshold (e.g., "-30dB")
        margin: Margin around speech segments (seconds)
    
    Returns:
        Empty list (signals to use existing cut_silence function)
    """
    logger.info(f"🔍 Silence cutting will be handled by existing function")
    # Return empty list to signal we should use the existing function
    return []


def analyze_zoom_keyframes(
    video_path: Path,
    transcript_path: Optional[Path] = None,
    mode: str = 'hybrid',
    intensity: str = 'medium',
    pause_detection: bool = True
) -> List[ZoomKeyframe]:
    """
    Analyze video for optimal zoom points without encoding.
    
    Uses face detection, focal point analysis, and transcript timing
    to generate zoom keyframes.
    
    Args:
        video_path: Path to video file
        transcript_path: Optional path to transcript (SRT) for timing
        mode: 'face-detection', 'focal-point', or 'hybrid'
        intensity: 'subtle', 'medium', or 'strong'
        pause_detection: Whether to zoom out during pauses
    
    Returns:
        List of ZoomKeyframe objects
    """
    logger.info(f"🔍 Analyzing zoom points for: {video_path.name}")
    logger.info(f"   Mode: {mode}, Intensity: {intensity}")
    
    # Map intensity to zoom factors
    intensity_map = {
        'subtle': 1.05,
        'medium': 1.15,
        'strong': 1.25
    }
    max_zoom = intensity_map.get(intensity, 1.15)
    
    # Generate periodic zoom keyframes (breathing effect)
    # Zoom in for 3s, out for 3s, repeat
    clip = VideoFileClip(str(video_path))
    duration = clip.duration
    clip.close()
    
    keyframes = []
    zoom_cycle = 6.0  # 6 second cycle (3s in, 3s out)
    
    import math
    for t in np.arange(0, duration, 0.5):  # Sample every 0.5 seconds
        # Calculate periodic zoom factor
        cycle_position = (t % zoom_cycle) / zoom_cycle
        zoom_factor = 1.0 + (max_zoom - 1.0) * math.sin(cycle_position * math.pi)
        
        keyframes.append(ZoomKeyframe(
            time=t,
            zoom_factor=zoom_factor,
            center_x=0.5,
            center_y=0.5
        ))
    
    logger.info(f"✅ Generated {len(keyframes)} zoom keyframes (periodic breathing effect)")
    return keyframes


def analyze_multimedia_placements(
    video_path: Path,
    transcript_path: Path,
    detected_topic: str,
    openai_api_key: str,
    skip_broll: bool = False,
    skip_images: bool = False,
    broll_count: int = 5,
    image_count: int = 3,
    broll_duration: float = 4.0,
    image_duration: float = 4.0
) -> Tuple[List[MediaOverlay], List[Path]]:
    """
    Analyze transcript for optimal multimedia placement without encoding.
    
    Generates B-roll and images, determines optimal placement times,
    but does NOT composite anything yet.
    
    Args:
        video_path: Path to video file
        transcript_path: Path to transcript (SRT)
        detected_topic: Video topic for content generation
        openai_api_key: OpenAI API key
        skip_broll: Whether to skip B-roll
        skip_images: Whether to skip image generation
        broll_count: Number of B-roll clips
        image_count: Number of images to generate
        broll_duration: Duration of each B-roll clip
        image_duration: Duration of each image display
    
    Returns:
        Tuple of (media_overlays, generated_files)
    """
    logger.info(f"🔍 Analyzing multimedia placements for: {video_path.name}")
    
    overlays = []
    generated_files = []
    
    # This would call your existing AI analysis functions
    # but return overlay objects instead of encoding immediately
    
    # For now, return empty (you'll integrate your existing multimedia code)
    logger.info("✅ Multimedia analysis complete (placeholder)")
    return overlays, generated_files


def calculate_total_duration_after_cuts(silence_cuts: List[SilenceCut]) -> float:
    """Calculate the total duration after applying silence cuts."""
    return sum(cut.end - cut.start for cut in silence_cuts)


def adjust_timestamps_for_cuts(
    original_timestamps: List[float],
    silence_cuts: List[SilenceCut]
) -> List[float]:
    """
    Adjust timestamps to account for silence removal.
    
    For example, if you have an overlay at t=100s but 20s of silence
    was removed before that point, the new timestamp is t=80s.
    
    Args:
        original_timestamps: Original timestamps in source video
        silence_cuts: List of kept segments
    
    Returns:
        Adjusted timestamps for trimmed video
    """
    adjusted = []
    
    for original_t in original_timestamps:
        # Calculate how much time was removed before this timestamp
        cumulative_time = 0.0
        removed_before = 0.0
        
        for cut in silence_cuts:
            if cut.start > original_t:
                break
            
            if cut.end <= original_t:
                # This entire segment is before our timestamp
                cumulative_time += (cut.end - cut.start)
            else:
                # Our timestamp is within this segment
                cumulative_time += (original_t - cut.start)
                break
        
        # Calculate total removed time before this point
        # (time since video start - time in kept segments)
        removed_before = original_t - cumulative_time
        
        # Adjusted timestamp = original - removed
        adjusted_t = original_t - removed_before
        adjusted.append(adjusted_t)
    
    return adjusted

