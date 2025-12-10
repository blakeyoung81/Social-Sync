#!/usr/bin/env python3
"""
Advanced Video Editing Features
Includes Bad Take Removal and Enhanced Auto Zoom functionality
"""

import re
import json
import logging
import cv2
import numpy as np
from pathlib import Path
from typing import List, Tuple, Dict, Optional, Any
from moviepy.editor import VideoFileClip, AudioFileClip, concatenate_videoclips
import whisper
from difflib import SequenceMatcher
import librosa

logger = logging.getLogger(__name__)


def print_section_header(title: str):
    """Print a formatted section header."""
    print(f"\n{'='*60}")
    print(f"  {title}")
    print(f"{'='*60}")


def _compute_audio_similarity(video_path: Path, start1: float, end1: float, start2: float, end2: float) -> float:
    """
    Compute audio similarity between two segments using MFCC features.
    
    Args:
        video_path: Path to video file
        start1, end1: Time range for first segment
        start2, end2: Time range for second segment
    
    Returns:
        Similarity score between 0 and 1
    """
    try:
        # Load audio segments
        video_clip = VideoFileClip(str(video_path))
        
        # Extract audio for each segment
        audio1 = video_clip.audio.subclip(start1, end1)
        audio2 = video_clip.audio.subclip(start2, end2)
        
        # Write to temporary files
        import tempfile
        with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as tmp1:
            with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as tmp2:
                audio1.write_audiofile(tmp1.name, verbose=False, logger=None)
                audio2.write_audiofile(tmp2.name, verbose=False, logger=None)
                
                # Load audio with librosa
                y1, sr1 = librosa.load(tmp1.name, sr=None)
                y2, sr2 = librosa.load(tmp2.name, sr=None)
                
                # Compute MFCCs (mel-frequency cepstral coefficients)
                mfcc1 = librosa.feature.mfcc(y=y1, sr=sr1, n_mfcc=13)
                mfcc2 = librosa.feature.mfcc(y=y2, sr=sr2, n_mfcc=13)
                
                # Average over time to get fixed-size features
                mfcc1_mean = np.mean(mfcc1, axis=1)
                mfcc2_mean = np.mean(mfcc2, axis=1)
                
                # Compute cosine similarity
                dot_product = np.dot(mfcc1_mean, mfcc2_mean)
                norm1 = np.linalg.norm(mfcc1_mean)
                norm2 = np.linalg.norm(mfcc2_mean)
                
                if norm1 > 0 and norm2 > 0:
                    similarity = dot_product / (norm1 * norm2)
                    # Normalize to 0-1 range (cosine can be -1 to 1)
                    similarity = (similarity + 1) / 2
                else:
                    similarity = 0.0
                
                # Cleanup
                import os
                os.unlink(tmp1.name)
                os.unlink(tmp2.name)
                
        video_clip.close()
        return similarity
        
    except Exception as e:
        logger.warning(f"Error computing audio similarity: {e}")
        return 0.0


def _compute_text_embedding_similarity(text1: str, text2: str) -> float:
    """
    Compute semantic similarity between two text segments using embeddings.
    Falls back to Levenshtein-based similarity if embeddings unavailable.
    
    Args:
        text1: First text segment
        text2: Second text segment
    
    Returns:
        Similarity score between 0 and 1
    """
    try:
        # Try to use sentence-transformers for semantic similarity
        try:
            from sentence_transformers import SentenceTransformer, util
            
            # Use a lightweight model
            model = SentenceTransformer('all-MiniLM-L6-v2')
            
            # Compute embeddings
            embedding1 = model.encode(text1, convert_to_tensor=True)
            embedding2 = model.encode(text2, convert_to_tensor=True)
            
            # Compute cosine similarity
            similarity = util.cos_sim(embedding1, embedding2).item()
            return similarity
            
        except ImportError:
            logger.debug("sentence-transformers not available, using string matching")
            pass
        
        # Fallback: Use SequenceMatcher (Levenshtein-like)
        similarity = SequenceMatcher(None, text1.lower(), text2.lower()).ratio()
        return similarity
        
    except Exception as e:
        logger.warning(f"Error computing text similarity: {e}")
        return 0.0


