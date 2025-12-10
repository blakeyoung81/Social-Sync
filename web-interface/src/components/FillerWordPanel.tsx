'use client';

import React from 'react';
import { Word } from '@/types';
import { X } from 'lucide-react';

interface FillerWordPanelProps {
  fillerWords: {
    word: string;
    count: number;
    instances: Word[];
  }[];
  onDeleteAll: (word: string) => void;
  onReview: (word: string) => void;
}

export const FillerWordPanel: React.FC<FillerWordPanelProps> = ({ fillerWords, onDeleteAll, onReview }) => {
  if (!fillerWords.length) {
    return (
      <div className="p-4 text-sm text-gray-500">
        No filler words detected.
      </div>
    );
  }

  return (
    <div className="p-4">
      <h3 className="font-bold mb-2">Filler Words</h3>
      <div className="space-y-2">
        {fillerWords.map(({ word, count, instances }) => (
          <div key={word} className="flex items-center justify-between bg-gray-100 p-2 rounded-md">
            <div>
              <span className="font-semibold">{word}</span>
              <span className="text-gray-500 ml-2">({count} times)</span>
            </div>
            <div className="flex items-center space-x-2">
              <button 
                onClick={() => onReview(word)}
                className="text-sm text-blue-600 hover:underline"
              >
                Review
              </button>
              <button 
                onClick={() => onDeleteAll(word)}
                className="text-red-500 hover:text-red-700"
              >
                <X size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}; 