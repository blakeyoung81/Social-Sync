import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'child_process';
import path from 'path';

const SCRIPT_PATH = path.resolve(process.cwd(), '..', 'src', 'core', 'get_music_library.py');

export async function GET() {
    try {
        console.log('🎵 [Music API] Getting music library from:', SCRIPT_PATH);
        
        const { stdout, stderr } = await new Promise<{ stdout: string; stderr: string }>((resolve, reject) => {
            let stdout = '';
            let stderr = '';
            
            const childProcess = spawn('python', [SCRIPT_PATH], {
                cwd: path.resolve(process.cwd(), '..')
            });
            
            childProcess.stdout.on('data', (data) => {
                stdout += data.toString();
            });
            
            childProcess.stderr.on('data', (data) => {
                stderr += data.toString();
            });
            
            childProcess.on('close', (code) => {
                console.log('🎵 [Music API] Python script exit code:', code);
                resolve({ stdout, stderr });
            });
            
            childProcess.on('error', (error) => {
                console.error('🎵 [Music API] Process error:', error);
                reject(error);
            });
        });
        
        if (stderr) {
            console.log('🎵 [Music API] Python stderr:', stderr);
        }
        
        console.log('🎵 [Music API] Python stdout:', stdout);
        
        // Parse the JSON output from the Python script
        const result = JSON.parse(stdout.trim());
        
        console.log('🎵 [Music API] Found', result.music_files?.length || 0, 'music files');
        
        return NextResponse.json({
            success: true,
            music_files: result.music_files || []
        });
        
    } catch (error) {
        console.error('🎵 [Music API] Error getting music library:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to get music library', details: error.message },
            { status: 500 }
        );
    }
}

export async function DELETE(request: NextRequest) {
    try {
        const { filename } = await request.json();
        
        if (!filename) {
            return NextResponse.json(
                { success: false, error: 'Filename is required' },
                { status: 400 }
            );
        }
        
        const { stdout, stderr } = await new Promise<{ stdout: string; stderr: string }>((resolve, reject) => {
            let stdout = '';
            let stderr = '';
            
            const deleteScript = path.resolve(process.cwd(), '..', 'delete_music_file.py');
            const deleteProcess = spawn('python', [deleteScript, filename], {
                cwd: path.resolve(process.cwd(), '..')
            });
            
            deleteProcess.stdout.on('data', (data) => {
                stdout += data.toString();
            });
            
            deleteProcess.stderr.on('data', (data) => {
                stderr += data.toString();
            });
            
            deleteProcess.on('close', (code) => {
                resolve({ stdout, stderr });
            });
            
            deleteProcess.on('error', (error) => {
                reject(error);
            });
        });
        
        if (stderr) {
            console.error('Delete music stderr:', stderr);
        }
        
        const result = JSON.parse(stdout.trim());
        
        return NextResponse.json(result);
        
    } catch (error) {
        console.error('Error deleting music file:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to delete music file' },
            { status: 500 }
        );
    }
}