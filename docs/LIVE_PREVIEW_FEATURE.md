# 🎬 Live Preview Feature - Real-Time Video Processing Preview

## Overview

The **Live Preview** feature provides a **WYSIWYG (What You See Is What You Get)** experience for video processing. As users adjust settings, the preview automatically re-processes and shows exactly what the final output will look like.

## 🎯 Key Features

### 1. **Auto-Start on Load**
- Automatically processes the first video when page loads
- Shows preview with current/default settings
- No manual trigger needed

### 2. **Real-Time Updates**
- Detects setting changes automatically
- Debounced updates (1 second after last change)
- Only re-processes affected steps

### 3. **Live Progress Tracking**
- Real-time progress bar
- Current step indicator
- Streaming updates via Server-Sent Events (SSE)

### 4. **Smart Processing**
- Cancels previous processing on new changes
- Optimized for preview (lighter processing)
- Incremental updates when possible

## 🏗️ Architecture

### Frontend Components

#### 1. `useLivePreview` Hook
```typescript
const {
  isProcessing,      // Currently processing?
  previewUrl,        // URL to preview video
  currentStep,       // Current processing step
  progress,          // 0-100 progress
  error,             // Error message if failed
  startPreview,      // Manual trigger
  cancelPreview,     // Cancel processing
} = useLivePreview(videoPath, options, autoStart);
```

**Features:**
- ✅ Automatic processing on option changes
- ✅ Debounced updates (1s delay)
- ✅ SSE connection for real-time progress
- ✅ Automatic cleanup on unmount
- ✅ Cancel previous processing on new request

#### 2. `LivePreviewPlayer` Component
```tsx
<LivePreviewPlayer
  videoPath="/path/to/video.mp4"
  options={processingOptions}
  autoStart={true}
/>
```

**Features:**
- ✅ Video player with controls
- ✅ Processing overlay with progress
- ✅ Error handling with retry
- ✅ "Live Preview" badge
- ✅ "Updating preview..." notification

### Backend API

#### 1. Preview Processing Endpoint
```
POST /api/preview
```

**Request:**
```json
{
  "videoPath": "/path/to/video.mp4",
  "options": {
    "skipSilence": false,
    "badTakeDetectionMode": "ai",
    // ... all processing options
  },
  "previewMode": true
}
```

**Response:**
```json
{
  "processingId": "uuid-here",
  "message": "Preview processing started"
}
```

#### 2. Progress Streaming Endpoint
```
GET /api/preview/progress/{processingId}
```

**SSE Stream:**
```
data: {"type": "connected", "processingId": "uuid"}

data: {"type": "progress", "step": "Transcription", "progress": 25}

data: {"type": "progress", "step": "Bad Take Removal", "progress": 50}

data: {"type": "complete", "previewUrl": "/api/preview/video/uuid"}
```

#### 3. Video Serving Endpoint
```
GET /api/preview/video/{processingId}
```

**Response:**
- Streams MP4 video with range support
- Enables video seeking/scrubbing

## 🔄 Processing Flow

### Initial Load
```
1. Page loads with first video selected
   ↓
2. useLivePreview detects videoPath
   ↓
3. Automatically starts preview processing
   ↓
4. Shows progress overlay
   ↓
5. Video loads when complete
```

### Setting Change
```
1. User changes a setting (e.g., AI model)
   ↓
2. Hook detects option change
   ↓
3. Waits 1 second (debounce)
   ↓
4. Cancels previous processing
   ↓
5. Starts new preview with updated settings
   ↓
6. Shows "Updating preview..." badge
   ↓
7. Updates video when complete
```

