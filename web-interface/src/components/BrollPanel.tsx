'use client';

import React, { useState, useEffect, useCallback } from 'react';

interface BrollPanelProps {
  clips: any[];
  brollClips: any[];
  onBrollAdd: (clipId: string, brollData: any) => void;
  onBrollRemove: (brollId: string) => void;
  searchQuery?: string;
  onSelect?: (video: any) => void;
}

export const BrollPanel: React.FC<BrollPanelProps> = ({ 
  clips, 
  brollClips, 
  onBrollAdd, 
  onBrollRemove, 
  searchQuery, 
  onSelect 
}) => {
  const [activeTab, setActiveTab] = useState('stock');
  const [stockResults, setStockResults] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');

  useEffect(() => {
    if (activeTab === 'stock' && searchQuery) {
      searchStockLibrary(searchQuery);
    }
  }, [activeTab, searchQuery]);

  const searchStockLibrary = async (query: string) => {
    setIsLoading(true);
    setError('');
    try {
      const response = await fetch('/api/pexels-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }),
      });
      const data = await response.json();
      if (response.ok) {
        setStockResults(data.videos || []);
      } else {
        throw new Error(data.error || 'Failed to search stock library');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = async (file: File) => {
    setUploading(true);
    setUploadError('');
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('/api/upload-broll', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      if (response.ok) {
        onSelect?.({
          video_files: [{ link: data.url }],
          duration: 0, // Note: we might need to get duration from the uploaded video
        });
      } else {
        throw new Error(data.error || 'Failed to upload file');
      }
    } catch (err: any) {
      setUploadError(err.message);
    } finally {
      setUploading(false);
    }
  };

  const onDrop = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const files = event.dataTransfer.files;
    if (files && files.length > 0) {
      handleFileUpload(files[0]);
    }
  }, []);

  const onDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
  }, []);


  return (
    <div className="p-4 bg-gray-800 text-white h-full flex flex-col">
      <h3 className="text-lg font-bold mb-4">B-Roll Manager</h3>
      
      {/* B-roll for each clip */}
      <div className="space-y-4 mb-6">
        {clips.map((clip, index) => (
          <div key={clip.id} className="bg-gray-700 p-3 rounded-lg">
            <div className="text-sm text-gray-300 mb-2">
              Clip {index + 1} ({clip.start.toFixed(1)}s - {clip.end.toFixed(1)}s)
            </div>
            {/* Show existing B-roll for this clip */}
            {brollClips.filter(b => b.clipId === clip.id).map(broll => (
              <div key={broll.id} className="bg-gray-600 p-2 rounded mb-2 flex justify-between items-center">
                <span className="text-sm">{broll.name || 'B-roll clip'}</span>
                <button
                  onClick={() => onBrollRemove(broll.id)}
                  className="text-red-400 hover:text-red-300 text-sm"
                >
                  Remove
                </button>
              </div>
            ))}
            <button
              onClick={() => setActiveTab('stock')}
              className="bg-blue-600 hover:bg-blue-700 text-white text-sm px-3 py-1 rounded"
            >
              Add B-roll
            </button>
          </div>
        ))}
      </div>
      
      <div className="flex border-b border-gray-600">
        <button 
          onClick={() => setActiveTab('upload')}
          className={`px-4 py-2 text-sm font-medium ${activeTab === 'upload' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-400'}`}
        >
          Upload
        </button>
        <button 
          onClick={() => setActiveTab('stock')}
          className={`px-4 py-2 text-sm font-medium ${activeTab === 'stock' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-400'}`}
        >
          Stock Library
        </button>
      </div>
      
      <div className="py-4 flex-1 overflow-y-auto">
        {activeTab === 'upload' && (
          <div>
            <h3 className="font-bold mb-2 text-white">Upload B-roll</h3>
            <div 
              className="border-2 border-dashed border-gray-600 rounded-md p-6 text-center cursor-pointer hover:border-blue-500"
              onDrop={onDrop}
              onDragOver={onDragOver}
            >
              <input 
                type="file" 
                accept="video/*" 
                className="hidden" 
                id="video-upload"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    handleFileUpload(file);
                  }
                }}
              />
              <label htmlFor="video-upload" className="cursor-pointer">
                <p className="text-gray-400 mb-2">Drag & drop your B-roll video here</p>
                <p className="text-sm text-gray-500">or click to select a file</p>
              </label>
            </div>
            {uploading && <p className="text-center mt-4 text-blue-400">Uploading...</p>}
            {uploadError && <p className="text-center mt-4 text-red-400">{uploadError}</p>}
          </div>
        )}
        
        {activeTab === 'stock' && (
          <div>
            <h3 className="font-bold mb-2 text-white">Stock Library</h3>
            <div className="mb-4">
              <input 
                type="text" 
                placeholder="Search for B-roll videos..." 
                className="w-full p-2 bg-gray-700 border border-gray-600 rounded text-white"
                onChange={(e) => {
                  if (e.target.value) {
                    searchStockLibrary(e.target.value);
                  }
                }}
              />
            </div>
            {isLoading && <p className="text-center mt-4 text-blue-400">Loading...</p>}
            {error && <p className="text-center mt-4 text-red-400">{error}</p>}
            <div className="grid grid-cols-2 gap-2 mt-4">
              {stockResults.map(video => (
                <div key={video.id} className="relative cursor-pointer" onClick={() => onSelect?.(video)}>
                  <video src={video.video_files.find((f: any) => f.quality === 'sd')?.link} className="w-full h-auto rounded-md bg-black" loop muted onMouseEnter={e => e.currentTarget.play()} onMouseLeave={e => e.currentTarget.pause()} />
                  <div className="absolute inset-0 bg-black bg-opacity-20 hover:bg-opacity-0 transition-opacity"></div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}; 