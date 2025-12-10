#!/usr/bin/env python3
"""
Bad Take Scenario Detection - Granular Controls
Handles different types of bad takes with customizable settings for each scenario
"""

import re
from typing import Dict, List, Tuple, Optional
from dataclasses import dataclass
import logging

logger = logging.getLogger(__name__)


@dataclass
class BadTakeScenarioConfig:
    """Configuration for different bad take detection scenarios"""
    
    # Stutter Detection (e.g., "Hi... Hi everyone")
    detect_stutters: bool = True
    stutter_word_limit: int = 3  # Max words in first take to consider as stutter
    stutter_prefix_match: float = 0.9  # How much the second should start like the first
    
    # False Start Detection (e.g., "So the main point... So the main point here is...")
    detect_false_starts: bool = True
    false_start_word_overlap: int = 2  # Min words that must match at start
    false_start_threshold: float = 0.85  # Similarity threshold for false starts
    
    # Self-Correction Detection (e.g., "The mitochondria is... wait, ARE")
    detect_self_corrections: bool = True
    self_correction_keywords: List[str] = None
    context_clue_boost: float = 0.15  # How much to boost detection
    
    # Filler Word Retakes (e.g., "Um... let me start again")
    detect_filler_retakes: bool = True
    filler_words: List[str] = None
    filler_word_threshold: float = 0.3  # Ratio of filler words to trigger
    
    # Breath/Pause-Based Retakes
    detect_breath_pauses: bool = True
    breath_pause_min: float = 1.5  # Min seconds of pause
    breath_pause_max: float = 3.0  # Max seconds of pause
    
    # Partial vs Complete Sentences
    detect_partial_sentences: bool = True
    prefer_complete_takes: bool = True
    length_bias_threshold: float = 1.3  # Keep if X times longer
    
    # Incomplete Sentence Detection
    detect_incomplete_sentences: bool = True
    incomplete_indicators: List[str] = None
    
    # Confidence/Delivery-Based
    prefer_confident_delivery: bool = True
    hesitation_penalty: float = 0.1
    
    def __post_init__(self):
        """Initialize default lists if not provided"""
        if self.self_correction_keywords is None:
            self.self_correction_keywords = [
                'wait', 'sorry', 'actually', 'i mean', 'let me', 'hold on',
                'no wait', 'scratch that', 'start over', 'try again', 'um actually',
                'let me rephrase', 'what i meant', 'correction'
            ]
        
        if self.filler_words is None:
            self.filler_words = ['um', 'uh', 'err', 'hmm', 'like', 'you know']
        
        if self.incomplete_indicators is None:
            self.incomplete_indicators = [
                'and', 'but', 'or', 'so', 'because', 'however', 'therefore',
                'which', 'that', 'who', 'where', 'when', 'while'
            ]


