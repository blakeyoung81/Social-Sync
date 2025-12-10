export function detectProcessingStep(message: string): string | null {
  const stepDetectionPatterns = [
    { pattern: /enhancing.*audio|audio.*enhancement/i, step: 'Audio Enhancement' },
    { pattern: /removing.*silence|silence.*removal/i, step: 'Silence Removal' },
    { pattern: /transcribing|transcription/i, step: 'Transcription' },
    { pattern: /gpt.*correction|correcting.*transcription/i, step: 'GPT Correction' },
    { pattern: /topic.*detection|detecting.*topics/i, step: 'AI Topic Detection' },
    { pattern: /ai.*highlights|highlight.*detection/i, step: 'AI Highlights' },
    { pattern: /multimedia.*analysis|analyzing.*content/i, step: 'AI Multimedia Analysis' },
    { pattern: /b-roll|broll/i, step: 'AI B-Roll' },
    { pattern: /image.*generation|generating.*images/i, step: 'AI Image Generation' },
    { pattern: /dynamic.*zoom|zoom.*processing/i, step: 'Dynamic Zoom' },
    { pattern: /background.*music|adding.*music/i, step: 'Background Music' },
    { pattern: /sound.*effects|adding.*effects/i, step: 'Sound Effects' },
    { pattern: /subtitle.*burning|burning.*subtitles/i, step: 'Subtitle Burning' },
    { pattern: /topic.*card|title.*card/i, step: 'Topic Title Card' },
    { pattern: /adding.*frame|frame.*processing/i, step: 'Add Frame' },
    { pattern: /flash.*logo|logo.*processing/i, step: 'Flash Logo' },
    { pattern: /outro.*addition|adding.*outro/i, step: 'Outro Addition' },
    { pattern: /thumbnail.*generation|generating.*thumbnail/i, step: 'Thumbnail Generation' },
    { pattern: /playlist.*assignment|assigning.*playlist/i, step: 'Playlist Assignment' }
  ];
  
  // Check if message matches any step pattern
  for (const { pattern, step } of stepDetectionPatterns) {
    if (pattern.test(message)) {
      return step;
    }
  }
  
  return null;
}

export function extractProgressPercentage(message: string): number | null {
  const progressMatch = message.match(/(\d+)%/);
  if (progressMatch) {
    const percentage = parseInt(progressMatch[1]);
    if (percentage >= 0 && percentage <= 100) {
      return percentage;
    }
  }
  return null;
} 