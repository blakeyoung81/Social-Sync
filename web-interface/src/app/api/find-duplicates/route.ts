import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export async function GET() {
  try {
            // Use the virtual environment Python
        const pythonPath = path.resolve(process.cwd(), '..', '.venv', 'bin', 'python');
        const { stdout, stderr } = await execAsync(`"${pythonPath}" scripts/duplicate_cleanup/find_duplicates.py --json`);

    if (stderr) {
      console.error('Error finding duplicates:', stderr);
      return NextResponse.json({ error: 'Failed to find duplicates.' }, { status: 500 });
    }

    const duplicates = JSON.parse(stdout);
    
    // Convert the flat structure to the expected format for the UI
    const duplicateSets = [];
    
    // Process exact filename duplicates
    if (duplicates.exact_filenames) {
      for (const [filename, files] of Object.entries(duplicates.exact_filenames)) {
        const fileArray = files as any[];
        duplicateSets.push({
          hash: `filename_${filename}`,
          files: fileArray.map((file: any) => ({
            file: file.path,
            hash: `filename_${filename}`,
            size: file.size
          })),
          size: fileArray[0]?.size || 0
        });
      }
    }
    
    // Process content hash duplicates if available
    if (duplicates.content_hash) {
      for (const [hash, files] of Object.entries(duplicates.content_hash)) {
        const fileArray = files as any[];
        duplicateSets.push({
          hash,
          files: fileArray.map((file: any) => ({
            file: file.path,
            hash,
            size: file.size
          })),
          size: fileArray[0]?.size || 0
        });
      }
    }

    return NextResponse.json({ duplicates: duplicateSets });

  } catch (error) {
    console.error('Error executing script:', error);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
} 