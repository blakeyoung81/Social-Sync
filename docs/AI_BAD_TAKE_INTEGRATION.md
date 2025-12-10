# AI Bad Take Detection - Integration Guide

## 🎯 What Was Built

An **AI-powered bad take detection system** that uses GPT-4o to intelligently analyze and remove bad takes from videos.

### Key Features:
- ✅ **3 Detection Modes**: AI, Hybrid, Rule-Based
- ✅ **GPT-4o Integration**: Context-aware scenario analysis
- ✅ **Audio Analysis**: Pitch, energy, tone quality
- ✅ **Custom Instructions**: Tailor AI behavior per content type
- ✅ **Explainable**: AI provides reasoning for each decision
- ✅ **Multi-Modal**: Combines text, audio, and timing

## 📁 Files Created/Modified

### ✅ New Files (4)

1. **`src/core/ai_bad_take_detector.py`** - AI detection engine
   - `AIBadTakeDetector` class
   - GPT-4o integration
   - Audio feature extraction
   - Segment analysis logic

2. **`src/core/bad_take_scenarios.py`** - Rule-based fallback
   - Pattern matching for 8 scenarios
   - Used in Hybrid mode as pre-filter

3. **`docs/AI_BAD_TAKE_DETECTION.md`** - Complete AI guide
   - How AI detection works
   - Configuration options
   - Usage examples
   - Best practices

4. **`docs/AI_BAD_TAKE_INTEGRATION.md`** - This file
   - Integration instructions
   - Quick start guide

### ✅ Modified Files (3)

1. **`web-interface/src/types/index.ts`**
   - Added AI settings types
   - `badTakeDetectionMode`, `badTakeAIModel`, etc.

2. **`web-interface/src/constants/processing.ts`**
   - Default to AI mode
   - AI-first configuration

3. **`web-interface/src/components/forms/ProcessingStepsConfig.tsx`**
   - Beautiful AI-first UI
   - Mode selector with conditional panels
   - Custom instructions textarea

## 🚀 Integration Steps

### Step 1: Update `video_processing.py`

Replace the bad take removal section:

```python
# In src/core/video_processing.py

# Add import at top
from core.ai_bad_take_detector import AIBadTakeDetector, AIBadTakeConfig, remove_bad_takes as ai_remove_bad_takes

# Update function signature (add new params)
def process_video(
    # ... existing params ...
    
    # AI Bad Take Detection
    bad_take_detection_mode: str = 'ai',
    bad_take_ai_model: str = 'gpt-4o',
    bad_take_use_audio_analysis: bool = True,
    bad_take_context_window: int = 5,
    bad_take_custom_instructions: Optional[str] = None,
    
    # ... other params ...
):
    # ... existing code ...
    
    # Step 3.5: Bad Take Removal (UPDATED)
    if not skip_bad_take_removal and transcript_path.exists():
        send_step_progress("Bad Take Removal", get_step(), total_steps, "Analyzing transcript with AI...")
        
        if bad_take_detection_mode == 'ai' or bad_take_detection_mode == 'hybrid':
            # AI-Powered Detection
            config = AIBadTakeConfig(
                openai_api_key=openai_api_key,
                model_name=bad_take_ai_model,
                use_audio_analysis=bad_take_use_audio_analysis,
                confidence_threshold=bad_take_confidence_threshold,
                context_window=bad_take_context_window,
                custom_instructions=bad_take_custom_instructions
            )
            
            detector = AIBadTakeDetector(config)
            
            if bad_take_detection_mode == 'hybrid':
                # Pre-filter with rules, then AI validates
                from core.bad_take_scenarios import BadTakeScenarioDetector, BadTakeScenarioConfig
                
                rule_config = BadTakeScenarioConfig(
                    detect_stutters=bad_take_detect_stutters,
                    detect_false_starts=bad_take_detect_false_starts,
                    # ... map all rule settings ...
                )
                rule_detector = BadTakeScenarioDetector(rule_config)
                
                # First pass: rule-based pre-filter
                logger.info("🔍 Pre-filtering with rule-based detection...")
                # ... rule detection logic ...
                
                # Second pass: AI validates candidates
                logger.info("🤖 AI validating candidates...")
                bad_takes = []
                # ... AI validation on filtered candidates ...
            else:
                # Pure AI mode
                bad_takes = detector.detect_bad_takes(
                    transcript_path=transcript_path,
                    video_path=current_video_path
                )
        
        else:
            # Rule-Based Mode (fallback)
            from core.bad_take_scenarios import BadTakeScenarioDetector, BadTakeScenarioConfig
            
            config = BadTakeScenarioConfig(
                detect_stutters=bad_take_detect_stutters,
                detect_false_starts=bad_take_detect_false_starts,
                # ... map all rule settings ...
            )
            
            detector = BadTakeScenarioDetector(config)
            # ... rule-based detection logic ...
        
        # Remove bad takes (same for all modes)
        if bad_takes:
            bad_take_removed_path = TEMP_PROCESSING_DIR / f"bad_takes_removed_{current_video_path.stem}.mp4"
            
            if ai_remove_bad_takes(current_video_path, bad_take_removed_path, bad_takes):
                current_video_path = bad_take_removed_path
                logger.info(f"✅ Removed {len(bad_takes)} bad takes")
                
                # Re-transcribe for accurate timestamps
                logger.info("Re-transcribing after bad take removal...")
                if transcribe_video_whisper(current_video_path, transcript_path, model_name=whisper_model):
                    logger.info("✅ Re-transcription completed")
            else:
                logger.warning("Bad take removal failed")
        else:
            logger.info("No bad takes detected")
```

