import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const TOKEN_PATH = path.join(process.cwd(), '..', 'config', 'token.json');

export async function POST(request: Request) {
  try {
    const { accountId, channelId, accountEmail } = await request.json();
    
    if (!accountId || !channelId) {
      return NextResponse.json({
        success: false,
        error: 'Missing accountId or channelId'
      }, { status: 400 });
    }

    console.log(`Setting active account: ${accountEmail} (${accountId}) for channel: ${channelId}`);
    
    // Store the active account information for the Python backend
    // This creates a simple mapping that the process-videos endpoint can use
    const activeAccountInfo = {
      accountId,
      channelId,
      accountEmail,
      timestamp: new Date().toISOString()
    };
    
    // Save this to a temporary file that the Python backend can read
    const activeAccountPath = path.join(process.cwd(), '..', 'config', 'active_youtube_account.json');
    try {
      fs.writeFileSync(activeAccountPath, JSON.stringify(activeAccountInfo, null, 2));
      console.log(`Active account info saved to ${activeAccountPath}`);
    } catch (writeError) {
      console.error('Failed to save active account info:', writeError);
    }
    
    return NextResponse.json({
      success: true,
      message: `Active account set to ${accountEmail} for channel ${channelId}`,
      activeAccount: activeAccountInfo
    });

  } catch (error) {
    console.error('Error setting active account:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to set active account',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}

export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
} 