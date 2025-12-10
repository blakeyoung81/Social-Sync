import React, { useState, useEffect } from 'react';
import { Youtube, UserPlus, RefreshCw, Trash2, CheckCircle, AlertCircle, Users, Mail, Calendar, Settings } from 'lucide-react';

interface YouTubeChannel {
  id: string;
  title: string;
  thumbnail?: string;
  subscriberCount?: string;
  customUrl?: string;
  authenticated: boolean;
  lastAuthenticated: string;
  accountEmail?: string;
}

interface YouTubeChannelManagerProps {
  selectedChannelId: string;
  onChannelSelect: (channelId: string) => void;
  disabled?: boolean;
}

export default function YouTubeChannelManager({ 
  selectedChannelId, 
  onChannelSelect, 
  disabled 
}: YouTubeChannelManagerProps) {
  const [channels, setChannels] = useState<YouTubeChannel[]>([]);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);
  const [autoRefreshSuccess, setAutoRefreshSuccess] = useState(false);
  const [autoScanning, setAutoScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState<string | null>(null);

  // Load saved channels from localStorage
  useEffect(() => {
    loadSavedChannels();
  }, []);

  // Effect for handling auth detection - runs after initial load is complete
  useEffect(() => {
    if (!initialLoadComplete) return;

    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('youtube_connected') === 'true') {
      console.log('🔄 [FRONTEND DEBUG] Authentication detected AND initial load complete, refreshing channels...');
      
      // Clean up URL immediately to prevent multiple triggers
      window.history.replaceState({}, document.title, window.location.pathname);
      
      // Immediate refresh, then multiple follow-ups to catch the new channel
      const doRefreshSequence = async () => {
        // First refresh immediately with auto-refresh flag
        await refreshChannels(true);
        
        // Then refresh again after 2 seconds to catch the newly authenticated channel
        setTimeout(async () => {
          console.log('🔄 [FRONTEND DEBUG] Follow-up refresh for new auth...');
          await refreshChannels(true);
        }, 2000);
        
        // One more time after 5 seconds to be sure
        setTimeout(async () => {
          console.log('🔄 [FRONTEND DEBUG] Final follow-up refresh for new auth...');
          await refreshChannels(true);
        }, 5000);
      };
      
      doRefreshSequence();
    }
  }, [initialLoadComplete]);
        
  // No auto-refresh bullshit - user can manually refresh if needed

  const loadSavedChannels = () => {
    try {
      console.log('💾 [FRONTEND DEBUG] Loading saved channels from localStorage...');
      const saved = localStorage.getItem('youtube-authenticated-channels');
      console.log('💾 [FRONTEND DEBUG] Raw localStorage data:', saved);
      
      if (saved) {
        const parsedChannels = JSON.parse(saved);
        console.log('💾 [FRONTEND DEBUG] Parsed channels from localStorage:', parsedChannels.map((ch: YouTubeChannel) => ({
          id: ch.id,
          title: ch.title,
          authenticated: ch.authenticated
        })));
        setChannels(parsedChannels);
      } else {
        console.log('💾 [FRONTEND DEBUG] No saved channels found in localStorage');
        setChannels([]);
      }
    } catch (error) {
      console.error('💾 [FRONTEND DEBUG] Error loading saved channels:', error);
      setChannels([]);
    } finally {
      setInitialLoadComplete(true);
      console.log('✅ [FRONTEND DEBUG] Initial load complete.');
    }
  };

  const connectNewAccount = () => {
    window.location.href = '/api/youtube/auth?force_new=true';
  };

  const saveChannelsToStorage = (channelsToSave: YouTubeChannel[]) => {
    try {
      localStorage.setItem('youtube-authenticated-channels', JSON.stringify(channelsToSave));
      console.log('💾 [FRONTEND DEBUG] Saved channels to localStorage:', channelsToSave.map(ch => ch.title));
    } catch (error) {
      console.error('💾 [FRONTEND DEBUG] Error saving channels to localStorage:', error);
    }
  };

  const refreshChannels = async (isAutoRefresh = false) => {
    if (isAutoRefresh) {
      setSyncing(true);
    } else {
    setLoading(true);
    }
    setError(null);
    
    try {
      
      // Get current channels from state as baseline
      let currentChannels = [...channels];
      
      // Also check localStorage for any channels that might not be in state yet
      try {
        const savedChannelsRaw = localStorage.getItem('youtube-authenticated-channels');
        if (savedChannelsRaw) {
          const savedChannels = JSON.parse(savedChannelsRaw);
          // Merge any channels from localStorage that aren't in current state
          savedChannels.forEach((savedCh: YouTubeChannel) => {
            if (!currentChannels.find(currentCh => currentCh.id === savedCh.id)) {
              currentChannels.push(savedCh);
              console.log('💿 [FRONTEND DEBUG] Added channel from localStorage to current list:', savedCh.title);
            }
          });
        }
      } catch (e) {
        console.error('💥 [FRONTEND DEBUG] Error reading localStorage in refreshChannels:', e);
      }
      
      // Use the refresh endpoint to force fresh data
      const response = await fetch('/api/youtube-channels/refresh', {
        method: 'POST'
      });
      
      if (response.status === 401) {
        connectNewAccount();
        return;
      }
      
      if (response.status === 429) {
        const errorData = await response.json();
        setError(errorData.error || 'YouTube quota exceeded. Please try again later.');
        return;
      }
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to refresh channels');
      }
      
      const newApiChannels = data.channels || [];
      const accountInfo = data.account || { email: 'unknown@gmail.com', name: 'YouTube User' };
      
      const formattedNewApiChannels = newApiChannels.map((channel: any) => ({
          id: channel.id,
          title: channel.title,
          thumbnail: channel.thumbnailUrl,
          subscriberCount: channel.subscriberCount,
          customUrl: channel.customUrl,
        authenticated: true,
        lastAuthenticated: new Date().toISOString(),
        accountEmail: accountInfo.email
      }));
      
      console.log('🎯 [FRONTEND DEBUG] Formatted new API channels:', formattedNewApiChannels.map((ch: YouTubeChannel) => ({ id: ch.id, title: ch.title })));
      
      // Merge logic: start with existing channels, then add/update with new API channels
      let finalMergedChannels = [...currentChannels];
      formattedNewApiChannels.forEach((newApiChannel: YouTubeChannel) => {
        const existingIndex = finalMergedChannels.findIndex(existing => existing.id === newApiChannel.id);
        if (existingIndex >= 0) {
          console.log(`🔄 [FRONTEND DEBUG] Updating existing channel in final list: ${newApiChannel.title}`);
          finalMergedChannels[existingIndex] = newApiChannel;
      } else {
          console.log(`➕ [FRONTEND DEBUG] Adding new API channel to final list: ${newApiChannel.title}`);
          finalMergedChannels.push(newApiChannel);
        }
      });
      
      console.log('📊 [FRONTEND DEBUG] Final merged channels for state update:', finalMergedChannels.map(ch => ({ id: ch.id, title: ch.title })));
      
      // Update state and localStorage simultaneously
      setChannels(finalMergedChannels);
      saveChannelsToStorage(finalMergedChannels);

      // Authentication is automatically shared with Python script
      if (!isAutoRefresh && finalMergedChannels.length > 0) {
        console.log('✅ [FRONTEND DEBUG] Authentication ready for Python script (shared token file)');
      }

      // Auto-selection logic
      let currentSelectedChannelId = selectedChannelId;
      if (!currentSelectedChannelId && finalMergedChannels.length > 0) {
        currentSelectedChannelId = finalMergedChannels[0].id;
      } else if (currentSelectedChannelId && !finalMergedChannels.find(ch => ch.id === currentSelectedChannelId) && finalMergedChannels.length > 0) {
        currentSelectedChannelId = finalMergedChannels[0].id;
      } else if (finalMergedChannels.length === 0) {
        currentSelectedChannelId = '';
      }

      if (currentSelectedChannelId !== selectedChannelId) {
        onChannelSelect(currentSelectedChannelId);
        if (currentSelectedChannelId) {
          localStorage.setItem('youtube-selected-channel-id', currentSelectedChannelId);
        } else {
          localStorage.removeItem('youtube-selected-channel-id');
        }
      }
      
      console.log(`🎉 [FRONTEND DEBUG] Successfully processed ${newApiChannels.length} channels from API`);
      
      // If this was an auto-refresh, show success notification and check for auto-scan
      if (isAutoRefresh && newApiChannels.length > 0) {
        setAutoRefreshSuccess(true);
        // Hide the notification after 4 seconds
        setTimeout(() => setAutoRefreshSuccess(false), 4000);
        
        // Check if auto-scanning is in progress
        checkAutoScanStatus();
      }
      
    } catch (error) {
      console.error('❌ [FRONTEND DEBUG] Error refreshing channels:', error);
      if (!isAutoRefresh) {
      setError('Failed to refresh YouTube channels. Please try again.');
      }
    } finally {
      setLoading(false);
      setSyncing(false);
    }
  };

  const removeChannel = (channelId: string) => {
    const channelToRemove = channels.find(ch => ch.id === channelId);
    if (!channelToRemove) return;
    
    if (confirm(`Are you sure you want to remove "${channelToRemove.title}"?`)) {
      const updatedChannels = channels.filter(ch => ch.id !== channelId);
      setChannels(updatedChannels);
      saveChannelsToStorage(updatedChannels);
      
      // If we removed the selected channel, select another one
      if (selectedChannelId === channelId && updatedChannels.length > 0) {
        onChannelSelect(updatedChannels[0].id);
        localStorage.setItem('youtube-selected-channel-id', updatedChannels[0].id);
      }
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Check auto-scan status after authentication
  const checkAutoScanStatus = async () => {
    try {
      setAutoScanning(true);
      setScanProgress("Scanning your channel data for smart scheduling...");
      
      // Poll for scan completion (it might already be done)
      let attempts = 0;
      const maxAttempts = 30; // 30 seconds max
      
      while (attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
        
        // Check if scan data exists
        const response = await fetch('/api/youtube-channels/scan', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            includeVideos: false, // Just check cache
            includePlaylists: false,
            forceRefresh: false
          })
        });
        
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.cached) {
            setScanProgress("✅ Channel data ready for smart scheduling!");
            setTimeout(() => {
              setAutoScanning(false);
              setScanProgress(null);
            }, 2000);
            break;
          }
        }
        
        attempts++;
        setScanProgress(`Scanning channel data... (${attempts}/${maxAttempts}s)`);
      }
      
      if (attempts >= maxAttempts) {
        setScanProgress("⚠️ Scan taking longer than expected");
        setTimeout(() => {
          setAutoScanning(false);
          setScanProgress(null);
        }, 3000);
      }
      
    } catch (error) {
      console.error('Error checking auto-scan status:', error);
      setAutoScanning(false);
      setScanProgress(null);
    }
  };

  const selectedChannel = channels.find(c => c.id === selectedChannelId);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <h3 className="font-semibold text-red-900 mb-2 flex items-center gap-2">
          <Youtube className="text-red-600" size={20} />
          YouTube Channel Management
        </h3>
        <p className="text-sm text-red-800">
          Connect multiple YouTube accounts and select which channel to use for uploading. 
          All authenticated accounts are remembered so you don't need to re-authenticate each time.
        </p>
      </div>

      {/* Auto-Refresh Success Notification */}
      {autoRefreshSuccess && (
        <div className="bg-green-100 border border-green-300 rounded-lg p-4">
          <div className="flex items-center gap-2 text-green-800">
            <CheckCircle size={16} />
            <span className="font-medium">Authentication Successful!</span>
          </div>
          <p className="text-sm text-green-700 mt-1">Your YouTube channel was automatically detected and connected.</p>
        </div>
      )}

      {/* Auto-Scanning Progress Notification */}
      {autoScanning && scanProgress && (
        <div className="bg-blue-100 border border-blue-300 rounded-lg p-4">
          <div className="flex items-center gap-2 text-blue-800">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
            <span className="font-medium">Setting Up Smart Scheduling</span>
          </div>
          <p className="text-sm text-blue-700 mt-1">
            {scanProgress}
          </p>
          <p className="text-xs text-blue-600 mt-2">
            💡 This ensures optimal upload timing and prevents scheduling conflicts
          </p>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="bg-red-100 border border-red-300 rounded-lg p-4">
          <div className="flex items-center gap-2 text-red-800">
            <AlertCircle size={16} />
            <span className="font-medium">Error</span>
          </div>
          <p className="text-sm text-red-700 mt-1">{error}</p>
        </div>
      )}

      {/* Current Selection Summary */}
      {selectedChannel && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <h4 className="font-medium text-green-900 mb-2 flex items-center gap-2">
            <CheckCircle className="text-green-600" size={16} />
            Active Upload Channel
            {syncing && (
              <div className="flex items-center gap-1 text-blue-600">
                <RefreshCw size={14} className="animate-spin" />
                <span className="text-xs">Syncing...</span>
              </div>
            )}
          </h4>
          <div className="flex items-center gap-3">
            {selectedChannel.thumbnail && (
              <img 
                src={selectedChannel.thumbnail} 
                alt={selectedChannel.title}
                className="w-10 h-10 rounded-full"
              />
            )}
            <div>
              <p className="font-medium text-green-900">{selectedChannel.title}</p>
              <p className="text-sm text-green-700">Account: {selectedChannel.accountEmail}</p>
              {selectedChannel.subscriberCount && (
                <p className="text-xs text-green-600">{parseInt(selectedChannel.subscriberCount).toLocaleString()} subscribers</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Account Management Actions */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => refreshChannels(false)}
          disabled={loading || syncing || disabled}
          className="flex items-center gap-2 px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors disabled:opacity-50"
        >
          {(loading || syncing) ? <RefreshCw size={16} className="animate-spin" /> : <RefreshCw size={16} />}
          {loading ? 'Refreshing...' : syncing ? 'Auto-syncing...' : 'Refresh Channels'}
        </button>
        

        
        <button
          onClick={connectNewAccount}
          disabled={disabled}
          className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
        >
          <UserPlus size={16} />
          Add Different Account
        </button>
      </div>

      {/* Channels List */}
      {channels.length > 0 ? (
        <div className="space-y-4">
          <h4 className="font-medium text-gray-900 flex items-center gap-2">
            <Users size={16} />
            Connected Channels ({channels.length})
          </h4>
          
          {channels.map(channel => (
            <div key={channel.id} className="border border-gray-200 rounded-lg bg-white">
              {/* Channel Header */}
              <div className="p-4">
                    <label 
                      className={`flex items-center gap-3 p-3 border-2 rounded-lg cursor-pointer transition-all ${
                        selectedChannelId === channel.id 
                          ? 'border-red-500 bg-red-50' 
                          : 'border-gray-200 hover:border-red-300 hover:bg-red-25'
                      }`}
                    >
                      <input
                        type="radio"
                        name="youtube-channel"
                        value={channel.id}
                        checked={selectedChannelId === channel.id}
                    onChange={() => {
                      onChannelSelect(channel.id);
                      localStorage.setItem('youtube-selected-channel-id', channel.id);
                    }}
                        className="w-4 h-4 text-red-600"
                        disabled={disabled || loading}
                      />
                      
                      <div className="flex items-center gap-3 flex-1">
                    {channel.thumbnail && (
                          <img 
                            src={channel.thumbnail} 
                            alt={channel.title}
                        className="w-12 h-12 rounded-full"
                          />
                        )}
                        
                        <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-gray-900">{channel.title}</span>
                            {selectedChannelId === channel.id && (
                              <CheckCircle size={16} className="text-red-600" />
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-sm text-gray-600 mt-1">
                            <Mail size={14} />
                            {channel.accountEmail}
                          </div>
                          <div className="flex items-center gap-4 text-xs text-gray-500 mt-1">
                            {channel.subscriberCount && (
                              <span>{parseInt(channel.subscriberCount).toLocaleString()} subscribers</span>
                            )}
                            {channel.customUrl && (
                              <span>@{channel.customUrl}</span>
                            )}
                            <span>ID: {channel.id.slice(0, 8)}...</span>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-gray-500">
                            <Calendar size={12} />
                            Last connected: {formatDate(channel.lastAuthenticated)}
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs">
                            ✅ Connected
                          </span>
                          <button
                            onClick={() => removeChannel(channel.id)}
                            className="text-red-600 hover:text-red-800 p-1"
                            title="Remove this channel"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                          </div>
                        </div>
                      </div>
                    </label>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 bg-gray-50 border border-gray-200 rounded-lg">
          <Youtube size={48} className="text-gray-400 mx-auto mb-4" />
          <h4 className="text-lg font-medium text-gray-900 mb-2">No YouTube Channels Connected</h4>
          <p className="text-gray-600 mb-6">
            Connect your first YouTube channel to start managing your uploads.
          </p>
          <button
            onClick={connectNewAccount}
            disabled={disabled}
            className="flex items-center gap-2 px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 mx-auto"
          >
            <UserPlus size={16} />
            Connect Your YouTube Channel
          </button>
        </div>
      )}

      {/* Help Text */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-medium text-blue-900 mb-2">💡 How This Works</h4>
        <div className="text-sm text-blue-800 space-y-1">
          <p>• <strong>Multiple Channels:</strong> Each account can have multiple YouTube channels</p>
          <p>• <strong>Persistent Storage:</strong> All connections are saved locally and remembered</p>
          <p>• <strong>Easy Switching:</strong> Select any channel from any account as your upload destination</p>
          <p>• <strong>Account Switching:</strong> Use "Add Different Account" to sign in with a different Google account</p>
          <p>• <strong>Python Integration:</strong> Authentication is automatically shared with the Python script</p>
        </div>
      </div>
    </div>
  );
} 