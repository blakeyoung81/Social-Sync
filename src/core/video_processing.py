#!/usr/bin/env python3
import os
import subprocess
import shutil
# Ensure you have installed openai-whisper: pip install openai-whisper
# Ensure you have ffmpeg installed and in your PATH for Whisper and direct calls.
# For Whisper, you might also need rust if installing from source or on some systems.
import whisper 
# Ensure you have installed moviepy: pip install moviepy
from moviepy.editor import VideoFileClip, AudioFileClip, CompositeVideoClip, concatenate_videoclips, ColorClip, TextClip, AudioClip, ImageClip, concatenate_audioclips, CompositeAudioClip
from moviepy.video.tools.subtitles import SubtitlesClip
from moviepy.config import change_settings
from moviepy.video import fx as vfx

# Configure ImageMagick for MoviePy (will be logged later after logging is setup)
try:
    change_settings({"IMAGEMAGICK_BINARY": "/opt/homebrew/bin/convert"})
    IMAGEMAGICK_CONFIGURED = True
except Exception as e:
    IMAGEMAGICK_CONFIGURED = False
    IMAGEMAGICK_ERROR = str(e)
import argparse # NEW IMPORT
import sys # NEW IMPORT
import openai
import shlex
import random
import logging # Added for better logging
from pathlib import Path # Added for path management
import re # For regex in loudnorm parsing and ASS patching
import json # For loudnorm parsing
import tempfile
from .utils import get_video_duration, get_audio_bitrate, get_video_bitrate, get_frame_rate
from .sound_effects import SoundEffects
from .advanced_editing import detect_bad_takes, remove_bad_takes, apply_enhanced_auto_zoom
import uuid
import ffmpeg
import torch
from moviepy.editor import (
    VideoFileClip,
    AudioFileClip,
    CompositeVideoClip,
    TextClip,
    AudioClip,
    ImageClip,
    CompositeAudioClip,
    VideoFileClip,
    AudioFileClip,
    CompositeVideoClip,
    TextClip,
    AudioClip,
    ImageClip,
    CompositeAudioClip
)
from typing import Optional

# Define available styles for random selection
FRAME_STYLES = [
    'rainbow', 'medical-blue', 'gradient-purple', 'black', 'white', 
    'gold', 'silver', 'neon', 'subtle-shadow', 'double-line', 
    'rounded-corners', 'professional', 'educational'
]

TRANSITION_STYLES = ['fade', 'none', 'slide', 'zoom']
HIGHLIGHT_STYLES = ['yellow', 'cyan', 'lime']
ZOOM_INTENSITIES = ['subtle', 'medium', 'strong']
ZOOM_FREQUENCIES = ['low', 'medium', 'high']
CAPTION_STYLES = ['social', 'basic', 'animated']
CAPTION_ANIMATIONS = ['fade', 'slide', 'zoom', 'bounce']
TOPIC_CARD_STYLES = ['medical', 'educational', 'professional', 'minimal']
OUTRO_STYLES = ['default', 'animated', 'custom']

# Conditional import for speechbrain
try:
    from speechbrain.inference.separation import SepformerSeparation
    SPEECHBRAIN_AVAILABLE = True
except ImportError:
    SPEECHBRAIN_AVAILABLE = False
    SepformerSeparation = None

# Configuration from new config system
from .config import (
    OPENAI_API_KEY,
    PEXELS_API_KEY,
    PIXABAY_API_KEY,
    SOURCE_MOVIES_DIR,
    BASE_OUTPUT_DIR,
    ASSETS_DIR,
    TEMP_IMAGES_DIR, # For subtitle correction temp files if any
    OUTRO_DIR_1080x1920,
    OUTRO_DIR_1920x1080,
    LOG_LEVEL,
    LOG_FORMAT
)
from .pixabay_music import PixabayMusicManager

# Pexels API import for intelligent B-roll
try:
    from pexels_api import API as PexelsAPI
except ImportError:
    PexelsAPI = None

# Requests for direct API calls
import requests

# Setup logger for this module
logger = logging.getLogger(__name__)

# Log ImageMagick configuration result
if 'IMAGEMAGICK_CONFIGURED' in globals():
    if IMAGEMAGICK_CONFIGURED:
        logger.info("  [Config] ImageMagick path configured for MoviePy")
    else:
        logger.warning(f"  [Config] Could not configure ImageMagick path: {IMAGEMAGICK_ERROR}")

def send_step_progress(step: str, progress: int, total: int, message: str = ""):
    """Send step progress to frontend in JSON format."""
    percentage = int((progress / total) * 100) if total > 0 else 0
    progress_data = {
        "step": step,
        "message": message,
        "percentage": percentage,
        "current_step": progress,
        "total_steps": total
    }
    # The frontend expects a 'PROGRESS:' prefix followed by a JSON string
    print(f"PROGRESS:{json.dumps(progress_data)}")
    logger.info(f"📊 [{progress}/{total}] {step}: {message} ({percentage}%)")

# BasicConfig should ideally be called once at the application entry point.
# If other modules also call it, it might lead to unexpected behavior or no effect after the first call.
# For now, we'll leave it, but consider moving to a central logging setup later.
logging.basicConfig(level=LOG_LEVEL, format=LOG_FORMAT)

# --- Configuration (Now derived from args or defaults if needed) ---
# These will be set in main based on the output directory base
EDITED_VIDEOS_DIR = None
TEMP_PROCESSING_DIR = None
PROCESSED_ORIGINALS_DIR = None

# --- Configuration ---
# Assuming your script is in 'Youtube Uploader' and 'Movies' is at the same level or one level up.
# Adjust these paths if your structure is different.
WORKSPACE_DIR = os.path.dirname(os.path.abspath(__file__))

print(f"Source Movies Directory: {SOURCE_MOVIES_DIR}")

# --- Helper Functions (Adapted Logging and Paths) ---

def print_section_header(title):
    """Prints a formatted section header to the console."""
    border = "=" * 70
    logger.info(border)
    logger.info(f"===== {title.upper()} ".ljust(69, "="))
    logger.info(border)

def _run_ffmpeg_command(command, operation_name="FFmpeg operation"):
    """Runs an FFmpeg command using subprocess and logs verbosely."""
    logger.info(f"    [{operation_name}] Executing: {' '.join(shlex.quote(str(c)) for c in command)}")
    try:
        process = subprocess.Popen(command, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, universal_newlines=True)
        stderr_output = ""
        for line in process.stderr:
            stderr_output += line
            logger.debug(f"      [{operation_name} stderr] {line.strip()}")
        process.wait()
        if process.returncode == 0:
            logger.info(f"    [{operation_name}] Command successful.")
            return True
        else:
            logger.error(f"    [{operation_name}] Command failed with exit code {process.returncode}.")
            logger.error(f"    [{operation_name} Full stderr]:\n{stderr_output}")
            return False
    except FileNotFoundError:
        logger.error(f"    [{operation_name}] Error: 'ffmpeg' command not found. Ensure FFmpeg is installed and in your PATH.")
        return False
    except Exception as e:
        logger.error(f"    [{operation_name}] An error occurred: {e}", exc_info=True)
        return False

def enhance_audio(audio_path, use_ffmpeg, use_ai):
    print(f"🔊 [AUDIO] Starting audio enhancement - FFmpeg: {use_ffmpeg}, AI: {use_ai}")
    logger.info(f"🔊 [AUDIO] Processing: {audio_path}")
    
    if not use_ffmpeg and not use_ai:
        print("🔊 [AUDIO] No enhancement requested, skipping")
        return audio_path
        
    print_section_header("Standard Audio Enhancement (FFmpeg)")
    
    temp_dir = Path(tempfile.gettempdir())
    current_audio_path = Path(audio_path)
    
    if use_ffmpeg:
        print_section_header("Standard Audio Enhancement (FFmpeg)")
        ffmpeg_output_path = temp_dir / f"ffmpeg_enhanced_{uuid.uuid4()}.aac"
        try:
            (
                ffmpeg
                .input(str(current_audio_path))
                .output(str(ffmpeg_output_path), af='loudnorm=I=-16:TP=-1.5:LRA=11,highpass=f=200,lowpass=f=3000', ar='44100')
                .overwrite_output()
                .run(capture_stdout=True, capture_stderr=True)
            )
            logger.info(f"FFmpeg enhancement successful. Output: {ffmpeg_output_path}")
            current_audio_path = ffmpeg_output_path
        except ffmpeg.Error as e:
            logger.error(f"Error during FFmpeg audio enhancement: {e.stderr.decode()}")
            return str(current_audio_path)
            
    if use_ai:
        if not SPEECHBRAIN_AVAILABLE:
            logger.warning("AI audio denoising requested but SpeechBrain is not available. Skipping AI enhancement.")
        else:
            print_section_header("AI Audio Denoising (SpeechBrain)")
            ai_output_path = temp_dir / f"ai_denoised_{uuid.uuid4()}.wav"
            try:
                # Use the new SpeechBrain 1.0 API for speech enhancement
                model = SepformerSeparation.from_hparams(
                    source="speechbrain/sepformer-dns4-16k-enhancement",
                    savedir=str(temp_dir / 'speechbrain_models'),
                    run_opts={"device": "cuda" if torch.cuda.is_available() else "cpu"}
                )
                
                # separate_file returns a tensor (batch, samples, sources)
                enhanced_waveform = model.separate_file(str(current_audio_path))
                
                # For enhancement, we take the first source
                enhanced_source = enhanced_waveform[:, :, 0].squeeze(0).cpu()

                # Save the enhanced audio to a new file
                from speechbrain.dataio.dataio import write_audio
                write_audio(str(ai_output_path), enhanced_source, 16000)
                
                logger.info(f"AI denoising successful. Output: {ai_output_path}")
                current_audio_path = ai_output_path
            except Exception as e:
                logger.error(f"Error during AI audio enhancement: {e}", exc_info=True)
                # Fallback to the current audio path if AI enhancement fails
                return str(current_audio_path)

    return str(current_audio_path)

def analyze_audio_levels(input_path: Path) -> float:
    """
    Analyze audio levels to determine optimal silence threshold automatically.
    Returns a smart threshold value based on the audio content.
    """
    try:
        import librosa
        import numpy as np
        
        # Load audio file
        audio, sr = librosa.load(str(input_path))
        
        # Calculate RMS energy
        rms = librosa.feature.rms(y=audio)[0]
        
        # Find non-silent segments (above 10th percentile)
        non_silent_threshold = np.percentile(rms, 10)
        non_silent_rms = rms[rms > non_silent_threshold]
        
        # Calculate smart threshold as percentage of average speech level
        if len(non_silent_rms) > 0:
            speech_level = np.mean(non_silent_rms)
            smart_threshold = min(0.8, max(0.1, speech_level * 0.3))  # 30% of speech level
            logger.info(f"  [Smart Silence] Detected speech level: {speech_level:.3f}, smart threshold: {smart_threshold:.3f}")
            return smart_threshold
        else:
            logger.warning("  [Smart Silence] Could not detect speech levels, using default")
            return 0.07
            
    except ImportError:
        logger.warning("  [Smart Silence] librosa not available, install with: pip install librosa")
        return 0.07
    except Exception as e:
        logger.warning(f"  [Smart Silence] Audio analysis failed: {e}")
        return 0.07

def cut_silence_auto_editor(input_path: Path, output_path: Path, threshold_str: str, margin: float = 0.2, smart_detection: bool = False) -> bool:
    """Cuts silent segments from a video using the auto-editor CLI tool."""
    logger.info(f"  [Silence Cut] Cutting silences from: {input_path.name} with auto-editor")

    # auto-editor v28+ uses --edit parameter with audio:threshold syntax
    if smart_detection:
        auto_editor_threshold = analyze_audio_levels(input_path)
        logger.info(f"  [Silence Cut] Using smart auto-editor threshold ({auto_editor_threshold:.3f})")
    else:
        # Convert FFmpeg dB threshold to auto-editor decimal format
        try:
            if 'dB' in threshold_str:
                # Convert dB to linear scale for auto-editor
                db_value = float(threshold_str.replace('dB', ''))
                # Convert dB to linear: -40dB ≈ 0.01, -30dB ≈ 0.032, -20dB ≈ 0.1
                auto_editor_threshold = 10 ** (db_value / 20)
                logger.info(f"  [Silence Cut] Converted FFmpeg threshold '{threshold_str}' to auto-editor threshold ({auto_editor_threshold:.4f})")
            else:
                # If it's already a decimal, use it directly
                auto_editor_threshold = float(threshold_str)
                logger.info(f"  [Silence Cut] Using provided threshold ({auto_editor_threshold:.4f})")
        except (ValueError, TypeError):
            auto_editor_threshold = 0.035  # Use better default
            logger.warning(f"  [Silence Cut] Invalid threshold format '{threshold_str}', using default ({auto_editor_threshold})")

    # Try to find auto-editor in the virtual environment or PATH
    auto_editor_path = shutil.which("auto-editor")
    if not auto_editor_path:
        # Fallback to checking common virtual environment locations
        import sys
        venv_path = Path(sys.executable).parent / "auto-editor"
        if venv_path.exists():
            auto_editor_path = str(venv_path)
        else:
            logger.error("  [Silence Cut] auto-editor not found in PATH or virtual environment")
            logger.error("  [Silence Cut] Please install auto-editor: pip install auto-editor")
            # Copy original file and return False to continue pipeline
            shutil.copy(str(input_path), str(output_path))
            return False

    command = [
        auto_editor_path, str(input_path),
        "--output-file", str(output_path),
        "--margin", f"{margin}s",
        "--edit", f"audio:{auto_editor_threshold}",
        "--video-codec", "libx264",
        "--audio-codec", "aac",
        "--no-open"
    ]
    
    logger.info(f"    [auto-editor] Running command: {' '.join(command)}")
    try:
        result = subprocess.run(command, capture_output=True, text=True, check=True)
        logger.info("    [auto-editor] Silence cutting successful.")
        logger.debug(f"    [auto-editor] stdout: {result.stdout}")
        return True
    except subprocess.CalledProcessError as e:
        logger.error(f"    [auto-editor] command failed. Return code: {e.returncode}")
        logger.error(f"    [auto-editor] stderr: {e.stderr}")
        logger.error(f"    [auto-editor] stdout: {e.stdout}")
        # If it fails, copy the original file to not break the pipeline
        logger.warning("    [auto-editor] auto-editor failed. Copying original file to continue pipeline.")
        shutil.copy(str(input_path), str(output_path))
        return False

def get_video_duration(video_path: Path) -> float:
    """Get the duration of a video file in seconds using MoviePy."""
    try:
        with VideoFileClip(str(video_path)) as clip:
            return clip.duration
    except Exception as e:
        logger.error(f"Error getting video duration for {video_path}: {e}")
        return 0.0

def _format_time_srt(time_seconds: float) -> str:
    """Converts seconds to SRT time format HH:MM:SS,mmm"""
    millisec = int(round((time_seconds - int(time_seconds)) * 1000))
    seconds = int(time_seconds)
    minutes, seconds = divmod(seconds, 60)
    hours, minutes = divmod(minutes, 60)
    return f"{hours:02d}:{minutes:02d}:{seconds:02d},{millisec:03d}"

def transcribe_video_whisper(video_path: Path, output_srt_path: Path, model_name="small") -> bool:
    """Transcribes video using Whisper and saves as SRT."""
    logger.info(f"  [Transcribe] Transcribing video: {video_path.name} using Whisper model: {model_name}")
    try:
        # Fix SSL certificate verification issue for Whisper model downloads
        import ssl
        ssl._create_default_https_context = ssl._create_unverified_context
        
        model = whisper.load_model(model_name)
        result = model.transcribe(str(video_path), verbose=False)
        with open(output_srt_path, "w", encoding="utf-8") as srt_file:
            for i, segment in enumerate(result["segments"]):
                start_time = _format_time_srt(segment["start"])
                end_time = _format_time_srt(segment["end"])
                text = segment["text"].strip()
                srt_file.write(f"{i+1}\n{start_time} --> {end_time}\n{text}\n\n")
        logger.info(f"  [Transcribe] Transcription successful. SRT saved to: {output_srt_path.name}")
        return True
    except Exception as e:
        logger.error(f"  [Transcribe] Error during Whisper transcription: {e}", exc_info=True)
        return False

