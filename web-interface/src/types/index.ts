// Video Discovery Types
export interface VideoFile {
  id: string;
  name: string;
  path: string;
  size: number;
  extension: string;
  sizeFormatted: string;
  estimatedDuration?: string;
  isSupported: boolean;
  warnings: string[];
  width?: number;
  height?: number;
  aspectRatio?: number;
  isShort?: boolean;
  duration?: number;
  status?: 'queued' | 'processing' | 'completed' | 'failed';
}

export interface VideoDiscovery {
  videos: VideoFile[];
  totalVideos: number;
  totalSize: string;
  totalSizeBytes: number;
  estimatedTime: string;
  estimatedMinutes: number;
  warnings: string[];
  folderExists: boolean;
  error?: string;
  shortCount?: number;
  regularCount?: number;
  landscapeCount?: number;
}

// Processing Types
export interface ProcessingStep {
  name: string;
  icon: React.ComponentType<any>;
  skip: keyof ProcessingOptions;
  description: string;
}

export interface BatchProgress {
  currentVideo: number;
  totalVideos: number;
  videoName: string;
}

export interface SilenceCutStats {
  seconds_removed: number;
  percentage: number;
  original_duration: number;
  new_duration: number;
  minutes_saved: number;
  seconds_saved: number;
}

export interface VideoCompletion {
  video_id?: string;
  url?: string;
  title?: string;
  playlists?: string[];
  filename?: string;
  date?: string;
  time?: string;
  timestamp: string;
  silence_stats?: {
    seconds_removed: number;
    percentage: number;
    minutes_saved: number;
    seconds_saved: number;
  };
}

// Upload Results
export interface UploadResult {
  video_id: string;
  youtube_url: string;
  title: string;
  description: string;
  tags: string[];
  playlists?: string[];
  scheduled_date: string;
  scheduled_time: string;
  status: string;
  is_short?: boolean;
}

// Random Mode Settings
export interface RandomModeSettings {
  enabled: boolean;
  frameStyle?: boolean;
  musicTrack?: boolean;
  brollTransitionStyle?: boolean;
  imageTransitionStyle?: boolean;
  highlightStyle?: boolean;
  zoomIntensity?: boolean;
  zoomFrequency?: boolean;
  captionStyle?: boolean;
  captionAnimation?: boolean;
  topicCardStyle?: boolean;
  outroStyle?: boolean;
  soundEffectPack?: boolean;
}

// Processing Options
export interface ProcessingOptions {
  mode: 'dry-run' | 'process-only' | 'full-upload' | 'batch-upload';
  title: string;
  description: string;
  tags: string[];
  schedule: string;
  scheduleMode: 'standard' | 'day-and-night' | 'next-slot' | 'time-slot';
  useGptForDescription: boolean;
  useGptForTags: boolean;
  useGptForTitle: boolean;
  skipAudio?: boolean;
  skipSilence?: boolean;
  skipTranscription?: boolean;
  skipTopicDetection: boolean;
  skipGpt?: boolean;
  skipAiHighlights?: boolean;
  skipMultimediaAnalysis: boolean;
  skipBroll?: boolean;
  skipImageGeneration?: boolean;
  skipSubtitles?: boolean;
  skipTopicCard?: boolean;
  skipFrame?: boolean;
  skipFlashLogo?: boolean;
  skipOutro?: boolean;
  skipThumbnail?: boolean;
  skipPlaylist?: boolean;
  socialPlatforms: string[];
  multiPlatformConfig: MultiPlatformConfig;
  inputFolder: string;
  preferredTime?: string;
  useFfmpegEnhance?: boolean;
  useAiDenoiser?: boolean;
  useVoicefixer?: boolean;
  useAiHighlights: boolean;
  useAiBroll: boolean;
  brollClipCount?: number;
  brollClipDuration?: number;
  brollTransitionStyle?: string;
  imageTransitionStyle?: string;
  skipDynamicZoom?: boolean;
  zoomIntensity?: string;
  zoomFrequency?: string;
  skipBackgroundMusic?: boolean;
  musicTrack?: string;
  skipSoundEffects?: boolean;
  openaiKey?: string;
  soundEffectPack?: string;
  silenceThreshold?: number;
  silenceMargin?: number;
  smartSilenceDetection?: boolean;
  thumbnailMode?: string;
  frameStyle?: string;
  logoPath?: string;
  logoDisplayDuration?: number;
  logoPosition: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center';
  captionStyle?: string;
  captionAnimation: 'fade' | 'slide' | 'zoom' | 'bounce';
  captionBackground: 'none' | 'bar' | 'box' | 'outline';
  captionPosition?: string;
  autoKeywordBold: boolean;
  maxWordsPerLine: number;
  topicCardStyle?: string;
  topicCardDuration?: number;
  topicCardPosition: 'top' | 'center' | 'top-left' | 'top-right';
  uploadDestination: string;

