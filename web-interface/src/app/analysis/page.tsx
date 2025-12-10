'use client';

import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, Database, BarChart3, Activity, RefreshCw, DollarSign, 
  Youtube, Instagram, Hash, Filter, Calendar, Globe, ChevronDown, Home, ArrowLeft
} from 'lucide-react';
import { QuotaEfficiencyDisplay } from '@/components/features/QuotaEfficiencyDisplay';
import { OpenAIUsageTracker } from '@/components/features/OpenAIUsageTracker';
import { analyticsManager } from '@/utils/analytics';
import { useAPIKey } from '@/utils/apiKeyManager';
import type { AnalyticsData } from '@/utils/analytics';

interface PlatformStats {
  youtube?: {
    videos_uploaded: number;
    videos_processed: number;
    quota_saved: number;
    cache_efficiency: number;
    last_updated: string;
    channel_id?: string;
    channels_count?: number;
    channel_breakdown?: Record<string, {
      videos: number;
      quota_saved: number;
    }>;
  };
  instagram?: {
    posts_created: number;
    stories_posted: number;
    engagement_rate: number;
    last_updated: string;
  };
  tiktok?: {
    videos_posted: number;
    views_total: number;
    engagement_rate: number;
    last_updated: string;
  };
}

interface YouTubeChannel {
  id: string;
  title: string;
  thumbnail?: string;
}

type Platform = 'all' | 'youtube' | 'instagram' | 'tiktok';

const PLATFORM_INFO = {
  all: { 
    name: 'All Platforms', 
    icon: Globe, 
    color: 'text-gray-600',
    bgColor: 'bg-gray-50',
    borderColor: 'border-gray-200'
  },
  youtube: { 
    name: 'YouTube', 
    icon: Youtube, 
    color: 'text-red-500',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200'
  },
  instagram: { 
    name: 'Instagram', 
    icon: Instagram, 
    color: 'text-pink-500',
    bgColor: 'bg-pink-50',
    borderColor: 'border-pink-200'
  },
  tiktok: { 
    name: 'TikTok', 
    icon: Hash, 
    color: 'text-black',
    bgColor: 'bg-gray-50',
    borderColor: 'border-gray-300'
  }
};

