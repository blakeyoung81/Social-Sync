import React, { useState, useEffect } from 'react';
import { Calendar, Clock, Video, Eye, AlertCircle, CheckCircle2, RefreshCw, FileVideo, Smartphone, MessageSquare } from 'lucide-react';

interface ScheduleItem {
  filename: string;
  title: string;
  date: string;
  time: string;
  datetime: string;
  is_short: boolean;
  video_index: number;
  total_videos: number;
  platform?: string;
  platform_display?: string;
}

interface SchedulePreviewData {
  success: boolean;
  schedule: ScheduleItem[];
  total_videos: number;
  schedule_mode: string;
  start_date: string;
  enabled_platforms?: string[];
  platforms_count?: number;
  smart_scheduling_used?: boolean;
  conflict_mode?: string;
  start_mode?: string;
  active_account_email?: string;
  active_channel_id?: string;
  quota_status?: string;
  quota_warning?: string;
  error?: string;
  message?: string;
}

interface SchedulePreviewCalendarProps {
  inputFolder: string;
  multiPlatformConfig: any;
  apiKey: string;
  onScheduleGenerated?: (schedule: ScheduleItem[]) => void;
}

export default function SchedulePreviewCalendar({ 
  inputFolder, 
  multiPlatformConfig, 
  apiKey, 
  onScheduleGenerated 
}: SchedulePreviewCalendarProps) {
  const [schedule, setSchedule] = useState<ScheduleItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scheduleData, setScheduleData] = useState<SchedulePreviewData | null>(null);
  const [showCalendar, setShowCalendar] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [lastAttempt, setLastAttempt] = useState<Date | null>(null);

  const generateSchedulePreview = async (isRetry: boolean = false) => {
    // Validation checks
    if (!inputFolder) {
      setError('Input folder is required. Please select a folder containing your videos.');
      return;
    }

    // Check if we're retrying too soon
    if (isRetry && lastAttempt && (Date.now() - lastAttempt.getTime()) < 5000) {
      setError('Please wait a moment before retrying.');
      return;
    }

    setLoading(true);
    setError(null);
    
    // Clear previous data when starting fresh
    if (!isRetry) {
      setSchedule([]);
      setScheduleData(null);
      setShowCalendar(false);
      setRetryCount(0);
    }

    try {
      setLastAttempt(new Date());
      
      const response = await fetch('/api/preview-schedule', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          inputFolder,
          multiPlatformConfig,
          openaiKey: apiKey
        }),
      });

      if (!response.ok) {
        throw new Error(`Server error: ${response.status} ${response.statusText}`);
      }

      const result: SchedulePreviewData = await response.json();

      if (result.success) {
        setSchedule(result.schedule || []);
        setScheduleData(result);
        setShowCalendar(true);
        setRetryCount(0);
        onScheduleGenerated?.(result.schedule || []);
        
        // Clear any previous errors on success
        setError(null);
      } else {
        // Handle different types of errors
        let errorMessage = result.error || 'Failed to generate schedule preview';
        
        // Enhance error messages based on context
        if (errorMessage.includes('quota')) {
          errorMessage = `YouTube API quota exceeded. Smart scheduling is temporarily limited. The preview will use basic scheduling until quota resets at midnight Pacific Time.`;
        } else if (errorMessage.includes('No video files found')) {
          errorMessage = `No video files found in the selected folder: ${inputFolder}. Please check that the folder contains .mp4, .mov, .avi, .mkv, or .webm files.`;
        } else if (errorMessage.includes('OpenAI')) {
          errorMessage = `OpenAI API issue: ${result.error}. Basic scheduling will be used instead of smart analysis.`;
        } else if (errorMessage.includes('authentication') || errorMessage.includes('YouTube')) {
          errorMessage = `YouTube authentication issue: ${result.error}. Please check your YouTube channel selection in the Multi-Platform Manager above.`;
        }
        
        setError(errorMessage);
        
        // If we got partial data, show it anyway
        if (result.schedule && result.schedule.length > 0) {
          setSchedule(result.schedule);
          setScheduleData(result);
          setShowCalendar(true);
          onScheduleGenerated?.(result.schedule);
        }
      }
    } catch (err) {
      console.error('Schedule preview error:', err);
      
      let errorMessage = 'Unknown error occurred';
      if (err instanceof Error) {
        if (err.message.includes('fetch')) {
          errorMessage = 'Network error: Could not connect to the server. Please check your connection and try again.';
        } else if (err.message.includes('timeout')) {
          errorMessage = 'Request timed out. The server may be busy. Please try again in a moment.';
        } else if (err.message.includes('Server error: 500')) {
          errorMessage = 'Server error occurred. This may be due to API quota limits or configuration issues. Please try again later.';
        } else {
          errorMessage = `Error: ${err.message}`;
        }
      }
      
      setError(errorMessage);
      setRetryCount(prev => prev + 1);
    } finally {
      setLoading(false);
    }
  };

  const handleRetry = () => {
    generateSchedulePreview(true);
  };

  const canRetry = !loading && error && retryCount < 3;
  const shouldShowRetryAdvice = retryCount >= 3;

  // Auto-clear errors after 10 seconds if not quota-related
  React.useEffect(() => {
    if (error && !error.includes('quota') && !error.includes('No video files found')) {
      const timer = setTimeout(() => {
        setError(null);
      }, 10000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  const getValidationMessage = () => {
    if (!inputFolder) {
      return {
        type: 'warning' as const,
        message: 'Please select an input folder containing your video files before generating a preview.'
      };
    }
    
    if (!apiKey) {
      return {
        type: 'info' as const,
        message: 'No OpenAI API key provided. Preview will use basic titles and descriptions instead of AI-generated content.'
      };
    }
    
    return null;
  };

  const validationMessage = getValidationMessage();

  // Group schedule items by date
  const groupedSchedule = schedule.reduce((acc, item) => {
    const date = item.date;
    if (!acc[date]) {
      acc[date] = [];
    }
    acc[date].push(item);
    return acc;
  }, {} as Record<string, ScheduleItem[]>);

  // Get date range for calendar display
  const getDateRange = () => {
    if (schedule.length === 0) return [];
    
    const dates = schedule.map(item => new Date(item.date));
    const minDate = new Date(Math.min(...dates.map(d => d.getTime())));
    const maxDate = new Date(Math.max(...dates.map(d => d.getTime())));
    
    const range = [];
    const current = new Date(minDate);
    
    while (current <= maxDate) {
      range.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }
    
    return range;
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { 
      weekday: 'short', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  const formatTime = (time: string) => {
    return new Date(`2000-01-01T${time}`).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const getScheduleModeDescription = () => {
    if (!scheduleData) return '';
    
    let baseDescription = '';
    switch (scheduleData.schedule_mode) {
      case 'standard':
        baseDescription = 'Standard scheduling - one video per day at preferred time';
        break;
      case 'day-and-night':
        baseDescription = 'Day & Night scheduling - videos posted in morning and evening';
        break;
      case 'next-slot':
        baseDescription = 'Next available slot - finds first available time to avoid conflicts';
        break;
      default:
        baseDescription = `${scheduleData.schedule_mode} scheduling mode`;
    }
    
    // Add smart scheduling info
    if (scheduleData.smart_scheduling_used) {
      baseDescription += ' • 🧠 Smart Analysis: Real YouTube API conflict checking enabled';
    } else if (scheduleData.conflict_mode === 'smart-analysis') {
      baseDescription += ' • ⚠️ Smart Analysis requested but using fallback scheduling (API key needed)';
    }
    
    if (scheduleData.start_mode === 'next-available-slot') {
      baseDescription += ' • 🎯 Auto-finding next available slot';
    }
    
    return baseDescription;
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 mt-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Calendar className="text-blue-600" />
            Upload Schedule Preview
          </h2>
          <p className="text-gray-600 mt-1">
            Preview when your videos will be scheduled for upload
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <button
            onClick={() => generateSchedulePreview(false)}
            disabled={loading || !inputFolder}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {loading ? <RefreshCw size={16} className="animate-spin" /> : <Eye size={16} />}
            {loading ? 'Generating...' : 'Preview Schedule'}
          </button>
          
          {canRetry && (
            <button
              onClick={handleRetry}
              className="flex items-center gap-2 px-3 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors text-sm"
            >
              <RefreshCw size={14} />
              Retry ({3 - retryCount} left)
            </button>
          )}
        </div>
      </div>

      {validationMessage && (
        <div className={`mb-6 p-4 rounded-lg border ${
          validationMessage.type === 'warning' 
            ? 'bg-yellow-50 border-yellow-200' 
            : 'bg-blue-50 border-blue-200'
        }`}>
          <div className={`flex items-center gap-2 ${
            validationMessage.type === 'warning' ? 'text-yellow-800' : 'text-blue-800'
          }`}>
            <AlertCircle size={16} />
            <span className="font-medium">
              {validationMessage.type === 'warning' ? 'Setup Required' : 'Note'}
            </span>
          </div>
          <p className={`mt-1 ${
            validationMessage.type === 'warning' ? 'text-yellow-700' : 'text-blue-700'
          }`}>
            {validationMessage.message}
          </p>
        </div>
      )}

      {error && (
        <div className="mb-6 p-4 bg-red-50 rounded-lg border border-red-200">
          <div className="flex items-center gap-2 text-red-800 mb-2">
            <AlertCircle size={16} />
            <span className="font-medium">Error</span>
          </div>
          <p className="text-red-700 mb-3">{error}</p>
          
          {shouldShowRetryAdvice && (
            <div className="bg-red-100 border border-red-300 rounded p-3 mt-3">
              <p className="text-red-800 text-sm font-medium mb-2">Multiple attempts failed. Try these solutions:</p>
              <ul className="text-red-700 text-sm space-y-1 list-disc list-inside">
                <li>Check your internet connection</li>
                <li>Verify the input folder contains video files</li>
                <li>Ensure YouTube channel is selected in Multi-Platform Manager</li>
                <li>Wait a few minutes if quota exceeded, then try again</li>
                <li>Contact support if the issue persists</li>
              </ul>
            </div>
          )}
        </div>
      )}

      {scheduleData && !error && (
        <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <div className="flex items-center gap-2 text-blue-800 mb-2">
            <CheckCircle2 size={16} />
            <span className="font-medium">Schedule Generated</span>
          </div>
          <div className="text-blue-700">
            <p>{scheduleData.total_videos} videos found • {getScheduleModeDescription()}</p>
            {scheduleData.enabled_platforms && scheduleData.enabled_platforms.length > 0 && (
              <p className="text-sm mt-1">
                📱 Platforms: {scheduleData.enabled_platforms.map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(', ')}
              </p>
            )}
            {scheduleData.active_account_email && scheduleData.active_account_email !== 'none' && (
              <p className="text-sm mt-1">
                🎯 Active YouTube Account: {scheduleData.active_account_email}
              </p>
            )}
            {scheduleData.conflict_mode === 'smart-analysis' && !scheduleData.smart_scheduling_used && (
              <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-yellow-800 text-sm">
                ⚠️ <strong>Smart Analysis requested but not available:</strong> Using basic scheduling instead. 
                {!scheduleData.active_account_email || scheduleData.active_account_email === 'none' ? 
                  ' Please select a YouTube channel in the Multi-Platform Manager above.' : 
                  ' Make sure you have a valid OpenAI API key and the YouTube uploader is properly configured.'
                }
              </div>
            )}
            {scheduleData.smart_scheduling_used && (
              <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded text-green-800 text-sm">
                🧠 <strong>Smart Analysis active:</strong> Using real YouTube API to detect conflicts and find available slots for account {scheduleData.active_account_email}.
              </div>
            )}
            {scheduleData.quota_status === 'exceeded' && scheduleData.quota_warning && (
              <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-red-800 text-sm">
                🚫 <strong>YouTube API Quota Exceeded:</strong> {scheduleData.quota_warning} 
                <br />Smart scheduling is limited and using fallback mode until quota resets.
              </div>
            )}
            {scheduleData.message && <p className="text-sm mt-1">{scheduleData.message}</p>}
          </div>
        </div>
      )}

      {showCalendar && schedule.length > 0 && (
        <div className="space-y-6">
          {/* Schedule Summary */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="flex items-center gap-2 text-blue-800">
                <Video size={16} />
                <span className="font-medium">Total Posts</span>
              </div>
              <p className="text-2xl font-bold text-blue-900">{schedule.length}</p>
            </div>
            
            <div className="bg-green-50 p-4 rounded-lg">
              <div className="flex items-center gap-2 text-green-800">
                <FileVideo size={16} />
                <span className="font-medium">Regular Videos</span>
              </div>
              <p className="text-2xl font-bold text-green-900">
                {schedule.filter(item => !item.is_short).length}
              </p>
            </div>
            
            <div className="bg-purple-50 p-4 rounded-lg">
              <div className="flex items-center gap-2 text-purple-800">
                <Smartphone size={16} />
                <span className="font-medium">Shorts</span>
              </div>
              <p className="text-2xl font-bold text-purple-900">
                {schedule.filter(item => item.is_short).length}
              </p>
            </div>
            
            <div className="bg-orange-50 p-4 rounded-lg">
              <div className="flex items-center gap-2 text-orange-800">
                <MessageSquare size={16} />
                <span className="font-medium">Platforms</span>
              </div>
              <p className="text-2xl font-bold text-orange-900">
                {scheduleData?.platforms_count || 1}
              </p>
            </div>
          </div>

          {/* Calendar View */}
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
              <h3 className="font-bold text-gray-900">Upload Calendar</h3>
            </div>
            
            <div className="p-4">
              <div className="space-y-4">
                {getDateRange().map((date) => {
                  const dateStr = date.toISOString().split('T')[0];
                  const dayItems = groupedSchedule[dateStr] || [];
                  const isToday = dateStr === new Date().toISOString().split('T')[0];
                  const isFuture = new Date(dateStr) > new Date();
                  
                  return (
                    <div
                      key={dateStr}
                      className={`p-4 rounded-lg border-2 ${
                        isToday
                          ? 'border-blue-500 bg-blue-50'
                          : isFuture
                          ? 'border-green-200 bg-green-50'
                          : 'border-gray-200 bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <Calendar size={16} className={
                            isToday ? 'text-blue-600' : isFuture ? 'text-green-600' : 'text-gray-600'
                          } />
                          <span className={`font-bold ${
                            isToday ? 'text-blue-900' : isFuture ? 'text-green-900' : 'text-gray-900'
                          }`}>
                            {formatDate(date)}
                          </span>
                          {isToday && (
                            <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full font-medium">
                              Today
                            </span>
                          )}
                        </div>
                        
                        {dayItems.length > 0 && (
                          <span className={`text-sm font-medium ${
                            isToday ? 'text-blue-700' : isFuture ? 'text-green-700' : 'text-gray-700'
                          }`}>
                            {dayItems.length} video{dayItems.length !== 1 ? 's' : ''}
                          </span>
                        )}
                      </div>
                      
                      {dayItems.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {dayItems.map((item, index) => (
                            <div
                              key={`${item.filename}-${index}`}
                              className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm"
                            >
                              <div className="flex items-start justify-between mb-2">
                                <div className="flex items-center gap-2">
                                  {item.is_short ? (
                                    <Smartphone size={14} className="text-purple-600 flex-shrink-0 mt-0.5" />
                                  ) : (
                                    <Video size={14} className="text-blue-600 flex-shrink-0 mt-0.5" />
                                  )}
                                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                                    item.is_short 
                                      ? 'bg-purple-100 text-purple-700' 
                                      : 'bg-blue-100 text-blue-700'
                                  }`}>
                                    {item.is_short ? 'Short' : 'Video'}
                                  </span>
                                  {item.platform && (
                                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                                      item.platform === 'youtube' ? 'bg-red-100 text-red-700' :
                                      item.platform === 'facebook' ? 'bg-blue-100 text-blue-700' :
                                      item.platform === 'instagram' ? 'bg-pink-100 text-pink-700' :
                                      item.platform === 'tiktok' ? 'bg-gray-100 text-gray-700' :
                                      item.platform === 'twitter' ? 'bg-sky-100 text-sky-700' :
                                      item.platform === 'linkedin' ? 'bg-indigo-100 text-indigo-700' :
                                      'bg-gray-100 text-gray-700'
                                    }`}>
                                      {item.platform_display || item.platform || 'Platform'}
                                    </span>
                                  )}
                                </div>
                                
                                <div className="flex items-center gap-1 text-gray-600">
                                  <Clock size={12} />
                                  <span className="text-xs font-medium">
                                    {formatTime(item.time)}
                                  </span>
                                </div>
                              </div>
                              
                              <h4 className="font-medium text-gray-900 text-sm mb-1 overflow-hidden text-ellipsis whitespace-nowrap">
                                {item.title}
                              </h4>
                              
                              <p className="text-xs text-gray-600 truncate">
                                {item.filename}
                              </p>
                              
                              <div className="mt-2 text-xs text-gray-500">
                                Video {item.video_index} of {item.total_videos}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-4 text-gray-500">
                          <Calendar size={24} className="mx-auto mb-2 opacity-50" />
                          <p className="text-sm">No videos scheduled</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Legend */}
          <div className="flex items-center justify-center gap-6 text-sm text-gray-600 pt-4 border-t border-gray-200">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-blue-100 border border-blue-300 rounded"></div>
              <span>Today</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-100 border border-green-300 rounded"></div>
              <span>Future dates</span>
            </div>
            <div className="flex items-center gap-2">
              <Video size={14} className="text-blue-600" />
              <span>Regular video</span>
            </div>
            <div className="flex items-center gap-2">
              <Smartphone size={14} className="text-purple-600" />
              <span>YouTube Short</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 