#!/usr/bin/env python3
"""
Video Discovery and Smart Scheduling Script
Analyzes videos in a folder and generates scheduling previews based on cached channel data.
"""

import sys
import json
import logging
import argparse
import subprocess
from pathlib import Path
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional, Tuple

# Add the project root to Python path
project_root = Path(__file__).parent.parent.parent
sys.path.insert(0, str(project_root))

from src.workflows.youtube_uploader import YouTubeUploader

# Configure logging
logging.basicConfig(level=logging.WARNING)

# Supported video formats
SUPPORTED_FORMATS = {'.mp4', '.mov', '.avi', '.mkv', '.webm', '.flv', '.wmv', '.m4v'}

def analyze_video_file(video_path: Path) -> Dict[str, Any]:
    """
    Analyze a video file to determine its properties including type (short vs regular).
    """
    try:
        # Get video info using ffprobe
        probe_cmd = [
            "ffprobe", "-v", "error",
            "-select_streams", "v:0",
            "-show_entries", "stream=width,height,duration",
            "-show_entries", "format=duration",
            "-of", "json",
            str(video_path)
        ]
        
        result = subprocess.run(probe_cmd, capture_output=True, text=True)
        if result.returncode != 0:
            return {
                'type': 'regular',
                'duration': 0,
                'width': 1920,
                'height': 1080,
                'aspectRatio': 1.78,
                'error': 'Could not analyze video'
            }
        
        video_info = json.loads(result.stdout)
        
        # Get dimensions
        streams = video_info.get("streams", [])
        if not streams:
            return {'type': 'regular', 'duration': 0, 'width': 1920, 'height': 1080, 'aspectRatio': 1.78}
            
        width = int(streams[0].get("width", 1920))
        height = int(streams[0].get("height", 1080))
        aspect_ratio = width / height
        
        # Get duration
        duration = 0
        if "format" in video_info and "duration" in video_info["format"]:
            duration = float(video_info["format"]["duration"])
        elif streams[0].get("duration"):
            duration = float(streams[0]["duration"])
        
        # Determine if it's a short
        is_vertical = aspect_ratio < 1.0  # Portrait orientation
        is_short_duration = duration <= 60  # 60 seconds or less
        
        video_type = "short" if (is_vertical and is_short_duration) else "regular"
        
        return {
            'type': video_type,
            'duration': duration,
            'width': width,
            'height': height,
            'aspectRatio': aspect_ratio,
            'isVertical': is_vertical,
            'isShortDuration': is_short_duration
        }
        
    except Exception as e:
        return {
            'type': 'regular',
            'duration': 0,
            'width': 1920,
            'height': 1080,
            'aspectRatio': 1.78,
            'error': str(e)
        }

def discover_videos(input_folder: str, analyze_types: bool = False) -> Dict[str, Any]:
    """
    Discover all video files in the input folder and optionally analyze their types.
    """
    folder_path = Path(input_folder)
    
    if not folder_path.exists():
        return {
            'totalVideos': 0,
            'totalSize': 0,
            'estimatedDuration': 0,
            'files': [],
            'shortcuts': [],
            'regularVideos': [],
            'error': 'Folder does not exist'
        }
    
    video_files = []
    total_size = 0
    total_duration = 0
    
    for file_path in folder_path.iterdir():
        if file_path.is_file() and file_path.suffix.lower() in SUPPORTED_FORMATS:
            try:
                file_size = file_path.stat().st_size
                total_size += file_size
                
                file_info = {
                    'name': file_path.name,
                    'path': str(file_path),
                    'size': file_size
                }
                
                if analyze_types:
                    analysis = analyze_video_file(file_path)
                    file_info.update(analysis)
                    total_duration += analysis.get('duration', 0)
                
                video_files.append(file_info)
                
            except Exception as e:
                continue
    
    # Separate shorts and regular videos
    shortcuts = [f for f in video_files if f.get('type') == 'short']
    regular_videos = [f for f in video_files if f.get('type') == 'regular']
    
    return {
        'totalVideos': len(video_files),
        'totalSize': total_size,
        'estimatedDuration': total_duration,
        'files': video_files,
        'shortcuts': shortcuts,
        'regularVideos': regular_videos
    }