### Visual Flow
```
┌──────────────────────────────────────────┐
│  User Interface                          │
│  ┌────────────────────────────────────┐ │
│  │  Live Preview Player                │ │
│  │  ┌──────────────────────────────┐  │ │
│  │  │  [Video Player]              │  │ │
│  │  │  🔴 Live Preview             │  │ │
│  │  │                              │  │ │
│  │  │  Processing: Bad Take AI...  │  │ │
│  │  │  ▬▬▬▬▬●▬▬▬▬▬ 65%            │  │ │
│  │  └──────────────────────────────┘  │ │
│  └────────────────────────────────────┘ │
│                                          │
│  Processing Settings                     │
│  ┌────────────────────────────────────┐ │
│  │ AI Mode: [GPT-4o ▼] ← User changes │ │
│  │ Context: [5 ▼]                     │ │
│  │ ☑ Audio Analysis                   │ │
│  └────────────────────────────────────┘ │
└──────────────────────────────────────────┘
                   │
                   ▼ (onChange detected)
┌──────────────────────────────────────────┐
│  useLivePreview Hook                     │
│  ┌────────────────────────────────────┐ │
│  │ 1. Detect option change            │ │
│  │ 2. Clear debounce timer            │ │
│  │ 3. Wait 1 second                   │ │
│  │ 4. Cancel previous processing      │ │
│  │ 5. Start new preview request       │ │
│  └────────────────────────────────────┘ │
└──────────────────────────────────────────┘
                   │
                   ▼ (POST /api/preview)
┌──────────────────────────────────────────┐
│  Backend API                             │
│  ┌────────────────────────────────────┐ │
│  │ 1. Receive preview request         │ │
│  │ 2. Generate processing ID          │ │
│  │ 3. Spawn Python process            │ │
│  │ 4. Store process reference         │ │
│  │ 5. Return processing ID            │ │
│  └────────────────────────────────────┘ │
└──────────────────────────────────────────┘
                   │
                   ▼ (SSE connection)
┌──────────────────────────────────────────┐
│  Progress Streaming                      │
│  ┌────────────────────────────────────┐ │
│  │ EventSource listens to:            │ │
│  │ /api/preview/progress/{id}         │ │
│  │                                     │ │
│  │ Receives updates:                  │ │
│  │ • "Transcription" - 25%            │ │
│  │ • "Bad Take Removal" - 50%         │ │
│  │ • "Complete" - video URL           │ │
│  └────────────────────────────────────┘ │
└──────────────────────────────────────────┘
                   │
                   ▼ (Complete)
┌──────────────────────────────────────────┐
│  Video Update                            │
│  ┌────────────────────────────────────┐ │
│  │ 1. Receive preview URL             │ │
│  │ 2. Update video.src                │ │
│  │ 3. Load and play                   │ │
│  │ 4. Hide progress overlay           │ │
│  └────────────────────────────────────┘ │
└──────────────────────────────────────────┘
```

## 💡 Smart Features

### 1. **Debouncing**
```typescript
// Wait 1 second after last change before processing
debounceTimerRef.current = setTimeout(() => {
  startPreview();
}, 1000);
```

**Why:** Prevents excessive processing when user rapidly changes multiple settings

### 2. **Automatic Cancellation**
```typescript
// Cancel previous processing
if (abortControllerRef.current) {
  abortControllerRef.current.abort();
}
```

**Why:** Saves resources, prevents outdated previews

### 3. **Option Diffing**
```typescript
const currentOptions = JSON.stringify(options);
if (previousOptionsRef.current !== currentOptions) {
  updatePreview();
}
```

**Why:** Only re-processes when settings actually change

### 4. **Preview Mode Flag**
```python
# Python receives --preview-mode flag
if preview_mode:
    # Use faster settings
    # Skip non-visual steps
    # Use lower quality for speed
```

**Why:** Faster preview generation

## 🎨 UI States

### 1. **Initial/Loading State**
```tsx
<div className="processing-overlay">
  <Loader2 className="animate-spin" />
  <p>Starting preview...</p>
  <ProgressBar progress={0} />
</div>
```

### 2. **Processing State**
```tsx
<div className="processing-overlay">
  <Loader2 className="animate-spin" />
  <p>{currentStep}</p>
  <ProgressBar progress={progress} />
  <p>{progress}%</p>
  <button onClick={cancelPreview}>Cancel</button>
</div>
```

### 3. **Ready State**
```tsx
<video src={previewUrl} controls />
<div className="badge">🔴 Live Preview</div>
```

### 4. **Updating State**
```tsx
<video src={previewUrl} controls />
<div className="badge">🔴 Live Preview</div>
<div className="update-notice">Updating preview...</div>
```

### 5. **Error State**
```tsx
<div className="error-overlay">
  <AlertCircle />
  <p>Preview Error</p>
  <p>{error}</p>
  <button onClick={startPreview}>Retry</button>
</div>
```

## 🚀 Integration Steps

### 1. Update Main Processing Page

```tsx
// In your main page component
import { LivePreviewPlayer } from '@/components/LivePreviewPlayer';

export default function ProcessingPage() {
  const [selectedVideo, setSelectedVideo] = useState<string | null>(null);
  const [options, setOptions] = useState<ProcessingOptions>(DEFAULT_OPTIONS);

  return (
    <div>
      {/* Step 1: Video Preview (Now with Live Preview) */}
      <section>
        <h2>Video Preview</h2>
        <LivePreviewPlayer
          videoPath={selectedVideo}
          options={options}
          autoStart={true}
        />
      </section>

      {/* Step 2: Configure Processing */}
      <section>
        <ProcessingStepsConfig
          options={options}
          onOptionChange={(key, value) => {
            setOptions(prev => ({ ...prev, [key]: value }));
            // Hook automatically detects change and updates preview!
          }}
        />
      </section>
    </div>
  );
}
```

