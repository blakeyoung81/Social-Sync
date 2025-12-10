import React from 'react';
import { Clock, Calendar, Info, Settings, Zap, Sun, Moon, Target } from 'lucide-react';

interface SchedulingConfigProps {
  config: {
    processingMode: 'dry-run' | 'process-only' | 'full-upload' | 'batch-upload';
    schedulingOptions: {
      mode: 'standard' | 'day-and-night' | 'next-slot';
      startDate: string;
    };
    preferredTime?: string;
    defaultPostingTimes: {
      morning: string;
      afternoon: string;
      evening: string;
    };
    slotInterval?: string;
  };
  onConfigChange: (updates: any) => void;
  disabled?: boolean;
}

export default function SchedulingConfiguration({ config, onConfigChange, disabled }: SchedulingConfigProps) {
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
      {/* Header with Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <Info className="text-blue-600 mt-0.5" size={20} />
          <div>
            <h3 className="font-semibold text-blue-900 mb-2">📅 How Scheduling Works</h3>
            <div className="text-sm text-blue-800 space-y-2">
              <p><strong>Processing Mode:</strong> Controls what happens to your videos (test, process, or upload)</p>
              <p><strong>Schedule Mode:</strong> Controls WHEN your videos get posted (only applies to upload modes)</p>
              <p><strong>Start Date:</strong> The first date when posting begins</p>
              <p><strong>Global Time Defaults:</strong> Fallback times used by social media platforms</p>
            </div>
          </div>
        </div>
      </div>

      {/* Processing Mode Alert */}
      {!requiresScheduling && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <div className="flex items-center gap-2 text-gray-700">
            <Settings size={16} />
            <span className="font-medium">Current mode: {config.processingMode}</span>
          </div>
          <p className="text-sm text-gray-600 mt-2">
            Scheduling settings only apply when using "Full Upload" or "Batch Upload" modes.
          </p>
        </div>
      )}

      {/* Scheduling Configuration - Only show if upload mode */}
      {requiresScheduling && (
        <div className="space-y-6">
          {/* Schedule Mode Selection */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h4 className="font-medium text-gray-900 mb-4 flex items-center gap-2">
              <Clock className="text-purple-600" size={18} />
              Choose Your Posting Schedule
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Standard Mode */}
              <div 
                className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                  config.schedulingOptions.mode === 'standard' 
                    ? 'border-blue-500 bg-blue-50' 
                    : 'border-gray-200 hover:border-blue-300'
                }`}
                onClick={() => updateConfig({ 
                  schedulingOptions: { ...config.schedulingOptions, mode: 'standard' }
                })}
              >
                <div className="flex items-center gap-2 mb-2">
                  <Sun className="text-blue-600" size={20} />
                  <span className="font-medium">Standard</span>
                </div>
                <p className="text-sm text-gray-700 mb-2">One video per day at the same time</p>
                <div className="text-xs text-gray-700 font-medium">
                  📅 Example: Every day at 7:00 AM
                </div>
              </div>

              {/* Day & Night Mode */}
              <div 
                className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                  config.schedulingOptions.mode === 'day-and-night' 
                    ? 'border-amber-500 bg-amber-50' 
                    : 'border-gray-200 hover:border-amber-300'
                }`}
                onClick={() => updateConfig({ 
                  schedulingOptions: { ...config.schedulingOptions, mode: 'day-and-night' }
                })}
              >
                <div className="flex items-center gap-2 mb-2">
                  <div className="flex">
                    <Sun className="text-amber-500" size={16} />
                    <Moon className="text-amber-600" size={16} />
                  </div>
                  <span className="font-medium">Day & Night</span>
                </div>
                <p className="text-sm text-gray-700 mb-2">Two videos per day</p>
                <div className="text-xs text-gray-700 font-medium">
                  📅 Example: 7:00 AM + 4:00 PM daily
                </div>
              </div>

              {/* Next Slot Mode */}
              <div 
                className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                  config.schedulingOptions.mode === 'next-slot' 
                    ? 'border-green-500 bg-green-50' 
                    : 'border-gray-200 hover:border-green-300'
                }`}
                onClick={() => updateConfig({ 
                  schedulingOptions: { ...config.schedulingOptions, mode: 'next-slot' }
                })}
              >
                <div className="flex items-center gap-2 mb-2">
                  <Target className="text-green-600" size={20} />
                  <span className="font-medium">Smart Slot</span>
                </div>
                <p className="text-sm text-gray-700 mb-2">Find available time slots</p>
                <div className="text-xs text-gray-700 font-medium">
                  📅 Example: Next available morning slot
                </div>
              </div>
            </div>
          </div>

          {/* Start Date - Always show for upload modes */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h4 className="font-medium text-gray-900 mb-4 flex items-center gap-2">
              <Calendar className="text-green-600" size={18} />
              When to Start Posting
            </h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-900">Start Date</label>
                <input
                  type="date"
                  value={config.schedulingOptions.startDate || getTomorrowDate()}
                  onChange={(e) => updateConfig({ 
                    schedulingOptions: { ...config.schedulingOptions, startDate: e.target.value }
                  })}
                  className="w-full p-3 border border-gray-300 rounded-lg text-gray-900"
                  disabled={disabled}
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>
              <div className="flex items-center">
                <div className="text-sm text-gray-600">
                  <p className="font-medium mb-1">📅 What this means:</p>
                  <p>Your first video will be scheduled to post on this date.</p>
                  {config.schedulingOptions.mode === 'day-and-night' && (
                    <p className="text-amber-700 mt-1">Two videos will post on this date.</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Mode-Specific Time Configuration */}
          {config.schedulingOptions.mode === 'standard' && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
              <h4 className="font-medium text-blue-900 mb-4">⏰ Standard Mode - Daily Posting Time</h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium mb-2 text-blue-900">Posting Time</label>
                  <select
                    value={config.preferredTime || "07:00"}
                    onChange={(e) => updateConfig({ preferredTime: e.target.value })}
                    className="w-full p-3 border border-blue-300 rounded-lg text-gray-900 bg-white font-semibold"
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
                
                <div className="bg-blue-100 rounded-lg p-4">
                  <h5 className="font-medium text-blue-900 mb-2">📊 Your Schedule Preview</h5>
                  <div className="text-sm text-blue-800 space-y-1">
                    <p>• Start: {config.schedulingOptions.startDate || 'Select date'}</p>
                    <p>• Time: {formatTime12Hour(config.preferredTime || "07:00")}</p>
                    <p>• Frequency: One video per day</p>
                    <p>• Next video: Following day at same time</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {config.schedulingOptions.mode === 'day-and-night' && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-6">
              <h4 className="font-medium text-amber-900 mb-4">🌅🌆 Day & Night Mode - Two Posts Daily</h4>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2 text-amber-900">Morning Time</label>
                  <select
                    value={config.defaultPostingTimes.morning || "07:00"}
                    onChange={(e) => updateConfig({ 
                      defaultPostingTimes: { ...config.defaultPostingTimes, morning: e.target.value }
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
                    value={config.defaultPostingTimes.afternoon || "16:00"}
                    onChange={(e) => updateConfig({ 
                      defaultPostingTimes: { ...config.defaultPostingTimes, afternoon: e.target.value }
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
                
                <div className="bg-amber-100 rounded-lg p-4">
                  <h5 className="font-medium text-amber-900 mb-2">📊 Your Schedule</h5>
                  <div className="text-sm text-amber-800 space-y-1">
                    <p>• Start: {config.schedulingOptions.startDate || 'Select date'}</p>
                    <p>• Morning: {formatTime12Hour(config.defaultPostingTimes.morning || "07:00")}</p>
                    <p>• Evening: {formatTime12Hour(config.defaultPostingTimes.afternoon || "16:00")}</p>
                    <p>• Daily: 2 videos per day</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {config.schedulingOptions.mode === 'next-slot' && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-6">
              <h4 className="font-medium text-green-900 mb-4">🎯 Smart Slot Mode - Intelligent Scheduling</h4>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2 text-green-900">Preferred Time Period</label>
                  <select
                    value={config.preferredTime || "morning"}
                    onChange={(e) => updateConfig({ preferredTime: e.target.value })}
                    className="w-full p-3 border border-green-300 rounded-lg text-gray-900 bg-white"
                    disabled={disabled}
                  >
                    <option value="morning">Morning (6AM-10AM)</option>
                    <option value="midday">Midday (10AM-2PM)</option>
                    <option value="afternoon">Afternoon (2PM-6PM)</option>
                    <option value="evening">Evening (6PM-10PM)</option>
                    <option value="anytime">Any Available Time</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2 text-green-900">Check Interval</label>
                  <select
                    value={config.slotInterval || "24"}
                    onChange={(e) => updateConfig({ slotInterval: e.target.value })}
                    className="w-full p-3 border border-green-300 rounded-lg text-gray-900 bg-white"
                    disabled={disabled}
                  >
                    <option value="12">Every 12 hours</option>
                    <option value="24">Every 24 hours</option>
                    <option value="48">Every 48 hours</option>
                    <option value="72">Every 3 days</option>
                  </select>
                </div>
                
                <div className="bg-green-100 rounded-lg p-4">
                  <h5 className="font-medium text-green-900 mb-2">🔍 Smart Scheduling</h5>
                  <div className="text-sm text-green-800 space-y-1">
                    <p>• Searches from: {config.schedulingOptions.startDate || 'Select date'}</p>
                    <p>• Prefers: {config.preferredTime || 'Morning'} slots</p>
                    <p>• Checks every: {config.slotInterval || '24'} hours</p>
                    <p>• Auto-adjusts based on availability</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Global Time Defaults - Always show but explain purpose */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
        <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
          <Settings className="text-gray-600" size={18} />
          Global Time Defaults (For Social Media Platforms)
        </h4>
        
        <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-sm text-yellow-800">
            💡 <strong>What these are for:</strong> These times are used as fallbacks for TikTok, Instagram, and other social media platforms when they don't specify their own posting times. They don't affect YouTube scheduling above.
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2 text-gray-700">Morning Reference</label>
            <input
              type="time"
              value={config.defaultPostingTimes.morning || "07:00"}
              onChange={(e) => updateConfig({ 
                defaultPostingTimes: { ...config.defaultPostingTimes, morning: e.target.value }
              })}
              className="w-full p-2 border border-gray-300 rounded-lg text-gray-900"
              disabled={disabled}
            />
            <p className="text-xs text-gray-500 mt-1">Default morning time for social platforms</p>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2 text-gray-700">Afternoon Reference</label>
            <input
              type="time"
              value={config.defaultPostingTimes.afternoon || "16:00"}
              onChange={(e) => updateConfig({ 
                defaultPostingTimes: { ...config.defaultPostingTimes, afternoon: e.target.value }
              })}
              className="w-full p-2 border border-gray-300 rounded-lg text-gray-900"
              disabled={disabled}
            />
            <p className="text-xs text-gray-500 mt-1">Default afternoon time for social platforms</p>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2 text-gray-700">Evening Reference</label>
            <input
              type="time"
              value={config.defaultPostingTimes.evening || "20:00"}
              onChange={(e) => updateConfig({ 
                defaultPostingTimes: { ...config.defaultPostingTimes, evening: e.target.value }
              })}
              className="w-full p-2 border border-gray-300 rounded-lg text-gray-900"
              disabled={disabled}
            />
            <p className="text-xs text-gray-500 mt-1">Default evening time for social platforms</p>
          </div>
        </div>
      </div>
    </div>
  );
} 