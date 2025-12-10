import { Word } from '../types';

interface TranscriptSegment {
  id: number;
  start: number;
  end: number;
  text: string;
  startTime?: string;
  endTime?: string;
}

interface WordSegment {
  id: string;
  start: number;
  end: number;
  words: Word[];
  speaker?: string;
}

interface TranscriptSegmentWithWords extends TranscriptSegment {
    words?: Word[];
}

export function convertSegmentsToWords(segments: TranscriptSegmentWithWords[]): WordSegment[] {
  return segments.map((segment) => {
    let wordObjects: Word[];

    if (segment.words && segment.words.length > 0) {
      // Use pre-computed word timings if available
      wordObjects = segment.words.map((word, index) => ({
        ...word,
        id: `word-${segment.id}-${index}`,
        segmentId: `segment-${segment.id}`,
      }));
    } else {
      // Fallback to estimating word timings
      const words = segment.text.split(/\s+/).filter(word => word.length > 0);
      if (words.length === 0) {
        wordObjects = [];
      } else {
        const segmentDuration = segment.end - segment.start;
        const wordDuration = segmentDuration / words.length;
        
        wordObjects = words.map((word, index) => {
          const wordStart = segment.start + (index * wordDuration);
          const wordEnd = wordStart + wordDuration;
          
          return {
            id: `word-${segment.id}-${index}`,
            text: word,
            start: wordStart,
            end: wordEnd,
            confidence: 1.0,
            segmentId: `segment-${segment.id}`,
          };
        });
      }
    }

    return {
      id: `segment-${segment.id}`,
      start: segment.start,
      end: segment.end,
      words: wordObjects,
      speaker: undefined // Can be enhanced with speaker detection
    };
  });
}

export function convertWordsToSegments(wordSegments: WordSegment[]): TranscriptSegment[] {
  return wordSegments.map((segment, index) => ({
    id: index + 1,
    start: segment.start,
    end: segment.end,
    text: segment.words.map(word => word.text).join(' '),
    startTime: formatTimeToSRT(segment.start),
    endTime: formatTimeToSRT(segment.end)
  }));
}

export function formatTimeToSRT(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const milliseconds = Math.floor((seconds % 1) * 1000);
  
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')},${milliseconds.toString().padStart(3, '0')}`;
}

export function updateWordInSegments(
  segments: WordSegment[],
  segmentId: string,
  wordId: string,
  newText: string
): WordSegment[] {
  return segments.map(segment => {
    if (segment.id === segmentId) {
      return {
        ...segment,
        words: segment.words.map(word => 
          word.id === wordId ? { ...word, text: newText } : word
        )
      };
    }
    return segment;
  });
}

export function deleteWordFromSegments(
  segments: WordSegment[],
  segmentId: string,
  wordId: string
): WordSegment[] {
  return segments.map(segment => {
    if (segment.id === segmentId) {
      return {
        ...segment,
        words: segment.words.filter(word => word.id !== wordId)
      };
    }
    return segment;
  });
}

export function getWordTimingFromTranscript(
  transcript: string,
  segments: TranscriptSegment[]
): Word[] {
  // This is a simplified approach - in a real implementation,
  // you'd want to use a more sophisticated word-level timing algorithm
  const allWords: Word[] = [];
  
  segments.forEach((segment) => {
    const words = segment.text.split(/\s+/).filter(word => word.length > 0);
    const segmentDuration = segment.end - segment.start;
    const wordDuration = segmentDuration / words.length;
    
    words.forEach((word, index) => {
      const wordStart = segment.start + (index * wordDuration);
      const wordEnd = wordStart + wordDuration;
      
      allWords.push({
        id: `word-${segment.id}-${index}`,
        text: word,
        start: wordStart,
        end: wordEnd,
        confidence: 1.0
      });
    });
  });
  
  return allWords;
}

export function searchWordsInSegments(
  segments: WordSegment[],
  searchTerm: string
): { segmentId: string; wordId: string; word: Word }[] {
  const results: { segmentId: string; wordId: string; word: Word }[] = [];
  
  segments.forEach(segment => {
    segment.words.forEach(word => {
      if (word.text.toLowerCase().includes(searchTerm.toLowerCase())) {
        results.push({
          segmentId: segment.id,
          wordId: word.id,
          word: word
        });
      }
    });
  });
  
  return results;
}

export function generateWordLevelTimestamps(
  text: string,
  startTime: number,
  endTime: number
): Word[] {
  const words = text.split(/\s+/).filter(word => word.length > 0);
  const duration = endTime - startTime;
  const wordDuration = duration / words.length;
  
  return words.map((word, index) => ({
    id: `word-${Date.now()}-${index}`,
    text: word,
    start: startTime + (index * wordDuration),
    end: startTime + ((index + 1) * wordDuration),
    confidence: 1.0
  }));
} 