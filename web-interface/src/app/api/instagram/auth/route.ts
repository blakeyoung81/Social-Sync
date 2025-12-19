import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

// Development mode flag
const DEV_MODE = process.env.DEV_MODE === 'true' || true; // Default to true if not set

// These should be environment variables
const INSTAGRAM_APP_ID = process.env.INSTAGRAM_APP_ID || 'development_app_id';
const INSTAGRAM_REDIRECT_URI = process.env.INSTAGRAM_REDIRECT_URI || 'http://localhost:3000/api/instagram/callback';

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.redirect(new URL('/login?error=not_authenticated', request.url));
  }
  if (DEV_MODE) {
    // In development mode, redirect directly to callback with mock data
    return NextResponse.redirect(
      new URL(`/api/instagram/callback?code=mock_auth_code&state=development`, request.url)
    );
  }

  // For production, do the normal OAuth flow
  if (!INSTAGRAM_APP_ID || INSTAGRAM_APP_ID === 'YOUR_INSTAGRAM_APP_ID') {
    return NextResponse.json(
      { error: 'Instagram App ID not configured. Please set INSTAGRAM_APP_ID environment variable.' },
      { status: 500 }
    );
  }

  // Generate a random state parameter for security
  const state = Math.random().toString(36).substring(2, 15);

  // Build the Instagram authorization URL
  // Instagram authentication happens through Facebook's OAuth system
  const authUrl = new URL('https://api.instagram.com/oauth/authorize');
  authUrl.searchParams.append('client_id', INSTAGRAM_APP_ID);
  authUrl.searchParams.append('redirect_uri', INSTAGRAM_REDIRECT_URI);
  authUrl.searchParams.append('scope', 'user_profile,user_media'); // Add other scopes as needed
  authUrl.searchParams.append('response_type', 'code');
  authUrl.searchParams.append('state', state);

  // Redirect to Instagram's authorization page
  return NextResponse.redirect(authUrl.toString());
} 