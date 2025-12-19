import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

// These should be environment variables
const FACEBOOK_APP_ID = process.env.FACEBOOK_APP_ID;
const FACEBOOK_REDIRECT_URI = process.env.FACEBOOK_REDIRECT_URI || 'http://localhost:3000/api/facebook/callback';

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.redirect(new URL('/login?error=not_authenticated', request.url));
  }
  // Check if Facebook App ID is configured
  if (!FACEBOOK_APP_ID) {
    return NextResponse.json(
      { error: 'Facebook App ID not configured. Please set FACEBOOK_APP_ID environment variable.' },
      { status: 500 }
    );
  }

  // Generate a random state parameter for security
  const state = Math.random().toString(36).substring(2, 15);

  // Build the Facebook authorization URL
  const authUrl = new URL('https://www.facebook.com/v18.0/dialog/oauth');
  authUrl.searchParams.append('client_id', FACEBOOK_APP_ID);
  authUrl.searchParams.append('redirect_uri', FACEBOOK_REDIRECT_URI);
  authUrl.searchParams.append('scope', 'pages_manage_posts,pages_read_engagement,pages_show_list,publish_video'); // Facebook permissions
  authUrl.searchParams.append('response_type', 'code');
  authUrl.searchParams.append('state', state);

  // Redirect to Facebook's authorization page
  return NextResponse.redirect(authUrl.toString());
} 