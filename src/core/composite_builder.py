"""
Composite Video Builder - Single-Pass Rendering Pipeline
========================================================

This module implements efficient single-pass video rendering by building
a complex MoviePy composite instead of multiple re-encodes.

Instead of:
    video -> encode #1 -> encode #2 -> encode #3 -> ... (SLOW!)

We do:
    video -> [analyze all effects] -> single composite -> encode ONCE (FAST!)

Author: AI Assistant
Date: October 2, 2025
"""

from pathlib import Path
from typing import List, Dict, Tuple, Optional, Any
from dataclasses import dataclass
from moviepy.editor import (
    VideoFileClip, AudioFileClip, ImageClip, TextClip,
    CompositeVideoClip, CompositeAudioClip, concatenate_videoclips
)
from moviepy.video.fx import all as vfx
import numpy as np
import logging

logger = logging.getLogger(__name__)


@dataclass
class SilenceCut:
    """Represents a segment to keep after silence removal"""
    start: float
    end: float


@dataclass
class ZoomKeyframe:
    """Represents a zoom transformation at a specific time"""
    time: float
    zoom_factor: float
    center_x: float = 0.5  # 0-1, center of zoom
    center_y: float = 0.5  # 0-1, center of zoom


@dataclass
class MediaOverlay:
    """Represents an image or B-roll overlay"""
    start_time: float
    duration: float
    media_path: Path
    media_type: str  # 'image' or 'video'
    transition: str = 'fade'
    position: Tuple[int, int] = (0, 0)
    size: Optional[Tuple[int, int]] = None


@dataclass
class SubtitleSegment:
    """Represents a subtitle to burn in"""
    start: float
    end: float
    text: str
    style: Dict[str, Any] = None


