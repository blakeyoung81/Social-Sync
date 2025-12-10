import React, { useState, useRef, useEffect } from 'react';
import { Settings, Scissors, Film, Sparkles, MessageSquare, Hash, Volume2, Zap, Wand2, FileText, FrameIcon, PlusCircle, Image, Youtube, Camera, Music, Bell, Shuffle, Trash2, ScanEye } from 'lucide-react';
import type { ProcessingStep, ProcessingOptions, RandomModeSettings } from '../../types';
import MusicSelector from './MusicSelector';
import { FRAME_STYLES } from '../../constants/processing';
import { useMusicFiles } from '../../hooks/useMusicFiles';

interface ProcessingStepsConfigProps {
  processingSteps: ProcessingStep[];
  options: ProcessingOptions;
  onOptionChange: (key: keyof ProcessingOptions, value: any) => void;
  processing: boolean;
}


// Add this component for Random Mode toggle
const RandomModeToggle = ({ option, label, options, onOptionChange, disabled = false }: {
  option: keyof RandomModeSettings;
  label: string;
  options: ProcessingOptions;
  onOptionChange: (key: keyof ProcessingOptions, value: any) => void;
  disabled?: boolean;
}) => {
  return (
    <label className="flex items-center space-x-2 cursor-pointer mt-1 text-xs">
      <input 
        type="checkbox" 
        checked={options.randomMode?.[option] || false} 
        onChange={(e) => onOptionChange('randomMode', {
          ...options.randomMode,
          [option]: e.target.checked
        })}
        disabled={disabled || !options.randomMode?.enabled}
        className="h-3 w-3 rounded text-purple-600 focus:ring-purple-500"
      />
      <span className={!options.randomMode?.enabled ? "text-gray-400" : "text-purple-700"}>
        {label}
      </span>
    </label>
  );
};

