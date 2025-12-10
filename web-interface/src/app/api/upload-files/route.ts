import { NextResponse } from 'next/server';
import { writeFile } from 'fs/promises';
import path from 'path';
import fs from 'fs';

export async function POST(request: Request) {
    try {
        const formData = await request.formData();
        const files = formData.getAll('videos');

        if (!files || files.length === 0) {
            return NextResponse.json(
                { success: false, message: 'No files provided' },
                { status: 400 }
            );
        }

        const uploadDir = path.join(process.cwd(), '..', 'data', 'input_videos');
        
        // Ensure the upload directory exists
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }

        const savedFiles = await Promise.all(
            files.map(async (file: FormDataEntryValue) => {
                if (file instanceof File) {
                    const bytes = await file.arrayBuffer();
                    const buffer = Buffer.from(bytes);
                    const filePath = path.join(uploadDir, file.name);
                    await writeFile(filePath, buffer);
                    return file.name;
                } else {
                    throw new Error('Invalid file type');
                }
            })
        );

        return NextResponse.json({
            success: true,
            message: `Successfully uploaded ${savedFiles.length} files`,
            files: savedFiles
        });
    } catch (error) {
        console.error('Error in upload-files route:', error);
        return NextResponse.json(
            {
                success: false,
                message: 'Error uploading files',
                error: error instanceof Error ? error.message : String(error)
            },
            { status: 500 }
        );
    }
} 