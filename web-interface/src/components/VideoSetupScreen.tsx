'use client';

import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Switch } from '@/components/ui/switch';

interface VideoSetupScreenProps {
  selectedVideo: {
    name: string;
    path: string;
    duration?: string;
    size?: string;
  };
  onProcessAndEdit: (options: ProcessingOptions) => void;
  onBack: () => void;
}

interface ProcessingOptions {
  cutSilences: boolean;
  cutBadTakes: boolean;
  removeFiller: boolean;
  addSmartCaptions: boolean;
  likeSubscribeButton: boolean;
  jumpCutZoom: boolean;
  enhanceAudio: boolean;
  aiBackground: boolean;
}

export default function VideoSetupScreen({ selectedVideo, onProcessAndEdit, onBack }: VideoSetupScreenProps) {
  const [options, setOptions] = useState<ProcessingOptions>({
    cutSilences: true,
    cutBadTakes: true,
    removeFiller: true,
    addSmartCaptions: true,
    likeSubscribeButton: false,
    jumpCutZoom: false,
    enhanceAudio: true,
    aiBackground: false,
  });

  const [isProcessing, setIsProcessing] = useState(false);
  const [isLoadingSettings, setIsLoadingSettings] = useState(true);

  useEffect(() => {
    loadSavedSettings();
  }, []);

  const loadSavedSettings = async () => {
    try {
      const response = await fetch('/api/save-processing-settings');
      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setOptions(result.settings);
        }
      }
    } catch (error) {
      console.error('Failed to load saved settings:', error);
    } finally {
      setIsLoadingSettings(false);
    }
  };

  const saveSettings = async (newOptions: ProcessingOptions) => {
    try {
      await fetch('/api/save-processing-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newOptions)
      });
    } catch (error) {
      console.error('Failed to save settings:', error);
    }
  };

  const toggleOption = (key: keyof ProcessingOptions) => {
    const newOptions = {
      ...options,
      [key]: !options[key]
    };
    setOptions(newOptions);
    saveSettings(newOptions);
  };

  const handleEnhanceAndEdit = async () => {
    setIsProcessing(true);
    try {
      await onProcessAndEdit(options);
    } catch (error) {
      console.error('Processing failed:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const processingFeatures = [
    { key: 'cutSilences', label: 'Cut silences', icon: '🔇', enabled: options.cutSilences },
    { key: 'cutBadTakes', label: 'Cut bad takes', icon: '✂️', enabled: options.cutBadTakes },
    { key: 'removeFiller', label: 'Remove filler words', icon: '🗣️', enabled: options.removeFiller },
    { key: 'addSmartCaptions', label: 'Add smart captions', icon: '💬', enabled: options.addSmartCaptions },
    { key: 'likeSubscribeButton', label: 'Like & Subscribe button', icon: '👍', enabled: options.likeSubscribeButton },
    { key: 'jumpCutZoom', label: 'Jump cut zoom', icon: '🔍', enabled: options.jumpCutZoom },
    { key: 'enhanceAudio', label: 'Enhance audio', icon: '🎵', enabled: options.enhanceAudio },
    { key: 'aiBackground', label: 'AI background', icon: '🎨', enabled: options.aiBackground },
  ];

  if (isLoadingSettings) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-purple-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white font-semibold text-lg drop-shadow-lg">Loading your preferences...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4 flex items-center justify-center">
      <div className="max-w-2xl w-full">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-2">
            <span className="text-3xl">✨</span>
            <h1 className="text-3xl font-bold text-white drop-shadow-lg">Enhance your video</h1>
          </div>
          <p className="text-gray-100 font-medium text-lg">No worries you can adjust your choices later</p>
          <p className="text-gray-200 mt-2 font-medium">Settings are automatically saved for future videos</p>
        </div>

        <Card className="mb-6 bg-white/95 border-gray-200 shadow-lg">
          <CardHeader>
            <CardTitle className="text-gray-900 flex items-center gap-3">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-film text-purple-600"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M7 3v18"/><path d="M3 7.5h4"/><path d="M3 12h18"/><path d="M3 16.5h4"/><path d="M17 3v18"/><path d="M17 7.5h4"/><path d="M17 16.5h4"/></svg>
              Selected Video
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-semibold text-gray-900">{selectedVideo.name}</p>
            <div className="text-sm text-gray-600 flex items-center gap-4 mt-1 font-medium">
              {selectedVideo.duration && <span>Duration: {selectedVideo.duration}</span>}
              {selectedVideo.size && <span>Size: {selectedVideo.size}</span>}
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          {processingFeatures.map((feature) => (
            <div
              key={feature.key}
              className="bg-white/95 border border-gray-200 rounded-lg p-4 flex items-center justify-between shadow-lg hover:shadow-xl transition-shadow"
            >
              <label htmlFor={feature.key} className="flex items-center gap-3 cursor-pointer">
                <span className="text-2xl">{feature.icon}</span>
                <span className="text-gray-900 font-semibold text-base">{feature.label}</span>
              </label>
              <Switch
                id={feature.key}
                checked={feature.enabled}
                onCheckedChange={() => toggleOption(feature.key as keyof ProcessingOptions)}
              />
            </div>
          ))}
        </div>

        <div className="flex justify-between items-center">
          <Button
            variant="outline"
            onClick={onBack}
            disabled={isProcessing}
            className="bg-white border-gray-300 text-gray-900 hover:bg-gray-50 px-6 py-2 font-semibold shadow-md"
          >
            Back
          </Button>
          <Button
            onClick={handleEnhanceAndEdit}
            disabled={isProcessing}
            className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white px-8 py-3 text-lg font-bold"
          >
            {isProcessing ? (
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Processing...</span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span>✨</span>
                <span>Enhance and edit</span>
              </div>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
} 