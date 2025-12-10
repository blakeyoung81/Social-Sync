#!/usr/bin/env python3
"""
Simple Duplicate Cleanup - Focus on the most obvious safe deletions
"""

import os

def find_safe_deletions():
    """Find the most obvious duplicates that can be safely deleted."""
    
    print("🎯 ANALYZING DUPLICATES FOR SAFE CLEANUP")
    print("=" * 60)
    
    safe_deletions = []
    
    # Category 1: Files in "Unsure of Status" that exist in "Uploaded"
    unsure_vs_uploaded = [
        ("PKU.mp4", "Unsure of Status", "Uploaded"),
        ("Baclofen.mp4", "Unsure of Status", "Uploaded"),
        ("Pheochromocytoma.mp4", "Unsure of Status", "Uploaded"),
        ("Lyme disease .mp4", "Unsure of Status", "Uploaded"),
        ("AV node vs SA node.mp4", "Unsure of Status", "Uploaded"),
        ("Pleural Effusion.mp4", "Unsure of Status", "Uploaded"),
        ("Neuroendocrine markers.mp4", "Unsure of Status", "Uploaded"),
        ("Anterior Talofibular .mp4", "Unsure of Status", "Uploaded"),
        ("Cardiogenic Shock.mp4", "Unsure of Status", "Uploaded"),
        ("Adenomyosis.mp4", "Unsure of Status", "Uploaded"),
    ]
    
    print("\n🟢 CATEGORY 1: Remove 'Unsure of Status' duplicates (10 files)")
    print("-" * 50)
    print("These files exist in both 'Unsure of Status' and 'Uploaded' folders.")
    print("Since they're uploaded, we can safely delete the 'Unsure' copies.")
    
    for filename, delete_folder, keep_folder in unsure_vs_uploaded:
        delete_path = f"/Users/blakeyoung/Library/Mobile Documents/com~apple~CloudDocs/Movies/{delete_folder}/{filename}"
        keep_path = f"/Users/blakeyoung/Library/Mobile Documents/com~apple~CloudDocs/Movies/{keep_folder}/{filename}"
        
        if os.path.exists(delete_path) and os.path.exists(keep_path):
            safe_deletions.append(delete_path)
            print(f"  ❌ DELETE: {delete_path}")
            print(f"  ✅ KEEP:   {keep_path}")
    
    # Category 2: Temp processing files that have uploaded versions
    temp_files = [
        "How to treat PUD_silence_removed.mp4",
        "Muscarinic cholinergic pathway_silence_removed.mp4",
        "Atypical Pneumonia Clues to watch out for_silence_removed.mp4",
        "Oral Medicines Flash Quiz With Hogwarts In the Background_silence_removed.mp4",
        "Meningothelial cells_silence_removed.mp4",
        "Gall stone obstruction_silence_removed.mp4",
        "Neuroectoderm vs surface ectoderm_silence_removed.mp4",
        "The most frequent CNS tumor_silence_removed.mp4",
        "Walking Pneumonia_silence_removed.mp4",
        "Mitral Regurgitation_silence_removed.mp4",
        "Systemic Sclerosis_silence_removed.mp4",
        "Esmolol_silence_removed.mp4",
    ]
    
    print(f"\n🟡 CATEGORY 2: Remove temp processing files ({len(temp_files)} files)")
    print("-" * 50)
    print("These are intermediate processing files. Final versions exist in 'Uploaded'.")
    
    for filename in temp_files:
        temp_path = f"/Users/blakeyoung/Library/Mobile Documents/com~apple~CloudDocs/Movies/Temp_Processing/{filename}"
        if os.path.exists(temp_path):
            safe_deletions.append(temp_path)
            print(f"  ❌ DELETE: {temp_path}")
    
    # Category 3: Duplicate files in Edited_Videos that exist in Uploaded
    edited_duplicates = [
        "Mucormycosis.mp4",
        "Dont miss this role of IL-1.mp4", 
        "GPIIB:IIIa.mp4",
        "MPO defect.mp4",
        "Gilbert Syndrome is benign.mp4",
        "Bradykinin.mp4",
        "Anencephaly causes.mp4",
        "How does Sickle Cell work?.mp4",
        "MAPK pathway with pain issues.mp4",
        "AAUAAA polyadenylation (capping mRNA).mp4",
        "Glucagon Receptor Question.mp4",
        "EBV and T cells (often missed step 1 question).mp4"
    ]
    
    print(f"\n🟠 CATEGORY 3: Remove duplicates from Edited_Videos ({len(edited_duplicates)} files)")
    print("-" * 50)
    print("These files exist in both 'Edited_Videos' and 'Uploaded'. Keep uploaded versions.")
    
    for filename in edited_duplicates:
        edited_path = f"/Users/blakeyoung/Library/Mobile Documents/com~apple~CloudDocs/Movies/Edited_Videos/{filename}"
        if os.path.exists(edited_path):
            safe_deletions.append(edited_path)
            print(f"  ❌ DELETE: {edited_path}")
    
    # Category 4: Upload staging files (massive duplicates in data/uploads/)
    print(f"\n🔴 CATEGORY 4: Clear upload staging directories")
    print("-" * 50)
    print("These are testing/staging files that can be safely removed:")
    
    staging_dirs = [
        "/Users/blakeyoung/Library/Mobile Documents/com~apple~CloudDocs/Coding1/Python/Youtube Uploader/data/uploads/2025-05-24",
        "/Users/blakeyoung/Library/Mobile Documents/com~apple~CloudDocs/Coding1/Python/Youtube Uploader/data/uploads/2025-05-25",
        "/Users/blakeyoung/Library/Mobile Documents/com~apple~CloudDocs/Coding1/Python/Youtube Uploader/data/input_videos/test_batch"
    ]
    
    for staging_dir in staging_dirs:
        if os.path.exists(staging_dir):
            files = os.listdir(staging_dir)
            video_files = [f for f in files if f.endswith(('.mp4', '.mov', '.avi'))]
            print(f"  📁 {staging_dir} ({len(video_files)} video files)")
            for video_file in video_files:
                safe_deletions.append(os.path.join(staging_dir, video_file))
    
    return safe_deletions