def generate_smart_schedule(video_files: List[Dict], uploader: YouTubeUploader, 
                          schedule_date: str, schedule_mode: str, conflict_mode: str) -> Dict[str, Any]:
    """
    Generate a smart scheduling preview for all videos using cached channel data.
    """
    try:
        start_date = datetime.strptime(schedule_date, '%Y-%m-%d').date()
        
        scheduled_videos = []
        shortcuts_schedule = []
        regular_videos_schedule = []
        conflicts = 0
        
        current_date = start_date
        
        for video_file in video_files:
            video_type = video_file.get('type', 'regular')
            
            # Find next available date for this video type
            available_date = uploader.find_next_available_date(
                start_date=current_date,
                conflict_mode=conflict_mode,
                video_type=video_type,
                time_preference="auto",
                is_day_and_night=False
            )
            
            if available_date:
                # Determine time based on video type
                if video_type == "short":
                    scheduled_time = "19:00"  # Evening for shorts
                else:
                    scheduled_time = "07:00"  # Morning for regular videos
                
                scheduled_video = {
                    'fileName': video_file['name'],
                    'scheduledDate': available_date.strftime('%Y-%m-%d'),
                    'scheduledTime': scheduled_time,
                    'videoType': video_type,
                    'conflict': False,
                    'conflictReason': None
                }
                
                scheduled_videos.append(scheduled_video)
                
                if video_type == "short":
                    shortcuts_schedule.append({
                        'file': video_file,
                        'scheduledDate': available_date.strftime('%Y-%m-%d'),
                        'scheduledTime': scheduled_time
                    })
                else:
                    regular_videos_schedule.append({
                        'file': video_file,
                        'scheduledDate': available_date.strftime('%Y-%m-%d'),
                        'scheduledTime': scheduled_time
                    })
                
                # Move to next day for next video to avoid clustering
                current_date = available_date + timedelta(days=1)
            else:
                # No available date found - mark as conflict
                conflicts += 1
                scheduled_video = {
                    'fileName': video_file['name'],
                    'scheduledDate': None,
                    'scheduledTime': None,
                    'videoType': video_type,
                    'conflict': True,
                    'conflictReason': 'No available time slots found'
                }
                scheduled_videos.append(scheduled_video)
        
        # Generate preview summary
        if scheduled_videos:
            valid_dates = [sv['scheduledDate'] for sv in scheduled_videos if sv['scheduledDate']]
            if valid_dates:
                first_upload = min(valid_dates)
                last_upload = max(valid_dates)
                total_days = (datetime.strptime(last_upload, '%Y-%m-%d') - 
                            datetime.strptime(first_upload, '%Y-%m-%d')).days + 1
            else:
                first_upload = last_upload = schedule_date
                total_days = 1
        else:
            first_upload = last_upload = schedule_date
            total_days = 1
        
        preview = {
            'firstUpload': first_upload,
            'lastUpload': last_upload,
            'totalDays': total_days,
            'shortSlots': len(shortcuts_schedule),
            'regularSlots': len(regular_videos_schedule),
            'conflicts': conflicts
        }
        
        return {
            'scheduledVideos': scheduled_videos,
            'shortcuts': shortcuts_schedule,
            'regularVideos': regular_videos_schedule,
            'preview': preview
        }
        
    except Exception as e:
        return {
            'scheduledVideos': [],
            'shortcuts': [],
            'regularVideos': [],
            'preview': {
                'firstUpload': schedule_date,
                'lastUpload': schedule_date,
                'totalDays': 1,
                'shortSlots': 0,
                'regularSlots': 0,
                'conflicts': len(video_files)
            },
            'error': str(e)
        }

def main():
    parser = argparse.ArgumentParser(description='Discover videos and generate scheduling preview')
    parser.add_argument('input_folder', help='Path to input folder')
    parser.add_argument('--analyze-types', action='store_true', help='Analyze video types (short vs regular)')
    parser.add_argument('--generate-schedule', action='store_true', help='Generate smart scheduling preview')
    parser.add_argument('--schedule-date', default=datetime.now().strftime('%Y-%m-%d'), help='Starting schedule date')
    parser.add_argument('--schedule-mode', default='smart', help='Schedule mode')
    parser.add_argument('--conflict-mode', default='smart-analysis', help='Conflict detection mode')
    
    args = parser.parse_args()
    
    try:
        # Discover videos
        result = discover_videos(args.input_folder, args.analyze_types)
        
        # Generate schedule if requested
        if args.generate_schedule and result['files']:
            try:
                # Initialize uploader for scheduling analysis
                uploader = YouTubeUploader()
                if uploader.ensure_authentication():
                    schedule_data = generate_smart_schedule(
                        result['files'], 
                        uploader, 
                        args.schedule_date, 
                        args.schedule_mode, 
                        args.conflict_mode
                    )
                    result.update(schedule_data)
                else:
                    # Fallback if no authentication
                    result['schedulingPreview'] = {
                        'error': 'Authentication required for scheduling preview'
                    }
            except Exception as e:
                result['schedulingError'] = str(e)
        
        # Output results as JSON
        print(json.dumps(result, indent=2))
        
    except Exception as e:
        error_result = {
            'totalVideos': 0,
            'totalSize': 0,
            'estimatedDuration': 0,
            'files': [],
            'shortcuts': [],
            'regularVideos': [],
            'error': str(e)
        }
        print(json.dumps(error_result, indent=2))

if __name__ == '__main__':
    main() 