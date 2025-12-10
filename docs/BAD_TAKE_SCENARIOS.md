# Bad Take Removal - Comprehensive Scenario Guide

## Overview

The Bad Take Removal system can detect and handle 8 different types of bad takes commonly found in video recordings. Each scenario has customizable settings for fine-tuned control.

## Supported Scenarios

### 1. **Stutter Detection** 
**Example:** `"Hi..." → "Hi everyone, welcome back"`

**What it detects:**
- Incomplete words or short phrases that are immediately repeated with more context
- Typically 1-3 words that form the beginning of a longer sentence

**Settings:**
- `detect_stutters` (bool): Enable/disable stutter detection
- `stutter_word_limit` (int): Maximum words in first take to consider as stutter (default: 3)
- `stutter_prefix_match` (float): How closely second must match first (default: 0.9)

**Behavior:** Always removes the shorter first part, keeps the complete version

---

### 2. **False Start Detection**
**Example:** `"So the main point..." → "So the main point here is that mitochondria..."`

**What it detects:**
- Sentences that start the same way but the first is abandoned mid-sentence
- The second version continues and completes the thought

**Settings:**
- `detect_false_starts` (bool): Enable/disable false start detection
- `false_start_word_overlap` (int): Min matching words at start (default: 2)
- `false_start_threshold` (float): Similarity threshold (default: 0.85)

**Behavior:** Removes the incomplete first attempt, keeps the complete version

---

### 3. **Self-Correction Detection**
**Example:** `"The mitochondria is..." → "Wait, the mitochondria ARE the powerhouse"`

**What it detects:**
- Explicit correction keywords like "wait", "actually", "I mean", "sorry"
- Self-correction mid-sentence or between sentences

**Settings:**
- `detect_self_corrections` (bool): Enable/disable self-correction detection
- `self_correction_keywords` (list): Custom keywords to detect
- `context_clue_boost` (float): Confidence boost amount (default: 0.15)

**Default Keywords:**
```python
[
    'wait', 'sorry', 'actually', 'i mean', 'let me', 'hold on',
    'no wait', 'scratch that', 'start over', 'try again', 'um actually',
    'let me rephrase', 'what i meant', 'correction'
]
```

**Behavior:** Removes the segment with correction keywords, keeps the corrected version

---

### 4. **Filler Word Retakes**
**Example:** `"Um... uh... let me try that again"` → `"The main concept here is..."`

**What it detects:**
- Excessive filler words indicating speaker is struggling
- High ratio of um/uh/err to actual content

**Settings:**
- `detect_filler_retakes` (bool): Enable/disable filler detection
- `filler_words` (list): List of filler words to detect
- `filler_word_threshold` (float): Ratio to trigger removal (default: 0.3)

**Default Fillers:**
```python
['um', 'uh', 'err', 'hmm', 'like', 'you know']
```

**Behavior:** Removes segment with excessive fillers, keeps cleaner version

---

### 5. **Breath/Pause-Based Retakes**
**Example:** `"The key point..." [2 second pause] "The key point is that..."`

**What it detects:**
- Characteristic pause duration (1.5-3 seconds) indicating speaker is restarting
- Combined with text similarity to confirm it's a retry

**Settings:**
- `detect_breath_pauses` (bool): Enable/disable pause detection
- `breath_pause_min` (float): Minimum pause duration (default: 1.5s)
- `breath_pause_max` (float): Maximum pause duration (default: 3.0s)

**Behavior:** Boosts confidence for removal when pause + text similarity detected

---

### 6. **Partial vs Complete Sentences**
**Example:** `"And another thing to consider..."` → `"And another thing to consider is the cellular structure"`

**What it detects:**
- Sentences cut off mid-thought vs complete sentences
- Significant length difference indicating one is more complete

**Settings:**
- `detect_partial_sentences` (bool): Enable/disable partial sentence detection
- `prefer_complete_takes` (bool): Prefer sentences with proper punctuation
- `length_bias_threshold` (float): Keep if X times longer (default: 1.3)

**Behavior:** Keeps longer, more complete version

---

### 7. **Incomplete Sentence Detection**
**Example:** `"The mitochondria which..."` → `"The mitochondria, which are the powerhouse, function..."`

**What it detects:**
- Sentences ending with conjunctions (and, but, or, which, that)
- Missing punctuation at end
- Grammatically incomplete structures