export default function AnalysisPage() {
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [weeklyStats, setWeeklyStats] = useState<any>(null);
  const [featureStats, setFeatureStats] = useState<any>(null);
  const [platformStats, setPlatformStats] = useState<any>(null);
  const [selectedPlatform, setSelectedPlatform] = useState<Platform>('all');
  const [platformAnalytics, setPlatformAnalytics] = useState<PlatformStats>({});
  const [showPlatformDropdown, setShowPlatformDropdown] = useState(false);
  const [selectedChannelId, setSelectedChannelId] = useState<string>('');
  const [availableChannels, setAvailableChannels] = useState<YouTubeChannel[]>([]);
  const [showChannelDropdown, setShowChannelDropdown] = useState(false);
  const { apiKey } = useAPIKey();

  const loadAnalytics = () => {
    const data = analyticsManager.getAnalyticsData();
    const weekly = analyticsManager.getWeeklyStats();
    const features = analyticsManager.getFeatureUsageStats();
    const platforms = analyticsManager.getPlatformUsageStats();
    
    // Only set data if there are real sessions
    setAnalyticsData(data.sessions.length > 0 ? data : null);
    setWeeklyStats(weekly.videosThisWeek > 0 ? weekly : null);
    setFeatureStats(Object.keys(features).length > 0 ? features : null);
    setPlatformStats(Object.keys(platforms).length > 0 ? platforms : null);
  };

  const loadPlatformAnalytics = async () => {
    try {
      const params = new URLSearchParams({
        platform: selectedPlatform
      });
      
      if (selectedChannelId && selectedPlatform === 'youtube') {
        params.append('channelId', selectedChannelId);
      }
      
      const response = await fetch(`/api/platform-analytics?${params}`);
      if (response.ok) {
        const data = await response.json();
        setPlatformAnalytics(data);
      }
    } catch (error) {
      console.error('Error loading platform analytics:', error);
    }
  };

  const loadAvailableChannels = async () => {
    try {
      const response = await fetch('/api/youtube-channels');
      if (response.ok) {
        const data = await response.json();
        if (data.channels) {
          setAvailableChannels(data.channels);
        }
      }
    } catch (error) {
      console.error('Error loading channels:', error);
    }
  };

  const clearAllAnalytics = () => {
    if (confirm('Are you sure you want to clear all analytics data? This cannot be undone.')) {
      analyticsManager.clearData();
      setAnalyticsData(null);
      setWeeklyStats(null);
      setFeatureStats(null);
      setPlatformStats(null);
      setPlatformAnalytics({});
      alert('Analytics data cleared successfully');
    }
  };

  const getFilteredStats = () => {
    if (!analyticsData || selectedPlatform === 'all') {
      return analyticsData;
    }

    // Filter sessions by platform (for future platform-specific tracking)
    const filteredSessions = analyticsData.sessions.filter(session => {
      // For now, treat all sessions as YouTube since that's our primary platform
      // In future, sessions will have platform metadata
      return selectedPlatform === 'youtube';
    });

    return {
      ...analyticsData,
      sessions: filteredSessions,
      totals: {
        ...analyticsData.totals,
        // Recalculate totals for filtered data
        videosProcessed: filteredSessions.reduce((sum, s) => sum + s.videoCount, 0),
        videosUploaded: filteredSessions.reduce((sum, s) => sum + (s.videosUploaded || 0), 0)
      }
    };
  };

  useEffect(() => {
    loadAnalytics();
    loadAvailableChannels();
  }, [apiKey]);

  useEffect(() => {
    loadPlatformAnalytics();
  }, [apiKey, selectedPlatform, selectedChannelId]);

  const filteredAnalytics = getFilteredStats();
  const currentPlatform = PLATFORM_INFO[selectedPlatform];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <header className="text-center py-8">
          {/* Navigation back to main page */}
          <div className="flex items-center justify-between mb-6">
            <a 
              href="/"
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-gray-700 font-medium"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Main
            </a>
            
            <div className="flex-1" />
            
            <div className="flex gap-2">
              <button
                onClick={clearAllAnalytics}
                className="px-3 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors text-sm"
              >
                Clear Data
              </button>
              <button
                onClick={loadAnalytics}
                className="flex items-center gap-1 px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm"
              >
                <RefreshCw className="w-4 h-4" />
                Refresh
              </button>
            </div>
          </div>

          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="bg-blue-600 rounded-full p-3">
              <BarChart3 className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-4xl font-bold text-gray-900">Analytics & Performance</h1>
          </div>
          
          {/* Platform Filter */}
          <div className="mt-6 flex justify-center">
            <div className="relative">
              <button
                onClick={() => setShowPlatformDropdown(!showPlatformDropdown)}
                className={`flex items-center gap-3 px-6 py-3 rounded-lg border-2 transition-all ${currentPlatform.bgColor} ${currentPlatform.borderColor} hover:shadow-md`}
              >
                <currentPlatform.icon className={`w-5 h-5 ${currentPlatform.color}`} />
                <span className="font-medium text-gray-900">{currentPlatform.name}</span>
                <ChevronDown className="w-4 h-4 text-gray-500" />
              </button>
              
              {showPlatformDropdown && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
                  {Object.entries(PLATFORM_INFO).map(([key, info]) => (
                    <button
                      key={key}
                      onClick={() => {
                        setSelectedPlatform(key as Platform);
                        setShowPlatformDropdown(false);
                      }}
                      className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors ${
                        selectedPlatform === key ? 'bg-blue-50 border-l-4 border-blue-500' : ''
                      }`}
                    >
                      <info.icon className={`w-4 h-4 ${info.color}`} />
                      <span className="text-gray-900">{info.name}</span>
                      {selectedPlatform === key && (
                        <span className="ml-auto text-blue-600 text-sm">✓</span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
          
          {/* Channel Filter (YouTube only) */}
          {(selectedPlatform === 'youtube' || selectedPlatform === 'all') && availableChannels.length > 0 && (
            <div className="mt-4 flex justify-center">
              <div className="relative">
                <button
                  onClick={() => setShowChannelDropdown(!showChannelDropdown)}
                  className="flex items-center gap-3 px-6 py-3 rounded-lg border-2 bg-white border-gray-200 hover:shadow-md transition-all"
                >
                  <Youtube className="w-5 h-5 text-red-500" />
                  <span className="font-medium text-gray-900">
                    {selectedChannelId 
                      ? availableChannels.find(ch => ch.id === selectedChannelId)?.title || 'Unknown Channel'
                      : 'All Channels'
                    }
                  </span>
                  <span className="text-xs text-gray-500">
                    ({availableChannels.length} channels)
                  </span>
                  <ChevronDown className="w-4 h-4 text-gray-500" />
                </button>
                
                {showChannelDropdown && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg z-10 max-h-64 overflow-y-auto">
                    <button
                      onClick={() => {
                        setSelectedChannelId('');
                        setShowChannelDropdown(false);
                      }}
                      className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors ${
                        !selectedChannelId ? 'bg-blue-50 border-l-4 border-blue-500' : ''
                      }`}
                    >
                      <Youtube className="w-4 h-4 text-red-500" />
                      <span className="text-gray-900">All Channels</span>
                      {!selectedChannelId && (
                        <span className="ml-auto text-blue-600 text-sm">✓</span>
                      )}
                    </button>
                    {availableChannels.map((channel) => (
                      <button
                        key={channel.id}
                        onClick={() => {
                          setSelectedChannelId(channel.id);
                          setShowChannelDropdown(false);
                        }}
                        className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors ${
                          selectedChannelId === channel.id ? 'bg-blue-50 border-l-4 border-blue-500' : ''
                        }`}
                      >
                        {channel.thumbnail ? (
                          <img 
                            src={channel.thumbnail} 
                            alt={channel.title}
                            className="w-4 h-4 rounded-full"
                          />
                        ) : (
                          <Youtube className="w-4 h-4 text-red-500" />
                        )}
                        <span className="text-gray-900 truncate">{channel.title}</span>
                        {selectedChannelId === channel.id && (
                          <span className="ml-auto text-blue-600 text-sm">✓</span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
          
          {/* Explanation Banner */}
          <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <div className="bg-blue-100 rounded-full p-2">
                <BarChart3 className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h3 className="text-blue-900 font-semibold">📊 Platform-Specific Analytics</h3>
                <p className="text-blue-800 text-sm mt-1">
                  <strong>Current View:</strong> {currentPlatform.name} metrics and performance data
                  {selectedChannelId && (
                    <span> • Channel: {availableChannels.find(ch => ch.id === selectedChannelId)?.title || 'Selected Channel'}</span>
                  )}
                  <br/>
                  <strong>Videos Uploaded:</strong> Actually published to platforms (excludes test runs & process-only sessions)<br/>
                  <strong>Videos Processed:</strong> All videos that went through processing (including tests & dry runs)<br/>
                  <strong>Multi-Channel:</strong> Analytics track performance per channel for better insights
                </p>
              </div>
            </div>
          </div>
        </header>

        {/* Navigation Breadcrumb */}
        <nav className="mb-8">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 px-4 py-3">
            <div className="flex items-center gap-2 text-sm">
              <a href="/" className="text-blue-600 hover:text-blue-800 transition-colors">
                Home
              </a>
              <span className="text-gray-400">/</span>
              <span className="text-gray-900 font-medium">Analysis</span>
              <span className="text-gray-400">/</span>
              <span className="text-gray-600">{currentPlatform.name}</span>
            </div>
          </div>
        </nav>

        {/* Analysis Sections */}
        <div className="space-y-8">
          {/* Platform-Specific Overview */}
          {selectedPlatform !== 'all' && (
            <section>
              <div className="mb-6">
                <h2 className="text-2xl font-semibold text-gray-900 mb-2 flex items-center gap-3">
                  <currentPlatform.icon className={`h-6 w-6 ${currentPlatform.color}`} />
                  {currentPlatform.name} Performance Overview
                </h2>
                <p className="text-gray-600">
                  Detailed performance metrics and analytics for {currentPlatform.name}
                </p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {selectedPlatform === 'youtube' && (
                  <>
                    <div className={`${currentPlatform.bgColor} ${currentPlatform.borderColor} border rounded-lg p-6`}>
                      <div className="text-2xl font-bold text-red-600">
                        {platformAnalytics.youtube?.videos_uploaded || filteredAnalytics?.totals?.videosUploaded || 0}
                      </div>
                      <div className="text-sm text-red-700">Videos Uploaded</div>
                      <div className="text-xs text-gray-500 mt-1">
                        {selectedChannelId ? 'From selected channel' : 'Successfully published'}
                      </div>
                      {platformAnalytics.youtube?.channel_id && (
                        <div className="text-xs text-red-600 mt-1">
                          Channel: {availableChannels.find(ch => ch.id === platformAnalytics.youtube?.channel_id)?.title || 'Unknown'}
                        </div>
                      )}
                    </div>
                    <div className={`${currentPlatform.bgColor} ${currentPlatform.borderColor} border rounded-lg p-6`}>
                      <div className="text-2xl font-bold text-red-600">
                        {platformAnalytics.youtube?.videos_processed || filteredAnalytics?.totals?.videosProcessed || 0}
                      </div>
                      <div className="text-sm text-red-700">Videos Processed</div>
                      <div className="text-xs text-gray-500 mt-1">Including test runs</div>
                    </div>
                    <div className={`${currentPlatform.bgColor} ${currentPlatform.borderColor} border rounded-lg p-6`}>
                      <div className="text-2xl font-bold text-red-600">
                        {platformAnalytics.youtube?.quota_saved || 0}
                      </div>
                      <div className="text-sm text-red-700">Quota Saved</div>
                      <div className="text-xs text-gray-500 mt-1">Through caching</div>
                    </div>
                    <div className={`${currentPlatform.bgColor} ${currentPlatform.borderColor} border rounded-lg p-6`}>
                      <div className="text-2xl font-bold text-red-600">
                        {platformAnalytics.youtube?.cache_efficiency || Math.round(filteredAnalytics?.totals?.successRate || 0)}%
                      </div>
                      <div className="text-sm text-red-700">Cache Efficiency</div>
                      <div className="text-xs text-gray-500 mt-1">Quota optimization</div>
                    </div>
                    
                    {/* Multi-Channel Breakdown */}
                    {!selectedChannelId && platformAnalytics.youtube?.channels_count && platformAnalytics.youtube.channels_count > 1 && (
                      <div className="md:col-span-2 lg:col-span-4 mt-6">
                        <div className="bg-white rounded-lg border border-gray-200 p-6">
                          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                            <Youtube className="w-5 h-5 text-red-500" />
                            Channel Breakdown ({platformAnalytics.youtube.channels_count} channels)
                          </h3>
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {platformAnalytics.youtube.channel_breakdown && Object.entries(platformAnalytics.youtube.channel_breakdown).map(([channelId, data]) => {
                              const channelInfo = availableChannels.find(ch => ch.id === channelId);
                              return (
                                <div key={channelId} className="bg-red-50 border border-red-200 rounded-lg p-4">
                                  <div className="flex items-center gap-2 mb-2">
                                    {channelInfo?.thumbnail ? (
                                      <img 
                                        src={channelInfo.thumbnail} 
                                        alt={channelInfo.title}
                                        className="w-6 h-6 rounded-full"
                                      />
                                    ) : (
                                      <Youtube className="w-6 h-6 text-red-500" />
                                    )}
                                    <span className="font-medium text-gray-900 text-sm truncate">
                                      {channelInfo?.title || `Channel ${channelId.slice(-8)}`}
                                    </span>
                                  </div>
                                  <div className="space-y-1">
                                    <div className="flex justify-between">
                                      <span className="text-xs text-gray-500">Videos:</span>
                                      <span className="text-sm font-medium text-red-600">{data.videos}</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-xs text-gray-500">Quota Saved:</span>
                                      <span className="text-sm font-medium text-red-600">{data.quota_saved}</span>
                                    </div>
                                  </div>
                                  <button
                                    onClick={() => setSelectedChannelId(channelId)}
                                    className="mt-2 w-full px-3 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors"
                                  >
                                    View Details
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                )}
                
                {selectedPlatform === 'instagram' && (
                  <>
                    <div className={`${currentPlatform.bgColor} ${currentPlatform.borderColor} border rounded-lg p-6`}>
                      <div className="text-2xl font-bold text-pink-600">
                        {platformAnalytics.instagram?.posts_created || 0}
                      </div>
                      <div className="text-sm text-pink-700">Posts Created</div>
                      <div className="text-xs text-gray-500 mt-1">Total content pieces</div>
                    </div>
                    <div className={`${currentPlatform.bgColor} ${currentPlatform.borderColor} border rounded-lg p-6`}>
                      <div className="text-2xl font-bold text-pink-600">
                        {platformAnalytics.instagram?.stories_posted || 0}
                      </div>
                      <div className="text-sm text-pink-700">Stories Posted</div>
                      <div className="text-xs text-gray-500 mt-1">24-hour stories</div>
                    </div>
                    <div className={`${currentPlatform.bgColor} ${currentPlatform.borderColor} border rounded-lg p-6`}>
                      <div className="text-2xl font-bold text-pink-600">
                        {Math.round(platformAnalytics.instagram?.engagement_rate || 0)}%
                      </div>
                      <div className="text-sm text-pink-700">Engagement Rate</div>
                      <div className="text-xs text-gray-500 mt-1">Likes + comments</div>
                    </div>
                    <div className={`${currentPlatform.bgColor} ${currentPlatform.borderColor} border rounded-lg p-6`}>
                      <div className="text-2xl font-bold text-pink-600">--</div>
                      <div className="text-sm text-pink-700">Coming Soon</div>
                      <div className="text-xs text-gray-500 mt-1">More metrics</div>
                    </div>
                  </>
                )}
                
                {selectedPlatform === 'tiktok' && (
                  <>
                    <div className={`${currentPlatform.bgColor} ${currentPlatform.borderColor} border rounded-lg p-6`}>
                      <div className="text-2xl font-bold text-gray-900">
                        {platformAnalytics.tiktok?.videos_posted || 0}
                      </div>
                      <div className="text-sm text-gray-700">Videos Posted</div>
                      <div className="text-xs text-gray-500 mt-1">Total uploads</div>
                    </div>
                    <div className={`${currentPlatform.bgColor} ${currentPlatform.borderColor} border rounded-lg p-6`}>
                      <div className="text-2xl font-bold text-gray-900">
                        {platformAnalytics.tiktok?.views_total?.toLocaleString() || 0}
                      </div>
                      <div className="text-sm text-gray-700">Total Views</div>
                      <div className="text-xs text-gray-500 mt-1">All-time views</div>
                    </div>
                    <div className={`${currentPlatform.bgColor} ${currentPlatform.borderColor} border rounded-lg p-6`}>
                      <div className="text-2xl font-bold text-gray-900">
                        {Math.round(platformAnalytics.tiktok?.engagement_rate || 0)}%
                      </div>
                      <div className="text-sm text-gray-700">Engagement Rate</div>
                      <div className="text-xs text-gray-500 mt-1">Likes + shares</div>
                    </div>
                    <div className={`${currentPlatform.bgColor} ${currentPlatform.borderColor} border rounded-lg p-6`}>
                      <div className="text-2xl font-bold text-gray-900">--</div>
                      <div className="text-sm text-gray-700">Coming Soon</div>
                      <div className="text-xs text-gray-500 mt-1">More metrics</div>
                    </div>
                  </>
                )}
              </div>
            </section>
          )}

          {/* Quota Efficiency Dashboard */}
          <section>
            <div className="mb-6">
              <h2 className="text-2xl font-semibold text-gray-900 mb-2 flex items-center gap-3">
                <TrendingUp className="h-6 w-6 text-blue-600" />
                Quota Efficiency Dashboard
                {selectedPlatform !== 'all' && (
                  <span className="text-sm bg-gray-100 px-2 py-1 rounded-full text-gray-600">
                    {currentPlatform.name}
                  </span>
                )}
              </h2>
              <p className="text-gray-600">
                Real-time monitoring of {selectedPlatform === 'all' ? 'multi-platform' : currentPlatform.name} API quota usage and ultra-efficient caching performance
              </p>
            </div>
            <QuotaEfficiencyDisplay />
          </section>

          {/* Real OpenAI Usage Tracking */}
          <section>
            <div className="mb-6">
              <h2 className="text-2xl font-semibold text-gray-900 mb-2 flex items-center gap-3">
                <DollarSign className="h-6 w-6 text-green-600" />
                Real OpenAI Usage Tracking
                {selectedPlatform !== 'all' && (
                  <span className="text-sm bg-gray-100 px-2 py-1 rounded-full text-gray-600">
                    {currentPlatform.name}
                  </span>
                )}
              </h2>
              <p className="text-gray-600">
                Live spending data directly from OpenAI API - see exactly what you're paying for across platforms
              </p>
            </div>
            
            <OpenAIUsageTracker 
              apiKey={apiKey}
              onUsageUpdate={(usage) => {
                console.log('OpenAI usage updated:', usage);
              }}
            />
          </section>

          {/* Cache Performance Insights */}
          <section className="mt-8">
            <div className="mb-6">
              <h2 className="text-2xl font-semibold text-gray-900 mb-2 flex items-center gap-3">
                <Database className="h-6 w-6 text-green-600" />
                Cache Performance Insights
                {selectedPlatform !== 'all' && (
                  <span className="text-sm bg-gray-100 px-2 py-1 rounded-full text-gray-600">
                    {currentPlatform.name}
                  </span>
                )}
              </h2>
              <p className="text-gray-600">
                Deep dive into how the ultra-efficient caching system is saving {selectedPlatform === 'all' ? 'multi-platform' : currentPlatform.name} API quota
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Real Usage Stats */}
              <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Feature Usage</h3>
                {featureStats && Object.keys(featureStats).length > 0 ? (
                  <div className="space-y-4">
                    {Object.entries(featureStats).map(([feature, percentage]) => (
                      <div key={feature} className="flex justify-between items-center">
                        <span className="text-sm text-gray-600 capitalize">
                          {feature.replace(/([A-Z])/g, ' $1').trim()}
                        </span>
                        <div className="flex items-center gap-2">
                          <div className="w-24 bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-blue-500 h-2 rounded-full" 
                              style={{ width: `${percentage}%` }}
                            ></div>
                          </div>
                          <span className="text-sm font-medium text-blue-600">{Math.round(percentage as number)}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <BarChart3 className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                    <p>No usage data yet</p>
                    <p className="text-sm">Start processing videos to see feature usage statistics</p>
                  </div>
                )}
              </div>

              {/* Weekly Performance */}
              <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">This Week's Performance</h3>
                {weeklyStats ? (
                  <div className="space-y-3">
                    <div className="text-center p-4 bg-green-50 border border-green-200 rounded-lg">
                      <div className="text-2xl font-bold text-green-600">{weeklyStats.videosUploadedThisWeek}</div>
                      <div className="text-sm text-green-700">Videos Uploaded</div>
                    </div>
                    <div className="text-center p-4 bg-blue-50 border border-blue-200 rounded-lg">
                      <div className="text-2xl font-bold text-blue-600">{weeklyStats.videosThisWeek}</div>
                      <div className="text-sm text-blue-700">Videos Processed</div>
                    </div>
                    <div className="text-center p-4 bg-purple-50 border border-purple-200 rounded-lg">
                      <div className="text-2xl font-bold text-purple-600">${weeklyStats.costThisWeek.toFixed(2)}</div>
                      <div className="text-sm text-purple-700">Total Costs</div>
                    </div>
                    <div className="text-center p-4 bg-orange-50 border border-orange-200 rounded-lg">
                      <div className="text-2xl font-bold text-orange-600">{weeklyStats.quotaSaved.toLocaleString()}</div>
                      <div className="text-sm text-orange-700">API Quota Saved</div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-4 text-gray-500">
                    <p>No data for this week yet</p>
                  </div>
                )}
              </div>
            </div>
            
            {/* Processing Mode Breakdown */}
            {analyticsData && analyticsData.sessions.length > 0 && (
              <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6 mt-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">📊 Processing Mode Breakdown</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {(() => {
                    const modeStats = analyticsData.sessions.reduce((acc, session) => {
                      const mode = session.mode || 'unknown';
                      if (!acc[mode]) {
                        acc[mode] = { sessions: 0, videos: 0, uploaded: 0 };
                      }
                      acc[mode].sessions++;
                      acc[mode].videos += session.videoCount;
                      acc[mode].uploaded += session.videosUploaded || 0;
                      return acc;
                    }, {} as Record<string, { sessions: number; videos: number; uploaded: number }>);

                    return Object.entries(modeStats).map(([mode, stats]) => (
                      <div key={mode} className="text-center p-4 bg-gray-50 border border-gray-200 rounded-lg">
                        <div className="text-xl font-bold text-blue-600">{stats.uploaded}</div>
                        <div className="text-xs text-gray-600">of {stats.videos} uploaded</div>
                        <div className="text-sm text-gray-700 capitalize mt-1 font-medium">
                          {mode === 'dry-run' ? '🧪 Test Mode' :
                           mode === 'process-only' ? '⚙️ Process Only' :
                           mode === 'full-upload' ? '📤 Single Upload' :
                           mode === 'batch-upload' ? '📦 Batch Upload' :
                           mode}
                        </div>
                        <div className="text-xs text-gray-500">{stats.sessions} sessions</div>
                      </div>
                    ));
                  })()}
                </div>
              </div>
            )}

            {/* Platform Usage Stats */}
            {platformStats && Object.keys(platformStats).length > 0 && (
              <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6 mt-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Platform Usage</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {Object.entries(platformStats).map(([platform, count]) => (
                    <div key={platform} className="text-center p-4 bg-gray-50 border border-gray-200 rounded-lg">
                      <div className="text-2xl font-bold text-blue-600">{count as number}</div>
                      <div className="text-sm text-gray-700 capitalize">{platform}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>

          {/* Processing Performance */}
          <section>
            <div className="mb-6">
              <h2 className="text-2xl font-semibold text-gray-900 mb-2 flex items-center gap-3">
                <Activity className="h-6 w-6 text-purple-600" />
                Processing Performance Metrics
                {selectedPlatform !== 'all' && (
                  <span className="text-sm bg-gray-100 px-2 py-1 rounded-full text-gray-600">
                    {currentPlatform.name}
                  </span>
                )}
              </h2>
              <p className="text-gray-600">
                Historical data on {selectedPlatform === 'all' ? 'multi-platform' : currentPlatform.name} processing times and efficiency
              </p>
            </div>
            
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
              {filteredAnalytics && filteredAnalytics.sessions.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {filteredAnalytics.totals.videosUploaded || 0}
                    </div>
                    <div className="text-sm text-green-700">Videos Uploaded</div>
                    <div className="text-xs text-gray-500 mt-1">
                      Actually published to {selectedPlatform === 'all' ? 'platforms' : currentPlatform.name}
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">
                      {filteredAnalytics.totals.videosProcessed || 0}
                    </div>
                    <div className="text-sm text-blue-700">Videos Processed</div>
                    <div className="text-xs text-gray-500 mt-1">
                      Including tests & processing-only
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600">
                      {Math.round(filteredAnalytics.totals.successRate) || 0}%
                    </div>
                    <div className="text-sm text-purple-700">Success Rate</div>
                    <div className="text-xs text-gray-500 mt-1">
                      Sessions completed successfully
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-orange-600">
                      {Math.round(filteredAnalytics.totals.totalTimeSaved / 60) || 0}m
                    </div>
                    <div className="text-sm text-orange-700">Time Saved</div>
                    <div className="text-xs text-gray-500 mt-1">
                      From silence removal
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Activity className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p>No processing data yet</p>
                  <p className="text-sm">Process some videos to see performance metrics</p>
                </div>
              )}
            </div>
          </section>

          {/* Real-Data Based Recommendations */}
          {analyticsData && analyticsData.sessions.length > 0 && (
            <section>
              <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">💡 Optimization Recommendations</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Success Rate Recommendation */}
                  {analyticsData.totals.successRate < 80 && (
                    <div className="bg-white rounded-lg p-4">
                      <h4 className="font-medium text-gray-900 mb-2">🎯 Improve Success Rate</h4>
                      <p className="text-sm text-gray-600">
                        Your success rate is {Math.round(analyticsData.totals.successRate)}%. Consider processing during off-peak hours or checking API quotas.
                      </p>
                    </div>
                  )}
                  
                  {/* Processing Efficiency */}
                  {weeklyStats && weeklyStats.videosThisWeek > 5 && (
                    <div className="bg-white rounded-lg p-4">
                      <h4 className="font-medium text-gray-900 mb-2">⚡ High Usage Detected</h4>
                      <p className="text-sm text-gray-600">
                        You've processed {weeklyStats.videosThisWeek} videos this week. Consider batch processing for better efficiency.
                      </p>
                    </div>
                  )}
                  
                  {/* Cost Optimization */}
                  {weeklyStats && weeklyStats.costThisWeek > 1 && (
                    <div className="bg-white rounded-lg p-4">
                      <h4 className="font-medium text-gray-900 mb-2">💰 Cost Optimization</h4>
                      <p className="text-sm text-gray-600">
                        You've spent ${weeklyStats.costThisWeek.toFixed(2)} this week. Consider optimizing AI feature usage to reduce costs.
                      </p>
                    </div>
                  )}
                  
                  {/* Default message for low usage */}
                  {(!weeklyStats || weeklyStats.videosThisWeek === 0) && (
                    <div className="bg-white rounded-lg p-4 md:col-span-2">
                      <h4 className="font-medium text-gray-900 mb-2">📊 Start Processing</h4>
                      <p className="text-sm text-gray-600">
                        Process some videos to receive personalized optimization recommendations based on your usage patterns.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
} 