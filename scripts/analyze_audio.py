#!/usr/bin/env python3
"""
Audio Analysis Script for Video Preview
Analyzes audio levels and detects silence segments for real-time preview
"""

import sys
import json
import librosa
import numpy as np
from pathlib import Path

def analyze_audio(video_path, silence_threshold=0.07, smart_detection=False, silence_margin=0.2):
    """
    Enhanced audio analysis for silence detection with detailed visualization data
    """
    try:
        # Load audio with librosa
        y, sr = librosa.load(video_path, sr=22050)
        
        # Calculate RMS energy with higher resolution for better visualization
        frame_length = 2048
        hop_length = 512
        rms = librosa.feature.rms(y=y, frame_length=frame_length, hop_length=hop_length)[0]
        
        # Create time axis
        times = librosa.frames_to_time(np.arange(len(rms)), sr=sr, hop_length=hop_length)
        
        # Normalize RMS values for visualization (0-1 range)
        rms_normalized = rms / np.max(rms) if np.max(rms) > 0 else rms
        
        # --- [NEW] Smart Silence Detection (Best Practice) ---
        if smart_detection:
            # 1. Identify probable speech segments
            # We assume anything above the 20th percentile of volume is not pure silence.
            potential_speech_threshold = np.percentile(rms_normalized, 20)
            speech_rms = rms_normalized[rms_normalized > potential_speech_threshold]
            
            if len(speech_rms) > 0:
                # 2. Find the level of the quietest parts of the speech
                # The 15th percentile of speech volume is a robust measure of the speech floor.
                quietest_speech_level = np.percentile(speech_rms, 15)
                
                # 3. Set the threshold just below the quietest speech
                # 80% of the quietest speech level is a safe, adaptive threshold.
                recommended_threshold = quietest_speech_level * 0.8
            else:
                # Fallback if no speech is detected
                recommended_threshold = 0.05

            # Clamp to a reasonable range to avoid extreme values
            recommended_threshold = max(0.01, min(0.2, recommended_threshold))
        else:
            recommended_threshold = silence_threshold
        # --- [END NEW] Smart Silence Detection ---

        # The actual silence detection for the UI now uses the *manually set* threshold.
        # The recommended_threshold is only for the AI suggestion.
        is_silence = rms_normalized < silence_threshold
        
        # Find silence segments with minimum duration
        silence_segments = []
        in_silence = False
        silence_start = 0
        
        for i, silent in enumerate(is_silence):
            if silent and not in_silence:
                # Start of silence
                in_silence = True
                silence_start = times[i]
            elif not silent and in_silence:
                # End of silence
                in_silence = False
                silence_duration = times[i] - silence_start
                
                # Only include if longer than margin
                if silence_duration >= silence_margin:
                    silence_segments.append({
                        'start': float(silence_start),
                        'end': float(times[i]),
                        'duration': float(silence_duration)
                    })
        
        # Handle case where audio ends in silence
        if in_silence and len(times) > 0:
            silence_duration = times[-1] - silence_start
            if silence_duration >= silence_margin:
                silence_segments.append({
                    'start': float(silence_start),
                    'end': float(times[-1]),
                    'duration': float(silence_duration)
                })
        
        # Calculate statistics
        total_duration = float(times[-1]) if len(times) > 0 else 0
        total_silence_duration = sum(seg['duration'] for seg in silence_segments)
        speech_level = 1.0 - (total_silence_duration / total_duration) if total_duration > 0 else 1.0
        time_percentage_saved = (total_silence_duration / total_duration * 100) if total_duration > 0 else 0
        
        # Prepare detailed peaks data for waveform visualization (downsample for performance)
        target_peaks = 800  # Target number of peaks for visualization
        downsample_factor = max(1, len(rms_normalized) // target_peaks)
        peaks = rms_normalized[::downsample_factor].tolist()
        
        # Ensure we have enough peaks for visualization
        if len(peaks) < 200:
            # If we have too few peaks, interpolate
            try:
                from scipy import interpolate
                x_old = np.linspace(0, 1, len(peaks))
                x_new = np.linspace(0, 1, 200)
                f = interpolate.interp1d(x_old, peaks, kind='linear')
                peaks = f(x_new).tolist()
            except ImportError:
                # If scipy not available, repeat peaks
                while len(peaks) < 200:
                    peaks.extend(peaks[:min(len(peaks), 200-len(peaks))])
        
        result = {
            'peaks': peaks,
            'silenceSegments': silence_segments,
            'speechLevel': float(speech_level),
            'recommendedThreshold': float(recommended_threshold) if smart_detection else float(silence_threshold),
            'totalSilenceDuration': float(total_silence_duration),
            'estimatedCuts': len(silence_segments),
            'timePercentageSaved': float(time_percentage_saved),
            'totalDuration': float(total_duration),
            'averageRms': float(np.mean(rms_normalized)),
            'maxRms': float(np.max(rms_normalized)),
            'sampleRate': sr,
            'analysisFrames': len(rms),
            'success': True
        }
        
        return result
        
    except Exception as e:
        return {
            'success': False,
            'error': str(e),
            'peaks': [],
            'silenceSegments': [],
            'speechLevel': 0.0,
            'recommendedThreshold': silence_threshold,
            'totalSilenceDuration': 0.0,
            'estimatedCuts': 0,
            'timePercentageSaved': 0.0
        }

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({'success': False, 'error': 'No video path provided'}))
        sys.exit(1)
    
    video_path = sys.argv[1]
    silence_threshold = float(sys.argv[2]) if len(sys.argv) > 2 else 0.07
    smart_detection = sys.argv[3].lower() == 'true' if len(sys.argv) > 3 else False
    silence_margin = float(sys.argv[4]) if len(sys.argv) > 4 else 0.2
    
    result = analyze_audio(video_path, silence_threshold, smart_detection, silence_margin)
    print(json.dumps(result)) 