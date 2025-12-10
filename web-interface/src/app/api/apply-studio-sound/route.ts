import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { exec } from 'child_process';

export async function POST(request: Request) {
  const { videoPath } = await request.json();

  if (!videoPath) {
    return NextResponse.json({ error: 'Missing video path' }, { status: 400 });
  }

  const tempDir = path.join(process.cwd(), 'temp');
  await fs.mkdir(tempDir, { recursive: true });
  const outputPath = path.join(tempDir, `studio_sound_${Date.now()}.mp4`);

  // This is a complex FFmpeg filter chain for audio enhancement.
  // It combines a high-pass filter to remove rumble, a low-pass filter to remove hiss,
  // a noise reduction filter, an equalizer to boost vocal frequencies, and a compressor to level the audio.
  const audioFilters = [
    'highpass=f=80',
    'lowpass=f=16000',
    'afftdn=nr=12:nf=-20',
    'anequalizer=c0 f=3000 w=1000 g=3 t=h|c1 f=500 w=500 g=-3 t=h',
    'acompressor=threshold=0.1:ratio=2:attack=20:release=250',
  ].join(',');

  const ffmpegCommand = `ffmpeg -i ${videoPath} -c:v copy -af "${audioFilters}" ${outputPath}`;

  return new Promise((resolve) => {
    exec(ffmpegCommand, (error, stdout, stderr) => {
      if (error) {
        console.error(`FFmpeg error: ${error.message}`);
        return resolve(NextResponse.json({ error: 'Failed to apply Studio Sound', details: stderr }, { status: 500 }));
      }
      resolve(NextResponse.json({ success: true, outputPath }));
    });
  });
} 