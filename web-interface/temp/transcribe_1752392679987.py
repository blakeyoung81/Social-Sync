
import sys
import os
sys.path.append('/Users/blakeyoung/Library/Mobile Documents/com~apple~CloudDocs/Coding1/Python/Youtube Uploader')

import whisper
import json
from pathlib import Path

def format_time_srt(time_seconds):
    """Converts seconds to SRT time format HH:MM:SS,mmm"""
    millisec = int(round((time_seconds - int(time_seconds)) * 1000))
    seconds = int(time_seconds)
    minutes, seconds = divmod(seconds, 60)
    hours, minutes = divmod(minutes, 60)
    return f"{hours:02d}:{minutes:02d}:{seconds:02d},{millisec:03d}"

def transcribe_video(video_path, model_name="small"):
    """Transcribe video using Whisper and return segments with timing"""
    try:
        # Fix SSL certificate verification issue for Whisper model downloads
        import ssl
        ssl._create_default_https_context = ssl._create_unverified_context
        
        model = whisper.load_model(model_name)
        result = model.transcribe(video_path, verbose=False)
        
        # Format segments for frontend
        segments = []
        for i, segment in enumerate(result["segments"]):
            segments.append({
                "id": i + 1,
                "start": segment["start"],
                "end": segment["end"],
                "startTime": format_time_srt(segment["start"]),
                "endTime": format_time_srt(segment["end"]),
                "text": segment["text"].strip(),
                "confidence": segment.get("avg_logprob", 0)
            })
        
        # Create full transcript text
        full_text = " ".join([seg["text"] for seg in segments])
        
        # Create SRT format
        srt_content = ""
        for segment in segments:
            srt_content += f"{segment['id']}\n"
            srt_content += f"{segment['startTime']} --> {segment['endTime']}\n"
            srt_content += f"{segment['text']}\n\n"
        
        return {
            "success": True,
            "segments": segments,
            "fullText": full_text,
            "srtContent": srt_content,
            "duration": result.get("duration", 0),
            "language": result.get("language", "en")
        }
        
    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }

# Main execution
if __name__ == "__main__":
    video_path = "/Users/blakeyoung/Library/Mobile Documents/com~apple~CloudDocs/Movies/ABO incompatibility reaction.mp4"
    model_name = "small"
    
    result = transcribe_video(video_path, model_name)
    print(json.dumps(result))