class CompositeVideoBuilder:
    """
    Builds a complex video composite with all effects applied in a single pass.
    
    Usage:
        builder = CompositeVideoBuilder(input_video_path)
        builder.add_silence_cuts(cuts)
        builder.add_zoom_keyframes(keyframes)
        builder.add_media_overlays(overlays)
        builder.add_subtitles(subtitles)
        builder.add_music(music_path, volume=0.3)
        output_path = builder.render(output_path, progress_callback=callback)
    """
    
    def __init__(self, input_video_path: Path):
        """Initialize the builder with an input video."""
        self.input_video_path = Path(input_video_path)
        self.base_clip: Optional[VideoFileClip] = None
        
        # Effect queues (analyzed before rendering)
        self.silence_cuts: List[SilenceCut] = []
        self.zoom_keyframes: List[ZoomKeyframe] = []
        self.media_overlays: List[MediaOverlay] = []
        self.subtitle_segments: List[SubtitleSegment] = []
        self.intro_clips: List[VideoFileClip] = []
        self.outro_clips: List[VideoFileClip] = []
        
        # Audio effects
        self.background_music: Optional[Path] = None
        self.music_volume: float = 0.3
        self.speech_volume: float = 1.0
        
        # Loaded clips (for cleanup)
        self._loaded_clips: List[Any] = []
        
        logger.info(f"🎬 CompositeVideoBuilder initialized for: {input_video_path.name}")
    
    def add_silence_cuts(self, cuts: List[SilenceCut]) -> 'CompositeVideoBuilder':
        """
        Queue silence removal. Video will be trimmed to only keep these segments.
        
        Args:
            cuts: List of SilenceCut objects representing segments to KEEP
        
        Returns:
            self (for method chaining)
        """
        self.silence_cuts = cuts
        logger.info(f"📊 Queued {len(cuts)} silence cuts (segments to keep)")
        return self
    
    def add_zoom_keyframes(self, keyframes: List[ZoomKeyframe]) -> 'CompositeVideoBuilder':
        """
        Queue dynamic zoom effects.
        
        Args:
            keyframes: List of ZoomKeyframe objects
        
        Returns:
            self (for method chaining)
        """
        self.zoom_keyframes = sorted(keyframes, key=lambda k: k.time)
        logger.info(f"🔍 Queued {len(keyframes)} zoom keyframes")
        return self
    
    def add_media_overlays(self, overlays: List[MediaOverlay]) -> 'CompositeVideoBuilder':
        """
        Queue image/video overlays (B-roll, generated images, etc.)
        
        Args:
            overlays: List of MediaOverlay objects
        
        Returns:
            self (for method chaining)
        """
        self.media_overlays = overlays
        logger.info(f"🎨 Queued {len(overlays)} media overlays")
        return self
    
    def add_subtitles(self, subtitle_path: Path, style: Optional[Dict] = None) -> 'CompositeVideoBuilder':
        """
        Queue subtitle burning.
        
        Args:
            subtitle_path: Path to SRT file
            style: Optional style dict for subtitles
        
        Returns:
            self (for method chaining)
        """
        # Parse SRT and create subtitle segments
        from ..utils.subtitle_utils import parse_srt  # You'll need to implement this
        self.subtitle_segments = parse_srt(subtitle_path, style)
        logger.info(f"💬 Queued {len(self.subtitle_segments)} subtitle segments")
        return self
    
    def add_intro(self, intro_clip_path: Path) -> 'CompositeVideoBuilder':
        """
        Queue intro clip to prepend.
        
        Args:
            intro_clip_path: Path to intro video
        
        Returns:
            self (for method chaining)
        """
        intro_clip = VideoFileClip(str(intro_clip_path))
        self.intro_clips.append(intro_clip)
        self._loaded_clips.append(intro_clip)
        logger.info(f"▶️ Queued intro clip: {intro_clip_path.name}")
        return self
    
    def add_outro(self, outro_clip_path: Path) -> 'CompositeVideoBuilder':
        """
        Queue outro clip to append.
        
        Args:
            outro_clip_path: Path to outro video
        
        Returns:
            self (for method chaining)
        """
        outro_clip = VideoFileClip(str(outro_clip_path))
        self.outro_clips.append(outro_clip)
        self._loaded_clips.append(outro_clip)
        logger.info(f"⏹️ Queued outro clip: {outro_clip_path.name}")
        return self
    
    def add_music(self, music_path: Path, volume: float = 0.3, speech_volume: float = 1.0) -> 'CompositeVideoBuilder':
        """
        Queue background music.
        
        Args:
            music_path: Path to music file
            volume: Background music volume (0-1)
            speech_volume: Original speech volume (0-1)
        
        Returns:
            self (for method chaining)
        """
        self.background_music = Path(music_path)
        self.music_volume = volume
        self.speech_volume = speech_volume
        logger.info(f"🎵 Queued background music: {music_path.name} (vol: {volume})")
        return self
    
    def _apply_silence_cuts(self, clip: VideoFileClip) -> VideoFileClip:
        """Apply silence cuts to create a trimmed video."""
        if not self.silence_cuts:
            return clip
        
        logger.info(f"✂️ Applying {len(self.silence_cuts)} silence cuts...")
        
        # Extract subclips for each segment to keep
        subclips = []
        for cut in self.silence_cuts:
            try:
                subclip = clip.subclip(cut.start, cut.end)
                subclips.append(subclip)
            except Exception as e:
                logger.error(f"Failed to extract subclip {cut.start}-{cut.end}: {e}")
        
        if not subclips:
            logger.warning("No valid subclips after silence removal, returning original")
            return clip
        
        # Concatenate all kept segments
        trimmed_clip = concatenate_videoclips(subclips, method="compose")
        logger.info(f"✅ Silence cuts applied: {len(subclips)} segments concatenated")
        return trimmed_clip
    
    def _apply_zoom_effect(self, clip: VideoFileClip) -> VideoFileClip:
        """Apply dynamic zoom based on keyframes."""
        if not self.zoom_keyframes:
            return clip
        
        logger.info(f"🔍 Applying {len(self.zoom_keyframes)} zoom keyframes...")
        
        def zoom_function(get_frame, t):
            """Dynamic zoom function that interpolates between keyframes."""
            frame = get_frame(t)
            h, w = frame.shape[:2]
            
            # Find the appropriate zoom factor for time t
            zoom_factor = 1.0
            center_x, center_y = 0.5, 0.5
            
            # Interpolate between keyframes
            for i, kf in enumerate(self.zoom_keyframes):
                if t < kf.time:
                    if i == 0:
                        # Before first keyframe, use first keyframe values
                        zoom_factor = kf.zoom_factor
                        center_x, center_y = kf.center_x, kf.center_y
                    else:
                        # Interpolate between previous and current keyframe
                        prev_kf = self.zoom_keyframes[i-1]
                        progress = (t - prev_kf.time) / (kf.time - prev_kf.time)
                        zoom_factor = prev_kf.zoom_factor + progress * (kf.zoom_factor - prev_kf.zoom_factor)
                        center_x = prev_kf.center_x + progress * (kf.center_x - prev_kf.center_x)
                        center_y = prev_kf.center_y + progress * (kf.center_y - prev_kf.center_y)
                    break
            else:
                # After all keyframes, use last keyframe
                if self.zoom_keyframes:
                    last_kf = self.zoom_keyframes[-1]
                    zoom_factor = last_kf.zoom_factor
                    center_x, center_y = last_kf.center_x, last_kf.center_y
            
            if zoom_factor != 1.0:
                # Calculate crop dimensions
                new_h = int(h / zoom_factor)
                new_w = int(w / zoom_factor)
                
                # Calculate crop position (centered on zoom point)
                crop_x = int((w - new_w) * center_x)
                crop_y = int((h - new_h) * center_y)
                
                # Ensure crop doesn't go out of bounds
                crop_x = max(0, min(crop_x, w - new_w))
                crop_y = max(0, min(crop_y, h - new_h))
                
                # Crop and resize
                cropped = frame[crop_y:crop_y+new_h, crop_x:crop_x+new_w]
                from PIL import Image
                img = Image.fromarray(cropped)
                img = img.resize((w, h), Image.Resampling.LANCZOS)
                return np.array(img)
            
            return frame
        
        zoomed_clip = clip.fl(zoom_function)
        logger.info("✅ Zoom effect applied")
        return zoomed_clip
    
    def _apply_media_overlays(self, clip: VideoFileClip) -> VideoFileClip:
        """Apply all media overlays (images, B-roll) as a composite."""
        if not self.media_overlays:
            return clip
        
        logger.info(f"🎨 Applying {len(self.media_overlays)} media overlays...")
        
        overlay_clips = []
        for i, overlay in enumerate(self.media_overlays):
            try:
                # Load media
                if overlay.media_type == 'image':
                    media_clip = ImageClip(str(overlay.media_path)).set_duration(overlay.duration)
                else:  # video
                    media_clip = VideoFileClip(str(overlay.media_path)).subclip(0, overlay.duration)
                
                # Apply transition
                if overlay.transition == 'fade':
                    media_clip = media_clip.crossfadein(0.5).crossfadeout(0.5)
                
                # Position and resize if needed
                if overlay.size:
                    media_clip = media_clip.resize(overlay.size)
                
                media_clip = media_clip.set_start(overlay.start_time).set_position(overlay.position)
                overlay_clips.append(media_clip)
                self._loaded_clips.append(media_clip)
                
            except Exception as e:
                logger.error(f"Failed to load overlay {i}: {e}")
        
        if overlay_clips:
            composite = CompositeVideoClip([clip] + overlay_clips)
            logger.info(f"✅ {len(overlay_clips)} overlays composited")
            return composite
        
        return clip
    
    def _apply_background_music(self, clip: VideoFileClip) -> VideoFileClip:
        """Layer background music with original audio."""
        if not self.background_music or not self.background_music.exists():
            return clip
        
        logger.info(f"🎵 Applying background music: {self.background_music.name}")
        
        try:
            # Load music
            music = AudioFileClip(str(self.background_music))
            self._loaded_clips.append(music)
            
            # Loop music to match video duration
            if music.duration < clip.duration:
                loops = int(np.ceil(clip.duration / music.duration))
                music = concatenate_videoclips([music] * loops).subclip(0, clip.duration)
            else:
                music = music.subclip(0, clip.duration)
            
            # Adjust volumes
            music = music.volumex(self.music_volume)
            
            # Mix with original audio
            if clip.audio:
                original_audio = clip.audio.volumex(self.speech_volume)
                mixed_audio = CompositeAudioClip([original_audio, music])
            else:
                mixed_audio = music
            
            clip = clip.set_audio(mixed_audio)
            logger.info("✅ Background music applied")
            
        except Exception as e:
            logger.error(f"Failed to apply background music: {e}")
        
        return clip
    
    def render(
        self, 
        output_path: Path, 
        progress_callback: Optional[callable] = None,
        preset: str = 'medium',
        **kwargs
    ) -> Path:
        """
        Build the composite and render to a single output file.
        
        Args:
            output_path: Path to output video file
            progress_callback: Optional callback(current_frame, total_frames)
            preset: FFmpeg preset ('ultrafast', 'fast', 'medium', 'slow')
            **kwargs: Additional arguments for write_videofile
        
        Returns:
            Path to rendered output file
        """
        logger.info(f"🎬 Starting single-pass composite render to: {output_path.name}")
        
        try:
            # Load base clip
            self.base_clip = VideoFileClip(str(self.input_video_path))
            self._loaded_clips.append(self.base_clip)
            logger.info(f"📹 Loaded base clip: {self.base_clip.duration:.2f}s")
            
            # Apply effects in order (all in memory, no encoding yet)
            clip = self.base_clip
            
            # 1. Silence cuts (if any)
            if self.silence_cuts:
                clip = self._apply_silence_cuts(clip)
            
            # 2. Zoom effects
            if self.zoom_keyframes:
                clip = self._apply_zoom_effect(clip)
            
            # 3. Media overlays
            if self.media_overlays:
                clip = self._apply_media_overlays(clip)
            
            # 4. Background music
            if self.background_music:
                clip = self._apply_background_music(clip)
            
            # 5. Prepend intro(s)
            if self.intro_clips:
                clip = concatenate_videoclips(self.intro_clips + [clip], method="compose")
            
            # 6. Append outro(s)
            if self.outro_clips:
                clip = concatenate_videoclips([clip] + self.outro_clips, method="compose")
            
            logger.info(f"✨ Composite built! Final duration: {clip.duration:.2f}s")
            logger.info("🎬 Starting SINGLE ENCODE (this is the only re-encode)...")
            
            # Write ONCE (the only encoding step!)
            clip.write_videofile(
                str(output_path),
                codec='libx264',
                audio_codec='aac',
                preset=preset,
                verbose=False,
                logger='bar',
                **kwargs
            )
            
            logger.info(f"✅ Render complete: {output_path.name}")
            return output_path
            
        finally:
            # Cleanup all loaded clips
            self._cleanup()
    
    def _cleanup(self):
        """Close all loaded clips to free resources."""
        logger.info("🧹 Cleaning up loaded clips...")
        for clip in self._loaded_clips:
            try:
                clip.close()
            except:
                pass
        self._loaded_clips.clear()

