# Full Render Guide

## Overview

The **Full Render** feature allows you to process videos with all AI-powered enhancements enabled. This comprehensive guide covers the complete workflow from selecting a video to downloading the final rendered output.

## Prerequisites

Before using Full Render, ensure:

1. ✅ **Environment Variables Configured** (in root `.env`):
   ```bash
   OPENAI_API_KEY=sk-proj-...  # Required for AI features
   PEXELS_API_KEY=...          # Required for B-roll footage
   PIXABAY_API_KEY=...         # Optional alternative B-roll source
   ```

2. ✅ **Python Dependencies Installed**:
   ```bash
   cd YoutubeUploader
   pip install -r requirements.txt
   ```

3. ✅ **Web Interface Running**:
   ```bash
   cd web-interface
   npm run dev
   ```

4. ✅ **Video Input Ready**: 
   - Place your video in a known directory
   - Or use the file picker to select it

## Full Render Workflow

### Step 1: Select Your Video

1. Navigate to `http://localhost:3000`
2. In the **Video Preview** section, click **Browse** or specify an input folder
3. The first video from the folder will load automatically
4. You'll see the video preview player with controls

### Step 2: Audio Analysis

Once a video is loaded:

1. The system automatically runs **AI-powered audio analysis**
2. Progress indicator shows: "Analyzing audio..."
3. Results display:
   - Number of silence segments detected
   - Suggested cut points
   - Audio waveform visualization with cut markers

**What's Happening:**
- Whisper AI transcribes the audio
- Sentence-level embeddings detect semantic boundaries
- Smart silence detection finds optimal cut points

### Step 3: Configure Processing Options

Before rendering, customize your processing pipeline:

#### Core Processing
- ✅ **Skip Audio Processing**: Skip audio enhancement
- ✅ **Skip Silence Removal**: Keep all silence segments
- ✅ **Skip Transcription**: Don't generate subtitles
- ✅ **Skip GPT Correction**: No AI text cleanup
- ✅ **Skip Subtitles**: Don't burn subtitles into video

#### Visual Enhancements
- ✅ **Skip B-roll**: No stock footage overlays
- ✅ **Skip Dynamic Zoom**: No Ken Burns effects
- ✅ **Skip Image Generation**: No AI-generated images
- ✅ **Skip Bad Take Removal**: Keep all takes

#### Audio Enhancements
- ✅ **Skip Background Music**: No music track
- ✅ **Skip Sound Effects**: No sound enhancements

#### Advanced Settings
- **Silence Threshold**: Volume level (dB) to detect silence
- **Silence Duration**: Minimum silence length (seconds)
- **Whisper Model**: `tiny`, `base`, `small`, `medium`, `large`
- **GPT Model**: `gpt-3.5-turbo`, `gpt-4`, `gpt-4-turbo`
- **Subtitle Font Size**: Text size for burned subtitles
- **Zoom Intensity**: Low, Medium, High, or Cinematic
- **Music Track**: Select from available background tracks
- **Frame Style**: Visual style for overlays
- **Highlight Style**: Style for emphasized content

### Step 4: Start Full Render

1. Click **🎬 Generate Cut Preview** to see a quick sample
2. Review the preview in the player
3. When satisfied, click **Full Render** button
4. A modal appears: **"Generate Full Render Preview?"**
5. Click **Confirm**

### Step 5: Monitor Rendering Progress

The Full Render process streams real-time updates:

#### Progress Indicators
```
🎬 Starting full render...
📹 Processing: 1.mp4
⚙️  Extracting frames... 0% → 100%
🤖 Running AI transcription...
🧠 Detecting silence segments...
📊 Applying GPT corrections...
🎨 Generating B-roll overlays...
🎵 Adding background music...
✨ Applying dynamic zoom effects...
📝 Burning subtitles...
💾 Encoding final video...
✅ Rendering complete!
```

#### What Each Step Does

| Step | Description | Time Est. |
|------|-------------|-----------|
| **Frame Extraction** | Extracts video frames at 30fps | 1-2 min |
| **Audio Analysis** | Transcribes with Whisper AI | 2-5 min |
| **Silence Detection** | Finds cut points with embeddings | 1-2 min |
| **GPT Correction** | Fixes transcription errors | 30 sec |
| **B-roll Generation** | Searches & downloads stock footage | 3-5 min |
| **Dynamic Zoom** | Applies Ken Burns effects | 2-3 min |
| **Image Generation** | Creates AI images (if enabled) | 1-2 min |
| **Bad Take Removal** | Removes stutters & hesitations | 1-2 min |
| **Background Music** | Mixes audio track | 1 min |
| **Sound Effects** | Adds emphasis sounds | 30 sec |
| **Subtitle Burn** | Renders text overlays | 2-3 min |
| **Final Encoding** | H.264 compression | 2-5 min |

