import { Volume2, Scissors, MessageSquare, FileText, Image, PlusCircle, Youtube, Wand2, FrameIcon, Sparkles, Settings, Upload, Hash, Film, Zap, Camera, Music, Bell, Brain, Layers, Palette, Trash2, ScanEye } from 'lucide-react';
import type { ProcessingStep, ProcessingOptions } from '../types';

// Processing Steps Configuration - Organized by Technical & Viewer Experience Flow
export const PROCESSING_STEPS: ProcessingStep[] = [
  // ================= PHASE 1: Audio Clean-up & Timing Lock =================
  { 
    name: 'Audio Enhancement', 
    icon: Volume2, 
    skip: 'skipAudio', 
    description: 'Normalize audio and reduce noise' 
  },
  { 
    name: 'Silence Removal', 
    icon: Scissors, 
    skip: 'skipSilence', 
    description: 'Remove silent gaps for tighter content' 
  },
  { 
    name: 'Transcription', 
    icon: FileText, 
    skip: 'skipTranscription', 
    description: 'Generate speech-to-text subtitles' 
  },
  {
    name: 'Bad Take Removal',
    icon: Trash2,
    skip: 'skipBadTakeRemoval',
    description: 'Detect and remove repeated lines using text + audio similarity'
  },
  { 
    name: 'GPT Correction', 
    icon: Wand2, 
    skip: 'skipGpt', 
    description: 'Fix medical terms & re-line text (≤12 words/line)' 
  },

  // ================= PHASE 2: Semantic Analysis & Content Insertion =================
  { 
    name: 'AI Topic Detection', 
    icon: Brain, 
    skip: 'skipTopicDetection', 
    description: 'Auto-detect video topic for hashtags/titles' 
  },
  { 
    name: 'AI Multimedia Analysis', 
    icon: Layers, 
    skip: 'skipMultimediaAnalysis', 
    description: 'Find visual anchor points in corrected transcript'
  },
  {
    name: 'AI Highlights',
    icon: Zap,
    skip: 'skipAiHighlights',
    description: 'Choose key phrases (relies on multimedia analysis)'
  },
  { 
    name: 'AI B-Roll', 
    icon: Film, 
    skip: 'skipBroll', 
    description: 'Inject intelligent stock clips at anchor points'
  },
  { 
    name: 'AI Image Generation', 
    icon: Palette, 
    skip: 'skipImageGeneration', 
    description: 'Generate custom DALL-E illustrations'
  },
  {
    name: 'Enhanced Auto Zoom',
    icon: ScanEye,
    skip: 'skipEnhancedAutoZoom',
    description: 'Intelligent face/focal point detection with context-aware zooming'
  },

  // ================= PHASE 3: Narrative Structure (Hook → Body → CTA) =================
  { 
    name: 'Topic Title Card', 
    icon: Hash, 
    skip: 'skipTopicCard', 
    description: 'Animated 3s intro hook that viewers see first'
  },
  { 
    name: 'Flash Logo', 
    icon: Sparkles, 
    skip: 'skipFlashLogo', 
    description: '0.5-1s stinger right after title card' 
  },
  { 
    name: 'Outro Addition', 
    icon: PlusCircle, 
    skip: 'skipOutro', 
    description: '3-4s CTA block at the end' 
  },

  // ================= PHASE 4: Styling & Visual Polish =================
  { 
    name: 'Add Frame', 
    icon: FrameIcon, 
    skip: 'skipFrame', 
    description: 'Gradient border (Shorts) - before subtitle burn' 
  },
  { 
    name: 'Subtitle Burning', 
    icon: MessageSquare, 
    skip: 'skipSubtitles', 
    description: 'Embed styled captions after frame (prevents masking)' 
  },
  { 
    name: 'Background Music',
    icon: Music,
    skip: 'skipBackgroundMusic',
    description: 'Lay music bed after subtitles to preserve timing'
  },
  {
    name: 'Sound Effects',
    icon: Bell,
    skip: 'skipSoundEffects',
    description: 'Drop pops on highlight moments'
  },

  // ================= PHASE 5: Packaging for Upload =================
  { 
    name: 'Thumbnail Generation', 
    icon: Image, 
    skip: 'skipThumbnail', 
    description: 'Generate thumbnails with frozen final frame context' 
  },
  { 
    name: 'Playlist Assignment', 
    icon: Youtube, 
    skip: 'skipPlaylist', 
    description: 'Use topic tags and channel cache to slot video' 
  },
];

// Processing Modes
export const PROCESSING_MODES = [
  {
    mode: 'dry-run' as const,
    title: '🧪 Test Run',
    description: 'Process videos without uploading',
    detail: 'Perfect for testing your settings and seeing the results',
    color: 'blue'
  },
  {
    mode: 'process-only' as const,
    title: '⚙️ Process Only',
    description: 'Create final videos but don\'t upload',
    detail: 'Generate content, thumbnails, and prepare files for manual upload',
    color: 'green'
  },
  {
    mode: 'full-upload' as const,
    title: '🚀 Single Upload',
    description: 'Process one video and upload',
    detail: 'Complete workflow for individual video uploads',
    color: 'purple'
  },
  {
    mode: 'batch-upload' as const,
    title: '📦 Batch Upload',
    description: 'Process ALL videos and upload',
    detail: 'Most efficient for multiple videos with smart scheduling',
    color: 'orange'
  }
];

