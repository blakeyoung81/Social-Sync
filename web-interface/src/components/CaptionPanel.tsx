'use client';

import React, { useState, useEffect } from 'react';
import { Subtitles, Palette, Type, Droplets } from 'lucide-react';

interface CaptionPanelProps {
  clips: any[];
  wordSegments: any[];
  onCaptionUpdate: (clipId: string, caption: string) => void;
  onOptionsChange?: (options: any) => void;
}

export const CaptionPanel: React.FC<CaptionPanelProps> = ({ 
  clips, 
  wordSegments, 
  onCaptionUpdate, 
  onOptionsChange 
}) => {
  const [mode, setMode] = useState('all');
  const [style, setStyle] = useState('standard');
  const [font, setFont] = useState('Arial');
  const [color, setColor] = useState('#FFFFFF');
  const [animation, setAnimation] = useState('none');

  useEffect(() => {
    onOptionsChange?.({ mode, style, font, color, animation });
  }, [mode, style, font, color, animation, onOptionsChange]);

  return (
    <div className="p-4 bg-gray-800 text-white h-full">
      <h3 className="text-lg font-bold mb-4 flex items-center">
        <Subtitles size={20} className="mr-2"/>
        Caption Settings
      </h3>
      
      {/* Caption editor for each clip */}
      <div className="space-y-4 mb-6">
        {clips.map((clip, index) => (
          <div key={clip.id} className="bg-gray-700 p-3 rounded-lg">
            <div className="text-sm text-gray-300 mb-2">
              Clip {index + 1} ({clip.start.toFixed(1)}s - {clip.end.toFixed(1)}s)
            </div>
            <textarea
              placeholder="Enter caption for this clip..."
              className="w-full p-2 bg-gray-600 text-white rounded resize-none"
              rows={2}
              onChange={(e) => onCaptionUpdate(clip.id, e.target.value)}
            />
          </div>
        ))}
      </div>

      <div className="space-y-6">
        {/* Caption Mode */}
        <div>
          <label className="text-sm font-semibold text-gray-700 block mb-2">Mode</label>
          <div className="flex bg-gray-200 rounded-lg p-1">
             <button
              onClick={() => setMode('highlight')}
              className={`flex-1 text-sm font-medium py-1.5 rounded-md ${mode === 'highlight' ? 'bg-white shadow' : 'text-gray-600'}`}
            >
              Highlights
            </button>
            <button
              onClick={() => setMode('all')}
              className={`flex-1 text-sm font-medium py-1.5 rounded-md ${mode === 'all' ? 'bg-white shadow' : 'text-gray-600'}`}
            >
              All
            </button>
          </div>
           <p className="text-xs text-gray-500 mt-1">
              'Highlights' captions only the most important parts. 'All' captions everything.
            </p>
        </div>

        {/* Caption Style */}
        <div>
          <label htmlFor="caption-style" className="text-sm font-semibold text-gray-700 block mb-2 flex items-center">
            <Palette size={16} className="mr-2"/>
            Style
          </label>
          <select 
            value={style}
            onChange={(e) => setStyle(e.target.value)}
            className="w-full p-2 border rounded-md"
          >
            <option value="standard">Standard</option>
            <option value="mrbeast">MrBeast Style</option>
          </select>
        </div>

        {/* Text Color */}
        <div>
          <label htmlFor="caption-color" className="text-sm font-semibold text-gray-700 block mb-2 flex items-center">
            <Palette size={16} className="mr-2"/>
            Color
          </label>
          <input 
            type="color" 
            value={color}
            onChange={(e) => setColor(e.target.value)}
            className="w-full p-1 border rounded-md"
          />
        </div>

        {/* Animation */}
        <div>
          <label className="block text-sm font-medium text-gray-700">Animation</label>
          <select 
            value={animation}
            onChange={(e) => setAnimation(e.target.value)}
            className="w-full p-2 border rounded-md"
          >
            <option value="none">None</option>
            <option value="pop">Pop</option>
            <option value="fade">Fade</option>
          </select>
        </div>
      </div>
    </div>
  );
}; 