import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    const tempDir = path.join(process.cwd(), 'public', 'temp_broll');
    await fs.mkdir(tempDir, { recursive: true });
    
    const fileBuffer = Buffer.from(await file.arrayBuffer());
    const filePath = path.join(tempDir, file.name);
    
    await fs.writeFile(filePath, fileBuffer);
    
    const fileUrl = `/temp_broll/${file.name}`;

    return NextResponse.json({ success: true, url: fileUrl });
  } catch (error) {
    console.error('Error uploading file:', error);
    return NextResponse.json({ error: 'Error uploading file' }, { status: 500 });
  }
} 