  // Transcription
  whisperModel?: string;

  // GPT Correction
  gptModel?: string;

  // AI Highlights
  highlightStyle?: string;

  // AI Topic Detection
  topicDetectionModel: 'gpt-4o-mini' | 'gpt-4-turbo';
  
  // AI Multimedia Analysis
  multimediaAnalysisModel: 'gpt-4o' | 'gpt-4o-mini';
  maxBrollSuggestions: number;
  maxImageSuggestions: number;
  
  // AI Image Generation
  imageGenerationModel: 'dall-e-3' | 'dall-e-2';
  imageQuality?: string;
  imageSize: '1024x1024' | '1792x1024' | '1024x1792';

  // Subtitles
  subtitleFontSize?: number;
  subtitleColor: string;
  subtitleStrokeColor: string;
  subtitleStrokeWidth: number;

  // Dynamic Zoom
  zoomDuration: number;

  // Topic Title Card
  topicCardAnimation: 'slide' | 'fade' | 'zoom' | 'bounce';

  // Flash Logo
  logoFadeInDuration: number;

  // Outro
  outroStyle: 'default' | 'animated' | 'custom';
  outroDuration: number;
  outroPosition: 'center' | 'bottom' | 'top';

  // Background Music
  musicSpeechVolume: number;
  musicBackgroundVolume: number;
  musicFadeInDuration: number;
  musicFadeOutDuration: number;

  // Sound Effects
  soundEffectVolume: number;
  soundEffectTiming: 'auto' | 'manual' | 'synced';
  soundEffectKeywordSync: boolean;
  soundEffectDuration: number;

  // Frame
  frameWidth: number;
  frameOpacity: number;

  // Thumbnail Generation
  thumbnailStyle: 'professional' | 'bold' | 'minimal' | 'custom';
  thumbnailTextOverlay: boolean;

  // Playlist Assignment
  autoPlaylistAssignment: boolean;
  playlistStrategy: 'topic-based' | 'manual' | 'ai-suggested';

  // AI Word Highlighting
  useAiWordHighlighting: boolean;
  highlightColor: string;

  // Custom AI Prompts for GPT Workflows
  transcriptionCorrectionPrompt?: string;
  aiHighlightsPrompt?: string;
  multimediaAnalysisPrompt?: string;
  topicDetectionPrompt?: string;
  imageGenerationPrompt?: string;
  brollKeywordsPrompt?: string;
  videoTitlePrompt?: string;
  videoDescriptionPrompt?: string;
  videoTagsPrompt?: string;

  // B-roll specific settings
  brollAnalysisPrompt?: string;
  
  // Image generation specific settings  
  imageAnalysisPrompt?: string;
  imageGenerationCount?: number;
  imageDisplayDuration?: number;
  
  // Audio volume settings
  backgroundMusicVolume?: number;

  // Smart Mode Settings - NEW
  useSmartMode?: boolean;
  smartModeRatio?: {
    brollPerThirtySeconds: number;
    imagesPerThirtySeconds: number;
  };

  // Random Mode Settings - NEW
  randomMode?: RandomModeSettings;

  // Bad Take Removal - AI-Powered
  skipBadTakeRemoval?: boolean;
  badTakeDetectionMode?: 'ai' | 'hybrid' | 'rule-based';  // NEW: AI mode
  badTakeAIModel?: 'gpt-4o' | 'gpt-4o-mini';
  badTakeConfidenceThreshold?: number;
  badTakeUseAudioAnalysis?: boolean;
  badTakeContextWindow?: number;  // Number of segments for AI context
  badTakeCustomInstructions?: string;  // Custom AI instructions
  
  // Legacy/Hybrid Settings (kept for backward compatibility)
  badTakeDetectionSensitivity?: 'low' | 'medium' | 'high';
  badTakeMinRepetitionLength?: number;
  badTakeDetectStutters?: boolean;
  badTakeStutterWordLimit?: number;
  badTakeDetectFalseStarts?: boolean;
  badTakeFalseStartThreshold?: number;
  badTakeDetectSelfCorrections?: boolean;
  badTakeSelfCorrectionKeywords?: string;
  badTakeContextClueBoost?: number;
  badTakeDetectFillerRetakes?: boolean;
  badTakeFillerWordThreshold?: number;
  badTakeDetectBreathPauses?: boolean;
  badTakeBreathPauseMin?: number;
  badTakeBreathPauseMax?: number;
  badTakeDetectPartialSentences?: boolean;
  badTakePreferCompleteTakes?: boolean;
  badTakeLengthBiasThreshold?: number;
  badTakeDetectIncompleteSentences?: boolean;
  badTakePreferConfidentDelivery?: boolean;

