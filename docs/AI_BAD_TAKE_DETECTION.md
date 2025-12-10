# AI-Powered Bad Take Detection 🤖

## Overview

The **AI Bad Take Detector** uses **GPT-4o** to intelligently analyze video transcripts and identify bad takes with human-level understanding. Unlike rule-based systems, the AI understands context, nuance, and speaker intent.

## Why AI Detection?

### Traditional Rule-Based Limitations:
- ❌ Hardcoded patterns miss edge cases
- ❌ Can't understand context ("wait" might not always indicate correction)
- ❌ Requires manual tuning per content type
- ❌ Struggles with nuanced scenarios

### AI-Powered Advantages:
- ✅ **Context-Aware**: Understands surrounding conversation
- ✅ **Adaptive**: Works across all content types without tuning
- ✅ **Nuanced**: Detects subtle delivery quality differences
- ✅ **Explainable**: Provides reasoning for each decision
- ✅ **Multi-Modal**: Combines text, audio, and timing analysis

## How It Works

### 1. Segment Pair Analysis

For each pair of similar segments, the AI receives:

```
SEGMENT A:
- Text: "So the main point..."
- Timestamp: 10.5s - 12.3s
- Duration: 1.8s

SEGMENT B:
- Text: "So the main point here is that mitochondria are the powerhouse"
- Timestamp: 13.0s - 16.5s
- Duration: 3.5s

Context Window (±5 segments):
  [8.2s] Introduction to cellular biology
  [10.5s] → So the main point...
  [13.0s] So the main point here is that mitochondria are the powerhouse
  [17.0s] This is crucial for energy production
```

### 2. AI Analysis

GPT-4o analyzes:
- **Semantic Similarity**: Do they convey the same idea?
- **Completion Pattern**: Is first incomplete, second complete?
- **Correction Indicators**: Presence of "wait", "actually", etc.
- **Delivery Quality**: Which version is more confident/clear?
- **Audio Features** (if enabled): Pitch, energy, tone quality
- **Temporal Context**: Pause duration between segments

### 3. Intelligent Decision

The AI returns:
```json
{
  "is_bad_take": true,
  "confidence": 0.92,
  "scenario_type": "false_start",
  "which_to_remove": "current",
  "reasoning": "First segment is an incomplete false start. Second segment completes the thought with full context about mitochondria.",
  "detected_patterns": ["incomplete_to_complete", "same_prefix"],
  "text_similarity": 0.75,
  "quality_comparison": "Second segment has better delivery and completeness"
}
```

## Detection Modes

### 🤖 AI-Powered (Recommended)
**How it works:** Every segment pair analyzed by GPT-4o

**Pros:**
- Highest accuracy
- Context-aware decisions
- Works across all content types
- Provides reasoning

**Cons:**
- Slower (API calls)
- Costs per analysis
- Requires OpenAI API key

**Best for:** High-quality productions, varied content, when accuracy matters

---

### ⚡ Hybrid Mode
**How it works:** Rules pre-filter → AI analyzes likely candidates

**Process:**
1. Rule-based system identifies potential bad takes
2. AI validates and confirms each one
3. AI makes final decision on which to remove

**Pros:**
- Faster than pure AI
- More accurate than pure rules
- Reduces API costs (fewer calls)

**Cons:**
- Might miss some subtle cases
- Still requires API key

**Best for:** Batch processing, cost-conscious users, good balance

---

### 📋 Rule-Based (Fast)
**How it works:** Pattern matching and similarity thresholds

**Pros:**
- Very fast (no API calls)
- No costs beyond compute
- Works offline
- Predictable behavior

**Cons:**
- Lower accuracy
- Misses nuanced scenarios
- Requires tuning per content type

**Best for:** Quick edits, offline processing, simple content

## Configuration

### AI Settings

#### Model Selection
```typescript
badTakeAIModel: 'gpt-4o' | 'gpt-4o-mini'
```

- **GPT-4o**: Most accurate, slower, higher cost
- **GPT-4o Mini**: Faster, lower cost, good accuracy

#### Context Window
```typescript
badTakeContextWindow: 3-10 segments
```

How many surrounding segments the AI sees:
- **3-5**: Faster, less context
- **5-7**: Balanced (recommended)
- **7-10**: Maximum context, slower

#### Audio Analysis
```typescript
badTakeUseAudioAnalysis: boolean
```

When enabled, AI receives:
- Pitch variance (confidence indicator)
- Energy levels (volume/loudness)
- Spectral features (tone quality)
- MFCC similarity (audio fingerprint)

#### Custom Instructions
```typescript
badTakeCustomInstructions: string
```

Guide the AI for your specific use case:

**Examples:**
```
"This is medical education content. Be conservative - only remove clear mistakes and stutters."

"Casual vlog style. Remove um/uh and false starts aggressively."

"Technical tutorial. Keep all pauses and 'um' as they're natural. Only remove clear restarts."

"Interview format with multiple speakers. Only remove when same speaker restarts themselves."
```

## Usage Examples

### Example 1: Educational Content