def _detect_context_clues(text: str) -> float:
    """
    Detect context clues that indicate a bad take (retry phrases).
    
    Args:
        text: Text to analyze
    
    Returns:
        Confidence boost score (0 to 0.3)
    """
    retry_phrases = [
        r'\bwait\b',
        r'\bsorry\b',
        r'\blet me try (that )?again\b',
        r'\bactually\b',
        r'\bhold on\b',
        r'\bno wait\b',
        r'\blet me rephrase\b',
        r'\blet me say that again\b',
        r'\buh\b',
        r'\bum\b',
        r'\ber\b'
    ]
    
    text_lower = text.lower()
    boost = 0.0
    
    for pattern in retry_phrases:
        if re.search(pattern, text_lower):
            boost += 0.05  # Each clue adds confidence
    
    return min(boost, 0.3)  # Cap at 0.3


def detect_bad_takes(
    transcript_path: Path,
    video_path: Optional[Path] = None,
    sensitivity: str = 'medium',
    min_repetition_length: int = 3,
    confidence_threshold: float = 0.7,
    use_hybrid_detection: bool = True
) -> List[Dict[str, Any]]:
    """
    Analyze transcript and audio to detect repeated lines or phrases (bad takes).
    Uses hybrid text + audio similarity for accurate detection.
    
    Args:
        transcript_path: Path to the SRT transcript file
        video_path: Optional path to video file for audio similarity
        sensitivity: Detection sensitivity ('low', 'medium', 'high')
        min_repetition_length: Minimum number of words to consider as repetition
        confidence_threshold: Confidence threshold for similarity matching
        use_hybrid_detection: Use both text and audio similarity (more accurate)
    
    Returns:
        List of dictionaries containing bad take segments to remove
    """
    print_section_header("Bad Take Detection")
    
    # Sensitivity mappings
    sensitivity_maps = {
        'low': {'similarity_threshold': 0.9, 'word_tolerance': 1},
        'medium': {'similarity_threshold': 0.8, 'word_tolerance': 2},
        'high': {'similarity_threshold': 0.7, 'word_tolerance': 3}
    }
    
    settings = sensitivity_maps.get(sensitivity, sensitivity_maps['medium'])
    
    try:
        # Parse SRT file
        segments = []
        with open(transcript_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Split into subtitle blocks
        srt_blocks = re.split(r'\n\s*\n', content.strip())
        
        for block in srt_blocks:
            lines = block.strip().split('\n')
            if len(lines) >= 3:
                # Extract timestamp and text
                timestamp_line = lines[1]
                text = ' '.join(lines[2:])
                
                # Parse timestamps
                timestamp_match = re.match(r'(\d{2}:\d{2}:\d{2},\d{3}) --> (\d{2}:\d{2}:\d{2},\d{3})', timestamp_line)
                if timestamp_match:
                    start_time = _srt_time_to_seconds(timestamp_match.group(1))
                    end_time = _srt_time_to_seconds(timestamp_match.group(2))
                    
                    segments.append({
                        'start': start_time,
                        'end': end_time,
                        'text': text.strip(),
                        'words': text.strip().split()
                    })
        
        logger.info(f"Parsed {len(segments)} transcript segments")
        
        # Detect repetitions using hybrid approach
        bad_takes = []
        temporal_window = 90  # seconds - look for repeats within this window
        
        for i in range(len(segments)):
            current_segment = segments[i]
            
            # Look ahead for similar segments within temporal window
            for j in range(i + 1, len(segments)):
                next_segment = segments[j]
                
                # Check if within temporal window
                time_gap = next_segment['start'] - current_segment['end']
                if time_gap > temporal_window:
                    break  # Too far apart, stop looking
                
                # Skip if already marked as bad take
                if any(bt['start_time'] == current_segment['start'] or bt['start_time'] == next_segment['start'] 
                       for bt in bad_takes):
                    continue
                
                # Check word count minimum
                if (len(current_segment['words']) < min_repetition_length or 
                    len(next_segment['words']) < min_repetition_length):
                    continue
                
                # 1. Compute text similarity (semantic)
                text_similarity = _compute_text_embedding_similarity(
                    current_segment['text'], 
                    next_segment['text']
                )
                
                # 2. Compute audio similarity if video path provided and hybrid mode enabled
                audio_similarity = 0.0
                if use_hybrid_detection and video_path and video_path.exists():
                    audio_similarity = _compute_audio_similarity(
                        video_path,
                        current_segment['start'], current_segment['end'],
                        next_segment['start'], next_segment['end']
                    )
                
                # 3. Detect context clues
                context_boost_current = _detect_context_clues(current_segment['text'])
                context_boost_next = _detect_context_clues(next_segment['text'])
                
                # 4. Hybrid scoring
                if use_hybrid_detection and video_path and video_path.exists():
                    # Both text AND audio must be similar
                    text_threshold = settings['similarity_threshold']
                    audio_threshold = 0.75
                    
                    # Apply context boost to thresholds
                    effective_text_threshold = text_threshold - max(context_boost_current, context_boost_next)
                    
                    is_bad_take = (text_similarity >= effective_text_threshold and 
                                   audio_similarity >= audio_threshold)
                else:
                    # Text-only mode (fallback)
                    effective_threshold = settings['similarity_threshold'] - max(context_boost_current, context_boost_next)
                    is_bad_take = text_similarity >= effective_threshold
                
                if is_bad_take:
                    # Check word count difference
                    word_diff = abs(len(current_segment['words']) - len(next_segment['words']))
                    
                    if word_diff <= settings['word_tolerance']:
                        # Determine which take to keep
                        # Priority: longer text, fewer context clues, later in time
                        remove_segment = None
                        keep_segment = None
                        
                        if context_boost_current > context_boost_next:
                            # Current has retry phrases, remove it
                            remove_segment = current_segment
                            keep_segment = next_segment
                        elif context_boost_next > context_boost_current:
                            # Next has retry phrases, remove it
                            remove_segment = next_segment
                            keep_segment = current_segment
                        elif len(next_segment['words']) > len(current_segment['words']):
                            # Next is longer, keep it
                            remove_segment = current_segment
                            keep_segment = next_segment
                        else:
                            # Keep the later one (usually more refined)
                            remove_segment = current_segment
                            keep_segment = next_segment
                        
                        bad_takes.append({
                            'start_time': remove_segment['start'],
                            'end_time': remove_segment['end'],
                            'text': remove_segment['text'],
                            'text_similarity': text_similarity,
                            'audio_similarity': audio_similarity,
                            'context_clues': max(context_boost_current, context_boost_next),
                            'reason': 'repetition',
                            'keep_alternative': {
                                'start_time': keep_segment['start'],
                                'end_time': keep_segment['end'],
                                'text': keep_segment['text']
                            }
                        })
                        
                        logger.info(f"Detected bad take: '{remove_segment['text'][:50]}...' "
                                  f"(text: {text_similarity:.2f}, audio: {audio_similarity:.2f}, "
                                  f"context: {max(context_boost_current, context_boost_next):.2f})")
        
        # Detect incomplete sentences (common in bad takes)
        incomplete_patterns = [
            r'^(um+|uh+|er+|ah+)\s*$',  # Just filler words
            r'^\w{1,3}\s*$',  # Very short incomplete words
            r'^(so|and|but|the|a)\s*$'  # Incomplete starters
        ]
        
        for segment in segments:
            text = segment['text'].lower().strip()
            if any(re.match(pattern, text) for pattern in incomplete_patterns):
                if segment['end'] - segment['start'] < 2:  # Very short segments
                    bad_takes.append({
                        'start_time': segment['start'],
                        'end_time': segment['end'],
                        'text': segment['text'],
                        'similarity': 1.0,
                        'reason': 'incomplete_sentence'
                    })
                    
                    logger.info(f"Detected incomplete take: '{segment['text']}'")
        
        logger.info(f"Found {len(bad_takes)} bad takes to remove")
        return bad_takes
        
    except Exception as e:
        logger.error(f"Error detecting bad takes: {e}")
        return []


def remove_bad_takes(
    video_path: Path,
    output_path: Path,
    bad_takes: List[Dict[str, Any]]
) -> bool:
    """
    Remove detected bad takes from the video.
    
    Args:
        video_path: Input video file path
        output_path: Output video file path
        bad_takes: List of bad take segments to remove
    
    Returns:
        True if successful, False otherwise
    """
    print_section_header("Bad Take Removal")
    
    if not bad_takes:
        logger.info("No bad takes detected, copying original video")
        import shutil
        shutil.copy2(video_path, output_path)
        return True
    
    try:
        video_clip = VideoFileClip(str(video_path))
        duration = video_clip.duration
        
        # Create list of segments to keep
        segments_to_keep = []
        last_end = 0
        
        # Sort bad takes by start time
        bad_takes_sorted = sorted(bad_takes, key=lambda x: x['start_time'])
        
        for bad_take in bad_takes_sorted:
            start_remove = bad_take['start_time']
            end_remove = bad_take['end_time']
            
            # Add segment before the bad take
            if start_remove > last_end:
                segments_to_keep.append((last_end, start_remove))
            
            last_end = end_remove
        
        # Add final segment
        if last_end < duration:
            segments_to_keep.append((last_end, duration))
        
        # Create clips for each segment to keep
        clips = []
        for start, end in segments_to_keep:
            if end - start > 0.1:  # Only keep segments longer than 0.1 seconds
                clip_segment = video_clip.subclip(start, end)
                clips.append(clip_segment)
        
        if clips:
            # Concatenate all kept clips
            final_video = concatenate_videoclips(clips)
            final_video.write_videofile(
                str(output_path),
                codec="libx264",
                audio_codec="aac",
                temp_audiofile='temp-audio.m4a',
                remove_temp=True
            )
            
            # Calculate removal statistics
            original_duration = duration
            removed_duration = sum(bt['end_time'] - bt['start_time'] for bt in bad_takes)
            final_duration = final_video.duration
            
            logger.info(f"Bad take removal completed:")
            logger.info(f"  Original duration: {original_duration:.2f}s")
            logger.info(f"  Removed duration: {removed_duration:.2f}s")
            logger.info(f"  Final duration: {final_duration:.2f}s")
            logger.info(f"  Time saved: {removed_duration:.2f}s ({removed_duration/original_duration*100:.1f}%)")
            
            final_video.close()
        else:
            logger.warning("No valid segments to keep after bad take removal")
            return False
        
        video_clip.close()
        return True
        
    except Exception as e:
        logger.error(f"Error removing bad takes: {e}")
        return False


def apply_enhanced_auto_zoom(
    video_path: Path,
    output_path: Path,
    transcript_path: Optional[Path] = None,
    mode: str = 'hybrid',
    intensity: str = 'medium',
    smoothness: str = 'high',
    aspect_ratio: str = 'auto',
    pause_detection: bool = True,
    section_change_detection: bool = True
) -> bool:
    """
    Apply intelligent auto zoom with face/focal point detection.
    
    Args:
        video_path: Input video file path
        output_path: Output video file path
        transcript_path: Optional transcript for pause/section detection
        mode: Zoom mode ('face-detection', 'focal-point', 'hybrid')
        intensity: Zoom intensity ('subtle', 'medium', 'strong')
        smoothness: Zoom transition smoothness ('low', 'medium', 'high')
        aspect_ratio: Target aspect ratio ('9:16', '1:1', '16:9', 'auto')
        pause_detection: Whether to zoom out during pauses
        section_change_detection: Whether to adjust zoom on topic changes
    
    Returns:
        True if successful, False otherwise
    """
    print_section_header("Enhanced Auto Zoom")
    
    # Zoom intensity mapping
    intensity_map = {
        'subtle': {'max_zoom': 1.15, 'zoom_speed': 0.02},
        'medium': {'max_zoom': 1.3, 'zoom_speed': 0.03},
        'strong': {'max_zoom': 1.5, 'zoom_speed': 0.04}
    }
    
    # Smoothness mapping
    smoothness_map = {
        'low': 0.1,
        'medium': 0.05,
        'high': 0.02
    }
    
    settings = intensity_map.get(intensity, intensity_map['medium'])
    smooth_factor = smoothness_map.get(smoothness, smoothness_map['high'])
    
    try:
        video_clip = VideoFileClip(str(video_path))
        duration = video_clip.duration
        
        # Initialize face detection if needed
        face_cascade = None
        if mode in ['face-detection', 'hybrid']:
            try:
                face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
                logger.info("Face detection initialized")
            except Exception as e:
                logger.warning(f"Face detection initialization failed: {e}")
                mode = 'focal-point'
        
        # Parse transcript for pause/section detection
        pause_times = []
        section_changes = []
        
        if transcript_path and transcript_path.exists():
            pause_times, section_changes = _analyze_transcript_timing(transcript_path)
            logger.info(f"Detected {len(pause_times)} pauses and {len(section_changes)} section changes")
        
        def enhanced_zoom_effect(get_frame, t):
            frame = get_frame(t)
            h, w = frame.shape[:2]
            
            # PERIODIC ZOOM CYCLE: Zoom in for 3 seconds, then zoom out for 3 seconds
            # This creates a breathing effect: normal → zoom in (3s) → back to normal (3s) → repeat
            zoom_cycle_duration = 6.0  # Total cycle: 6 seconds (3s in, 3s out)
            cycle_position = (t % zoom_cycle_duration) / zoom_cycle_duration
            
            import math
            # Create a smooth sine wave: 0 → max → 0 over the cycle
            # This makes it zoom in gradually, then zoom out gradually
            time_based_zoom_factor = math.sin(cycle_position * math.pi)  # 0 → 1 → 0
            
            # Base zoom from time cycle (1.0 = normal, max_zoom = zoomed in)
            base_zoom = 1.0 + (settings['max_zoom'] - 1.0) * time_based_zoom_factor
            
            # OPTIONAL: Enhance zoom based on face detection (only if faces detected)
            if mode in ['face-detection', 'hybrid'] and face_cascade is not None:
                gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
                faces = face_cascade.detectMultiScale(gray, 1.1, 4)
                
                if len(faces) > 0:
                    # Focus on the largest face - adjust zoom slightly based on face size
                    largest_face = max(faces, key=lambda x: x[2] * x[3])
                    face_x, face_y, face_w, face_h = largest_face
                    
                    # Calculate zoom based on face size (subtle adjustment)
                    face_area_ratio = (face_w * face_h) / (w * h)
                    if face_area_ratio < 0.1:  # Small face, zoom in a bit more
                        base_zoom = min(settings['max_zoom'] * 1.1, base_zoom * 1.05)
                    elif face_area_ratio > 0.3:  # Large face already, reduce zoom slightly
                        base_zoom = max(1.0, base_zoom * 0.95)
            
            # OPTIONAL: Focal point detection (subtle adjustment)
            if mode in ['focal-point', 'hybrid']:
                gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
                grad_x = cv2.Sobel(gray, cv2.CV_64F, 1, 0, ksize=3)
                grad_y = cv2.Sobel(gray, cv2.CV_64F, 0, 1, ksize=3)
                gradient_magnitude = np.sqrt(grad_x**2 + grad_y**2)
                
                # Find regions with high gradient (details)
                threshold = np.percentile(gradient_magnitude, 95)
                focus_regions = gradient_magnitude > threshold
                
                if np.any(focus_regions):
                    # Calculate zoom based on focus distribution (subtle adjustment)
                    focus_density = np.sum(focus_regions) / (w * h)
                    if focus_density < 0.1:  # Low detail, zoom in slightly more
                        base_zoom = min(settings['max_zoom'], base_zoom * 1.02)
            
            # Adjust zoom based on transcript timing
            if pause_detection and any(abs(p - t) < 1.0 for p in pause_times):
                base_zoom = max(1.0, base_zoom * 0.9)  # Zoom out during pauses
            
            if section_change_detection and any(abs(s - t) < 2.0 for s in section_changes):
                base_zoom = min(settings['max_zoom'], base_zoom * 1.05)  # Slight zoom on section changes
            
            # Apply smooth transitions
            target_zoom = base_zoom
            if hasattr(enhanced_zoom_effect, 'last_zoom'):
                zoom_diff = target_zoom - enhanced_zoom_effect.last_zoom
                if abs(zoom_diff) > smooth_factor:
                    if zoom_diff > 0:
                        base_zoom = enhanced_zoom_effect.last_zoom + smooth_factor
                    else:
                        base_zoom = enhanced_zoom_effect.last_zoom - smooth_factor
            
            enhanced_zoom_effect.last_zoom = base_zoom
            
            # Apply zoom
            if base_zoom != 1.0:
                # Calculate new dimensions
                new_h = int(h / base_zoom)
                new_w = int(w / base_zoom)
                
                # Ensure even dimensions
                new_h = (new_h // 2) * 2
                new_w = (new_w // 2) * 2
                
                # Center crop
                start_h = (h - new_h) // 2
                start_w = (w - new_w) // 2
                
                cropped = frame[start_h:start_h+new_h, start_w:start_w+new_w]
                
                # Resize back to original dimensions
                resized = cv2.resize(cropped, (w, h), interpolation=cv2.INTER_LANCZOS4)
                
                # Adjust for target aspect ratio if specified
                if aspect_ratio != 'auto':
                    resized = _adjust_aspect_ratio(resized, aspect_ratio)
                
                return resized
            
            return frame
        
        # Initialize last zoom
        enhanced_zoom_effect.last_zoom = 1.0
        
        # Apply the enhanced zoom effect
        zoomed_clip = video_clip.fl(enhanced_zoom_effect, apply_to=[])
        zoomed_clip.write_videofile(
            str(output_path),
            codec="libx264",
            audio_codec="aac",
            temp_audiofile='temp-audio.m4a',
            remove_temp=True,
            preset='medium',
            threads=4
        )
        
        video_clip.close()
        zoomed_clip.close()
        
        logger.info(f"Enhanced auto zoom applied successfully. Output: {output_path.name}")
        return True
        
    except Exception as e:
        logger.error(f"Error applying enhanced auto zoom: {e}")
        return False


def _srt_time_to_seconds(srt_time: str) -> float:
    """Convert SRT timestamp to seconds."""
    time_parts = srt_time.split(',')
    time_str = time_parts[0]
    milliseconds = int(time_parts[1]) / 1000.0
    
    h, m, s = map(int, time_str.split(':'))
    return h * 3600 + m * 60 + s + milliseconds


def _analyze_transcript_timing(transcript_path: Path) -> Tuple[List[float], List[float]]:
    """Analyze transcript to detect pauses and section changes."""
    pause_times = []
    section_changes = []
    
    try:
        with open(transcript_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        srt_blocks = re.split(r'\n\s*\n', content.strip())
        last_end_time = 0
        
        for block in srt_blocks:
            lines = block.strip().split('\n')
            if len(lines) >= 3:
                timestamp_line = lines[1]
                text = ' '.join(lines[2:])
                
                timestamp_match = re.match(r'(\d{2}:\d{2}:\d{2},\d{3}) --> (\d{2}:\d{2}:\d{2},\d{3})', timestamp_line)
                if timestamp_match:
                    start_time = _srt_time_to_seconds(timestamp_match.group(1))
                    end_time = _srt_time_to_seconds(timestamp_match.group(2))
                    
                    # Detect pauses (gaps > 2 seconds)
                    if start_time - last_end_time > 2.0:
                        pause_times.append(start_time)
                    
                    # Detect section changes (topic transition words)
                    section_keywords = ['so', 'now', 'next', 'however', 'but', 'meanwhile', 'therefore']
                    if any(text.lower().startswith(keyword) for keyword in section_keywords):
                        section_changes.append(start_time)
                    
                    last_end_time = end_time
        
    except Exception as e:
        logger.error(f"Error analyzing transcript timing: {e}")
    
    return pause_times, section_changes


def _adjust_aspect_ratio(frame: np.ndarray, target_ratio: str) -> np.ndarray:
    """Adjust frame to target aspect ratio."""
    h, w = frame.shape[:2]
    current_ratio = w / h
    
    ratio_map = {
        '9:16': 9/16,
        '1:1': 1.0,
        '16:9': 16/9
    }
    
    if target_ratio not in ratio_map:
        return frame
    
    target = ratio_map[target_ratio]
    
    if abs(current_ratio - target) < 0.01:
        return frame
    
    if current_ratio > target:
        # Too wide, crop width
        new_w = int(h * target)
        start_w = (w - new_w) // 2
        return frame[:, start_w:start_w+new_w]
    else:
        # Too tall, crop height
        new_h = int(w / target)
        start_h = (h - new_h) // 2
        return frame[start_h:start_h+new_h, :]