**Total Time:** 15-30 minutes (depending on video length and enabled features)

### Step 6: Preview & Download

1. When complete, preview player updates with rendered video
2. Click **📥 Download** to save locally
3. File saved to: `YoutubeUploader/data/output_videos/preview_[timestamp]/`

## Troubleshooting

### Common Issues

#### 1. "OPENAI_API_KEY not configured"
**Solution:** Ensure your root `.env` file has:
```bash
OPENAI_API_KEY=sk-proj-...
```
Then restart the dev server:
```bash
cd web-interface && npm run dev
```

#### 2. "Controller is already closed" errors
**Fixed in latest version.** Update your code and restart.

#### 3. Render gets stuck at X%
**Check terminal logs** for Python errors:
```bash
# Look for:
[Full Render STDOUT] ...
[Full Render STDERR] ...
```

#### 4. No B-roll footage appears
**Check API keys:**
- Ensure `PEXELS_API_KEY` is valid
- Test at https://api.pexels.com/v1/search?query=test
- Verify rate limits haven't been exceeded

#### 5. Subtitles missing or incorrect
**Possible causes:**
- Transcription failed (check logs)
- `--skip-transcription` flag enabled
- `--skip-subtitles` flag enabled
- Whisper model too small (try `medium` or `large`)

#### 6. Video quality degraded
**Solution:**
- Check encoding settings in `youtube_uploader.py`
- Ensure source video is high quality
- Adjust bitrate settings if needed

### Debug Mode

Enable verbose logging:

1. Open terminal in `YoutubeUploader/`
2. Run Python script manually:
```bash
source venv/bin/activate
python src/workflows/youtube_uploader.py \
  --mode process-only \
  --output-dir data/test_output \
  path/to/your/video.mp4
```

3. Watch for detailed logs and error messages

## Advanced Features

### Custom Processing Pipeline

For advanced users, create custom workflows:

```python
from src.workflows.youtube_uploader import process_video

process_video(
    video_path="input.mp4",
    output_dir="output/",
    skip_steps={
        "silence": False,
        "transcription": False,
        "gpt": True,  # Skip GPT for speed
        "broll": True,  # Skip B-roll for speed
        "zoom": False,
        "music": False,
    },
    options={
        "whisper_model": "medium",
        "silence_threshold": -40,
        "zoom_intensity": "medium",
    }
)
```

### Batch Processing

Process multiple videos:

1. Place videos in `data/input_videos/`
2. Run batch processor:
```bash
python src/workflows/youtube_uploader.py \
  --mode process-only \
  --batch \
  data/input_videos/*.mp4
```

### Integration with YouTube Upload

After rendering, upload directly:

```bash
python src/workflows/youtube_uploader.py \
  --mode full \
  --title "My Video Title" \
  --description "Video description" \
  path/to/rendered/video.mp4
```

## Performance Optimization

### Speed Up Rendering

1. **Use smaller Whisper model**: `tiny` or `base` vs `large`
2. **Skip expensive steps**: Disable B-roll and image generation
3. **Reduce video resolution**: Process 720p instead of 4K
4. **Use GPU acceleration**: Ensure CUDA or MPS is available

### GPU Configuration

#### macOS (Apple Silicon)
```bash
# Automatic - uses MPS backend
# Verify in logs: "Use pytorch device_name: mps"
```

#### NVIDIA GPU
```bash
# Ensure CUDA is installed
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu118
```

## Best Practices

1. ✅ **Test with short clips first** (~1 min) to verify settings
2. ✅ **Use Cut Preview** before Full Render to check cuts
3. ✅ **Keep original video** as backup
4. ✅ **Monitor disk space** (renders can be large)
5. ✅ **Check API quotas** before batch processing
6. ✅ **Use version control** for Python customizations

## Cost Estimation

### OpenAI API Costs (per 10 min video)

| Feature | Model | Cost |
|---------|-------|------|
| Transcription | Whisper | $0.006/min → **$0.06** |
| GPT Correction | GPT-3.5 | ~5K tokens → **$0.01** |
| Chapter Generation | GPT-4 | ~10K tokens → **$0.30** |
| Image Generation | DALL-E 3 | 4 images → **$0.16** |

**Total per video:** ~$0.50 - $1.00

### Pexels API
- ✅ **Free** with attribution
- Rate limits: 200 requests/hour

## Next Steps

- [YouTube Upload Guide](./YOUTUBE_UPLOAD_GUIDE.md)
- [Multi-Platform Publishing](./MULTI_PLATFORM_GUIDE.md)
- [Analytics Dashboard](./ANALYTICS_GUIDE.md)
- [API Reference](./API_REFERENCE.md)

## Support

For issues or questions:
1. Check logs in terminal
2. Review error messages in browser console
3. Consult the [Troubleshooting](#troubleshooting) section
4. Check GitHub issues for similar problems

