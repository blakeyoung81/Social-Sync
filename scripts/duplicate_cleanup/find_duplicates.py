#!/usr/bin/env python3
"""
Video Duplicate Finder - Searches for duplicate videos across directories
"""

import os
import hashlib
from pathlib import Path
from collections import defaultdict
import argparse
import json
from difflib import SequenceMatcher

def get_file_hash(filepath, chunk_size=8192):
    """Calculate MD5 hash of a file for content comparison."""
    hash_md5 = hashlib.md5()
    try:
        with open(filepath, "rb") as f:
            for chunk in iter(lambda: f.read(chunk_size), b""):
                hash_md5.update(chunk)
        return hash_md5.hexdigest()
    except (IOError, OSError):
        return None

def normalize_filename(filename):
    """Remove common processing suffixes to find base filename."""
    # Remove file extension
    name_without_ext = Path(filename).stem
    
    # Common processing suffixes to remove
    suffixes = [
        '_enhanced', '_silence_cut', '_subtitled', '_processed', 
        '_audio_enhanced', '_silence_removed', '_with_outro',
        '_final', '_output', '_temp', '_tmp'
    ]
    
    normalized = name_without_ext
    for suffix in suffixes:
        if normalized.endswith(suffix):
            normalized = normalized[:-len(suffix)]
    
    return normalized.lower().replace('_', ' ').replace('-', ' ')

def similarity_ratio(a, b):
    """Calculate similarity ratio between two strings."""
    return SequenceMatcher(None, a, b).ratio()

def find_video_files(directories):
    """Find all video files in the given directories."""
    video_extensions = {'.mp4', '.mov', '.avi', '.mkv', '.wmv', '.flv', '.webm', '.m4v'}
    video_files = []
    
    for directory in directories:
        if not os.path.exists(directory):
            print(f"Warning: Directory not found: {directory}")
            continue
            
        for root, dirs, files in os.walk(directory):
            for file in files:
                if Path(file).suffix.lower() in video_extensions:
                    filepath = Path(root) / file
                    try:
                        stat = filepath.stat()
                        video_files.append({
                            'path': str(filepath),
                            'filename': file,
                            'size': stat.st_size,
                            'normalized_name': normalize_filename(file),
                            'directory': root
                        })
                    except (OSError, IOError):
                        continue
    
    return video_files

def find_duplicates(video_files, check_content_hash=False):
    """Find duplicates using various methods."""
    duplicates = {
        'exact_filenames': defaultdict(list),
        'similar_names': [],
        'same_size': defaultdict(list),
        'content_hash': defaultdict(list) if check_content_hash else None
    }
    
    # Group by exact filename (case-insensitive)
    filename_groups = defaultdict(list)
    for video in video_files:
        filename_groups[video['filename'].lower()].append(video)
    
    for filename, files in filename_groups.items():
        if len(files) > 1:
            duplicates['exact_filenames'][filename] = files
    
    # Group by file size
    size_groups = defaultdict(list)
    for video in video_files:
        size_groups[video['size']].append(video)
    
    for size, files in size_groups.items():
        if len(files) > 1:
            duplicates['same_size'][size] = files
    
    # Find similar normalized names
    processed_names = {}
    for video in video_files:
        normalized = video['normalized_name']
        if normalized in processed_names:
            # Check similarity ratio
            existing_video = processed_names[normalized]
            if similarity_ratio(existing_video['filename'], video['filename']) > 0.8:
                # Find if this group already exists
                group_found = False
                for group in duplicates['similar_names']:
                    if any(v['path'] == existing_video['path'] for v in group):
                        group.append(video)
                        group_found = True
                        break
                
                if not group_found:
                    duplicates['similar_names'].append([existing_video, video])
        else:
            processed_names[normalized] = video
    
    # Content hash comparison (optional, slower)
    if check_content_hash:
        print("Calculating content hashes... This may take a while for large files.")
        hash_groups = defaultdict(list)
        for i, video in enumerate(video_files):
            print(f"Hashing {i+1}/{len(video_files)}: {video['filename']}")
            file_hash = get_file_hash(video['path'])
            if file_hash:
                hash_groups[file_hash].append(video)
        
        for file_hash, files in hash_groups.items():
            if len(files) > 1:
                duplicates['content_hash'][file_hash] = files
    
    return duplicates

def format_file_size(size_bytes):
    """Convert bytes to human readable format."""
    if size_bytes == 0:
        return "0B"
    size_names = ["B", "KB", "MB", "GB"]
    import math
    i = int(math.floor(math.log(size_bytes, 1024)))
    p = math.pow(1024, i)
    s = round(size_bytes / p, 2)
    return f"{s} {size_names[i]}"

