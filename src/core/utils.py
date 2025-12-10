#!/usr/bin/env python3
"""
Utility functions for video and audio processing.
"""

import subprocess
import logging
import shlex
import json
from pathlib import Path

logger = logging.getLogger(__name__)

def _run_command(command, operation_name="Command"):
    """Runs a command using subprocess and logs verbosely."""
    logger.info(f"    [{operation_name}] Executing: {' '.join(shlex.quote(str(c)) for c in command)}")
    try:
        process = subprocess.Popen(command, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, universal_newlines=True)
        stdout, stderr = process.communicate()
        
        if process.returncode == 0:
            logger.info(f"    [{operation_name}] Command successful.")
            return stdout
        else:
            logger.error(f"    [{operation_name}] Command failed with exit code {process.returncode}.")
            logger.error(f"    [{operation_name} Full stderr]:\n{stderr}")
            return None
    except FileNotFoundError:
        logger.error(f"    [{operation_name}] Error: Command not found. Ensure it is installed and in your PATH.")
        return None
    except Exception as e:
        logger.error(f"    [{operation_name}] An error occurred: {e}", exc_info=True)
        return None

def get_video_duration(video_path: Path) -> float:
    """Get the duration of a video file in seconds using ffprobe."""
    command = [
        "ffprobe",
        "-v", "error",
        "-show_entries", "format=duration",
        "-of", "default=noprint_wrappers=1:nokey=1",
        str(video_path)
    ]
    duration_str = _run_command(command, "Get Video Duration")
    if duration_str:
        try:
            return float(duration_str)
        except (ValueError, TypeError):
            logger.error(f"Could not parse duration from ffprobe output: {duration_str}")
    return 0.0

def get_video_bitrate(video_path: Path) -> int:
    """Get the video bitrate in bits/s using ffprobe."""
    command = [
        "ffprobe",
        "-v", "error",
        "-select_streams", "v:0",
        "-show_entries", "stream=bit_rate",
        "-of", "default=noprint_wrappers=1:nokey=1",
        str(video_path)
    ]
    bitrate_str = _run_command(command, "Get Video Bitrate")
    if bitrate_str and bitrate_str.strip().isdigit():
        return int(bitrate_str)
    # Fallback for streams where bit_rate is N/A
    logger.warning(f"Could not determine video bitrate for {video_path.name}. Falling back to format bitrate.")
    command = [
        "ffprobe", "-v", "error", "-show_entries", "format=bit_rate",
        "-of", "default=noprint_wrappers=1:nokey=1", str(video_path)
    ]
    format_bitrate_str = _run_command(command, "Get Format Bitrate")
    if format_bitrate_str and format_bitrate_str.strip().isdigit():
        return int(format_bitrate_str)
    logger.error(f"Could not determine any bitrate for {video_path.name}.")
    return 0

def get_audio_bitrate(video_path: Path) -> int:
    """Get the audio bitrate in bits/s using ffprobe."""
    command = [
        "ffprobe",
        "-v", "error",
        "-select_streams", "a:0",
        "-show_entries", "stream=bit_rate",
        "-of", "default=noprint_wrappers=1:nokey=1",
        str(video_path)
    ]
    bitrate_str = _run_command(command, "Get Audio Bitrate")
    if bitrate_str and bitrate_str.strip().isdigit():
        return int(bitrate_str)
    logger.warning(f"Could not determine audio bitrate for {video_path.name}. Returning 0.")
    return 0

def get_frame_rate(video_path: Path) -> float:
    """Get the frame rate of a video using ffprobe."""
    command = [
        "ffprobe",
        "-v", "error",
        "-select_streams", "v:0",
        "-show_entries", "stream=r_frame_rate",
        "-of", "default=noprint_wrappers=1:nokey=1",
        str(video_path)
    ]
    frame_rate_str = _run_command(command, "Get Frame Rate")
    if frame_rate_str:
        try:
            num, den = map(int, frame_rate_str.split('/'))
            return num / den if den != 0 else 0.0
        except (ValueError, ZeroDivisionError):
            logger.error(f"Could not parse frame rate from ffprobe output: {frame_rate_str}")
    return 0.0 