**Settings:**
```javascript
{
  badTakeDetectionMode: 'ai',
  badTakeAIModel: 'gpt-4o',
  badTakeConfidenceThreshold: 0.75,
  badTakeUseAudioAnalysis: true,
  badTakeContextWindow: 7,
  badTakeCustomInstructions: 'Medical education. Be conservative with technical terms.'
}
```

**Input:**
```
[10s] "The myocardial infarction is... wait..."
[12s] "The myocardial infarction, or heart attack, occurs when..."
```

**AI Analysis:**
```json
{
  "is_bad_take": true,
  "confidence": 0.88,
  "scenario_type": "self_correction",
  "which_to_remove": "current",
  "reasoning": "Speaker self-corrects to add definition. Second version includes layman term 'heart attack' for clarity.",
  "detected_patterns": ["self_correction", "incomplete_to_complete"]
}
```

**Result:** Removes first segment, keeps complete explanation

---

### Example 2: Vlog/Casual Content

**Settings:**
```javascript
{
  badTakeDetectionMode: 'ai',
  badTakeAIModel: 'gpt-4o-mini',  // Faster for vlogs
  badTakeConfidenceThreshold: 0.65,  // More aggressive
  badTakeUseAudioAnalysis: true,
  badTakeContextWindow: 5,
  badTakeCustomInstructions: 'Casual vlog. Remove stutters and filler retakes.'
}
```

**Input:**
```
[5s] "Um... so like... today we're gonna..."
[7s] "Today we're going to the beach!"
```

**AI Analysis:**
```json
{
  "is_bad_take": true,
  "confidence": 0.95,
  "scenario_type": "filler_retry",
  "which_to_remove": "current",
  "reasoning": "First segment is hesitant with fillers (um, like). Second is confident and clear.",
  "detected_patterns": ["filler_retry", "hesitant_to_confident"],
  "audio_features": {
    "current_energy": 0.42,
    "next_energy": 0.78,
    "current_pitch_variance": 0.31,
    "next_pitch_variance": 0.18
  }
}
```

**Result:** Removes hesitant first take, keeps confident version

---

### Example 3: Technical Tutorial

**Settings:**
```javascript
{
  badTakeDetectionMode: 'hybrid',  // Balance speed and accuracy
  badTakeAIModel: 'gpt-4o',
  badTakeConfidenceThreshold: 0.80,  // Higher bar
  badTakeUseAudioAnalysis: false,  // Text only for speed
  badTakeContextWindow: 5,
  badTakeCustomInstructions: 'Technical coding tutorial. Keep natural pauses and "um" - only remove actual restarts.'
}
```

**Input:**
```
[20s] "So we'll import... um... numpy"
[30s] "Then we create the array"
```

**AI Analysis:**
```json
{
  "is_bad_take": false,
  "confidence": 0.35,
  "scenario_type": "none",
  "which_to_remove": "neither",
  "reasoning": "Natural pause with 'um' followed by continuation. Not a restart or correction - just normal speech pattern in technical context.",
  "detected_patterns": []
}
```

**Result:** Keeps both segments (natural flow)

## Performance & Costs

### Processing Time

| Mode | Speed | Cost |
|------|-------|------|
| AI-Powered | ~2-5s per pair | $0.01-0.03 per pair |
| Hybrid | ~0.5-2s per pair | $0.005-0.015 per pair |
| Rule-Based | <0.1s per pair | Free |

**Example:** 10-minute video with 200 segments
- AI: ~400 pairs × 3s = 20 min, ~$8
- Hybrid: ~100 pairs (filtered) × 1s = 2 min, ~$1
- Rule-Based: 400 pairs × 0.05s = 20s, $0

### API Costs (Approximate)

**GPT-4o:**
- Input: $2.50 / 1M tokens
- Output: $10 / 1M tokens
- Per analysis: ~500 tokens = $0.01-0.02

**GPT-4o Mini:**
- Input: $0.15 / 1M tokens  
- Output: $0.60 / 1M tokens
- Per analysis: ~500 tokens = $0.0005-0.001

## Advanced: Audio Analysis

When `badTakeUseAudioAnalysis: true`, the system extracts:

### Audio Features

1. **Energy (RMS)**: Loudness/volume
   - Low energy might indicate hesitation
   - High energy suggests confidence

2. **Pitch Variance**: Stability of voice
   - High variance = uncertain/questioning
   - Low variance = confident/declarative

3. **Spectral Centroid**: Tone quality
   - Changes indicate emotional state
   - Consistency suggests rehearsed delivery

4. **MFCC Similarity**: Audio fingerprint
   - Confirms segments are acoustically similar
   - Reduces false positives

### Example with Audio

```json
{
  "is_bad_take": true,
  "confidence": 0.91,
  "audio_features": {
    "current_energy": 0.45,        // Quieter (hesitant)
    "next_energy": 0.82,           // Louder (confident)
    "current_pitch_variance": 0.34, // Unstable (uncertain)
    "next_pitch_variance": 0.19,   // Stable (confident)
    "audio_similarity": 0.88       // Acoustically similar (confirms repetition)
  },
  "reasoning": "Audio analysis confirms: first take has lower energy and unstable pitch (hesitation), second is confident with stable delivery."
}
```

