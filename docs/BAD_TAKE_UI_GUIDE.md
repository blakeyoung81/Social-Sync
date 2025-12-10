# Bad Take Removal - UI Guide

## Interface Overview

The Bad Take Removal settings are organized into three expandable sections for ease of use:

### 🎯 Section 1: Basic Detection (Always Visible)

```
┌─────────────────────────────────────────────────┐
│  Bad Take Removal Settings                      │
├─────────────────────────────────────────────────┤
│  Basic Detection                                │
│  ┌───────────────────────────────────────────┐ │
│  │ Detection Sensitivity: [Medium ▼]         │ │
│  │   • Low (fewer detections)                │ │
│  │   • Medium (balanced)                     │ │
│  │   • High (more detections)                │ │
│  │                                            │ │
│  │ Min Repetition Length: [3] words          │ │
│  │                                            │ │
│  │ Confidence Threshold: ▬▬▬●▬▬▬             │ │
│  │ Current: 70%                              │ │
│  └───────────────────────────────────────────┘ │
└─────────────────────────────────────────────────┘
```

**Purpose:** Core detection settings that most users will adjust.

---

### 🔍 Section 2: Scenario Detection (Always Visible)

```
┌─────────────────────────────────────────────────┐
│  Scenario Detection                             │
│  ┌───────────────────────────────────────────┐ │
│  │ ☑ Detect Stutters                         │ │
│  │   (e.g., "Hi... Hi everyone")             │ │
│  │                                            │ │
│  │ ☑ Detect False Starts                     │ │
│  │   (incomplete → complete)                 │ │
│  │                                            │ │
│  │ ☑ Detect Self-Corrections                 │ │
│  │   (wait, actually, etc.)                  │ │
│  │                                            │ │
│  │ ☑ Detect Filler Retakes                   │ │
│  │   (um, uh, err)                           │ │
│  │                                            │ │
│  │ ☑ Detect Breath Pauses                    │ │
│  │   (1.5-3s pause)                          │ │
│  │                                            │ │
│  │ ☑ Detect Partial Sentences                │ │
│  │                                            │ │
│  │ ☑ Prefer Complete Takes                   │ │
│  │   (proper punctuation)                    │ │
│  │                                            │ │
│  │ ☑ Prefer Confident Delivery               │ │
│  └───────────────────────────────────────────┘ │
└─────────────────────────────────────────────────┘
```

**Purpose:** Toggle specific scenario types on/off. All enabled by default.

---

### ⚙️ Section 3: Advanced Tuning (Collapsible)

```
┌─────────────────────────────────────────────────┐
│  ▶ Advanced Tuning (Optional)                   │
│  ┌───────────────────────────────────────────┐ │
│  │ Stutter Word Limit: [3]                   │ │
│  │ Max words to consider as stutter          │ │
│  │                                            │ │
│  │ False Start Threshold: ▬▬▬●▬▬▬           │ │
│  │ Current: 85%                              │ │
│  │                                            │ │
│  │ Self-Correction Keywords:                 │ │
│  │ [wait, sorry, actually, i mean, ...]      │ │
│  │                                            │ │
│  │ Context Clue Boost: ▬▬▬●▬▬▬              │ │
│  │ Current: 15%                              │ │
│  │                                            │ │
│  │ Filler Word Threshold: ▬▬▬●▬▬▬           │ │
│  │ Current: 30% (ratio of fillers to words)  │ │
│  │                                            │ │
│  │ Breath Pause Min: [1.5] seconds           │ │
│  │ Breath Pause Max: [3.0] seconds           │ │
│  │                                            │ │
│  │ Length Bias Threshold: ▬▬▬●▬▬▬           │ │
│  │ Keep if 1.3x longer                       │ │
│  └───────────────────────────────────────────┘ │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│  💡 Tip: Start with defaults. Use High          │
│  sensitivity for casual vlogs, Low for          │
│  technical content.                             │
└─────────────────────────────────────────────────┘
```

**Purpose:** Fine-grained control for power users. Hidden by default to avoid overwhelming beginners.

---

## Usage Workflows

### Beginner Workflow
1. ✅ Leave all defaults
2. ✅ Adjust sensitivity if needed (Low/Medium/High)
3. ✅ Process video
4. ✅ Review results
5. ✅ Adjust sensitivity if too many/few cuts

### Intermediate Workflow
1. ✅ Start with defaults
2. ✅ Toggle off scenarios that don't apply
   - E.g., disable "Breath Pauses" for tight edits
3. ✅ Adjust basic thresholds
4. ✅ Process and review

