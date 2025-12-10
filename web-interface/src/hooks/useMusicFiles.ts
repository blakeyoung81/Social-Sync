import { useState, useEffect } from 'react';

interface MusicFile {
  name: string;
  displayName: string;
  path: string;
}

interface MusicFilesResponse {
  files: MusicFile[];
  error?: string;
}

export const useMusicFiles = () => {
  const [musicFiles, setMusicFiles] = useState<MusicFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchMusicFiles = async () => {
      try {
        const response = await fetch('/api/list-music-files');
        const data: MusicFilesResponse = await response.json();
        
        if (data.error) {
          setError(data.error);
        } else {
          setMusicFiles(data.files);
        }
      } catch (err) {
        setError('Failed to fetch music files');
        console.error('Error fetching music files:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchMusicFiles();
  }, []);

  return { musicFiles, loading, error };
}; 