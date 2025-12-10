import React from 'react';
import { AlertCircle } from 'lucide-react';

interface VideoFile {
  name: string;
  path: string;
  size: number;
  type?: 'short' | 'regular';
  duration?: number;
  width?: number;
  height?: number;
  aspectRatio?: number;
  scheduledDate?: string;
  scheduledTime?: string;
  conflict?: boolean;
  conflictReason?: string;
}

interface VideoDiscovery {
  totalVideos: number;
  totalSize: number;
  estimatedDuration: number;
  files: VideoFile[];
  shortcuts: any[];
  regularVideos: any[];
  error?: string;
}

interface VideoDiscoveryPanelProps {
  videoDiscovery: VideoDiscovery | null;
  isDiscovering: boolean;
}

function formatFileSize(bytes: number): string {
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  if (bytes === 0) return '0 Bytes';
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
}

function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.round(seconds % 60);
  
  if (hours > 0) {
    return `${hours}h ${minutes}m ${secs}s`;
  } else if (minutes > 0) {
    return `${minutes}m ${secs}s`;
  } else {
    return `${secs}s`;
  }
}

export const VideoDiscoveryPanel: React.FC<VideoDiscoveryPanelProps> = ({
  videoDiscovery,
  isDiscovering
}) => {
  if (!videoDiscovery && !isDiscovering) {
    return null;
  }

  if (isDiscovering) {
    return (
      <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
        <div className="flex items-center gap-2 mb-2">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-yellow-600"></div>
          <span className="font-medium text-yellow-800">Discovering videos...</span>
        </div>
        <p className="text-sm text-yellow-700">Scanning folder for video files...</p>
      </div>
    );
  }

  if (videoDiscovery?.error) {
    return (
      <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
        <div className="flex items-center gap-2 mb-2">
          <AlertCircle className="w-4 h-4 text-red-600" />
          <span className="font-medium text-red-800">Folder Issue</span>
        </div>
        <p className="text-sm text-red-700">{videoDiscovery.error}</p>
        <p className="text-xs text-red-600 mt-1">
          Please check the folder path exists and is accessible.
        </p>
      </div>
    );
  }

  if (videoDiscovery?.totalVideos === 0) {
    return (
      <div className="mt-4 p-4 bg-orange-50 border border-orange-200 rounded-lg">
        <div className="flex items-center gap-2 mb-2">
          <AlertCircle className="w-4 h-4 text-orange-600" />
          <span className="font-medium text-orange-800">No Videos Found</span>
        </div>
        <p className="text-sm text-orange-700">
          No supported video files found in the specified folder.
        </p>
        <p className="text-xs text-orange-600 mt-1">
          Supported formats: MP4, MOV, AVI, MKV, WEBM, M4V, FLV, WMV
        </p>
      </div>
    );
  }

  if (!videoDiscovery || videoDiscovery.totalVideos === 0) {
    return null;
  }

  const files = videoDiscovery.files || [];
  const shortcuts = files.filter(f => f.type === 'short');
  const regularVideos = files.filter(f => f.type === 'regular');
  const totalSizeFormatted = formatFileSize(videoDiscovery.totalSize);
  const estimatedTimeFormatted = formatDuration(videoDiscovery.estimatedDuration);

  return (
    <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
      {/* Summary Stats */}
      <div className="grid grid-cols-4 gap-3 mb-4">
        <div className="text-center">
          <div className="text-2xl font-bold text-green-600">{videoDiscovery.totalVideos}</div>
          <div className="text-xs text-green-700">Total Videos</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-blue-600">{regularVideos.length}</div>
          <div className="text-xs text-blue-700">Regular</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-purple-600">{shortcuts.length}</div>
          <div className="text-xs text-purple-700">Shorts</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-orange-600">{estimatedTimeFormatted}</div>
          <div className="text-xs text-orange-700">Est. Duration</div>
        </div>
      </div>

      {/* Video Type Breakdown */}
      {(shortcuts.length > 0 || regularVideos.length > 0) && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="text-sm text-blue-800">
            <strong>Video Analysis:</strong> {totalSizeFormatted} total size
            {shortcuts.length > 0 && (
              <span className="ml-2">• {shortcuts.length} Short{shortcuts.length > 1 ? 's' : ''} (optimized processing)</span>
            )}
            {regularVideos.length > 0 && (
              <span className="ml-2">• {regularVideos.length} Regular (multi-platform ready)</span>
            )}
          </div>
        </div>
      )}

      {/* Video List */}
      {files.length > 0 && (
      <div className="space-y-2 max-h-40 overflow-y-auto">
        <h5 className="font-medium text-green-800 mb-2">📹 Found Videos:</h5>
          {files.map((video, index) => (
          <div key={index} className="flex items-center justify-between bg-white p-2 rounded border">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <div className="font-medium text-gray-900 truncate text-sm">{video.name}</div>
                  {video.type === 'short' && (
                  <span className="px-1.5 py-0.5 bg-purple-100 text-purple-700 text-xs rounded font-medium">Short</span>
                )}
                  {video.type === 'regular' && (
                    <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 text-xs rounded font-medium">Regular</span>
                )}
              </div>
              <div className="text-xs text-gray-600">
                  {formatFileSize(video.size)}
                {video.width && video.height && (
                  <span className="ml-2">{video.width}×{video.height}</span>
                )}
                {video.duration && (
                  <span className="ml-2">{Math.round(video.duration)}s</span>
                )}
                  {video.scheduledDate && (
                    <span className="ml-2 text-green-600">📅 {video.scheduledDate} at {video.scheduledTime}</span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
      )}

      {/* Processing Estimate */}
      <div className="mt-4 p-3 bg-green-100 border border-green-200 rounded-lg">
        <p className="text-sm text-green-800 font-medium">
          ✅ Ready to process {videoDiscovery.totalVideos} video{videoDiscovery.totalVideos === 1 ? '' : 's'}
        </p>
        <p className="text-xs text-green-700 mt-1">
          Estimated total duration: {estimatedTimeFormatted} ({totalSizeFormatted})
        </p>
      </div>
    </div>
  );
}; 