### 2. Python Backend Changes

Add preview mode support to `video_processing.py`:

```python
def process_video(
    # ... existing params ...
    preview_mode: bool = False,
    processing_id: Optional[str] = None,
):
    if preview_mode:
        # Use faster settings for preview
        whisper_model = 'base'  # Faster model
        gpt_model = 'gpt-4o-mini'  # Cheaper/faster
        # Skip heavy processing if not visible
        if skip_subtitles:
            skip_ai_highlights = True
            skip_broll = True
    
    # Send progress updates
    if processing_id:
        print(f"PROGRESS:0:Starting preview")
        # ... processing ...
        print(f"PROGRESS:50:Bad Take Removal")
        # ... more processing ...
        print(f"PROGRESS:100:Complete")
```

### 3. Add CLI Arguments

```python
parser.add_argument('--preview-mode', type=bool, default=False)
parser.add_argument('--processing-id', type=str, default=None)
```

## 📊 Performance Optimizations

### 1. **Preview-Specific Settings**
```python
if preview_mode:
    # Lower quality for speed
    video_quality = 'medium'
    audio_quality = 128  # Lower bitrate
    
    # Skip non-visual steps
    skip_thumbnail = True
    skip_metadata = True
    
    # Use faster models
    whisper_model = 'base'
    gpt_model = 'gpt-4o-mini'
```

### 2. **Incremental Processing**
```python
# Only re-process changed steps
if previous_preview and only_ai_settings_changed:
    # Reuse previous silence cut
    # Reuse previous transcription
    # Only re-run bad take removal
```

### 3. **Caching**
```python
# Cache intermediate results
cache_key = f"{video_hash}_{settings_hash}"
if cache_key in preview_cache:
    return cached_preview
```

### 4. **Lower Resolution**
```python
if preview_mode:
    # Process at 720p instead of 1080p
    scale_factor = 0.75
```

## 🔧 Configuration

### Hook Options
```typescript
useLivePreview(
  videoPath,        // Required: path to video
  options,          // Required: processing options
  autoStart = true  // Optional: auto-start on mount
)
```

### Debounce Timing
```typescript
// Adjust in useLivePreview.ts
const DEBOUNCE_DELAY = 1000; // ms
```

### Preview Quality
```python
# Adjust in video_processing.py
PREVIEW_QUALITY = {
    'resolution': '720p',
    'bitrate': '2M',
    'audio': '128k',
}
```

## 🐛 Error Handling

### Network Errors
```typescript
eventSource.onerror = () => {
  setState(prev => ({
    ...prev,
    isProcessing: false,
    error: 'Connection lost. Click retry.',
  }));
};
```

### Processing Errors
```python
try:
    process_video(...)
except Exception as e:
    print(f"ERROR:{str(e)}")
    sys.exit(1)
```

### Timeout Handling
```typescript
const TIMEOUT = 5 * 60 * 1000; // 5 minutes
setTimeout(() => {
  if (isProcessing) {
    cancelPreview();
    setState({ error: 'Preview timed out' });
  }
}, TIMEOUT);
```

## ✅ Testing Checklist

- [ ] Preview starts automatically on page load
- [ ] Changing settings triggers preview update
- [ ] Debouncing works (1s delay)
- [ ] Progress updates in real-time
- [ ] Video loads when complete
- [ ] Cancel button works
- [ ] Retry button works on error
- [ ] Multiple rapid changes handled correctly
- [ ] Previous processing cancelled properly
- [ ] SSE connection closes on unmount
- [ ] Video seeking/scrubbing works
- [ ] Mobile responsive
- [ ] Works with all processing options

## 🎉 Benefits

1. **Instant Feedback** - See results before committing
2. **Setting Validation** - Verify settings work correctly
3. **Quality Assurance** - Catch issues early
4. **User Confidence** - Know exactly what you'll get
5. **Time Savings** - No need for trial-and-error
6. **Learning Tool** - Understand what each setting does

## 🚀 Future Enhancements

1. **Side-by-Side Comparison** - Before/after view
2. **Preview Segments** - Preview only selected parts
3. **A/B Testing** - Compare different settings
4. **Preview History** - See previous previews
5. **Preset Testing** - Quick preview of presets
6. **Quality Toggle** - Fast preview vs. full quality
