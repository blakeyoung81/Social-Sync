'use client';

import React, { useState, useEffect } from 'react';
import { Music, Search, Download, Trash2, Play, Pause, ExternalLink, Plus, RefreshCw } from 'lucide-react';

interface MusicFile {
  filename: string;
  path: string;
  size: number;
  created: number;
  display_name: string;
  duration: number;
}

interface PixabayResult {
  id: number;
  title: string;
  tags: string;
  duration: number;
  user: string;
  views: number;
  downloads: number;
  preview_url: string;
  download_url: string;
}

export default function MusicLibrary() {
  const [musicFiles, setMusicFiles] = useState<MusicFile[]>([]);
  const [searchResults, setSearchResults] = useState<PixabayResult[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState<number | null>(null);
  const [playingFile, setPlayingFile] = useState<string | null>(null);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);

  useEffect(() => {
    loadMusicLibrary();
    return () => {
      if (audioElement) {
        audioElement.pause();
        audioElement.src = '';
      }
    };
  }, [audioElement]);

  const loadMusicLibrary = async () => {
    try {
      const response = await fetch('/api/music-library');
      const data = await response.json();
      
      if (data.success) {
        setMusicFiles(data.files || []);
      } else {
        console.error('Failed to load music library:', data.error);
        setMusicFiles([]);
      }
    } catch (error) {
      console.error('Error loading music library:', error);
      setMusicFiles([]);
    }
  };

  const searchPixabay = async () => {
    if (!searchQuery.trim()) return;
    
    setLoading(true);
    try {
      const response = await fetch(`/api/pixabay-search?q=${encodeURIComponent(searchQuery)}&max_results=20`);
      const data = await response.json();
      
      if (data.success) {
        setSearchResults(data.results);
      } else {
        console.error('Search failed:', data.error);
        alert('Search failed: ' + data.error);
      }
    } catch (error) {
      console.error('Error searching Pixabay:', error);
      alert('Search failed: ' + error);
    }
    setLoading(false);
  };

  const downloadMusic = async (result: PixabayResult, customName?: string) => {
    setDownloading(result.id);
    try {
      const response = await fetch('/api/pixabay-search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          videoData: result,
          customName: customName
        }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        alert(`Successfully downloaded: ${data.filename}`);
        await loadMusicLibrary(); // Refresh library
      } else {
        console.error('Download failed:', data.error);
        alert('Download failed: ' + data.error);
      }
    } catch (error) {
      console.error('Error downloading music:', error);
      alert('Download failed: ' + error);
    }
    setDownloading(null);
  };

  const deleteMusic = async (filename: string) => {
    if (!confirm(`Are you sure you want to delete "${filename}"?`)) return;
    
    try {
      const response = await fetch('/api/music-library', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ filename }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        await loadMusicLibrary(); // Refresh library
      } else {
        console.error('Delete failed:', data.error);
        alert('Delete failed: ' + data.error);
      }
    } catch (error) {
      console.error('Error deleting music:', error);
      alert('Delete failed: ' + error);
    }
  };

  const togglePlayback = async (filename: string) => {
    if (playingFile === filename) {
      // Stop current playback
      if (audioElement) {
        audioElement.pause();
        audioElement.src = '';
      }
      setPlayingFile(null);
      setAudioElement(null);
    } else {
      // Start new playback
      if (audioElement) {
        audioElement.pause();
        audioElement.src = '';
      }
      
      const audio = new Audio(`/api/music-library/play/${filename}`);
      audio.onended = () => {
        setPlayingFile(null);
        setAudioElement(null);
      };
      audio.onerror = () => {
        alert('Error playing audio file');
        setPlayingFile(null);
        setAudioElement(null);
      };
      
      try {
        await audio.play();
        setPlayingFile(filename);
        setAudioElement(audio);
      } catch (error) {
        console.error('Error playing audio:', error);
        alert('Error playing audio file');
      }
    }
  };

  const formatFileSize = (bytes: number) => {
    const mb = bytes / (1024 * 1024);
    return mb.toFixed(1) + ' MB';
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const openMusicFolder = () => {
    // This will open the music folder on the user's system
    fetch('/api/open-music-folder', { method: 'POST' })
      .catch(error => console.error('Error opening folder:', error));
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Music className="h-8 w-8 text-blue-600" />
          <h1 className="text-3xl font-bold text-gray-800">Music Library</h1>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={openMusicFolder}
            className="flex items-center space-x-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            <ExternalLink className="h-4 w-4" />
            <span>Open Folder</span>
          </button>
          <button
            onClick={loadMusicLibrary}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <RefreshCw className="h-4 w-4" />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Pixabay Search - Temporarily Disabled */}
      <div className="bg-gray-100 rounded-lg shadow-lg p-6 opacity-75">
        <h2 className="text-xl font-semibold text-gray-500 mb-4 flex items-center">
          <Search className="h-5 w-5 mr-2" />
          Search Pixabay for New Music (Temporarily Disabled)
        </h2>
        <div className="flex space-x-3 mb-4">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && searchPixabay()}
            placeholder="Search temporarily disabled - please upload MP3s manually"
            disabled={true}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-500 cursor-not-allowed"
          />
          <button
            onClick={searchPixabay}
            disabled={true}
            className="px-6 py-2 bg-gray-400 text-white rounded-lg cursor-not-allowed transition-colors flex items-center space-x-2"
          >
            <Search className="h-4 w-4" />
            <span>Disabled</span>
          </button>
        </div>
        
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-sm text-yellow-800">
          <p><strong>Note:</strong> Pixabay search is temporarily disabled. Please use the "Open Folder" button above to manually add your own MP3 files to the music library. The system will randomly select from your uploaded tracks during video processing.</p>
        </div>

        {/* Search Results */}
        {searchResults.length > 0 && (
          <div className="grid gap-4 max-h-96 overflow-y-auto">
            {searchResults.map((result) => (
              <div key={result.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-800">{result.title}</h3>
                    <p className="text-sm text-gray-600">{result.tags}</p>
                    <div className="flex items-center space-x-4 text-xs text-gray-500 mt-1">
                      <span>By: {result.user}</span>
                      <span>Duration: {formatDuration(result.duration)}</span>
                      <span>Views: {result.views.toLocaleString()}</span>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {result.preview_url && (
                      <a
                        href={result.preview_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
                        title="Preview"
                      >
                        <Play className="h-4 w-4" />
                      </a>
                    )}
                    <button
                      onClick={() => downloadMusic(result)}
                      disabled={downloading === result.id}
                      className="flex items-center space-x-1 px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition-colors text-sm"
                    >
                      {downloading === result.id ? (
                        <RefreshCw className="h-3 w-3 animate-spin" />
                      ) : (
                        <Download className="h-3 w-3" />
                      )}
                      <span>{downloading === result.id ? 'Downloading...' : 'Download'}</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Current Music Library */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
          <Music className="h-5 w-5 mr-2" />
          Your Music Library ({musicFiles?.length || 0} tracks)
        </h2>
        
        {(!musicFiles || musicFiles.length === 0) ? (
          <div className="text-center py-8 text-gray-500">
            <Music className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p>No music files found.</p>
            <p className="text-sm">Search Pixabay above or drag MP3 files to the music folder.</p>
          </div>
        ) : (
          <div className="grid gap-3">
            {musicFiles?.map((file) => (
              <div key={file.filename} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
                <div className="flex-1">
                  <h3 className="font-medium text-gray-800">{file.display_name}</h3>
                  <div className="flex items-center space-x-4 text-sm text-gray-600">
                    <span>Duration: {formatDuration(file.duration)}</span>
                    <span>Size: {formatFileSize(file.size)}</span>
                    <span>Added: {new Date(file.created * 1000).toLocaleDateString()}</span>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => togglePlayback(file.filename)}
                    className="p-2 text-green-600 hover:bg-green-100 rounded-lg transition-colors"
                    title={playingFile === file.filename ? 'Stop' : 'Play'}
                  >
                    {playingFile === file.filename ? (
                      <Pause className="h-4 w-4" />
                    ) : (
                      <Play className="h-4 w-4" />
                    )}
                  </button>
                  <button
                    onClick={() => deleteMusic(file.filename)}
                    className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Instructions */}
      <div className="bg-blue-50 rounded-lg p-4 text-sm text-blue-800">
        <h3 className="font-semibold mb-2">How to use the Music Library:</h3>
        <ul className="list-disc list-inside space-y-1">
          <li><strong>Current Mode:</strong> Using your uploaded MP3 files (Pixabay temporarily disabled)</li>
          <li>Click "Open Folder" to manually add your own MP3 files</li>
          <li>All music files will be available when processing videos</li>
          <li>The "Smart AI Selection" option will randomly choose from your uploaded tracks</li>
          <li>Background music is automatically dimmed during speech for optimal audio balance</li>
        </ul>
      </div>
    </div>
  );
}