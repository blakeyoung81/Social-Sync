import React, { useState, useEffect } from 'react';
import { Scan, RefreshCw, Database, Video, List, Calendar, AlertCircle, CheckCircle2, Clock, Zap, Info } from 'lucide-react';

interface ScanResults {
  channelId: string;
  channelTitle: string;
  videos: number;
  scheduledVideos: number;
  playlists: number;
  totalVideos: number;
  quotaUsed: number;
  duration: number;
  scanTimestamp: number;
  cached?: boolean;
  cacheAge?: number;
}

interface ChannelDataScannerProps {
  selectedChannelId?: string;
  onScanComplete?: (results: ScanResults) => void;
  disabled?: boolean;
}

export default function ChannelDataScanner({ 
  selectedChannelId, 
  onScanComplete, 
  disabled 
}: ChannelDataScannerProps) {
  const [scanning, setScanning] = useState(false);
  const [results, setResults] = useState<ScanResults | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [scanOptions, setScanOptions] = useState({
    includeVideos: true,
    includePlaylists: true,
    maxVideos: 500
  });



  // Load cached results on mount
  useEffect(() => {
    loadCachedResults();
  }, [selectedChannelId]);

  const loadCachedResults = async () => {
    if (!selectedChannelId) return;
    
    try {
      // Try to get cached data first  
      const response = await fetch('/api/youtube-channels/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          includeVideos: true,
          includePlaylists: true,
          forceRefresh: false
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.cached) {
          const scanResults: ScanResults = {
            channelId: data.data.channelId,
            channelTitle: data.data.channelTitle,
            videos: data.data.videos.length,
            scheduledVideos: data.data.scheduledDates.length,
            playlists: data.data.playlists.length,
            totalVideos: data.data.totalVideos,
            quotaUsed: data.data.quotaUsed,
            duration: data.data.scanDuration,
            scanTimestamp: data.data.scanTimestamp,
            cached: true,
            cacheAge: data.cacheAge
          };
          setResults(scanResults);
          onScanComplete?.(scanResults);
        }
      }
    } catch (error) {
      console.log('No cached data available');
    }
  };

  const startScan = async () => {
    setScanning(true);
    setError(null);
    
    try {
      const response = await fetch('/api/youtube-channels/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          includeVideos: scanOptions.includeVideos,
          includePlaylists: scanOptions.includePlaylists,
          maxVideos: scanOptions.includeVideos ? 10000 : scanOptions.maxVideos, // If scanning videos, scan ALL for complete data
          forceRefresh: true
        })
      });
      
      if (response.status === 401) {
        setError('YouTube authentication required. Please connect your YouTube account first.');
        return;
      }
      
      if (response.status === 429) {
        const errorData = await response.json();
        setError(`YouTube quota exceeded: ${errorData.error}`);
        return;
      }
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Scan failed');
      }
      
      const scanResults: ScanResults = {
        channelId: data.data.channelId,
        channelTitle: data.data.channelTitle,
        videos: data.data.videos.length,
        scheduledVideos: data.data.scheduledDates.length,
        playlists: data.data.playlists.length,
        totalVideos: data.data.totalVideos,
        quotaUsed: data.data.quotaUsed,
        duration: data.data.scanDuration,
        scanTimestamp: data.data.scanTimestamp,
        cached: data.cached,
        cacheAge: data.cacheAge
      };
      
      setResults(scanResults);
      onScanComplete?.(scanResults);
      
      console.log(`✅ Channel scan completed:`, scanResults);
      
    } catch (error) {
      console.error('Channel scan error:', error);
      setError(`Scan failed: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setScanning(false);
    }
  };

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getCacheStatus = () => {
    if (!results) return null;
    
    const cacheAge = results.cacheAge || 0;
    const isStale = cacheAge > 24;
    
    return {
      age: cacheAge,
      isStale,
      color: isStale ? 'orange' : cacheAge > 12 ? 'yellow' : 'green',
      message: isStale 
        ? `Data is ${cacheAge} hours old - consider refreshing`
        : cacheAge > 12 
          ? `Data is ${cacheAge} hours old - still fresh`
          : `Data is ${cacheAge} hours old - very fresh`
    };
  };

  const cacheStatus = getCacheStatus();

  return (
    <div className="space-y-6">
      {/* Critical Infrastructure Header */}
      <div className="bg-red-50 border border-red-300 rounded-lg p-4">
        <h3 className="font-semibold text-red-900 mb-2 flex items-center gap-2">
          <Database className="text-red-600" size={20} />
          ⚠️ CRITICAL: Channel Data Scanner
        </h3>
        <div className="space-y-2">
          <p className="text-sm text-red-800 font-medium">
            🚨 REQUIRED BEFORE ANY UPLOADS: This scanner builds the essential cache data that the entire Python backend depends on.
          </p>
          <div className="text-sm text-red-700 space-y-1">
            <p>• <strong>Smart scheduling:</strong> Cannot work without channel cache</p>
            <p>• <strong>Conflict detection:</strong> Requires existing video data</p>
            <p>• <strong>Analytics:</strong> Needs upload history for optimization</p>
            <p>• <strong>Batch uploads:</strong> Critical for multi-video scheduling</p>
          </div>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-100 border border-red-300 rounded-lg p-4">
          <div className="flex items-center gap-2 text-red-800">
            <AlertCircle size={16} />
            <span className="font-medium">Scan Error</span>
          </div>
          <p className="text-sm text-red-700 mt-1">{error}</p>
        </div>
      )}

      {/* Current Results */}
      {results && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-medium text-green-900 flex items-center gap-2">
              <CheckCircle2 className="text-green-600" size={16} />
              Channel Data Available
              {results.cached && cacheStatus && (
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  cacheStatus.color === 'green' ? 'bg-green-100 text-green-700' :
                  cacheStatus.color === 'yellow' ? 'bg-yellow-100 text-yellow-700' :
                  'bg-orange-100 text-orange-700'
                }`}>
                  {cacheStatus.age}h old
                </span>
              )}
            </h4>
            <span className="text-sm text-green-700">
              {formatTimestamp(results.scanTimestamp)}
            </span>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3">
            <div className="text-center">
              <Video className="text-blue-600 mx-auto mb-1" size={20} />
              <div className="font-bold text-blue-900">{results.videos}</div>
              <div className="text-xs text-blue-700">Videos Scanned</div>
            </div>
            
            <div className="text-center">
              <Calendar className="text-purple-600 mx-auto mb-1" size={20} />
              <div className="font-bold text-purple-900">{results.scheduledVideos}</div>
              <div className="text-xs text-purple-700">Scheduled</div>
            </div>
            
            <div className="text-center">
              <List className="text-green-600 mx-auto mb-1" size={20} />
              <div className="font-bold text-green-900">{results.playlists}</div>
              <div className="text-xs text-green-700">Playlists</div>
            </div>
            
            <div className="text-center">
              <Zap className="text-orange-600 mx-auto mb-1" size={20} />
              <div className="font-bold text-orange-900">{results.quotaUsed}</div>
              <div className="text-xs text-orange-700">Quota Used</div>
            </div>
          </div>
          
          <div className="text-sm text-green-700">
            <p>📁 <strong>Channel:</strong> {results.channelTitle}</p>
            <p>⏱️ <strong>Scan Duration:</strong> {results.duration}s</p>
            {cacheStatus && (
              <p>🕒 <strong>Cache Status:</strong> {cacheStatus.message}</p>
            )}
          </div>
        </div>
      )}

      {/* What to Scan */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <h4 className="font-medium text-gray-900 mb-3">What to Scan</h4>
        
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="includeVideos"
              checked={scanOptions.includeVideos}
              onChange={(e) => setScanOptions(prev => ({ ...prev, includeVideos: e.target.checked }))}
              className="w-4 h-4 text-indigo-600"
              disabled={disabled || scanning}
            />
            <label htmlFor="includeVideos" className="text-sm font-medium text-gray-700">
              📹 Scan Videos & Scheduling Data
            </label>
            <span className="text-xs text-gray-500">(Required for smart scheduling)</span>
          </div>
          
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="includePlaylists"
              checked={scanOptions.includePlaylists}
              onChange={(e) => setScanOptions(prev => ({ ...prev, includePlaylists: e.target.checked }))}
              className="w-4 h-4 text-indigo-600"
              disabled={disabled || scanning}
            />
            <label htmlFor="includePlaylists" className="text-sm font-medium text-gray-700">
              📝 Scan Playlists
            </label>
            <span className="text-xs text-gray-500">(For auto-adding videos to playlists)</span>
          </div>
          
          {scanOptions.includeVideos && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <div className="flex items-center gap-2 text-yellow-800 font-medium mb-1">
                <AlertCircle size={16} />
                📊 Complete Video Scan
              </div>
              <div className="text-sm text-yellow-700 space-y-1">
                <p>• Will scan ALL videos on your channel for complete scheduling data</p>
                <p>• Uses significant quota (~1 unit per video) but ensures zero conflicts</p>
                <p>• Best used when quota resets or for initial setup</p>
                <p>• Subsequent uploads will automatically update the cache</p>
              </div>
          </div>
          )}
        </div>
      </div>

      {/* Scan Button */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => startScan()}
          disabled={scanning || disabled || !selectedChannelId}
          className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 font-medium"
        >
          {scanning ? <RefreshCw size={20} className="animate-spin" /> : <Scan size={20} />}
          {scanning ? 'Scanning Channel...' : 'Scan Channel'}
        </button>
        
        {!selectedChannelId && (
          <span className="text-sm text-gray-500">
            Please select a YouTube channel first
          </span>
        )}
      </div>

      {/* Processing Integration */}
      {results && (
        <div className={`border rounded-lg p-4 ${
          results.videos < results.totalVideos 
            ? 'bg-yellow-50 border-yellow-200' 
            : 'bg-green-50 border-green-200'
        }`}>
          <h4 className="font-medium mb-2 flex items-center gap-2">
            <Zap size={16} />
            {results.videos < results.totalVideos 
              ? '⚠️ Partial Channel Data (Incomplete)' 
              : '🚀 Complete Channel Data'}
          </h4>
          <div className={`text-sm space-y-1 ${
            results.videos < results.totalVideos 
              ? 'text-yellow-800' 
              : 'text-green-800'
          }`}>
            {results.videos < results.totalVideos ? (
              <>
                <p>⚠️ <strong>WARNING:</strong> Only {results.videos} of {results.totalVideos} total videos scanned</p>
                <p>⚠️ <strong>Risk:</strong> Smart scheduling may create conflicts with unscanned videos</p>
                <p>✅ <strong>Solution:</strong> Enable "Complete Channel Scan Mode" when quota resets for 100% accuracy</p>
                <p>📊 <strong>Current data:</strong> {results.scheduledVideos} scheduled dates found</p>
              </>
            ) : (
              <>
                <p>✅ <strong>Complete data available</strong> - all {results.videos} videos scanned</p>
                <p>📊 <strong>Accurate scheduling:</strong> {results.scheduledVideos} scheduled dates, {results.playlists} playlists</p>
                <p>⚡ <strong>Zero quota usage</strong> for scheduling operations</p>
              </>
            )}
            <p>🕒 <strong>Valid until:</strong> {new Date(results.scanTimestamp + (48 * 60 * 60 * 1000)).toLocaleDateString()}</p>
          </div>
        </div>
      )}

      {/* How It Works */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-medium text-blue-900 mb-2 flex items-center gap-2">
          <Info size={16} />
          💡 How This Works
        </h4>
        <div className="text-sm text-blue-800 space-y-1">
          <p>• <strong>Scan Once:</strong> Cache all your channel data for strategic scheduling</p>
          <p>• <strong>Smart Scheduling:</strong> System uses cache to find perfect gaps in your schedule</p>
          <p>• <strong>Auto-Updates:</strong> Each successful upload automatically updates the cache</p>
          <p>• <strong>Video Scanning:</strong> When enabled, scans ALL videos for 100% scheduling accuracy</p>
          <p>• <strong>Playlist Scanning:</strong> When enabled, scans all playlists for auto-assignment</p>
        </div>
      </div>
    </div>
  );
} 