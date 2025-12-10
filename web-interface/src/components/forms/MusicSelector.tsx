'use client';

import React, { useState, useEffect } from 'react';
import { Music } from 'lucide-react';

interface MusicFile {
    filename: string;
    display_name: string;
    duration: number;
    size: number;
}

interface MusicSelectorProps {
    value: string;
    onChange: (value: string) => void;
}

const MusicSelector: React.FC<MusicSelectorProps> = ({ value, onChange }) => {
    const [musicFiles, setMusicFiles] = useState<MusicFile[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        loadMusicFiles();
    }, []);

    const loadMusicFiles = async () => {
        setLoading(true);
        try {
            const response = await fetch('/api/music-library');
            const data = await response.json();
            
            if (data.success) {
                setMusicFiles(data.music_files || []);
            } else {
                console.error('Failed to load music files:', data.error);
            }
        } catch (error) {
            console.error('Error loading music files:', error);
        } finally {
            setLoading(false);
        }
    };

    const formatDuration = (seconds: number) => {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = Math.floor(seconds % 60);
        return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    };

    const formatFileSize = (bytes: number) => {
        if (bytes < 1024 * 1024) {
            return `${(bytes / 1024).toFixed(1)} KB`;
        }
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    };

    return (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <h4 className="font-medium text-green-900 mb-3 flex items-center gap-2">
                <Music className="w-4 h-4" />Background Music Settings
            </h4>
            <div className="space-y-2">
                <label>Track</label>
                <select 
                    value={value} 
                    onChange={(e) => onChange(e.target.value)} 
                    className="w-full p-1 border rounded"
                    disabled={loading}
                >
                    <option value="none">None</option>
                    <option value="random">🎲 Random Selection (from your library)</option>
                    
                    {loading ? (
                        <option disabled>Loading music library...</option>
                    ) : (
                        musicFiles.map((file) => (
                            <option key={file.filename} value={file.filename.replace('.mp3', '')}>
                                {file.display_name} ({formatDuration(file.duration)})
                            </option>
                        ))
                    )}
                </select>
                
                {musicFiles.length === 0 && !loading && (
                    <p className="text-xs text-gray-600 mt-1">
                        No music files found. Add MP3 files to the data/assets/music/ folder to use them.
                    </p>
                )}
                
                {value === 'random' && (
                    <div className="bg-blue-50 border border-blue-200 rounded p-2 mt-2">
                        <p className="text-xs text-blue-800">
                            <strong>Random Selection:</strong> Will randomly choose a track from your music library for each video.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default MusicSelector; 