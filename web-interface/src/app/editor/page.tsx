'use client';

import React from 'react';
import { FileVideo, Play, SkipBack, SkipForward, Layers, Settings2 } from 'lucide-react';

export default function EditorPage() {
  return (
    <div className="space-y-6 h-[calc(100vh-8rem)] flex flex-col">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-100 flex items-center gap-3">
          <FileVideo className="w-6 h-6 text-blue-500" />
          Single Video Editor
        </h1>
        <button className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium transition-colors">
          Export Video
        </button>
      </div>

      <div className="flex-1 grid grid-cols-12 gap-6 min-h-0">
        {/* Preview Area */}
        <div className="col-span-12 lg:col-span-8 bg-gray-900 rounded-xl border border-gray-800 flex items-center justify-center relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/20 pointer-events-none"></div>
          <div className="text-center">
            <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform cursor-pointer">
              <Play className="w-6 h-6 text-blue-400 ml-1" />
            </div>
            <p className="text-gray-500">No video loaded</p>
          </div>
        </div>

        {/* Sidebar / Properties */}
        <div className="col-span-12 lg:col-span-4 bg-gray-900 rounded-xl border border-gray-800 p-4 overflow-y-auto">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-semibold text-gray-300">Properties</h2>
            <Settings2 className="w-4 h-4 text-gray-500" />
          </div>

          <div className="space-y-4">
            <div className="p-3 bg-gray-800/50 rounded-lg border border-gray-700/50">
              <p className="text-xs text-gray-500 mb-1">Resolution</p>
              <p className="text-sm font-medium">1920 x 1080</p>
            </div>
            <div className="p-3 bg-gray-800/50 rounded-lg border border-gray-700/50">
              <p className="text-xs text-gray-500 mb-1">Frame Rate</p>
              <p className="text-sm font-medium">60 FPS</p>
            </div>
          </div>
        </div>
      </div>

      {/* Timeline Placeholder */}
      <div className="h-48 bg-gray-900 rounded-xl border border-gray-800 p-4 flex flex-col">
        <div className="flex items-center gap-4 mb-4 border-b border-gray-800 pb-2">
          <button className="text-gray-400 hover:text-white"><SkipBack className="w-4 h-4" /></button>
          <button className="text-gray-400 hover:text-white"><Play className="w-4 h-4" /></button>
          <button className="text-gray-400 hover:text-white"><SkipForward className="w-4 h-4" /></button>
          <div className="h-4 w-[1px] bg-gray-800"></div>
          <span className="text-xs text-gray-500 font-mono">00:00:00:00</span>
        </div>
        <div className="flex-1 relative">
          <div className="absolute top-0 bottom-0 left-0 w-full flex flex-col gap-2">
            <div className="h-8 bg-blue-500/10 border border-blue-500/30 rounded flex items-center px-4">
              <span className="text-xs text-blue-400 flex items-center gap-2"><Layers className="w-3 h-3" /> Video Track 1</span>
            </div>
            <div className="h-8 bg-purple-500/10 border border-purple-500/30 rounded flex items-center px-4">
              <span className="text-xs text-purple-400 flex items-center gap-2"><Layers className="w-3 h-3" /> Audio Track 1</span>
            </div>
          </div>
          {/* Playhead */}
          <div className="absolute top-0 bottom-0 left-1/4 w-[1px] bg-red-500 z-10">
            <div className="absolute -top-1 -translate-x-1/2 text-red-500">▼</div>
          </div>
        </div>
      </div>
    </div>
  );
}