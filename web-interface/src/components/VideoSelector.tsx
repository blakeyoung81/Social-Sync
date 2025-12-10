'use client';

import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { FolderOpen } from 'lucide-react';

interface Video {
  name: string;
  path: string;
  duration?: string;
  size?: string;
}

interface VideoFile {
  name: string;
  path: string;
  duration: number;
  size: number;
  type: string;
}

interface VideoSelectorProps {
  onVideoSelect: (video: Video) => void;
}

export default function VideoSelector({ onVideoSelect }: VideoSelectorProps) {
  const [availableVideos, setAvailableVideos] = useState<VideoFile[]>([]);
  const [isDiscovering, setIsDiscovering] = useState(false);

  useEffect(() => {
    discoverVideos();
  }, []);

  const discoverVideos = async () => {
    setIsDiscovering(true);
    try {
      const response = await fetch('/api/discover-videos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          inputFolder: '/Users/blakeyoung/Library/Mobile Documents/com~apple~CloudDocs/Movies/',
          analyzeTypes: true,
          processingMode: 'process-only'
        })
      });

      if (response.ok) {
        const result = await response.json();
        if (result.files && result.files.length > 0) {
          setAvailableVideos(result.files);
        }
      }
    } catch (error) {
      console.error('Error discovering videos:', error);
    } finally {
      setIsDiscovering(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleVideoSelect = (video: VideoFile) => {
    // Convert VideoFile to Video format
    const selectedVideo: Video = {
      name: video.name,
      path: video.path,
      duration: formatDuration(video.duration),
      size: formatFileSize(video.size)
    };
    onVideoSelect(selectedVideo);
  };

  return (
    <div className="w-full">
      <div className="bg-slate-800/50 border border-slate-700 rounded-lg shadow-sm mb-6">
        <div className="px-6 py-4 border-b border-slate-700">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              🎬 Available Videos
            </h3>
            <Button 
              variant="outline" 
              size="sm"
              onClick={discoverVideos}
              disabled={isDiscovering}
              className="bg-slate-700 border-slate-600 text-white hover:bg-slate-600"
            >
              <FolderOpen className="w-4 h-4 mr-1" />
              {isDiscovering ? 'Discovering...' : 'Refresh'}
            </Button>
          </div>
        </div>
        <div className="px-6 py-4">
          {isDiscovering ? (
            <div className="flex items-center justify-center h-32">
              <div className="text-center">
                <div className="animate-spin w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full mx-auto mb-4" />
                <p className="text-white">Discovering videos...</p>
              </div>
            </div>
          ) : availableVideos.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-gray-400 mb-4">No videos found</div>
              <Button 
                onClick={discoverVideos}
                className="bg-purple-600 hover:bg-purple-700"
              >
                <FolderOpen className="w-4 h-4 mr-2" />
                Discover Videos
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {availableVideos.map((video, index) => (
                <div
                  key={index}
                  className="cursor-pointer"
                  onClick={() => handleVideoSelect(video)}
                >
                  <div className="bg-slate-700/50 border border-slate-600 hover:bg-slate-700/70 transition-colors rounded-lg shadow-sm">
                    <div className="p-4">
                    <div className="aspect-video bg-slate-800 rounded-lg mb-3 flex items-center justify-center overflow-hidden">
                      <video
                        src={`/api/serve-video?path=${encodeURIComponent(video.path)}`}
                        className="w-full h-full object-cover"
                        muted
                        preload="metadata"
                      />
                    </div>
                    <h3 className="font-medium text-white truncate mb-2">
                      {video.name}
                    </h3>
                    <div className="space-y-1 text-xs text-gray-400">
                      <div className="flex justify-between">
                        <span>Duration:</span>
                        <span>{formatDuration(video.duration)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Size:</span>
                        <span>{formatFileSize(video.size)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Type:</span>
                        <span className="uppercase">{video.type}</span>
                      </div>
                    </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 