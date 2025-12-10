# OpenAI Cost Breakdown - Accurate Calculations

## Overview
This document provides detailed cost calculations for the YouTube Video Processor based on actual OpenAI pricing and realistic usage patterns.

**IMPORTANT**: Whisper transcription runs locally (FREE) and YouTube API quota is within free tier for most users.

## OpenAI Pricing (Current as of 2024)

### Whisper Transcription
- **Cost**: **FREE** (runs locally on your computer)
- **No API calls** - uses local Whisper installation

### GPT-4o-mini Text Generation
- **Input tokens**: $0.15 per 1M tokens  
- **Output tokens**: $0.60 per 1M tokens

### DALL-E 3 Image Generation
- **Standard quality 1024×1024**: $0.04 per image
- **HD quality 1024×1024**: $0.08 per image
- **We use Standard quality for thumbnails**: **$0.04**

## Per-Video Cost Breakdown (10-minute video)

### 1. Whisper Transcription
**Cost**: **FREE** (local processing)
- Runs on your computer using local Whisper
- No API calls, no costs

### 2. GPT-4o-mini Token Usage

#### Title Generation (if enabled)
- **Input**: ~100 tokens (filename, basic context)
- **Output**: ~20 tokens (optimized title)
- **Cost**: (100/1M × $0.15) + (20/1M × $0.60) = **$0.000027**

#### Description Generation (if enabled)  
- **Input**: ~150 tokens (title, basic context)
- **Output**: ~300 tokens (full description)
- **Cost**: (150/1M × $0.15) + (300/1M × $0.60) = **$0.0002025**

#### Tags Generation (if enabled)
- **Input**: ~200 tokens (title, description context)
- **Output**: ~50 tokens (relevant tags)
- **Cost**: (200/1M × $0.15) + (50/1M × $0.60) = **$0.00006**

#### Caption Correction (biggest GPT cost)
- **Input**: ~3,000 tokens (raw Whisper transcription for 10-min video)
- **Output**: ~3,000 tokens (corrected, punctuated captions)
- **Cost**: (3000/1M × $0.15) + (3000/1M × $0.60) = **$0.00225**

**Total GPT-4o-mini cost**: ~$0.00254 per video

### 3. DALL-E 3 Thumbnail
**Cost**: $0.04 per video (if enabled)

## Total Cost Per Video

With all AI features enabled:
- **Whisper**: FREE (local)
- **GPT-4o-mini**: $0.00254  
- **DALL-E 3**: $0.040
- **Total**: **~$0.043 per video**

## Cost Comparisons

### Corrected vs Previous Estimate
- **Previous wrong estimate**: ~$0.103 per video (included paid Whisper)
- **Actual cost**: **$0.043 per video** (local Whisper + free quota)

### Feature-by-Feature Impact
1. **Transcription**: **FREE** (local processing)
2. **Thumbnail**: 93% of total cost ($0.040)  
3. **GPT corrections**: 6% of total cost ($0.00254)
4. **GPT titles/descriptions/tags**: 1% of total cost

## Batch Processing Economics

### 10 Videos
- **Total OpenAI cost**: $0.43
- **Most expensive component**: DALL-E thumbnails ($0.40)

### 100 Videos  
- **Total OpenAI cost**: $4.30
- **Daily processing budget**: ~$4-5 for 100 videos

## YouTube API Quota (FREE)

YouTube provides **10,000 free quota units daily**. With ultra-efficient caching:
- **Video upload**: 1,600 units per video
- **Playlist assignment**: 1 unit per video  
- **Scheduled dates check**: 100 units total (cached for the week)
- **Total quota per video**: ~1,601 units
- **Daily capacity**: ~6 videos within free tier

## Optimization Strategies

### To Reduce Costs:
1. **Skip thumbnail generation**: Saves $0.04 per video (39% reduction)
2. **Skip GPT corrections**: Saves $0.00254 per video (2.5% reduction)
3. **Use shorter videos**: Whisper costs scale linearly with video length

### To Maximize Value:
1. **Caption correction provides the most value** for the smallest cost increase
2. **Thumbnails are expensive** but may significantly impact video performance
3. **Title/description generation** is extremely cheap and provides good value

## Real-World Example

**Processing 50 medical education videos (10 minutes each):**
- Whisper transcription: **FREE** (local)
- GPT caption corrections: $0.13
- DALL-E thumbnails: $2.00  
- GPT titles/descriptions: $0.02
- YouTube quota: **FREE** (within limits)
- **Total**: **$2.15**

**This enables:**
- Accurate medical transcriptions
- Professional thumbnails
- SEO-optimized titles and descriptions
- Enhanced accessibility with corrected captions

## Notes
- Costs assume 10-minute average video length
- Token estimates based on typical medical education content
- Prices subject to change; refer to OpenAI pricing page for current rates
- YouTube API quotas reset daily at midnight PT 