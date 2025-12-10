#!/usr/bin/env python3
"""
AI-Powered Bad Take Detection
Uses GPT-4o and ML models to intelligently identify bad takes
"""

import json
import logging
import re
from pathlib import Path
from typing import List, Dict, Any, Optional, Tuple
from dataclasses import dataclass
import numpy as np

logger = logging.getLogger(__name__)


@dataclass
class AIBadTakeConfig:
    """Configuration for AI-powered bad take detection"""
    openai_api_key: str
    model_name: str = "gpt-4o"
    use_audio_analysis: bool = True
    use_semantic_analysis: bool = True
    confidence_threshold: float = 0.7
    context_window: int = 5  # Number of segments to consider for context
    analyze_delivery_quality: bool = True
    detect_emotional_cues: bool = True
    custom_instructions: Optional[str] = None


class AIBadTakeDetector:
    """AI-powered bad take detection using GPT-4o and audio analysis"""
    
    def __init__(self, config: AIBadTakeConfig):
        self.config = config
        self.openai_available = False
        
        # Try to import OpenAI
        try:
            import openai
            self.openai = openai
            self.openai.api_key = config.openai_api_key
            self.openai_available = True
            logger.info("✅ OpenAI initialized for AI bad take detection")
        except ImportError:
            logger.warning("⚠️ OpenAI not available, falling back to basic detection")
    
    def _parse_srt_to_segments(self, transcript_path: Path) -> List[Dict[str, Any]]:
        """Parse SRT file into structured segments with timestamps"""
        segments = []
        
        with open(transcript_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        srt_blocks = re.split(r'\n\s*\n', content.strip())
        
        for i, block in enumerate(srt_blocks):
            lines = block.strip().split('\n')
            if len(lines) >= 3:
                timestamp_line = lines[1]
                text = ' '.join(lines[2:])
                
                timestamp_match = re.match(
                    r'(\d{2}:\d{2}:\d{2},\d{3}) --> (\d{2}:\d{2}:\d{2},\d{3})', 
                    timestamp_line
                )
                
                if timestamp_match:
                    start = self._srt_time_to_seconds(timestamp_match.group(1))
                    end = self._srt_time_to_seconds(timestamp_match.group(2))
                    
                    segments.append({
                        'index': i,
                        'start': start,
                        'end': end,
                        'text': text.strip(),
                        'duration': end - start
                    })
        
        return segments
    
    def _srt_time_to_seconds(self, srt_time: str) -> float:
        """Convert SRT timestamp to seconds"""
        hours, minutes, seconds = srt_time.replace(',', '.').split(':')
        return int(hours) * 3600 + int(minutes) * 60 + float(seconds)
    
    def _build_context_window(self, segments: List[Dict], current_idx: int) -> str:
        """Build context window for AI analysis"""
        start_idx = max(0, current_idx - self.config.context_window)
        end_idx = min(len(segments), current_idx + self.config.context_window + 1)
        
        context_segments = segments[start_idx:end_idx]
        
        context = []
        for seg in context_segments:
            marker = "→ " if seg['index'] == current_idx else "  "
            context.append(f"{marker}[{seg['start']:.1f}s] {seg['text']}")
        
        return "\n".join(context)
    
    def analyze_segment_pair_with_ai(
        self, 
        current_seg: Dict, 
        next_seg: Dict, 
        all_segments: List[Dict],
        audio_features: Optional[Dict] = None
    ) -> Dict[str, Any]:
        """
        Use GPT-4o to analyze if segments constitute a bad take.
        
        Returns:
            {
                'is_bad_take': bool,
                'confidence': float,
                'scenario_type': str,
                'which_to_remove': 'current' | 'next',
                'reasoning': str,
                'detected_patterns': List[str]
            }
        """
        if not self.openai_available:
            return self._fallback_detection(current_seg, next_seg)
        
        # Build prompt with context
        context = self._build_context_window(all_segments, current_seg['index'])
        
        # Audio features context if available
        audio_context = ""
        if audio_features and self.config.use_audio_analysis:
            audio_context = f"""
Audio Analysis:
- Current segment: Pitch variance: {audio_features.get('current_pitch_variance', 'N/A')}, Energy: {audio_features.get('current_energy', 'N/A')}
- Next segment: Pitch variance: {audio_features.get('next_pitch_variance', 'N/A')}, Energy: {audio_features.get('next_energy', 'N/A')}
- Similarity: {audio_features.get('audio_similarity', 'N/A')}
"""
        
        # Custom instructions
        custom_context = ""
        if self.config.custom_instructions:
            custom_context = f"\nAdditional Context: {self.config.custom_instructions}"
        
        prompt = f"""You are an expert video editor analyzing transcript segments to identify "bad takes" - moments where a speaker restarts, corrects themselves, or repeats content.

Analyze these two consecutive segments and determine if they represent a bad take:

SEGMENT A (Current):
- Timestamp: {current_seg['start']:.1f}s - {current_seg['end']:.1f}s
- Text: "{current_seg['text']}"
- Duration: {current_seg['duration']:.1f}s

SEGMENT B (Next):
- Timestamp: {next_seg['start']:.1f}s - {next_seg['end']:.1f}s  
- Text: "{next_seg['text']}"
- Duration: {next_seg['duration']:.1f}s

Time gap between segments: {next_seg['start'] - current_seg['end']:.1f}s

SURROUNDING CONTEXT:
{context}

{audio_context}{custom_context}

COMMON BAD TAKE PATTERNS TO DETECT:
1. **Stutters**: Short incomplete phrase followed by complete version (e.g., "Hi..." → "Hi everyone")
2. **False Starts**: Sentence begins same way but first is abandoned (e.g., "So the point..." → "So the point is...")
3. **Self-Corrections**: Explicit correction with keywords like "wait", "actually", "I mean", "sorry", "let me rephrase"
4. **Filler Retakes**: First segment has excessive um/uh/err, second is cleaner
5. **Breath Pauses**: 1-3 second pause followed by similar/repeated content
6. **Incomplete → Complete**: Partial sentence followed by complete thought
7. **Hesitant → Confident**: First delivery uncertain, second more confident
8. **Repeated Content**: Same information said twice with slight variation

ANALYSIS INSTRUCTIONS:
- Consider semantic similarity (do they convey the same idea?)
- Check for correction indicators ("wait", "actually", "no", "I mean")
- Look for completion patterns (incomplete → complete)
- Assess delivery confidence (hesitant → confident)
- Consider if the gap suggests a pause-and-retry
- Evaluate which version is better (more complete, confident, clear)

Respond in JSON format:
{{
    "is_bad_take": true/false,
    "confidence": 0.0-1.0,
    "scenario_type": "stutter|false_start|self_correction|filler_retry|breath_pause|incomplete_to_complete|repeated_content|none",
    "which_to_remove": "current|next|neither",
    "reasoning": "Brief explanation of why this is/isn't a bad take",
    "detected_patterns": ["list", "of", "patterns", "found"],
    "text_similarity": 0.0-1.0,
    "quality_comparison": "Which segment has better delivery quality"
}}

Be conservative - only mark as bad take if you're confident. When in doubt, mark as "neither"."""

        try:
            response = self.openai.chat.completions.create(
                model=self.config.model_name,
                messages=[
                    {
                        "role": "system", 
                        "content": "You are an expert video editor with deep knowledge of speech patterns, delivery quality, and identifying bad takes. You analyze transcripts to find moments that should be edited out."
                    },
                    {
                        "role": "user",
                        "content": prompt
                    }
                ],
                temperature=0.3,  # Lower temperature for consistent analysis
                response_format={"type": "json_object"}
            )
            
            result = json.loads(response.choices[0].message.content)
            
            # Validate and normalize
            result['is_bad_take'] = result.get('is_bad_take', False)
            result['confidence'] = float(result.get('confidence', 0.0))
            result['scenario_type'] = result.get('scenario_type', 'none')
            result['which_to_remove'] = result.get('which_to_remove', 'neither')
            result['reasoning'] = result.get('reasoning', '')
            result['detected_patterns'] = result.get('detected_patterns', [])
            
            logger.debug(f"AI Analysis: {result['scenario_type']} (confidence: {result['confidence']:.2f})")
            
            return result
            
        except Exception as e:
            logger.error(f"AI analysis failed: {e}")
            return self._fallback_detection(current_seg, next_seg)
    
    def _fallback_detection(self, current_seg: Dict, next_seg: Dict) -> Dict[str, Any]:
        """Fallback to basic similarity detection when AI unavailable"""
        from difflib import SequenceMatcher
        
        similarity = SequenceMatcher(None, current_seg['text'], next_seg['text']).ratio()
        
        is_bad_take = similarity > 0.7
        which_to_remove = 'current' if len(next_seg['text']) > len(current_seg['text']) else 'next'
        
        return {
            'is_bad_take': is_bad_take,
            'confidence': similarity if is_bad_take else 0.0,
            'scenario_type': 'repeated_content' if is_bad_take else 'none',
            'which_to_remove': which_to_remove if is_bad_take else 'neither',
            'reasoning': f'Text similarity: {similarity:.2f} (fallback mode)',
            'detected_patterns': ['high_text_similarity'] if is_bad_take else [],
            'text_similarity': similarity,
            'quality_comparison': 'Length-based'
        }
    
    def analyze_audio_features(
        self, 
        video_path: Path, 
        current_seg: Dict, 
        next_seg: Dict
    ) -> Optional[Dict[str, float]]:
        """Extract audio features for AI analysis (pitch, energy, tone)"""
        if not self.config.use_audio_analysis:
            return None
        
        try:
            import librosa
            from moviepy.editor import VideoFileClip
            import tempfile
            import os
            
            video = VideoFileClip(str(video_path))
            
            # Extract audio segments
            audio1 = video.audio.subclip(current_seg['start'], current_seg['end'])
            audio2 = video.audio.subclip(next_seg['start'], next_seg['end'])
            
            with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as tmp1:
                with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as tmp2:
                    audio1.write_audiofile(tmp1.name, verbose=False, logger=None)
                    audio2.write_audiofile(tmp2.name, verbose=False, logger=None)
                    
                    # Load with librosa
                    y1, sr1 = librosa.load(tmp1.name, sr=None)
                    y2, sr2 = librosa.load(tmp2.name, sr=None)
                    
                    # Compute features
                    features = {
                        # Energy/loudness
                        'current_energy': float(np.mean(librosa.feature.rms(y=y1))),
                        'next_energy': float(np.mean(librosa.feature.rms(y=y2))),
                        
                        # Pitch variance (confidence indicator)
                        'current_pitch_variance': float(np.std(librosa.yin(y1, fmin=50, fmax=400))),
                        'next_pitch_variance': float(np.std(librosa.yin(y2, fmin=50, fmax=400))),
                        
                        # Spectral features (tone quality)
                        'current_spectral_centroid': float(np.mean(librosa.feature.spectral_centroid(y=y1, sr=sr1))),
                        'next_spectral_centroid': float(np.mean(librosa.feature.spectral_centroid(y=y2, sr=sr2))),
                    }
                    
                    # Compute MFCC similarity
                    mfcc1 = librosa.feature.mfcc(y=y1, sr=sr1, n_mfcc=13)
                    mfcc2 = librosa.feature.mfcc(y=y2, sr=sr2, n_mfcc=13)
                    
                    mfcc1_mean = np.mean(mfcc1, axis=1)
                    mfcc2_mean = np.mean(mfcc2, axis=1)
                    
                    dot_product = np.dot(mfcc1_mean, mfcc2_mean)
                    norm_product = np.linalg.norm(mfcc1_mean) * np.linalg.norm(mfcc2_mean)
                    
                    if norm_product > 0:
                        features['audio_similarity'] = float((dot_product / norm_product + 1) / 2)
                    else:
                        features['audio_similarity'] = 0.0
                    
                    # Cleanup
                    os.unlink(tmp1.name)
                    os.unlink(tmp2.name)
                    
            video.close()
            return features
            
        except Exception as e:
            logger.warning(f"Audio feature extraction failed: {e}")
            return None
    
    def detect_bad_takes(
        self, 
        transcript_path: Path,
        video_path: Optional[Path] = None
    ) -> List[Dict[str, Any]]:
        """
        Main detection pipeline using AI analysis.
        
        Returns:
            List of bad takes with metadata
        """
        logger.info("🤖 Starting AI-powered bad take detection...")
        
        # Parse transcript
        segments = self._parse_srt_to_segments(transcript_path)
        logger.info(f"Parsed {len(segments)} transcript segments")
        
        bad_takes = []
        temporal_window = 90  # seconds
        
        for i in range(len(segments)):
            current_seg = segments[i]
            
            # Look ahead for similar segments
            for j in range(i + 1, len(segments)):
                next_seg = segments[j]
                
                # Check temporal window
                time_gap = next_seg['start'] - current_seg['end']
                if time_gap > temporal_window:
                    break
                
                # Skip if already marked
                if any(bt['start_time'] == current_seg['start'] or 
                      bt['start_time'] == next_seg['start'] for bt in bad_takes):
                    continue
                
                # Extract audio features if video available
                audio_features = None
                if video_path and self.config.use_audio_analysis:
                    audio_features = self.analyze_audio_features(video_path, current_seg, next_seg)
                
                # AI Analysis
                analysis = self.analyze_segment_pair_with_ai(
                    current_seg, next_seg, segments, audio_features
                )
                
                # Check if it's a bad take
                if (analysis['is_bad_take'] and 
                    analysis['confidence'] >= self.config.confidence_threshold and
                    analysis['which_to_remove'] != 'neither'):
                    
                    # Determine which to remove
                    if analysis['which_to_remove'] == 'current':
                        remove_seg = current_seg
                        keep_seg = next_seg
                    else:
                        remove_seg = next_seg
                        keep_seg = current_seg
                    
                    bad_takes.append({
                        'start_time': remove_seg['start'],
                        'end_time': remove_seg['end'],
                        'text': remove_seg['text'],
                        'ai_confidence': analysis['confidence'],
                        'scenario_type': analysis['scenario_type'],
                        'reasoning': analysis['reasoning'],
                        'detected_patterns': analysis['detected_patterns'],
                        'keep_alternative': {
                            'start_time': keep_seg['start'],
                            'end_time': keep_seg['end'],
                            'text': keep_seg['text']
                        },
                        'audio_features': audio_features
                    })
                    
                    logger.info(f"✅ Bad take detected: {analysis['scenario_type']} "
                              f"(confidence: {analysis['confidence']:.2f})")
                    logger.debug(f"   Reasoning: {analysis['reasoning']}")
        
        logger.info(f"🎯 Detected {len(bad_takes)} bad takes using AI")
        return bad_takes
    
    def batch_analyze_with_context(
        self,
        segments: List[Dict],
        video_path: Optional[Path] = None
    ) -> List[Dict[str, Any]]:
        """
        Advanced: Batch analyze all segments with full context using AI.
        More expensive but more accurate.
        """
        if not self.openai_available:
            logger.warning("Batch analysis requires OpenAI API")
            return []
        
        # Build full transcript context
        full_context = "\n".join([
            f"[{seg['start']:.1f}s] {seg['text']}" for seg in segments
        ])
        
        prompt = f"""Analyze this complete video transcript and identify ALL bad takes (retakes, corrections, stutters, etc.).

FULL TRANSCRIPT:
{full_context}

For each bad take you find, provide:
1. The segment indices to remove (0-based)
2. The scenario type (stutter, false_start, self_correction, etc.)
3. Confidence score (0.0-1.0)
4. Brief reasoning

Respond in JSON format:
{{
    "bad_takes": [
        {{
            "remove_segment_index": int,
            "keep_segment_index": int,
            "scenario_type": str,
            "confidence": float,
            "reasoning": str
        }}
    ]
}}"""

        try:
            response = self.openai.chat.completions.create(
                model=self.config.model_name,
                messages=[
                    {"role": "system", "content": "You are an expert video editor analyzing transcripts."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.3,
                response_format={"type": "json_object"}
            )
            
            result = json.loads(response.choices[0].message.content)
            
            # Convert to standard format
            bad_takes = []
            for bt in result.get('bad_takes', []):
                remove_idx = bt['remove_segment_index']
                keep_idx = bt['keep_segment_index']
                
                if 0 <= remove_idx < len(segments) and 0 <= keep_idx < len(segments):
                    remove_seg = segments[remove_idx]
                    keep_seg = segments[keep_idx]
                    
                    bad_takes.append({
                        'start_time': remove_seg['start'],
                        'end_time': remove_seg['end'],
                        'text': remove_seg['text'],
                        'ai_confidence': bt['confidence'],
                        'scenario_type': bt['scenario_type'],
                        'reasoning': bt['reasoning'],
                        'detected_patterns': [bt['scenario_type']],
                        'keep_alternative': {
                            'start_time': keep_seg['start'],
                            'end_time': keep_seg['end'],
                            'text': keep_seg['text']
                        }
                    })
            
            logger.info(f"🎯 Batch analysis found {len(bad_takes)} bad takes")
            return bad_takes
            
        except Exception as e:
            logger.error(f"Batch analysis failed: {e}")
            return []


def remove_bad_takes(
    video_path: Path,
    output_path: Path,
    bad_takes: List[Dict[str, Any]]
) -> bool:
    """Remove detected bad takes from video"""
    try:
        from moviepy.editor import VideoFileClip, concatenate_videoclips
        
        if not bad_takes:
            logger.info("No bad takes to remove")
            return False
        
        video = VideoFileClip(str(video_path))
        
        # Create list of time ranges to keep
        bad_take_times = [(bt['start_time'], bt['end_time']) for bt in bad_takes]
        bad_take_times.sort()
        
        # Build keep segments
        keep_clips = []
        last_end = 0
        
        for start, end in bad_take_times:
            if start > last_end:
                keep_clips.append(video.subclip(last_end, start))
            last_end = end
        
        # Add final segment
        if last_end < video.duration:
            keep_clips.append(video.subclip(last_end, video.duration))
        
        if keep_clips:
            final_video = concatenate_videoclips(keep_clips)
            final_video.write_videofile(
                str(output_path),
                codec='libx264',
                audio_codec='aac',
                verbose=False,
                logger=None
            )
            final_video.close()
        
        video.close()
        
        logger.info(f"✅ Removed {len(bad_takes)} bad takes, saved to {output_path}")
        return True
        
    except Exception as e:
        logger.error(f"Failed to remove bad takes: {e}")
        return False
