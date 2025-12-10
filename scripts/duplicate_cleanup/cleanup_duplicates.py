#!/usr/bin/env python3
"""
Smart Duplicate Cleanup - Identifies which duplicates can be safely removed
"""

import os
import json
from pathlib import Path
from collections import defaultdict

def analyze_duplicates_for_cleanup():
    """Analyze duplicates and suggest safe deletions."""
    
    # Run the duplicate finder and get JSON output
    import subprocess
    result = subprocess.run(['python', 'find_duplicates.py', '--json'], 
                          capture_output=True, text=True)
    
    if result.returncode != 0:
        print("Error running duplicate finder")
        print("STDERR:", result.stderr)
        return [], []
    
    try:
        duplicates = json.loads(result.stdout)
    except json.JSONDecodeError:
        print("Error parsing duplicate results")
        print("STDOUT:", result.stdout)
        return [], []
    
    # Categories for safe deletion
    safe_to_delete = []
    needs_review = []
    
    # Analyze same size duplicates (most reliable)
    if 'same_size' in duplicates:
        for size, files in duplicates['same_size'].items():
            if len(files) <= 1:
                continue
                
            # Separate files by priority (higher number = keep)
            file_priorities = []
            for file in files:
                priority = calculate_priority(file['path'], file['filename'])
                file_priorities.append((file, priority))
            
            # Sort by priority (highest first = keep)
            file_priorities.sort(key=lambda x: x[1], reverse=True)
            
            # Keep the highest priority file, mark others for deletion
            to_keep = file_priorities[0][0]
            to_delete = [fp[0] for fp in file_priorities[1:]]
            
            if len(to_delete) > 0:
                group = {
                    'size': size,
                    'keep': to_keep,
                    'delete': to_delete,
                    'type': 'same_size',
                    'confidence': 'high' if is_safe_deletion_group(to_keep, to_delete) else 'medium'
                }
                
                if group['confidence'] == 'high':
                    safe_to_delete.append(group)
                else:
                    needs_review.append(group)
    
    # Analyze similar names
    if 'similar_names' in duplicates:
        for group in duplicates['similar_names']:
            if len(group) <= 1:
                continue
                
            file_priorities = []
            for file in group:
                priority = calculate_priority(file['path'], file['filename'])
                file_priorities.append((file, priority))
            
            file_priorities.sort(key=lambda x: x[1], reverse=True)
            
            to_keep = file_priorities[0][0]
            to_delete = [fp[0] for fp in file_priorities[1:]]
            
            cleanup_group = {
                'keep': to_keep,
                'delete': to_delete,
                'type': 'similar_names',
                'confidence': 'medium' if is_safe_deletion_group(to_keep, to_delete) else 'low'
            }
            
            if cleanup_group['confidence'] in ['high', 'medium']:
                needs_review.append(cleanup_group)
    
    return safe_to_delete, needs_review

def calculate_priority(filepath, filename):
    """Calculate priority score for keeping a file (higher = better to keep)."""
    priority = 0
    path_lower = filepath.lower()
    filename_lower = filename.lower()
    
    # Directory priorities (higher = better)
    if '/uploaded' in path_lower:
        priority += 100  # Already uploaded = highest priority
    elif '/processed_originals' in path_lower:
        priority += 80   # Processed versions
    elif '/edited_videos' in path_lower:
        priority += 70   # Edited versions
    elif '/unsure of status' in path_lower:
        priority += 20   # Unsure status = lower priority
    elif '/temp' in path_lower or '/dryrun' in path_lower:
        priority -= 50   # Temp files = delete
    elif '/uploads/' in path_lower and ('2025-' in path_lower):
        priority -= 30   # Upload staging = lower priority
    elif '/test_batch' in path_lower:
        priority -= 40   # Test files = delete
    
    # Filename penalties (lower = more likely to delete)
    if filename_lower.startswith('original_'):
        priority -= 20
    if 'test_video' in filename_lower:
        priority -= 30
    if filename_lower.endswith(' 2.mp4') or filename_lower.endswith(' 3.mp4'):
        priority -= 15
    if '_processed' in filename_lower:
        priority += 10  # Processed versions are good
    if '_silence_removed' in filename_lower:
        priority -= 10  # Intermediate processing files
    if '_audio_enhanced' in filename_lower:
        priority -= 10  # Intermediate processing files
    
    # Size considerations (processed files are usually smaller)
    # This would need file size info passed in
    
    return priority