def correct_subtitles_with_gpt4o(srt_path: Path, topic: str, model_name="gpt-4o-mini", openai_api_key: str = None, custom_prompt: str = None) -> bool:
    """Corrects subtitles using GPT-4o mini."""
    logger.info(f"  [GPT Correct] Correcting '{srt_path.name}' for topic: '{topic}' using {model_name}")
    api_key = openai_api_key or OPENAI_API_KEY
    if not api_key:
        logger.error("  [GPT Correct] No OpenAI API key provided. Skipping correction.")
        return False
    try:
        original_srt_content = srt_path.read_text(encoding="utf-8")
        sys_prompt = "You are a helpful assistant specialized in correcting transcriptions for medical and scientific topics. You are an expert in medical terminology. You only return valid SRT content."
        
        if custom_prompt:
            # Use custom prompt with placeholders replaced
            prompt = custom_prompt.replace('{transcript}', original_srt_content).replace('{topic}', topic)
        else:
            # Use default prompt
            prompt = (
            f"Please review the following SRT subtitle content for a video about '{topic}'. "
            f"Correct any transcription errors, fix punctuation, and ensure technical accuracy. "
            f"Preserve the SRT format perfectly, including timestamps and sequence numbers. "
            f"Your output should be ONLY the corrected SRT content, nothing else.\n\nOriginal SRT:\n{original_srt_content}"
        )
        client = openai.OpenAI(api_key=api_key)
        response = client.chat.completions.create(
            model=model_name,
            messages=[{"role": "system", "content": sys_prompt}, {"role": "user", "content": prompt}],
            temperature=0.1
        )
        corrected_srt = response.choices[0].message.content.strip()
        if "-->" not in corrected_srt or not corrected_srt.lstrip().startswith('1'):
            logger.error("  [GPT Correct] GPT returned invalid SRT format. Keeping original.")
            return False
        else:
            srt_path.write_text(corrected_srt, encoding="utf-8")
        logger.info(f"  [GPT Correct] Subtitles corrected successfully.")
        return True
    except Exception as e: 
        logger.error(f"  [GPT Correct] An error occurred during GPT correction: {e}. Keeping original.", exc_info=True)
        return False

