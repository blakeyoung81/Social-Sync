import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'child_process';
import path from 'path';

export async function POST(request: NextRequest) {
    try {
        const {
            inputFolder,
      scheduleDate, 
      scheduleMode, 
      conflictMode = 'smart-analysis',
      timePreference = 'auto',
      isDayAndNight = false 
    } = await request.json();

        if (!inputFolder) {
      return NextResponse.json({ error: 'Input folder is required' }, { status: 400 });
    }

    if (scheduleMode !== 'smart') {
      return NextResponse.json({
        scheduledVideos: [],
        shortcuts: [],
        regularVideos: [],
        preview: {
          firstUpload: scheduleDate,
          lastUpload: scheduleDate,
          totalDays: 1,
          shortSlots: 0,
          regularSlots: 0,
          conflicts: 0
        }
      });
    }

    return new Promise((resolve) => {
      const scriptPath = path.join(process.cwd(), 'src', 'scripts', 'discover_videos.py');
      // Use the virtual environment Python
      const pythonPath = path.resolve(process.cwd(), '..', '.venv', 'bin', 'python');
      const args = [
        scriptPath, inputFolder,
        '--analyze-types',
        '--generate-schedule',
        '--schedule-date', scheduleDate || new Date().toISOString().split('T')[0],
        '--schedule-mode', scheduleMode,
        '--conflict-mode', conflictMode
      ];

      const pythonProcess = spawn(pythonPath, args, {
        cwd: process.cwd(),
            });

            let output = '';
      let errorOutput = '';

            pythonProcess.stdout.on('data', (data) => {
        output += data.toString();
            });

            pythonProcess.stderr.on('data', (data) => {
        errorOutput += data.toString();
            });

            pythonProcess.on('close', (code) => {
        if (code !== 0) {
          console.error('Python script error:', errorOutput);
          resolve(NextResponse.json({
            scheduledVideos: [],
            shortcuts: [],
            regularVideos: [],
            preview: {
              firstUpload: scheduleDate,
              lastUpload: scheduleDate,
              totalDays: 1,
              shortSlots: 0,
              regularSlots: 0,
              conflicts: 1
            },
            error: 'Failed to generate schedule preview'
          }));
          return;
        }

        try {
          const result = JSON.parse(output.trim());
          
          // Extract only the scheduling data for the response
          const scheduleResponse = {
            scheduledVideos: result.scheduledVideos || [],
            shortcuts: result.shortcuts || [],
            regularVideos: result.regularVideos || [],
            preview: result.preview || {
              firstUpload: scheduleDate,
              lastUpload: scheduleDate,
              totalDays: 1,
              shortSlots: 0,
              regularSlots: 0,
              conflicts: 0
            }
          };
          
          resolve(NextResponse.json(scheduleResponse));
                    } catch (parseError) {
          console.error('Failed to parse Python output:', parseError);
                        resolve(NextResponse.json({
            scheduledVideos: [],
            shortcuts: [],
            regularVideos: [],
            preview: {
              firstUpload: scheduleDate,
              lastUpload: scheduleDate,
              totalDays: 1,
              shortSlots: 0,
              regularSlots: 0,
              conflicts: 1
            },
            error: 'Failed to parse schedule preview'
          }));
        }
      });

      pythonProcess.on('error', (error) => {
        console.error('Failed to start Python process:', error);
                resolve(NextResponse.json({
          scheduledVideos: [],
          shortcuts: [],
          regularVideos: [],
          preview: {
            firstUpload: scheduleDate,
            lastUpload: scheduleDate,
            totalDays: 1,
            shortSlots: 0,
            regularSlots: 0,
            conflicts: 1
          },
          error: 'Failed to start schedule preview process'
        }));
      });
    });
    } catch (error) {
    console.error('API error:', error);
        return NextResponse.json({
      scheduledVideos: [],
      shortcuts: [],
      regularVideos: [],
      preview: {
        firstUpload: new Date().toISOString().split('T')[0],
        lastUpload: new Date().toISOString().split('T')[0],
        totalDays: 1,
        shortSlots: 0,
        regularSlots: 0,
        conflicts: 1
      },
      error: 'Internal server error'
        }, { status: 500 });
    }
} 