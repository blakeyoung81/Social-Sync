# 🚀 Quick Start - SocialSync Pro

## 1️⃣ One-Time Setup (5 minutes)

### Configure API Keys
Edit `YoutubeUploader/.env`:
```bash
OPENAI_API_KEY=sk-proj-...
PEXELS_API_KEY=...
PIXABAY_API_KEY=...
```

### Install Dependencies
```bash
# Python dependencies
pip install -r requirements.txt

# Node dependencies
cd web-interface
npm install
```

## 2️⃣ Start Development Server

```bash
cd web-interface
npm run dev
```

Open: `http://localhost:3000`

## 3️⃣ Process Your First Video

### Quick Test (2-5 min)
1. Load a short video (1-2 min)
2. Wait for audio analysis
3. Click **"🎬 Generate Cut Preview"**
4. Click **"Full Render"**
5. Download result

### Full Production (15-30 min)
1. Load your video
2. Configure processing options
3. Enable desired features:
   - ✅ Silence removal
   - ✅ Transcription & subtitles
   - ✅ GPT correction
   - ✅ B-roll footage
   - ✅ Dynamic zoom
   - ✅ Background music
4. Click **"Full Render"**
5. Monitor progress
6. Download final video

## 📁 File Locations

- **Config**: `YoutubeUploader/.env` (API keys)
- **Input**: `YoutubeUploader/data/input_videos/`
- **Output**: `YoutubeUploader/data/output_videos/`
- **Docs**: `YoutubeUploader/docs/`

## 🔧 Common Commands

```bash
# Start dev server
cd web-interface && npm run dev

# Restart server (after config changes)
# Ctrl+C, then:
npm run dev

# Check Python environment
cd .. && source venv/bin/activate && python --version

# Test Python script directly
python src/workflows/youtube_uploader.py --help
```

## 📚 Documentation

- **[Full Render Guide](./docs/FULL_RENDER_GUIDE.md)** - Complete workflow
- **[Setup Complete](./SETUP_COMPLETE.md)** - What we just configured
- **[Main README](./README.md)** - Project overview

## 🐛 Troubleshooting

### "OPENAI_API_KEY not configured"
1. Check `YoutubeUploader/.env` has your key
2. Restart dev server
3. Hard refresh browser

### Controller errors
✅ Fixed - restart server to apply updates

### Python errors
Check terminal logs:
```bash
[Full Render STDOUT] ...
[Full Render STDERR] ...
```

## 💡 Pro Tips

- Start with **short videos** (1-2 min) to test
- Use **Cut Preview** before Full Render
- Monitor **terminal logs** during processing
- Check **API quotas** before batch jobs
- Keep **original videos** as backups

## 🎯 You're Ready!

```bash
cd web-interface
npm run dev
```

Then visit `http://localhost:3000` 🚀