### Advanced Workflow
1. ✅ Use scenario toggles to target specific issues
2. ✅ Open "Advanced Tuning" section
3. ✅ Add custom correction keywords for your domain
   - Medical: "no that's", "correction", "i misspoke"
   - Tech: "wait that's wrong", "actually it's"
4. ✅ Fine-tune thresholds based on content type
5. ✅ Save as preset (future feature)

---

## Visual Examples

### Example 1: Stutter Detection
```
🎬 Timeline View:
┌─────────────────────────────────────────────┐
│ ❌ "Hi..."                [0:00-0:01]        │ ← Detected as stutter
│ ✅ "Hi everyone, welcome" [0:02-0:04]        │ ← Kept (complete)
└─────────────────────────────────────────────┘

Settings Used:
• Detect Stutters: ☑ ON
• Stutter Word Limit: 3
```

### Example 2: Self-Correction Detection
```
🎬 Timeline View:
┌─────────────────────────────────────────────┐
│ ❌ "The mitochondria is..." [0:00-0:03]     │ ← Has "is" (incorrect)
│ ✅ "Wait, ARE the powerhouse" [0:04-0:07]   │ ← Has "wait" (correction)
└─────────────────────────────────────────────┘

Settings Used:
• Detect Self-Corrections: ☑ ON
• Keywords: "wait, sorry, actually..."
• Context Clue Boost: 15%
```

### Example 3: Multiple Scenarios
```
🎬 Timeline View:
┌─────────────────────────────────────────────┐
│ ❌ "Um... so the..." [0:00-0:02]            │ ← Filler + Partial
│ ✅ "The key concept is..." [0:04-0:08]      │ ← Complete + Confident
└─────────────────────────────────────────────┘

Detected:
• Filler Retry (30% filler ratio)
• Partial Sentence (no punctuation)
• Lower confidence score

Kept:
• Complete sentence (proper punctuation)
• Higher confidence score
```

---

## Color Coding

The UI uses color psychology for quick understanding:

- 🔴 **Red** - Bad Take Removal section (warning/removal action)
- ⚪ **White** - Sub-sections (neutral, informational)
- 🔵 **Blue** - Tips and help text (informative)
- 🟢 **Green** (future) - Successfully detected bad takes

---

## Keyboard Shortcuts (Future)

Planned shortcuts for power users:

- `Alt + B` - Toggle Bad Take Removal
- `Alt + S` - Quick sensitivity cycle (Low → Med → High)
- `Alt + A` - Toggle Advanced section
- `Alt + R` - Reset to defaults

---

## Mobile View (Responsive)

On mobile devices, sections stack vertically with collapsible headers:

```
┌─────────────────────────┐
│ ▼ Basic Detection       │
│   [Settings...]         │
├─────────────────────────┤
│ ▼ Scenario Detection    │
│   [Checkboxes...]       │
├─────────────────────────┤
│ ▶ Advanced Tuning       │
│   (collapsed)           │
└─────────────────────────┘
```

---

## Accessibility Features

- ♿ Full keyboard navigation
- 🔊 Screen reader labels on all inputs
- 🎨 High contrast mode support
- 📏 Large touch targets (48px minimum)
- 📝 Descriptive tooltips
- 🌐 ARIA labels and roles

---

## Quick Reference Card

### Common Settings for Different Content Types

#### 📹 Casual Vlogs
```
Sensitivity: High
Detect Stutters: ☑
Detect False Starts: ☑
Detect Self-Corrections: ☑
Detect Filler Retakes: ☑
```

#### 🎓 Educational Content
```
Sensitivity: Medium
Detect Stutters: ☑
Detect False Starts: ☑
Detect Self-Corrections: ☑
Detect Filler Retakes: ☐ (keep natural pauses)
```

#### 🔬 Technical/Medical
```
Sensitivity: Low
Detect Stutters: ☑
Detect False Starts: ☐ (might be deliberate)
Detect Self-Corrections: ☑
Custom Keywords: "correction, no that's..."
```

#### 🎤 Interviews/Podcasts
```
Sensitivity: Low
Detect Stutters: ☐
Detect False Starts: ☐
Detect Self-Corrections: ☑
Prefer Natural: Multiple speakers
```

---

## Integration with Other Features

The Bad Take Removal settings work seamlessly with:

- **Silence Removal**: Runs before bad take removal
- **Transcription**: Required for text-based detection
- **GPT Correction**: Runs after bad take removal
- **Subtitle Burning**: Uses post-removal timestamps
- **Background Music**: Applied after removal

Processing Order:
```
1. Silence Removal
2. Transcription
3. Bad Take Removal ← You are here
4. GPT Correction
5. Subtitle Burning
6. Background Music
```