  // Enhanced Auto Zoom - NEW
  skipEnhancedAutoZoom?: boolean;
  autoZoomMode?: 'face-detection' | 'focal-point' | 'hybrid';
  autoZoomIntensity?: 'subtle' | 'medium' | 'strong';
  autoZoomSmoothness?: 'low' | 'medium' | 'high';
  autoZoomAspectRatio?: '9:16' | '1:1' | '16:9' | 'auto';
  autoZoomPauseDetection?: boolean;
  autoZoomSectionChangeDetection?: boolean;
}

export type ProcessingStepName = 'Audio Enhancement' | 'Silence Removal' | 'Bad Take Removal' | 'Transcription' | 'AI Topic Detection' | 'GPT Correction' | 'AI Highlights' | 'AI Multimedia Analysis' | 'AI B-Roll' | 'AI Image Generation' | 'Enhanced Auto Zoom' | 'Background Music' | 'Sound Effects' | 'Subtitle Burning' | 'Topic Title Card' | 'Add Frame' | 'Flash Logo' | 'Outro Addition' | 'Thumbnail Generation' | 'Playlist Assignment';

export interface MultiPlatformConfig {
  general: {
    useProcessedVideo: boolean;
    generateThumbnails: boolean;
    scheduleMode: 'immediate' | 'delayed' | 'custom';
    defaultDescription: string;
    baseTags: string[];
    schedule: string;
    preferredTime: string | undefined;
    schedulingOptions: {
      mode: 'standard' | 'day-and-night' | 'next-slot' | 'time-slot';
      startDate: string;
    };
    processingMode: 'dry-run' | 'process-only' | 'full-upload' | 'batch-upload';
    defaultPostingTimes: {
      morning: string;
      afternoon: string;
      evening: string;
    };
    slotInterval?: string;
  };
  platforms: {
    [key: string]: {
      id: string;
      name: string;
      enabled: boolean;
      contentPrompt: string;
      hashtagPrompt: string;
      customSettings: any;
    };
  };
  youtube: {
    enabled: boolean;
    title: string;
    description: string;
    tags: string[];
    useGptForDescription: boolean;
    useGptForTags: boolean;
    useGptForTitle: boolean;
    channelId?: string;
    selectedChannelId?: string;
    authenticatedAccounts?: any[];
    allAvailableChannels?: any[];
    scheduleMode?: 'standard' | 'day-and-night';
    preferredTime?: string;
    mode?: 'dry-run' | 'process-only' | 'full-upload' | 'batch-upload';
  };
}

export interface Word {
  id: string;
  text: string;
  start: number;
  end: number;
  confidence?: number;
  isEditing?: boolean;
  isSelected?: boolean;
  shouldRemove?: boolean;
  segmentId?: string;
  clipId?: string;
  isCut?: boolean;
  isDeleted?: boolean;
}

export interface VideoClip {
  id: string;
  start: number; // Position on the timeline
  end: number;   // Position on the timeline
  sourceStart: number; // Start time in the original video file
  sourceEnd: number;   // End time in the original video file
  duration: number;
  type: 'speech' | 'silence';
  text?: string;
  words?: Word[];
  isSkipped?: boolean;
  isSilent?: boolean;
  originalIndex: number;
  video_path: string;
}

export interface SilenceSegment {
  start: number;
  end: number;
  duration: number;
  confidence: number;
}

export interface VideoAnalysis {
  duration: number;
  silenceSegments: SilenceSegment[];
  speechSegments: VideoClip[];
  clips: VideoClip[];
  waveformData: number[];
  recommendedThreshold: number;
  statistics?: {
    totalSilenceDuration: number;
    timeSavedPercentage: number;
    speechSegmentCount: number;
    silenceSegmentCount: number;
  };
}

export interface TimelineEdit {
  type: 'cut' | 'move' | 'delete' | 'split';
  clipId: string;
  timestamp?: number;
  newPosition?: number;
}

export interface VideoEditorState {
  clips: VideoClip[];
  selectedClipId: string | null;
  playheadPosition: number;
  skipSilence: boolean;
  timelineZoom: number;
  editHistory: TimelineEdit[];
}