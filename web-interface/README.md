# SocialSync Pro - Web Interface

Modern Next.js web application for AI-powered video processing and multi-platform content management.

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm
- Python 3.9+ with venv
- API keys configured in root `.env`

### Installation

```bash
# From YoutubeUploader directory
cd web-interface
npm install
npm run dev
```

Visit `http://localhost:3000`

## 📁 Project Structure

```
web-interface/
├── src/
│   ├── app/                    # Next.js 15 App Router
│   │   ├── api/               # API routes (server-side)
│   │   │   ├── preview-full-render/  # Full render streaming
│   │   │   ├── detect-highlights/    # AI highlights
│   │   │   ├── gpt-correct-transcript/ # GPT cleanup
│   │   │   └── ...
│   │   ├── page.tsx           # Main video editor
│   │   ├── analysis/          # Analytics dashboard
│   │   ├── editor/            # Advanced editor
│   │   └── music/             # Music library
│   ├── components/            # React components
│   │   ├── features/         # Feature-specific components
│   │   └── ui/               # Reusable UI components
│   ├── hooks/                # Custom React hooks
│   ├── utils/                # Utility functions
│   ├── types/                # TypeScript definitions
│   └── constants/            # App constants
├── public/                   # Static assets
├── next.config.ts           # Next.js config + env loader
└── package.json             # Dependencies

```

## ⚙️ Configuration

### Environment Variables (Single Source of Truth)

**All environment variables are configured in the root `.env` file** at `YoutubeUploader/.env`.

The web interface automatically loads these via `next.config.ts`:

```typescript
// next.config.ts loads from ../env
dotenv.config({ path: path.resolve(__dirname, "..", ".env") });
```

**Do NOT create** a `.env.local` file in `web-interface/`. Everything is managed from the root `.env`.

### Required Variables

In `YoutubeUploader/.env`:

```bash
# OpenAI API (Required for AI features)
OPENAI_API_KEY=sk-proj-...

# Pexels API (Required for B-roll)
PEXELS_API_KEY=...

# Optional
PIXABAY_API_KEY=...
FACEBOOK_APP_ID=...
FACEBOOK_APP_SECRET=...
INSTAGRAM_APP_ID=...
INSTAGRAM_APP_SECRET=...
```

## 🎬 Features

### Video Processing
- **AI Audio Analysis**: Whisper-powered transcription
- **Smart Silence Detection**: Semantic boundary detection
- **Cut Preview**: Quick preview of cut segments
- **Full Render**: Complete processing pipeline with all enhancements

### AI-Powered Tools
- **GPT Transcript Correction**: Fix transcription errors
- **Highlight Detection**: Auto-detect key moments
- **Chapter Generation**: AI-generated timestamps
- **Bad Take Removal**: Remove stutters and hesitations

### Visual Enhancements
- **Dynamic Zoom**: Ken Burns effects on static shots
- **B-roll Integration**: Auto-fetch stock footage from Pexels/Pixabay
- **Subtitle Burn-in**: Animated subtitle overlays
- **Image Generation**: AI-generated visuals (DALL-E 3)

### Audio Enhancements
- **Background Music**: Royalty-free music tracks
- **Sound Effects**: Emphasis sounds and transitions
- **Audio Normalization**: Consistent volume levels

### Multi-Platform Publishing
- **YouTube**: Direct upload with metadata
- **Facebook/Instagram**: Social media integration
- **Analytics**: Track performance across platforms

## 🎨 Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript 5
- **Styling**: Tailwind CSS 4
- **UI Components**: Radix UI primitives
- **Animations**: Framer Motion
- **State**: Zustand + React Context
- **HTTP**: Fetch API + Server-Sent Events (SSE)
- **Backend**: Python 3.9+ (via child_process)

## 📡 API Routes

### Video Processing

#### `/api/preview-full-render` (POST)
Streams full render progress via Server-Sent Events.