class BadTakeScenarioDetector:
    """Detect specific bad take scenarios with granular controls"""
    
    def __init__(self, config: BadTakeScenarioConfig = None):
        self.config = config or BadTakeScenarioConfig()
    
    def detect_stutter(self, current_text: str, next_text: str) -> Tuple[bool, float]:
        """
        Detect if current segment is a stutter (incomplete word/phrase repeated).
        
        Example: "Hi..." -> "Hi everyone" (remove "Hi...")
        
        Returns:
            (is_stutter, confidence_score)
        """
        if not self.config.detect_stutters:
            return False, 0.0
        
        current_words = current_text.split()
        next_words = next_text.split()
        
        # Check if current is short enough to be a stutter
        if len(current_words) > self.config.stutter_word_limit:
            return False, 0.0
        
        # Check if next starts with current (allowing for minor variations)
        current_lower = current_text.lower().strip()
        next_lower = next_text.lower().strip()
        
        if next_lower.startswith(current_lower):
            # Exact prefix match
            confidence = 1.0
            return True, confidence
        
        # Check word-by-word prefix match
        if len(next_words) > len(current_words):
            matching_words = sum(1 for i, word in enumerate(current_words) 
                                if i < len(next_words) and word.lower() == next_words[i].lower())
            match_ratio = matching_words / len(current_words)
            
            if match_ratio >= self.config.stutter_prefix_match:
                return True, match_ratio
        
        return False, 0.0
    
    def detect_false_start(self, current_text: str, next_text: str, 
                          text_similarity: float) -> Tuple[bool, float]:
        """
        Detect if current segment is a false start.
        
        Example: "So the main point..." -> "So the main point here is..." (remove first)
        
        Returns:
            (is_false_start, confidence_score)
        """
        if not self.config.detect_false_starts:
            return False, 0.0
        
        current_words = current_text.split()
        next_words = next_text.split()
        
        if len(current_words) < 2 or len(next_words) < 2:
            return False, 0.0
        
        # Count matching words at the start
        max_check = min(5, len(current_words), len(next_words))
        matching_prefix = sum(1 for i in range(max_check) 
                             if current_words[i].lower() == next_words[i].lower())
        
        if matching_prefix >= self.config.false_start_word_overlap:
            # Check if overall similarity is high
            if text_similarity >= self.config.false_start_threshold:
                # Check if next is longer (more complete)
                if len(next_words) > len(current_words):
                    confidence = (matching_prefix / max_check) * text_similarity
                    return True, confidence
        
        return False, 0.0
    
    def detect_self_correction(self, text: str) -> Tuple[bool, float, List[str]]:
        """
        Detect self-correction indicators in the text.
        
        Example: "The mitochondria is... wait, ARE the powerhouse"
        
        Returns:
            (has_correction, confidence_boost, found_keywords)
        """
        if not self.config.detect_self_corrections:
            return False, 0.0, []
        
        text_lower = text.lower()
        found_keywords = []
        
        for keyword in self.config.self_correction_keywords:
            # Use word boundary matching
            pattern = fr'\b{re.escape(keyword)}\b'
            if re.search(pattern, text_lower):
                found_keywords.append(keyword)
        
        if found_keywords:
            # Multiple correction words = higher confidence
            boost = min(self.config.context_clue_boost * len(found_keywords), 0.3)
            return True, boost, found_keywords
        
        return False, 0.0, []
    
    def detect_filler_retry(self, text: str) -> Tuple[bool, float]:
        """
        Detect if segment has excessive filler words suggesting a retry.
        
        Example: "Um... uh... let me try that again"
        
        Returns:
            (is_filler_retry, filler_ratio)
        """
        if not self.config.detect_filler_retakes:
            return False, 0.0
        
        words = text.lower().split()
        if not words:
            return False, 0.0
        
        filler_count = sum(1 for word in words 
                          if any(filler in word for filler in self.config.filler_words))
        filler_ratio = filler_count / len(words)
        
        if filler_ratio >= self.config.filler_word_threshold:
            return True, filler_ratio
        
        return False, 0.0
    
    def detect_breath_pause(self, time_gap: float) -> Tuple[bool, float]:
        """
        Detect if there's a breath pause indicating a retry.
        
        Returns:
            (is_breath_pause, confidence)
        """
        if not self.config.detect_breath_pauses:
            return False, 0.0
        
        if self.config.breath_pause_min <= time_gap <= self.config.breath_pause_max:
            # Confidence based on how close to ideal pause duration
            ideal_pause = (self.config.breath_pause_min + self.config.breath_pause_max) / 2
            confidence = 1.0 - abs(time_gap - ideal_pause) / ideal_pause
            return True, max(0.5, confidence)
        
        return False, 0.0
    
    def is_incomplete_sentence(self, text: str) -> Tuple[bool, str]:
        """
        Detect if a sentence is incomplete.
        
        Returns:
            (is_incomplete, reason)
        """
        if not self.config.detect_incomplete_sentences:
            return False, ""
        
        text_stripped = text.strip()
        
        # Check if ends with incomplete punctuation
        if not text_stripped:
            return True, "empty"
        
        # Check if doesn't end with proper punctuation
        if not text_stripped[-1] in '.!?':
            # Check if ends with conjunction/incomplete word
            last_word = text_stripped.split()[-1].lower().rstrip('.,;:')
            if last_word in self.config.incomplete_indicators:
                return True, f"ends_with_{last_word}"
            return True, "no_punctuation"
        
        return False, ""
    
    def is_complete_sentence(self, text: str) -> bool:
        """Check if sentence is complete"""
        text_stripped = text.strip()
        if not text_stripped:
            return False
        
        # Ends with proper punctuation and doesn't end with conjunction
        if text_stripped[-1] in '.!?':
            return True
        
        return False
    
    def calculate_confidence_score(self, text: str) -> float:
        """
        Calculate delivery confidence based on hesitations, fillers, etc.
        
        Returns:
            Confidence score (0.0 to 1.0, higher is more confident)
        """
        if not self.config.prefer_confident_delivery:
            return 0.5  # Neutral
        
        words = text.lower().split()
        if not words:
            return 0.0
        
        # Count hesitation markers
        hesitation_count = 0
        
        # Filler words
        hesitation_count += sum(1 for word in words 
                               if any(filler in word for filler in self.config.filler_words))
        
        # Ellipsis or multiple punctuation (indicates hesitation)
        if '...' in text or '??' in text or '!!' in text:
            hesitation_count += 1
        
        # Correction words
        for keyword in self.config.self_correction_keywords:
            if re.search(fr'\b{re.escape(keyword)}\b', text.lower()):
                hesitation_count += 0.5
        
        # Calculate confidence (fewer hesitations = higher confidence)
        hesitation_ratio = hesitation_count / len(words)
        confidence = max(0.0, 1.0 - hesitation_ratio - self.config.hesitation_penalty)
        
        return confidence
    
    def determine_which_to_keep(self, current_segment: Dict, next_segment: Dict,
                                scenario_flags: Dict) -> Tuple[Dict, Dict, str]:
        """
        Determine which segment to keep based on all scenario flags and heuristics.
        
        Args:
            current_segment: First segment data
            next_segment: Second segment data
            scenario_flags: Dict of detected scenarios
        
        Returns:
            (remove_segment, keep_segment, reason)
        """
        current_text = current_segment['text']
        next_text = next_segment['text']
        current_words = len(current_text.split())
        next_words = len(next_text.split())
        
        # Priority 1: Stutter - always remove the shorter first part
        if scenario_flags.get('is_stutter'):
            return current_segment, next_segment, "stutter"
        
        # Priority 2: False start - remove the incomplete start
        if scenario_flags.get('is_false_start'):
            return current_segment, next_segment, "false_start"
        
        # Priority 3: Filler words - remove the one with more fillers
        if scenario_flags.get('has_filler_retry_current'):
            return current_segment, next_segment, "filler_words"
        elif scenario_flags.get('has_filler_retry_next'):
            return next_segment, current_segment, "filler_words"
        
        # Priority 4: Self-correction - remove the one with correction keywords
        if scenario_flags.get('has_correction_current') and not scenario_flags.get('has_correction_next'):
            return current_segment, next_segment, "self_correction"
        elif scenario_flags.get('has_correction_next') and not scenario_flags.get('has_correction_current'):
            return next_segment, current_segment, "self_correction"
        
        # Priority 5: Complete vs Incomplete sentences
        if self.config.prefer_complete_takes:
            current_complete = self.is_complete_sentence(current_text)
            next_complete = self.is_complete_sentence(next_text)
            
            if next_complete and not current_complete:
                return current_segment, next_segment, "incomplete_sentence"
            elif current_complete and not next_complete:
                return next_segment, current_segment, "incomplete_sentence"
        
        # Priority 6: Length bias (significantly longer = more complete)
        if self.config.detect_partial_sentences:
            if next_words > current_words * self.config.length_bias_threshold:
                return current_segment, next_segment, "length_bias"
            elif current_words > next_words * self.config.length_bias_threshold:
                return next_segment, current_segment, "length_bias"
        
        # Priority 7: Confidence/delivery quality
        if self.config.prefer_confident_delivery:
            current_conf = scenario_flags.get('current_confidence', 0.5)
            next_conf = scenario_flags.get('next_confidence', 0.5)
            
            if next_conf > current_conf + 0.2:  # Significant difference
                return current_segment, next_segment, "delivery_confidence"
            elif current_conf > next_conf + 0.2:
                return next_segment, current_segment, "delivery_confidence"
        
        # Default: Remove the earlier one (typical retry pattern)
        return current_segment, next_segment, "default_earlier"
    
    def analyze_segments(self, current_segment: Dict, next_segment: Dict, 
                        time_gap: float, text_similarity: float) -> Dict:
        """
        Analyze two segments for all bad take scenarios.
        
        Returns:
            Dictionary with all scenario flags and metadata
        """
        current_text = current_segment['text']
        next_text = next_segment['text']
        
        # Run all scenario detections
        is_stutter, stutter_conf = self.detect_stutter(current_text, next_text)
        is_false_start, false_start_conf = self.detect_false_start(current_text, next_text, text_similarity)
        has_correction_curr, corr_boost_curr, corr_words_curr = self.detect_self_correction(current_text)
        has_correction_next, corr_boost_next, corr_words_next = self.detect_self_correction(next_text)
        has_filler_curr, filler_ratio_curr = self.detect_filler_retry(current_text)
        has_filler_next, filler_ratio_next = self.detect_filler_retry(next_text)
        is_breath_pause, breath_conf = self.detect_breath_pause(time_gap)
        is_incomplete_curr, incomplete_reason_curr = self.is_incomplete_sentence(current_text)
        is_incomplete_next, incomplete_reason_next = self.is_incomplete_sentence(next_text)
        current_confidence = self.calculate_confidence_score(current_text)
        next_confidence = self.calculate_confidence_score(next_text)
        
        return {
            'is_stutter': is_stutter,
            'stutter_confidence': stutter_conf,
            'is_false_start': is_false_start,
            'false_start_confidence': false_start_conf,
            'has_correction_current': has_correction_curr,
            'correction_boost_current': corr_boost_curr,
            'correction_words_current': corr_words_curr,
            'has_correction_next': has_correction_next,
            'correction_boost_next': corr_boost_next,
            'correction_words_next': corr_words_next,
            'has_filler_retry_current': has_filler_curr,
            'filler_ratio_current': filler_ratio_curr,
            'has_filler_retry_next': has_filler_next,
            'filler_ratio_next': filler_ratio_next,
            'is_breath_pause': is_breath_pause,
            'breath_confidence': breath_conf,
            'is_incomplete_current': is_incomplete_curr,
            'incomplete_reason_current': incomplete_reason_curr,
            'is_incomplete_next': is_incomplete_next,
            'incomplete_reason_next': incomplete_reason_next,
            'current_confidence': current_confidence,
            'next_confidence': next_confidence,
        }