def find_key_moments_with_gpt(transcript_text: str, video_topic: str = "general", openai_api_key: str = None, custom_prompt: str = None) -> dict:
    """Uses GPT to identify key, impactful sentences and important keywords from a transcript for educational engagement."""
    logger.info("  [AI Highlights] Finding key moments and educational keywords with GPT...")
    api_key = openai_api_key or OPENAI_API_KEY
    if not api_key:
        logger.warning("  [AI Highlights] No OpenAI API key found. Cannot find highlights.")
        return {"highlights": [], "keywords": []}

    clean_lines = [line.strip() for line in transcript_text.split('\n') if line.strip() and not line.strip().isdigit() and '-->' not in line]
    clean_transcript = ' '.join(clean_lines)

    if not clean_transcript:
        logger.warning("  [AI Highlights] Transcript is empty. Cannot find highlights.")
        return {"highlights": [], "keywords": []}

    if custom_prompt:
        # Use custom prompt with placeholders replaced
        prompt = custom_prompt.replace('{transcript}', clean_transcript).replace('{topic}', video_topic)
    else:
        # Use default prompt
        prompt = f"""
        Analyze this educational video transcript on "{video_topic}" and identify words/phrases that should be highlighted to maximize learning and engagement.

        **EDUCATIONAL HIGHLIGHTING STRATEGY:**
        1. **Key Learning Terms** (8-12 words/phrases): Medical terms, scientific concepts, processes, anatomical names
        2. **Important Sentences** (3-5 sentences): Complete statements that contain crucial learning points
        3. **Emphasis Words** (5-8 words): Action words, quantifiers, comparisons that need emphasis for understanding

        **Focus on highlighting:**
        - Technical terminology that students need to learn
        - Critical concepts for understanding the topic  
        - Key processes, mechanisms, or procedures
        - Important names (diseases, anatomy, medications)
        - Numbers, percentages, or measurements
        - Warning signs, symptoms, or diagnostic criteria

        **Make learning effective by highlighting words that:**
        - Help viewers remember key concepts
        - Draw attention to important medical facts
        - Emphasize critical learning points
        - Aid in knowledge retention

        Respond with a JSON object:
        {{
            "highlights": ["Complete sentence with key learning point 1", "Complete sentence 2"],
            "keywords": ["medical term 1", "important concept", "key process", "diagnostic sign", "anatomical structure"],
            "emphasis_words": ["critical", "essential", "important", "dangerous", "normal", "abnormal"]
        }}
        
        The quotes and keywords MUST be exact matches from the transcript.
        
    Transcript: {clean_transcript}
    """

    try:
        client = openai.OpenAI(api_key=api_key)
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            response_format={"type": "json_object"},
            messages=[
                {"role": "system", "content": "You are an expert in medical education and video enhancement. You extract the most important educational highlights from transcripts to help students learn effectively."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.3
        )
        
        result_data = json.loads(response.choices[0].message.content)
        highlights = result_data.get("highlights", [])
        keywords = result_data.get("keywords", [])
        emphasis_words = result_data.get("emphasis_words", [])
        
        # Combine keywords and emphasis words
        all_keywords = keywords + emphasis_words
        
        if isinstance(highlights, list) and isinstance(all_keywords, list):
            logger.info(f"  [AI Highlights] Found {len(highlights)} key sentences and {len(all_keywords)} important terms")
            return {"highlights": highlights, "keywords": all_keywords}
        else:
            logger.warning(f"  [AI Highlights] GPT returned unexpected data format")
            return {"highlights": [], "keywords": []}
    except Exception as e:
        logger.error(f"  [AI Highlights] Error finding key moments with GPT: {e}", exc_info=True)
        return {"highlights": [], "keywords": []}

def convert_srt_to_ass_with_highlights(srt_path: Path, ass_path: Path, key_moments: list[str], highlight_style: str) -> bool:
    """Converts SRT to a styled ASS file, highlighting educational key moments and terms."""
    
    highlight_colors = {
        'yellow': '&H0000FFFF',  # Bright yellow for learning emphasis
        'cyan': '&H00FFFF00',    # Cyan for secondary concepts
        'lime': '&H0000FF00',    # Lime green for key terms
    }
    highlight_color = highlight_colors.get(highlight_style, '&H0000FFFF')

    # Enhanced ASS header with better styling for educational content
    header = f"""[Script Info]
ScriptType: v4.00+
ScaledBorderAndShadow: yes
PlayResX: 1080
PlayResY: 1920

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,Arial,55,&H00FFFFFF,&H000000FF,&H00000000,&H80000000,0,0,0,0,100,100,0,0,1,3,2,2,10,10,10,1
Style: Highlight,Arial,62,{highlight_color},&H000000FF,&H00000000,&H80000000,-1,0,0,0,105,105,0,0,1,4,3,2,10,10,10,1
Style: Emphasis,Arial,58,{highlight_color},&H000000FF,&H00000000,&H90000000,-1,1,0,0,102,102,0,0,1,3,2,2,10,10,10,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""
    try:
        with srt_path.open('r', encoding='utf-8') as f:
            srt_content = f.read()

        dialogue_lines = []
        for segment in srt_content.strip().split('\n\n'):
            lines = segment.strip().split('\n')
            if len(lines) < 3: continue
            
            time_line, text = lines[1], " ".join(lines[2:]).strip()
            start_str, end_str = [t.strip().replace(',', '.') for t in time_line.split('-->')]
            start_ass, end_ass = "0" + start_str[:-1], "0" + end_str[:-1]
            
            # Check if this line contains educational highlighting opportunities
            style = "Default"
            enhanced_text = text
            
            # Highlight complete key learning sentences
            for moment in key_moments:
                if moment.lower().strip() in text.lower():
                    style = "Highlight"
                    logger.info(f"  [AI Highlights] Highlighting educational sentence: {text[:50]}...")
                    break
            
            # Add word-level highlighting for educational terms within any subtitle
            # This creates inline highlighting using ASS tags
            for keyword in key_moments:
                if len(keyword) > 3 and keyword.lower() in text.lower():  # Only highlight keywords longer than 3 chars
                    # Use ASS override tags for inline highlighting
                    keyword_pattern = re.compile(r'\b' + re.escape(keyword) + r'\b', re.IGNORECASE)
                    enhanced_text = keyword_pattern.sub(
                        f"{{\\c{highlight_color}&}}{{\\b1}}{keyword}{{\\b0}}{{\\c&H00FFFFFF&}}", 
                        enhanced_text
                    )
            
            dialogue_lines.append(f"Dialogue: 0,{start_ass},{end_ass},{style},,0,0,0,,{enhanced_text}")

        with ass_path.open('w', encoding='utf-8') as f:
            f.write(header + '\n'.join(dialogue_lines))
        logger.info(f"  [AI Highlights] Successfully created educational ASS file with highlighting: {ass_path.name}")
        return True
    except Exception as e:
        logger.error(f"  [AI Highlights] Failed to convert SRT to educational ASS: {e}", exc_info=True)
        return False

def burn_subtitles_ffmpeg(video_path: Path, subtitle_path: Path, output_path: Path, font_size: int = 8) -> bool:
    """Burns subtitles into the video using FFmpeg with configurable font size."""
    print_section_header("Subtitle Burning")
    logger.info(f"  [Subtitle Burn] Adding subtitles to {video_path.name} with font size {font_size}")
    
    # Get video dimensions to determine if it's landscape or portrait
    try:
        probe = ffmpeg.probe(str(video_path))
        video_stream = next((stream for stream in probe['streams'] if stream['codec_type'] == 'video'), None)
        if video_stream:
            width = int(video_stream['width'])
            height = int(video_stream['height'])
            is_landscape = width > height
            logger.info(f"  [Subtitle Burn] Video dimensions: {width}x{height} ({'landscape' if is_landscape else 'portrait'})")
        else:
            is_landscape = False
            logger.warning("  [Subtitle Burn] Could not determine video dimensions, assuming portrait")
    except Exception as e:
        logger.warning(f"  [Subtitle Burn] Error probing video dimensions: {e}, assuming portrait")
        is_landscape = False
    
    subtitle_file_ext = subtitle_path.suffix.lower()
    
    if subtitle_file_ext == '.ass':
        # For ASS files, use the ass filter
        subtitle_filter = f"ass='{subtitle_path}'"
    else:
        # For SRT files, use subtitles filter with configurable styling
        # Adjusted font size calculation for vertical videos to make subtitles smaller
        if is_landscape:
            # Landscape styling - use the specified font size directly
            subtitle_filter = f"subtitles='{subtitle_path}':force_style='FontSize={font_size},FontName=Arial,Bold=1,PrimaryColour=&H00FFFFFF,OutlineColour=&H00000000,Outline=2,Shadow=1'"
        else:
            # Portrait styling - use an even smaller effective font size for vertical videos
            # Scale the font size down significantly for portrait videos to prevent covering too much screen
            effective_font_size = max(4, int(font_size * 0.7))  # Use 70% of specified size, minimum 4
            subtitle_filter = f"subtitles='{subtitle_path}':force_style='FontSize={effective_font_size},FontName=Arial,Bold=1,PrimaryColour=&H00FFFFFF,OutlineColour=&H00000000,Outline=2,Shadow=1,MarginV=10'"
            logger.info(f"  [Subtitle Burn] Using effective font size {effective_font_size} for portrait video (scaled from {font_size})")
    
    command = [
        'ffmpeg', '-y',
        '-i', str(video_path),
        '-vf', subtitle_filter,
        '-c:a', 'copy',  # Copy audio stream without re-encoding
        '-c:v', 'libx264',  # Use H.264 video codec
        '-preset', 'medium',  # Balance between speed and compression
        str(output_path)
    ]
    
    success = _run_ffmpeg_command(command, "Subtitle Burning")
    
    if success:
        logger.info(f"  [Subtitle Burn] Successfully burned subtitles with font size {font_size}")
    else:
        logger.error(f"  [Subtitle Burn] Failed to burn subtitles")
    
    return success

def add_outro_ffmpeg(video_path: Path, output_path: Path) -> bool:
    """Add outro to video using FFmpeg with random outro selection."""
    logger.info(f"  [Add Outro] Adding outro to: {video_path.name}")
    
    try:
        # Get video dimensions
        probe_cmd = [
            "ffprobe", "-v", "error",
            "-select_streams", "v:0",
            "-show_entries", "stream=width,height",
            "-of", "json",
            str(video_path)
        ]
        
        result = subprocess.run(probe_cmd, capture_output=True, text=True)
        if result.returncode != 0:
            logger.error("Failed to get video dimensions")
            return False

        video_info = json.loads(result.stdout)
        width = int(video_info["streams"][0]["width"])
        height = int(video_info["streams"][0]["height"])
        
        # Select outro directory based on aspect ratio
        project_root = Path(__file__).resolve().parent.parent.parent
        base_assets_dir = project_root / "data" / "assets" / "Outro"
        
        if not base_assets_dir.exists():
            logger.error(f"  [Add Outro] Base assets directory not found at {base_assets_dir}")
            return False

        if width > height:  # Landscape
            outro_dir = base_assets_dir / "1920x1080"
        else:  # Portrait
            outro_dir = base_assets_dir / "1080x1920"
            
        logger.info(f"  [Add Outro] Checking for outros in: {outro_dir.resolve()}")
            
        # Get random outro from directory
        outros = list(outro_dir.glob("*.mp4"))
        if not outros:
            logger.error(f"No outros found in {outro_dir}")
            return False
            
        outro_path = random.choice(outros)
        logger.info(f"  [Add Outro] Selected outro: {outro_path.name}")
        
        # Get main video duration to ensure outro doesn't extend beyond intended length
        probe_duration_cmd = [
            "ffprobe", "-v", "error",
            "-show_entries", "format=duration",
            "-of", "default=noprint_wrappers=1:nokey=1",
            str(video_path)
        ]
        
        duration_result = subprocess.run(probe_duration_cmd, capture_output=True, text=True)
        if duration_result.returncode == 0:
            main_video_duration = float(duration_result.stdout.strip())
            logger.info(f"  [Add Outro] Main video duration: {main_video_duration:.2f}s")
        else:
            logger.warning("  [Add Outro] Could not determine main video duration, using default concat")
            main_video_duration = None
        
        # Scale outro to match main video size and concatenate, but trim to content duration
        if main_video_duration:
            # Get outro duration to calculate total length
            outro_probe_cmd = [
                "ffprobe", "-v", "error",
                "-show_entries", "format=duration",
                "-of", "default=noprint_wrappers=1:nokey=1",
                str(outro_path)
            ]
            outro_duration_result = subprocess.run(outro_probe_cmd, capture_output=True, text=True)
            if outro_duration_result.returncode == 0:
                outro_duration = float(outro_duration_result.stdout.strip())
                total_duration = main_video_duration + outro_duration
                logger.info(f"  [Add Outro] Total duration would be: {total_duration:.2f}s, trimming to content length")
                
                # Concatenate and then trim to remove excess audio/video
                concat_cmd = [
                    "ffmpeg", "-y",
                    "-i", str(video_path),
                    "-i", str(outro_path),
                    "-filter_complex", 
                    f"[1:v]scale={width}:{height}[scaled_outro];[0:v][0:a][scaled_outro][1:a]concat=n=2:v=1:a=1[outv][outa]",
                    "-map", "[outv]",
                    "-map", "[outa]",
                    "-t", str(total_duration),  # Trim to total intended duration
                    str(output_path)
                ]
            else:
                logger.warning("  [Add Outro] Could not determine outro duration, using basic concat")
                concat_cmd = [
                    "ffmpeg", "-y",
                    "-i", str(video_path),
                    "-i", str(outro_path),
                    "-filter_complex", 
                    f"[1:v]scale={width}:{height}[scaled_outro];[0:v][0:a][scaled_outro][1:a]concat=n=2:v=1:a=1[outv][outa]",
                    "-map", "[outv]",
                    "-map", "[outa]",
                    str(output_path)
                ]
        else:
            # Fallback to basic concat
            concat_cmd = [
            "ffmpeg", "-y",
            "-i", str(video_path),
            "-i", str(outro_path),
            "-filter_complex", 
            f"[1:v]scale={width}:{height}[scaled_outro];[0:v][0:a][scaled_outro][1:a]concat=n=2:v=1:a=1[outv][outa]",
            "-map", "[outv]",
            "-map", "[outa]",
            str(output_path)
        ]
        
        return _run_ffmpeg_command(concat_cmd, "Outro Addition")
        

        pass
    except Exception as e:
        logger.warning(f'Error in try block: {e}')
        pass
def add_topic_card(video_path: Path, output_path: Path, topic: str, card_duration: float = 3.0, style: str = 'medical', position: str = 'top') -> bool:
    """Creates a topic card overlay that appears at the beginning of the video without taking over the whole screen."""
    logger.info(f"  [Topic Card] Creating topic card overlay for '{topic}' with style '{style}'")
    try:
        main_clip = VideoFileClip(str(video_path))
        w, h = main_clip.size

        # Define styles with RGB tuples and opacity
        styles = {
            'medical': {'bg': (0, 51, 102), 'font': 'Arial-Bold', 'color': 'white', 'opacity': 0.9},
            'tech': {'bg': (26, 26, 26), 'font': 'Courier-Bold', 'color': '#00FF00', 'opacity': 0.8},
            'education': {'bg': (44, 62, 80), 'font': 'Georgia-Bold', 'color': '#F1C40F', 'opacity': 0.9},
            'modern': {'bg': (255, 255, 255), 'font': 'HelveticaNeue-Bold', 'color': '#000000', 'opacity': 0.8},
            'animated': {'bg': (255, 59, 63), 'font': 'Impact', 'color': 'white', 'opacity': 0.9}
        }
        selected_style = styles.get(style, styles['medical'])
        
        # Calculate card size and position based on video dimensions
        # For vertical videos (shorts), use smaller proportions
        if w < h:  # Vertical video (shorts)
            card_width = int(w * 0.8)   # 80% of video width for shorts
            card_height = int(h * 0.08)  # 8% of video height for shorts (smaller)
        else:  # Horizontal video
            card_width = int(w * 0.6)   # 60% of video width
            card_height = int(h * 0.15) # 15% of video height
        
        font_size = int(card_height * 0.4)  # Font size relative to card height
        
        # Create topic card background with rounded corners effect (using smaller size)
        card_bg = ColorClip(size=(card_width, card_height), color=selected_style['bg'], duration=card_duration)
        card_bg = card_bg.set_opacity(selected_style['opacity'])
        
        # Create text clip
        txt_clip = TextClip(
            topic.upper(),
            fontsize=font_size,
            font=selected_style['font'],
            color=selected_style['color'],
            size=(card_width * 0.9, None),
            method='caption',
            align='center'
        ).set_duration(card_duration)

        # Position the text in the center of the card
        txt_clip = txt_clip.set_position('center')
        
        # Composite the text onto the card background
        topic_card = CompositeVideoClip([card_bg, txt_clip])
        
        # Position the entire topic card on the video
        position_map = {
            'top': ('center', int(h * 0.1)),
            'center': 'center',
            'bottom': ('center', int(h * 0.8)),
            'top-left': (int(w * 0.05), int(h * 0.1)),
            'top-right': (int(w * 0.95 - card_width), int(h * 0.1)),
        }
        card_position = position_map.get(position, ('center', int(h * 0.1)))
        topic_card = topic_card.set_position(card_position)
        
        # Create the final composite: main video with topic card overlay for the first few seconds
        final_clip = CompositeVideoClip([main_clip, topic_card])

        final_clip.write_videofile(str(output_path), codec="libx264", audio_codec="aac", logger='bar')
        
        # Close all clips
        main_clip.close()
        card_bg.close()
        txt_clip.close()
        topic_card.close()
        final_clip.close()
        
        logger.info(f"  [Topic Card] Successfully added topic card overlay.")
        return True


        pass
    except Exception as e:
        logger.warning(f'Error in try block: {e}')
        pass
def add_colorful_frame(video_path: Path, output_path: Path, frame_style: str = 'rainbow') -> bool:
    """Adds a colorful frame around vertical videos (YouTube Shorts)."""
    logger.info(f"  [Colorful Frame] Adding {frame_style} frame to video")
    try:
        main_clip = VideoFileClip(str(video_path))
        w, h = main_clip.size
        
        # Only add frame to vertical videos (YouTube Shorts)
        if w >= h:
            logger.info(f"  [Colorful Frame] Video is landscape ({w}x{h}), skipping frame addition")
            # Copy the original video file to the output path to maintain workflow
            shutil.copy(str(video_path), str(output_path))
            main_clip.close()
            return False
        
        logger.info(f"  [Colorful Frame] Video is vertical ({w}x{h}), adding colorful frame")
        
        # Define frame styles
        frame_styles = {
            'rainbow': [
                (255, 0, 0),    # Red
                (255, 127, 0),  # Orange  
                (255, 255, 0),  # Yellow
                (0, 255, 0),    # Green
                (0, 0, 255),    # Blue
                (75, 0, 130),   # Indigo
                (148, 0, 211)   # Violet
            ],
            'neon': [
                (255, 0, 128),  # Neon Pink
                (0, 255, 255),  # Cyan
                (255, 255, 0),  # Yellow
                (0, 255, 0),    # Green
                (255, 0, 255),  # Magenta
            ],
            'medical': [
                (0, 51, 102),   # Medical blue
                (0, 102, 204),  # Light blue
                (51, 153, 255), # Sky blue
                (102, 178, 255) # Pale blue
            ],
            'gold': [
                (255, 215, 0),  # Gold
                (255, 223, 0),  # Light gold
                (255, 206, 84), # Mellow gold
                (218, 165, 32)  # Dark golden rod
            ],
            'gradient': [
                (25, 25, 112),  # Midnight Blue
                (65, 105, 225), # Royal Blue
                (100, 149, 237) # Cornflower Blue
            ]
        }
        
        colors = frame_styles.get(frame_style, frame_styles['rainbow'])
        
        # Create frame with more visible thickness
        frame_thickness = 30  # Increased from 20 to 30 pixels for better visibility
        total_w = w + (frame_thickness * 2)
        total_h = h + (frame_thickness * 2)
        
        # Create multiple colored frame layers for gradient effect
        frame_layers = []
        layer_thickness = frame_thickness // len(colors)
        
        for i, color in enumerate(colors):
            layer_w = w + (frame_thickness - i * layer_thickness) * 2
            layer_h = h + (frame_thickness - i * layer_thickness) * 2
            
            if layer_w > w and layer_h > h:  # Only create layer if it's bigger than the video
                layer_clip = ColorClip(size=(layer_w, layer_h), color=color, duration=main_clip.duration)
                frame_layers.append(layer_clip)
        
        # Create base frame with primary color
        base_frame = ColorClip(size=(total_w, total_h), color=colors[0], duration=main_clip.duration)
        
        # Position the main video in the center of the frame
        main_clip_positioned = main_clip.set_position((frame_thickness, frame_thickness))
        
        # Composite all frame layers (from largest to smallest) then the video on top
        all_clips = [base_frame] + frame_layers + [main_clip_positioned]
        final_clip = CompositeVideoClip(all_clips)
        
        # Write the output with better quality settings
        final_clip.write_videofile(
            str(output_path), 
            codec='libx264', 
            audio_codec='aac',
            preset='medium',
            ffmpeg_params=['-crf', '23']  # Higher quality encoding
        )
        
        # Cleanup
        main_clip.close()
        base_frame.close()
        for layer in frame_layers:
            layer.close()
        main_clip_positioned.close()
        final_clip.close()
        
        logger.info(f"  [Colorful Frame] Successfully added {frame_style} frame")
        return True
        
        # Copy the original video file to the output path to maintain workflow
        try:
            shutil.copy(str(video_path), str(output_path))
        except Exception as copy_error:
            logger.error(f"  [Colorful Frame] Error copying original video: {copy_error}")
        return False


    except Exception as e:
        logger.warning(f'Error in try block: {e}')
        pass
def add_daily_question_logo(video_path: Path, output_path: Path, logo_duration: float = 2.0, position: str = 'top-right') -> bool:
    """Adds the 'Daily Question' logo flash animation to the video."""
    logger.info(f"  [Daily Question Logo] Adding logo animation at {position}")
    try:
        main_clip = VideoFileClip(str(video_path))
        w, h = main_clip.size
        
        # Path to the Daily Question logo
        logo_path = Path("data/assets/Logos/Daily Question.png")
        
        if not logo_path.exists():
            logger.warning(f"  [Daily Question Logo] Logo file not found: {logo_path}")
            main_clip.close()
            return False
        
        # Create logo clip with fade in/out animation
        logo_clip = ImageClip(str(logo_path), duration=logo_duration)
        
        # Resize logo based on video dimensions (scale to 30% of video width - larger for better visibility)
        logo_scale = 0.30
        if w < h:  # Vertical video (YouTube Short)
            logo_width = int(w * logo_scale)
        else:  # Horizontal video
            logo_width = int(w * logo_scale)
        
        # Maintain aspect ratio - handle PIL.Image.ANTIALIAS deprecation
        try:
            logo_clip = logo_clip.resize(width=logo_width)
        except AttributeError as e:
            if "ANTIALIAS" in str(e):
                # Workaround for PIL.Image.ANTIALIAS deprecation in Pillow 10+
                logger.warning(f"  [Daily Question Logo] PIL.Image.ANTIALIAS deprecated, using manual resize")
                # Calculate new height maintaining aspect ratio
                aspect_ratio = logo_clip.h / logo_clip.w
                logo_height = int(logo_width * aspect_ratio)
                logo_clip = logo_clip.resize(newsize=(logo_width, logo_height))
            else:
                raise e
        
        # Position the logo
        position_map = {
            'top-left': (20, 20),
            'top-right': (w - logo_clip.w - 20, 20),
            'bottom-left': (20, h - logo_clip.h - 20),
            'bottom-right': (w - logo_clip.w - 20, h - logo_clip.h - 20),
            'center': ('center', 'center'),
            'top-center': ('center', 20)
        }
        
        logo_position = position_map.get(position, position_map['top-right'])
        logo_clip = logo_clip.set_position(logo_position)
        
        # Add fade in/out animation (0.3s fade in, hold, 0.3s fade out)
        fade_duration = 0.3
        logo_clip = logo_clip.fadein(fade_duration).fadeout(fade_duration)
        
        # Start the logo animation at 1 second into the video
        logo_start_time = 1.0
        logo_clip = logo_clip.set_start(logo_start_time)
        
        # Composite the logo on top of the main video
        final_clip = CompositeVideoClip([main_clip, logo_clip])
        
        # Write the output
        final_clip.write_videofile(str(output_path), codec='libx264', audio_codec='aac')
        
        # Cleanup
        main_clip.close()
        logo_clip.close()
        final_clip.close()
        
        logger.info(f"  [Daily Question Logo] Successfully added logo animation")
        return True
        
    except Exception as e:
        logger.error(f"  [Daily Question Logo] Error adding logo: {e}")
        return False


def get_broll_keywords_with_gpt(transcript_text: str, openai_api_key: str = None) -> list[str]:
    """Analyzes transcript and extracts 3-5 keywords for B-roll footage."""
    logger.info("  [AI B-Roll] Getting keywords from transcript with GPT...")
    api_key = openai_api_key or OPENAI_API_KEY
    if not api_key:
        logger.warning("  [AI B-Roll] OpenAI API key not set. Skipping keyword extraction.")
        return []

    clean_lines = [line.strip() for line in transcript_text.split('\n') if line.strip() and not line.strip().isdigit() and '-->' not in line]
    clean_transcript = ' '.join(clean_lines)

    if not clean_transcript:
        logger.warning("  [AI B-Roll] Transcript is empty. Cannot extract keywords.")
        return []

    prompt = f"""
    Analyze the following transcript from a medical education video on the topic of '{detected_topic if 'detected_topic' in locals() else 'medical education'}'.
    
    Identify 3-5 distinct, visually representable medical concepts that would be excellent for B-roll footage.
    Focus ONLY on medical-related terms that would yield relevant stock footage.
    
    EXAMPLES of good medical B-roll keywords:
    - "doctor examining patient"
    - "stethoscope close up"
    - "medical laboratory"
    - "hospital equipment"
    - "medical consultation"
    - "healthcare professional"
    - "medical research"
    - "clinical setting"
    
    AVOID general terms like "education", "learning", "people talking" - focus on MEDICAL VISUALS.
    
    Respond with a JSON object: {{"keywords": ["keyword1", "keyword2", "keyword3"]}}.

    Transcript:
    {clean_transcript[:2000]}...
    """

    try:
        client = openai.OpenAI(api_key=api_key)
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            response_format={"type": "json_object"},
            messages=[
                {"role": "system", "content": "You are a video editor's assistant. You provide a short JSON list of keywords for B-roll footage based on a transcript."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.4
        )
        result_data = json.loads(response.choices[0].message.content)
        keywords = result_data.get("keywords", [])
        if isinstance(keywords, list) and all(isinstance(k, str) for k in keywords):
            logger.info(f"  [AI B-Roll] GPT suggested keywords: {keywords}")
            return keywords
        return []
    except Exception as e:
        logger.error(f"  [AI B-Roll] Error getting keywords from GPT: {e}", exc_info=True)
        return []

def calculate_smart_broll_settings(video_duration: float) -> tuple[int, float]:
    """
    Calculate optimal B-roll clip count and duration based on video length.
    
    Args:
        video_duration: Duration of the video in seconds
        
    Returns:
        tuple: (optimal_clip_count, optimal_clip_duration)
    """
    if video_duration <= 30:  # Short videos (YouTube Shorts)
        return (2, 2.0)  # 2 clips, 2 seconds each
    elif video_duration <= 60:  # 1-minute videos
        return (3, 3.0)  # 3 clips, 3 seconds each
    elif video_duration <= 180:  # 3-minute videos
        return (4, 4.0)  # 4 clips, 4 seconds each
    elif video_duration <= 300:  # 5-minute videos
        return (5, 4.5)  # 5 clips, 4.5 seconds each
    elif video_duration <= 600:  # 10-minute videos
        return (6, 5.0)  # 6 clips, 5 seconds each
    else:  # Longer videos
        # For very long videos, scale appropriately
        clip_count = min(int(video_duration / 60), 10)  # Max 10 clips
        clip_duration = min(video_duration / clip_count * 0.1, 6.0)  # Max 6 seconds per clip
        return (clip_count, clip_duration)

def calculate_smart_multimedia_counts(silence_removed_duration: float, broll_ratio: float = 1.0, image_ratio: float = 2.0) -> tuple[int, int]:
    """
    Calculate the optimal number of B-roll clips and DALL-E images based on silence-removed video duration.
    
    Args:
        silence_removed_duration: Duration of video after silence removal (seconds)
        broll_ratio: Number of B-roll clips per 30 seconds of content (default: 1)
        image_ratio: Number of generated images per 30 seconds of content (default: 2)
    
    Returns:
        tuple: (broll_count, image_count)
    """
    # Calculate based on 30-second segments
    thirty_second_segments = silence_removed_duration / 30.0
    
    # Calculate counts with the provided ratios
    broll_count = max(0, round(thirty_second_segments * broll_ratio))
    image_count = max(0, round(thirty_second_segments * image_ratio))
    
    # Ensure minimum counts for videos longer than 10 seconds
    if silence_removed_duration > 10:
        broll_count = max(1, broll_count)
        image_count = max(1, image_count)
    
    # Apply reasonable limits
    broll_count = min(broll_count, 15)  # Cap at 15 B-roll clips
    image_count = min(image_count, 20)  # Cap at 20 images
    
    logger.info(f"  [Smart Mode] Calculated for {silence_removed_duration:.1f}s video: {broll_count} B-roll clips, {image_count} images")
    logger.info(f"  [Smart Mode] Used ratios: {broll_ratio} B-roll/{image_ratio} images per 30s")
    
    return broll_count, image_count

def search_and_download_broll(keywords: list, output_dir: Path, num_clips: int = 5, pexels_api_key: str = None) -> list:
    """
    Searches for videos on Pexels based on keywords and downloads them.
    """
    logger.info(f"  [AI B-Roll] Searching for B-roll footage for keywords: {keywords}")
    # Use passed API key or fall back to global one
    api_key = pexels_api_key or PEXELS_API_KEY
    if not api_key:
        logger.warning("  [AI B-Roll] Pexels API key not set. Skipping B-roll download.")
        return []
    
    if PexelsAPI is None:
        logger.error("  [AI B-Roll] Pexels API library not available. Install with: pip install pexels-api-py")
        return []
    
    api = PexelsAPI(api_key)
    downloaded_files = []
    
    for keyword in keywords:
        if len(downloaded_files) >= num_clips:
            break
        try:
            # Use direct API call for videos since pexels-api library doesn't support videos
            import requests
            headers = {'Authorization': api_key}
            response = requests.get(
                f'https://api.pexels.com/videos/search?query={keyword}&per_page=3&page=1',
                headers=headers
            )
            response.raise_for_status()
            data = response.json()
            
            videos = data.get('videos', [])
            if not videos:
                logger.info(f"  [AI B-Roll] No video results for '{keyword}'")
                continue

            for video in videos:
                if len(downloaded_files) >= num_clips:
                    break
                
                # Check if this is a video dictionary with video_files
                if 'video_files' not in video:
                    logger.warning(f"  [AI B-Roll] Skipping non-video result for '{keyword}' (missing video_files)")
                    continue
                
                # Filter video files by width and sort by quality
                video_files = video['video_files']
                suitable_files = [f for f in video_files if f.get('width', 0) < 1500]
                if not suitable_files:
                    logger.warning(f"  [AI B-Roll] No suitable video files found for video ID {video.get('id')} ('{keyword}')")
                    continue
                
                # Sort by width (higher quality first)
                best_file = sorted(suitable_files, key=lambda x: x.get('width', 0), reverse=True)[0]
                video_url = best_file['link']
                file_name = f"broll_{keyword.replace(' ', '_')}_{Path(video_url).stem}.mp4"
                output_path = output_dir / file_name
                
                logger.info(f"  [AI B-Roll] Downloading '{keyword}' B-roll from {video_url}...")
                response = requests.get(video_url, stream=True)
                response.raise_for_status()
                with open(output_path, 'wb') as f:
                    for chunk in response.iter_content(chunk_size=8192):
                        f.write(chunk)
                
                logger.info(f"  [AI B-Roll] Downloaded successfully to {output_path.name}")
                downloaded_files.append(output_path)
                
        except Exception as e:
            logger.error(f"  [AI B-Roll] Failed to search/download for keyword '{keyword}': {e}")
            continue
            
    return downloaded_files

def insert_broll_clips(
    video_path: Path, 
    transcript_path: Path, 
    broll_clip_count: int, 
    broll_clip_duration: float, 
    openai_api_key: str = None, 
    pexels_api_key: str = None,
    transition_style: str = 'fade',  # Add transition style parameter
    use_smart_settings: bool = True  # New parameter for smart settings
) -> Path:
    """
    Inserts B-roll clips into the main video as overlays with optional transitions.
    """
    print_section_header("AI B-Roll Insertion")
    temp_dir = Path(tempfile.gettempdir())
    output_path = temp_dir / f"broll_final_{uuid.uuid4()}.mp4"
    
    main_clip = None
    opened_broll_clips = []

    try:
        # Load main video clip
        main_clip = VideoFileClip(str(video_path))
        duration = main_clip.duration
        
        # Smart B-roll settings based on video duration
        if broll_clip_count == 5 and broll_clip_duration == 4.0:  # Default values
            smart_clip_count, smart_clip_duration = calculate_smart_broll_settings(duration)
            broll_clip_count = smart_clip_count
            broll_clip_duration = smart_clip_duration
            logger.info(f"  [B-Roll] Using smart settings: {broll_clip_count} clips, {broll_clip_duration}s each (video: {duration:.1f}s)")
        else:
            logger.info(f"  [B-Roll] Using manual settings: {broll_clip_count} clips, {broll_clip_duration}s each")

        # Get keywords from transcript
        with open(transcript_path, 'r', encoding='utf-8') as f:
            transcript_text = f.read()
        
        broll_keywords = get_broll_keywords_with_gpt(transcript_text, openai_api_key)
        if not broll_keywords:
            logger.warning("  [B-Roll] Could not generate B-roll keywords. Skipping B-roll.")
            return video_path
        
        # Download B-roll clips
        broll_download_dir = temp_dir / "broll_downloads"
        broll_download_dir.mkdir(exist_ok=True)
        broll_video_paths = search_and_download_broll(broll_keywords, broll_download_dir, num_clips=broll_clip_count, pexels_api_key=pexels_api_key)
        
        if not broll_video_paths:
            logger.warning("  [B-Roll] No B-roll clips were downloaded. Skipping B-roll.")
            return video_path
        
        logger.info(f"  [B-Roll] Downloaded {len(broll_video_paths)} B-roll clips.")

        # Determine insert points for overlays
        insert_points = [duration * (i + 1) / (len(broll_video_paths) + 1) for i in range(len(broll_video_paths))]
        
        broll_overlays = []
        for i, broll_path in enumerate(broll_video_paths):
            insert_time = insert_points[i]
            
            broll_clip = VideoFileClip(str(broll_path)).subclip(0, broll_clip_duration)
            opened_broll_clips.append(broll_clip)
            
            # Resize B-roll and remove its audio
            broll_clip = broll_clip.resize(main_clip.size).set_audio(None)

            # Apply transition
            if transition_style == 'fade':
                transition_duration = 0.5  # half-second fade in/out
                broll_clip = broll_clip.fadein(transition_duration).fadeout(transition_duration)

            # Set the start time for the overlay
            broll_clip = broll_clip.set_start(insert_time)
            broll_overlays.append(broll_clip)

        # Create the composite video
        final_clip = CompositeVideoClip([main_clip] + broll_overlays)
        
        # Write the final video file
        final_clip.write_videofile(
            str(output_path), 
            codec="libx264", 
            audio_codec="aac",
            temp_audiofile=str(temp_dir / f"temp_audio_{uuid.uuid4()}.m4a"),
            remove_temp=True
        )
        logger.info(f"  [B-Roll] Successfully inserted B-roll. Output: {output_path}")

        # Close all clips
        final_clip.close()
        for clip in opened_broll_clips:
            clip.close()
        main_clip.close()
        
        return output_path
    
        # Cleanup
        if main_clip: main_clip.close()
        for clip in opened_broll_clips: clip.close()
        return video_path

        pass
    except Exception as e:
        logger.warning(f'Error in try block: {e}')
        pass
def apply_dynamic_zoom(video_path: Path, output_path: Path, intensity: str = 'subtle', frequency: str = 'medium') -> bool:
    """Apply optimized dynamic zoom effects to video to make it more engaging."""
    print_section_header("Applying Dynamic Zoom")
    
    intensity_map = {
        'subtle': 1.03,    # Reduced from 1.05 for smoother performance
        'medium': 1.06,    # Reduced from 1.1
        'strong': 1.12     # Reduced from 1.2
    }
    
    frequency_map = {
        'low': 10.0,       # Increased duration for slower, smoother zooms
        'medium': 7.0,     # Increased from 5.0
        'high': 4.0        # Increased from 3.0
    }
    
    max_zoom = intensity_map.get(intensity, 1.03)
    zoom_duration = frequency_map.get(frequency, 7.0)
    
    try:
        video_clip = VideoFileClip(str(video_path))
        duration = video_clip.duration
        
        # Optimized zoom effect with better performance and smoother transitions
        def zoom_effect(get_frame, t):
            frame = get_frame(t)
            
            # Use sine wave for smoother zoom transitions
            import math
            cycle_progress = (t % (zoom_duration * 2)) / (zoom_duration * 2)
            zoom_factor = 1 + (max_zoom - 1) * (math.sin(cycle_progress * 2 * math.pi) * 0.5 + 0.5)
            
            h, w = frame.shape[:2]
            
            # Calculate new dimensions - ensure they're even numbers for better encoding
            new_h = int((h / zoom_factor) // 2) * 2
            new_w = int((w / zoom_factor) // 2) * 2
            
            # Calculate crop coordinates to center the crop
            start_h = (h - new_h) // 2
            start_w = (w - new_w) // 2
            
            # Crop and resize with optimized method
            cropped = frame[start_h:start_h+new_h, start_w:start_w+new_w]
            
            # Use higher quality interpolation for better results
            import cv2
            resized = cv2.resize(cropped, (w, h), interpolation=cv2.INTER_LANCZOS4)
            return resized
        
        # Apply zoom with optimized settings
        zoomed_clip = video_clip.fl(zoom_effect, apply_to=[])  # Don't apply to mask for better performance
        zoomed_clip.write_videofile(
            str(output_path), 
            codec="libx264", 
            audio_codec="aac",
            temp_audiofile='temp-audio.m4a',
            remove_temp=True,
            preset='medium',  # Balanced quality/speed
            threads=4         # Limit threads to prevent overwhelming the system
        )
        
        video_clip.close()
        zoomed_clip.close()
        
        logger.info(f"  [Zoom] Dynamic zoom applied successfully. Output: {output_path.name}")
        return True
        

        pass
    except Exception as e:
        logger.warning(f'Error in try block: {e}')
        pass
def add_background_music(video_path: Path, output_path: Path, music_track: str = 'none', video_topic: str = 'general', 
                        speech_volume: float = 1.0, music_volume: float = 0.5, 
                        fade_in_duration: float = 1.0, fade_out_duration: float = 1.0) -> bool:
    """Adds background music to the video, with intelligent selection and volume adjustment."""
    print(f"🎵 Background Music: track='{music_track}', volume={music_volume}")
    logger.info(f"  [Music] Adding background music to {video_path.name}. Track requested: '{music_track}'")

    if music_track == 'none':
        print(f"🎵 SKIPPING: Music track is 'none'")
        logger.info("  [Music] No music track specified. Skipping.")
        shutil.copy(str(video_path), str(output_path))
        return True

    print(f"🎵 PROCESSING: Adding background music...")

    video_clip = None
    music_clip = None
    original_audio = None
    combined_audio = None
    
    try:
        video_clip = VideoFileClip(str(video_path))
        video_duration = video_clip.duration
        
        # Fix the PixabayMusicManager initialization - only pass api_key
        music_manager = PixabayMusicManager(api_key=PIXABAY_API_KEY)
        
        retries = 3
        music_file_path = None
        
        for attempt in range(retries):
            try:
                if music_track == 'random':
                    # Use random selection from existing library
                    logger.info(f"  [Music] Random music selection from library")
                    music_file_path = music_manager.get_random_music()
                else:
                    # Use specific track name
                    logger.info(f"  [Music] Looking for specific track: '{music_track}'")
                    music_file_path = music_manager.get_music_by_name(music_track)

                if music_file_path and music_file_path.exists():
                    break
                else:
                    logger.warning(f"  [Music] Attempt {attempt + 1} failed, retrying...")
            
            except Exception as e:
                logger.warning(f'Error in try block: {e}')
                continue
                
        if not music_file_path or not music_file_path.exists():
            logger.warning(f"  [Music] No suitable music found after all attempts. Continuing without music.")
            shutil.copy(str(video_path), str(output_path))
            return False
            
        logger.info(f"  [Music] Using music file: {music_file_path.name}")
        
        # Load the music
        music_clip = AudioFileClip(str(music_file_path))
        
        # Adjust music duration to match video
        if music_clip.duration < video_duration:
            # If music is shorter than video, loop it
            loops_needed = int(video_duration / music_clip.duration) + 1
            music_clips = [music_clip] * loops_needed
            music_clip = concatenate_audioclips(music_clips).subclip(0, video_duration)
        elif music_clip.duration > video_duration:
            # If music is longer than video, trim it
            music_clip = music_clip.subclip(0, video_duration)
        
        # Get the original audio from the video
        original_audio = video_clip.audio
        
        if original_audio is None:
            logger.warning("  [Music] Video has no audio track. Adding music as the only audio.")
            # Set music volume to reasonable level for standalone audio
            music_clip = music_clip.volumex(0.6)
            video_with_music = video_clip.set_audio(music_clip)
        else:
            # Mix the original audio with background music
            logger.info("  [Music] Mixing original audio with background music...")
            
            # Adjust volumes using configurable settings
            original_audio = original_audio.volumex(speech_volume)  # User-configurable speech volume
            background_music = music_clip.volumex(music_volume)     # User-configurable music volume
            
            # Add fade in/out effects to music
            if fade_in_duration > 0:
                background_music = background_music.audio_fadein(fade_in_duration)
            if fade_out_duration > 0:
                background_music = background_music.audio_fadeout(fade_out_duration)
            
            # Combine the audio tracks
            combined_audio = CompositeAudioClip([original_audio, background_music])
            video_with_music = video_clip.set_audio(combined_audio)
        
        # Write the final video
        logger.info(f"  [Music] Writing video with background music...")
        video_with_music.write_videofile(
            str(output_path),
            codec='libx264',
            audio_codec='aac',
            temp_audiofile=str(Path(tempfile.gettempdir()) / f"temp_audio_{uuid.uuid4()}.m4a"),
            remove_temp=True,
            verbose=False,
            logger=None
        )
        
        logger.info(f"  [Music] Successfully added background music: {music_file_path.name}")
        return True
        
    except Exception as e:
        logger.error(f"  [Music] Error adding background music: {e}")
        try:
            shutil.copy(str(video_path), str(output_path))
            logger.info(f"  [Music] Copied original video without music.")
        except Exception as copy_error:
            logger.error(f"  [Music] Error copying original video: {copy_error}")
        return False

    finally:
        # Clean up resources
        if music_clip:
            music_clip.close()
        if original_audio:
            original_audio.close()
        if combined_audio:
            combined_audio.close()
        if video_clip:
            video_clip.close()

def add_sound_effects(video_clip: VideoFileClip, transcript_path: Optional[Path], effect_pack: str, important_keywords: list = None, effect_duration: float = 0.3) -> VideoFileClip:
    """
    Adds sound effects to the video based on important keywords identified by AI.
    """
    if not effect_pack or effect_pack == 'none' or not transcript_path:
        logger.info("  [SFX] No sound effect pack selected or no transcript available. Skipping.")
        return video_clip

    print_section_header(f"Sound Effects ({effect_pack} pack)")
    
    try:
        sound_effects = SoundEffects(effect_pack=effect_pack)
        if not sound_effects.effects:
            logger.warning(f"  [SFX] Sound effect pack '{effect_pack}' not found or is empty.")
            return video_clip
    except Exception as e:
        logger.error(f"Sound effects processing failed: {e}")
        logger.warning("Sound effects not added, continuing with original video.")
        return video_clip
        
    try:
        # Parse SRT file to get timing information
        with open(transcript_path, 'r', encoding='utf-8') as f:
            srt_content = f.read()
        
        if not important_keywords:
            logger.info("  [SFX] No important keywords provided for sound effects.")
            return video_clip
        
        # Parse SRT segments to find keyword timings
        audio_clips = []
        for segment in srt_content.strip().split('\n\n'):
            lines = segment.strip().split('\n')
            if len(lines) < 3:
                continue
                
            time_line = lines[1]
            text = " ".join(lines[2:]).strip()
            
            # Parse timing (format: 00:00:01,000 --> 00:00:03,000)
            try:
                start_str, end_str = [t.strip() for t in time_line.split('-->')]
                start_time = _parse_srt_time(start_str)
                end_time = _parse_srt_time(end_str)
                
                # Check if any important keywords appear in this segment
                text_lower = text.lower()
                for keyword in important_keywords:
                    keyword_lower = keyword.lower()
                    if keyword_lower in text_lower:
                        # Find position of keyword within the segment
                        keyword_position = text_lower.find(keyword_lower)
                        segment_duration = end_time - start_time
                        
                        # Estimate when the keyword is spoken within the segment
                        keyword_ratio = keyword_position / len(text) if len(text) > 0 else 0.5
                        keyword_time = start_time + (segment_duration * keyword_ratio)
                        
                        # Get a sound effect for this keyword
                        effect_path = sound_effects.get_effect_for_keyword(keyword)
                        if effect_path:
                            effect_audio = AudioFileClip(str(effect_path))
                            # Make effect shorter and quieter using configurable duration
                            effect_audio = effect_audio.subclip(0, min(effect_duration, effect_audio.duration))
                            effect_audio = effect_audio.volumex(0.6)  # 60% volume for subtlety
                            effect_audio = effect_audio.set_start(keyword_time)
                            audio_clips.append(effect_audio)
                            
                            logger.info(f"  [SFX] Added effect for '{keyword}' at {keyword_time:.1f}s")
                        
                        break  # Only one effect per segment to avoid clutter
                        
            except Exception as e:
                logger.warning(f"  [SFX] Error parsing segment timing: {e}")
                continue

        if not audio_clips:
            logger.info("  [SFX] No sound effects added - keywords not found in transcript segments.")
            return video_clip

        logger.info(f"  [SFX] Adding {len(audio_clips)} keyword-timed sound effects.")
        
        # Combine with original audio
        original_audio = video_clip.audio
        final_audio = CompositeAudioClip([original_audio] + audio_clips)
        video_clip = video_clip.set_audio(final_audio)

    except Exception as e:
        logger.error(f"  [SFX] Error adding sound effects: {e}", exc_info=True)

    return video_clip

def _parse_srt_time(time_str: str) -> float:
    """Parse SRT time format (HH:MM:SS,mmm) to seconds."""
    time_str = time_str.replace(',', '.')
    parts = time_str.split(':')
    hours = int(parts[0])
    minutes = int(parts[1])
    seconds = float(parts[2])
    return hours * 3600 + minutes * 60 + seconds

def process_video(
    input_file_path: Path, 
    output_dir_base: Path,
    video_topic: str = "general",
    skip_audio: bool = False,
    skip_silence: bool = False,
    skip_transcription: bool = False,
    skip_gpt_correct: bool = False,
    skip_subtitle_burn: bool = False,
    skip_outro: bool = False,
    skip_broll: bool = False,
    skip_ai_highlights: bool = False,
    skip_topic_card: bool = False,
    skip_frame: bool = False,
    skip_flash_logo: bool = False,
    skip_dynamic_zoom: bool = False,
    skip_background_music: bool = False,
    skip_sound_effects: bool = False,
    whisper_model: str = 'small',
    use_ffmpeg_enhance: bool = True,
    use_ai_denoiser: bool = True,
    broll_clip_count: int = 5,
    broll_clip_duration: float = 4.0,
    broll_transition_style: str = 'fade',
    zoom_intensity: str = 'subtle',
    zoom_frequency: str = 'medium',
    music_track: str = 'random',
    music_speech_volume: float = 1.0,
    music_background_volume: float = 0.50,
    music_fade_in_duration: float = 1.0,
    music_fade_out_duration: float = 1.0,
    sound_effect_pack: str = 'sound-effects',
    sound_effect_duration: float = 0.3,
    gpt_model: str = 'gpt-4o-mini',
    highlight_style: str = 'yellow',
    silence_threshold: str = "-30dB",
    silence_duration: float = 0.5,
    smart_silence_detection: bool = False,
    subtitle_font_size: int = 8,
    frame_style: str = 'rainbow',
    use_ai_word_highlighting: bool = True,
    openai_api_key: str = None,
    pexels_api_key: str = None,
    # New configurable AI prompts
    topic_detection_prompt: str = '',
    transcription_correction_prompt: str = '',
    ai_highlights_prompt: str = '',
    broll_analysis_prompt: str = '',
    image_analysis_prompt: str = '',
    broll_keywords_prompt: str = '',
    image_generation_prompt: str = '',
    video_title_prompt: str = '',
    video_description_prompt: str = '',
    video_tags_prompt: str = '',
    # New settings for separate control
    image_generation_count: int = 2,
    image_display_duration: float = 4.0,
    image_quality: str = 'standard',
    image_transition_style: str = 'fade',
    skip_image_generation: bool = False,
    gpt_prompt_configs: dict = None,
    # Smart Mode settings - NEW
    use_smart_mode: bool = False,
    smart_broll_ratio: float = 1.5,
    smart_image_ratio: float = 6.0,
    # Random Mode settings
    random_mode_enabled: bool = False,
    random_frame_style: bool = False,
    random_music_track: bool = False,
    random_broll_transition: bool = False,
    random_image_transition: bool = False,
    random_highlight_style: bool = False,
    random_zoom_intensity: bool = False,
    random_zoom_frequency: bool = False,
    random_caption_style: bool = False,
    random_caption_animation: bool = False,
    random_topic_card_style: bool = False,
    random_outro_style: bool = False,
    random_sound_effect_pack: bool = False,
    # Bad Take Removal - NEW
    skip_bad_take_removal: bool = False,
    bad_take_detection_sensitivity: str = 'medium',
    bad_take_min_repetition_length: int = 3,
    bad_take_confidence_threshold: float = 0.7,
    # Enhanced Auto Zoom - NEW
    skip_enhanced_auto_zoom: bool = False,
    auto_zoom_mode: str = 'hybrid',
    auto_zoom_intensity: str = 'medium',
    auto_zoom_smoothness: str = 'high',
    auto_zoom_aspect_ratio: str = 'auto',
    auto_zoom_pause_detection: bool = True,
    auto_zoom_section_change_detection: bool = True,
    **kwargs
) -> Path | None:
    """Process a video with various enhancements."""
    
    # Apply random selections if random mode is enabled
    if random_mode_enabled:
        logger.info("🎲 Random Mode enabled - applying randomized settings")
        
        if random_frame_style and not skip_frame:
            frame_style = random.choice(FRAME_STYLES)
            logger.info(f"🎲 [Random] Selected frame style: {frame_style}")
            
        if random_music_track and not skip_background_music:
            # Keep 'none' as an option but don't make it common
            music_options = ['ambient', 'cinematic', 'upbeat', 'relaxing', 'dramatic', 'inspirational', 'tech']
            music_track = random.choice(music_options)
            logger.info(f"🎲 [Random] Selected music track: {music_track}")
            
        if random_broll_transition and not skip_broll:
            broll_transition_style = random.choice(TRANSITION_STYLES)
            logger.info(f"🎲 [Random] Selected B-roll transition style: {broll_transition_style}")
            
        if random_image_transition and not skip_image_generation:
            image_transition_style = random.choice(TRANSITION_STYLES)
            logger.info(f"🎲 [Random] Selected image transition style: {image_transition_style}")
            
        if random_highlight_style and not skip_ai_highlights:
            highlight_style = random.choice(HIGHLIGHT_STYLES)
            logger.info(f"🎲 [Random] Selected highlight style: {highlight_style}")
            
        if random_zoom_intensity and not skip_dynamic_zoom:
            zoom_intensity = random.choice(ZOOM_INTENSITIES)
            logger.info(f"🎲 [Random] Selected zoom intensity: {zoom_intensity}")
            
        if random_zoom_frequency and not skip_dynamic_zoom:
            zoom_frequency = random.choice(ZOOM_FREQUENCIES)
            logger.info(f"🎲 [Random] Selected zoom frequency: {zoom_frequency}")
            
        if random_caption_style and not skip_subtitles:
            caption_style = random.choice(CAPTION_STYLES)
            logger.info(f"🎲 [Random] Selected caption style: {caption_style}")
            
        if random_caption_animation and not skip_subtitles:
            caption_animation = random.choice(CAPTION_ANIMATIONS)
            logger.info(f"🎲 [Random] Selected caption animation: {caption_animation}")
            
        if random_topic_card_style and not skip_topic_card:
            topic_card_style = random.choice(TOPIC_CARD_STYLES)
            logger.info(f"🎲 [Random] Selected topic card style: {topic_card_style}")
            
        if random_outro_style and not skip_outro:
            outro_style = random.choice(OUTRO_STYLES)
            logger.info(f"🎲 [Random] Selected outro style: {outro_style}")
            
        if random_sound_effect_pack and not skip_sound_effects:
            sound_effect_options = ['sound-effects', 'minimal-pops', 'educational', 'professional']
            sound_effect_pack = random.choice(sound_effect_options)
            logger.info(f"🎲 [Random] Selected sound effect pack: {sound_effect_pack}")
    
    print_section_header(f"Processing Video: {input_file_path.name}")
    
    # Import moviepy components
    from moviepy.editor import VideoFileClip, AudioFileClip
    
    global EDITED_VIDEOS_DIR, TEMP_PROCESSING_DIR, PROCESSED_ORIGINALS_DIR
    EDITED_VIDEOS_DIR = output_dir_base / "edited_videos"
    TEMP_PROCESSING_DIR = output_dir_base / "temp_processing"
    PROCESSED_ORIGINALS_DIR = output_dir_base / "processed_originals"
    
    for d in [EDITED_VIDEOS_DIR, TEMP_PROCESSING_DIR, PROCESSED_ORIGINALS_DIR]:
        d.mkdir(parents=True, exist_ok=True)

    current_video_path = input_file_path
    srt_path = None

    try:
        # Determine the total number of steps to be executed for accurate progress reporting
        steps_to_execute = []
        if not skip_audio: steps_to_execute.append("Audio Enhancement")
        if not skip_silence: steps_to_execute.append("Silence Cutting")
        if not skip_bad_take_removal: steps_to_execute.append("Bad Take Removal")
        if not skip_transcription: steps_to_execute.append("Transcription")
        if not skip_gpt_correct: steps_to_execute.append("GPT Correction")
        if not skip_ai_highlights: steps_to_execute.append("AI Highlights")
        if not skip_broll: steps_to_execute.append("B-Roll Insertion")
        if not skip_enhanced_auto_zoom: steps_to_execute.append("Enhanced Auto Zoom")
        if not skip_subtitle_burn: steps_to_execute.append("Subtitle Burning")
        if not skip_topic_card: steps_to_execute.append("Topic Card")
        if not skip_frame: steps_to_execute.append("Frame Addition")
        if not skip_flash_logo: steps_to_execute.append("Logo Flash")
        if not skip_outro: steps_to_execute.append("Outro")
        if not skip_background_music: steps_to_execute.append("Background Music")
        if not skip_sound_effects: steps_to_execute.append("Sound Effects")
        
        total_steps = len(steps_to_execute)
        step_counter = 0

        def get_step():
            nonlocal step_counter
            step_counter += 1
            return step_counter

        # --- Video Processing Pipeline ---
        current_video_path = input_file_path

        # ================= PHASE 1: Audio Clean-up & Timing Lock =================

        # Step 1: Audio Enhancement
        if not skip_audio:
            send_step_progress("Audio Enhancement", get_step(), total_steps, "Normalizing audio and reducing noise...")
            enhanced_audio_path = enhance_audio(
                audio_path=str(current_video_path),
                use_ffmpeg=use_ffmpeg_enhance,
                use_ai=use_ai_denoiser
            )
            if enhanced_audio_path != str(current_video_path):
                # If enhancement produced a new file, we need to merge it back with the video
                temp_output = TEMP_PROCESSING_DIR / f"audio_merged_{current_video_path.stem}.mp4"
                clip = VideoFileClip(str(current_video_path))
                enhanced_audio = AudioFileClip(enhanced_audio_path)
                clip = clip.set_audio(enhanced_audio)
                clip.write_videofile(str(temp_output), codec="libx264", audio_codec="aac")
                current_video_path = temp_output
                logger.info("✅ Audio enhancement completed.")
            else:
                logger.info("Audio enhancement skipped or failed, using original audio.")
        
        # Step 2: Silence Removal  
        if not skip_silence:
            send_step_progress("Silence Removal", get_step(), total_steps, "Trimming dead air with stable noise floor...")
            silence_cut_path = TEMP_PROCESSING_DIR / f"silence_cut_{current_video_path.stem}.mp4"
            if cut_silence_auto_editor(current_video_path, silence_cut_path, threshold_str=silence_threshold, margin=silence_duration, smart_detection=smart_silence_detection):
                current_video_path = silence_cut_path
                logger.info("✅ Silence removal completed.")
            else:
                logger.warning("Silence removal failed, continuing with original video.")

        # Step 3: Transcription
        transcript_path = TEMP_PROCESSING_DIR / f"{current_video_path.stem}.srt"
        if not skip_transcription:
            send_step_progress("Transcription", get_step(), total_steps, "Creating base captions...")
            if not transcribe_video_whisper(current_video_path, transcript_path, model_name=whisper_model):
                logger.error("Transcription failed. Subtitle-dependent steps will be skipped.")
                skip_gpt_correct = skip_subtitle_burn = skip_ai_highlights = skip_broll = True
        else:
            # Create a dummy transcript file if transcription is skipped, for subsequent steps
            transcript_path.touch()

        # Step 3.5: Bad Take Removal (NEW - requires transcript)
        if not skip_bad_take_removal and transcript_path.exists() and transcript_path.stat().st_size > 0:
            send_step_progress("Bad Take Removal", get_step(), total_steps, "Analyzing transcript for repeated lines using text + audio similarity...")
            
            bad_takes = detect_bad_takes(
                transcript_path,
                video_path=current_video_path,
                sensitivity=bad_take_detection_sensitivity,
                min_repetition_length=bad_take_min_repetition_length,
                confidence_threshold=bad_take_confidence_threshold,
                use_hybrid_detection=True
            )
            
            if bad_takes:
                bad_take_removed_path = TEMP_PROCESSING_DIR / f"bad_takes_removed_{current_video_path.stem}.mp4"
                if remove_bad_takes(current_video_path, bad_take_removed_path, bad_takes):
                    current_video_path = bad_take_removed_path
                    logger.info("✅ Bad take removal completed.")
                    
                    # Re-transcribe the edited video to get accurate timestamps
                    logger.info("Re-transcribing video after bad take removal...")
                    if transcribe_video_whisper(current_video_path, transcript_path, model_name=whisper_model):
                        logger.info("✅ Re-transcription completed.")
                    else:
                        logger.warning("Re-transcription failed, using original transcript (may have timing issues).")
                else:
                    logger.warning("Bad take removal failed, continuing with previous video.")
            else:
                logger.info("No bad takes detected.")

        # Step 4: GPT Correction
        if not skip_gpt_correct and transcript_path.exists():
            send_step_progress("GPT Correction", get_step(), total_steps, "Fixing medical terms & re-lining text (≤12 words/line)...")
            if not correct_subtitles_with_gpt4o(transcript_path, topic=video_topic, model_name=gpt_model, openai_api_key=openai_api_key, custom_prompt=transcription_correction_prompt):
                logger.warning("GPT subtitle correction failed.")

        # ================= PHASE 2: Semantic Analysis & Content Insertion =================
        
        # Step 5: AI Topic Detection
        if transcript_path.exists() and transcript_path.stat().st_size > 0:
            send_step_progress("AI Topic Detection", get_step(), total_steps, "Auto-detecting video topic for hashtags/titles...")
            with open(transcript_path, "r", encoding="utf-8") as f:
                transcript_text = f.read()
            
            # Use custom prompt if provided
            custom_prompt = topic_detection_prompt if topic_detection_prompt else None
            video_topic = detect_video_topic_with_gpt(transcript_text, openai_api_key, custom_prompt)
            logger.info(f"✅ Auto-detected topic: '{video_topic}'")

        # Step 6: AI Multimedia Analysis
        if (not skip_broll or not skip_image_generation) and transcript_path.exists():
            send_step_progress("AI Multimedia Analysis", get_step(), total_steps, "Finding visual anchor points in corrected transcript...")
            with open(transcript_path, "r", encoding="utf-8") as f:
                transcript_text = f.read()
        
        # Step 7: AI Highlights  
        if (not skip_ai_highlights or use_ai_word_highlighting) and transcript_path.exists():
            send_step_progress("AI Highlights", get_step(), total_steps, "Choosing key phrases for highlighting...")
            highlight_data = find_key_moments_with_gpt(transcript_text, video_topic, openai_api_key=openai_api_key, custom_prompt=ai_highlights_prompt)
            key_moments = highlight_data.get("highlights", [])
            important_keywords = highlight_data.get("keywords", [])
            
            if (key_moments or important_keywords) and use_ai_word_highlighting:
                # Combine key moments and keywords for highlighting
                all_highlights = key_moments + important_keywords
                ass_path = TEMP_PROCESSING_DIR / f"highlighted_{current_video_path.stem}.ass"
                if convert_srt_to_ass_with_highlights(transcript_path, ass_path, all_highlights, highlight_style):
                    # The highlights are burned along with subtitles later
                    logger.info(f"✅ AI word highlighting generated with {len(all_highlights)} items and saved to '{ass_path.name}'.")
                else:
                    logger.warning("Failed to convert SRT to ASS for word highlighting.")
            elif not use_ai_word_highlighting:
                logger.info("AI word highlighting disabled by user.")
            else:
                logger.info("No key moments or keywords found for highlighting.")
        
            # Store keywords for sound effects timing (only if sound effects are not skipped)
            if important_keywords and not skip_sound_effects:
                logger.info(f"✅ Found {len(important_keywords)} important keywords for sound effects: {important_keywords[:3]}...")
            else:
                important_keywords = []
        
        # Step 8: AI B-Roll & Image Generation (Comprehensive AI Multimedia)
        print(f"🎬 Multimedia Check: skip_broll={skip_broll}, skip_image_generation={skip_image_generation}, transcript_exists={transcript_path.exists()}")
        if (not skip_broll or not skip_image_generation) and transcript_path.exists():
            print(f"🎬 STARTING: Multimedia processing (B-roll: {not skip_broll}, Images: {not skip_image_generation})")
            
            # Smart Mode: Calculate optimal counts based on silence-removed duration
            actual_broll_count = broll_clip_count
            actual_image_count = image_generation_count
            
            if use_smart_mode:
                # Get the current video duration (silence-removed)
                silence_removed_duration = get_video_duration(current_video_path)
                smart_broll_count, smart_image_count = calculate_smart_multimedia_counts(
                    silence_removed_duration, smart_broll_ratio, smart_image_ratio
                )
                actual_broll_count = smart_broll_count
                actual_image_count = smart_image_count
                print(f"🧠 SMART MODE: {silence_removed_duration:.1f}s → {smart_broll_count} B-roll + {smart_image_count} images")
                send_step_progress("AI Multimedia", get_step(), total_steps, f"Smart Mode: Calculated {smart_broll_count} B-roll + {smart_image_count} images for {silence_removed_duration:.1f}s video...")
            else:
                print(f"📝 MANUAL MODE: Using preset counts ({broll_clip_count} B-roll + {image_generation_count} images)")
                send_step_progress("AI Multimedia", get_step(), total_steps, "Analyzing for B-roll and image placements...")
            
            try:
                new_video_path = create_comprehensive_multimedia_video(
                current_video_path,
                transcript_path,
                    video_topic,
                openai_api_key=openai_api_key,
                pexels_api_key=pexels_api_key,
                    transition_style=broll_transition_style,
                    broll_analysis_prompt=broll_analysis_prompt,
                    image_analysis_prompt=image_analysis_prompt,
                    skip_broll=skip_broll,
                    skip_image_generation=skip_image_generation,
                    image_generation_prompt=image_generation_prompt,
                    image_generation_count=actual_image_count,
                    image_display_duration=image_display_duration,
                    image_quality=image_quality,
                    image_transition_style=image_transition_style,
                    broll_clip_count=actual_broll_count,
                    broll_clip_duration=broll_clip_duration
                )
                if new_video_path and new_video_path != current_video_path:
                    current_video_path = new_video_path
                    print(f"🎬 SUCCESS: Multimedia processing completed - new path: {current_video_path.name}")
                else:
                    print(f"🎬 WARNING: Multimedia processing returned same path or None")
                    logger.info("✅ Comprehensive AI multimedia integration completed.")
                    print(f"🎬 SKIPPED: Multimedia processing (condition not met)")

            except Exception as e:
                logger.warning(f'Error in try block: {e}')
                pass
        # Step 9: Enhanced Auto Zoom
        if not skip_enhanced_auto_zoom:
            send_step_progress("Enhanced Auto Zoom", get_step(), total_steps, "Applying intelligent face/focal point detection with context-aware zooming...")
            zoomed_video_path = TEMP_PROCESSING_DIR / f"enhanced_zoom_{current_video_path.stem}.mp4"
            
            # Use the transcript if available for timing analysis
            transcript_for_zoom = transcript_path if transcript_path and transcript_path.exists() else None
            
            if apply_enhanced_auto_zoom(
                current_video_path, 
                zoomed_video_path,
                transcript_path=transcript_for_zoom,
                mode=auto_zoom_mode,
                intensity=auto_zoom_intensity,
                smoothness=auto_zoom_smoothness,
                aspect_ratio=auto_zoom_aspect_ratio,
                pause_detection=auto_zoom_pause_detection,
                section_change_detection=auto_zoom_section_change_detection
            ):
                current_video_path = zoomed_video_path
                logger.info("✅ Enhanced auto zoom completed.")
            else:
                logger.warning("Enhanced auto zoom failed, continuing with previous video.")
            
        # ================= PHASE 3: Narrative Structure (Hook → Body → CTA) =================
        
        # Step 10: Topic Title Card (animated 3s intro hook)
        if not skip_topic_card:
            send_step_progress("Topic Title Card", get_step(), total_steps, "Animated 3s intro hook that viewers see first...")
            topic_card_video_path = TEMP_PROCESSING_DIR / f"topic_card_{current_video_path.stem}.mp4"
            if add_topic_card(current_video_path, topic_card_video_path, topic=video_topic):
                current_video_path = topic_card_video_path
                logger.info(f"✅ Topic title card added successfully with topic: '{video_topic}'")
            else:
                logger.warning("Topic title card addition failed, continuing without it.")

        # Step 11: Flash Logo (0.5-1s stinger right after title card)
        if not skip_flash_logo:
            send_step_progress("Flash Logo", get_step(), total_steps, "0.5-1s stinger right after title card...")
            logo_video_path = TEMP_PROCESSING_DIR / f"logo_{current_video_path.stem}.mp4"
            if add_daily_question_logo(current_video_path, logo_video_path):
                current_video_path = logo_video_path
                logger.info("✅ Flash logo added successfully.")
            else:
                logger.warning("Flash logo addition failed, continuing without it.")

        # Step 12: Outro Addition (3-4s CTA block at the end)
        if not skip_outro:
            send_step_progress("Outro Addition", get_step(), total_steps, "3-4s CTA block at the end...")
            outro_video_path = TEMP_PROCESSING_DIR / f"outro_{current_video_path.stem}.mp4"
            if add_outro_ffmpeg(current_video_path, outro_video_path):
                current_video_path = outro_video_path
                logger.info("✅ Outro addition completed.")
            else:
                logger.warning("Outro addition failed, continuing without it.")

        # ================= PHASE 4: Styling & Audio Polish =================
        
        # Step 13: Background Music (lay music bed once timing & cuts are frozen)
        print(f"🎵 Background Music Check: skip={skip_background_music}, track='{music_track}'")
        if not skip_background_music:
            print(f"🎵 STARTING: Background music processing")
            send_step_progress("Background Music", get_step(), total_steps, "Laying music bed once timing & cuts are frozen...")
            music_added_path = TEMP_PROCESSING_DIR / f"music_{current_video_path.stem}.mp4"
            if add_background_music(current_video_path, music_added_path, music_track, video_topic,
                                music_speech_volume, music_background_volume, 
                                music_fade_in_duration, music_fade_out_duration):
                current_video_path = music_added_path
                print(f"🎵 SUCCESS: Background music added")
                logger.info("✅ Background music added successfully.")
            else:
                print(f"🎵 FAILED: Background music not added")
                logger.warning("Background music not added.")
                print(f"🎵 SKIPPED: Background music (skip flag enabled)")

        # Step 14: Sound Effects (drop pops on important keywords)
        if not skip_sound_effects:
            send_step_progress("Sound Effects", get_step(), total_steps, "Adding pops on important keywords...")
            video_clip = None
            sfx_video_clip = None
            try:
                # Load the video clip for sound effects processing
                video_clip = VideoFileClip(str(current_video_path))
                
                # Use keywords from AI highlights if available, otherwise empty list
                keywords_for_sfx = important_keywords if 'important_keywords' in locals() else []
                sfx_video_clip = add_sound_effects(video_clip, transcript_path, sound_effect_pack, keywords_for_sfx, sound_effect_duration)
                
                if sfx_video_clip and sfx_video_clip is not video_clip:
                    # Sound effects were added, save the new clip
                    sfx_added_path = TEMP_PROCESSING_DIR / f"sfx_{current_video_path.stem}.mp4"
                    sfx_video_clip.write_videofile(str(sfx_added_path), codec="libx264", audio_codec="aac")
                    current_video_path = sfx_added_path
                logger.info("✅ Sound effects added successfully.")
                    # Close the clips to free up resources

            except Exception as e:
                logger.warning(f'Error in try block: {e}')
                pass
        # Step 15: Subtitle Burning (embed styled captions before frame to get sizing right)
        if not skip_subtitle_burn and transcript_path.exists():
            send_step_progress("Subtitle Burning", get_step(), total_steps, "Embedding styled captions...")
            subtitled_video_path = TEMP_PROCESSING_DIR / f"subtitled_{current_video_path.stem}.mp4"
            subtitle_file_to_burn = TEMP_PROCESSING_DIR / f"highlighted_{current_video_path.stem}.ass"
            if not subtitle_file_to_burn.exists():
                subtitle_file_to_burn = transcript_path

            # Use configurable font size
            font_size = subtitle_font_size  # Default to 8 if not specified
            logger.info(f"  [Subtitle Burn] Using font size: {font_size}")
            
            if burn_subtitles_ffmpeg(current_video_path, subtitle_file_to_burn, subtitled_video_path, font_size=font_size):
                current_video_path = subtitled_video_path
                logger.info(f"✅ Subtitles burned successfully with font size {font_size}.")
            else:
                logger.warning("Subtitle burning failed, continuing without subtitles.")

        # Step 16: Add Frame (gradient border AFTER subtitle burn to preserve the frame)
        if not skip_frame:
            send_step_progress("Add Frame", get_step(), total_steps, "Adding gradient border (Shorts) - preserves subtitles...")
            framed_video_path = TEMP_PROCESSING_DIR / f"framed_{current_video_path.stem}.mp4"
            if add_colorful_frame(current_video_path, framed_video_path, frame_style=frame_style):
                current_video_path = framed_video_path
                logger.info("✅ Frame added successfully.")
            else:
                logger.warning("Frame addition failed, continuing without it.")

        # ================= PHASE 5: Packaging for Upload =================
        # Note: Thumbnail Generation and Playlist Assignment happen after upload in the workflow
        
        # Finalization: Move processed video to the final output directory
        final_output_path = EDITED_VIDEOS_DIR / input_file_path.name
        shutil.move(current_video_path, final_output_path)
        logger.info(f"✅ Processing complete. Final video at: {final_output_path}")
        return final_output_path

    finally:
        logger.info("Cleaning up temporary processing directory...")
        # shutil.rmtree(TEMP_PROCESSING_DIR)

def analyze_transcript_for_broll_with_gpt(transcript_text: str, video_duration: float, openai_api_key: str = None) -> list[dict]:
    """
    Use GPT to analyze the transcript and determine optimal B-roll placement.
    Returns a list of B-roll suggestions with timing, search terms, and duration.
    """
    logger.info(f"  [AI B-Roll] Analyzing transcript for intelligent B-roll placement...")
    
    api_key = openai_api_key or OPENAI_API_KEY
    if not api_key:
        logger.warning("  [AI B-Roll] No OpenAI API key available for intelligent B-roll analysis.")
        return []

    prompt = f"""
Analyze this video transcript and suggest optimal B-roll placements. The video is {video_duration:.1f} seconds long.

For each B-roll suggestion, provide:
1. Start time (in seconds) - when to begin showing B-roll
2. Duration (in seconds) - how long the B-roll should play (typically 2-5 seconds)
3. Search query - specific terms to find relevant footage
4. Content description - what's being discussed during this time

Rules:
- Suggest 3-5 B-roll moments maximum
- Focus on visual concepts, medical terms, or key explanatory moments
- Avoid placing B-roll during important speaker introductions or conclusions
- Each B-roll should enhance understanding of what's being said
- Search queries should be specific and visual (e.g., "microscopic bacteria", "medical injection", "laboratory test")

Transcript:
{transcript_text}

Respond in JSON format:
{{
  "broll_suggestions": [
    {{
      "start_time": 5.2,
      "duration": 3.5,
      "search_query": "bacteria microscope medical",
      "content_description": "Discussion of bacterial infections"
    }}
  ]
}}
"""

    try:
        client = openai.OpenAI(api_key=api_key)
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            response_format={"type": "json_object"},
            messages=[
                {"role": "system", "content": "You are a professional video editor specializing in educational and medical content. You analyze transcripts to suggest optimal B-roll placement that enhances viewer understanding."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.3
        )
        result_data = json.loads(response.choices[0].message.content)
        broll_suggestions = result_data.get("broll_suggestions", [])
        
        # Validate the suggestions
        valid_suggestions = []
        for suggestion in broll_suggestions:
            if (isinstance(suggestion.get("start_time"), (int, float)) and 
                isinstance(suggestion.get("duration"), (int, float)) and
                isinstance(suggestion.get("search_query"), str) and
                0 <= suggestion["start_time"] < video_duration and
                1 <= suggestion["duration"] <= 8):
                valid_suggestions.append(suggestion)
        
        logger.info(f"  [AI B-Roll] GPT suggested {len(valid_suggestions)} intelligent B-roll placements")
        for i, suggestion in enumerate(valid_suggestions, 1):
            logger.info(f"    {i}. At {suggestion['start_time']:.1f}s for {suggestion['duration']:.1f}s: '{suggestion['search_query']}'")
        
        return valid_suggestions
        
    except Exception as e:
        logger.error(f"  [AI B-Roll] Error getting intelligent B-roll suggestions from GPT: {e}")
        return []

def search_and_download_smart_broll(broll_suggestions: list, output_dir: Path, pexels_api_key: str = None) -> list[dict]:
    """
    Download B-roll clips based on intelligent GPT suggestions.
    Returns a list of downloaded clips with their suggested timing.
    """
    print(f"📹 B-roll Download: {len(broll_suggestions)} clips")
    logger.info(f"  [AI B-Roll] Downloading {len(broll_suggestions)} intelligently selected B-roll clips...")
    
    # Use passed API key or fall back to global one
    api_key = pexels_api_key or PEXELS_API_KEY
    if not api_key:
        print(f"📹 ERROR: No Pexels API key available")
        logger.warning("  [AI B-Roll] Pexels API key not set. Skipping smart B-roll download.")
        return []
    
    if PexelsAPI is None:
        print(f"📹 ERROR: Pexels API library not available")
        logger.error("  [AI B-Roll] Pexels API library not available. Install with: pip install pexels-api-py")
        return []
    
    downloaded_clips = []
    
    for i, suggestion in enumerate(broll_suggestions):
        search_query = suggestion["search_query"]
        print(f"📹 Searching: '{search_query}' ({i+1}/{len(broll_suggestions)})")
        
        try:
            logger.info(f"  [AI B-Roll] Searching for: '{search_query}'")
            
            # Use direct API call for videos
            headers = {'Authorization': api_key}
            response = requests.get(
                f'https://api.pexels.com/videos/search?query={search_query}&per_page=5&page=1',
                headers=headers
            )
            response.raise_for_status()
            data = response.json()
            
            videos = data.get('videos', [])
            if not videos:
                print(f"📹 No results for '{search_query}'")
                logger.warning(f"  [AI B-Roll] No video results for '{search_query}'")
                continue

            # Find the best quality video that's not too large
            for video in videos:
                if 'video_files' not in video:
                    continue
                
                video_files = video['video_files']
                suitable_files = [f for f in video_files if f.get('width', 0) < 1500]
                if not suitable_files:
                    continue
                
                # Sort by width (higher quality first)
                best_file = sorted(suitable_files, key=lambda x: x.get('width', 0), reverse=True)[0]
                video_url = best_file['link']
                
                # Create descriptive filename
                safe_query = search_query.replace(' ', '_').replace(',', '')[:30]
                file_name = f"smart_broll_{i+1}_{safe_query}.mp4"
                output_path = output_dir / file_name
                
                logger.info(f"  [AI B-Roll] Downloading '{search_query}' B-roll...")
                response = requests.get(video_url, stream=True, timeout=60)
                response.raise_for_status()
                
                with open(output_path, 'wb') as f:
                    for chunk in response.iter_content(chunk_size=8192):
                        f.write(chunk)
                
                if output_path.exists():
                    file_size = output_path.stat().st_size
                    print(f"📹 Downloaded: {file_size/1024/1024:.1f}MB")
                    logger.info(f"  [AI B-Roll] Downloaded: {output_path.name}")
                    
                    # Add to downloaded clips with timing info
                    clip_info = suggestion.copy()
                    clip_info['file_path'] = output_path
                    downloaded_clips.append(clip_info)
                else:
                    print(f"📹 ERROR: File not created")
                    break
                
            print(f"📹 ERROR: Failed to download '{search_query}' - {str(e)[:60]}")
            logger.error(f"  [AI B-Roll] Failed to download for '{search_query}': {e}")
            continue
            
            pass
        except Exception as e:
            logger.warning(f'Error in try block: {e}')
            pass
    print(f"📹 SUCCESS: Downloaded {len(downloaded_clips)} B-roll clips")
    logger.info(f"  [AI B-Roll] Successfully downloaded {len(downloaded_clips)} smart B-roll clips")
    return downloaded_clips

def insert_smart_broll_clips(
    video_path: Path, 
    transcript_path: Path, 
    openai_api_key: str = None, 
    pexels_api_key: str = None,
    transition_style: str = 'fade'
) -> Path:
    """
    Intelligently inserts B-roll clips based on GPT analysis of the transcript.
    Uses AI to determine optimal timing, duration, and search terms.
    """
    print_section_header("Intelligent AI B-Roll Insertion")
    temp_dir = Path(tempfile.gettempdir())
    output_path = temp_dir / f"smart_broll_final_{uuid.uuid4()}.mp4"
    
    main_clip = None
    opened_broll_clips = []

    try:
        # Load main video clip
        main_clip = VideoFileClip(str(video_path))
        duration = main_clip.duration
        
        # Read the GPT-corrected transcript
        with open(transcript_path, 'r', encoding='utf-8') as f:
            transcript_text = f.read()
        
        # Use GPT to analyze transcript and suggest intelligent B-roll placements
        broll_suggestions = analyze_transcript_for_broll_with_gpt(transcript_text, duration, openai_api_key)
        
        if not broll_suggestions:
            logger.warning("  [AI B-Roll] No intelligent B-roll suggestions generated. Skipping B-roll.")
            return video_path
        
        # Download B-roll clips based on intelligent suggestions
        broll_download_dir = temp_dir / "smart_broll_downloads"
        broll_download_dir.mkdir(exist_ok=True)
        downloaded_clips = search_and_download_smart_broll(broll_suggestions, broll_download_dir, pexels_api_key)
        
        if not downloaded_clips:
            logger.warning("  [AI B-Roll] No smart B-roll clips were downloaded. Skipping B-roll.")
            return video_path
        
        logger.info(f"  [AI B-Roll] Inserting {len(downloaded_clips)} intelligently placed B-roll clips")

        # Create B-roll overlays with precise timing
        broll_overlays = []
        for clip_info in downloaded_clips:
            try:
                start_time = float(clip_info['start_time'])
                clip_duration = float(clip_info['duration'])
                file_path = clip_info['file_path']
                
                # Ensure timing doesn't exceed video duration
                if start_time + clip_duration > duration:
                    clip_duration = duration - start_time
                
                if clip_duration <= 0:
                    continue
                
                broll_clip = VideoFileClip(str(file_path)).subclip(0, clip_duration)
                opened_broll_clips.append(broll_clip)
                
                # Resize B-roll to match main video and remove its audio
                broll_clip = broll_clip.resize(main_clip.size).set_audio(None)

                # Apply transition effects
                if transition_style == 'fade':
                    fade_duration = min(0.5, clip_duration / 4)
                    broll_clip = broll_clip.fadein(fade_duration).fadeout(fade_duration)

                # Set the precise start time based on AI analysis
                broll_clip = broll_clip.set_start(start_time)
                broll_overlays.append(broll_clip)
                
                logger.info(f"    📹 B-roll at {start_time:.1f}s for {clip_duration:.1f}s: {clip_info['search_query']}")
                
            except Exception as e:
                logger.error(f"  [AI B-Roll] Error processing clip {clip_info.get('search_query', 'unknown')}: {e}")
                continue

        if not broll_overlays:
            logger.warning("  [AI B-Roll] No B-roll overlays could be created.")
            return video_path

        # Create the composite video with intelligent B-roll placement
        final_clip = CompositeVideoClip([main_clip] + broll_overlays)
        
        # Write the final video file
        final_clip.write_videofile(
            str(output_path), 
            codec="libx264", 
            audio_codec="aac",
            temp_audiofile=str(temp_dir / f"temp_audio_{uuid.uuid4()}.m4a"),
            remove_temp=True,
            verbose=False,
            logger=None
        )
        logger.info(f"  [AI B-Roll] Intelligent B-roll insertion completed! Output: {output_path}")

        # Close all clips
        final_clip.close()
        for clip in opened_broll_clips:
            clip.close()
        main_clip.close()
        
        return output_path
    
        # Cleanup
        if main_clip: main_clip.close()
        for clip in opened_broll_clips: clip.close()
        return video_path

        pass
    except Exception as e:
        logger.warning(f'Error in try block: {e}')
        pass
def detect_video_topic_with_gpt(transcript_text: str, openai_api_key: str = None, custom_prompt: str = None) -> str:
    """
    Use GPT to automatically detect the video topic from the transcript.
    Returns a 3-word topic description for use in topic cards and image generation.
    """
    logger.info(f"  [AI Topic Detection] Analyzing transcript to detect topic...")
    
    api_key = openai_api_key or OPENAI_API_KEY
    if not api_key:
        logger.warning("  [AI Topic Detection] No OpenAI API key available. Using default topic.")
        return "Medical Education"

    if custom_prompt:
        prompt = custom_prompt.replace("{transcript}", transcript_text)
    else:
        prompt = f"""
        Analyze this video transcript and determine the main topic. Respond with exactly 3 words that best describe the subject matter.

Examples:
- "Immune System Basics"
- "Heart Disease Prevention" 
- "Cancer Cell Biology"
- "Diabetes Management Tips"
- "Mental Health Awareness"

Make it professional, specific, and educational. Focus on the core medical/scientific concept being discussed.

Transcript:
{transcript_text}

Respond with only the 3-word topic:
"""

    try:
        client = openai.OpenAI(api_key=api_key)
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": "You are a medical education specialist who analyzes content to identify key topics. Always respond with exactly 3 words."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.3,
            max_tokens=10
        )
        
        topic = response.choices[0].message.content.strip()
        
        # Validate it's approximately 3 words
        words = topic.split()
        if len(words) == 3:
            logger.info(f"  [AI Topic Detection] Detected topic: '{topic}'")
            return topic
        else:
            logger.warning(f"  [AI Topic Detection] Got {len(words)} words instead of 3. Using first 3.")
            return " ".join(words[:3]) if len(words) >= 3 else "Medical Education"
            
    except Exception as e:
        logger.error(f"  [AI Topic Detection] Error detecting topic: {e}")
        return "Medical Education"

def analyze_transcript_for_multimedia_with_gpt(transcript_text: str, video_duration: float, detected_topic: str, openai_api_key: str = None, custom_prompt: str = None) -> dict:
    """
    Use GPT to analyze the transcript and determine optimal placement for both B-roll and generated images.
    Returns a comprehensive multimedia plan with timing, search terms, and image descriptions.
    """
    logger.info(f"  [AI Multimedia Analysis] Analyzing transcript for B-roll and image placements...")
    
    api_key = openai_api_key or OPENAI_API_KEY
    if not api_key:
        logger.warning("  [AI Multimedia Analysis] No OpenAI API key available.")
        return {"broll_suggestions": [], "image_suggestions": []}

    if custom_prompt:
        prompt = custom_prompt.replace("{topic}", detected_topic).replace("{duration}", str(video_duration)).replace("{transcript}", transcript_text)
    else:
        prompt = f"""
        Analyze this video transcript about "{detected_topic}" and create a comprehensive multimedia plan. The video is {video_duration:.1f} seconds long.

Create suggestions for both B-roll footage and custom generated images:

**B-ROLL FOOTAGE** (from stock video sites):
- Use for general concepts, medical procedures, laboratory scenes
- Search terms should be realistic and findable on stock sites
- 3-5 B-roll moments maximum

**GENERATED IMAGES** (custom illustrations):
- Use for specific explanations, diagrams, complex concepts
- Descriptions should be detailed for image generation
- 2-4 generated images maximum

For each suggestion, provide:
1. Start time (in seconds) - when to begin showing the media
2. Duration (in seconds) - how long it should play (2-6 seconds)
3. Content description - what's being discussed during this time
4. For B-roll: Search query for stock footage
5. For Images: Detailed description for AI image generation

Rules:
- Don't overlap B-roll and images at the same time
- Focus on key explanatory moments that need visual aid
- Avoid placing media during speaker introductions or conclusions
- B-roll search terms should be simple and stock-video friendly
- Image descriptions should be detailed and professional

Transcript:
{transcript_text}

Respond in JSON format:
{{
  "broll_suggestions": [
    {{
      "start_time": 15.2,
      "duration": 3.5,
      "search_query": "medical laboratory microscope",
      "content_description": "Discussion of laboratory testing"
    }}
  ],
  "image_suggestions": [
    {{
      "start_time": 25.8,
      "duration": 4.0,
      "image_description": "Professional medical diagram showing the cross-linking process of IgE antibodies on mast cell surfaces, with clear labels and arrows indicating the binding mechanism, clean white background, educational illustration style",
      "content_description": "Explanation of IgE cross-linking mechanism"
    }}
  ]
}}
"""

    try:
        client = openai.OpenAI(api_key=api_key)
        response = client.chat.completions.create(
            model="gpt-4o",
            response_format={"type": "json_object"},
            messages=[
                {"role": "system", "content": f"You are a professional video editor and medical illustrator specializing in {detected_topic}. You analyze transcripts to suggest optimal multimedia placement that enhances viewer understanding."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.3
        )
        result_data = json.loads(response.choices[0].message.content)
        
        # Validate the suggestions
        broll_suggestions = []
        image_suggestions = []
        
        for suggestion in result_data.get("broll_suggestions", []):
            if (isinstance(suggestion.get("start_time"), (int, float)) and 
                isinstance(suggestion.get("duration"), (int, float)) and
                isinstance(suggestion.get("search_query"), str) and
                0 <= suggestion["start_time"] < video_duration and
                2 <= suggestion["duration"] <= 8):
                broll_suggestions.append(suggestion)
        
        for suggestion in result_data.get("image_suggestions", []):
            if (isinstance(suggestion.get("start_time"), (int, float)) and 
                isinstance(suggestion.get("duration"), (int, float)) and
                isinstance(suggestion.get("image_description"), str) and
                0 <= suggestion["start_time"] < video_duration and
                2 <= suggestion["duration"] <= 8):
                image_suggestions.append(suggestion)
        
        logger.info(f"  [AI Multimedia Analysis] Generated {len(broll_suggestions)} B-roll and {len(image_suggestions)} image suggestions")
        
        return {
            "broll_suggestions": broll_suggestions,
            "image_suggestions": image_suggestions
        }
        
    except Exception as e:
        logger.error(f"  [AI Multimedia Analysis] Error analyzing transcript: {e}")
        return {"broll_suggestions": [], "image_suggestions": []}

def analyze_transcript_for_broll_suggestions(transcript_text: str, video_duration: float, detected_topic: str, openai_api_key: str = None, custom_prompt: str = None) -> dict:
    """
    Use GPT to analyze the transcript specifically for B-roll stock footage placements.
    Returns B-roll suggestions with timing and search terms.
    """
    logger.info(f"  [AI B-roll Analysis] Analyzing transcript for B-roll placements...")
    
    api_key = openai_api_key or OPENAI_API_KEY
    if not api_key:
        logger.warning("  [AI B-roll Analysis] No OpenAI API key available.")
        return {"broll_suggestions": []}

    if custom_prompt:
        prompt = custom_prompt.replace("{topic}", detected_topic).replace("{duration}", str(video_duration)).replace("{transcript}", transcript_text)
    else:
        prompt = f"""
        Analyze this video transcript about "{detected_topic}" and suggest optimal B-roll stock footage placements. The video is {video_duration:.1f} seconds long.

        **B-ROLL STRATEGY:**
        - Use for general concepts, medical procedures, laboratory scenes
        - Search terms should be realistic and findable on stock sites
        - 3-5 B-roll moments maximum
        - Focus on key explanatory moments that need visual aid

        For each suggestion, provide:
        1. Start time (in seconds) - when to begin showing the media
        2. Duration (in seconds) - how long it should play (2-6 seconds)
        3. Search query for stock footage
        4. Content description - what's being discussed during this time

        Respond in JSON format:
        {{
          "broll_suggestions": [
            {{
              "start_time": 15.2,
              "duration": 3.5,
              "search_query": "medical laboratory microscope",
              "content_description": "Discussion of laboratory testing"
            }}
          ]
        }}

        Transcript: {transcript_text}
        """

    try:
        client = openai.OpenAI(api_key=api_key)
        response = client.chat.completions.create(
            model="gpt-4o",
            response_format={"type": "json_object"},
            messages=[
                {"role": "system", "content": f"You are a professional video editor specializing in {detected_topic}. You analyze transcripts to suggest optimal B-roll placement."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.3
        )
        result_data = json.loads(response.choices[0].message.content)
        
        # Validate the suggestions
        broll_suggestions = []
        for suggestion in result_data.get("broll_suggestions", []):
            if (isinstance(suggestion.get("start_time"), (int, float)) and 
                isinstance(suggestion.get("duration"), (int, float)) and
                isinstance(suggestion.get("search_query"), str) and
                0 <= suggestion["start_time"] < video_duration and
                2 <= suggestion["duration"] <= 8):
                broll_suggestions.append(suggestion)
        
        logger.info(f"  [AI B-roll Analysis] Generated {len(broll_suggestions)} B-roll suggestions")
        return {"broll_suggestions": broll_suggestions}
        
    except Exception as e:
        logger.error(f"  [AI B-roll Analysis] Error analyzing transcript: {e}")
        return {"broll_suggestions": []}

def analyze_transcript_for_image_suggestions(transcript_text: str, video_duration: float, detected_topic: str, openai_api_key: str = None, custom_prompt: str = None) -> dict:
    """
    Use GPT to analyze the transcript specifically for AI-generated image placements.
    Returns image suggestions with timing and detailed descriptions.
    """
    logger.info(f"  [AI Image Analysis] Analyzing transcript for image placements...")
    
    api_key = openai_api_key or OPENAI_API_KEY
    if not api_key:
        logger.warning("  [AI Image Analysis] No OpenAI API key available.")
        return {"image_suggestions": []}

    if custom_prompt:
        prompt = custom_prompt.replace("{topic}", detected_topic).replace("{duration}", str(video_duration)).replace("{transcript}", transcript_text)
    else:
        prompt = f"""
        Analyze this video transcript about "{detected_topic}" and suggest optimal AI-generated image placements. The video is {video_duration:.1f} seconds long.

        **IMAGE GENERATION STRATEGY:**
        - Use for specific explanations, diagrams, complex concepts
        - Descriptions should be detailed for image generation
        - 2-4 generated images maximum
        - Focus on concepts that need visual diagrams or illustrations

        For each suggestion, provide:
        1. Start time (in seconds) - when to begin showing the image
        2. Duration (in seconds) - how long it should display (3-6 seconds)
        3. Detailed description for AI image generation
        4. Content description - what's being explained during this time

        Respond in JSON format:
        {{
          "image_suggestions": [
            {{
              "start_time": 25.8,
              "duration": 4.0,
              "image_description": "Professional medical diagram showing the cross-linking process of IgE antibodies on mast cell surfaces, with clear labels and arrows indicating the binding mechanism, clean white background, educational illustration style",
              "content_description": "Explanation of IgE cross-linking mechanism"
            }}
          ]
        }}

        Transcript: {transcript_text}
        """

    try:
        client = openai.OpenAI(api_key=api_key)
        response = client.chat.completions.create(
            model="gpt-4o",
            response_format={"type": "json_object"},
            messages=[
                {"role": "system", "content": f"You are a professional medical illustrator specializing in {detected_topic}. You analyze transcripts to suggest optimal custom image placement."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.3
        )
        result_data = json.loads(response.choices[0].message.content)
        
        # Validate the suggestions
        image_suggestions = []
        for suggestion in result_data.get("image_suggestions", []):
            if (isinstance(suggestion.get("start_time"), (int, float)) and 
                isinstance(suggestion.get("duration"), (int, float)) and
                isinstance(suggestion.get("image_description"), str) and
                0 <= suggestion["start_time"] < video_duration and
                2 <= suggestion["duration"] <= 8):
                image_suggestions.append(suggestion)
        
        logger.info(f"  [AI Image Analysis] Generated {len(image_suggestions)} image suggestions")
        return {"image_suggestions": image_suggestions}
        
    except Exception as e:
        logger.error(f"  [AI Image Analysis] Error analyzing transcript: {e}")
        return {"image_suggestions": []}

def generate_image_with_dalle(image_description: str, detected_topic: str, openai_api_key: str = None, custom_prompt: str = None) -> Path:
    """
    Generate a custom image using OpenAI's DALL-E based on the description.
    Returns the path to the generated image file.
    """
    print(f"🎨 DALL-E: Generating image for '{detected_topic}' - {image_description[:50]}...")
    
    api_key = openai_api_key or OPENAI_API_KEY
    if not api_key:
        print(f"🎨 ERROR: No OpenAI API key available")
        logger.warning("  [AI Image Generation] No OpenAI API key available.")
        return None

    # Use custom prompt if provided, otherwise use enhanced default
    if custom_prompt:
        enhanced_prompt = custom_prompt.replace("{topic}", detected_topic).replace("{description}", image_description)
    else:
        enhanced_prompt = f"""
        Create a PHOTOREALISTIC, professional medical image representing: '{image_description}'.
        
        This is for a medical education video on '{detected_topic}'.
        
        CRITICAL REQUIREMENTS:
        - ABSOLUTELY NO TEXT, WORDS, LETTERS, OR NUMBERS visible anywhere in the image
        - NO labels, annotations, captions, or written content of any kind
        - Photorealistic style only - NOT illustration, cartoon, or graphic design
        - Professional medical/clinical setting
        - High-quality, clean, well-lit composition
        - Focus on the medical concept being explained
        
        Style: Documentary photography, medical textbook quality, professional lighting.
        """

    try:
        logger.info(f"  [AI Image Generation] Generating custom image...")
        client = openai.OpenAI(api_key=api_key)
        
        response = client.images.generate(
            model="dall-e-3",
            prompt=enhanced_prompt[:4000],  # DALL-E has a prompt limit
            size="1024x1024",
            quality="hd",
            n=1
        )
        
        image_url = response.data[0].url
        print(f"🎨 API call successful, downloading...")
        
        # Download the image
        temp_dir = Path(tempfile.gettempdir())
        safe_description = re.sub(r'[^\w\s-]', '', image_description.replace(' ', '_'))[:50]
        image_filename = f"generated_image_{safe_description}_{uuid.uuid4().hex[:8]}.png"
        image_path = temp_dir / "ai_generated_images" / image_filename
        image_path.parent.mkdir(exist_ok=True)
        
        import urllib.request
        urllib.request.urlretrieve(image_url, str(image_path))
        
        if image_path.exists():
            file_size = image_path.stat().st_size
            print(f"🎨 Downloaded: {file_size/1024:.1f}KB")
            logger.info(f"  [AI Image Generation] Successfully generated: {image_path.name}")
            return image_path
        else:
            print(f"🎨 ERROR: Image file not created")
            return None
        
    except Exception as e:
        print(f"🎨 ERROR: DALL-E failed - {str(e)[:100]}")
        logger.error(f"  [AI Image Generation] Error generating image: {e}")
        return None

def avoid_multimedia_overlaps(broll_suggestions: list, image_suggestions: list, video_duration: float, broll_clip_duration: float, image_display_duration: float) -> tuple[list, list]:
    """
    Analyzes B-roll and image suggestions to avoid time overlaps.
    Returns adjusted suggestions with no overlapping time segments.
    """
    logger.info(f"  [Overlap Avoidance] Resolving conflicts between {len(broll_suggestions)} B-roll and {len(image_suggestions)} image placements")
    
    # Convert to time intervals for easy conflict detection
    broll_intervals = []
    for i, suggestion in enumerate(broll_suggestions):
        start = float(suggestion['start_time'])
        duration = min(float(broll_clip_duration), video_duration - start)
        if duration > 0:
            broll_intervals.append({
                'index': i,
                'start': start,
                'end': start + duration,
                'type': 'broll',
                'suggestion': suggestion
            })
    
    image_intervals = []
    for i, suggestion in enumerate(image_suggestions):
        start = float(suggestion['start_time'])
        duration = min(float(image_display_duration), video_duration - start)
        if duration > 0:
            image_intervals.append({
                'index': i,
                'start': start,
                'end': start + duration,
                'type': 'image',
                'suggestion': suggestion
            })
    
    # Sort all intervals by start time
    all_intervals = sorted(broll_intervals + image_intervals, key=lambda x: x['start'])
    
    # Resolve conflicts - prefer earlier suggestions and maintain minimum gaps
    resolved_intervals = []
    min_gap = 0.5  # Minimum 0.5 second gap between multimedia elements
    
    for interval in all_intervals:
        conflict_found = False
        
        # Check for conflicts with already resolved intervals
        for resolved in resolved_intervals:
            # Check if intervals overlap (accounting for minimum gap)
            if (interval['start'] < resolved['end'] + min_gap and 
                interval['end'] + min_gap > resolved['start']):
                
                # Conflict detected - try to adjust timing
                conflict_found = True
                
                # Option 1: Move current interval after the conflicting one
                new_start = resolved['end'] + min_gap
                new_end = new_start + (interval['end'] - interval['start'])
                
                if new_end <= video_duration:
                    # Adjustment successful
                    interval['start'] = new_start
                    interval['end'] = new_end
                    interval['suggestion']['start_time'] = new_start
                    conflict_found = False
                    print(f"📅 Conflict resolved: {interval['type']} moved to {new_start:.1f}s")
                    logger.info(f"    [Overlap Avoidance] {interval['type'].title()} {interval['index']+1} moved to {new_start:.1f}s")
                    break
                
                # Option 2: Try to place before the conflicting interval
                new_end = resolved['start'] - min_gap
                new_start = new_end - (interval['end'] - interval['start'])
                
                if new_start >= 0:
                    # Check if this creates new conflicts
                    creates_new_conflict = False
                    for r in resolved_intervals:
                        if r != resolved:
                            if (new_start < r['end'] + min_gap and 
                                new_end + min_gap > r['start']):
                                creates_new_conflict = True
                                break
                    
                    if not creates_new_conflict:
                        interval['start'] = new_start
                        interval['end'] = new_end
                        interval['suggestion']['start_time'] = new_start
                        conflict_found = False
                        print(f"📅 Conflict resolved: {interval['type']} moved to {new_start:.1f}s (before conflict)")
                        logger.info(f"    [Overlap Avoidance] {interval['type'].title()} {interval['index']+1} moved to {new_start:.1f}s (before)")
                        break
        
        if not conflict_found:
            resolved_intervals.append(interval)
        else:
            # Could not resolve conflict - skip this multimedia element
            print(f"❌ Conflict unresolvable: {interval['type']} at {interval['start']:.1f}s skipped")
            logger.warning(f"    [Overlap Avoidance] {interval['type'].title()} {interval['index']+1} at {interval['start']:.1f}s could not be resolved - skipping")
    
    # Separate back into B-roll and image suggestions
    final_broll = []
    final_images = []
    
    for interval in resolved_intervals:
        if interval['type'] == 'broll':
            final_broll.append(interval['suggestion'])
        elif interval['type'] == 'image':
            final_images.append(interval['suggestion'])
    
    print(f"📅 Overlap Resolution: {len(final_broll)} B-roll + {len(final_images)} images (conflicts resolved)")
    logger.info(f"  [Overlap Avoidance] Final plan: {len(final_broll)} B-roll clips, {len(final_images)} images")
    
    return final_broll, final_images

def create_comprehensive_multimedia_video(
    video_path: Path, 
    transcript_path: Path, 
    detected_topic: str,
    openai_api_key: str = None, 
    pexels_api_key: str = None,
    transition_style: str = 'fade',
    broll_analysis_prompt: str = '',
    image_analysis_prompt: str = '',
    image_generation_prompt: str = '',
    skip_broll: bool = False,
    skip_image_generation: bool = False,
    image_generation_count: int = 2,
    image_display_duration: float = 4.0,
    image_quality: str = 'standard',
    image_transition_style: str = 'fade',
    broll_clip_count: int = 2,
    broll_clip_duration: float = 4.0
) -> Path:
    """
    Create a comprehensive multimedia video with both AI-selected B-roll and AI-generated images.
    Uses intelligent analysis to determine optimal placement and timing.
    """
    print(f"🎬 Multimedia: B-roll({not skip_broll}), Images({not skip_image_generation}), Topic='{detected_topic}'")
    
    temp_dir = Path(tempfile.gettempdir())
    output_path = temp_dir / f"multimedia_final_{uuid.uuid4()}.mp4"
    
    main_clip = None
    opened_clips = []

    try:
        # Load main video clip
        main_clip = VideoFileClip(str(video_path))
        duration = main_clip.duration
        print(f"🎬 [MULTIMEDIA DEBUG] Main video duration: {duration:.1f}s")
        
        # Read the GPT-corrected transcript
        with open(transcript_path, 'r', encoding='utf-8') as f:
            transcript_text = f.read()
        print(f"🎬 [MULTIMEDIA DEBUG] Transcript length: {len(transcript_text)} characters")
        
        # Initialize multimedia plan
        multimedia_plan = {"broll_suggestions": [], "image_suggestions": []}
        
        # Analyze for B-roll if not skipped
        if not skip_broll:
            print(f"📹 B-roll Analysis: {broll_clip_count} clips x {broll_clip_duration}s")
            custom_broll_prompt = broll_analysis_prompt if broll_analysis_prompt else None
            broll_plan = analyze_transcript_for_broll_suggestions(
                transcript_text, duration, detected_topic, openai_api_key, custom_broll_prompt
            )
            multimedia_plan["broll_suggestions"] = broll_plan.get("broll_suggestions", [])[:broll_clip_count]  # Limit by user setting
            print(f"📹 Generated {len(multimedia_plan['broll_suggestions'])} B-roll suggestions")
        
        # Analyze for images if not skipped
        if not skip_image_generation:
            print(f"🎨 Image Analysis: {image_generation_count} images x {image_display_duration}s")
            custom_image_prompt = image_analysis_prompt if image_analysis_prompt else None
            image_plan = analyze_transcript_for_image_suggestions(
                transcript_text, duration, detected_topic, openai_api_key, custom_image_prompt
            )
            multimedia_plan["image_suggestions"] = image_plan.get("image_suggestions", [])[:image_generation_count]  # Limit by user setting
            print(f"🎨 Generated {len(multimedia_plan['image_suggestions'])} image suggestions")
        
        if not multimedia_plan["broll_suggestions"] and not multimedia_plan["image_suggestions"]:
            print(f"❌ No multimedia suggestions generated - skipping")
            logger.warning("  [AI Multimedia] No multimedia suggestions generated. Skipping.")
            return video_path
        
        print(f"✅ Multimedia Plan: {len(multimedia_plan['broll_suggestions'])} B-roll + {len(multimedia_plan['image_suggestions'])} images")
        logger.info(f"  [AI Multimedia] Processing {len(multimedia_plan['broll_suggestions'])} B-roll and {len(multimedia_plan['image_suggestions'])} image placements")

        # Apply overlap avoidance to prevent B-roll and images from overlapping
        if multimedia_plan["broll_suggestions"] and multimedia_plan["image_suggestions"]:
            print(f"📅 Applying overlap avoidance...")
            multimedia_plan["broll_suggestions"], multimedia_plan["image_suggestions"] = avoid_multimedia_overlaps(
                multimedia_plan["broll_suggestions"], 
                multimedia_plan["image_suggestions"], 
                duration, 
                broll_clip_duration, 
                image_display_duration
            )
            print(f"📅 Final multimedia plan after avoiding overlaps: {len(multimedia_plan['broll_suggestions'])} B-roll + {len(multimedia_plan['image_suggestions'])} images")

        # Download B-roll clips
        broll_clips = []
        if multimedia_plan["broll_suggestions"]:
            broll_download_dir = temp_dir / "comprehensive_broll"
            broll_download_dir.mkdir(exist_ok=True)
            broll_clips = search_and_download_smart_broll(
                multimedia_plan["broll_suggestions"], broll_download_dir, pexels_api_key
            )
            print(f"📹 Downloaded {len(broll_clips)} B-roll clips")
        
        # Generate custom images
        generated_images = []
        if multimedia_plan["image_suggestions"]:
            custom_image_prompt = image_generation_prompt if image_generation_prompt else None
            for i, image_suggestion in enumerate(multimedia_plan["image_suggestions"]):
                image_path = generate_image_with_dalle(
                    image_suggestion["image_description"], 
                    detected_topic, 
                    openai_api_key,
                    custom_image_prompt
                )
                if image_path and image_path.exists():
                    image_info = image_suggestion.copy()
                    image_info['file_path'] = image_path
                    generated_images.append(image_info)
                    print(f"🎨 Image {i+1}: SUCCESS")
                else:
                    print(f"🎨 Image {i+1}: FAILED")
                    print(f"🎨 Generated {len(generated_images)} images total")

        # Create all multimedia overlays
        multimedia_overlays = []
        
        # Add B-roll overlays
        for i, clip_info in enumerate(broll_clips):
            try:
                start_time = float(clip_info['start_time'])
                clip_duration = float(broll_clip_duration)  # Use user setting instead of AI suggestion
                file_path = clip_info['file_path']
                
                # Ensure timing doesn't exceed video duration
                if start_time + clip_duration > duration:
                    clip_duration = duration - start_time
                
                if clip_duration <= 0:
                    continue
                
                broll_clip = VideoFileClip(str(file_path)).subclip(0, clip_duration)
                opened_clips.append(broll_clip)
                
                # Resize B-roll to match main video and remove its audio
                broll_clip = broll_clip.resize(main_clip.size).set_audio(None)

                # Apply transition effects
                if transition_style == 'fade':
                    fade_duration = min(0.5, clip_duration / 4)
                    broll_clip = broll_clip.fadein(fade_duration).fadeout(fade_duration)

                # Set the precise start time based on AI analysis
                broll_clip = broll_clip.set_start(start_time)
                multimedia_overlays.append(broll_clip)
                
                print(f"📹 B-roll {i+1}: {start_time:.1f}s")
                logger.info(f"    📹 B-roll at {start_time:.1f}s for {clip_duration:.1f}s: {clip_info['search_query']}")
                
            except Exception as e:
                print(f"📹 B-roll {i+1}: FAILED - {e}")
                logger.error(f"  [AI Multimedia] Error processing B-roll clip: {e}")
                continue
        
        # Add generated image overlays
        for i, image_info in enumerate(generated_images):
            try:
                start_time = float(image_info['start_time'])
                image_duration = float(image_display_duration)  # Use user setting instead of AI suggestion
                file_path = image_info['file_path']
                
                # Ensure timing doesn't exceed video duration
                if start_time + image_duration > duration:
                    image_duration = duration - start_time
                
                if image_duration <= 0:
                    continue
                
                # Create image clip
                image_clip = ImageClip(str(file_path), duration=image_duration)
                opened_clips.append(image_clip)
                
                # Calculate top 2/3 positioning - image should only cover top portion
                video_width, video_height = main_clip.size
                top_two_thirds_height = int(video_height * 2/3)
                
                # Resize image to fit top 2/3 area while maintaining aspect ratio
                image_clip = image_clip.resize(height=top_two_thirds_height, width=video_width)
                
                # Position image at the top of the frame (leaving bottom 1/3 visible)
                image_clip = image_clip.set_position(('center', 0))

                # Apply transition effects based on image_transition_style
                if image_transition_style == 'fade':
                    fade_duration = min(0.5, image_duration / 4)
                    image_clip = image_clip.fadein(fade_duration).fadeout(fade_duration)
                elif image_transition_style == 'slide':
                    # Slide in from top
                    image_clip = image_clip.set_position(lambda t: ('center', -video_height if t < 0.5 else 0))
                elif image_transition_style == 'zoom':
                    # Zoom in effect
                    image_clip = image_clip.resize(lambda t: min(1.0, 0.5 + t))
                # 'none' transition style requires no additional effects

                # Set the precise start time based on AI analysis
                image_clip = image_clip.set_start(start_time)
                multimedia_overlays.append(image_clip)
                
                print(f"🎨 Image {i+1}: {start_time:.1f}s")
                logger.info(f"    🎨 Generated image at {start_time:.1f}s for {image_duration:.1f}s")
                
            except Exception as e:
                print(f"🎨 Image {i+1}: FAILED - {e}")
                logger.error(f"  [AI Multimedia] Error processing generated image: {e}")
                continue

        if not multimedia_overlays:
            print(f"❌ No multimedia overlays created")
            logger.warning("  [AI Multimedia] No multimedia overlays could be created.")
            return video_path

        print(f"🎬 Compositing {len(multimedia_overlays)} overlays...")
        # Create the composite video with all multimedia elements
        final_clip = CompositeVideoClip([main_clip] + multimedia_overlays)
        
        # Write the final video file
        final_clip.write_videofile(
            str(output_path), 
            codec="libx264", 
            audio_codec="aac",
            temp_audiofile=str(temp_dir / f"temp_audio_{uuid.uuid4()}.m4a"),
            remove_temp=True,
            verbose=False,
            logger=None
        )
        print(f"✅ Multimedia integration completed!")
        logger.info(f"  [AI Multimedia] Comprehensive multimedia integration completed! Output: {output_path}")

        # Close all clips
        final_clip.close()
        for clip in opened_clips:
            clip.close()
        main_clip.close()
        
        return output_path
    
        print(f"❌ MULTIMEDIA ERROR: {e}")
        logger.error(f"  [AI Multimedia] Error during comprehensive multimedia integration: {e}")
        # Cleanup
        if main_clip: main_clip.close()
        for clip in opened_clips: clip.close()
        return video_path

        pass
    except Exception as e:
        logger.warning(f'Error in try block: {e}')
        pass
if __name__ == '__main__':
    parser = argparse.ArgumentParser(description="Video Editing Pipeline.")
    parser.add_argument("video_files", nargs='+', help="Paths to the video files to process.")
    parser.add_argument("-o", "--output_dir", default=str(BASE_OUTPUT_DIR / "Edited_Videos"), help="Base output directory.")
    parser.add_argument("--video_topic", default="general")
    parser.add_argument("--skip_audio", action="store_true")
    parser.add_argument("--skip_silence", action="store_true")
    parser.add_argument("--skip_transcription", action="store_true")
    parser.add_argument("--skip_gpt_correct", action="store_true")
    parser.add_argument("--skip_subtitle_burn", action="store_true")
    parser.add_argument("--skip_outro", action="store_true")
    parser.add_argument("--skip_broll", action="store_true")
    parser.add_argument("--skip_ai_highlights", action="store_true")
    parser.add_argument("--skip_dynamic_zoom", action="store_true")
    parser.add_argument("--skip_background_music", action="store_true")
    parser.add_argument("--skip_sound_effects", action="store_true")
    parser.add_argument("--whisper_model", default="small")
    parser.add_argument("--use_ffmpeg_enhance", action='store_true')
    parser.add_argument("--use_ai_denoiser", action='store_true')
    parser.add_argument("--broll-clip-count", type=int, default=5)
    parser.add_argument("--broll-clip-duration", type=float, default=4.0)
    parser.add_argument("--broll-transition-style", type=str, default="fade")
    # Smart Mode Settings
    parser.add_argument("--use-smart-mode", action="store_true", help="Enable smart mode")
    parser.add_argument("--smart-broll-ratio", type=float, default=1.5, help="B-roll clips per 30s")
    parser.add_argument("--smart-image-ratio", type=float, default=6.0, help="Images per 30s")
    parser.add_argument("--zoom_intensity", type=str, default="subtle")
    parser.add_argument("--zoom_frequency", type=str, default="medium")
    parser.add_argument("--music_track", type=str, default="random")
    parser.add_argument("--sound_effect_pack", type=str, default="sound-effects")
    parser.add_argument("--gpt_model", default="gpt-4o-mini")
    parser.add_argument("--highlight_style", default="yellow")
    parser.add_argument("--silence_threshold", type=str, default="-30dB")
    parser.add_argument("--silence_duration", type=float, default=0.5)
    parser.add_argument("--frame_style", type=str, default="rainbow")
    parser.add_argument("--use-ai-word-highlighting", action="store_true", help="Enable AI word highlighting")

    args = parser.parse_args()
    
    processing_options = vars(args)
    video_files = processing_options.pop('video_files')
    output_dir = processing_options.pop('output_dir')

    for video_file in video_files:
        process_video(
            input_file_path=Path(video_file),
            output_dir_base=Path(output_dir),
            **processing_options
        )