def print_duplicates(duplicates, output_format='text'):
    """Print or return duplicates in the specified format."""
    
    if output_format == 'json':
        # Convert to JSON-serializable format
        json_output = {}
        for category, items in duplicates.items():
            if items is None:
                continue
            if category == 'similar_names':
                json_output[category] = items
            else:
                json_output[category] = dict(items)
        return json.dumps(json_output, indent=2)
    
    # Text format
    output = []
    total_duplicates = 0
    
    output.append("=" * 80)
    output.append("VIDEO DUPLICATE DETECTION REPORT")
    output.append("=" * 80)
    
    # Exact filename duplicates
    if duplicates['exact_filenames']:
        output.append(f"\n🔄 EXACT FILENAME DUPLICATES ({len(duplicates['exact_filenames'])} groups):")
        output.append("-" * 50)
        for filename, files in duplicates['exact_filenames'].items():
            total_duplicates += len(files) - 1  # Don't count the original
            output.append(f"\nFilename: {filename}")
            for file in files:
                output.append(f"  📁 {file['directory']}")
                output.append(f"     Size: {format_file_size(file['size'])}")
    
    # Similar name duplicates
    if duplicates['similar_names']:
        output.append(f"\n🔍 SIMILAR NAME DUPLICATES ({len(duplicates['similar_names'])} groups):")
        output.append("-" * 50)
        for group in duplicates['similar_names']:
            total_duplicates += len(group) - 1
            output.append(f"\nSimilar files:")
            for file in group:
                output.append(f"  📄 {file['filename']}")
                output.append(f"     📁 {file['directory']}")
                output.append(f"     Size: {format_file_size(file['size'])}")
    
    # Same size duplicates
    if duplicates['same_size']:
        output.append(f"\n⚖️  SAME SIZE DUPLICATES ({len(duplicates['same_size'])} groups):")
        output.append("-" * 50)
        for size, files in duplicates['same_size'].items():
            if len(files) > 1:  # Only show actual duplicates
                total_duplicates += len(files) - 1
                output.append(f"\nSize: {format_file_size(size)}")
                for file in files:
                    output.append(f"  📄 {file['filename']}")
                    output.append(f"     📁 {file['directory']}")
    
    # Content hash duplicates
    if duplicates['content_hash']:
        output.append(f"\n🔐 IDENTICAL CONTENT DUPLICATES ({len(duplicates['content_hash'])} groups):")
        output.append("-" * 50)
        for file_hash, files in duplicates['content_hash'].items():
            total_duplicates += len(files) - 1
            output.append(f"\nHash: {file_hash[:16]}...")
            for file in files:
                output.append(f"  📄 {file['filename']}")
                output.append(f"     📁 {file['directory']}")
                output.append(f"     Size: {format_file_size(file['size'])}")
    
    output.append(f"\n" + "=" * 80)
    output.append(f"SUMMARY: Found {total_duplicates} duplicate files")
    output.append("=" * 80)
    
    return "\n".join(output)

def main():
    parser = argparse.ArgumentParser(description='Find duplicate videos across directories')
    parser.add_argument('directories', nargs='*', 
                       help='Directories to search (default: common video directories)')
    parser.add_argument('--hash', action='store_true',
                       help='Also check content hash (slower but more accurate)')
    parser.add_argument('--json', action='store_true',
                       help='Output results in JSON format')
    parser.add_argument('--output', '-o', help='Save results to file')
    
    args = parser.parse_args()
    
    # Default directories if none specified
    if not args.directories:
        base_dir = Path.cwd()
        default_dirs = [
            str(base_dir / "data" / "input_videos"),
            str(base_dir / "data" / "output_videos"), 
            str(base_dir / "data" / "uploads"),
            "/Users/blakeyoung/Library/Mobile Documents/com~apple~CloudDocs/Movies",
            "/Users/blakeyoung/Library/Mobile Documents/com~apple~CloudDocs/Movies/DryRunOutput"
        ]
        # Only include directories that exist
        directories = [d for d in default_dirs if os.path.exists(d)]
        if not directories:
            print("No default directories found. Please specify directories to search.")
            return
    else:
        directories = args.directories
    
    print(f"Searching for video files in {len(directories)} directories...")
    for directory in directories:
        print(f"  📁 {directory}")
    
    # Find all video files
    video_files = find_video_files(directories)
    print(f"\nFound {len(video_files)} video files")
    
    if not video_files:
        print("No video files found!")
        return
    
    # Find duplicates
    print("Analyzing for duplicates...")
    duplicates = find_duplicates(video_files, check_content_hash=args.hash)
    
    # Generate output
    output_format = 'json' if args.json else 'text'
    result = print_duplicates(duplicates, output_format)
    
    # Save to file or print
    if args.output:
        with open(args.output, 'w') as f:
            f.write(result)
        print(f"Results saved to: {args.output}")
    else:
        print(result)

if __name__ == "__main__":
    main() 