export const ProcessingStepsConfig: React.FC<ProcessingStepsConfigProps> = ({
  processingSteps,
  options,
  onOptionChange,
  processing
}) => {
  const { musicFiles, loading: musicLoading } = useMusicFiles();
  
  // State for managing hover overlays
  const [hoveredStep, setHoveredStep] = useState<string | null>(null);
  const [settingsVisible, setSettingsVisible] = useState<string | null>(null);
  const hideTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const overlayRef = useRef<HTMLDivElement | null>(null);

  // Clear timeout on unmount
  useEffect(() => {
    return () => {
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current);
      }
    };
  }, []);

  // Handle mouse enter on step
  const handleStepMouseEnter = (stepName: string) => {
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = null;
    }
    // Immediately switch to new step's settings
    setHoveredStep(stepName);
    setSettingsVisible(stepName);
  };

  // Handle mouse leave from step or settings
  const handleMouseLeave = () => {
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
    }
    
    hideTimeoutRef.current = setTimeout(() => {
      setHoveredStep(null);
      setSettingsVisible(null);
    }, 300); // 0.3 second delay
  };

  // Handle mouse enter on settings overlay  
  const handleSettingsMouseEnter = () => {
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = null;
    }
  };

  // Map step names to their corresponding settings panel keys
  const getSettingsKeyForStep = (stepName: string): keyof ProcessingOptions | null => {
    const stepToSettingsMap: Record<string, keyof ProcessingOptions> = {
      'Audio Enhancement': 'skipAudio',
      'Silence Removal': 'skipSilence', // No settings panel, just toggle
      'Transcription': 'skipTranscription',
      'GPT Correction': 'skipGpt',
      'AI Topic Detection': 'skipTopicDetection', // No settings panel, just toggle
      'AI Multimedia Analysis': 'skipMultimediaAnalysis', // No settings panel, just toggle
      'AI Highlights': 'skipAiHighlights',
      'AI B-Roll': 'skipBroll',
      'AI Image Generation': 'skipImageGeneration',
      'Bad Take Removal': 'skipBadTakeRemoval',
      'Enhanced Auto Zoom': 'skipEnhancedAutoZoom',
      'Background Music': 'skipBackgroundMusic',
      'Sound Effects': 'skipSoundEffects',
      'Flash Logo': 'skipFlashLogo',
      'Outro Addition': 'skipOutro', // No settings panel, just toggle
      'Add Frame': 'skipFrame',
      'Subtitle Burning': 'skipSubtitles',
      'Topic Title Card': 'skipTopicCard',
      'Thumbnail Generation': 'skipThumbnail',
      'Playlist Assignment': 'skipPlaylist' // No settings panel, just toggle
    };
    return stepToSettingsMap[stepName] || null;
  };

  const settingsPanels: Partial<Record<keyof ProcessingOptions, React.ReactNode>> = {
    skipAudio: (
      <div className="bg-cyan-50 border border-cyan-200 rounded-lg p-4">
        <h4 className="font-medium text-cyan-900 mb-3 flex items-center gap-2"><Volume2 className="w-4 h-4" />Audio Enhancement</h4>
        <div className="mb-3 p-2 bg-blue-50 border border-blue-200 rounded">
          <p className="text-sm text-blue-800">
            ℹ️ <strong>Audio processing is OFF by default.</strong> These settings apply when audio enhancement is enabled.
          </p>
        </div>
        <div className="space-y-4">
          <label className="flex items-center space-x-3 cursor-pointer">
            <input type="checkbox" checked={options.useFfmpegEnhance} onChange={(e) => onOptionChange('useFfmpegEnhance', e.target.checked)} disabled={processing} className="h-5 w-5 rounded text-blue-600 focus:ring-blue-500"/>
            <span className="font-medium">Standard FFmpeg Enhancement</span>
            <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">Recommended</span>
          </label>
          <label className="flex items-center space-x-3 cursor-pointer">
            <input type="checkbox" checked={options.useAiDenoiser} onChange={(e) => onOptionChange('useAiDenoiser', e.target.checked)} disabled={processing} className="h-5 w-5 rounded"/>
            <span>AI-Powered Denoising (Experimental)</span>
          </label>
          <label className="flex items-center space-x-3 cursor-pointer">
            <input type="checkbox" checked={options.useVoicefixer} onChange={(e) => onOptionChange('useVoicefixer', e.target.checked)} disabled={processing} className="h-5 w-5 rounded"/>
            <span>VoiceFixer Studio Enhancement</span>
          </label>
        </div>
      </div>
    ),

    skipTranscription: (
        <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
            <h4 className="font-medium text-indigo-900 mb-3 flex items-center gap-2"><FileText className="w-4 h-4" />Transcription Settings</h4>
            <label>Whisper Model</label>
            <select value={options.whisperModel || 'small'} onChange={(e) => onOptionChange('whisperModel', e.target.value)} className="w-full p-1 border rounded">
                <option value="tiny">Tiny</option>
                <option value="base">Base</option>
                <option value="small">Small (Default)</option>
                <option value="medium">Medium</option>
                <option value="large">Large</option>
            </select>
        </div>
    ),
    skipGpt: (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2"><Wand2 className="w-4 h-4" />GPT Correction Settings</h4>
            <div className="space-y-3">
                <div>
            <label>GPT Model</label>
            <select value={options.gptModel || 'gpt-4o-mini'} onChange={(e) => onOptionChange('gptModel', e.target.value)} className="w-full p-1 border rounded">
                <option value="gpt-4o-mini">GPT-4o Mini (Default)</option>
                <option value="gpt-4-turbo">GPT-4 Turbo</option>
            </select>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Custom Prompt</label>
                    <textarea
                        value={options.transcriptionCorrectionPrompt || ''}
                        onChange={(e) => onOptionChange('transcriptionCorrectionPrompt', e.target.value)}
                        placeholder={`You are a professional medical transcript editor. Your job is to clean up and improve this automatically generated transcript while preserving the speaker's natural flow and important medical terminology.

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

Return the corrected transcript in the same SRT format:`}
                        className="w-full p-2 border rounded text-xs font-mono"
                        rows={8}
                    />
                    <p className="text-xs text-gray-600 mt-1">Leave blank to use default prompt shown above. Use {`{transcript}`} and {`{topic}`} as placeholders.</p>
                </div>
            </div>
        </div>
    ),
    skipAiHighlights: (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <h4 className="font-medium text-yellow-900 mb-3 flex items-center gap-2"><Zap className="w-4 h-4" />AI Highlights Settings</h4>
            <div className="space-y-3">
                <div>
            <label>Highlight Style</label>
             <select value={options.highlightStyle || 'yellow'} onChange={(e) => onOptionChange('highlightStyle', e.target.value)} className="w-full p-1 border rounded">
                <option value="random">🎲 Random (varies per video)</option>
                <option value="yellow">Yellow</option>
                <option value="cyan">Cyan</option>
                <option value="lime">Lime Green</option>
            </select>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Custom Highlighting Prompt</label>
                    <textarea
                        value={options.aiHighlightsPrompt || ''}
                        onChange={(e) => onOptionChange('aiHighlightsPrompt', e.target.value)}
                        placeholder={`Analyze this educational video transcript on "{topic}" and identify words/phrases that should be highlighted to maximize learning and engagement.

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

Respond with a JSON object:
{
    "highlights": ["Complete sentence with key learning point 1", "Complete sentence 2"],
    "keywords": ["medical term 1", "important concept", "key process", "diagnostic sign"],
    "emphasis_words": ["critical", "essential", "important", "dangerous", "normal"]
}

The quotes and keywords MUST be exact matches from the transcript.

Transcript: {transcript}`}
                        className="w-full p-2 border rounded text-xs font-mono"
                        rows={10}
                    />
                    <p className="text-xs text-gray-600 mt-1">Leave blank to use default prompt shown above. Use {`{transcript}`} and {`{topic}`} as placeholders.</p>
                </div>
            </div>
        </div>
    ),
    skipBroll: (
      <div className="bg-teal-50 border border-teal-200 rounded-lg p-4">
        <h4 className="font-medium text-teal-900 mb-3 flex items-center gap-2"><Film className="w-4 h-4" />AI B-Roll Settings</h4>
        <div className="space-y-3">
            {/* Smart Mode Toggle */}
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-3 mb-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={options.useSmartMode || false}
                  onChange={(e) => onOptionChange('useSmartMode', e.target.checked)}
                  disabled={processing}
                  className="w-4 h-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <span className="text-sm font-medium text-blue-900">
                  🧠 AI-Determined Multimedia - Auto-calculate counts based on video length
                </span>
              </label>
              
              {options.useSmartMode && (
                <div className="mt-3 space-y-3">
                  <div className="bg-white border border-blue-200 rounded-lg p-3">
                    <h5 className="text-sm font-medium text-blue-800 mb-2">📊 Content Ratios per 30 Seconds</h5>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-blue-700 mb-1">B-roll clips per 30s</label>
                        <input
                          type="number"
                          min="0"
                          max="3"
                          step="0.5"
                          value={options.smartModeRatio?.brollPerThirtySeconds || 1.0}
                          onChange={(e) => onOptionChange('smartModeRatio', {
                            ...options.smartModeRatio,
                            brollPerThirtySeconds: parseFloat(e.target.value),
                            imagesPerThirtySeconds: options.smartModeRatio?.imagesPerThirtySeconds || 2.0
                          })}
                          disabled={processing}
                          className="w-full p-2 border border-gray-300 rounded text-sm"
                        />
                        <div className="text-xs text-blue-600 mt-1">
                          Formula: (duration ÷ 30) × {options.smartModeRatio?.brollPerThirtySeconds || 1.0}
                        </div>
                      </div>
                      {!options.skipImageGeneration && (
                        <div>
                          <label className="block text-xs font-medium text-purple-700 mb-1">AI images per 30s</label>
                          <input
                            type="number"
                            min="0"
                            max="5"
                            step="0.5"
                            value={options.smartModeRatio?.imagesPerThirtySeconds || 2.0}
                            onChange={(e) => onOptionChange('smartModeRatio', {
                              brollPerThirtySeconds: options.smartModeRatio?.brollPerThirtySeconds || 1.0,
                              imagesPerThirtySeconds: parseFloat(e.target.value)
                            })}
                            disabled={processing}
                            className="w-full p-2 border border-gray-300 rounded text-sm"
                          />
                          <div className="text-xs text-purple-600 mt-1">
                            Formula: (duration ÷ 30) × {options.smartModeRatio?.imagesPerThirtySeconds || 2.0}
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="mt-3 p-2 bg-blue-50 rounded text-xs text-blue-700">
                      <strong>Example:</strong> 162s video → ~5 B-roll clips + ~11 images
                    </div>
                  </div>
                </div>
              )}
            </div>

            {!options.useSmartMode ? (
              <div className="grid grid-cols-2 gap-2">
                  <div>
              <label>Number of Clips</label>
              <input type="number" value={options.brollClipCount || 5} onChange={(e) => onOptionChange('brollClipCount', parseInt(e.target.value, 10))} disabled={processing} className="w-full p-1 border rounded" />
                  </div>
                  <div>
              <label>Clip Duration (sec)</label>
              <input type="number" value={options.brollClipDuration || 4} onChange={(e) => onOptionChange('brollClipDuration', parseInt(e.target.value, 10))} disabled={processing} className="w-full p-1 border rounded" />
                  </div>
              </div>
            ) : (
              <div className="bg-blue-100 border border-blue-300 rounded-lg p-3">
                <div className="text-center text-blue-800 font-medium">
                  🤖 AI Determined
                </div>
                <div className="text-xs text-blue-600 text-center mt-1">
                  Count calculated automatically based on silence-removed video duration
                </div>
                <div className="grid grid-cols-1 gap-2 mt-2">
                  <div>
                    <label className="block text-xs font-medium text-blue-700 mb-1">Clip Duration (sec)</label>
                    <input type="number" value={options.brollClipDuration || 4} onChange={(e) => onOptionChange('brollClipDuration', parseInt(e.target.value, 10))} disabled={processing} className="w-full p-1 border rounded text-sm" />
                  </div>
                </div>
              </div>
            )}
            <div>
            <label>Transition Style</label>
            <select value={options.brollTransitionStyle || 'fade'} onChange={(e) => onOptionChange('brollTransitionStyle', e.target.value)} className="w-full p-1 border rounded">
                <option value="fade">Fade</option>
                <option value="none">None</option>
            </select>
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Custom B-Roll Analysis Prompt</label>
                <textarea
                    value={options.brollAnalysisPrompt || ''}
                    onChange={(e) => onOptionChange('brollAnalysisPrompt', e.target.value)}
                    placeholder={`Analyze this video transcript about "{topic}" and suggest optimal B-roll stock footage placements. The video is {duration} seconds long.

**B-ROLL STRATEGY:**
- Use for general concepts, medical procedures, laboratory scenes
- Search terms should be realistic and findable on stock sites
- 3-5 B-roll moments maximum
- Focus on key explanatory moments that need visual aid

For each suggestion, provide:
1. Start time (in seconds) - when to begin showing the media
2. Duration (in seconds) - how long it should play (2-6 seconds)
3. Search query for stock footage
4. Content description - what's being discussed during this time

Respond in JSON format:
{
  "broll_suggestions": [
    {
      "start_time": 15.2,
      "duration": 3.5,
      "search_query": "medical laboratory microscope",
      "content_description": "Discussion of laboratory testing"
    }
  ]
}

Transcript: {transcript}`}
                    className="w-full p-2 border rounded text-xs font-mono"
                    rows={8}
                />
                <p className="text-xs text-gray-600 mt-1">Leave blank to use default prompt shown above. Use {`{transcript}`}, {`{topic}`}, and {`{duration}`} as placeholders.</p>
            </div>
        </div>
      </div>
    ),
    skipImageGeneration: (
      <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
        <h4 className="font-medium text-purple-900 mb-3 flex items-center gap-2"><Image className="w-4 h-4" />AI Image Generation Settings</h4>
        <div className="space-y-3">
            {/* Smart Mode Toggle - Only show if B-roll section is skipped */}
            {options.skipBroll && (
              <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-3 mb-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={options.useSmartMode || false}
                    onChange={(e) => onOptionChange('useSmartMode', e.target.checked)}
                    disabled={processing}
                    className="w-4 h-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <span className="text-sm font-medium text-blue-900">
                    🧠 AI-Determined Multimedia - Auto-calculate counts based on video length
                  </span>
                </label>
                
                {options.useSmartMode && (
                  <div className="mt-3 space-y-3">
                    <div className="bg-white border border-purple-200 rounded-lg p-3">
                      <h5 className="text-sm font-medium text-purple-800 mb-2">📊 Content Ratios per 30 Seconds</h5>
                      <div>
                        <label className="block text-xs font-medium text-purple-700 mb-1">AI images per 30s</label>
                        <input
                          type="number"
                          min="0"
                          max="5"
                          step="0.5"
                          value={options.smartModeRatio?.imagesPerThirtySeconds || 2.0}
                          onChange={(e) => onOptionChange('smartModeRatio', {
                            brollPerThirtySeconds: options.smartModeRatio?.brollPerThirtySeconds || 1.0,
                            imagesPerThirtySeconds: parseFloat(e.target.value)
                          })}
                          disabled={processing}
                          className="w-full p-2 border border-gray-300 rounded text-sm"
                        />
                        <div className="text-xs text-purple-600 mt-1">
                          Formula: (duration ÷ 30) × {options.smartModeRatio?.imagesPerThirtySeconds || 2.0}
                        </div>
                      </div>
                      <div className="mt-3 p-2 bg-purple-50 rounded text-xs text-purple-700">
                        <strong>Example:</strong> 162s video → ~11 AI images
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Show AI-Determined indicator if Smart Mode is enabled via B-roll section */}
            {!options.skipBroll && options.useSmartMode && (
              <div className="bg-blue-100 border border-blue-300 rounded-lg p-3 mb-3">
                <div className="text-center text-blue-800 font-medium">
                  🤖 AI Determined (configured in B-Roll section)
                </div>
                <div className="text-xs text-blue-600 text-center mt-1">
                  Image count calculated automatically: ~{Math.round(162 / 30 * (options.smartModeRatio?.imagesPerThirtySeconds || 2.0))} images for 162s video
                </div>
              </div>
            )}

            {!options.useSmartMode ? (
              <div className="grid grid-cols-2 gap-2">
                  <div>
                      <label>Number of Images</label>
                      <input type="number" value={options.imageGenerationCount || 3} onChange={(e) => onOptionChange('imageGenerationCount', parseInt(e.target.value, 10))} disabled={processing} className="w-full p-1 border rounded" />
                  </div>
                  <div>
                      <label>Image Duration (sec)</label>
                      <input type="number" value={options.imageDisplayDuration || 4} onChange={(e) => onOptionChange('imageDisplayDuration', parseInt(e.target.value, 10))} disabled={processing} className="w-full p-1 border rounded" />
                  </div>
              </div>
            ) : (
              <div className="bg-purple-100 border border-purple-300 rounded-lg p-3">
                <div className="text-center text-purple-800 font-medium">
                  🤖 AI Determined
                </div>
                <div className="text-xs text-purple-600 text-center mt-1">
                  Count calculated automatically based on silence-removed video duration
                </div>
                <div className="grid grid-cols-1 gap-2 mt-2">
                  <div>
                    <label className="block text-xs font-medium text-purple-700 mb-1">Image Duration (sec)</label>
                    <input type="number" value={options.imageDisplayDuration || 4} onChange={(e) => onOptionChange('imageDisplayDuration', parseInt(e.target.value, 10))} disabled={processing} className="w-full p-1 border rounded text-sm" />
                  </div>
                </div>
              </div>
            )}
            <div className="grid grid-cols-2 gap-2">
                <div>
                    <label>Image Quality</label>
                    <select value={options.imageQuality || 'standard'} onChange={(e) => onOptionChange('imageQuality', e.target.value)} disabled={processing} className="w-full p-1 border rounded">
                        <option value="standard">Standard</option>
                        <option value="hd">HD</option>
                    </select>
                </div>
                <div>
                    <label>Transition Style</label>
                    <select value={options.imageTransitionStyle || 'fade'} onChange={(e) => onOptionChange('imageTransitionStyle', e.target.value)} disabled={processing} className="w-full p-1 border rounded">
                        <option value="fade">Fade</option>
                        <option value="none">None</option>
                        <option value="slide">Slide</option>
                        <option value="zoom">Zoom</option>
                    </select>
                </div>
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Custom Image Analysis Prompt</label>
                <textarea
                    value={options.imageAnalysisPrompt || ''}
                    onChange={(e) => onOptionChange('imageAnalysisPrompt', e.target.value)}
                    placeholder={`Analyze this video transcript about "{topic}" and suggest optimal AI-generated image placements. The video is {duration} seconds long.

**IMAGE GENERATION STRATEGY:**
- Use for specific explanations, diagrams, complex concepts
- Descriptions should be detailed for image generation
- 2-4 generated images maximum
- Focus on concepts that need visual diagrams or illustrations
- CRITICAL: DALL-E MUST NOT generate ANY text, words, letters, numbers, labels, or annotations in images
- Images should be purely visual with NO TEXT whatsoever

For each suggestion, provide:
1. Start time (in seconds) - when to begin showing the image
2. Duration (in seconds) - how long it should display (3-6 seconds)
3. Detailed description for AI image generation (NO TEXT in images)
4. Content description - what's being explained during this time

Respond in JSON format:
{
  "image_suggestions": [
    {
      "start_time": 25.8,
      "duration": 4.0,
      "image_description": "Professional medical diagram showing the cross-linking process of IgE antibodies on mast cell surfaces, with visual arrows and binding sites highlighted, clean white background, educational illustration style with no text or labels",
      "content_description": "Explanation of IgE cross-linking mechanism"
    }
  ]
}

Transcript: {transcript}`}
                    className="w-full p-2 border rounded text-xs font-mono"
                    rows={8}
                />
                <p className="text-xs text-gray-600 mt-1">Leave blank to use default prompt shown above. Use {`{transcript}`}, {`{topic}`}, and {`{duration}`} as placeholders.</p>
            </div>
        </div>
      </div>
    ),
    skipSubtitles: (
      <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
        <h4 className="font-medium text-orange-900 mb-3 flex items-center gap-2"><MessageSquare className="w-4 h-4" />Subtitle Burn Settings</h4>
         <div className="space-y-2">
            <label>Style</label>
            <select value={options.captionStyle || 'social'} onChange={(e) => onOptionChange('captionStyle', e.target.value)} className="w-full p-1 border rounded">
                <option value="random">🎲 Random (varies per video)</option>
                <option value="social">Social</option>
                <option value="animated">Animated</option>
                <option value="basic">Basic</option>
            </select>
            <label>Position</label>
             <select value={options.captionPosition || 'bottom'} onChange={(e) => onOptionChange('captionPosition', e.target.value)} className="w-full p-1 border rounded">
                <option value="random">🎲 Random (varies per video)</option>
                <option value="bottom">Bottom</option>
                <option value="center">Center</option>
                <option value="top">Top</option>
            </select>
            <label>Font Size</label>
            <input 
                type="number" 
                value={options.subtitleFontSize || 8} 
                onChange={(e) => onOptionChange('subtitleFontSize', parseInt(e.target.value, 10))} 
                min="4" 
                max="24" 
                className="w-full p-1 border rounded" 
            />
            <p className="text-xs text-orange-700">Default: 8 (recommended for most videos)</p>
        </div>
      </div>
    ),
    skipTopicCard: (
        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
             <h4 className="font-medium text-emerald-900 mb-3"><Hash className="w-4 h-4 inline-block mr-2" />Topic Card Settings</h4>
             <label>Style</label>
             <select value={options.topicCardStyle || 'medical'} onChange={(e) => onOptionChange('topicCardStyle', e.target.value)} className="w-full p-1 border rounded">
                 <option value="random">🎲 Random (varies per video)</option>
                 <option value="medical">Medical</option>
                 <option value="tech">Tech</option>
                 <option value="education">Education</option>
             </select>
             <label>Duration (s)</label>
             <input type="number" value={options.topicCardDuration || 3} onChange={(e) => onOptionChange('topicCardDuration', parseFloat(e.target.value))} className="w-full p-1 border rounded" />
        </div>
    ),
     skipFrame: (
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
             <h4 className="font-medium text-orange-900 mb-3 flex items-center gap-2">
               <FrameIcon className="w-4 h-4" />Frame Settings
             </h4>
             
             <div className="space-y-3">
               <div>
                 <label>Frame Style</label>
                 <select 
                   value={options.frameStyle || 'rainbow'} 
                   onChange={(e) => onOptionChange('frameStyle', e.target.value)}
                   disabled={processing}
                   className="w-full p-1 border rounded"
                 >
                   <option value="random">🎲 Random (varies per video)</option>
                   {FRAME_STYLES.map(style => (
                     <option key={style} value={style}>{style.charAt(0).toUpperCase() + style.slice(1).replace('-', ' ')}</option>
                   ))}
                 </select>
               </div>
               <div className="grid grid-cols-2 gap-2">
                 <div>
                   <label>Frame Width</label>
                   <input 
                     type="number" 
                     value={options.frameWidth || 10} 
                     onChange={(e) => onOptionChange('frameWidth', parseInt(e.target.value))} 
                     disabled={processing} 
                     className="w-full p-1 border rounded" 
                   />
                 </div>
                 <div>
                   <label>Opacity (%)</label>
                   <input 
                     type="number" 
                     value={options.frameOpacity || 80} 
                     onChange={(e) => onOptionChange('frameOpacity', parseInt(e.target.value))} 
                     disabled={processing} 
                     className="w-full p-1 border rounded" 
                   />
                 </div>
               </div>
             </div>
        </div>
    ),
    skipFlashLogo: (
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
             <h4 className="font-medium text-purple-900 mb-3"><Sparkles className="w-4 h-4 inline-block mr-2" />Flash Logo Settings</h4>
             <label>Logo Path</label>
             <input type="text" placeholder="e.g., /path/to/logo.png" value={options.logoPath || ''} onChange={(e) => onOptionChange('logoPath', e.target.value)} className="w-full p-1 border rounded" />
             <label>Duration (s)</label>
             <input type="number" value={options.logoDisplayDuration || 2} onChange={(e) => onOptionChange('logoDisplayDuration', parseFloat(e.target.value))} className="w-full p-1 border rounded" />
        </div>
    ),
    skipThumbnail: (
        <div className="bg-pink-50 border border-pink-200 rounded-lg p-4">
             <h4 className="font-medium text-pink-900 mb-3"><Image className="w-4 h-4 inline-block mr-2" />Thumbnail Settings</h4>
             <label>Generation Mode</label>
             <select value={options.thumbnailMode || 'landscape-only'} onChange={(e) => onOptionChange('thumbnailMode', e.target.value)} className="w-full p-1 border rounded">
                 <option value="landscape-only">Landscape Only (Default)</option>
                 <option value="force-generate">Force For All</option>
             </select>
        </div>
    ),
    skipBadTakeRemoval: (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <h4 className="font-medium text-red-900 mb-3 flex items-center gap-2">
                <Trash2 className="w-4 h-4" />Bad Take Removal Settings 
                <span className="ml-auto text-xs bg-purple-500 text-white px-2 py-1 rounded">🤖 AI-Powered</span>
            </h4>
            
            {/* AI Mode Settings */}
            <div className="space-y-3 mb-4">
                <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg p-3 border border-purple-300">
                    <h5 className="font-medium text-purple-900 mb-2 flex items-center gap-2">
                        🧠 AI Detection Mode
                    </h5>
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Detection Mode</label>
                        <select 
                            value={options.badTakeDetectionMode || 'ai'} 
                            onChange={(e) => onOptionChange('badTakeDetectionMode', e.target.value)} 
                            className="w-full p-2 border rounded text-sm bg-white"
                        >
                            <option value="ai">🤖 AI-Powered (Recommended)</option>
                            <option value="hybrid">⚡ Hybrid (AI + Rules)</option>
                            <option value="rule-based">📋 Rule-Based (Fast)</option>
                        </select>
                        <p className="text-xs text-purple-700">
                            {options.badTakeDetectionMode === 'ai' && '✨ GPT-4o analyzes each scenario intelligently'}
                            {options.badTakeDetectionMode === 'hybrid' && '⚡ Combines AI analysis with rule-based filters'}
                            {options.badTakeDetectionMode === 'rule-based' && '📋 Uses pattern matching (faster, less accurate)'}
                        </p>
                    </div>
                </div>
                
                {/* AI-Specific Settings (only show in AI/Hybrid mode) */}
                {(options.badTakeDetectionMode === 'ai' || options.badTakeDetectionMode === 'hybrid') && (
                    <div className="bg-white rounded-lg p-3 border border-purple-300">
                        <h5 className="font-medium text-purple-800 mb-2">AI Configuration</h5>
                        <div className="space-y-2">
                            <label className="text-sm">AI Model</label>
                            <select 
                                value={options.badTakeAIModel || 'gpt-4o'} 
                                onChange={(e) => onOptionChange('badTakeAIModel', e.target.value)} 
                                className="w-full p-1 border rounded text-sm"
                            >
                                <option value="gpt-4o">GPT-4o (Most Accurate)</option>
                                <option value="gpt-4o-mini">GPT-4o Mini (Faster)</option>
                            </select>
                            
                            <label className="text-sm">Context Window (segments)</label>
                            <input 
                                type="number" 
                                min="3" 
                                max="10" 
                                value={options.badTakeContextWindow || 5} 
                                onChange={(e) => onOptionChange('badTakeContextWindow', parseInt(e.target.value))} 
                                className="w-full p-1 border rounded text-sm" 
                            />
                            <p className="text-xs text-gray-600">AI sees this many segments before/after for context</p>
                            
                            <label className="flex items-center gap-2 text-sm">
                                <input 
                                    type="checkbox" 
                                    checked={options.badTakeUseAudioAnalysis !== false} 
                                    onChange={(e) => onOptionChange('badTakeUseAudioAnalysis', e.target.checked)} 
                                />
                                <span>Include Audio Analysis (pitch, energy, tone)</span>
                            </label>
                            
                            <label className="text-sm">Custom AI Instructions (optional)</label>
                            <textarea 
                                value={options.badTakeCustomInstructions || ''} 
                                onChange={(e) => onOptionChange('badTakeCustomInstructions', e.target.value)} 
                                placeholder="e.g., 'This is medical content, be conservative with corrections...'"
                                className="w-full p-2 border rounded text-xs h-16"
                            />
                        </div>
                    </div>
                )}
                
                {/* Universal Settings */}
                <div className="bg-white rounded-lg p-3 border border-red-300">
                    <h5 className="font-medium text-red-800 mb-2">Detection Settings</h5>
                    <div className="space-y-2">
                        <label className="text-sm">Confidence Threshold</label>
                        <input 
                            type="range" 
                            min="0.5" 
                            max="1" 
                            step="0.05" 
                            value={options.badTakeConfidenceThreshold || 0.7} 
                            onChange={(e) => onOptionChange('badTakeConfidenceThreshold', parseFloat(e.target.value))} 
                            className="w-full" 
                        />
                        <div className="text-xs text-red-700">
                            Confidence: {((options.badTakeConfidenceThreshold || 0.7) * 100).toFixed(0)}%
                            {options.badTakeConfidenceThreshold < 0.6 && ' (⚠️ May remove too much)'}
                            {options.badTakeConfidenceThreshold > 0.85 && ' (⚠️ May miss some)'}
                        </div>
                    </div>
                </div>
                
                {/* Rule-Based Settings (only show in rule-based/hybrid mode) */}
                {(options.badTakeDetectionMode === 'rule-based' || options.badTakeDetectionMode === 'hybrid') && (
                    <div className="bg-white rounded-lg p-3 border border-red-300">
                        <h5 className="font-medium text-red-800 mb-2">
                            Rule-Based Scenario Detection
                            {options.badTakeDetectionMode === 'hybrid' && <span className="text-xs ml-2 text-purple-600">(used as pre-filter)</span>}
                        </h5>
                        <div className="space-y-2">
                        <label className="flex items-center gap-2 text-sm">
                            <input 
                                type="checkbox" 
                                checked={options.badTakeDetectStutters !== false} 
                                onChange={(e) => onOptionChange('badTakeDetectStutters', e.target.checked)} 
                            />
                            <span>Detect Stutters (e.g., "Hi... Hi everyone")</span>
                        </label>
                        <label className="flex items-center gap-2 text-sm">
                            <input 
                                type="checkbox" 
                                checked={options.badTakeDetectFalseStarts !== false} 
                                onChange={(e) => onOptionChange('badTakeDetectFalseStarts', e.target.checked)} 
                            />
                            <span>Detect False Starts (incomplete → complete)</span>
                        </label>
                        <label className="flex items-center gap-2 text-sm">
                            <input 
                                type="checkbox" 
                                checked={options.badTakeDetectSelfCorrections !== false} 
                                onChange={(e) => onOptionChange('badTakeDetectSelfCorrections', e.target.checked)} 
                            />
                            <span>Detect Self-Corrections (wait, actually, etc.)</span>
                        </label>
                        <label className="flex items-center gap-2 text-sm">
                            <input 
                                type="checkbox" 
                                checked={options.badTakeDetectFillerRetakes !== false} 
                                onChange={(e) => onOptionChange('badTakeDetectFillerRetakes', e.target.checked)} 
                            />
                            <span>Detect Filler Retakes (um, uh, err)</span>
                        </label>
                        <label className="flex items-center gap-2 text-sm">
                            <input 
                                type="checkbox" 
                                checked={options.badTakeDetectBreathPauses !== false} 
                                onChange={(e) => onOptionChange('badTakeDetectBreathPauses', e.target.checked)} 
                            />
                            <span>Detect Breath Pauses (1.5-3s pause)</span>
                        </label>
                        <label className="flex items-center gap-2 text-sm">
                            <input 
                                type="checkbox" 
                                checked={options.badTakeDetectPartialSentences !== false} 
                                onChange={(e) => onOptionChange('badTakeDetectPartialSentences', e.target.checked)} 
                            />
                            <span>Detect Partial Sentences</span>
                        </label>
                        <label className="flex items-center gap-2 text-sm">
                            <input 
                                type="checkbox" 
                                checked={options.badTakePreferCompleteTakes !== false} 
                                onChange={(e) => onOptionChange('badTakePreferCompleteTakes', e.target.checked)} 
                            />
                            <span>Prefer Complete Takes (proper punctuation)</span>
                        </label>
                        <label className="flex items-center gap-2 text-sm">
                            <input 
                                type="checkbox" 
                                checked={options.badTakePreferConfidentDelivery !== false} 
                                onChange={(e) => onOptionChange('badTakePreferConfidentDelivery', e.target.checked)} 
                            />
                            <span>Prefer Confident Delivery</span>
                        </label>
                    </div>
                </div>
                )}
                
                {/* Advanced Tuning - Only for Rule-Based */}
                {(options.badTakeDetectionMode === 'rule-based' || options.badTakeDetectionMode === 'hybrid') && (
                    <details className="bg-white rounded-lg border border-red-300">
                        <summary className="font-medium text-red-800 p-3 cursor-pointer hover:bg-red-100 rounded-lg">
                            Advanced Rule Tuning (Optional)
                        </summary>
                    <div className="p-3 pt-0 space-y-3">
                        {/* Stutter Settings */}
                        <div className="border-t pt-2">
                            <label className="text-xs font-medium text-red-700">Stutter Word Limit</label>
                            <input 
                                type="number" 
                                min="1" 
                                max="5" 
                                value={options.badTakeStutterWordLimit || 3} 
                                onChange={(e) => onOptionChange('badTakeStutterWordLimit', parseInt(e.target.value))} 
                                className="w-full p-1 border rounded text-sm" 
                            />
                            <p className="text-xs text-gray-600">Max words to consider as stutter</p>
                        </div>
                        
                        {/* False Start Settings */}
                        <div className="border-t pt-2">
                            <label className="text-xs font-medium text-red-700">False Start Threshold</label>
                            <input 
                                type="range" 
                                min="0.7" 
                                max="0.95" 
                                step="0.05" 
                                value={options.badTakeFalseStartThreshold || 0.85} 
                                onChange={(e) => onOptionChange('badTakeFalseStartThreshold', parseFloat(e.target.value))} 
                                className="w-full" 
                            />
                            <p className="text-xs text-gray-600">Current: {((options.badTakeFalseStartThreshold || 0.85) * 100).toFixed(0)}%</p>
                        </div>
                        
                        {/* Self-Correction Keywords */}
                        <div className="border-t pt-2">
                            <label className="text-xs font-medium text-red-700">Self-Correction Keywords (comma-separated)</label>
                            <input 
                                type="text" 
                                value={options.badTakeSelfCorrectionKeywords || 'wait, sorry, actually, i mean, let me, hold on'} 
                                onChange={(e) => onOptionChange('badTakeSelfCorrectionKeywords', e.target.value)} 
                                className="w-full p-1 border rounded text-xs" 
                                placeholder="wait, sorry, actually, i mean..."
                            />
                        </div>
                        
                        {/* Context Clue Boost */}
                        <div className="border-t pt-2">
                            <label className="text-xs font-medium text-red-700">Context Clue Boost</label>
                            <input 
                                type="range" 
                                min="0.05" 
                                max="0.3" 
                                step="0.05" 
                                value={options.badTakeContextClueBoost || 0.15} 
                                onChange={(e) => onOptionChange('badTakeContextClueBoost', parseFloat(e.target.value))} 
                                className="w-full" 
                            />
                            <p className="text-xs text-gray-600">Current: {((options.badTakeContextClueBoost || 0.15) * 100).toFixed(0)}%</p>
                        </div>
                        
                        {/* Filler Word Threshold */}
                        <div className="border-t pt-2">
                            <label className="text-xs font-medium text-red-700">Filler Word Threshold</label>
                            <input 
                                type="range" 
                                min="0.1" 
                                max="0.5" 
                                step="0.05" 
                                value={options.badTakeFillerWordThreshold || 0.3} 
                                onChange={(e) => onOptionChange('badTakeFillerWordThreshold', parseFloat(e.target.value))} 
                                className="w-full" 
                            />
                            <p className="text-xs text-gray-600">Current: {((options.badTakeFillerWordThreshold || 0.3) * 100).toFixed(0)}% (ratio of fillers to words)</p>
                        </div>
                        
                        {/* Breath Pause Range */}
                        <div className="border-t pt-2">
                            <label className="text-xs font-medium text-red-700">Breath Pause Min (seconds)</label>
                            <input 
                                type="number" 
                                min="0.5" 
                                max="3" 
                                step="0.1" 
                                value={options.badTakeBreathPauseMin || 1.5} 
                                onChange={(e) => onOptionChange('badTakeBreathPauseMin', parseFloat(e.target.value))} 
                                className="w-full p-1 border rounded text-sm" 
                            />
                            <label className="text-xs font-medium text-red-700 mt-1">Breath Pause Max (seconds)</label>
                            <input 
                                type="number" 
                                min="1" 
                                max="5" 
                                step="0.1" 
                                value={options.badTakeBreathPauseMax || 3.0} 
                                onChange={(e) => onOptionChange('badTakeBreathPauseMax', parseFloat(e.target.value))} 
                                className="w-full p-1 border rounded text-sm" 
                            />
                        </div>
                        
                        {/* Length Bias */}
                        <div className="border-t pt-2">
                            <label className="text-xs font-medium text-red-700">Length Bias Threshold</label>
                            <input 
                                type="range" 
                                min="1.1" 
                                max="2.0" 
                                step="0.1" 
                                value={options.badTakeLengthBiasThreshold || 1.3} 
                                onChange={(e) => onOptionChange('badTakeLengthBiasThreshold', parseFloat(e.target.value))} 
                                className="w-full" 
                            />
                            <p className="text-xs text-gray-600">Keep if {(options.badTakeLengthBiasThreshold || 1.3).toFixed(1)}x longer</p>
                        </div>
                    </div>
                </details>
                )}
                
                <div className="bg-blue-100 border border-blue-300 rounded p-2 text-xs text-blue-800">
                    <strong>💡 Tip:</strong> AI mode (default) is most accurate. Use Rule-Based for faster processing.
                    {options.badTakeDetectionMode === 'ai' && ' GPT-4o will analyze each scenario intelligently.'}
                </div>
            </div>
        </div>
    ),
    skipEnhancedAutoZoom: (
        <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
            <h4 className="font-medium text-indigo-900 mb-3 flex items-center gap-2"><ScanEye className="w-4 h-4" />Enhanced Auto Zoom Settings</h4>
            <div className="space-y-2">
                <label>Zoom Mode</label>
                <select value={options.autoZoomMode || 'hybrid'} onChange={(e) => onOptionChange('autoZoomMode', e.target.value)} className="w-full p-1 border rounded">
                    <option value="face-detection">Face Detection Only</option>
                    <option value="focal-point">Focal Point Detection</option>
                    <option value="hybrid">Hybrid (Recommended)</option>
                </select>
                <label>Zoom Intensity</label>
                <select value={options.autoZoomIntensity || 'medium'} onChange={(e) => onOptionChange('autoZoomIntensity', e.target.value)} className="w-full p-1 border rounded">
                    <option value="subtle">Subtle</option>
                    <option value="medium">Medium</option>
                    <option value="strong">Strong</option>
                </select>
                <label>Smoothness</label>
                <select value={options.autoZoomSmoothness || 'high'} onChange={(e) => onOptionChange('autoZoomSmoothness', e.target.value)} className="w-full p-1 border rounded">
                    <option value="low">Low (faster transitions)</option>
                    <option value="medium">Medium</option>
                    <option value="high">High (smoother)</option>
                </select>
                <label>Target Aspect Ratio</label>
                <select value={options.autoZoomAspectRatio || 'auto'} onChange={(e) => onOptionChange('autoZoomAspectRatio', e.target.value)} className="w-full p-1 border rounded">
                    <option value="auto">Auto (preserve original)</option>
                    <option value="9:16">9:16 (Vertical)</option>
                    <option value="1:1">1:1 (Square)</option>
                    <option value="16:9">16:9 (Horizontal)</option>
                </select>
                <div className="flex items-center space-x-2">
                    <input 
                        type="checkbox" 
                        checked={options.autoZoomPauseDetection || false} 
                        onChange={(e) => onOptionChange('autoZoomPauseDetection', e.target.checked)} 
                        className="rounded"
                    />
                    <label className="text-sm">Zoom out during pauses</label>
                </div>
                <div className="flex items-center space-x-2">
                    <input 
                        type="checkbox" 
                        checked={options.autoZoomSectionChangeDetection || false} 
                        onChange={(e) => onOptionChange('autoZoomSectionChangeDetection', e.target.checked)} 
                        className="rounded"
                    />
                    <label className="text-sm">Adjust zoom on topic changes</label>
                </div>
            </div>
        </div>
    ),
    skipBackgroundMusic: (
        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
            <h4 className="font-medium text-emerald-900 mb-3 flex items-center gap-2"><Music className="w-4 h-4" />Background Music</h4>
            <div className="space-y-2">
                <label>Music Track</label>
                <select value={options.musicTrack || 'none'} onChange={(e) => onOptionChange('musicTrack', e.target.value)} className="w-full p-1 border rounded">
                    <option value="random">🎲 Random (varies per video)</option>
                    <option value="none">None</option>
                    {musicLoading ? (
                      <option disabled>Loading music files...</option>
                    ) : (
                      musicFiles.map(file => (
                        <option key={file.name} value={file.name}>
                          {file.displayName}
                        </option>
                      ))
                    )}
                </select>
                {musicFiles.length > 0 && (
                  <p className="text-xs text-emerald-700">
                    Found {musicFiles.length} music file{musicFiles.length !== 1 ? 's' : ''} in data/assets/music folder
                  </p>
                )}
            </div>
        </div>
    ),
    skipSoundEffects: (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <h4 className="font-medium text-yellow-900 mb-3 flex items-center gap-2"><Bell className="w-4 h-4" />Sound Effects Settings</h4>
            <div className="space-y-2">
                <label>Pack</label>
                <select value={options.soundEffectPack || 'none'} onChange={(e) => onOptionChange('soundEffectPack', e.target.value)} className="w-full p-1 border rounded">
                    <option value="random">🎲 Random (varies per video)</option>
                    <option value="none">None</option>
                    <option value="sound-effects">Sound Effects (Quality Swoosh Sounds)</option>
                </select>
            </div>
        </div>
    ),
  };
  
  return (
    <div className="bg-white rounded-xl shadow-md p-6 relative">
      <h3 className="text-xl font-bold text-gray-800 mb-4">Processing Workflow</h3>
      
      <div className="flex flex-wrap gap-3 justify-start mb-6 relative">
        {processingSteps.map((step, index) => {
          const StepIcon = step.icon;
          const isSkipped = options[step.skip as keyof ProcessingOptions] as boolean;
          const settingsKey = getSettingsKeyForStep(step.name);
          const hasSettings = settingsKey && settingsPanels[settingsKey];
          
          return (
            <div key={step.name} className="flex items-center relative">
              <div 
                className={`p-3 rounded-lg border-2 transition-all cursor-pointer min-w-[120px] relative ${
                  isSkipped ? 'border-gray-200 bg-gray-50' : 'border-blue-500 bg-blue-50'
                } ${hasSettings ? 'hover:shadow-lg hover:border-blue-600' : ''}`}
                onClick={() => onOptionChange(step.skip as keyof ProcessingOptions, !isSkipped)}
                onMouseEnter={() => hasSettings && handleStepMouseEnter(step.name)}
                onMouseLeave={handleMouseLeave}
              >
                <div className="flex items-center justify-between">
                  <span className={`text-sm font-bold ${isSkipped ? 'text-gray-500' : 'text-blue-800'}`}>
                    {step.name}
                  </span>
                  <div className="flex items-center gap-1">
                    <StepIcon className={`w-5 h-5 ${isSkipped ? 'text-gray-400' : 'text-blue-600'}`} />
                    {hasSettings && (
                      <Settings className={`w-3 h-3 ${isSkipped ? 'text-gray-400 opacity-40' : 'text-blue-500 opacity-60'}`} />
                    )}
                  </div>
                </div>
                <p className={`text-xs mt-1 ${isSkipped ? 'text-gray-500' : 'text-gray-700'}`}>
                  {step.description}
                </p>
              </div>
              
              {/* Settings Overlay */}
              {settingsVisible === step.name && hasSettings && (
                <div 
                  ref={overlayRef}
                  className={`absolute top-full left-0 mt-2 z-50 min-w-[320px] max-w-[480px] shadow-2xl border-2 rounded-lg bg-white ${
                    isSkipped ? 'border-gray-300' : 'border-blue-200'
                  }`}
                  onMouseEnter={handleSettingsMouseEnter}
                  onMouseLeave={handleMouseLeave}
                  style={{
                    transform: index > processingSteps.length / 2 ? 'translateX(-60%)' : 'translateX(0)',
                  }}
                >
                  <div className="p-1">
                    {settingsPanels[settingsKey]}
                  </div>
                  {/* Arrow pointing up to the step */}
                  <div 
                    className={`absolute -top-2 w-4 h-4 bg-white border-l-2 border-t-2 transform rotate-45 ${
                      isSkipped ? 'border-gray-300' : 'border-blue-200'
                    }`}
                    style={{
                      left: index > processingSteps.length / 2 ? '60%' : '20px',
                    }}
                  />
                </div>
              )}
              
              {/* Add arrow between steps */}
              {index < processingSteps.length - 1 && (
                <div className="mx-2 text-gray-400 text-lg">
                  →
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Optional: Show hint about hoverable settings */}
      <div className="text-xs text-gray-500 text-center mt-4 flex items-center justify-center gap-2">
        <Settings className="w-4 h-4" />
        <span>Hover over enabled steps to see configuration options</span>
      </div>
    </div>
  );
};

export default ProcessingStepsConfig; 