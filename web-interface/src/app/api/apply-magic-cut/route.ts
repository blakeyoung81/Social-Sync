import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { VideoClip } from '@/types';

export async function POST(request: Request) {
  const { clips, videoPath } = await request.json();

  if (!clips || !videoPath) {
    return NextResponse.json({ error: 'Missing clips or video path' }, { status: 400 });
  }

  const tempDir = path.join(process.cwd(), 'temp');
  await fs.mkdir(tempDir, { recursive: true });
  const outputPath = path.join(tempDir, `magic_cut_${Date.now()}.mp4`);

  let complexFilter = '';
  let inputs = '';
  let concatFilter = '';

  clips.forEach((clip: VideoClip, index: number) => {
    inputs += `-i ${videoPath} `;
    const start = clip.start;
    const duration = clip.end - clip.start;
    
    complexFilter += `[${index}:v]trim=start=${start}:duration=${duration},setpts=PTS-STARTPTS[v${index}]; `;
    
    if (index % 2 !== 0) { // Apply zoom to every other clip
      complexFilter += `[v${index}]zoompan=z='min(zoom+0.0015,1.5)':d=1:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=1280x720[z${index}]; `;
      concatFilter += `[z${index}]`;
    } else {
      concatFilter += `[v${index}]`;
    }
  });

  concatFilter += `concat=n=${clips.length}:v=1:a=0[outv]`;
  complexFilter += concatFilter;

  const ffmpegCommand = `ffmpeg ${inputs} -filter_complex "${complexFilter}" -map "[outv]" ${outputPath}`;

  return new Promise((resolve) => {
    exec(ffmpegCommand, (error, stdout, stderr) => {
      if (error) {
        console.error(`FFmpeg error: ${error.message}`);
        return resolve(NextResponse.json({ error: 'Failed to apply Magic Cut', details: stderr }, { status: 500 }));
      }
      resolve(NextResponse.json({ success: true, outputPath }));
    });
  });
} 