def is_safe_deletion_group(keep_file, delete_files):
    """Determine if this group is safe for automatic deletion."""
    keep_path = keep_file['path'].lower()
    
    # High confidence if keeping uploaded file and deleting temp/test files
    if '/uploaded' in keep_path:
        for file in delete_files:
            file_path = file['path'].lower()
            if not any(unsafe in file_path for unsafe in ['/temp', '/test', '/uploads/2025-', 'original_']):
                return False
        return True
    
    # Medium confidence for other cases
    return False

def format_cleanup_report(safe_to_delete, needs_review):
    """Format the cleanup recommendations."""
    print("=" * 80)
    print("DUPLICATE CLEANUP RECOMMENDATIONS")
    print("=" * 80)
    
    total_size_saved = 0
    total_files_to_delete = 0
    
    # Safe deletions
    if safe_to_delete:
        print(f"\n🟢 SAFE TO DELETE AUTOMATICALLY ({len(safe_to_delete)} groups):")
        print("-" * 50)
        for i, group in enumerate(safe_to_delete):
            print(f"\nGroup {i+1}:")
            print(f"   KEEP: {group['keep']['filename']}")
            print(f"         📁 {group['keep']['directory']}")
            print(f"   DELETE:")
            for file in group['delete']:
                total_files_to_delete += 1
                total_size_saved += file['size']
                print(f"         ❌ {file['filename']}")
                print(f"            📁 {file['directory']}")
                print(f"            Size: {format_file_size(file['size'])}")
    
    # Needs review
    if needs_review:
        print(f"\n🟡 NEEDS MANUAL REVIEW ({len(needs_review)} groups):")
        print("-" * 50)
        for i, group in enumerate(needs_review):
            print(f"\nGroup {i+1} (Confidence: {group['confidence']}):")
            print(f"   SUGGESTED KEEP: {group['keep']['filename']}")
            print(f"                   📁 {group['keep']['directory']}")
            print(f"   SUGGESTED DELETE:")
            for file in group['delete']:
                print(f"                   ❌ {file['filename']}")
                print(f"                      📁 {file['directory']}")
                print(f"                      Size: {format_file_size(file['size'])}")
    
    print(f"\n" + "=" * 80)
    print(f"SUMMARY:")
    print(f"  Files to delete: {total_files_to_delete}")
    print(f"  Space to save: {format_file_size(total_size_saved)}")
    print(f"  Groups needing review: {len(needs_review)}")
    print("=" * 80)

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

def generate_cleanup_script(safe_to_delete):
    """Generate a shell script to perform the safe deletions."""
    script_content = ['#!/bin/bash', '# Auto-generated duplicate cleanup script', '']
    
    for group in safe_to_delete:
        script_content.append(f"# Keeping: {group['keep']['filename']}")
        for file in group['delete']:
            script_content.append(f'rm "{file["path"]}"')
        script_content.append('')
    
    with open('cleanup_safe_duplicates.sh', 'w') as f:
        f.write('\n'.join(script_content))
    
    print(f"\n📝 Generated cleanup script: cleanup_safe_duplicates.sh")
    print("   Review the script before running: cat cleanup_safe_duplicates.sh")
    print("   To execute: bash cleanup_safe_duplicates.sh")

if __name__ == "__main__":
    print("Analyzing duplicates for safe cleanup...")
    safe_to_delete, needs_review = analyze_duplicates_for_cleanup()
    
    format_cleanup_report(safe_to_delete, needs_review)
    
    if safe_to_delete:
        generate_cleanup_script(safe_to_delete) 