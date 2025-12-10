export const DEFAULT_SETTINGS = {
  // Subtitle configuration
  subtitleFontSize: 8,
  
  // AI GPT Prompt Configurations
  gptPrompts: {
    topicDetection: `
Analyze this video transcript and determine the main topic. Respond with exactly 3 words that best describe the subject matter.

Examples:
- "Immune System Basics"
- "Heart Disease Prevention" 
- "Cancer Cell Biology"
- "Diabetes Management Tips"
- "Mental Health Awareness"

Make it professional, specific, and educational. Focus on the core medical/scientific concept being discussed.

Transcript:
{transcript}

Respond with only the 3-word topic:
    `,
    
    transcriptionCorrection: `
You are a professional medical transcript editor. Your job is to clean up and improve this automatically generated transcript while preserving the speaker's natural flow and important medical terminology.

**INSTRUCTIONS:**
1. Fix obvious transcription errors and misheard words
2. Correct medical terminology and drug names
3. Improve punctuation and capitalization
4. Keep the natural speaking style and flow
5. Don't add content that wasn't spoken
6. Maintain timing format exactly as provided

**FOCUS ON:**
- Medical accuracy
- Clear sentence structure
- Proper medical terminology
- Consistent formatting

Original transcript:
{transcript}

Return the corrected transcript in the same SRT format:
    `,
    
    aiHighlights: `
Analyze this educational video transcript on "{topic}" and identify words/phrases that should be highlighted to maximize learning and engagement.

**EDUCATIONAL HIGHLIGHTING STRATEGY:**
1. **Key Learning Terms** (8-12 words/phrases): Medical terms, scientific concepts, processes, anatomical names
2. **Important Sentences** (3-5 sentences): Complete statements that contain crucial learning points
3. **Emphasis Words** (5-8 words): Action words, quantifiers, comparisons that need emphasis for understanding

**Focus on highlighting:**
- Technical terminology that students need to learn
- Critical concepts for understanding the topic  
- Key processes, mechanisms, or procedures
- Important names (diseases, anatomy, medications)
- Numbers, percentages, or measurements
- Warning signs, symptoms, or diagnostic criteria

**Make learning effective by highlighting words that:**
- Help viewers remember key concepts
- Draw attention to important medical facts
- Emphasize critical learning points
- Aid in knowledge retention

Respond with a JSON object:
{{
    "highlights": ["Complete sentence with key learning point 1", "Complete sentence 2"],
    "keywords": ["medical term 1", "important concept", "key process", "diagnostic sign", "anatomical structure"],
    "emphasis_words": ["critical", "essential", "important", "dangerous", "normal", "abnormal"]
}}

The quotes and keywords MUST be exact matches from the transcript.

Transcript: {transcript}
    `,
    
    multimediaAnalysis: `
Analyze this video transcript about "{topic}" and create a comprehensive multimedia plan. The video is {duration} seconds long.

Create suggestions for both B-roll footage and custom generated images:

**B-ROLL FOOTAGE** (from stock video sites):
- Use for general concepts, medical procedures, laboratory scenes
- Search terms should be realistic and findable on stock sites
- 3-5 B-roll moments maximum

**GENERATED IMAGES** (custom illustrations):
- Use for specific explanations, diagrams, complex concepts
- Descriptions should be detailed for image generation
- 2-4 generated images maximum

For each suggestion, provide:
1. Start time (in seconds) - when to begin showing the media
2. Duration (in seconds) - how long it should play (2-6 seconds)
3. Content description - what's being discussed during this time
4. For B-roll: Search query for stock footage
5. For Images: Detailed description for AI image generation

Rules:
- Don't overlap B-roll and images at the same time
- Focus on key explanatory moments that need visual aid
- Avoid placing media during speaker introductions or conclusions
- B-roll search terms should be simple and stock-video friendly
- Image descriptions should be detailed and professional

Transcript:
{transcript}

Respond in JSON format:
{{
  "broll_suggestions": [
    {{
      "start_time": 15.2,
      "duration": 3.5,
      "search_query": "medical laboratory microscope",
      "content_description": "Discussion of laboratory testing"
    }}
  ],
  "image_suggestions": [
    {{
      "start_time": 25.8,
      "duration": 4.0,
      "image_description": "Professional medical diagram showing the cross-linking process of IgE antibodies on mast cell surfaces, with clear labels and arrows indicating the binding mechanism, clean white background, educational illustration style",
      "content_description": "Explanation of IgE cross-linking mechanism"
    }}
  ]
}}
    `,
    
    imageGeneration: `
You are a professional editor and illustrator. Your job is to create a professionally designed image for a video about "{topic}".

Create: {description}

Style requirements:
- Clean, professional medical/educational illustration style
- High contrast and clarity for video display
- Appropriate for educational content
- Clear labels and annotations where relevant
- Suitable for a medical/scientific audience
    `,

    brollKeywords: `
Analyze this transcript and extract 5-8 keywords that would be ideal for finding relevant B-roll stock footage.

**Guidelines:**
- Focus on visual concepts that can be found in stock video libraries
- Include medical procedures, laboratory activities, anatomical references
- Avoid overly specific terms that won't have stock footage
- Think about what viewers would benefit from seeing visually
- Consider general medical/scientific concepts

**Good examples:**
- "blood cells microscope"
- "medical examination"
- "laboratory testing"
- "doctor consultation"
- "hospital equipment"

Transcript: {transcript}

Respond with exactly 5-8 keywords, comma-separated:
    `,

    videoTitleGeneration: `
Create a compelling, SEO-optimized YouTube title for this video about "{topic}".

**Requirements:**
- 60 characters or less for full display
- Include key medical/educational terms
- Make it clickable but not clickbait
- Professional and educational tone
- Include numbers or specific benefits when relevant

**Style options:**
- "How [Medical Process] Really Works"
- "[Number] Things You Need to Know About [Topic]"
- "The Truth About [Medical Condition]"
- "[Topic] Explained: [Key Benefit]"

Transcript summary: {transcript}

Respond with 3 title options:
1. Primary: [most optimized title]
2. Alternative: [more descriptive title]
3. Simple: [straightforward title]
    `,

    videoDescription: `
Write a professional YouTube video description for this medical/educational content about "{topic}".

**Structure:**
1. Compelling opening hook (1-2 sentences)
2. Key learning points covered (3-4 bullet points)
3. Target audience information
4. Call to action for engagement
5. Relevant hashtags and keywords

**Tone:**
- Professional but accessible
- Educational and authoritative
- Encouraging engagement and learning

Transcript: {transcript}

Write a complete video description (200-300 words):
    `,

    videoTags: `
Generate relevant YouTube tags for this medical/educational video about "{topic}".

**Tag categories to include:**
1. Primary medical keywords (3-4 tags)
2. Educational terms (2-3 tags)
3. Target audience terms (2-3 tags)
4. Broader medical categories (2-3 tags)
5. Long-tail educational phrases (3-4 tags)

**Guidelines:**
- Mix high and low competition keywords
- Include variations of the main topic
- Add educational and medical learning terms
- Keep tags relevant and specific
- Maximum 15 tags total

Transcript: {transcript}

Respond with comma-separated tags:
    `
  },
  
  // Audio settings
  audio: {
    backgroundMusicVolume: 60, // percentage
    mainAudioVolume: 80, // percentage
    soundEffectsVolume: 50 // percentage
  },
  
  // Video processing defaults
  processing: {
    defaultMusicTrack: 'smart',
    defaultSoundEffects: 'basic-pops',
    defaultZoomIntensity: 'subtle',
    defaultZoomFrequency: 'medium',
    defaultTransitionStyle: 'fade',
    // AI Features
    topicDetectionModel: 'gpt-4o-mini' as const,
    multimediaAnalysisModel: 'gpt-4o' as const,
    maxBrollSuggestions: 5,
    maxImageSuggestions: 4,
    imageGenerationModel: 'dall-e-3' as const,
    imageQuality: 'standard' as const,
    imageSize: '1024x1024' as const
  },

  frameStyle: 'rainbow',
  frameWidth: 10,
  frameOpacity: 80,
  musicTrack: 'random',
  backgroundMusicVolume: 50
};

export type SettingsType = typeof DEFAULT_SETTINGS;

// Helper function to get settings from localStorage or defaults
export const getSettings = (): SettingsType => {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS;
  
  try {
    const stored = localStorage.getItem('youtubeUploaderSettings');
    if (stored) {
      const parsed = JSON.parse(stored);
      // Merge with defaults to ensure all properties exist
      return {
        ...DEFAULT_SETTINGS,
        ...parsed,
        gptPrompts: {
          ...DEFAULT_SETTINGS.gptPrompts,
          ...parsed.gptPrompts
        },
        audio: {
          ...DEFAULT_SETTINGS.audio,
          ...parsed.audio
        },
        processing: {
          ...DEFAULT_SETTINGS.processing,
          ...parsed.processing
        }
      };
    }
  } catch (error) {
    console.error('Error loading settings:', error);
  }
  
  return DEFAULT_SETTINGS;
};

// Helper function to save settings to localStorage
export const saveSettings = (settings: SettingsType): void => {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.setItem('youtubeUploaderSettings', JSON.stringify(settings));
  } catch (error) {
    console.error('Error saving settings:', error);
  }
}; 