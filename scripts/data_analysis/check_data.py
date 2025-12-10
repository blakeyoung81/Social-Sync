#!/usr/bin/env python3
import json

with open('youtube_duplicates.json', 'r') as f:
    data = json.load(f)

# Look for the S3 Gallop video
s3_videos = [v for v in data['all_videos'] if 'S3 Gallop' in v['title']]
print(f'S3 Gallop videos found: {len(s3_videos)}')
for i, v in enumerate(s3_videos):
    print(f'{i+1}. ID: {v["id"]} | Title: {v["title"]} | URL: {v["url"]}')

print()

# Look for Step 1 Prep #125
vitamin_d_videos = [v for v in data['all_videos'] if 'Step 1 Prep #125' in v['title']]
print(f'Step 1 Prep #125 videos found: {len(vitamin_d_videos)}')
for i, v in enumerate(vitamin_d_videos):
    print(f'{i+1}. ID: {v["id"]} | Title: {v["title"]} | URL: {v["url"]}')

print()

# Check if we have duplicate video IDs in the dataset
all_ids = [v['id'] for v in data['all_videos']]
unique_ids = set(all_ids)
print(f"Total videos in dataset: {len(all_ids)}")
print(f"Unique video IDs: {len(unique_ids)}")
print(f"Duplicate entries in dataset: {len(all_ids) - len(unique_ids)}")

if len(all_ids) != len(unique_ids):
    print("\n⚠️  WARNING: The dataset contains duplicate video ID entries!")
    print("This means the same video appears multiple times in the data.")
    print("This is a data collection issue, not actual YouTube duplicates.") 