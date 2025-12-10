import { NextResponse } from 'next/server';
import { spawn } from 'child_process';
import path from 'path';

export async function POST(request: Request): Promise<NextResponse> {
    try {
        const data = await request.json();
        const {
            uploadTime,         // string e.g. "14:00"
            scheduleStartDate,  // string e.g. "2023-10-27"
            sourceDirectory,    // string path
            addOutro,           // boolean
            aiDescription,      // boolean
            aiTitle,            // boolean
            scheduleMode,       // string: "standard" or "day-and-night"
            thumbnailOption,    // string: "all", "1080p_only", or "none"
        } = data;

        const pythonScript = path.join(process.cwd(), '..', 'src', 'workflows', 'youtube_uploader.py');
        
        // Start with the input directory
        const args = [pythonScript, sourceDirectory];

        // Schedule settings (using supported arguments)
        if (scheduleStartDate) {
            args.push('--schedule-date', scheduleStartDate);
        }
        
        if (uploadTime) {
            args.push('--upload-time', uploadTime);
        } else {
            // Default time if not specified
            args.push('--upload-time', '07:00');
        }

        // Note: The following arguments are not supported by the current script:
        // --openai-key, --day-and-night, --standard-time, --skip-outro, --skip-thumbnail
        // These would need to be added to the Python script to support them
        
        // Create masked args for logging
        const maskedArgs = args.map((arg) => {
            if (arg.includes('Documents')) {
                return arg.replace(/\/Users\/[^\/]+\//, '/Users/****/');
            }
            return arg;
        });
        
        console.log('Executing batch upload command:', 'python', maskedArgs.join(' '));
        
        // Execute the command
        const pythonProcess = spawn('python', args, {
            cwd: path.join(process.cwd(), '..'),
            env: { 
                ...process.env, 
                PYTHONPATH: path.join(process.cwd(), '..'),
                OPENAI_API_KEY: process.env.OPENAI_API_KEY || ''
            }
        });
        
        let output = '';
        let error = '';
        
        pythonProcess.stdout.on('data', (data) => {
            output += data.toString();
            console.log('Output:', data.toString());
        });
        
        pythonProcess.stderr.on('data', (data) => {
            error += data.toString();
            console.error('Error:', data.toString());
        });
        
        return new Promise<NextResponse>((resolve) => {
            pythonProcess.on('close', (code) => {
                resolve(NextResponse.json({
                    success: code === 0,
                    message: code === 0 ? 'Batch upload completed successfully' : 'Batch upload failed',
                    output,
                    error: error || undefined,
                    code,
                    mode: scheduleMode,
                    processingSteps: []
                }));
            });
            
            pythonProcess.on('error', (err) => {
                console.error('Process error:', err);
                resolve(NextResponse.json({
                    success: false,
                    message: 'Failed to start batch upload',
                    error: err.message,
                    processingSteps: []
                }, { status: 500 }));
            });
        });
    } catch (error) {
        return NextResponse.json({
            success: false,
            message: 'Error processing request',
            error: error instanceof Error ? error.message : String(error)
        }, { status: 500 });
    }
} 