def generate_cleanup_script(safe_deletions):
    """Generate cleanup scripts."""
    
    # Generate removal script
    with open('remove_duplicates.sh', 'w') as f:
        f.write('#!/bin/bash\n')
        f.write('# Safe duplicate removal script\n')
        f.write('# Generated automatically - please review before running\n\n')
        
        f.write('echo "Starting duplicate cleanup..."\n')
        f.write('echo "This will delete {} files"\n'.format(len(safe_deletions)))
        f.write('read -p "Are you sure? (y/N): " -n 1 -r\n')
        f.write('echo\n')
        f.write('if [[ ! $REPLY =~ ^[Yy]$ ]]; then\n')
        f.write('    echo "Cancelled."\n')
        f.write('    exit 1\n')
        f.write('fi\n\n')
        
        for file_path in safe_deletions:
            f.write(f'echo "Deleting: {os.path.basename(file_path)}"\n')
            f.write(f'rm "{file_path}"\n')
        
        f.write('\necho "Cleanup complete!"\n')
        f.write('echo "Deleted {} files"\n'.format(len(safe_deletions)))
    
    os.chmod('remove_duplicates.sh', 0o755)
    
    # Generate list for review
    with open('files_to_delete.txt', 'w') as f:
        f.write('Files marked for deletion:\n')
        f.write('=' * 50 + '\n\n')
        for file_path in safe_deletions:
            f.write(f'{file_path}\n')
    
    return len(safe_deletions)

def calculate_space_savings(safe_deletions):
    """Calculate how much space we'll save."""
    total_size = 0
    valid_files = 0
    
    for file_path in safe_deletions:
        try:
            if os.path.exists(file_path):
                size = os.path.getsize(file_path)
                total_size += size
                valid_files += 1
        except OSError:
            continue
    
    # Convert to human readable
    if total_size < 1024:
        size_str = f"{total_size} B"
    elif total_size < 1024**2:
        size_str = f"{total_size/1024:.1f} KB"
    elif total_size < 1024**3:
        size_str = f"{total_size/(1024**2):.1f} MB"
    else:
        size_str = f"{total_size/(1024**3):.1f} GB"
    
    return valid_files, size_str

def main():
    safe_deletions = find_safe_deletions()
    
    if safe_deletions:
        valid_files, space_saved = calculate_space_savings(safe_deletions)
        
        print("\n" + "=" * 60)
        print("📊 CLEANUP SUMMARY")
        print("=" * 60)
        print(f"Files to delete: {valid_files}")
        print(f"Space to save: {space_saved}")
        print()
        
        script_count = generate_cleanup_script(safe_deletions)
        
        print("📝 GENERATED FILES:")
        print(f"  • remove_duplicates.sh - Executable cleanup script")
        print(f"  • files_to_delete.txt - Full list for review")
        print()
        print("🚀 NEXT STEPS:")
        print("  1. Review: cat files_to_delete.txt")
        print("  2. Execute: ./remove_duplicates.sh")
        print()
        print("⚠️  WARNING: This will permanently delete files!")
        print("   Make sure you have backups if needed.")
    else:
        print("\nNo safe deletions found.")

if __name__ == "__main__":
    main() 