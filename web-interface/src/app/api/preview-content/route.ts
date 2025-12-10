import { NextResponse } from 'next/server';
import { spawn } from 'child_process';
import path from 'path';
import { writeFileSync, unlinkSync } from 'fs';
import { tmpdir } from 'os';

export async function POST(request: Request): Promise<Response> {
    try {
        const body = await request.json();
        const {
            title = "Sample Medical Education Video",
            description = "This is a sample description for medical education content about USMLE Step 1 preparation.",
            platforms = [],
            multiPlatformConfig,
            openaiKey,
            ayrshareKey
        } = body;

        if (!openaiKey) {
            return NextResponse.json({
                success: false,
                error: "OpenAI API key is required for content preview"
            }, { status: 400 });
        }

        if (platforms.length === 0) {
            return NextResponse.json({
                success: false,
                error: "At least one platform must be selected"
            }, { status: 400 });
        }

        // Create a Python script call to generate previews
        const pythonScript = `
import sys
import json
import os
sys.path.append('${path.join(process.cwd(), '..')}')

from src.core.ayrshare_client import AyrshareClient
import openai

try:
    # Initialize clients
    openai_client = openai.OpenAI(api_key="${openaiKey}")
    ayrshare_client = AyrshareClient("${ayrshareKey || 'demo-key'}", openai_client)
    
    # Generate previews
    platform_configs = ${JSON.stringify(multiPlatformConfig?.platforms || {})}
    
    previews = ayrshare_client.preview_content(
        title="${title.replace(/"/g, '\\"')}",
        description="${description.replace(/"/g, '\\"')}",
        platforms=${JSON.stringify(platforms)},
        platform_configs=platform_configs
    )
    
    print(json.dumps({
        "success": True,
        "previews": previews
    }))
    
except Exception as e:
    print(json.dumps({
        "success": False,
        "error": str(e)
    }))
`;

        // Write the script to a temporary file and execute it
        const tempFile = path.join(tmpdir(), `preview_${Date.now()}.py`);
        
        writeFileSync(tempFile, pythonScript);

        return new Promise<Response>((resolve) => {
            const pythonProcess = spawn('python', [tempFile], {
                cwd: path.join(process.cwd(), '..'),
                env: { 
                    ...process.env, 
                    PYTHONPATH: path.join(process.cwd(), '..'),
                    OPENAI_API_KEY: openaiKey
                }
            });

            let output = '';
            let error = '';

            pythonProcess.stdout.on('data', (data) => {
                output += data.toString();
            });

            pythonProcess.stderr.on('data', (data) => {
                error += data.toString();
            });

            pythonProcess.on('close', (code) => {
                // Clean up temp file
                try {
                    unlinkSync(tempFile);
                } catch {
                    console.warn('Failed to clean up temp file');
                }

                if (code === 0) {
                    try {
                        const result = JSON.parse(output.trim());
                        resolve(NextResponse.json(result));
                    } catch {
                        resolve(NextResponse.json({
                            success: false,
                            error: 'Failed to parse preview results',
                            details: output
                        }, { status: 500 }));
                    }
                } else {
                    resolve(NextResponse.json({
                        success: false,
                        error: 'Preview generation failed',
                        details: error,
                        code
                    }, { status: 500 }));
                }
            });

            pythonProcess.on('error', (err) => {
                // Clean up temp file
                try {
                    unlinkSync(tempFile);
                } catch {
                    console.warn('Failed to clean up temp file');
                }

                resolve(NextResponse.json({
                    success: false,
                    error: 'Failed to start preview generation',
                    details: err.message
                }, { status: 500 }));
            });
        });

    } catch (error) {
        console.error('Error in preview-content route:', error);
        return NextResponse.json({
            success: false,
            error: 'Internal server error',
            details: error instanceof Error ? error.message : String(error)
        }, { status: 500 });
    }
}

export async function OPTIONS(): Promise<Response> {
    return new Response(null, {
        status: 200,
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
        },
    });
} 