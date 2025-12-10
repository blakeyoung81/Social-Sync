'use client';

import React, { useState, useEffect } from 'react';
import { Clock, DollarSign, Zap, Upload, Video, Image, FileText, Volume2, Scissors, MessageSquare, PlusCircle, Youtube, CheckCircle, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { calculateEstimatedCost, formatCost } from '@/utils/costCalculation';
import type { ProcessingOptions, MultiPlatformConfig } from '../../types';

interface ExecutionSummaryProps {
  options: ProcessingOptions;
  multiPlatformConfig: MultiPlatformConfig;
  videoCount?: number;
  videoDiscovery?: any; // Add videoDiscovery to get landscape count
  processing?: boolean;
}

interface TimeEstimate {
  perVideo: number; // minutes
  total: number;
  breakdown: {
    processing: number;
    aiFeatures: number;
    upload: number;
  };
}

// Remove redundant interface - using centralized cost calculation

export function ExecutionSummary({ options, multiPlatformConfig, videoCount = 0, videoDiscovery, processing = false }: ExecutionSummaryProps) {
  const [timeEstimate, setTimeEstimate] = useState<TimeEstimate | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  
  // Use centralized cost calculation with full videoDiscovery data
  const costBreakdown = calculateEstimatedCost(options, videoDiscovery || { totalVideos: videoCount });

  // Calculate time estimates when options change
  useEffect(() => {
    calculateTimeEstimates();
  }, [options, multiPlatformConfig, videoCount]);

  const calculateTimeEstimates = () => {
    // Based on your experience: 1 minute of video = 1 minute of processing
    // Assume average video length of 10 minutes for estimation
    const avgVideoLengthMinutes = 10;
    const baseProcessingTime = avgVideoLengthMinutes; // 1:1 ratio
    
    let totalTime = baseProcessingTime;
    let uploadTime = 2; // Upload time

    // Add minimal time for AI features
    if (!options.skipThumbnail) totalTime += 1; // DALL-E generation
    
    const perVideoTime = totalTime + uploadTime;
    const totalBatchTime = perVideoTime * Math.max(videoCount, 1);

    setTimeEstimate({
      perVideo: Math.round(perVideoTime),
      total: Math.round(totalBatchTime),
      breakdown: {
        processing: Math.round(totalTime),
        aiFeatures: 0, // Not showing this anymore
        upload: Math.round(uploadTime)
      }
    });
  };

  const getEnabledFeatures = () => {
    const features = [];
    if (!options.skipAudio) features.push({ name: 'Audio Enhancement', icon: Volume2, color: 'green' });
    if (!options.skipSilence) features.push({ name: 'Silence Removal', icon: Scissors, color: 'blue' });
    if (!options.skipTranscription) features.push({ name: 'AI Transcription', icon: MessageSquare, color: 'purple' });
    if (!options.skipGpt) features.push({ name: 'GPT Correction', icon: FileText, color: 'orange' });
    if (!options.skipSubtitles) features.push({ name: 'Subtitle Burning', icon: MessageSquare, color: 'indigo' });
    if (!options.skipOutro) features.push({ name: 'Outro Addition', icon: PlusCircle, color: 'green' });
    if (!options.skipThumbnail) features.push({ name: 'AI Thumbnails', icon: Image, color: 'pink' });
    if (!options.skipPlaylist) features.push({ name: 'Smart Playlists', icon: Youtube, color: 'red' });
    
    // AI features
    if (options.useGptForTitle) features.push({ name: 'AI Titles', icon: Zap, color: 'yellow' });
    if (options.useGptForDescription) features.push({ name: 'AI Descriptions', icon: Zap, color: 'cyan' });
    if (options.useGptForTags) features.push({ name: 'AI Tags', icon: Zap, color: 'lime' });
    
    return features;
  };

  const getEnabledPlatforms = () => {
    const platforms = [{ name: 'YouTube', color: 'red', enabled: true }];
    
    if (multiPlatformConfig.platforms) {
      Object.entries(multiPlatformConfig.platforms).forEach(([platform, config]) => {
        if (config.enabled) {
          platforms.push({
            name: platform.charAt(0).toUpperCase() + platform.slice(1),
            color: getPlatformColor(platform),
            enabled: true
          });
        }
      });
    }
    
    return platforms;
  };

  const getPlatformColor = (platform: string) => {
    const colors: Record<string, string> = {
      facebook: 'blue',
      twitter: 'sky',
      linkedin: 'blue',
      instagram: 'pink',
      tiktok: 'black',
      telegram: 'blue'
    };
    return colors[platform] || 'gray';
  };

  const getModeDisplay = () => {
    const mode = multiPlatformConfig.general?.processingMode || options.mode;
    switch (mode) {
      case 'dry-run': return { title: '🧪 Test Run', subtitle: 'Process videos without uploading', color: 'blue' };
      case 'process-only': return { title: '⚙️ Process Only', subtitle: 'Process and save locally', color: 'green' };
      case 'full-upload': return { title: '🚀 Single Upload', subtitle: 'Process and upload one video', color: 'purple' };
      case 'batch-upload': return { title: '📦 Batch Upload', subtitle: 'Process and upload all videos', color: 'red' };
      default: return { title: '🧪 Test Run', subtitle: 'Process videos without uploading', color: 'blue' };
    }
  };

  const formatTime = (minutes: number) => {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  const modeDisplay = getModeDisplay();
  const enabledFeatures = getEnabledFeatures();
  const enabledPlatforms = getEnabledPlatforms();

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <span>Execution Summary</span>
          </div>
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="text-sm text-blue-600 hover:text-blue-800 underline"
          >
            {showDetails ? 'Hide Details' : 'Show Details'}
          </button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Compact Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          <div className="text-center p-3 bg-gradient-to-br from-blue-50 to-purple-50 border border-blue-200 rounded-lg">
            <div className="text-lg font-bold text-blue-600">
              {modeDisplay.title}
            </div>
            <div className="text-xs text-blue-700">Mode</div>
          </div>
          <div className="text-center p-3 bg-gray-50 border border-gray-200 rounded-lg">
            <div className="text-lg font-bold text-gray-900">
              {(() => {
                const mode = multiPlatformConfig.general?.processingMode || options.mode;
                const totalVideos = videoDiscovery?.totalVideos || videoCount || 0;
                
                if (mode === 'full-upload' && totalVideos > 1) {
                  return `1/${totalVideos}`;
                }
                return totalVideos || 'N/A';
              })()}
            </div>
            <div className="text-xs text-gray-600">Videos</div>
          </div>
          <div className="text-center p-3 bg-green-50 border border-green-200 rounded-lg">
            <div className="text-lg font-bold text-green-600">
              {enabledPlatforms.length}
            </div>
            <div className="text-xs text-green-700">Platforms</div>
          </div>
          <div className="text-center p-3 bg-purple-50 border border-purple-200 rounded-lg">
            <div className="text-lg font-bold text-purple-600">
              {formatCost(costBreakdown.totalCost)}
            </div>
            <div className="text-xs text-purple-700">Total Cost</div>
          </div>
        </div>

        {/* Status Indicators */}
        <div className="flex items-center justify-center gap-4 text-sm">
                      <div className="flex items-center gap-2 text-green-600">
              <div className="w-2 h-2 rounded-full bg-green-500"></div>
              AI Enabled
          </div>
          <div className={`flex items-center gap-2 ${options.inputFolder ? 'text-green-600' : 'text-red-600'}`}>
            <div className={`w-2 h-2 rounded-full ${options.inputFolder ? 'bg-green-500' : 'bg-red-500'}`}></div>
            Input {options.inputFolder ? 'Ready' : 'Missing'}
          </div>
          <div className={`flex items-center gap-2 ${processing ? 'text-blue-600' : 'text-gray-600'}`}>
            <div className={`w-2 h-2 rounded-full ${processing ? 'bg-blue-500 animate-pulse' : 'bg-gray-500'}`}></div>
            {processing ? 'Processing...' : 'Ready'}
          </div>
        </div>

        {/* Detailed breakdown (expandable) */}
        {showDetails && (
          <div className="mt-6 pt-6 border-t border-gray-200 space-y-4">

            {/* Time Estimates */}
            {timeEstimate && (
              <div>
                <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Time Estimates
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <div className="text-lg font-bold text-blue-600">
                      {formatTime(timeEstimate.perVideo)}
                    </div>
                    <div className="text-xs text-blue-700">Per Video (~1:1 ratio)</div>
                  </div>
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                    <div className="text-lg font-bold text-green-600">
                      {formatTime(timeEstimate.total)}
                    </div>
                    <div className="text-xs text-green-700">Total Time (All Videos)</div>
                  </div>
                </div>
              </div>
            )}

          {/* Cost Estimates */}
          <div>
            <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Cost Estimates (Per Video Analysis)
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                <div className="text-lg font-bold text-purple-600">
                  FREE
                </div>
                <div className="text-xs text-purple-700">Whisper Transcription</div>
                <div className="text-xs text-gray-500 mt-1">Local processing</div>
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <div className="text-lg font-bold text-blue-600">
                  {formatCost(videoCount > 0 ? costBreakdown.gptCost / videoCount : 0)}
                </div>
                <div className="text-xs text-blue-700">GPT-4o-mini</div>
                <div className="text-xs text-gray-500 mt-1">Captions, titles, tags</div>
              </div>
              <div className="bg-pink-50 border border-pink-200 rounded-lg p-3">
                <div className="text-lg font-bold text-pink-600">
                  {formatCost(costBreakdown.dalleCost)}
                </div>
                <div className="text-xs text-pink-700">DALL-E 3 Thumbnail</div>
                <div className="text-xs text-gray-500 mt-1">Standard 1024×1024</div>
              </div>
              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                <div className="text-lg font-bold text-green-600">
                  {formatCost(videoCount > 0 ? costBreakdown.totalCost / videoCount : costBreakdown.totalCost)}
                </div>
                <div className="text-xs text-green-700">Total per Video</div>
                <div className="text-xs text-gray-500 mt-1">OpenAI costs only</div>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                <div className="text-lg font-bold text-green-600">
                  {formatCost(costBreakdown.totalCost)}
                </div>
                <div className="text-xs text-green-700">Total OpenAI ({videoCount} videos)</div>
              </div>
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <div className="text-lg font-bold text-red-600">
                  FREE
                </div>
                <div className="text-xs text-red-700">YouTube Quota (within daily limits)</div>
              </div>
            </div>
          </div>

            {/* Enabled Features */}
            <div>
              <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <Zap className="h-4 w-4" />
                Enabled Features ({enabledFeatures.length})
              </h4>
              <div className="flex flex-wrap gap-2">
                {enabledFeatures.map((feature, index) => {
                  const IconComponent = feature.icon;
                  return (
                    <Badge
                      key={index}
                      className="bg-blue-100 text-blue-800 border border-blue-200"
                    >
                      <IconComponent className="h-3 w-3 mr-1" />
                      {feature.name}
                    </Badge>
                  );
                })}
                {enabledFeatures.length === 0 && (
                  <span className="text-gray-500 text-sm italic">No processing features enabled</span>
                )}
              </div>
            </div>

            {/* Target Platforms */}
            <div>
              <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <Upload className="h-4 w-4" />
                Target Platforms ({enabledPlatforms.length})
              </h4>
              <div className="flex flex-wrap gap-2">
                {enabledPlatforms.map((platform, index) => (
                  <Badge
                    key={index}
                    className="bg-green-100 text-green-800 border border-green-200"
                  >
                    {platform.name}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Warnings */}
            {(!options.openaiKey || !options.inputFolder) && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-center gap-2 text-yellow-800 font-medium mb-2">
                  <AlertTriangle className="h-4 w-4" />
                  Configuration Warnings
                </div>
                <div className="space-y-1 text-sm text-yellow-700">
                  {!options.openaiKey && (
                    <div>• No OpenAI API key - AI features (transcription, GPT, thumbnails) will be disabled</div>
                  )}
                  {!options.inputFolder && (
                    <div>• No input folder selected - cannot process videos</div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
} 