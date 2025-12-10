'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Clock, Edit2, Trash2, Plus, Scissors } from 'lucide-react';

interface Word {
  id: string;
  text: string;
  start: number;
  end: number;
  confidence?: number;
  isEditing?: boolean;
  isSelected?: boolean;
  shouldRemove?: boolean;
}

interface Segment {
  id: string;
  start: number;
  end: number;
  words: Word[];
  speaker?: string;
}

interface WordByWordEditorProps {
  segments: Segment[];
  currentTime: number;
  onWordEdit: (segmentId: string, wordId: string, newText: string) => void;
  onWordDelete: (segmentId: string, wordId: string) => void;
  onWordClick: (word: Word) => void;
  onSegmentClick: (segment: Segment) => void;
  className?: string;
}

const WordByWordEditor: React.FC<WordByWordEditorProps> = ({
  segments,
  currentTime,
  onWordEdit,
  onWordDelete,
  onWordClick,
  onSegmentClick,
  className = ''
}) => {
  const [editingWord, setEditingWord] = useState<{ segmentId: string; wordId: string } | null>(null);
  const [editText, setEditText] = useState('');
  const [selectedWords, setSelectedWords] = useState<Set<string>>(new Set());
  const editInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingWord && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [editingWord]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getCurrentWord = () => {
    for (const segment of segments) {
      for (const word of segment.words) {
        if (currentTime >= word.start && currentTime <= word.end) {
          return word;
        }
      }
    }
    return null;
  };

  const handleWordEditClick = (segmentId: string, word: Word) => {
    setEditingWord({ segmentId, wordId: word.id });
    setEditText(word.text);
  };

  const handleEditSubmit = () => {
    if (editingWord) {
      onWordEdit(editingWord.segmentId, editingWord.wordId, editText);
      setEditingWord(null);
      setEditText('');
    }
  };

  const handleEditCancel = () => {
    setEditingWord(null);
    setEditText('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleEditSubmit();
    } else if (e.key === 'Escape') {
      handleEditCancel();
    }
  };

  const handleWordClick = (word: Word) => {
    onWordClick(word);
  };

  const toggleWordSelection = (wordId: string) => {
    const newSelected = new Set(selectedWords);
    if (newSelected.has(wordId)) {
      newSelected.delete(wordId);
    } else {
      newSelected.add(wordId);
    }
    setSelectedWords(newSelected);
  };

  const deleteSelectedWords = () => {
    selectedWords.forEach(wordId => {
      // Find the segment containing this word
      for (const segment of segments) {
        const word = segment.words.find(w => w.id === wordId);
        if (word) {
          onWordDelete(segment.id, wordId);
          break;
        }
      }
    });
    setSelectedWords(new Set());
  };

  const currentWord = getCurrentWord();

  return (
    <div className={`word-by-word-editor ${className}`}>
      {/* Editor Controls */}
      <div className="flex items-center justify-between mb-4 p-3 bg-gray-50 rounded-lg">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Clock className="w-4 h-4" />
          <span>Current: {formatTime(currentTime)}</span>
          {currentWord && (
            <>
              <span>•</span>
              <span className="font-medium">"{currentWord.text}"</span>
            </>
          )}
        </div>
        <div className="flex items-center gap-2">
          {selectedWords.size > 0 && (
            <button
              onClick={deleteSelectedWords}
              className="flex items-center gap-1 px-2 py-1 text-sm text-red-600 hover:bg-red-50 rounded"
            >
              <Trash2 className="w-3 h-3" />
              Delete ({selectedWords.size})
            </button>
          )}
          <span className="text-xs text-gray-500">
            Double-click to edit • Shift+click to select multiple
          </span>
        </div>
      </div>

      {/* Word Editor */}
      <div className="space-y-6">
        {segments.map((segment) => (
          <div
            key={segment.id}
            className="segment-block border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors"
            onClick={() => onSegmentClick(segment)}
          >
            {/* Segment Header */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Clock className="w-4 h-4" />
                <span className="font-mono">{formatTime(segment.start)}</span>
                <span>→</span>
                <span className="font-mono">{formatTime(segment.end)}</span>
                <span className="text-gray-400">•</span>
                <span>{formatTime(segment.end - segment.start)}</span>
              </div>
              {segment.speaker && (
                <div className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded">
                  {segment.speaker}
                </div>
              )}
            </div>

            {/* Words */}
            <div className="words-container leading-relaxed">
              {segment.words.map((word, wordIndex) => {
                const isCurrentWord = currentWord?.id === word.id;
                const isSelected = selectedWords.has(word.id);
                const isEditing = editingWord?.wordId === word.id;
                
                return (
                  <span key={word.id} className="word-wrapper inline-block">
                    {isEditing ? (
                      <input
                        ref={editInputRef}
                        type="text"
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        onKeyDown={handleKeyDown}
                        onBlur={handleEditSubmit}
                        className="inline-block min-w-[20px] px-1 py-0.5 border border-blue-500 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        style={{ width: `${Math.max(editText.length * 8, 20)}px` }}
                      />
                    ) : (
                      <span
                        className={`word-token inline-block px-1 py-0.5 mx-0.5 my-0.5 rounded cursor-pointer transition-all text-base ${
                          isCurrentWord
                            ? 'bg-blue-500 text-white shadow-md'
                            : isSelected
                            ? 'bg-yellow-200 text-gray-900'
                            : word.shouldRemove
                            ? 'bg-red-100 text-red-700 line-through'
                            : 'hover:bg-gray-100'
                        } ${
                          word.confidence && word.confidence < 0.5
                            ? 'border-b-2 border-orange-300'
                            : ''
                        }`}
                        onClick={(e) => {
                          if (e.shiftKey) {
                            toggleWordSelection(word.id);
                          } else {
                            handleWordEditClick(segment.id, word);
                          }
                        }}
                        title={`${word.text} (${formatTime(word.start)} - ${formatTime(word.end)})${
                          word.confidence ? ` • Confidence: ${(word.confidence * 100).toFixed(1)}%` : ''
                        }`}
                      >
                        {word.text}
                      </span>
                    )}
                    {/* Add space after word unless it's punctuation */}
                    {wordIndex < segment.words.length - 1 && 
                     !word.text.match(/[.,!?;:]$/) && 
                     !segment.words[wordIndex + 1].text.match(/^[.,!?;:]/) && 
                     ' '}
                  </span>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Editor Stats */}
      <div className="mt-6 p-3 bg-gray-50 rounded-lg">
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div className="text-center">
            <div className="text-gray-500">Total Words</div>
            <div className="font-medium">
              {segments.reduce((acc, seg) => acc + seg.words.length, 0)}
            </div>
          </div>
          <div className="text-center">
            <div className="text-gray-500">Selected</div>
            <div className="font-medium">{selectedWords.size}</div>
          </div>
          <div className="text-center">
            <div className="text-gray-500">Low Confidence</div>
            <div className="font-medium">
              {segments.reduce((acc, seg) => 
                acc + seg.words.filter(w => w.confidence && w.confidence < 0.5).length, 0
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WordByWordEditor; 