### Step 2: Update API Route (`process.ts`)

Map UI settings to Python parameters:

```typescript
// In web-interface/src/app/api/process/route.ts

const pythonArgs = [
  // ... existing args ...
  
  // AI Bad Take Detection
  '--bad-take-detection-mode', options.badTakeDetectionMode || 'ai',
  '--bad-take-ai-model', options.badTakeAIModel || 'gpt-4o',
  '--bad-take-confidence-threshold', String(options.badTakeConfidenceThreshold || 0.7),
  '--bad-take-use-audio-analysis', String(options.badTakeUseAudioAnalysis !== false),
  '--bad-take-context-window', String(options.badTakeContextWindow || 5),
  ...(options.badTakeCustomInstructions ? [
    '--bad-take-custom-instructions', options.badTakeCustomInstructions
  ] : []),
  
  // Rule-based settings (for hybrid/rule-based mode)
  ...(options.badTakeDetectionMode !== 'ai' ? [
    '--bad-take-detect-stutters', String(options.badTakeDetectStutters !== false),
    '--bad-take-detect-false-starts', String(options.badTakeDetectFalseStarts !== false),
    // ... map all rule settings ...
  ] : []),
  
  // ... other args ...
];
```

### Step 3: Update CLI Argument Parser

Add new command-line arguments:

```python
# In src/core/video_processing.py (or wherever argparse is used)

parser.add_argument('--bad-take-detection-mode', 
                   choices=['ai', 'hybrid', 'rule-based'], 
                   default='ai',
                   help='Bad take detection mode')

parser.add_argument('--bad-take-ai-model',
                   choices=['gpt-4o', 'gpt-4o-mini'],
                   default='gpt-4o',
                   help='AI model for bad take detection')

parser.add_argument('--bad-take-use-audio-analysis',
                   type=bool,
                   default=True,
                   help='Include audio analysis in AI detection')

parser.add_argument('--bad-take-context-window',
                   type=int,
                   default=5,
                   help='Number of segments for AI context')

parser.add_argument('--bad-take-custom-instructions',
                   type=str,
                   default='',
                   help='Custom instructions for AI')

# ... add rule-based params for hybrid mode ...
```

## 🧪 Testing

### Test 1: AI Mode (Basic)

```python
from pathlib import Path
from core.ai_bad_take_detector import AIBadTakeDetector, AIBadTakeConfig, remove_bad_takes

config = AIBadTakeConfig(
    openai_api_key='your-key',
    model_name='gpt-4o',
    confidence_threshold=0.7
)

detector = AIBadTakeDetector(config)
bad_takes = detector.detect_bad_takes(
    transcript_path=Path('test_transcript.srt'),
    video_path=Path('test_video.mp4')
)

print(f"Found {len(bad_takes)} bad takes:")
for bt in bad_takes:
    print(f"\n{bt['scenario_type']} (confidence: {bt['ai_confidence']:.2f})")
    print(f"Reasoning: {bt['reasoning']}")
    print(f"Remove: '{bt['text']}'")
    print(f"Keep: '{bt['keep_alternative']['text']}'")
```

### Test 2: Hybrid Mode

```python
# Same as above but with:
# 1. Pre-filter with rule-based
# 2. AI validates candidates
# 3. Faster and cheaper
```

### Test 3: Custom Instructions

```python
config = AIBadTakeConfig(
    openai_api_key='your-key',
    model_name='gpt-4o',
    custom_instructions='Medical education. Be conservative - only remove obvious errors.'
)

# AI will follow these instructions in its analysis
```

## 📊 Expected Results

