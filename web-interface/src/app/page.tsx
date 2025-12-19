'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Upload, Settings, Wand2, Eye, CheckCircle2, AlertCircle, TrendingUp, Trash2, AlertTriangle, Copy, Zap, Shield, Calendar, Music } from 'lucide-react';
import { ProcessingStatus, ProcessingStepsConfig, MultiPlatformManager, ProcessingConfiguration, VideoDiscoveryPanel, ChannelDataScanner, SmartSchedulingPreview } from '../components';
import VideoPreview from '../components/VideoPreview';
import { useVideoDiscovery, useLocalStorage } from '../hooks';
import { DEFAULT_SETTINGS, PROCESSING_STEPS, PROCESSING_MODES } from '../constants/processing';
import type { ProcessingOptions, UploadResult, VideoCompletion, MultiPlatformConfig } from '../types';
import { ExecutionSummary } from '@/components/features/ExecutionSummary';
import { DuplicateManager } from '@/components/features/DuplicateManager';
import { analyticsManager } from '@/utils/analytics';
import { calculateEstimatedCost } from '@/utils/costCalculation';



export default function Home() {
  console.log('🏠 [PAGE] Home component rendering');

  const { data: session, status } = useSession();
  const router = useRouter();

  // Redirect to login if not authenticated
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  const [options, setOptions] = useState<ProcessingOptions>(DEFAULT_SETTINGS);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const [output, setOutput] = useState('');

  const [processingStatus, setProcessingStatus] = useState<string[]>([]);
  const [uploadResults, setUploadResults] = useState<UploadResult[]>([]);
  const [currentStep, setCurrentStep] = useState<string>('');
  const [completedSteps, setCompletedSteps] = useState<string[]>([]);
  const [batchProgress, setBatchProgress] = useState<{ currentVideo: number, totalVideos: number, videoName: string } | null>(null);
  const [progressPercentage, setProgressPercentage] = useState<number>(0);
  const [silenceCutStats, setSilenceCutStats] = useState<{
    seconds_removed: number;
    percentage: number;
    original_duration: number;
    new_duration: number;
    minutes_saved: number;
    seconds_saved: number;
  } | null>(null);
  const [videoCompletions, setVideoCompletions] = useState<VideoCompletion[]>([]);

  const { videoDiscovery, isDiscovering, discoverVideosDebounced, discoverVideos, updateSchedulingPreviewDebounced } = useVideoDiscovery();
  const logContainerRef = useRef<HTMLDivElement>(null);
  const [savedInputFolder, setSavedInputFolder] = useLocalStorage('inputFolder', DEFAULT_SETTINGS.inputFolder);
  const [savedMultiPlatformConfig, setSavedMultiPlatformConfig] = useLocalStorage('multiPlatformConfig', DEFAULT_SETTINGS.multiPlatformConfig);
  const [activeTab, setActiveTab] = useState('processing');

  const isUsingAIFeatures = !options.skipImageGeneration || !options.skipMultimediaAnalysis;

  console.log('🏠 [PAGE] State:', {
    hasInputFolder: !!options.inputFolder,
    processing,
    error,
    activeTab
  });

  useEffect(() => {
    setOptions(prev => ({
      ...prev,
      inputFolder: savedInputFolder,
      multiPlatformConfig: savedMultiPlatformConfig || DEFAULT_SETTINGS.multiPlatformConfig
    }));

    // 🚀 [PERFORMANCE FIX] Only discover videos if folder exists and we're not in dry-run mode for smart scheduling
    if (savedInputFolder && savedMultiPlatformConfig) {
      const processingMode = savedMultiPlatformConfig.general?.processingMode || 'dry-run';
      console.log('🔧 [DEBUG] Initial video discovery - Processing Mode:', processingMode);

      discoverVideos(savedInputFolder, {
        processingMode,
        scheduleMode: processingMode === 'dry-run' ? 'standard' : 'smart', // Force standard for dry-run
        conflictMode: 'basic'
      });
    }
  }, [savedInputFolder, savedMultiPlatformConfig, discoverVideos]);

  const handleOptionChange = (key: keyof ProcessingOptions, value: any) => {
    setOptions(prev => ({ ...prev, [key]: value }));
  };

  const handleInputFolderChange = (value: string) => {
    setOptions(prev => ({ ...prev, inputFolder: value }));
    setSavedInputFolder(value);

    // Trigger video discovery with current configuration
    discoverVideosDebounced(value, {
      scheduleDate: options.multiPlatformConfig.general.schedule,
      scheduleMode: options.multiPlatformConfig.general.scheduleMode === 'delayed' ? 'smart' : options.multiPlatformConfig.general.scheduleMode,
      conflictMode: 'smart-analysis',
      processingMode: options.multiPlatformConfig.general.processingMode
    });

    // Also trigger smart scheduling preview if in smart mode
    if (options.multiPlatformConfig.general.scheduleMode === 'delayed' && value) {
      console.log('🔧 [DEBUG] Folder changed, triggering smart scheduling preview...');
      updateSchedulingPreviewDebounced(value, {
        scheduleDate: options.multiPlatformConfig.general.schedule,
        scheduleMode: 'smart',
        schedulingStrategy: options.multiPlatformConfig.general.schedulingOptions.mode,
        postingTimes: options.multiPlatformConfig.general.defaultPostingTimes,
        slotInterval: options.multiPlatformConfig.general.slotInterval,
        processingMode: options.multiPlatformConfig.general.processingMode
      });
    }
  };

  const handleMultiPlatformConfigChange = (config: MultiPlatformConfig) => {
    console.log('🔧 [DEBUG] Processing mode changed to:', config.general.processingMode);
    console.log('🔧 [DEBUG] Schedule mode changed to:', config.general.scheduleMode);
    setOptions(prev => ({ ...prev, multiPlatformConfig: config }));
    setSavedMultiPlatformConfig(config);

    // Trigger scheduling preview when smart mode is enabled
    if (config.general.scheduleMode === 'delayed' && options.inputFolder) {
      console.log('🔧 [DEBUG] Triggering smart scheduling preview...');
      updateSchedulingPreviewDebounced(options.inputFolder, {
        scheduleDate: config.general.schedule,
        scheduleMode: 'smart',
        schedulingStrategy: config.general.schedulingOptions.mode,
        postingTimes: config.general.defaultPostingTimes,
        slotInterval: config.general.slotInterval,
        processingMode: config.general.processingMode
      });
    }

    // Also trigger basic video discovery when changing folders or modes
    if (options.inputFolder) {
      console.log('🔧 [DEBUG] Triggering basic video discovery...');
      discoverVideosDebounced(options.inputFolder, {
        scheduleDate: config.general.schedule,
        scheduleMode: config.general.scheduleMode === 'delayed' ? 'smart' : config.general.scheduleMode,
        conflictMode: 'smart-analysis',
        processingMode: config.general.processingMode
      });
    }
  };

  const handleProcessVideos = async () => {
    setProcessing(true);
    setProcessingStatus([]);
    setOutput('');
    setError('');
    // Reset processing pipeline state
    setCurrentStep('');
    setCompletedSteps([]);
    setProgressPercentage(0);

    // For single upload mode, only process the first video
    const videosToProcess = options.multiPlatformConfig?.general?.processingMode === 'full-upload'
      ? (videoDiscovery?.files || []).slice(0, 1)
      : videoDiscovery?.files || [];

    console.log(`🎯 [SINGLE UPLOAD CHECK] Processing mode: ${options.multiPlatformConfig?.general?.processingMode}`);
    console.log(`🎯 [SINGLE UPLOAD CHECK] Total videos found: ${videoDiscovery?.files?.length || 0}`);
    console.log(`🎯 [SINGLE UPLOAD CHECK] Videos to process: ${videosToProcess.length}`);

    const response = await fetch('/api/process-videos-stream', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        files: videosToProcess,
        options
      }),
    });

    if (response.status === 400) {
      const errorData = await response.json();
      setError(`Validation Error: ${errorData.error}`);
      setProcessing(false);
      return;
    }

    if (!response.ok) {
      setError(`HTTP Error: ${response.status} ${response.statusText}`);
      setProcessing(false);
      return;
    }

    if (!response.body) {
      setError("Failed to get response stream.");
      setProcessing(false);
      return;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    // 🚀 Add immediate feedback
    setProcessingStatus(['🚀 Connecting to processing server...']);

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.trim()) {
          try {
            // Check if it's a progress message from Python (PROGRESS:)
            if (line.startsWith('PROGRESS:')) {
              const progressData = JSON.parse(line.substring(9)); // Remove 'PROGRESS:' prefix
              console.log('📊 [PROGRESS] Received:', progressData);

              // Update current step and progress
              setCurrentStep(progressData.step);
              setProgressPercentage(progressData.percentage || 0);

              // Add to processing status log
              const timestamp = new Date().toLocaleTimeString();
              setProcessingStatus(prev => [...prev, `[${timestamp}] 📊 ${progressData.step}: ${progressData.message}`]);

              // Mark previous steps as completed if we're on a new step
              if (progressData.current_step > 1) {
                const previousStepIndex = progressData.current_step - 2; // -1 for 0-based, -1 for previous
                const processingStepNames = PROCESSING_STEPS.map(step => step.name);
                if (previousStepIndex >= 0 && previousStepIndex < processingStepNames.length) {
                  const previousStepName = processingStepNames[previousStepIndex];
                  setCompletedSteps(prev => {
                    if (!prev.includes(previousStepName)) {
                      return [...prev, previousStepName];
                    }
                    return prev;
                  });
                }
              }
              continue;
            }

            const data = JSON.parse(line);
            console.log('📨 [STREAM] Received:', data.type, data.message?.substring(0, 100));

            switch (data.type) {
              case 'start':
                setProcessingStatus(prev => [...prev, `🚀 ${data.message}`]);
                break;
              case 'stdout':
              case 'stderr':
                const message = data.message;
                if (message && message.trim() && message !== 'undefined' && message !== 'null') {
                  // Add timestamp and color coding
                  const timestamp = new Date().toLocaleTimeString();
                  const formattedMessage = `[${timestamp}] ${message}`;
                  setProcessingStatus(prev => [...prev, formattedMessage]);
                  console.log(`🔍 [${data.type.toUpperCase()}] ${message}`);
                  console.log('Current processingStatus length:', processingStatus.length + 1);
                  console.log('Current processingStatus length:', processingStatus.length + 1);
                }
                break;
              case 'close':
                setProcessing(false);
                setProcessingStatus(prev => [...prev, `✅ ${data.message}`]);
                // Mark final step as completed
                const finalStepName = PROCESSING_STEPS[PROCESSING_STEPS.length - 1]?.name;
                if (finalStepName && currentStep === finalStepName) {
                  setCompletedSteps(prev => {
                    if (!prev.includes(finalStepName)) {
                      return [...prev, finalStepName];
                    }
                    return prev;
                  });
                }
                break;
              case 'error':
                setError(data.message);
                setProcessing(false);
                break;
              default:
                // Handle any other message types
                if (data.message) {
                  setProcessingStatus(prev => [...prev, `📋 ${data.message}`]);
                }
                break;
            }
          } catch (e) {
            console.error('❌ Stream parse error:', e, 'Line:', line);
            // Don't show parsing errors to user, just log them
          }
        }
      }
    }
    setProcessing(false);
  };

  return (
    <div className="main-page min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Navigation */}
        {/* Navigation Removed - moved to Sidebar */}

        <header className="text-center py-8 mb-8">
          <div className="flex flex-col items-center justify-center gap-4">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-purple-600 rounded-3xl blur-2xl opacity-30"></div>
              <img 
                src="/social-sync-logo.png" 
                alt="Social Sync Logo" 
                className="h-20 w-auto relative z-10 drop-shadow-2xl"
              />
            </div>
            <div className="space-y-2">
              <h1 className="text-5xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
                Social Sync
              </h1>
              <p className="text-xl text-gray-600 font-medium">Automated Media Flow</p>
              <p className="text-sm text-gray-500">Multi-platform content creation with intelligent automation</p>
            </div>
          </div>
        </header>

        {/* Step 1: Video Selection & Core Settings */}
        <div className="bg-white/90 backdrop-blur-xl rounded-2xl shadow-xl border border-white/20 p-8 mb-6 transition-all hover:shadow-2xl">
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-3 mb-6">
            <div className="p-2 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg">
              <Upload className="text-white w-6 h-6" />
            </div>
            Step 1: Select Your Videos
          </h2>
          <div>
            <label className="block text-sm font-medium mb-2 text-gray-900">📁 Input Folder</label>
            <input type="text" value={options.inputFolder || ''} onChange={(e) => handleInputFolderChange(e.target.value)} className="w-full p-3 border border-gray-300 rounded-lg" />
            <VideoDiscoveryPanel
              videoDiscovery={videoDiscovery || {
                totalVideos: 0,
                totalSize: 0,
                estimatedDuration: 0,
                files: [],
                shortcuts: [],
                regularVideos: []
              }}
              isDiscovering={isDiscovering}
            />
          </div>
        </div>

        {/* Video Preview */}
        {(() => {
          console.log('🏠 [PAGE] Rendering VideoPreview section:', {
            hasInputFolder: !!options.inputFolder,
            inputFolder: options.inputFolder,
            optionsKeys: Object.keys(options)
          });
          return options.inputFolder && (
            <VideoPreview
              inputFolder={options.inputFolder}
              options={options}
              onOptionsChange={setOptions}
            />
          );
        })()}

        {/* Step 2: Processing Workflow */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            <Settings className="inline-block mr-2 text-purple-600" />
            Step 2: Configure Processing
          </h2>

          {/* Processing Mode Selection */}
          <div className="mb-6">
            <h3 className="text-lg font-bold text-gray-800 mb-4">Processing Mode</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {PROCESSING_MODES.map((mode) => (
                <div
                  key={mode.mode}
                  className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${options.multiPlatformConfig.general.processingMode === mode.mode
                      ? 'border-purple-500 bg-purple-50'
                      : 'border-gray-200 bg-gray-50 hover:border-purple-300 hover:bg-purple-25'
                    }`}
                  onClick={() =>
                    handleMultiPlatformConfigChange({
                      ...options.multiPlatformConfig,
                      general: {
                        ...options.multiPlatformConfig.general,
                        processingMode: mode.mode,
                      },
                    })
                  }
                >
                  <div className="text-lg font-bold mb-2">{mode.title}</div>
                  <div className="text-sm text-gray-700 mb-2">{mode.description}</div>
                  <div className="text-xs text-gray-600">{mode.detail}</div>
                </div>
              ))}
            </div>
          </div>

          <ProcessingStepsConfig
            processingSteps={PROCESSING_STEPS}
            options={options}
            onOptionChange={handleOptionChange}
            processing={processing}
          />

          {/* Advanced Scheduling Configuration for Batch/Single Upload */}
          {(options.multiPlatformConfig.general.processingMode === 'batch-upload' ||
            options.multiPlatformConfig.general.processingMode === 'full-upload') && (
              <div className="mt-6 bg-gradient-to-br from-purple-50 to-blue-50 border border-purple-200 rounded-lg p-6">
                <h3 className="text-lg font-bold text-purple-900 mb-4 flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  📅 Advanced Scheduling Configuration
                </h3>

                <div className="space-y-6">
                  {/* Scheduling Mode Selection */}
                  <div>
                    <h4 className="font-medium text-gray-900 mb-3">Scheduling Strategy</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div
                        className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${options.multiPlatformConfig.general.scheduleMode === 'custom'
                            ? 'border-purple-500 bg-purple-50'
                            : 'border-gray-200 bg-gray-50 hover:border-purple-300'
                          }`}
                        onClick={() => handleMultiPlatformConfigChange({
                          ...options.multiPlatformConfig,
                          general: {
                            ...options.multiPlatformConfig.general,
                            scheduleMode: 'custom'
                          }
                        })}
                      >
                        <div className="font-bold text-gray-900 mb-2">📅 Manual Date Selection</div>
                        <div className="text-sm text-gray-600">Choose specific dates and times for each video</div>
                      </div>

                      <div
                        className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${options.multiPlatformConfig.general.scheduleMode === 'delayed'
                            ? 'border-purple-500 bg-purple-50'
                            : 'border-gray-200 bg-gray-50 hover:border-purple-300'
                          }`}
                        onClick={() => handleMultiPlatformConfigChange({
                          ...options.multiPlatformConfig,
                          general: {
                            ...options.multiPlatformConfig.general,
                            scheduleMode: 'delayed'
                          }
                        })}
                      >
                        <div className="font-bold text-gray-900 mb-2">🧠 Smart Mode</div>
                        <div className="text-sm text-gray-600">AI-powered scheduling using channel analytics</div>
                      </div>
                    </div>
                  </div>

                  {/* Smart Mode Configuration */}
                  {options.multiPlatformConfig.general.scheduleMode === 'delayed' && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <h4 className="font-medium text-blue-900 mb-3">🧠 Smart Scheduling Options</h4>

                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-blue-900 mb-2">Time Slot Interval</label>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <label className="flex items-center gap-2 p-3 border border-blue-200 rounded-lg cursor-pointer hover:bg-blue-100">
                              <input
                                type="radio"
                                name="timeSlotInterval"
                                value="8h"
                                checked={options.multiPlatformConfig.general.slotInterval === '8h'}
                                onChange={(e) => handleMultiPlatformConfigChange({
                                  ...options.multiPlatformConfig,
                                  general: {
                                    ...options.multiPlatformConfig.general,
                                    slotInterval: '8h',
                                    schedulingOptions: {
                                      ...options.multiPlatformConfig.general.schedulingOptions,
                                      mode: 'time-slot'
                                    }
                                  }
                                })}
                                className="text-blue-600"
                              />
                              <div>
                                <div className="font-medium text-blue-900">Every 8 Hours</div>
                                <div className="text-xs text-blue-700">3× per day</div>
                              </div>
                            </label>

                            <label className="flex items-center gap-2 p-3 border border-blue-200 rounded-lg cursor-pointer hover:bg-blue-100">
                              <input
                                type="radio"
                                name="timeSlotInterval"
                                value="12h"
                                checked={options.multiPlatformConfig.general.slotInterval === '12h'}
                                onChange={(e) => handleMultiPlatformConfigChange({
                                  ...options.multiPlatformConfig,
                                  general: {
                                    ...options.multiPlatformConfig.general,
                                    slotInterval: '12h',
                                    schedulingOptions: {
                                      ...options.multiPlatformConfig.general.schedulingOptions,
                                      mode: 'time-slot'
                                    }
                                  }
                                })}
                                className="text-blue-600"
                              />
                              <div>
                                <div className="font-medium text-blue-900">Every 12 Hours</div>
                                <div className="text-xs text-blue-700">2× per day</div>
                              </div>
                            </label>

                            <label className="flex items-center gap-2 p-3 border border-blue-200 rounded-lg cursor-pointer hover:bg-blue-100">
                              <input
                                type="radio"
                                name="timeSlotInterval"
                                value="24h"
                                checked={options.multiPlatformConfig.general.slotInterval === '24h'}
                                onChange={(e) => handleMultiPlatformConfigChange({
                                  ...options.multiPlatformConfig,
                                  general: {
                                    ...options.multiPlatformConfig.general,
                                    slotInterval: '24h',
                                    schedulingOptions: {
                                      ...options.multiPlatformConfig.general.schedulingOptions,
                                      mode: 'time-slot'
                                    }
                                  }
                                })}
                                className="text-blue-600"
                              />
                              <div>
                                <div className="font-medium text-blue-900">Every 24 Hours</div>
                                <div className="text-xs text-blue-700">Daily</div>
                              </div>
                            </label>

                            <label className="flex items-center gap-2 p-3 border border-blue-200 rounded-lg cursor-pointer hover:bg-blue-100">
                              <input
                                type="radio"
                                name="timeSlotInterval"
                                value="48h"
                                checked={options.multiPlatformConfig.general.slotInterval === '48h'}
                                onChange={(e) => handleMultiPlatformConfigChange({
                                  ...options.multiPlatformConfig,
                                  general: {
                                    ...options.multiPlatformConfig.general,
                                    slotInterval: '48h',
                                    schedulingOptions: {
                                      ...options.multiPlatformConfig.general.schedulingOptions,
                                      mode: 'time-slot'
                                    }
                                  }
                                })}
                                className="text-blue-600"
                              />
                              <div>
                                <div className="font-medium text-blue-900">Every 48 Hours</div>
                                <div className="text-xs text-blue-700">Every 2 days</div>
                              </div>
                            </label>
                          </div>
                        </div>

                        {/* Preferred Starting Time */}
                        <div>
                          <label className="block text-sm font-medium text-blue-900 mb-2">
                            {(() => {
                              const interval = options.multiPlatformConfig.general.slotInterval || '24h';
                              const hourValue = parseInt(interval.replace('h', ''));
                              if (hourValue === 8) return 'Configure 3 Time Slots (8-hour intervals)';
                              if (hourValue === 12) return 'Configure 2 Time Slots (12-hour intervals)';
                              if (hourValue === 24) return 'Daily Posting Time';
                              if (hourValue === 48) return 'Every-Other-Day Posting Time';
                              return 'Posting Time Configuration';
                            })()}
                          </label>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                              <label className="block text-xs text-blue-800 mb-1">Time</label>
                              <input
                                type="time"
                                value={options.multiPlatformConfig.general.preferredTime}
                                onChange={(e) => handleMultiPlatformConfigChange({
                                  ...options.multiPlatformConfig,
                                  general: {
                                    ...options.multiPlatformConfig.general,
                                    preferredTime: e.target.value
                                  }
                                })}
                                className="w-full p-2 border border-blue-200 rounded-lg"
                              />
                            </div>
                            <div className="bg-blue-100 border border-blue-300 rounded-lg p-3 col-span-2">
                              <h5 className="font-medium text-blue-900 mb-1">How Smart Scheduling Works</h5>
                              <div className="text-sm text-blue-800 space-y-1">
                                {(() => {
                                  const interval = options.multiPlatformConfig.general.slotInterval || '24h';
                                  const startTime = options.multiPlatformConfig.general.preferredTime || '07:00';
                                  const startHour = parseInt(startTime.split(':')[0]);

                                  if (interval === '8h') {
                                    const slot1 = `${startHour.toString().padStart(2, '0')}:00`;
                                    const slot2 = `${((startHour + 8) % 24).toString().padStart(2, '0')}:00`;
                                    const slot3 = `${((startHour + 16) % 24).toString().padStart(2, '0')}:00`;
                                    return <p>• <strong>Times:</strong> Daily at {slot1}, {slot2}, {slot3} (8-hour intervals)</p>;
                                  } else if (interval === '12h') {
                                    const slot1 = startTime;
                                    const slot2 = `${((startHour + 12) % 24).toString().padStart(2, '0')}:00`;
                                    return <p>• <strong>Times:</strong> Daily at {slot1}, {slot2} (12-hour intervals)</p>;
                                  } else if (interval === '24h') {
                                    return <p>• <strong>Times:</strong> Daily at {startTime}</p>;
                                  } else if (interval === '48h') {
                                    return <p>• <strong>Times:</strong> Every other day at {startTime}</p>;
                                  }
                                  return <p>• <strong>Times:</strong> Every {interval} starting at {startTime}</p>;
                                })()}
                                <p>• <strong>Conflict Avoidance:</strong> If a slot is taken, moves to next interval automatically</p>
                                <p>• <strong>Smart Mode:</strong> All scheduling is intelligent - no manual conflicts</p>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="bg-blue-100 border border-blue-300 rounded-lg p-3">
                          <div className="flex items-center gap-2 text-blue-900 font-medium mb-1">
                            <AlertCircle className="w-4 h-4" />
                            Smart Mode Requirements
                          </div>
                          <div className="text-sm text-blue-800 space-y-1">
                            <p>• <strong>Channel cache required:</strong> Run "Scan Channel" first to build analytics data</p>
                            <p>• <strong>Smart conflict detection:</strong> Automatically finds next available slot when conflicts occur</p>
                            <p>• <strong>Consistent intervals:</strong> Maintains your chosen posting rhythm</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Manual Mode Configuration */}
                  {options.multiPlatformConfig.general.scheduleMode === 'custom' && (
                    <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                      <h4 className="font-medium text-purple-900 mb-3">📅 Manual Scheduling</h4>
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-purple-900 mb-2">Start Date</label>
                          <input
                            type="date"
                            value={options.multiPlatformConfig.general.schedule}
                            onChange={(e) => handleMultiPlatformConfigChange({
                              ...options.multiPlatformConfig,
                              general: {
                                ...options.multiPlatformConfig.general,
                                schedule: e.target.value
                              }
                            })}
                            className="w-full p-3 border border-purple-200 rounded-lg"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-purple-900 mb-2">Default Time</label>
                          <input
                            type="time"
                            value={options.multiPlatformConfig.general.preferredTime}
                            onChange={(e) => handleMultiPlatformConfigChange({
                              ...options.multiPlatformConfig,
                              general: {
                                ...options.multiPlatformConfig.general,
                                preferredTime: e.target.value
                              }
                            })}
                            className="w-full p-3 border border-purple-200 rounded-lg"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Scheduling Preview - Show for Smart Mode */}
                  {options.multiPlatformConfig.general.scheduleMode === 'delayed' && (
                    <div className="mt-6">
                      <SmartSchedulingPreview
                        videoDiscovery={{
                          ...videoDiscovery || { files: [], totalVideos: 0, totalSize: 0, estimatedDuration: 0, shortcuts: [], regularVideos: [] },
                          // Filter files for single upload mode - only show first video
                          files: options.multiPlatformConfig?.general?.processingMode === 'full-upload'
                            ? (videoDiscovery?.files || []).slice(0, 1)
                            : videoDiscovery?.files || []
                        }}
                        isLoading={isDiscovering}
                        schedulingConfig={{
                          mode: options.multiPlatformConfig.general.schedulingOptions.mode,
                          times: options.multiPlatformConfig.general.defaultPostingTimes,
                          slotInterval: options.multiPlatformConfig.general.slotInterval
                        }}
                      />
                    </div>
                  )}

                  {/* Manual Scheduling Preview - Show for Manual Mode */}
                  {options.multiPlatformConfig.general.scheduleMode === 'custom' && (
                    <div className="mt-6 bg-purple-50 border border-purple-200 rounded-lg p-4">
                      <h4 className="font-medium text-purple-900 mb-3 flex items-center gap-2">
                        <Calendar className="w-5 h-5" />
                        Manual Scheduling Preview
                      </h4>
                      <div className="bg-white border border-purple-200 rounded-lg p-4">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                          <div>
                            <div className="text-2xl font-bold text-purple-900">{videoDiscovery?.totalVideos || 0}</div>
                            <div className="text-sm text-purple-700">Total Videos</div>
                          </div>
                          <div>
                            <div className="text-2xl font-bold text-purple-900">{videoDiscovery?.files?.filter(v => v.type === 'short').length || 0}</div>
                            <div className="text-sm text-purple-700">Shorts</div>
                          </div>
                          <div>
                            <div className="text-2xl font-bold text-purple-900">{videoDiscovery?.files?.filter(v => v.type === 'regular').length || 0}</div>
                            <div className="text-sm text-purple-700">Regular Videos</div>
                          </div>
                          <div>
                            <div className="text-2xl font-bold text-purple-900">
                              {options.multiPlatformConfig.general.schedule ? new Date(options.multiPlatformConfig.general.schedule).toLocaleDateString() : '—'}
                            </div>
                            <div className="text-sm text-purple-700">Start Date</div>
                          </div>
                        </div>
                        <div className="mt-4 text-center text-sm text-purple-800">
                          Starting {options.multiPlatformConfig.general.schedule ? new Date(options.multiPlatformConfig.general.schedule).toLocaleDateString() : 'on selected date'} at {options.multiPlatformConfig.general.preferredTime || '12:00'}, uploads will occur daily
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
        </div>

        {/* Step 3: Platforms & Scheduling */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            <TrendingUp className="inline-block mr-2 text-green-600" />
            Step 3: Platforms & Scheduling
          </h2>
          <MultiPlatformManager
            config={options.multiPlatformConfig}
            onConfigChange={handleMultiPlatformConfigChange}
            results={[]}
            disabled={processing}
            apiKey={options.openaiKey}
          />
        </div>

        {/* Step 4: Execute */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            <Wand2 className="inline-block mr-2 text-blue-600" />
            Step 4: Execute
          </h2>
          <ExecutionSummary
            options={options}
            multiPlatformConfig={options.multiPlatformConfig}
            videoCount={videoDiscovery?.totalVideos || 0}
            videoDiscovery={videoDiscovery}
            processing={processing}
          />

          <button onClick={handleProcessVideos} disabled={processing || !options.inputFolder} className={`w-full py-4 px-6 rounded-xl font-bold text-lg transition-all duration-200 flex items-center justify-center gap-3 ${processing
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white shadow-lg'
            }`}>
            {processing ? 'Processing...' : 'Start Processing'}
          </button>
        </div>

        {/* Admin & Maintenance Section */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            <Shield className="inline-block mr-2 text-gray-600" />
            Admin & Maintenance
          </h2>
          <div className="space-y-6">
            <ChannelDataScanner selectedChannelId={options.multiPlatformConfig.youtube?.selectedChannelId} disabled={processing} />
            <DuplicateManager />
          </div>
        </div>

        <ProcessingStatus
          processing={processing}
          processingStatus={processingStatus}
          batchProgress={batchProgress}
          currentStep={currentStep}
          completedSteps={completedSteps}
          progressPercentage={progressPercentage}
          videoCompletions={videoCompletions}
          processingSteps={PROCESSING_STEPS}
          silenceCutStats={silenceCutStats}
          options={options}
        />

        {(output || error) && (
          <div className="mt-8 bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-2xl font-bold mb-4 text-black">Output</h2>
            {error && <div className="bg-red-100 text-red-800 p-4 rounded mb-4"><pre>{error}</pre></div>}
            {output && <div className="bg-gray-100 p-4 rounded"><pre>{output}</pre></div>}
          </div>
        )}
      </div>
    </div>
  );
}
