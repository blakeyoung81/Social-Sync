'use client';

import React from 'react';
import { Youtube, Facebook, Twitter, Linkedin, Instagram, Hash, MessageCircle } from 'lucide-react';

interface Platform {
  id: string;
  name: string;
  icon: React.ReactNode;
  color: string;
  enabled: boolean;
}

interface PlatformSelectorProps {
  selectedPlatforms: string[];
  onPlatformToggle: (platformId: string) => void;
  disabled?: boolean;
}

const AVAILABLE_PLATFORMS: Platform[] = [
  {
    id: 'youtube',
    name: 'YouTube',
    icon: <Youtube className="w-5 h-5" />,
    color: 'text-red-500',
    enabled: true
  },
  {
    id: 'facebook',
    name: 'Facebook',
    icon: <Facebook className="w-5 h-5" />,
    color: 'text-blue-600',
    enabled: true
  },
  {
    id: 'twitter',
    name: 'X (Twitter)',
    icon: <Twitter className="w-5 h-5" />,
    color: 'text-gray-900',
    enabled: true
  },
  {
    id: 'linkedin',
    name: 'LinkedIn',
    icon: <Linkedin className="w-5 h-5" />,
    color: 'text-blue-700',
    enabled: true
  },
  {
    id: 'instagram',
    name: 'Instagram',
    icon: <Instagram className="w-5 h-5" />,
    color: 'text-pink-600',
    enabled: true
  },
  {
    id: 'tiktok',
    name: 'TikTok',
    icon: <Hash className="w-5 h-5" />,
    color: 'text-black',
    enabled: true
  },
  {
    id: 'telegram',
    name: 'Telegram',
    icon: <MessageCircle className="w-5 h-5" />,
    color: 'text-blue-500',
    enabled: true
  }
];

export default function PlatformSelector({ selectedPlatforms, onPlatformToggle, disabled = false }: PlatformSelectorProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center space-x-2">
        <h3 className="text-sm font-medium text-gray-700">Select Platforms</h3>
        <span className="text-xs text-gray-500">
          ({selectedPlatforms.length} selected)
        </span>
      </div>
      
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {AVAILABLE_PLATFORMS.map((platform) => {
          const isSelected = selectedPlatforms.includes(platform.id);
          
          return (
            <button
              key={platform.id}
              type="button"
              onClick={() => onPlatformToggle(platform.id)}
              disabled={disabled || !platform.enabled}
              className={`
                relative flex items-center space-x-2 p-3 rounded-lg border-2 transition-all duration-200
                ${isSelected 
                  ? 'border-blue-500 bg-blue-50 shadow-md' 
                  : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
                }
                ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                ${!platform.enabled ? 'opacity-40 cursor-not-allowed' : ''}
              `}
            >
              <div className={`${platform.color} ${isSelected ? 'opacity-100' : 'opacity-70'}`}>
                {platform.icon}
              </div>
              <span className={`text-sm font-medium ${isSelected ? 'text-blue-900' : 'text-gray-700'}`}>
                {platform.name}
              </span>
              
              {isSelected && (
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
                  <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
              )}
            </button>
          );
        })}
      </div>
      
      {selectedPlatforms.length === 0 && (
        <p className="text-sm text-amber-600 bg-amber-50 p-2 rounded-md">
          ⚠️ No platforms selected. Videos will only be processed but not posted.
        </p>
      )}
      
      <div className="text-xs text-gray-500 space-y-1">
        <p>• YouTube posting uses your existing API configuration</p>
        <p>• Other platforms use Ayrshare API for unified posting</p>
      </div>
    </div>
  );
} 