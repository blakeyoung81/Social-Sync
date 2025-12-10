import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'child_process';
import path from 'path';

export async function POST(request: NextRequest) {
    try {
        const { hours, inputFolder, confirmDelete, preview } = await request.json();
        
        if (!hours || hours < 1 || hours > 48) {
            return NextResponse.json({ 
                error: 'Hours must be between 1 and 48' 
            }, { status: 400 });
        }

        if (!confirmDelete && !preview) {
            return NextResponse.json({ 
                error: 'Confirmation required for deletion or use preview mode' 
            }, { status: 400 });
        }

        const pythonScript = path.join(process.cwd(), '..', 'delete_and_restore_recent_videos.py');
        
        const args = [
            pythonScript,
            '--hours', hours.toString(),
            '--input-folder', inputFolder || '/Users/blakeyoung/Library/Mobile Documents/com~apple~CloudDocs/Movies',
            '--json-output'
        ];

        // Add preview or confirm flag
        if (preview) {
            args.push('--preview');
        } else {
            args.push('--confirm');
        }
        
        // Use the virtual environment Python
        const pythonPath = path.resolve(process.cwd(), '..', '.venv', 'bin', 'python');
        console.log('Executing Python command:', pythonPath, args.join(' '));
        console.log('Working directory:', path.join(process.cwd(), '..'));
        
        const pythonProcess = spawn(pythonPath, args, {
            cwd: path.join(process.cwd(), '..'),
            env: { ...process.env }
        });

        let output = '';
        let error = '';
        let jsonOutput = '';

        pythonProcess.stdout.on('data', (data) => {
            const dataStr = data.toString();
            output += dataStr;
            
            // Try to extract JSON output
            const lines = dataStr.split('\n');
            for (const line of lines) {
                if (line.trim().startsWith('{')) {
                    try {
                        JSON.parse(line.trim());
                        jsonOutput = line.trim();
                    } catch (e) {
                        // Not valid JSON, continue
                    }
                }
            }
        });

        pythonProcess.stderr.on('data', (data) => {
            error += data.toString();
        });

        return new Promise((resolve) => {
            pythonProcess.on('close', (code) => {
                if (code === 0) {
                    let result = {
                        success: true,
                        output,
                        message: preview ? 'Preview completed successfully' : 'Delete/restore completed successfully'
                    };

                    // Try to parse JSON output if available
                    if (jsonOutput) {
                        try {
                            const parsedJson = JSON.parse(jsonOutput);
                            result = { ...result, ...parsedJson };
                        } catch (e) {
                            console.warn('Failed to parse JSON output:', e);
                        }
                    }

                    resolve(NextResponse.json(result));
                } else {
                    resolve(NextResponse.json({ 
                        success: false, 
                        error: error || 'Delete/restore process failed',
                        output 
                    }, { status: 500 }));
                }
            });
        });
    } catch (error) {
        console.error('Delete/restore error:', error);
        return NextResponse.json({ 
            error: 'Internal server error' 
        }, { status: 500 });
    }
} 