## Integration

### Python Backend

```python
from ai_bad_take_detector import AIBadTakeDetector, AIBadTakeConfig, remove_bad_takes

# Configure
config = AIBadTakeConfig(
    openai_api_key=openai_api_key,
    model_name='gpt-4o',
    use_audio_analysis=True,
    confidence_threshold=0.7,
    context_window=5,
    custom_instructions='Educational medical content'
)

# Detect
detector = AIBadTakeDetector(config)
bad_takes = detector.detect_bad_takes(
    transcript_path=Path('transcript.srt'),
    video_path=Path('video.mp4')
)

# Review
for bt in bad_takes:
    print(f"Bad take: {bt['scenario_type']}")
    print(f"Confidence: {bt['ai_confidence']}")
    print(f"Reasoning: {bt['reasoning']}")
    print(f"Remove: '{bt['text']}'")
    print(f"Keep: '{bt['keep_alternative']['text']}'")
    print()

# Remove
remove_bad_takes(
    video_path=Path('video.mp4'),
    output_path=Path('edited.mp4'),
    bad_takes=bad_takes
)
```

### Web Interface

The UI automatically passes all settings to the backend:

```typescript
// AI Mode
{
  skipBadTakeRemoval: false,
  badTakeDetectionMode: 'ai',
  badTakeAIModel: 'gpt-4o',
  badTakeConfidenceThreshold: 0.7,
  badTakeUseAudioAnalysis: true,
  badTakeContextWindow: 5,
  badTakeCustomInstructions: 'Be conservative...'
}

// Hybrid Mode
{
  skipBadTakeRemoval: false,
  badTakeDetectionMode: 'hybrid',
  badTakeAIModel: 'gpt-4o-mini',
  // ... plus rule-based settings for pre-filtering
}
```

## Best Practices

### 1. Start with AI Mode
- Use default settings first
- Process 1-2 test videos
- Adjust confidence threshold if needed

### 2. Optimize for Your Content

**Educational/Technical:**
```javascript
{
  mode: 'ai',
  model: 'gpt-4o',
  confidence: 0.80,  // Higher bar
  audioAnalysis: true,
  customInstructions: 'Educational content. Be conservative.'
}
```

**Casual/Vlog:**
```javascript
{
  mode: 'ai',
  model: 'gpt-4o-mini',  // Faster
  confidence: 0.65,  // More aggressive
  audioAnalysis: true,
  customInstructions: 'Casual vlog. Remove stutters aggressively.'
}
```

**Interviews/Podcasts:**
```javascript
{
  mode: 'hybrid',  // Balance cost/speed
  confidence: 0.75,
  audioAnalysis: false,  // Faster
  customInstructions: 'Multi-speaker. Only remove when same person restarts.'
}
```

### 3. Use Hybrid for Batch Processing
- Processes faster
- Reduces API costs by 50-80%
- Still gets AI validation on candidates

### 4. Custom Instructions Templates

**Conservative (Medical/Legal):**
```
This is [medical/legal] content. Only remove:
1. Clear stutters (e.g., "The... the treatment")
2. Explicit corrections with "wait", "actually"
3. False starts where speaker clearly restarts
Do NOT remove natural pauses or "um" - they're acceptable.
```

**Aggressive (Marketing/Social):**
```
Marketing video - prioritize smooth delivery:
1. Remove ALL stutters and filler words
2. Remove any hesitation or uncertainty
3. Keep only the most confident, clear takes
4. Prefer shorter, punchier versions
```

**Balanced (Tutorial/Education):**
```
Educational tutorial. Remove:
1. Stutters and repeated phrases
2. Self-corrections where speaker says "wait", "actually"
3. False starts that don't complete the thought
Keep natural pauses and occasional "um" - they aid comprehension.
```

## Troubleshooting

### Issue: Too many segments removed

**Solutions:**
1. Increase `badTakeConfidenceThreshold` to 0.80-0.90
2. Add custom instruction: "Be very conservative - only remove obvious retakes"
3. Disable audio analysis (rely on text only)

### Issue: Missing obvious bad takes

**Solutions:**
1. Decrease `badTakeConfidenceThreshold` to 0.60-0.65
2. Enable audio analysis for multi-modal confirmation
3. Increase context window to 7-10 segments

### Issue: Too expensive

**Solutions:**
1. Switch to Hybrid mode
2. Use GPT-4o Mini instead of GPT-4o
3. Use Rule-Based mode for rough cuts, then AI for final pass

### Issue: Processing too slow

**Solutions:**
1. Switch to Hybrid or Rule-Based mode
2. Disable audio analysis
3. Reduce context window to 3-5 segments
4. Use GPT-4o Mini

## Future Enhancements

- 🔮 **Vision Analysis**: Analyze facial expressions and body language
- 🎯 **Learning Mode**: AI learns from your edits and preferences
- 🌐 **Multi-Language**: Support for non-English content
- 📊 **Batch Optimization**: Analyze entire transcript at once
- 💾 **Caching**: Remember analysis for similar segments
- 🎭 **Speaker Diarization**: Track which speaker made which take
