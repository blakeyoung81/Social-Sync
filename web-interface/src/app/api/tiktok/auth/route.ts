import { NextResponse } from 'next/server';
import { auth } from '@/app/api/auth/[...nextauth]/route';


// Development mode flag
const DEV_MODE = process.env.DEV_MODE === 'true' || true; // Default to true if not set

// This is a placeholder. Replace with your actual TikTok App Client ID and Redirect URI
const TIKTOK_CLIENT_ID = process.env.TIKTOK_CLIENT_ID || 'development_client_id';
// Ensure this redirect URI is registered in your TikTok Developer App settings
const TIKTOK_REDIRECT_URI = process.env.TIKTOK_REDIRECT_URI || 'http://localhost:3000/api/tiktok/callback';

// Define the scopes your application needs
// video.upload is for uploading to the user's inbox/drafts to be published from the TikTok app.
// video.publish is for direct posting (requires additional permissions and review by TikTok).
// For initial setup, video.upload is generally recommended.
const TIKTOK_SCOPES = 'user.info.basic,video.upload'; // Add other scopes as needed, comma-separated

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.redirect(new URL('/login?error=not_authenticated', request.url));
  }
  if (DEV_MODE) {
    // In development mode, redirect directly to callback with mock data
    return NextResponse.redirect(
      new URL(`/api/tiktok/callback?code=mock_auth_code&state=development`, request.url)
    );
  }

  // For production, do the normal OAuth flow
  if (!TIKTOK_CLIENT_ID || TIKTOK_CLIENT_ID === 'YOUR_TIKTOK_CLIENT_ID') {
    return NextResponse.json(
      { error: 'TikTok Client ID not configured. Please set TIKTOK_CLIENT_ID environment variable.' },
      { status: 500 }
    );
  }

  // Generate a random state parameter for security
  const state = Math.random().toString(36).substring(2, 15);

  // Build the TikTok authorization URL
  const authUrl = new URL('https://www.tiktok.com/auth/authorize/');
  authUrl.searchParams.append('client_key', TIKTOK_CLIENT_ID);
  authUrl.searchParams.append('response_type', 'code');
  authUrl.searchParams.append('scope', TIKTOK_SCOPES);
  authUrl.searchParams.append('redirect_uri', TIKTOK_REDIRECT_URI);
  authUrl.searchParams.append('state', state);

  // Redirect to TikTok's authorization page
  return NextResponse.redirect(authUrl.toString());
} 