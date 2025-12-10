'use client';

import React, { useState } from 'react';
import { Settings, Save, RotateCcw } from 'lucide-react';
import { getSettings, saveSettings, DEFAULT_SETTINGS, type SettingsType } from '../constants/settings';

interface SettingsPanelProps {
  onClose?: () => void;
}

export const SettingsPanel: React.FC<SettingsPanelProps> = ({ onClose }) => {
  const [settings, setSettings] = useState<SettingsType>(getSettings);
  const [isExpanded, setIsExpanded] = useState(false);

  const handleSave = () => {
    saveSettings(settings);
    if (onClose) onClose();
  };

  const handleReset = () => {
    setSettings(DEFAULT_SETTINGS);
  };

  const updatePrompt = (promptType: keyof typeof settings.gptPrompts, value: string) => {
    setSettings(prev => ({
      ...prev,
      gptPrompts: {
        ...prev.gptPrompts,
        [promptType]: value
      }
    }));
  };

  const updateSubtitleFontSize = (size: number) => {
    setSettings(prev => ({
      ...prev,
      subtitleFontSize: size
    }));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-4xl max-h-[90vh] overflow-y-auto w-full mx-4">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Settings className="w-6 h-6 text-blue-600" />
            <h2 className="text-2xl font-bold text-gray-800">Settings</h2>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleReset}
              className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              <RotateCcw className="w-4 h-4" />
              Reset
            </button>
            <button
              onClick={handleSave}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Save className="w-4 h-4" />
              Save
            </button>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 text-2xl"
            >
              ×
            </button>
          </div>
        </div>

        {/* Subtitle Configuration */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Subtitle Settings</h3>
          <div className="bg-gray-50 p-4 rounded-lg grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Font Size
              </label>
              <input
                type="number"
                min="6"
                max="20"
                value={settings.subtitleFontSize}
                onChange={(e) => setSettings(prev => ({ ...prev, subtitleFontSize: parseInt(e.target.value) || 8 }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <p className="text-sm text-gray-500 mt-1">
                Default: 8 (recommended for most videos)
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Font Color
              </label>
              <input
                type="color"
                value={settings.subtitleColor}
                onChange={(e) => setSettings(prev => ({ ...prev, subtitleColor: e.target.value }))}
                className="w-16 h-10 border border-gray-300 rounded-lg"
              />
              <p className="text-sm text-gray-500 mt-1">
                Choose subtitle text color
              </p>
            </div>
          </div>
        </div>

        {/* Frame Settings */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Frame & Border</h3>
          <div className="bg-gray-50 p-4 rounded-lg grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Frame Style</label>
              <select
                value={settings.frameStyle || 'rainbow'}
                onChange={(e) => setSettings(prev => ({ ...prev, frameStyle: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="rainbow">Rainbow</option>
                <option value="neon">Neon</option>
                <option value="solid">Solid</option>
                <option value="animated">Animated</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Frame Thickness (px)</label>
              <input
                type="number"
                min="1"
                max="50"
                value={settings.frameWidth || 10}
                onChange={(e) => setSettings(prev => ({ ...prev, frameWidth: parseInt(e.target.value) || 10 }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Frame Opacity (%)</label>
              <input
                type="number"
                min="10"
                max="100"
                value={settings.frameOpacity || 80}
                onChange={(e) => setSettings(prev => ({ ...prev, frameOpacity: parseInt(e.target.value) || 80 }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Background Music Settings */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Background Music</h3>
          <div className="bg-gray-50 p-4 rounded-lg">
            <label className="block text-sm font-medium text-gray-700 mb-2">Music Selection</label>
            <select
              value={settings.musicTrack || 'random'}
              onChange={(e) => setSettings(prev => ({ ...prev, musicTrack: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="random">Random (Recommended)</option>
              <option value="none">None</option>
              {/* Add more music options here if needed */}
            </select>
            <p className="text-sm text-gray-500 mt-1">
              "Random" will pick a random music track from your assets/music folder.
            </p>
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Background Music Volume (%)
              </label>
              <input
                type="range"
                min="0"
                max="100"
                value={settings.backgroundMusicVolume || 50}
                onChange={(e) => setSettings(prev => ({ ...prev, backgroundMusicVolume: parseInt(e.target.value) || 50 }))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              />
              <p className="text-sm text-gray-500 mt-1">
                Current: {settings.backgroundMusicVolume || 50}%
              </p>
            </div>
          </div>
        </div>

        {/* GPT Prompt Configuration */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">AI Prompt Configuration</h3>
          
          {/* Topic Detection Prompt */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Topic Detection Prompt
            </label>
            <textarea
              value={settings.gptPrompts.topicDetection}
              onChange={(e) => updatePrompt('topicDetection', e.target.value)}
              className="w-full h-32 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
              placeholder="Prompt for auto-detecting video topics..."
            />
            <p className="text-sm text-gray-500 mt-1">
              Use {'{transcript}'} as a placeholder for the transcript text
            </p>
          </div>

          {/* Multimedia Analysis Prompt */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Multimedia Analysis Prompt
            </label>
            <textarea
              value={settings.gptPrompts.multimediaAnalysis}
              onChange={(e) => updatePrompt('multimediaAnalysis', e.target.value)}
              className="w-full h-48 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
              placeholder="Prompt for analyzing B-roll and image placements..."
            />
            <p className="text-sm text-gray-500 mt-1">
              Use {'{topic}'}, {'{duration}'}, and {'{transcript}'} as placeholders
            </p>
          </div>

          {/* Image Generation Prompt */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Image Generation Prompt
            </label>
            <textarea
              value={settings.gptPrompts.imageGeneration}
              onChange={(e) => updatePrompt('imageGeneration', e.target.value)}
              className="w-full h-32 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
              placeholder="Prompt for generating custom images..."
            />
            <p className="text-sm text-gray-500 mt-1">
              Use {'{topic}'} and {'{description}'} as placeholders
            </p>
          </div>
        </div>

        {/* AI Features Configuration */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">AI Features Configuration</h3>
          
          {/* Topic Detection Settings */}
          <div className="mb-6">
            <h4 className="text-md font-medium text-gray-700 mb-3">Topic Detection</h4>
            <div className="bg-gray-50 p-4 rounded-lg grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Model</label>
                <select
                  value={settings.processing.topicDetectionModel || 'gpt-4o-mini'}
                  onChange={(e) => setSettings(prev => ({
                    ...prev,
                    processing: { ...prev.processing, topicDetectionModel: e.target.value as any }
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="gpt-4o-mini">GPT-4o Mini (Fast)</option>
                  <option value="gpt-4-turbo">GPT-4 Turbo (Premium)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Multimedia Analysis Settings */}
          <div className="mb-6">
            <h4 className="text-md font-medium text-gray-700 mb-3">Multimedia Analysis</h4>
            <div className="bg-gray-50 p-4 rounded-lg grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Model</label>
                <select
                  value={settings.processing.multimediaAnalysisModel || 'gpt-4o'}
                  onChange={(e) => setSettings(prev => ({
                    ...prev,
                    processing: { ...prev.processing, multimediaAnalysisModel: e.target.value as any }
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="gpt-4o">GPT-4o (Recommended)</option>
                  <option value="gpt-4o-mini">GPT-4o Mini</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Max B-Roll Clips</label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={settings.processing.maxBrollSuggestions || 5}
                  onChange={(e) => setSettings(prev => ({
                    ...prev,
                    processing: { ...prev.processing, maxBrollSuggestions: parseInt(e.target.value) || 5 }
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Max Generated Images</label>
                <input
                  type="number"
                  min="1"
                  max="8"
                  value={settings.processing.maxImageSuggestions || 4}
                  onChange={(e) => setSettings(prev => ({
                    ...prev,
                    processing: { ...prev.processing, maxImageSuggestions: parseInt(e.target.value) || 4 }
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Image Generation Settings */}
          <div className="mb-6">
            <h4 className="text-md font-medium text-gray-700 mb-3">AI Image Generation</h4>
            <div className="bg-gray-50 p-4 rounded-lg grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Model</label>
                <select
                  value={settings.processing.imageGenerationModel || 'dall-e-3'}
                  onChange={(e) => setSettings(prev => ({
                    ...prev,
                    processing: { ...prev.processing, imageGenerationModel: e.target.value as any }
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="dall-e-3">DALL-E 3 (Best Quality)</option>
                  <option value="dall-e-2">DALL-E 2 (Faster)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Quality</label>
                <select
                  value={settings.processing.imageQuality || 'standard'}
                  onChange={(e) => setSettings(prev => ({
                    ...prev,
                    processing: { ...prev.processing, imageQuality: e.target.value as any }
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="standard">Standard</option>
                  <option value="hd">HD (More expensive)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Size</label>
                <select
                  value={settings.processing.imageSize || '1024x1024'}
                  onChange={(e) => setSettings(prev => ({
                    ...prev,
                    processing: { ...prev.processing, imageSize: e.target.value as any }
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="1024x1024">Square (1024x1024)</option>
                  <option value="1792x1024">Landscape (1792x1024)</option>
                  <option value="1024x1792">Portrait (1024x1792)</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Phase 3 & 4 Settings */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Narrative Structure & Audio Polish</h3>
          
          {/* Dynamic Zoom Settings */}
          <div className="mb-6">
            <h4 className="text-md font-medium text-gray-700 mb-3">Dynamic Zoom</h4>
            <div className="bg-gray-50 p-4 rounded-lg grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Zoom Intensity</label>
                <select
                  value={settings.processing.zoomIntensity || 'subtle'}
                  onChange={(e) => setSettings(prev => ({
                    ...prev,
                    processing: { ...prev.processing, zoomIntensity: e.target.value as any }
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="subtle">Subtle</option>
                  <option value="medium">Medium</option>
                  <option value="dramatic">Dramatic</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Zoom Frequency</label>
                <select
                  value={settings.processing.zoomFrequency || 'medium'}
                  onChange={(e) => setSettings(prev => ({
                    ...prev,
                    processing: { ...prev.processing, zoomFrequency: e.target.value as any }
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Zoom Duration (s)</label>
                <input
                  type="number"
                  min="0.1"
                  max="2"
                  step="0.1"
                  value={settings.processing.zoomDuration || 0.5}
                  onChange={(e) => setSettings(prev => ({
                    ...prev,
                    processing: { ...prev.processing, zoomDuration: parseFloat(e.target.value) || 0.5 }
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Topic Title Card Settings */}
          <div className="mb-6">
            <h4 className="text-md font-medium text-gray-700 mb-3">Topic Title Card</h4>
            <div className="bg-gray-50 p-4 rounded-lg grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Card Style</label>
                <select
                  value={settings.processing.topicCardStyle || 'medical'}
                  onChange={(e) => setSettings(prev => ({
                    ...prev,
                    processing: { ...prev.processing, topicCardStyle: e.target.value as any }
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="medical">Medical</option>
                  <option value="modern">Modern</option>
                  <option value="classic">Classic</option>
                  <option value="bold">Bold</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Animation Style</label>
                <select
                  value={settings.processing.topicCardAnimation || 'slide'}
                  onChange={(e) => setSettings(prev => ({
                    ...prev,
                    processing: { ...prev.processing, topicCardAnimation: e.target.value as any }
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="slide">Slide</option>
                  <option value="fade">Fade</option>
                  <option value="zoom">Zoom</option>
                  <option value="bounce">Bounce</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Duration (seconds)</label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  step="0.5"
                  value={settings.processing.topicCardDuration || 3}
                  onChange={(e) => setSettings(prev => ({
                    ...prev,
                    processing: { ...prev.processing, topicCardDuration: parseFloat(e.target.value) || 3 }
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Position</label>
                <select
                  value={settings.processing.topicCardPosition || 'top'}
                  onChange={(e) => setSettings(prev => ({
                    ...prev,
                    processing: { ...prev.processing, topicCardPosition: e.target.value as any }
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="top">Top</option>
                  <option value="center">Center</option>
                  <option value="bottom">Bottom</option>
                </select>
              </div>
            </div>
          </div>

          {/* Flash Logo Settings */}
          <div className="mb-6">
            <h4 className="text-md font-medium text-gray-700 mb-3">Flash Logo</h4>
            <div className="bg-gray-50 p-4 rounded-lg grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Logo Path</label>
                <input
                  type="text"
                  placeholder="Path to logo file"
                  value={settings.processing.logoPath || ''}
                  onChange={(e) => setSettings(prev => ({
                    ...prev,
                    processing: { ...prev.processing, logoPath: e.target.value }
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Display Duration (s)</label>
                <input
                  type="number"
                  min="0.5"
                  max="5"
                  step="0.1"
                  value={settings.processing.logoDisplayDuration || 1}
                  onChange={(e) => setSettings(prev => ({
                    ...prev,
                    processing: { ...prev.processing, logoDisplayDuration: parseFloat(e.target.value) || 1 }
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Logo Position</label>
                <select
                  value={settings.processing.logoPosition || 'top-right'}
                  onChange={(e) => setSettings(prev => ({
                    ...prev,
                    processing: { ...prev.processing, logoPosition: e.target.value as any }
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="top-left">Top Left</option>
                  <option value="top-right">Top Right</option>
                  <option value="center">Center</option>
                  <option value="bottom-left">Bottom Left</option>
                  <option value="bottom-right">Bottom Right</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Fade In Duration (s)</label>
                <input
                  type="number"
                  min="0.1"
                  max="2"
                  step="0.1"
                  value={settings.processing.logoFadeInDuration || 0.3}
                  onChange={(e) => setSettings(prev => ({
                    ...prev,
                    processing: { ...prev.processing, logoFadeInDuration: parseFloat(e.target.value) || 0.3 }
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Outro Settings */}
          <div className="mb-6">
            <h4 className="text-md font-medium text-gray-700 mb-3">Outro</h4>
            <div className="bg-gray-50 p-4 rounded-lg grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Outro Style</label>
                <select
                  value={settings.processing.outroStyle || 'default'}
                  onChange={(e) => setSettings(prev => ({
                    ...prev,
                    processing: { ...prev.processing, outroStyle: e.target.value as any }
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="default">Default</option>
                  <option value="animated">Animated</option>
                  <option value="custom">Custom</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Duration (seconds)</label>
                <input
                  type="number"
                  min="2"
                  max="10"
                  step="0.5"
                  value={settings.processing.outroDuration || 4}
                  onChange={(e) => setSettings(prev => ({
                    ...prev,
                    processing: { ...prev.processing, outroDuration: parseFloat(e.target.value) || 4 }
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Position</label>
                <select
                  value={settings.processing.outroPosition || 'center'}
                  onChange={(e) => setSettings(prev => ({
                    ...prev,
                    processing: { ...prev.processing, outroPosition: e.target.value as any }
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="center">Center</option>
                  <option value="bottom">Bottom</option>
                  <option value="top">Top</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Audio Settings */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Audio Levels & Settings</h3>
          
          {/* Volume Controls */}
          <div className="mb-6">
            <h4 className="text-md font-medium text-gray-700 mb-3">Volume Controls</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Speech/Voice Volume
                </label>
                <input
                  type="range"
                  min="0"
                  max="2"
                  step="0.1"
                  value={settings.processing.musicSpeechVolume || 1.0}
                  onChange={(e) => setSettings(prev => ({
                    ...prev,
                    processing: { ...prev.processing, musicSpeechVolume: parseFloat(e.target.value) }
                  }))}
                  className="w-full"
                />
                <div className="text-sm text-gray-600 text-center">
                  {Math.round((settings.processing.musicSpeechVolume || 1.0) * 100)}%
                </div>
                <div className="text-xs text-blue-600 mt-1">
                  Main audio/speech level
                </div>
              </div>

              <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Background Music Volume
                </label>
                <input
                  type="range"
                  min="0"
                  max="0.5"
                  step="0.01"
                  value={settings.processing.musicBackgroundVolume || 0.135}
                  onChange={(e) => setSettings(prev => ({
                    ...prev,
                    processing: { ...prev.processing, musicBackgroundVolume: parseFloat(e.target.value) }
                  }))}
                  className="w-full"
                />
                <div className="text-sm text-gray-600 text-center">
                  {Math.round((settings.processing.musicBackgroundVolume || 0.135) * 100)}%
                </div>
                <div className="text-xs text-green-600 mt-1">
                  Quiet background level
                </div>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Sound Effects Volume
                </label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={settings.processing.soundEffectVolume || 50}
                  onChange={(e) => setSettings(prev => ({
                    ...prev,
                    processing: { ...prev.processing, soundEffectVolume: parseInt(e.target.value) }
                  }))}
                  className="w-full"
                />
                <div className="text-sm text-gray-600 text-center">
                  {settings.processing.soundEffectVolume || 50}%
                </div>
              </div>
            </div>
          </div>

          {/* Background Music Settings */}
          <div className="mb-6">
            <h4 className="text-md font-medium text-gray-700 mb-3">Background Music</h4>
            <div className="bg-gray-50 p-4 rounded-lg grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Music Track</label>
                <select
                  value={settings.processing.musicTrack || 'smart'}
                  onChange={(e) => setSettings(prev => ({
                    ...prev,
                    processing: { ...prev.processing, musicTrack: e.target.value as any }
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="smart">Smart Selection</option>
                  <option value="none">No Music</option>
                  <option value="ambient">Ambient</option>
                  <option value="upbeat">Upbeat</option>
                  <option value="calm">Calm</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Fade In Duration (s)</label>
                <input
                  type="number"
                  min="0"
                  max="10"
                  step="0.1"
                  value={settings.processing.musicFadeInDuration || 1.0}
                  onChange={(e) => setSettings(prev => ({
                    ...prev,
                    processing: { ...prev.processing, musicFadeInDuration: parseFloat(e.target.value) || 1.0 }
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Fade Out Duration (s)</label>
                <input
                  type="number"
                  min="0"
                  max="10"
                  step="0.1"
                  value={settings.processing.musicFadeOutDuration || 1.0}
                  onChange={(e) => setSettings(prev => ({
                    ...prev,
                    processing: { ...prev.processing, musicFadeOutDuration: parseFloat(e.target.value) || 1.0 }
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Sound Effects Settings */}
          <div className="mb-6">
            <h4 className="text-md font-medium text-gray-700 mb-3">Sound Effects</h4>
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Effect Pack</label>
                  <select
                    value={settings.processing.soundEffectPack || 'basic-pops'}
                    onChange={(e) => setSettings(prev => ({
                      ...prev,
                      processing: { ...prev.processing, soundEffectPack: e.target.value as any }
                    }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="basic-pops">Basic Pops</option>
                    <option value="medical">Medical Sounds</option>
                    <option value="tech">Tech Sounds</option>
                    <option value="none">No Effects</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Effect Timing</label>
                  <select
                    value={settings.processing.soundEffectTiming || 'auto'}
                    onChange={(e) => setSettings(prev => ({
                      ...prev,
                      processing: { ...prev.processing, soundEffectTiming: e.target.value as any }
                    }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="auto">Auto (AI Highlights)</option>
                    <option value="manual">Manual</option>
                    <option value="synced">Synced to Beat</option>
                  </select>
                </div>
              </div>
              
              {/* AI Keyword Sync Settings */}
              <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                <div className="flex items-center gap-3 mb-3">
                  <input
                    type="checkbox"
                    id="keywordSync"
                    checked={settings.processing.soundEffectKeywordSync || true}
                    onChange={(e) => setSettings(prev => ({
                      ...prev,
                      processing: { ...prev.processing, soundEffectKeywordSync: e.target.checked }
                    }))}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <label htmlFor="keywordSync" className="text-sm font-medium text-gray-700">
                    AI Keyword Sync
                  </label>
                </div>
                <p className="text-xs text-blue-600 mb-3">
                  Automatically add sound effects when important keywords are spoken (identified by AI)
                </p>
                <div className="grid grid-cols-1 md:grid-cols-1 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Effect Duration (seconds)</label>
                    <input
                      type="number"
                      min="0.1"
                      max="2.0"
                      step="0.1"
                      value={settings.processing.soundEffectDuration || 0.3}
                      onChange={(e) => setSettings(prev => ({
                        ...prev,
                        processing: { ...prev.processing, soundEffectDuration: parseFloat(e.target.value) || 0.3 }
                      }))}
                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                      disabled={!settings.processing.soundEffectKeywordSync}
                    />
                    <div className="text-xs text-gray-500 mt-1">
                      How long each sound effect plays
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* AI Word Highlighting Settings */}
        <div className="mb-6">
          <h4 className="text-md font-medium text-gray-700 mb-3">AI Word Highlighting</h4>
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={settings.processing.useAiWordHighlighting || true}
                    onChange={(e) => setSettings(prev => ({
                      ...prev,
                      processing: { ...prev.processing, useAiWordHighlighting: e.target.checked }
                    }))}
                    className="rounded border-gray-300 text-yellow-600 focus:ring-yellow-500"
                  />
                  <span className="text-sm font-medium text-gray-700">Enable AI Word Highlighting</span>
                </label>
                <p className="text-xs text-gray-600 mt-1">
                  AI automatically identifies and highlights important words and phrases in subtitles
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Highlight Style</label>
                <select
                  value={settings.processing.highlightStyle || 'yellow'}
                  onChange={(e) => setSettings(prev => ({
                    ...prev,
                    processing: { ...prev.processing, highlightStyle: e.target.value }
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500"
                >
                  <option value="yellow">Yellow Highlight</option>
                  <option value="cyan">Cyan Highlight</option>
                  <option value="lime">Lime Green Highlight</option>
                </select>
              </div>
            </div>
            <div className="mt-3 text-xs text-yellow-800 bg-yellow-100 p-2 rounded">
              <strong>How it works:</strong> AI analyzes your transcript and identifies the most important words and technical terms. These are then highlighted in your chosen color within the subtitles to draw viewer attention to key concepts.
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-6 py-2 text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            Save Settings
          </button>
        </div>
      </div>
    </div>
  );
}; 