**Request:**
```json
{
  "videoPath": "/path/to/video.mp4",
  "options": {
    "skipAudio": false,
    "skipSilence": false,
    "skipTranscription": false,
    "skipGpt": false,
    "skipSubtitles": false,
    "skipBroll": false,
    "skipDynamicZoom": false,
    "skipBackgroundMusic": false,
    "skipSoundEffects": false,
    "skipImageGeneration": false,
    "skipBadTakeRemoval": false,
    "silenceThreshold": -40,
    "silenceDuration": 0.5,
    "whisperModel": "medium",
    "gptModel": "gpt-3.5-turbo"
  },
  "timestamp": 1234567890
}
```

**Response (SSE):**
```
data: {"type":"progress","progress":0,"message":"Starting..."}

data: {"type":"progress","progress":50,"message":"Processing..."}

data: {"type":"complete","progress":100,"videoPath":"/path/to/output.mp4"}
```

#### `/api/analyze-audio` (POST)
Analyzes video audio and detects silence segments.

**Request:**
```json
{
  "videoPath": "/path/to/video.mp4",
  "silenceThreshold": -40,
  "minSilenceDuration": 0.5
}
```

**Response:**
```json
{
  "success": true,
  "silenceSegments": [
    {"start": 1.2, "end": 1.8},
    {"start": 5.4, "end": 6.1}
  ],
  "totalDuration": 120.5,
  "transcription": "Full transcript...",
  "segments": [...]
}
```

### AI Features

#### `/api/detect-highlights` (POST)
AI-powered highlight detection.

#### `/api/gpt-correct-transcript` (POST)
GPT-powered transcript correction.

#### `/api/generate-chapters` (POST)
AI-generated chapter markers.

### YouTube Integration

#### `/api/youtube-channels/scan` (GET)
Scan for YouTube channels (requires auth).

#### `/api/youtube-playlists` (GET)
List playlists for authenticated channel.

## 🔧 Development

### Run Development Server

```bash
npm run dev
```

### Build for Production

```bash
npm run build
npm run start
```

### Linting

```bash
npm run lint
```

### Type Checking

```bash
npx tsc --noEmit
```

## 🐛 Troubleshooting

### "OPENAI_API_KEY not configured"

Ensure `YoutubeUploader/.env` contains:
```bash
OPENAI_API_KEY=sk-proj-...
```

Then restart dev server:
```bash
npm run dev
```

### Controller Already Closed Errors

**Fixed in latest version.** The streaming API now properly handles closed connections.

### Python Process Fails

Check logs in terminal:
```
[Full Render STDOUT] ...
[Full Render STDERR] ...
```

Verify Python environment:
```bash
cd ..  # Go to YoutubeUploader
source venv/bin/activate
python --version  # Should be 3.9+
```

### Port 3000 Already in Use

```bash
# Kill existing process
lsof -ti:3000 | xargs kill -9

# Or use different port
PORT=3001 npm run dev
```

## 📚 Documentation

- **[Full Render Guide](../docs/FULL_RENDER_GUIDE.md)**: Complete workflow documentation
- **[Setup Guide](./SETUP.md)**: Initial configuration
- **[Architecture](./ARCHITECTURE.md)**: System design details
- **[Main README](../README.md)**: Project overview

## 🎯 Key Components

### VideoPreview (`src/components/features/VideoPreview.tsx`)
Main video editor component with:
- Video player
- Audio waveform visualization
- Silence cut markers
- Processing controls
- Progress tracking

### ProcessingContext (`src/context/ProcessingContext.tsx`)
Global state for processing options and settings.

### Timeline Editor (`src/components/features/TimelineEditor.tsx`)
Advanced timeline with multi-track editing.

## 🚢 Deployment

### Vercel (Recommended)

```bash
vercel
```

### Docker

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

### Manual

```bash
npm run build
npm run start
```

## 📝 License

See main project LICENSE file.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## 💡 Tips

- Use **Cut Preview** before Full Render to verify settings
- Monitor terminal logs for Python process output
- Keep original videos as backups
- Test with short clips first (~1 min)
- Check API quotas before batch processing

## 🔗 Links

- [Next.js Documentation](https://nextjs.org/docs)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [Radix UI](https://www.radix-ui.com/)
- [Framer Motion](https://www.framer.com/motion/)
