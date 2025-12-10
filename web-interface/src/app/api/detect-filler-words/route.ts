import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { Word } from '@/types';

const COMMON_FILLER_WORDS = [
  'ah', 'uh', 'um', 'er', 'like', 'so', 'you know', 'actually', 'basically', 'literally'
];

export async function POST(request: Request) {
  const { transcription } = await request.json();

  if (!transcription || !transcription.segments) {
    return NextResponse.json({ error: 'Invalid transcription data provided' }, { status: 400 });
  }

  try {
    const fillerWordOccurrences: { [key: string]: { word: string, count: number, instances: Word[] } } = {};

    const words: Word[] = transcription.segments.flatMap((segment: any) => 
      segment.words && Array.isArray(segment.words) ? segment.words.map((word: any) => ({
        ...word,
        id: `${segment.id}-${word.start}`
      })) : []
    );
    
    words.forEach(word => {
      const lowerCaseText = word.text.toLowerCase().replace(/[.,?]/g, '');
      if (COMMON_FILLER_WORDS.includes(lowerCaseText)) {
        if (!fillerWordOccurrences[lowerCaseText]) {
          fillerWordOccurrences[lowerCaseText] = { word: lowerCaseText, count: 0, instances: [] };
        }
        fillerWordOccurrences[lowerCaseText].count++;
        fillerWordOccurrences[lowerCaseText].instances.push(word);
      }
    });

    return NextResponse.json({
      success: true,
      fillerWords: Object.values(fillerWordOccurrences),
    });

  } catch (error) {
    console.error('Error detecting filler words:', error);
    return NextResponse.json({ error: 'Failed to detect filler words' }, { status: 500 });
  }
} 