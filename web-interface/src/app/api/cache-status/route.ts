import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import { writeFile, unlink } from 'fs/promises';
import path, { join } from 'path';
import { tmpdir } from 'os';

const execAsync = promisify(exec);

export async function GET(request: NextRequest) {
  try {
    // Create a temporary Python file for better syntax handling
    const tempFile = join(tmpdir(), `cache_status_${Date.now()}.py`);
    const pythonScript = `
import sys
import os
sys.path.append("../src")
from workflows.cache_manager import YouTubeCacheManager
from pathlib import Path
import json
import math

def clean_data(obj):
    if isinstance(obj, dict):
        return {k: clean_data(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [clean_data(item) for item in obj]
    elif isinstance(obj, float) and (math.isinf(obj) or math.isnan(obj)):
        return None
    else:
        return obj

try:
    cache_manager = YouTubeCacheManager(Path("..").resolve())
    status = cache_manager.get_cache_status()
    report = cache_manager.get_quota_savings_report()
    
    cleaned_status = clean_data(status)
    cleaned_report = clean_data(report)
    
    print(json.dumps({"cache_status": cleaned_status, "quota_report": cleaned_report}))
except Exception as e:
    print(json.dumps({"error": str(e)}))
`;

    await writeFile(tempFile, pythonScript);
    
    try {
              // Use the virtual environment Python
        const pythonPath = path.resolve(process.cwd(), '..', '.venv', 'bin', 'python');
        const { stdout, stderr } = await execAsync(`"${pythonPath}" "${tempFile}"`, { cwd: process.cwd() });
      await unlink(tempFile); // Clean up temp file

      if (stderr) {
        console.error('Cache status stderr:', stderr);
      }

      const data = JSON.parse(stdout);
      
      if (data.error) {
        throw new Error(data.error);
      }
      
      return NextResponse.json(data);
    } catch (execError) {
      await unlink(tempFile).catch(() => {}); // Clean up on error
      throw execError;
    }
  } catch (error) {
    console.error('Error getting cache status:', error);
    
    // Return mock data if Python fails
    const mockData = {
      cache_status: {
        scheduled_videos: {
          exists: false,
          age_hours: null,
          status: 'missing',
          last_updated: null,
          data_count: 0
        },
        playlists: {
          exists: false,
          age_hours: null,
          status: 'missing',
          last_updated: null,
          data_count: 0
        },
        total_quota_saved: 0,
        recommendations: ['Initialize cache by running a video discovery or upload']
      },
      quota_report: {
        total_quota_saved: 0,
        total_quota_used: 0,
        efficiency_ratio: 1,
        scheduled_videos: {
          cache_hits: 0,
          quota_per_hit_saved: 500,
          total_saved: 0
        },
        playlists: {
          cache_hits: 0,
          quota_per_hit_saved: 50,
          total_saved: 0
        }
      }
    };
    
    return NextResponse.json(mockData);
  }
} 