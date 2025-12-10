import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'child_process';
import path from 'path';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { dryRun = false } = body;

        return new Promise((resolve) => {
            const scriptPath = path.join(process.cwd(), '..', 'src', 'workflows', 'delete_duplicates.py');
            console.log('Process CWD:', process.cwd());
            console.log('Script Path:', scriptPath);
            // Use the virtual environment Python
    const pythonPath = path.resolve(process.cwd(), '..', '.venv', 'bin', 'python');
    const args = [pythonPath, scriptPath];
            
            if (dryRun) {
                args.push('--dry-run');
            }

            const pythonProcess = spawn(args[0], args.slice(1), {
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
                if (code === 0) {
                    resolve(NextResponse.json({ 
                        success: true, 
                        output: output,
                        message: dryRun ? 'Duplicate scan completed' : 'Duplicates deleted successfully'
                    }));
                } else {
                    resolve(NextResponse.json({ 
                        success: false, 
                        error: errorOutput || 'Failed to process duplicates',
                        output: output 
                    }, { status: 500 }));
                }
            });

            pythonProcess.on('error', (error) => {
                resolve(NextResponse.json({ 
                    success: false, 
                    error: error.message 
                }, { status: 500 }));
            });
        });
    } catch (error) {
        return NextResponse.json({ 
            success: false, 
            error: error instanceof Error ? error.message : 'Unknown error' 
        }, { status: 500 });
    }
} 