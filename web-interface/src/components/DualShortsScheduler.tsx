'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Calendar, Clock, Users, Globe, Settings, PlayCircle } from 'lucide-react';

interface DualShortsSchedulerProps {
  inputFolder: string;
  onScheduleGenerated: (schedule: any[]) => void;
}

export default function DualShortsScheduler({ inputFolder, onScheduleGenerated }: DualShortsSchedulerProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [config, setConfig] = useState({
    startDate: (() => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      return tomorrow.toISOString().split('T')[0];
    })(),
    morningTime: '07:00',
    eveningTime: '19:00',
    enableMemberOnly: false,
    memberOnlyPeriod: 24, // hours
  });

  const handleGenerateSchedule = async () => {
    setIsGenerating(true);
    try {
      const response = await fetch('/api/schedule-dual-shorts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          inputFolder,
          ...config,
        }),
      });

      const result = await response.json();
      
      if (result.success) {
        onScheduleGenerated(result.schedule);
      } else {
        console.error('Failed to generate schedule:', result.error);
      }
    } catch (error) {
      console.error('Error generating schedule:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 border border-gray-200">
      <div className="flex items-center gap-3 mb-6">
        <PlayCircle className="w-6 h-6 text-red-600" />
        <h3 className="text-xl font-semibold text-gray-800">Dual Shorts Scheduler</h3>
      </div>

      <div className="space-y-6">
        {/* Basic Schedule Settings */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
              <Calendar className="w-4 h-4" />
              Start Date
            </label>
            <input
              type="date"
              value={config.startDate}
              onChange={(e) => setConfig(prev => ({ ...prev, startDate: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
            />
          </div>

          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
              <Clock className="w-4 h-4" />
              Morning Time
            </label>
            <input
              type="time"
              value={config.morningTime}
              onChange={(e) => setConfig(prev => ({ ...prev, morningTime: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
            />
          </div>

          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
              <Clock className="w-4 h-4" />
              Evening Time
            </label>
            <input
              type="time"
              value={config.eveningTime}
              onChange={(e) => setConfig(prev => ({ ...prev, eveningTime: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
            />
          </div>
        </div>

        {/* Member-Only Settings */}
        <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-600" />
              <span className="font-medium text-gray-700">Member-Only Release</span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={config.enableMemberOnly}
                onChange={(e) => setConfig(prev => ({ ...prev, enableMemberOnly: e.target.checked }))}
                className="sr-only"
              />
              <div className={`w-11 h-6 rounded-full transition-colors ${config.enableMemberOnly ? 'bg-blue-600' : 'bg-gray-300'}`}>
                <div className={`w-5 h-5 bg-white rounded-full shadow transform transition-transform ${config.enableMemberOnly ? 'translate-x-5' : 'translate-x-0'} mt-0.5`} />
              </div>
            </label>
          </div>

          {config.enableMemberOnly && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="space-y-3"
            >
              <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                <p className="text-sm text-blue-800">
                  <strong>How it works:</strong> Videos will be uploaded as private/unlisted initially, 
                  giving your members early access. After the specified period, they'll be made public.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Member-Only Period (hours)
                </label>
                <select
                  value={config.memberOnlyPeriod}
                  onChange={(e) => setConfig(prev => ({ ...prev, memberOnlyPeriod: parseInt(e.target.value) }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value={1}>1 hour</option>
                  <option value={6}>6 hours</option>
                  <option value={12}>12 hours</option>
                  <option value={24}>24 hours (1 day)</option>
                  <option value={48}>48 hours (2 days)</option>
                  <option value={72}>72 hours (3 days)</option>
                  <option value={168}>1 week</option>
                </select>
              </div>
            </motion.div>
          )}
        </div>

        {/* Privacy Status Info */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <Settings className="w-5 h-5 text-yellow-600 mt-0.5" />
            <div>
              <h4 className="font-medium text-yellow-800">YouTube Privacy Limitations</h4>
              <p className="text-sm text-yellow-700 mt-1">
                YouTube's API doesn't support automatic "members-only" status. As a workaround, videos will be:
              </p>
              <ul className="text-sm text-yellow-700 mt-2 space-y-1 list-disc list-inside">
                <li><strong>Initial:</strong> Private/Unlisted (member access via direct links)</li>
                <li><strong>Later:</strong> Manual or scheduled change to Public visibility</li>
                <li><strong>Alternative:</strong> Use YouTube Studio's built-in member scheduling</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Generate Button */}
        <motion.button
          onClick={handleGenerateSchedule}
          disabled={isGenerating || !inputFolder}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className={`w-full py-3 px-4 rounded-lg font-medium text-white transition-colors ${
            isGenerating || !inputFolder 
              ? 'bg-gray-400 cursor-not-allowed' 
              : 'bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800'
          }`}
        >
          {isGenerating ? (
            <div className="flex items-center justify-center gap-2">
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Generating Schedule...
            </div>
          ) : (
            <div className="flex items-center justify-center gap-2">
              <Globe className="w-4 h-4" />
              Generate Dual Shorts Schedule
            </div>
          )}
        </motion.button>
      </div>
    </div>
  );
}
