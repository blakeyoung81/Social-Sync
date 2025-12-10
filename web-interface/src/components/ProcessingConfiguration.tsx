import React from 'react';
import { Settings, Play, Upload, Calendar, Clock, Info, Zap, Sun, Moon, Target, AlertTriangle, CheckCircle } from 'lucide-react';

interface ProcessingConfigProps {
  config: {
    processingMode: 'dry-run' | 'process-only' | 'full-upload' | 'batch-upload';
    schedulingOptions?: {
      startMode: 'specific-date' | 'next-available-slot';
      frequency: 'standard' | 'day-and-night';
      conflictMode: 'force' | 'smart-analysis';
      startDate: string;
    };
    preferredTime?: string;
    defaultPostingTimes?: {
      morning: string;
      evening: string;
    };
    analysisDepth?: string;
  };
  onConfigChange: (updates: any) => void;
  disabled?: boolean;
}

export default function ProcessingConfiguration({ config, onConfigChange, disabled }: ProcessingConfigProps) {
  const requiresScheduling = config.processingMode === 'full-upload' || config.processingMode === 'batch-upload';
  
  const updateConfig = (updates: any) => {
    onConfigChange(updates);
  };

  const formatTime12Hour = (time24: string) => {
    const [hours, minutes] = time24.split(':');
    const hour12 = parseInt(hours) > 12 ? parseInt(hours) - 12 : parseInt(hours);
    const ampm = parseInt(hours) >= 12 ? 'PM' : 'AM';
    return `${hour12}:${minutes} ${ampm}`;
  };

  const getTomorrowDate = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
        <h3 className="font-semibold text-purple-900 mb-2 flex items-center gap-2">
          <Settings className="text-purple-600" size={20} />
          Processing & Scheduling Configuration
        </h3>
        <p className="text-sm text-purple-800">
          Configure how your videos are processed and when they get posted across all platforms.
        </p>
      </div>



      {/* Scheduling Configuration - Only show for upload modes */}
      {requiresScheduling && (
        <div className="space-y-6">
          
          {/* Step 1: Start Date */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h4 className="font-medium text-gray-900 mb-4 flex items-center gap-2">
              <Calendar className="text-blue-600" size={18} />
              Step 1: When to Start Posting
            </h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              {/* Specific Date */}
              <div 
                className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                  config.schedulingOptions?.startMode === 'specific-date' 
                    ? 'border-blue-500 bg-blue-50' 
                    : 'border-gray-200 hover:border-blue-300'
                }`}
                onClick={() => updateConfig({
                  schedulingOptions: {
                    ...config.schedulingOptions,
                    startMode: 'specific-date',
                    frequency: config.schedulingOptions?.frequency || 'standard',
                    conflictMode: config.schedulingOptions?.conflictMode || 'force',
                    startDate: config.schedulingOptions?.startDate || getTomorrowDate()
                  }
                })}
              >
                <div className="flex items-center gap-2 mb-2">
                  <Calendar className="text-blue-600" size={16} />
                  <span className="font-medium">Specific Date</span>
                </div>
                <p className="text-sm text-gray-600">I'll choose the exact date to start</p>
              </div>

              {/* Next Available Slot */}
              <div 
                className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                  config.schedulingOptions?.startMode === 'next-available-slot' 
                    ? 'border-green-500 bg-green-50' 
                    : 'border-gray-200 hover:border-green-300'
                }`}
                onClick={() => updateConfig({
                  schedulingOptions: {
                    ...config.schedulingOptions,
                    startMode: 'next-available-slot',
                    frequency: config.schedulingOptions?.frequency || 'standard',
                    conflictMode: config.schedulingOptions?.conflictMode || 'smart-analysis',
                    startDate: config.schedulingOptions?.startDate || getTomorrowDate()
                  }
                })}
              >
                <div className="flex items-center gap-2 mb-2">
                  <Target className="text-green-600" size={16} />
                  <span className="font-medium">Next Available Slot</span>
                </div>
                <p className="text-sm text-gray-600">Find the next open day automatically</p>
              </div>
            </div>

            {/* Date Picker for Specific Date */}
            {config.schedulingOptions?.startMode === 'specific-date' && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <label className="block text-sm font-medium mb-2 text-blue-900">Start Date</label>
                <input
                  type="date"
                  value={config.schedulingOptions?.startDate || getTomorrowDate()}
                  onChange={(e) => updateConfig({ 
                    schedulingOptions: { 
                      ...config.schedulingOptions, 
                      startDate: e.target.value
                    }
                  })}
                  className="w-full p-3 border border-blue-300 rounded-lg text-gray-900"
                  disabled={disabled}
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>
            )}


          </div>

          {/* Step 2: Posting Frequency */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h4 className="font-medium text-gray-900 mb-4 flex items-center gap-2">
              <Clock className="text-purple-600" size={18} />
              Step 2: How Often to Post
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              {/* Standard Mode */}
              <div 
                className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                  config.schedulingOptions?.frequency === 'standard' 
                    ? 'border-blue-500 bg-blue-50' 
                    : 'border-gray-200 hover:border-blue-300'
                }`}
                onClick={() => updateConfig({ 
                  schedulingOptions: { 
                    ...config.schedulingOptions, 
                    frequency: 'standard'
                  }
                })}
              >
                <div className="flex items-center gap-2 mb-2">
                  <Sun className="text-blue-600" size={20} />
                  <span className="font-medium">Standard</span>
                </div>
                <p className="text-sm text-gray-600">One video per day</p>
                <div className="text-xs text-blue-600 mt-1">📅 Daily at the same time</div>
              </div>

              {/* Day & Night Mode */}
              <div 
                className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                  config.schedulingOptions?.frequency === 'day-and-night' 
                    ? 'border-amber-500 bg-amber-50' 
                    : 'border-gray-200 hover:border-amber-300'
                }`}
                onClick={() => updateConfig({ 
                  schedulingOptions: { 
                    ...config.schedulingOptions, 
                    frequency: 'day-and-night'
                  }
                })}
              >
                <div className="flex items-center gap-2 mb-2">
                  <div className="flex">
                    <Sun className="text-amber-500" size={16} />
                    <Moon className="text-amber-600" size={16} />
                  </div>
                  <span className="font-medium">Day & Night</span>
                </div>
                <p className="text-sm text-gray-600">Two videos per day</p>
                <div className="text-xs text-amber-600 mt-1">🌅🌆 Morning + Evening posts</div>
              </div>
            </div>

            {/* Time Configuration */}
            {config.schedulingOptions?.frequency === 'standard' && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <label className="block text-sm font-medium mb-2 text-blue-900">Daily Posting Time</label>
                <select
                  value={config.preferredTime || "07:00"}
                  onChange={(e) => updateConfig({ preferredTime: e.target.value })}
                  className="w-full p-3 border border-blue-300 rounded-lg text-gray-900 bg-white"
                  disabled={disabled}
                >
                  <option value="06:00">6:00 AM - Early Morning</option>
                  <option value="07:00">7:00 AM - Morning Prime</option>
                  <option value="08:00">8:00 AM - Morning</option>
                  <option value="12:00">12:00 PM - Noon</option>
                  <option value="15:00">3:00 PM - Afternoon</option>
                  <option value="18:00">6:00 PM - Evening</option>
                  <option value="20:00">8:00 PM - Prime Time</option>
                </select>
              </div>
            )}

            {config.schedulingOptions?.frequency === 'day-and-night' && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2 text-amber-900">Morning Time</label>
                    <select
                      value={config.defaultPostingTimes?.morning || "07:00"}
                      onChange={(e) => updateConfig({ 
                        defaultPostingTimes: { 
                          ...config.defaultPostingTimes, 
                          morning: e.target.value,
                          evening: config.defaultPostingTimes?.evening || "18:00"
                        }
                      })}
                      className="w-full p-3 border border-amber-300 rounded-lg text-gray-900 bg-white"
                      disabled={disabled}
                    >
                      <option value="06:00">6:00 AM</option>
                      <option value="07:00">7:00 AM</option>
                      <option value="08:00">8:00 AM</option>
                      <option value="09:00">9:00 AM</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-2 text-amber-900">Evening Time</label>
                    <select
                      value={config.defaultPostingTimes?.evening || "18:00"}
                      onChange={(e) => updateConfig({ 
                        defaultPostingTimes: { 
                          ...config.defaultPostingTimes, 
                          evening: e.target.value,
                          morning: config.defaultPostingTimes?.morning || "07:00"
                        }
                      })}
                      className="w-full p-3 border border-amber-300 rounded-lg text-gray-900 bg-white"
                      disabled={disabled}
                    >
                      <option value="15:00">3:00 PM</option>
                      <option value="16:00">4:00 PM</option>
                      <option value="17:00">5:00 PM</option>
                      <option value="18:00">6:00 PM</option>
                      <option value="19:00">7:00 PM</option>
                      <option value="20:00">8:00 PM</option>
                    </select>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Step 3: Conflict Handling */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h4 className="font-medium text-gray-900 mb-4 flex items-center gap-2">
              <AlertTriangle className="text-orange-600" size={18} />
              Step 3: What to Do About Conflicts
            </h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              {/* Force Mode */}
              <div 
                className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                  config.schedulingOptions?.conflictMode === 'force' 
                    ? 'border-red-500 bg-red-50' 
                    : 'border-gray-200 hover:border-red-300'
                }`}
                onClick={() => updateConfig({
                  schedulingOptions: {
                    ...config.schedulingOptions,
                    conflictMode: 'force'
                  }
                })}
              >
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="text-red-600" size={16} />
                  <span className="font-medium">Force Post</span>
                </div>
                <p className="text-sm text-gray-600">Post anyway, ignore existing videos</p>
                <div className="text-xs text-red-600 mt-1">⚡ Just truck through regardless</div>
              </div>

              {/* Smart Analysis Mode */}
              <div 
                className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                  config.schedulingOptions?.conflictMode === 'smart-analysis' 
                    ? 'border-green-500 bg-green-50' 
                    : 'border-gray-200 hover:border-green-300'
                }`}
                onClick={() => updateConfig({
                  schedulingOptions: {
                    ...config.schedulingOptions,
                    conflictMode: 'smart-analysis'
                  }
                })}
              >
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="text-green-600" size={16} />
                  <span className="font-medium">Smart Analysis</span>
                </div>
                <p className="text-sm text-gray-600">Check for conflicts, skip to next slot</p>
                <div className="text-xs text-green-600 mt-1">🧠 Analyze and avoid conflicts</div>
              </div>
            </div>
          </div>

          {/* Summary Display */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <h5 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
              <Info className="text-gray-600" size={16} />
              Your Schedule Summary
            </h5>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <span className="font-medium text-gray-700">Start:</span>
                <div className="text-gray-600">
                  {config.schedulingOptions?.startMode === 'next-available-slot' 
                    ? `Auto-detect (search ${config.analysisDepth || '30-days'})` 
                    : (config.schedulingOptions?.startDate || 'Select date')}
                </div>
              </div>
              <div>
                <span className="font-medium text-gray-700">Frequency:</span>
                <div className="text-gray-600">
                  {config.schedulingOptions?.frequency === 'day-and-night' 
                    ? `2x daily (${formatTime12Hour(config.defaultPostingTimes?.morning || '07:00')} + ${formatTime12Hour(config.defaultPostingTimes?.evening || '18:00')})` 
                    : `1x daily (${formatTime12Hour(config.preferredTime || '07:00')})`}
                </div>
              </div>
              <div>
                <span className="font-medium text-gray-700">Conflicts:</span>
                <div className="text-gray-600">
                  {config.schedulingOptions?.conflictMode === 'force' 
                    ? 'Post anyway' 
                    : 'Skip to next slot'}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Current Mode Display - Always show */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <div className="flex items-center gap-2 text-gray-700">
          <Settings size={16} />
          <span className="font-medium">Current mode: {config.processingMode}</span>
        </div>
        <p className="text-sm text-gray-600 mt-1">
          {config.processingMode === 'dry-run' && "Videos will be processed for testing but not uploaded anywhere."}
          {config.processingMode === 'process-only' && "Videos will be processed and prepared but not uploaded."}
          {config.processingMode === 'full-upload' && "Videos will be processed and uploaded according to your schedule."}
          {config.processingMode === 'batch-upload' && "Multiple videos will be processed and uploaded in sequence."}
        </p>
      </div>
    </div>
  );
} 