### Before AI Detection:
```
[0:00] "Hi... um..."
[0:02] "Hi everyone, welcome back"
[0:05] "So today we'll cover... wait..."
[0:08] "So today we'll cover cellular respiration"
```

### After AI Detection:
```
[0:00] "Hi everyone, welcome back"
[0:03] "So today we'll cover cellular respiration"
```

**AI Reasoning:**
- Removed `[0:00]`: Stutter detected (incomplete → complete)
- Removed `[0:05]`: Self-correction with "wait" keyword

## 🎨 UI Flow

### User Experience:

1. **Open Bad Take Removal settings**
   
2. **See AI mode selected by default** ✨
   - Purple gradient header "🤖 AI-Powered"
   - Mode dropdown: AI / Hybrid / Rule-Based

3. **Configure AI settings** (if AI/Hybrid selected)
   - Model: GPT-4o or GPT-4o-mini
   - Context window: 3-10 segments
   - Audio analysis: ON/OFF
   - Custom instructions: Text area

4. **Adjust confidence threshold**
   - Slider 50%-100%
   - Live warnings for extremes

5. **Advanced rule settings** (only if Rule-Based/Hybrid)
   - Collapsible section
   - All 8 scenario toggles
   - Fine-tuning sliders

6. **Process video**
   - AI analyzes each segment pair
   - Shows reasoning in logs
   - Removes detected bad takes

## 💰 Cost Estimation

For a 10-minute video (~200 transcript segments):

### AI Mode:
- ~400 segment pairs
- ~500 tokens per analysis
- GPT-4o: ~$8
- GPT-4o-mini: ~$0.40

### Hybrid Mode:
- Rules pre-filter to ~100 candidates
- ~500 tokens per analysis
- GPT-4o: ~$2
- GPT-4o-mini: ~$0.10

### Rule-Based:
- No API costs
- Free (compute only)

## 🔧 Environment Setup

### Required Packages

Already in `requirements.txt`:
```
openai>=1.0.0
librosa>=0.10.0
sentence-transformers>=2.0.0
opencv-python>=4.8.0
```

### Environment Variable

```bash
export OPENAI_API_KEY="sk-..."
```

Or in code:
```python
config = AIBadTakeConfig(
    openai_api_key=os.getenv('OPENAI_API_KEY'),
    # ...
)
```

## 🐛 Troubleshooting

### Issue: OpenAI API Error

**Check:**
1. API key is valid
2. You have credits/billing enabled
3. Network connection works

**Fallback:**
```python
# System automatically falls back to rule-based if AI fails
# Check logs for: "⚠️ OpenAI not available, falling back to basic detection"
```

### Issue: Audio extraction fails

**Solution:**
```python
# Disable audio analysis
config = AIBadTakeConfig(
    use_audio_analysis=False,  # Text-only mode
    # ...
)
```

### Issue: Too slow

**Solutions:**
1. Use Hybrid mode (pre-filter first)
2. Use GPT-4o-mini instead of GPT-4o
3. Reduce context window to 3
4. Disable audio analysis

## 📚 Documentation Files

1. **`AI_BAD_TAKE_DETECTION.md`** - Complete AI guide
   - How it works
   - Configuration
   - Examples
   - Best practices

2. **`BAD_TAKE_SCENARIOS.md`** - Rule-based scenarios
   - 8 scenario types
   - Detection logic
   - Settings reference

3. **`AI_BAD_TAKE_INTEGRATION.md`** - This file
   - Integration steps
   - Code examples
   - Testing guide

4. **`BAD_TAKE_UI_GUIDE.md`** - UI reference
   - Interface overview
   - Workflow examples
   - Visual guide

## ✅ Checklist

Integration complete when:

- [ ] `ai_bad_take_detector.py` imported in `video_processing.py`
- [ ] New CLI arguments added to argument parser
- [ ] API route maps UI settings to Python params
- [ ] Default mode is `'ai'` in `constants/processing.ts`
- [ ] UI shows AI mode first with proper conditionals
- [ ] OpenAI API key configured
- [ ] Test video processed successfully
- [ ] Logs show AI reasoning for decisions
- [ ] Bad takes removed and re-transcribed

## 🚀 Next Steps

1. **Test with real videos**
   - Try different content types
   - Tune confidence threshold
   - Add custom instructions

2. **Optimize for cost**
   - Use Hybrid mode for batch processing
   - Try GPT-4o-mini for casual content

3. **Gather feedback**
   - Track false positives/negatives
   - Refine custom instructions
   - Adjust defaults

4. **Future enhancements**
   - Vision analysis (facial expressions)
   - Learning mode (AI learns from edits)
   - Multi-language support
   - Batch optimization