// Supported Video Formats
export const SUPPORTED_VIDEO_FORMATS = [
  '.mp4', '.mov', '.avi', '.mkv', '.webm', '.m4v', '.flv', '.wmv'
];

// Frame Style Options
export const FRAME_STYLES = [
  'rainbow',
  'medical-blue',
  'gradient-purple',
  'black',
  'white',
  'gold',
  'silver',
  'neon',
  'subtle-shadow',
  'double-line',
  'rounded-corners',
  'professional',
  'educational',
  'none'
];

// Default Settings
export const DEFAULT_SETTINGS: ProcessingOptions = {
  mode: 'dry-run',
  title: '',
  description: '',
  tags: [],
  schedule: (() => { const d = new Date(); d.setDate(d.getDate() + 1); return d.toISOString().split('T')[0]; })(),
  scheduleMode: 'standard',
  useGptForDescription: true,
  useGptForTags: true,
  useGptForTitle: false,
  socialPlatforms: ['youtube'],
  preferredTime: '07:00',
  // Skipped steps
  skipAudio: true,
  skipSilence: false,
  skipTranscription: false,
  skipTopicDetection: false,
  skipGpt: false,
  skipAiHighlights: false,
  skipMultimediaAnalysis: false,
  skipBroll: false,
  skipImageGeneration: false,
  skipDynamicZoom: false,
  skipBackgroundMusic: false,
  skipSoundEffects: true,
  skipSubtitles: false,
  skipTopicCard: false,
  skipFrame: false,
  skipFlashLogo: false,
  skipOutro: false,
  skipThumbnail: false,
  skipPlaylist: false,

  // Audio Enhancement (When Enabled)
  useFfmpegEnhance: false,
  useAiDenoiser: false,
  useVoicefixer: false,

  // Silence Removal
  silenceThreshold: 0.025,
  silenceMargin: 0.20,
  smartSilenceDetection: true,

  // Transcription
  whisperModel: 'small',

  // GPT Correction
  gptModel: 'gpt-4o-mini',

  // AI Highlights
  useAiHighlights: true,
  highlightStyle: 'lime',

  // AI B-Roll
  useAiBroll: true,
  brollClipCount: 2,
  brollClipDuration: 4,
  brollTransitionStyle: 'fade',

  // AI Topic Detection
  topicDetectionModel: 'gpt-4o-mini',
  
  // AI Multimedia Analysis
  multimediaAnalysisModel: 'gpt-4o',
  maxBrollSuggestions: 2,
  maxImageSuggestions: 2,
  
  // AI Image Generation
  imageGenerationModel: 'dall-e-3',
  imageGenerationCount: 2,
  imageQuality: 'standard',
  imageSize: '1024x1024',
  imageTransitionStyle: 'fade',

  // Dynamic Zoom
  zoomIntensity: 'subtle',
  zoomFrequency: 'medium',
  zoomDuration: 0.5,

  // Topic Title Card
  topicCardStyle: 'medical',
  topicCardDuration: 3,
  topicCardPosition: 'top',
  topicCardAnimation: 'slide',

  // Flash Logo
  logoPath: '/Users/blakeyoung/Library/Mobile Documents/com~apple~CloudDocs/Coding1/Python/Youtube Uploader/data/assets/logos/subscribe_button.png',
  logoDisplayDuration: 3,
  logoPosition: 'top-right',
  logoFadeInDuration: 0.3,

  // Outro
  outroStyle: 'default',
  outroDuration: 4,
  outroPosition: 'center',

  // Background Music
  musicTrack: 'random',
  musicSpeechVolume: 1.0,
  musicBackgroundVolume: 0.5,
  musicFadeInDuration: 1.0,
  musicFadeOutDuration: 1.0,

  // Sound Effects
  soundEffectPack: 'sound-effects',
  soundEffectVolume: 50,
  soundEffectTiming: 'auto',
  soundEffectKeywordSync: false,
  soundEffectDuration: 0.3,

  // Frame
  frameStyle: 'rainbow',
  frameWidth: 10,
  frameOpacity: 80,

  // Subtitle Burning
  captionStyle: 'social',
  captionAnimation: 'slide',
  captionBackground: 'bar',
  captionPosition: 'bottom',
  autoKeywordBold: true,
  maxWordsPerLine: 2,  // 🎯 [LANDSCAPE FIX] Reduced from 4 to 2 for better readability on landscape videos
  subtitleFontSize: 8,
  subtitleColor: '#FFFFFF',
  subtitleStrokeColor: '#000000',
  subtitleStrokeWidth: 2,

  // Thumbnail Generation
  thumbnailMode: 'landscape-only',
  thumbnailStyle: 'professional',
  thumbnailTextOverlay: true,

  // Playlist Assignment  
  autoPlaylistAssignment: true,
  playlistStrategy: 'topic-based',
  
  // AI Word Highlighting
  useAiWordHighlighting: true,
  highlightColor: '#FF9500',

  // Custom AI Prompts (optional - will use system defaults if empty)
  transcriptionCorrectionPrompt: '',
  aiHighlightsPrompt: '',
  multimediaAnalysisPrompt: '',
  topicDetectionPrompt: '',
  imageGenerationPrompt: 'CRITICAL INSTRUCTION: Create detailed, high-quality images with NO TEXT, NO WORDS, NO LETTERS, and NO NUMBERS. Images must be purely visual with no written elements whatsoever. Focus on clear visual representations only.',
  brollKeywordsPrompt: '',
  videoTitlePrompt: '',
  videoDescriptionPrompt: '',
  videoTagsPrompt: '',
  
  // File Paths
  inputFolder: '/Users/blakeyoung/Library/Mobile Documents/com~apple~CloudDocs/Movies/',
  uploadDestination: '/Users/blakeyoung/Library/Mobile Documents/com~apple~CloudDocs/Coding1/Python/Youtube Uploader/data/uploads',

  // Multi-platform Config
  multiPlatformConfig: {
    general: {
      useProcessedVideo: true,
      generateThumbnails: true,
      scheduleMode: 'delayed',
      defaultDescription: '',
      baseTags: ['medical', 'education', 'usmle'],
      schedule: (() => { const d = new Date(); d.setDate(d.getDate() + 1); return d.toISOString().split('T')[0]; })(),
      preferredTime: '07:00',
      schedulingOptions: {
        mode: 'standard',
        startDate: (() => { const d = new Date(); d.setDate(d.getDate() + 1); return d.toISOString().split('T')[0]; })(),
      },
      processingMode: 'process-only',
      defaultPostingTimes: {
        morning: '07:00',
        afternoon: '16:00',
        evening: '20:00',
      },
      slotInterval: '24h',
    },
    platforms: {},
    youtube: {
      enabled: true,
      title: '',
      description: '',
      tags: [],
      useGptForDescription: true,
      useGptForTags: true,
      useGptForTitle: false,
      channelId: '',
      selectedChannelId: '',
      authenticatedAccounts: [],
      allAvailableChannels: [],
      scheduleMode: 'standard',
      preferredTime: '07:00',
      mode: 'process-only',
    }
  },

  // Audio volume settings
  backgroundMusicVolume: 0.50,

  // Smart Mode Settings - NEW
  useSmartMode: false,
  smartModeRatio: {
    brollPerThirtySeconds: 1.0,
    imagesPerThirtySeconds: 2.0
  },
  
  // Random Mode Settings - NEW
  randomMode: {
    enabled: false,
    frameStyle: false,
    musicTrack: false,
    brollTransitionStyle: false,
    imageTransitionStyle: false,
    highlightStyle: false,
    zoomIntensity: false,
    zoomFrequency: false,
    captionStyle: false,
    captionAnimation: false,
    topicCardStyle: false,
    outroStyle: false,
    soundEffectPack: false
  },

  // Bad Take Removal - AI-Powered (NEW)
  skipBadTakeRemoval: false,
  badTakeDetectionMode: 'ai',  // 'ai' | 'hybrid' | 'rule-based'
  badTakeAIModel: 'gpt-4o',
  badTakeConfidenceThreshold: 0.7,
  badTakeUseAudioAnalysis: true,
  badTakeContextWindow: 5,
  badTakeCustomInstructions: '',
  
  // Legacy/Hybrid Settings
  badTakeDetectionSensitivity: 'medium',
  badTakeMinRepetitionLength: 3,
  badTakeDetectStutters: true,
  badTakeStutterWordLimit: 3,
  badTakeDetectFalseStarts: true,
  badTakeFalseStartThreshold: 0.85,
  badTakeDetectSelfCorrections: true,
  badTakeSelfCorrectionKeywords: 'wait, sorry, actually, i mean, let me, hold on',
  badTakeContextClueBoost: 0.15,
  badTakeDetectFillerRetakes: true,
  badTakeFillerWordThreshold: 0.3,
  badTakeDetectBreathPauses: true,
  badTakeBreathPauseMin: 1.5,
  badTakeBreathPauseMax: 3.0,
  badTakeDetectPartialSentences: true,
  badTakePreferCompleteTakes: true,
  badTakeLengthBiasThreshold: 1.3,
  badTakeDetectIncompleteSentences: true,
  badTakePreferConfidentDelivery: true,

  // Enhanced Auto Zoom - NEW
  skipEnhancedAutoZoom: false,
  autoZoomMode: 'hybrid',
  autoZoomIntensity: 'medium',
  autoZoomSmoothness: 'high',
  autoZoomAspectRatio: 'auto',
  autoZoomPauseDetection: true,
  autoZoomSectionChangeDetection: true
};

// Processing Time Estimation (minutes per GB)
export const PROCESSING_TIME_ESTIMATES = {
  'dry-run': 2,
  'process-only': 8,
  'full-upload': 10,
  'batch-upload': 8
}; 