**Settings:**
- `detect_incomplete_sentences` (bool): Enable/disable incomplete detection
- `incomplete_indicators` (list): Words that signal incomplete sentences

**Default Indicators:**
```python
[
    'and', 'but', 'or', 'so', 'because', 'however', 'therefore',
    'which', 'that', 'who', 'where', 'when', 'while'
]
```

**Behavior:** Removes incomplete versions, keeps complete sentences

---

### 8. **Confidence/Delivery-Based Selection**
**Example:** `"Um, so the... like... point is..."` → `"The point is that mitochondria are essential"`

**What it detects:**
- Hesitation markers, multiple fillers, correction words
- Overall delivery confidence score

**Settings:**
- `prefer_confident_delivery` (bool): Use confidence scoring
- `hesitation_penalty` (float): Penalty for hesitations (default: 0.1)

**Behavior:** Keeps the take with higher delivery confidence

---

## Detection Priority Order

When multiple scenarios apply, the system uses this priority order:

1. **Stutter** - Highest priority (most obvious)
2. **False Start** - Clear structural issue
3. **Filler Words** - Remove excessive hesitation
4. **Self-Correction** - Explicit correction markers
5. **Complete vs Incomplete** - Structural completeness
6. **Length Bias** - Significant length difference
7. **Delivery Confidence** - Overall quality
8. **Default** - Remove earlier take (standard retry pattern)

## Hybrid Detection Mode

When `use_hybrid_detection=True`, the system combines:

- **Text Similarity** (Semantic analysis using embeddings)
- **Audio Similarity** (MFCC-based audio comparison)
- **Scenario-Specific Boosts** (Each scenario adds confidence)
- **Context Clues** (Keyword detection)

This multi-modal approach significantly reduces false positives.

## Usage Example

```python
from bad_take_scenarios import BadTakeScenarioConfig, BadTakeScenarioDetector

# Create custom configuration
config = BadTakeScenarioConfig(
    detect_stutters=True,
    detect_false_starts=True,
    detect_self_corrections=True,
    stutter_word_limit=3,
    false_start_threshold=0.85,
    self_correction_keywords=['wait', 'actually', 'let me try again'],
    breath_pause_min=1.5,
    prefer_complete_takes=True,
    prefer_confident_delivery=True
)

# Create detector
detector = BadTakeScenarioDetector(config)

# Analyze segments
scenario_flags = detector.analyze_segments(
    current_segment={'text': 'Hi...', 'start': 0.0, 'end': 1.0},
    next_segment={'text': 'Hi everyone', 'start': 1.5, 'end': 3.0},
    time_gap=0.5,
    text_similarity=0.9
)

# Determine which to keep
remove, keep, reason = detector.determine_which_to_keep(
    current_segment, 
    next_segment, 
    scenario_flags
)
```

## UI Configuration

All settings will be exposed in the web interface under "Bad Take Removal" settings:

### Basic Settings
- Sensitivity (Low/Medium/High)
- Minimum Repetition Length
- Hybrid Detection (Text + Audio)

### Scenario-Specific Toggles
- ☑ Detect Stutters
- ☑ Detect False Starts
- ☑ Detect Self-Corrections
- ☑ Detect Filler Retakes
- ☑ Detect Breath Pauses
- ☑ Detect Partial Sentences
- ☑ Detect Incomplete Sentences
- ☑ Prefer Confident Delivery

### Advanced Settings
- Stutter Word Limit (1-5)
- False Start Threshold (0.7-0.95)
- Filler Word Threshold (0.1-0.5)
- Breath Pause Range (1.0s - 4.0s)
- Length Bias Multiplier (1.1-2.0)
- Custom Keywords (text input)

## Best Practices

1. **Start with defaults** - They work well for most content
2. **Adjust sensitivity** - High for casual content, low for precise technical content
3. **Custom keywords** - Add domain-specific correction phrases
4. **Review results** - Check a few videos to tune settings
5. **Scenario toggles** - Disable scenarios that don't apply to your content

## Performance Notes

- Stutter detection: Very fast (text-only)
- False start detection: Fast (text-only with similarity)
- Audio similarity: Slower (requires MFCC computation)
- Hybrid mode: Most accurate but slower
- Text-only mode: Faster, slightly less accurate

## Future Enhancements

- Machine learning-based confidence scoring
- Voice tone analysis for hesitation detection
- Multi-language support for keywords
- Video-based detection (facial expressions, body language)
- Automated threshold tuning based on content type
