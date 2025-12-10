'use client';

import React from 'react';
import { Calendar, Clock, Video, Play, AlertCircle, CheckCircle2, TrendingUp } from 'lucide-react';
import type { VideoDiscovery } from '../hooks/useVideoDiscovery';

interface SmartSchedulingPreviewProps {
  videoDiscovery: VideoDiscovery;
  isLoading?: boolean;
  schedulingConfig?: {
    mode: string;
    times: {
      morning: string;
      afternoon: string;
      evening: string;
    };
    slotInterval?: string;
  };
}

export const SmartSchedulingPreview: React.FC<SmartSchedulingPreviewProps> = ({ 
  videoDiscovery, 
  isLoading = false,
  schedulingConfig
}) => {
  const { files, totalVideos, schedulingPreview } = videoDiscovery;
  const shortcuts = files.filter(v => v.type === 'short');
  const regularVideos = files.filter(v => v.type === 'regular');

  if (isLoading) {
    return (
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
          <h3 className="text-lg font-bold text-blue-900">🎯 Generating Smart Schedule...</h3>
        </div>
        <div className="text-blue-700">Analyzing video types and finding optimal time slots...</div>
      </div>
    );
  }

  if (!files.length) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
        <div className="flex items-center gap-3 mb-2">
          <Video className="w-6 h-6 text-gray-400" />
          <h3 className="text-lg font-bold text-gray-600">📂 No Videos Found</h3>
        </div>
        <p className="text-gray-500">Add videos to your input folder to see the smart scheduling preview.</p>
      </div>
    );
  }

  const hasSchedulingData = schedulingPreview || files.some(f => f.scheduledDate);
  
  console.log('🔧 [DEBUG] SmartSchedulingPreview render:', {
    filesCount: files.length,
    hasSchedulingData,
    schedulingPreview,
    scheduledFiles: files.filter(f => f.scheduledDate).length,
    schedulingConfig,
    videoDiscovery: {
      totalVideos: videoDiscovery.totalVideos,
      files: videoDiscovery.files?.slice(0, 3) // First 3 files for debugging
    }
  });

  return (
    <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-6">
      <div className="flex items-center gap-3 mb-4">
        <Calendar className="w-6 h-6 text-blue-600" />
        <h3 className="text-lg font-bold text-blue-900">🎯 Smart Scheduling Preview</h3>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-blue-600">{files.length}</div>
          <div className="text-sm text-gray-600">Total Videos</div>
        </div>
        <div className="bg-white rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-purple-600">{shortcuts.length}</div>
          <div className="text-sm text-gray-600">Shorts</div>
        </div>
        <div className="bg-white rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-green-600">{regularVideos.length}</div>
          <div className="text-sm text-gray-600">Regular Videos</div>
        </div>
        <div className="bg-white rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-orange-600">
            {schedulingPreview?.totalDays || '?'}
          </div>
          <div className="text-sm text-gray-600">Schedule Days</div>
        </div>
      </div>

      {hasSchedulingData ? (
        <>
          {/* Schedule Summary */}
          {schedulingPreview && (
            <div className="bg-white rounded-lg p-4 mb-4">
              <h4 className="font-semibold text-gray-900 mb-3">📅 Schedule Overview</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">First Upload:</span>
                  <div className="font-medium text-blue-600">{schedulingPreview.firstUpload}</div>
                </div>
                <div>
                  <span className="text-gray-600">Last Upload:</span>
                  <div className="font-medium text-blue-600">{schedulingPreview.lastUpload}</div>
                </div>
                <div>
                  <span className="text-gray-600">Conflicts:</span>
                  <div className={`font-medium ${schedulingPreview.conflicts > 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {schedulingPreview.conflicts > 0 ? `${schedulingPreview.conflicts} conflicts` : 'No conflicts'}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Video Schedule List */}
          <div className="space-y-3">
            {files.map((file, index) => {
              const isShort = file.type === 'short';
              const hasConflict = file.conflict;
              
              return (
                <div 
                  key={index}
                  className={`bg-white rounded-lg p-4 border-l-4 ${
                    hasConflict 
                      ? 'border-red-400' 
                      : isShort 
                        ? 'border-purple-400' 
                        : 'border-green-400'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {hasConflict ? (
                        <AlertCircle className="w-5 h-5 text-red-500" />
                      ) : (
                        <CheckCircle2 className="w-5 h-5 text-green-500" />
                      )}
                      <div>
                        <div className="font-medium text-gray-900 truncate max-w-xs">
                          {file.name}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                          {isShort ? (
                            <Play className="w-4 h-4" />
                          ) : (
                            <Video className="w-4 h-4" />
                          )}
                          <span>{isShort ? 'YouTube Short' : 'Regular Video'}</span>
                          {file.duration && (
                            <span>• {Math.round(file.duration)}s</span>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      {hasConflict ? (
                        <div className="text-red-600 text-sm">
                          <div className="font-medium">⚠️ Conflict</div>
                          <div className="text-xs">{file.conflictReason}</div>
                        </div>
                      ) : (
                        <div className="text-gray-700 text-sm">
                          <div className="flex items-center gap-1 font-medium">
                            <Calendar className="w-4 h-4" />
                            {file.scheduledDate}
                          </div>
                          <div className="flex items-center gap-1 text-gray-500">
                            <Clock className="w-4 h-4" />
                            {file.scheduledTime}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Performance Indicator */}
          <div className="mt-4 p-3 bg-blue-100 rounded-lg">
            <div className="flex items-center gap-2 text-blue-800">
              <TrendingUp className="w-4 h-4" />
              <span className="text-sm font-medium">
                Smart scheduling complete! {files.length - (schedulingPreview?.conflicts || 0)} videos scheduled successfully.
              </span>
            </div>
          </div>
        </>
      ) : (
        <div className="text-center text-gray-600 py-6">
          <Clock className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="mb-2">Enable <strong>Smart Mode</strong> to see intelligent scheduling preview</p>
          <p className="text-sm text-gray-500">
            Smart mode analyzes your videos and finds optimal upload times based on your channel's schedule
          </p>
          
          {/* Show current configuration */}
          {schedulingConfig && (
            <div className="mt-4 p-3 bg-gray-100 rounded-lg text-left">
              <h4 className="font-medium text-gray-800 mb-2">Current Configuration:</h4>
              <div className="text-sm text-gray-700 space-y-1">
                <div><strong>Strategy:</strong> {schedulingConfig.mode === 'standard' ? 'Standard Posting' : schedulingConfig.mode === 'day-night' ? 'Day & Night Posting' : 'Next Available Slot'}</div>
                <div><strong>Posting Times:</strong> {schedulingConfig.times.morning}, {schedulingConfig.times.afternoon}, {schedulingConfig.times.evening}</div>
                {schedulingConfig.slotInterval && (
                  <div><strong>Interval:</strong> {schedulingConfig.slotInterval === '12h' ? 'Every 12 Hours' : schedulingConfig.slotInterval === '24h' ? 'Daily' : schedulingConfig.slotInterval === '48h' ? 'Every 2 Days' : schedulingConfig.slotInterval === '72h' ? 'Every 3 Days' : 'Weekly'}</div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}; 