'use client';

import React, { useState, useEffect } from 'react';
import { 
  Youtube, Facebook, Twitter, Linkedin, Instagram, Hash, MessageCircle, 
  Settings, Wand2, Eye, CheckCircle2, AlertCircle, Clock, Save, 
  Copy, RefreshCw, Download, FileText, Trash2, Calendar, UserPlus, Link2, CheckCircle
} from 'lucide-react';
import YouTubeChannelManager from './YouTubeChannelManager';


interface ProfileInfo {
  id: string;
  name: string;
  platform?: string; // Optional, as YouTube channels won't have this from Ayrshare
  username?: string;
}

interface PlatformConfig {
  id: string;
  name: string;
  enabled: boolean;
  contentPrompt: string;
  hashtagPrompt: string;
  customSettings: Record<string, unknown>;
  postingTime?: string;
  contentLength?: number;
  validated?: boolean;
  lastValidated?: string;
  selectedProfileId?: string; // For Ayrshare platforms
  availableProfiles?: ProfileInfo[]; // For Ayrshare platforms
  tiktokAccessToken?: string;
  tiktokConnectionStatus?: 'connected' | 'disconnected' | 'pending';
  tiktokUsername?: string;
}

interface YouTubeChannel {
  id: string;
  title: string;
  accountEmail?: string; // To distinguish which account this channel belongs to
  accountId?: string; // Unique identifier for the account
  thumbnail?: string;
}

interface YouTubeAccount {
  id: string;
  email: string;
  name: string;
  channels: YouTubeChannel[];
  authenticated: boolean;
  lastAuthenticated: string;
}

interface MultiPlatformConfig {
  general: {
    useProcessedVideo: boolean;
    generateThumbnails: boolean;
    scheduleMode: 'immediate' | 'delayed' | 'custom';
    defaultDescription: string;
    baseTags: string[];
    schedule: string; // Common schedule date for all platforms
    preferredTime: string | undefined; // Common preferred time for all platforms
    schedulingOptions: {
      mode: 'standard' | 'day-and-night' | 'next-slot' | 'time-slot'; // Common schedule mode for all platforms
      startDate: string; // Start date for scheduling
    };
    processingMode: 'dry-run' | 'process-only' | 'full-upload' | 'batch-upload'; // Common processing mode
    defaultPostingTimes: {
      morning: string; // Default morning posting time (e.g., "07:00")
      afternoon: string; // Default afternoon posting time (e.g., "16:00")
      evening: string; // Default evening posting time (e.g., "20:00")
    };
    slotInterval?: string; // For next-slot mode
  };
  platforms: Record<string, PlatformConfig>;
  youtube?: {
    enabled: boolean;
    title: string;
    description: string;
    tags: string[];
    useGptForDescription: boolean;
    useGptForTags: boolean;
    useGptForTitle: boolean;
    selectedChannelId?: string; // Selected channel from all available channels
    authenticatedAccounts?: YouTubeAccount[]; // All authenticated accounts
    allAvailableChannels?: YouTubeChannel[]; // All channels from all accounts
  };
}

interface PostingResult {
  platform: string;
  status: 'success' | 'failed' | 'pending';
  postId?: string;
  url?: string;
  content?: string;
  error?: string;
  timestamp: string;
}

interface ContentTemplate {
  id: string;
  name: string;
  description: string;
  platforms: string[];
  prompts: Record<string, string>;
  tags: string[];
  created: string;
}

export type { PlatformConfig, MultiPlatformConfig, PostingResult, ContentTemplate };

interface MultiPlatformManagerProps {
  config: MultiPlatformConfig;
  onConfigChange: (config: MultiPlatformConfig) => void;
  results?: PostingResult[];
  disabled?: boolean;
  apiKey?: string;
}

const PLATFORM_INFO = {
  youtube: {
    name: 'YouTube',
    icon: Youtube,
    color: 'text-red-500',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    maxLength: 5000,
    supports: ['video', 'description', 'tags', 'thumbnail', 'scheduling'],
    defaultPrompt: 'Create a compelling YouTube description for this medical education video. Start with "Visit IvyTutoring.net for a live tutor." Focus on educational value, key concepts, and USMLE relevance. End with "Visit https://blakeyoung-shop.fourthwall.com/ to purchase our software."',
    tips: 'YouTube is the primary platform for long-form medical education content. Focus on detailed descriptions, proper tags, and strategic scheduling.',
    bestPractices: ['Include timestamps for long videos', 'Use relevant keywords in title and description', 'Schedule at optimal times for your audience', 'Create compelling thumbnails']
  },
  facebook: {
    name: 'Facebook',
    icon: Facebook,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    maxLength: 2000,
    supports: ['video', 'text', 'thumbnail'],
    defaultPrompt: 'Create an engaging Facebook post for this medical education video. Make it conversational and educational, encouraging engagement. Include relevant medical hashtags and a call to action to watch the full video.',
    tips: 'Facebook favors posts that generate engagement. Ask questions and encourage comments.',
    bestPractices: ['Ask questions to drive engagement', 'Use emojis strategically', 'Include call-to-action']
  },
  twitter: {
    name: 'X (Twitter)',
    icon: Twitter,
    color: 'text-gray-900',
    bgColor: 'bg-gray-50',
    borderColor: 'border-gray-200',
    maxLength: 280,
    supports: ['text', 'video', 'thumbnail'],
    defaultPrompt: 'Create a concise, engaging tweet for this medical education video. Keep it under 240 characters to leave room for the video link. Use relevant medical hashtags and make it shareable.',
    tips: 'Keep tweets concise and use trending hashtags. Threads can help for longer content.',
    bestPractices: ['Use 1-2 relevant hashtags', 'Include engaging visuals', 'Tweet at optimal times']
  },
  linkedin: {
    name: 'LinkedIn',
    icon: Linkedin,
    color: 'text-blue-700',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    maxLength: 3000,
    supports: ['video', 'text', 'thumbnail'],
    defaultPrompt: 'Create a professional LinkedIn post for this medical education content. Focus on the educational and career development aspects. Make it valuable for medical professionals and students. Use professional hashtags.',
    tips: 'LinkedIn favors professional, educational content. Share insights and career advice.',
    bestPractices: ['Focus on professional development', 'Share valuable insights', 'Use industry hashtags']
  },
  instagram: {
    name: 'Instagram',
    icon: Instagram,
    color: 'text-pink-600',
    bgColor: 'bg-pink-50',
    borderColor: 'border-pink-200',
    maxLength: 2200,
    supports: ['video', 'image', 'text'],
    defaultPrompt: 'Create an Instagram post for this medical education video. Make it visually appealing and educational. Use relevant medical and education hashtags. Focus on visual storytelling and engagement.',
    tips: 'Instagram is visual-first. Use high-quality images and engaging stories.',
    bestPractices: ['Use high-quality visuals', 'Include 5-10 relevant hashtags', 'Tell a story']
  },
  tiktok: {
    name: 'TikTok',
    icon: Hash,
    color: 'text-black',
    bgColor: 'bg-gray-50',
    borderColor: 'border-gray-200',
    maxLength: 150,
    supports: ['video', 'text'],
    defaultPrompt: 'Create a short, catchy TikTok description for this medical education video. Make it trendy, educational, and engaging for a younger audience. Use relevant trending hashtags.',
    tips: 'TikTok favors trending sounds, effects, and hashtags. Keep content snappy and engaging.',
    bestPractices: ['Use trending hashtags', 'Keep content under 60 seconds', 'Add engaging effects']
  },
  telegram: {
    name: 'Telegram',
    icon: MessageCircle,
    color: 'text-blue-500',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    maxLength: 4096,
    supports: ['video', 'text', 'formatting'],
    defaultPrompt: 'Create a detailed Telegram channel post for this medical education video. Use markdown formatting for emphasis. Make it comprehensive and educational with clear structure and formatting.',
    tips: 'Telegram supports rich text formatting. Use markdown for better presentation.',
    bestPractices: ['Use markdown formatting', 'Include detailed descriptions', 'Add relevant links']
  }
};

