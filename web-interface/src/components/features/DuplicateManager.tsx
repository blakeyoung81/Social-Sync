import React, { useState, useCallback } from 'react';
import { Trash2, RefreshCw, AlertCircle, CheckCircle, FileVideo, ShieldAlert } from 'lucide-react';

interface DuplicateFile {
  file: string;
  hash: string;
  size: number;
}

interface DuplicateSet {
  hash: string;
  files: DuplicateFile[];
  size: number;
}

export function DuplicateManager() {
  const [duplicateSets, setDuplicateSets] = useState<DuplicateSet[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deletedFiles, setDeletedFiles] = useState<string[]>([]);
  const [isDeleting, setIsDeleting] = useState(false);

  const findDuplicates = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/find-duplicates');
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to find duplicates.');
      }
      setDuplicateSets(data.duplicates);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsLoading(false);
    }
  }, []);

  const deleteDuplicates = useCallback(async () => {
    setIsDeleting(true);
    setError(null);
    try {
      const response = await fetch('/api/delete-duplicates', { method: 'POST' });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete duplicates.');
      }
      setDeletedFiles(data.deletedFiles);
      // Refresh the list after deletion
      await findDuplicates();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsDeleting(false);
    }
  }, [findDuplicates]);

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2 mb-4">
        <Trash2 className="text-red-600" />
        Duplicate Video Manager
      </h2>
      <div className="space-y-4">
        <div className="flex items-center gap-4">
          <button
            onClick={findDuplicates}
            disabled={isLoading || isDeleting}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
          >
            <RefreshCw className={`mr-2 ${isLoading ? 'animate-spin' : ''}`} size={16} />
            {isLoading ? 'Scanning...' : 'Find Duplicate Videos'}
          </button>
          <button
            onClick={deleteDuplicates}
            disabled={isDeleting || duplicateSets.length === 0}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-400"
          >
            <Trash2 className="mr-2" size={16} />
            {isDeleting ? 'Deleting...' : 'Delete All Duplicates'}
          </button>
        </div>
        {error && (
          <div className="bg-red-100 border border-red-300 text-red-800 rounded-lg p-3 flex items-center gap-2">
            <AlertCircle size={16} />
            <p>{error}</p>
          </div>
        )}
        {deletedFiles.length > 0 && (
            <div className="bg-green-100 border border-green-300 text-green-800 rounded-lg p-3 flex items-center gap-2">
                <CheckCircle size={16} />
                <p>Successfully deleted {deletedFiles.length} duplicate files.</p>
            </div>
        )}
        <div className="space-y-4">
            {duplicateSets.length > 0 ? (
                duplicateSets.map((set) => (
                    <div key={set.hash} className="border rounded-lg p-4">
                        <h3 className="font-bold mb-2">Hash: {set.hash}</h3>
                        <ul className="space-y-1">
                            {set.files.map((file) => (
                                <li key={file.file} className="flex items-center gap-2 text-sm">
                                    <FileVideo size={16} />
                                    <span>{file.file}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                ))
            ) : (
                <div className="text-center py-4 text-gray-500">
                    <p>No duplicate videos found.</p>
                </div>
            )}
        </div>
      </div>
    </div>
  );
} 