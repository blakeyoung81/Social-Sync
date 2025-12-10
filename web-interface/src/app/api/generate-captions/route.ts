import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { Word } from '@/types';

function toSrtTime(seconds: number): string {
  const date = new Date(0);
  date.setSeconds(seconds);
  const timeStr = date.toISOString().substr(11, 12);
  return timeStr.replace('.', ',');
}

export async function POST(request: Request) {
  const { words, videoPath, styleOptions } = await request.json();

  if (!words || !videoPath || !styleOptions) {
    return NextResponse.json({ error: 'Missing words, video path, or style options' }, { status: 400 });
  }

  const tempDir = path.join(process.cwd(), 'temp');
  await fs.mkdir(tempDir, { recursive: true });
  const srtPath = path.join(tempDir, `captions_${Date.now()}.srt`);
  const outputPath = path.join(tempDir, `captioned_${Date.now()}.mp4`);

  let srtContent = '';
  words.forEach((word: Word, index: number) => {
    srtContent += `${index + 1}\n`;
    srtContent += `${toSrtTime(word.start)} --> ${toSrtTime(word.end)}\n`;
    srtContent += `${word.text}\n\n`;
  });

  await fs.writeFile(srtPath, srtContent);

  const fontPath = styleOptions.font === 'Impact' ? '/System/Library/Fonts/Impact.ttf' : '/System/Library/Fonts/Arial.ttf';
  
  const subtitlesFilter = `subtitles=${srtPath}:force_style='FontName=${styleOptions.font},FontSize=24,PrimaryColour=&H${styleOptions.color.substring(1)}'`;

  const ffmpegCommand = `ffmpeg -i ${videoPath} -vf "${subtitlesFilter}" ${outputPath}`;

  return new Promise((resolve) => {
    exec(ffmpegCommand, (error, stdout, stderr) => {
      if (error) {
        console.error(`FFmpeg error: ${error.message}`);
        return resolve(NextResponse.json({ error: 'Failed to generate captions', details: stderr }, { status: 500 }));
      }
      resolve(NextResponse.json({ success: true, outputPath }));
    });
  });
} 