const DEFAULT_PLATFORM_CONFIG: PlatformConfig = {
  id: '',
  name: '',
  enabled: false,
  contentPrompt: '',
  hashtagPrompt: '',
  customSettings: {},
  availableProfiles: [],
  selectedProfileId: ''
};

export default function MultiPlatformManager({ 
  config, 
  onConfigChange, 
  results = [], 
  disabled = false,
  apiKey,
}: MultiPlatformManagerProps) {
  const [activeTab, setActiveTab] = useState<string>('youtube');
  const [showResults, setShowResults] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [previewContent, setPreviewContent] = useState<Record<string, string>>({});
  const [generatingPreview, setGeneratingPreview] = useState(false);
  const [templates, setTemplates] = useState<ContentTemplate[]>([]);
  const [showTemplates, setShowTemplates] = useState(false);
  const [connectingTikTok, setConnectingTikTok] = useState(false);
  const [facebookAuth, setFacebookAuth] = useState<{authenticated: boolean, user?: any, pages?: any[]} | null>(null);
  const [instagramAuth, setInstagramAuth] = useState<{authenticated: boolean, user?: any} | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(false);

  // Simple logger for consistency  
  const logger = {
    info: (message: string, ...args: any[]) => console.log(`[INFO] ${message}`, ...args),
    error: (message: string, ...args: any[]) => console.error(`[ERROR] ${message}`, ...args),
    warning: (message: string, ...args: any[]) => console.warn(`[WARN] ${message}`, ...args)
  };

  useEffect(() => {
    const savedTemplates = localStorage.getItem('multiPlatformTemplates');
    if (savedTemplates) {
      try {
        setTemplates(JSON.parse(savedTemplates));
      } catch (e) {
        console.error('Failed to load templates:', e);
      }
    }
  }, []);

  const saveTemplates = (newTemplates: ContentTemplate[]) => {
    setTemplates(newTemplates);
    localStorage.setItem('multiPlatformTemplates', JSON.stringify(newTemplates));
  };

  const updatePlatformConfig = (platform: string, updates: Partial<PlatformConfig>) => {
    onConfigChange({
      ...config,
      platforms: {
        ...config.platforms,
        [platform]: { 
          ...(config.platforms[platform] || { // Ensure platform config exists before spreading
            enabled: false,
            contentPrompt: '',
            hashtagPrompt: '',
            customSettings: {},
            availableProfiles: [],
            selectedProfileId: ''
          }),
          ...updates 
        }
      }
    });
  };

  const updateYouTubeConfig = (updates: Partial<NonNullable<MultiPlatformConfig['youtube']>>) => {
    const currentYoutubeConfig = config.youtube || {
      enabled: true,
      title: '',
      description: '',
      tags: [],
      useGptForDescription: true,
      useGptForTags: true,
      useGptForTitle: false,
      selectedChannelId: ''
    };
    onConfigChange({
      ...config,
      youtube: { ...currentYoutubeConfig, ...updates }
    });
  };

  const youtubeConfig = config.youtube || {
    enabled: true,
    title: '',
    description: '',
    tags: [],
    useGptForDescription: true,
    useGptForTags: true,
    useGptForTitle: false,
    selectedChannelId: ''
  };

  const addYouTubeTag = (tag: string) => {
    if (tag.trim() && !youtubeConfig.tags.includes(tag.trim())) {
      updateYouTubeConfig({
        tags: [...youtubeConfig.tags, tag.trim()]
      });
    }
  };

  const removeYouTubeTag = (index: number) => {
    updateYouTubeConfig({
      tags: youtubeConfig.tags.filter((_, i) => i !== index)
    });
  };

  const handleConnectTikTok = async () => {
    setConnectingTikTok(true);
    window.location.href = '/api/tiktok/auth';
  };

  useEffect(() => {
    const checkTikTokStatus = () => {
      // Safety check: ensure platforms object exists
      if (!config.platforms || !config.platforms.tiktok) {
        return;
      }
      
      const platformConfig = config.platforms['tiktok'];
      if (platformConfig?.tiktokAccessToken && platformConfig.tiktokConnectionStatus !== 'connected') {
        updatePlatformConfig('tiktok', { 
          tiktokConnectionStatus: 'connected', 
          tiktokUsername: platformConfig.tiktokUsername || 'MockUser123',
          validated: true
        });
      } else if (!platformConfig?.tiktokAccessToken && platformConfig?.tiktokConnectionStatus === 'connected') {
        updatePlatformConfig('tiktok', { 
          tiktokConnectionStatus: 'disconnected', 
          tiktokUsername: undefined,
          validated: false
        });
      }
    };
    checkTikTokStatus();
  }, [config.platforms?.tiktok]);

  const generatePreview = async () => {
    if (!apiKey) {
      alert('OpenAI API key required for content preview');
      return;
    }

    const enabledPlatforms = Object.entries(config.platforms || {})
      .filter(([, config]) => config.enabled)
      .map(([platform]) => platform);

    if (enabledPlatforms.length === 0) {
      alert('Please enable at least one platform before generating preview');
      return;
    }

    setGeneratingPreview(true);
    try {
      const response = await fetch('/api/preview-content', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: 'Sample Medical Education Video: Cardiology Basics',
          description: 'This comprehensive video covers the fundamentals of cardiology including cardiac anatomy, physiology, and common pathologies. Perfect for USMLE Step 1 preparation and medical students looking to master cardiovascular concepts.',
          platforms: enabledPlatforms,
          multiPlatformConfig: config,
          openaiKey: apiKey
        }),
      });

      const result = await response.json();

      if (result.success && result.previews) {
        const formattedPreviews: Record<string, string> = {};
        
        Object.entries(result.previews).forEach(([platform, data]) => {
          const previewData = data as { error?: string; full_text?: string; content?: string };
          if (previewData.error) {
            formattedPreviews[platform] = `Error: ${previewData.error}`;
          } else {
            formattedPreviews[platform] = previewData.full_text || previewData.content || 'Preview generation failed';
          }
        });
        
        setPreviewContent(formattedPreviews);
        setShowPreview(true);
      } else {
        throw new Error(result.error || 'Failed to generate preview');
      }
    } catch (error) {
      console.error('Preview generation failed:', error);
      alert(`Failed to generate preview: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setGeneratingPreview(false);
    }
  };

      const enabledPlatforms = Object.entries(config.platforms || {})
      .filter(([, config]) => config.enabled)
      .map(([platform]) => platform);

  const allPlatforms = Object.keys(PLATFORM_INFO);

  // Load saved YouTube channels from all accounts on component mount
  useEffect(() => {
    const savedAccounts = localStorage.getItem('youtube-authenticated-accounts');
    const savedSelectedChannel = localStorage.getItem('youtube-selected-channel-id');
    
    if (savedAccounts) {
      try {
        const accounts: YouTubeAccount[] = JSON.parse(savedAccounts);
        
        // Aggregate all channels from all accounts
        const allChannels: YouTubeChannel[] = accounts.flatMap(account => 
          account.channels.map(channel => ({
            ...channel,
            accountEmail: account.email,
            accountId: account.id
          }))
        );
        
        updateYouTubeConfig({ 
          authenticatedAccounts: accounts,
          allAvailableChannels: allChannels,
          selectedChannelId: savedSelectedChannel || ''
        });
        
        logger.info(`Auto-loaded ${accounts.length} YouTube accounts with ${allChannels.length} total channels`);
      } catch (e) {
        logger.error('Error loading saved YouTube accounts:', e);
      }
    }
  }, []);



  // Handle YouTube channel selection change
  const handleChannelSelect = (channelId: string) => {
    updateYouTubeConfig({ selectedChannelId: channelId });
    localStorage.setItem('youtube-selected-channel-id', channelId);
    
    const selectedChannel = youtubeConfig.allAvailableChannels?.find(c => c.id === channelId);
    if (selectedChannel) {
      logger.info(`Selected YouTube channel: ${selectedChannel.title} (${selectedChannel.accountEmail})`);
    }
  };



  // Function to check connection status on component mount
  useEffect(() => {
    // Check authentication status for all platforms
    checkFacebookAuth();
    checkInstagramAuth();
    
    // Check URL parameters for connection status
    const urlParams = new URLSearchParams(window.location.search);
    const youtubeConnected = urlParams.get('youtube_connected');
    const youtubeError = urlParams.get('youtube_error');
    const tiktokConnected = urlParams.get('tiktok_connected');
    const tiktokUsername = urlParams.get('username');
    const instagramConnected = urlParams.get('instagram_connected');
    const facebookConnected = urlParams.get('facebook_connected');
    const facebookPages = urlParams.get('pages');
    
    if (youtubeConnected === 'true') {
      // YouTube authentication successful
      alert('Successfully connected to YouTube! Your channels should now be available.');
      
      // Remove the query parameters from URL
      const newUrl = window.location.pathname;
      window.history.replaceState({}, document.title, newUrl);
    } else if (youtubeError) {
      // YouTube authentication failed
      alert('YouTube authentication failed: ' + decodeURIComponent(youtubeError));
      
      // Remove the query parameters from URL
      const newUrl = window.location.pathname;
      window.history.replaceState({}, document.title, newUrl);
    } else if (tiktokConnected === 'true') {
      // Update the UI to show connected status
      if (config.platforms && config.platforms.tiktok) {
        const updatedPlatforms = { ...config.platforms };
        updatedPlatforms.tiktok.validated = true;
        updatedPlatforms.tiktok.lastValidated = new Date().toISOString();
        updatedPlatforms.tiktok.tiktokConnectionStatus = 'connected';
        if (tiktokUsername) {
          updatedPlatforms.tiktok.tiktokUsername = tiktokUsername;
        }
        onConfigChange({ ...config, platforms: updatedPlatforms });
        
        // Remove the query parameters from URL to avoid reconnection on refresh
        const newUrl = window.location.pathname;
        window.history.replaceState({}, document.title, newUrl);
      }
    } else if (instagramConnected === 'true') {
      // Instagram authentication successful
      alert('Successfully connected to Instagram!');
      checkInstagramAuth(); // Refresh auth status
      
      // Remove the query parameters from URL
      const newUrl = window.location.pathname;
      window.history.replaceState({}, document.title, newUrl);
    } else if (facebookConnected === 'true') {
      // Facebook authentication successful
      alert(`Successfully connected to Facebook!${facebookPages ? ` Found ${facebookPages} pages.` : ''}`);
      checkFacebookAuth(); // Refresh auth status
      
      // Remove the query parameters from URL
        const newUrl = window.location.pathname;
        window.history.replaceState({}, document.title, newUrl);
    }
  }, []);

  // Function to handle TikTok connection
  const connectToTikTok = () => {
    // Redirect to TikTok auth endpoint
    window.location.href = '/api/tiktok/auth';
  };

  // Function to handle Instagram connection
  const connectToInstagram = () => {
    // Redirect to Instagram auth endpoint
    window.location.href = '/api/instagram/auth';
  };

  // Check Facebook authentication status
  const checkFacebookAuth = async () => {
    try {
      const response = await fetch('/api/facebook/status');
      if (response.ok) {
        const data = await response.json();
        setFacebookAuth(data);
        if (data.authenticated) {
          updatePlatformConfig('facebook', { validated: true });
        }
      }
    } catch (error) {
      console.error('Error checking Facebook auth:', error);
    }
  };

  // Check Instagram authentication status
  const checkInstagramAuth = async () => {
    try {
      const response = await fetch('/api/instagram/status');
      if (response.ok) {
        const data = await response.json();
        setInstagramAuth(data);
        if (data.authenticated) {
          updatePlatformConfig('instagram', { validated: true });
        }
      }
    } catch (error) {
      console.error('Error checking Instagram auth:', error);
    }
  };

  // Connect to Facebook
  const connectToFacebook = () => {
    window.location.href = '/api/facebook/auth';
  };

  // Disconnect Facebook
  const disconnectFacebook = () => {
    document.cookie = 'facebook_access_token=; Max-Age=0; path=/';
    document.cookie = 'facebook_user_info=; Max-Age=0; path=/';
    document.cookie = 'facebook_pages=; Max-Age=0; path=/';
    setFacebookAuth({ authenticated: false });
    updatePlatformConfig('facebook', { validated: false });
  };

  // Disconnect Instagram
  const disconnectInstagram = () => {
    document.cookie = 'instagram_access_token=; Max-Age=0; path=/';
    document.cookie = 'instagram_user_info=; Max-Age=0; path=/';
    document.cookie = 'instagram_user_id=; Max-Age=0; path=/';
    document.cookie = 'instagram_username=; Max-Age=0; path=/';
    setInstagramAuth({ authenticated: false });
    updatePlatformConfig('instagram', { validated: false });
  };



  // Get general config with simple defaults
  const generalConfig = config.general || {
          useProcessedVideo: true,
          generateThumbnails: true,
          scheduleMode: 'delayed',
          defaultDescription: '',
    baseTags: []
  };





  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Settings className="text-purple-600" />
            Multi-Platform Content Manager
          </h2>
          <p className="text-gray-600 mt-1">
            Configure AI-powered content generation for each social media platform
          </p>
        </div>
        

      </div>

      {showPreview && (
        <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-blue-900 flex items-center gap-2">
              <Eye size={16} />
              Content Preview
            </h3>
            <button
              onClick={() => setShowPreview(false)}
              className="text-blue-600 hover:text-blue-800"
            >
              ×
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.entries(previewContent).map(([platform, content]) => {
              const platformInfo = PLATFORM_INFO[platform as keyof typeof PLATFORM_INFO];
              const Icon = platformInfo?.icon || Settings;
              
              return (
                <div key={platform} className="bg-white p-3 rounded-lg border border-blue-200">
                  <div className="flex items-center gap-2 mb-2">
                    <Icon size={16} className={platformInfo?.color} />
                    <span className="font-medium text-sm">{platformInfo?.name}</span>
                    <button
                      onClick={() => navigator.clipboard.writeText(content)}
                      className="ml-auto p-1 text-blue-600 hover:bg-blue-100 rounded"
                    >
                      <Copy size={12} />
                    </button>
                  </div>
                  <p className="text-xs text-gray-700 bg-gray-50 p-2 rounded max-h-20 overflow-y-auto">
                    {content}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="border-b border-gray-200 mb-6">
        <nav className="flex space-x-4 overflow-x-auto">
          {allPlatforms.map(platform => {
            const platformInfo = PLATFORM_INFO[platform as keyof typeof PLATFORM_INFO];
            const Icon = platformInfo.icon;
            const isEnabled = platform === 'youtube' ? youtubeConfig.enabled : config.platforms?.[platform]?.enabled;
            const isValidated = platform === 'youtube' ? true : config.platforms?.[platform]?.validated;
            
            return (
              <button
                key={platform}
                onClick={() => setActiveTab(platform)}
                className={`py-3 px-4 border-b-2 font-medium text-sm transition-colors whitespace-nowrap ${
                  activeTab === platform
                    ? `border-purple-500 text-purple-600`
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Icon size={16} className={platformInfo.color} />
                  {platformInfo.name}
                  {isEnabled && (
                    <CheckCircle2 size={12} className="text-green-500" />
                  )}
                  {isEnabled && !isValidated && platform !== 'youtube' && (
                    <AlertCircle size={12} className="text-yellow-500" />
                  )}
                </div>
              </button>
            );
          })}
        </nav>
      </div>

      <div className="space-y-6">

        {activeTab === 'youtube' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Youtube className="w-6 h-6 text-red-500" />
                <h3 className="text-lg font-bold text-gray-900">YouTube Configuration</h3>
              </div>
              <label className="flex items-center gap-3">
                <span className="text-sm font-medium text-gray-900">Enable YouTube</span>
                <input
                  type="checkbox"
                  checked={youtubeConfig.enabled}
                  onChange={(e) => updateYouTubeConfig({ enabled: e.target.checked })}
                  className="w-5 h-5 text-red-600 rounded"
                  disabled={disabled}
                />
              </label>
            </div>

            {youtubeConfig.enabled && (
              <>
                {/* Use the dedicated YouTube Channel Manager component */}
                <YouTubeChannelManager
                  selectedChannelId={youtubeConfig.selectedChannelId || ''}
                  onChannelSelect={handleChannelSelect}
                  disabled={disabled}
                />

                  <div className="space-y-4">
                    <h4 className="font-medium text-gray-900">Video Content Settings</h4>
                    <div className="flex items-center justify-between">
                      <label className="block text-sm font-medium text-gray-900">Video Title</label>
                      <label className="flex items-center gap-2 text-sm text-gray-800 font-medium">
                        <input
                          type="checkbox"
                          checked={youtubeConfig.useGptForTitle}
                          onChange={(e) => updateYouTubeConfig({ useGptForTitle: e.target.checked })}
                          className="w-4 h-4 text-red-600"
                          disabled={disabled}
                        />
                        Generate with GPT
                      </label>
                    </div>
                    <input
                      type="text"
                      value={youtubeConfig.title}
                      onChange={(e) => updateYouTubeConfig({ title: e.target.value })}
                      placeholder={youtubeConfig.useGptForTitle ? "Will be generated from video content using GPT" : "Leave empty to use filename"}
                      disabled={youtubeConfig.useGptForTitle || disabled}
                      className="w-full p-3 border border-gray-300 rounded-lg text-gray-900"
                    />

                    <div className="flex items-center justify-between">
                      <label className="block text-sm font-medium text-gray-900">Description</label>
                      <label className="flex items-center gap-2 text-sm text-gray-800 font-medium">
                        <input
                          type="checkbox"
                          checked={youtubeConfig.useGptForDescription}
                          onChange={(e) => updateYouTubeConfig({ useGptForDescription: e.target.checked })}
                          className="w-4 h-4 text-red-600"
                          disabled={disabled}
                        />
                        Generate with GPT
                      </label>
                    </div>
                    <textarea
                      value={youtubeConfig.description}
                      onChange={(e) => updateYouTubeConfig({ description: e.target.value })}
                      placeholder={youtubeConfig.useGptForDescription ? "Will be generated from title using GPT" : "Video description"}
                      disabled={youtubeConfig.useGptForDescription || disabled}
                      rows={3}
                      className="w-full p-3 border border-gray-300 rounded-lg text-gray-900"
                    />

                    <div className="flex items-center justify-between">
                      <label className="block text-sm font-medium text-gray-900">Tags</label>
                      <label className="flex items-center gap-2 text-sm text-gray-800 font-medium">
                        <input
                          type="checkbox"
                          checked={youtubeConfig.useGptForTags}
                          onChange={(e) => updateYouTubeConfig({ useGptForTags: e.target.checked })}
                          className="w-4 h-4 text-red-600"
                          disabled={disabled}
                        />
                        Generate with GPT
                      </label>
                    </div>
                    {!youtubeConfig.useGptForTags && (
                      <div className="flex gap-2 mb-2">
                        <input
                          id="youtubeTagInput"
                          type="text"
                          placeholder="Add a tag"
                          className="flex-1 p-3 border border-gray-300 rounded-lg text-gray-900"
                          disabled={disabled}
                          onKeyPress={(e) => {
                            if (e.key === 'Enter') {
                              const target = e.target as HTMLInputElement;
                              addYouTubeTag(target.value);
                              target.value = '';
                            }
                          }}
                        />
                        <button
                          onClick={() => {
                            const input = document.getElementById('youtubeTagInput') as HTMLInputElement;
                            if (input) {
                              addYouTubeTag(input.value);
                              input.value = '';
                            }
                          }}
                          className="bg-red-600 text-white px-4 py-3 rounded-lg hover:bg-red-700"
                          disabled={disabled}
                        >
                          Add
                        </button>
                      </div>
                    )}
                    {youtubeConfig.useGptForTags ? (
                      <p className="text-sm text-gray-800 font-medium">Tags will be generated from title using GPT</p>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {youtubeConfig.tags.map((tag, index) => (
                          <span key={index} className="bg-red-100 text-red-800 px-3 py-1 rounded-full text-sm flex items-center gap-1 font-medium">
                            {tag}
                            <button 
                              onClick={() => removeYouTubeTag(index)} 
                              className="text-red-600 hover:text-red-800"
                              disabled={disabled}
                            >
                              ×
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                </div>

              </>
            )}
          </div>
        )}



        {allPlatforms.filter(platform => platform !== 'youtube').map(platform => {
          if (activeTab !== platform) return null;
          
          const platformInfo = PLATFORM_INFO[platform as keyof typeof PLATFORM_INFO];
          const platformConfig = config.platforms[platform] || { enabled: false, contentPrompt: '', hashtagPrompt: '', customSettings: {} };
          const Icon = platformInfo.icon;
          
          return (
            <div key={platform} className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Icon className={`w-6 h-6 ${platformInfo.color}`} />
                  <h3 className="text-lg font-bold text-gray-900">{platformInfo.name} Configuration</h3>
                  {platformConfig.enabled && platform === 'tiktok' && (
                    <div className="ml-auto">
                      {platformConfig.tiktokConnectionStatus === 'connected' ? (
                        <span className="bg-green-100 text-green-800 px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5">
                          <CheckCircle2 size={14} />
                          Connected as @{platformConfig.tiktokUsername || 'User'}
                        </span>
                      ) : (
                        <button
                          onClick={handleConnectTikTok}
                          disabled={connectingTikTok || disabled}
                          className="bg-black text-white px-4 py-2 rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50 text-sm font-medium flex items-center gap-2"
                        >
                          {connectingTikTok ? <RefreshCw size={14} className="animate-spin" /> : <UserPlus size={14} />}
                          {connectingTikTok ? 'Connecting...' : 'Connect to TikTok'}
                        </button>
                      )}
                    </div>
                  )}
                  {platformConfig.validated && platform !== 'tiktok' && (
                    <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-medium">
                      ✅ Connected
                    </span>
                  )}
                </div>
                <label className="flex items-center gap-3">
                  <span className="text-sm font-medium text-gray-900">Enable {platformInfo.name}</span>
                  <input
                    type="checkbox"
                    checked={platformConfig.enabled}
                    onChange={(e) => updatePlatformConfig(platform, { enabled: e.target.checked })}
                    className="w-5 h-5 text-purple-600 rounded"
                    disabled={disabled}
                  />
                </label>
              </div>

              {platformConfig.enabled && (
                <>
                  {/* Facebook Authentication Section */}
                  {platform === 'facebook' && (
                    <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                      <h5 className="font-medium text-blue-900 mb-3 flex items-center gap-2">
                        <Facebook size={16} />
                        Facebook Authentication
                      </h5>
                      
                      {facebookAuth?.authenticated ? (
                        <div className="space-y-3">
                          <div className="flex items-center gap-3">
                            {facebookAuth.user?.picture?.data?.url ? (
                              <img 
                                src={facebookAuth.user.picture.data.url} 
                                alt={facebookAuth.user.name}
                                className="w-10 h-10 rounded-full"
                              />
                            ) : (
                              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                                <Facebook size={16} className="text-blue-600" />
                              </div>
                            )}
                            <div>
                              <p className="font-medium text-blue-900">{facebookAuth.user?.name || 'Facebook User'}</p>
                              <p className="text-sm text-blue-700">
                                Connected • {facebookAuth.pages?.length || 0} page(s) available
                              </p>
                            </div>
                            <div className="ml-auto">
                              <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-medium">
                                ✅ Connected
                              </span>
                            </div>
                          </div>
                          
                          {facebookAuth.pages && facebookAuth.pages.length > 0 && (
                            <div className="bg-white p-3 rounded border border-blue-200">
                              <h6 className="font-medium text-blue-900 mb-2">Available Pages:</h6>
                              <div className="space-y-2">
                                {facebookAuth.pages.map((page: any) => (
                                  <div key={page.id} className="flex items-center justify-between text-sm">
                                    <span className="text-blue-800">{page.name}</span>
                                    <span className="text-blue-600 bg-blue-100 px-2 py-1 rounded text-xs">
                                      ID: {page.id}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          
                          <button
                            onClick={disconnectFacebook}
                            className="w-full px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
                          >
                            Disconnect Facebook
                          </button>
                        </div>
                      ) : (
                        <div className="text-center">
                          <p className="text-blue-700 mb-3">Connect your Facebook account to enable posting to your Facebook pages.</p>
                          <button
                            onClick={connectToFacebook}
                            disabled={checkingAuth}
                            className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 mx-auto"
                          >
                            <Facebook size={16} />
                            {checkingAuth ? 'Checking...' : 'Connect to Facebook'}
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Instagram Authentication Section */}
                  {platform === 'instagram' && (
                    <div className="mb-6 p-4 bg-pink-50 border border-pink-200 rounded-lg">
                      <h5 className="font-medium text-pink-900 mb-3 flex items-center gap-2">
                        <Instagram size={16} />
                        Instagram Authentication
                      </h5>
                      
                      {instagramAuth?.authenticated ? (
                        <div className="space-y-3">
                          <div className="flex items-center gap-3">
                            {instagramAuth.user?.profile_picture ? (
                              <img 
                                src={instagramAuth.user.profile_picture} 
                                alt={instagramAuth.user.username}
                                className="w-10 h-10 rounded-full"
                              />
                            ) : (
                              <div className="w-10 h-10 bg-pink-100 rounded-full flex items-center justify-center">
                                <Instagram size={16} className="text-pink-600" />
                              </div>
                            )}
                            <div>
                              <p className="font-medium text-pink-900">@{instagramAuth.user?.username || 'instagram_user'}</p>
                              {instagramAuth.user?.name && (
                                <p className="text-sm text-pink-700">{instagramAuth.user.name}</p>
                              )}
                            </div>
                            <div className="ml-auto">
                              <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-medium">
                                ✅ Connected
                              </span>
                            </div>
                          </div>
                          
                          <button
                            onClick={disconnectInstagram}
                            className="w-full px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
                          >
                            Disconnect Instagram
                          </button>
                        </div>
                      ) : (
                        <div className="text-center">
                          <p className="text-pink-700 mb-3">Connect your Instagram account to enable posting to your Instagram profile.</p>
                          <button
                            onClick={connectToInstagram}
                            disabled={checkingAuth}
                            className="flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 transition-colors disabled:opacity-50 mx-auto"
                          >
                            <Instagram size={16} />
                            {checkingAuth ? 'Checking...' : 'Connect to Instagram'}
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  <div className={`p-4 rounded-lg border ${platformInfo.borderColor} ${platformInfo.bgColor}`}>
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900 mb-2 flex items-center gap-2">
                          <Wand2 className={`w-4 h-4 ${platformInfo.color}`} />
                          Platform Specifications
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-700">
                          <div>
                            <p><strong>Max Length:</strong> {platformInfo.maxLength} characters</p>
                            <p><strong>Supports:</strong> {platformInfo.supports.join(', ')}</p>
                          </div>
                          <div>
                            <p><strong>Best Time to Post:</strong> Varies by audience</p>
                            <p><strong>Optimal Frequency:</strong> Platform dependent</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 p-3 bg-white bg-opacity-50 rounded-lg">
                      <h5 className="font-medium text-gray-900 mb-2">💡 Tips & Best Practices</h5>
                      <p className="text-sm text-gray-700 mb-2">{platformInfo.tips}</p>
                      <ul className="text-sm text-gray-700 list-disc list-inside space-y-1">
                        {platformInfo.bestPractices.map((practice, index) => (
                          <li key={index}>{practice}</li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      AI Content Generation Prompt
                    </label>
                    <textarea
                      value={platformConfig.contentPrompt || platformInfo.defaultPrompt}
                      onChange={(e) => updatePlatformConfig(platform, { contentPrompt: e.target.value })}
                      placeholder={platformInfo.defaultPrompt}
                      rows={4}
                      className="w-full p-3 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      disabled={disabled}
                    />
                    <div className="flex items-center justify-between mt-2">
                      <p className="text-xs text-gray-500">
                        This prompt will be used to generate platform-specific content using AI
                      </p>
                      <button
                        onClick={() => updatePlatformConfig(platform, { contentPrompt: platformInfo.defaultPrompt })}
                        className="text-xs text-purple-600 hover:text-purple-800"
                        disabled={disabled}
                      >
                        Reset to Default
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Hashtag Generation Prompt
                    </label>
                    <textarea
                      value={platformConfig.hashtagPrompt || `Generate 5-8 relevant hashtags for this ${platformInfo.name} post about medical education. Focus on trending and relevant medical hashtags.`}
                      onChange={(e) => updatePlatformConfig(platform, { hashtagPrompt: e.target.value })}
                      rows={2}
                      className="w-full p-3 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      disabled={disabled}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Content Length Limit (optional)
                      </label>
                      <input
                        type="number"
                        value={platformConfig.contentLength || ''}
                        onChange={(e) => updatePlatformConfig(platform, { 
                          contentLength: e.target.value ? parseInt(e.target.value) : undefined 
                        })}
                        placeholder={`Default: ${platformInfo.maxLength}`}
                        min={50}
                        max={platformInfo.maxLength}
                        className="w-full p-3 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        disabled={disabled}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Preferred Posting Time (optional)
                      </label>
                      <input
                        type="time"
                        value={platformConfig.postingTime || ''}
                        onChange={(e) => updatePlatformConfig(platform, { postingTime: e.target.value })}
                        className="w-full p-3 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        disabled={disabled}
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Leave empty to use the general scheduling time
                      </p>
                    </div>
                  </div>

                  {platform === 'instagram' && (
                    <div className="p-4 bg-pink-50 border border-pink-200 rounded-lg">
                      <h5 className="font-medium text-pink-900 mb-2">📸 Instagram-Specific Features</h5>
                      <div className="space-y-2">
                        <label className="flex items-center gap-2">
                          <input type="checkbox" className="w-4 h-4 text-pink-600" disabled={disabled} />
                          <span className="text-sm text-pink-800">Use Instagram Stories format</span>
                        </label>
                        <label className="flex items-center gap-2">
                          <input type="checkbox" className="w-4 h-4 text-pink-600" disabled={disabled} />
                          <span className="text-sm text-pink-800">Add location tags when possible</span>
                        </label>
                      </div>
                    </div>
                  )}

                  {platform === 'linkedin' && (
                    <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                      <h5 className="font-medium text-blue-900 mb-2">💼 LinkedIn-Specific Features</h5>
                      <div className="space-y-2">
                        <label className="flex items-center gap-2">
                          <input type="checkbox" className="w-4 h-4 text-blue-600" disabled={disabled} />
                          <span className="text-sm text-blue-800">Tag relevant medical professionals</span>
                        </label>
                        <label className="flex items-center gap-2">
                          <input type="checkbox" className="w-4 h-4 text-blue-600" disabled={disabled} />
                          <span className="text-sm text-blue-800">Include professional development angle</span>
                        </label>
                      </div>
                    </div>
                  )}

                  {platform === 'tiktok' && (
                    <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                      <h5 className="font-medium text-gray-900 mb-2">🎵 TikTok-Specific Features</h5>
                      <div className="space-y-2">
                        <label className="flex items-center gap-2">
                          <input type="checkbox" className="w-4 h-4 text-gray-600" disabled={disabled} />
                          <span className="text-sm text-gray-800">Use trending sounds when available</span>
                        </label>
                        <label className="flex items-center gap-2">
                          <input type="checkbox" className="w-4 h-4 text-gray-600" disabled={disabled} />
                          <span className="text-sm text-gray-800">Optimize for mobile viewing</span>
                        </label>
                      </div>
                    </div>
                  )}

                  {platformConfig.availableProfiles && platformConfig.availableProfiles.length > 1 && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Target Profile/Page for {platformInfo.name}
                      </label>
                      <select
                        value={platformConfig.selectedProfileId || ''}
                        onChange={(e) => updatePlatformConfig(platform, { selectedProfileId: e.target.value })}
                        className="w-full p-3 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        disabled={disabled}
                      >
                        <option value="" disabled>Select a profile/page</option>
                        {platformConfig.availableProfiles.map(profile => (
                          <option key={profile.id} value={profile.id}>{profile.name} ({profile.username || profile.id})</option>
                        ))}
                      </select>
                      <p className="text-xs text-gray-500 mt-1">
                        If you have multiple pages/profiles for {platformInfo.name} on Ayrshare, select which one to post to.
                      </p>
                    </div>
                  )}
                  {platformConfig.availableProfiles && platformConfig.availableProfiles.length === 1 && (
                     <div>
                       <label className="block text-sm font-medium text-gray-700 mb-1">
                         Target Profile for {platformInfo.name}
                       </label>
                       <p className="p-3 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-800">
                         Posting to: <strong>{platformConfig.availableProfiles[0].name}</strong> ({platformConfig.availableProfiles[0].username || platformConfig.availableProfiles[0].id})
                       </p>
                     </div>
                   )}
                  {(!platformConfig.availableProfiles || platformConfig.availableProfiles.length === 0) && platformConfig.validated && (
                    <div>
                       <label className="block text-sm font-medium text-gray-700 mb-1">
                         Target Profile for {platformInfo.name}
                       </label>
                       <p className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800">
                         No specific profiles/pages found for {platformInfo.name} via Ayrshare. Will post to the default linked account.
                         Please ensure profiles are correctly set up in your Ayrshare dashboard.
                       </p>
                     </div>
                  )}
                </>
              )}
            </div>
          );
        })}

        {/* TikTok Tab */}
        {activeTab === 'tiktok' && (
          <div className="space-y-4 mt-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <input 
                  id="tiktok-enabled"
                  type="checkbox"
                  checked={config.platforms.tiktok?.enabled || false}
                  onChange={(e) => {
                    const updatedPlatforms = { ...config.platforms };
                    if (!updatedPlatforms.tiktok) {
                      updatedPlatforms.tiktok = DEFAULT_PLATFORM_CONFIG;
                    }
                    updatedPlatforms.tiktok.enabled = e.target.checked;
                    onConfigChange({ ...config, platforms: updatedPlatforms });
                  }}
                  disabled={disabled}
                  className="w-4 h-4 text-black rounded"
                />
                <label htmlFor="tiktok-enabled" className="text-sm font-medium text-gray-900">Enable TikTok</label>
              </div>
              
              {/* TikTok Connection Status */}
              <div className="flex items-center gap-2">
                {config.platforms.tiktok?.tiktokConnectionStatus === 'connected' ? (
                  <div className="flex items-center gap-2 text-green-500">
                    <CheckCircle size={16} />
                    <span>Connected{config.platforms.tiktok?.tiktokUsername ? ` as ${config.platforms.tiktok.tiktokUsername}` : ''}</span>
                  </div>
                ) : (
                  <button 
                    className="flex items-center gap-2 px-4 py-2 bg-black text-white text-sm rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50"
                    onClick={connectToTikTok}
                    disabled={disabled}
                  >
                    <Link2 className="h-4 w-4" />
                    Connect to TikTok
                  </button>
                )}
              </div>
            </div>
            
            {config.platforms.tiktok?.enabled && (
              <div className="space-y-4">
                <div>
                  <label htmlFor="tiktok-content-prompt" className="block text-sm font-medium mb-2 text-gray-900">TikTok Content Prompt</label>
                  <textarea
                    id="tiktok-content-prompt"
                    placeholder="Prompt for generating TikTok-specific content..."
                    value={config.platforms.tiktok?.contentPrompt || ''}
                    onChange={(e) => {
                      const updatedPlatforms = { ...config.platforms };
                      if (!updatedPlatforms.tiktok) {
                        updatedPlatforms.tiktok = DEFAULT_PLATFORM_CONFIG;
                      }
                      updatedPlatforms.tiktok.contentPrompt = e.target.value;
                      onConfigChange({ ...config, platforms: updatedPlatforms });
                    }}
                    disabled={disabled}
                    className="w-full p-3 border border-gray-300 rounded-lg text-gray-900 min-h-[100px]"
                  />
                </div>
                
                <div>
                  <label htmlFor="tiktok-hashtag-prompt" className="block text-sm font-medium mb-2 text-gray-900">TikTok Hashtag Prompt</label>
                  <textarea
                    id="tiktok-hashtag-prompt"
                    placeholder="Prompt for generating TikTok hashtags..."
                    value={config.platforms.tiktok?.hashtagPrompt || ''}
                    onChange={(e) => {
                      const updatedPlatforms = { ...config.platforms };
                      if (!updatedPlatforms.tiktok) {
                        updatedPlatforms.tiktok = DEFAULT_PLATFORM_CONFIG;
                      }
                      updatedPlatforms.tiktok.hashtagPrompt = e.target.value;
                      onConfigChange({ ...config, platforms: updatedPlatforms });
                    }}
                    disabled={disabled}
                    className="w-full p-3 border border-gray-300 rounded-lg text-gray-900 min-h-[100px]"
                  />
                </div>
                
                <div>
                  <label htmlFor="tiktok-content-length" className="block text-sm font-medium mb-2 text-gray-900">Maximum Content Length</label>
                  <input
                    id="tiktok-content-length"
                    type="number"
                    placeholder="2200"
                    value={config.platforms.tiktok?.contentLength || 2200}
                    onChange={(e) => {
                      const updatedPlatforms = { ...config.platforms };
                      if (!updatedPlatforms.tiktok) {
                        updatedPlatforms.tiktok = DEFAULT_PLATFORM_CONFIG;
                      }
                      updatedPlatforms.tiktok.contentLength = parseInt(e.target.value);
                      onConfigChange({ ...config, platforms: updatedPlatforms });
                    }}
                    disabled={disabled}
                    className="w-full p-3 border border-gray-300 rounded-lg text-gray-900"
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    TikTok caption limit is approximately 2200 characters
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Instagram Tab */}
        {activeTab === 'instagram' && (
          <div className="space-y-4 mt-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <input 
                  id="instagram-enabled"
                  type="checkbox"
                  checked={config.platforms.instagram?.enabled || false}
                  onChange={(e) => {
                    const updatedPlatforms = { ...config.platforms };
                    if (!updatedPlatforms.instagram) {
                      updatedPlatforms.instagram = DEFAULT_PLATFORM_CONFIG;
                    }
                    updatedPlatforms.instagram.enabled = e.target.checked;
                    onConfigChange({ ...config, platforms: updatedPlatforms });
                  }}
                  disabled={disabled}
                  className="w-4 h-4 text-pink-600 rounded"
                />
                <label htmlFor="instagram-enabled" className="text-sm font-medium text-gray-900">Enable Instagram</label>
              </div>
              
              {/* Instagram Connection Status */}
              <div className="flex items-center gap-2">
                {config.platforms.instagram?.tiktokConnectionStatus === 'connected' ? (
                  <div className="flex items-center gap-2 text-green-500">
                    <CheckCircle size={16} />
                    <span>Connected{config.platforms.instagram?.tiktokUsername ? ` as ${config.platforms.instagram.tiktokUsername}` : ''}</span>
                  </div>
                ) : (
                  <button 
                    className="flex items-center gap-2 px-4 py-2 bg-pink-600 text-white text-sm rounded-lg hover:bg-pink-700 transition-colors disabled:opacity-50"
                    onClick={connectToInstagram}
                    disabled={disabled}
                  >
                    <Link2 className="h-4 w-4" />
                    Connect to Instagram
                  </button>
                )}
              </div>
            </div>
            
            {config.platforms.instagram?.enabled && (
              <div className="space-y-4">
                <div>
                  <label htmlFor="instagram-content-prompt" className="block text-sm font-medium mb-2 text-gray-900">Instagram Content Prompt</label>
                  <textarea
                    id="instagram-content-prompt"
                    placeholder="Prompt for generating Instagram-specific content..."
                    value={config.platforms.instagram?.contentPrompt || ''}
                    onChange={(e) => {
                      const updatedPlatforms = { ...config.platforms };
                      if (!updatedPlatforms.instagram) {
                        updatedPlatforms.instagram = DEFAULT_PLATFORM_CONFIG;
                      }
                      updatedPlatforms.instagram.contentPrompt = e.target.value;
                      onConfigChange({ ...config, platforms: updatedPlatforms });
                    }}
                    disabled={disabled}
                    className="w-full p-3 border border-gray-300 rounded-lg text-gray-900 min-h-[100px]"
                  />
                </div>
                
                <div>
                  <label htmlFor="instagram-hashtag-prompt" className="block text-sm font-medium mb-2 text-gray-900">Instagram Hashtag Prompt</label>
                  <textarea
                    id="instagram-hashtag-prompt"
                    placeholder="Prompt for generating Instagram hashtags..."
                    value={config.platforms.instagram?.hashtagPrompt || ''}
                    onChange={(e) => {
                      const updatedPlatforms = { ...config.platforms };
                      if (!updatedPlatforms.instagram) {
                        updatedPlatforms.instagram = DEFAULT_PLATFORM_CONFIG;
                      }
                      updatedPlatforms.instagram.hashtagPrompt = e.target.value;
                      onConfigChange({ ...config, platforms: updatedPlatforms });
                    }}
                    disabled={disabled}
                    className="w-full p-3 border border-gray-300 rounded-lg text-gray-900 min-h-[100px]"
                  />
                </div>
                
                <div>
                  <label htmlFor="instagram-content-length" className="block text-sm font-medium mb-2 text-gray-900">Maximum Content Length</label>
                  <input
                    id="instagram-content-length"
                    type="number"
                    placeholder="2200"
                    value={config.platforms.instagram?.contentLength || 2200}
                    onChange={(e) => {
                      const updatedPlatforms = { ...config.platforms };
                      if (!updatedPlatforms.instagram) {
                        updatedPlatforms.instagram = DEFAULT_PLATFORM_CONFIG;
                      }
                      updatedPlatforms.instagram.contentLength = parseInt(e.target.value);
                      onConfigChange({ ...config, platforms: updatedPlatforms });
                    }}
                    disabled={disabled}
                    className="w-full p-3 border border-gray-300 rounded-lg text-gray-900"
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    Instagram caption limit is approximately 2200 characters
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
} 