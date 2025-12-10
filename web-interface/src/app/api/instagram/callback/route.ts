import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

// Development mode flag
const DEV_MODE = process.env.DEV_MODE === 'true' || false; // Default to false to use real API

// These should be environment variables
const INSTAGRAM_APP_ID = process.env.INSTAGRAM_APP_ID || 'development_app_id';
const INSTAGRAM_APP_SECRET = process.env.INSTAGRAM_APP_SECRET || 'development_app_secret';
const INSTAGRAM_REDIRECT_URI = process.env.INSTAGRAM_REDIRECT_URI || 'http://localhost:3000/api/instagram/callback';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const error = url.searchParams.get('error');

  if (error) {
    console.error('Instagram OAuth Error:', error, url.searchParams.get('error_description'));
    return NextResponse.redirect(
      new URL('/?error=instagram_auth_failed&message=' + encodeURIComponent(error), request.url).origin
    );
  }

  // For development mode, use mock data
  if (DEV_MODE || state === 'development') {
    // Set mock cookies
    const cookieStore = await cookies();
    cookieStore.set('instagram_access_token', 'mock_access_token', {
      path: '/',
      maxAge: 60 * 60 * 24 * 30, // 30 days
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production'
    });
    
    cookieStore.set('instagram_user_info', JSON.stringify({
      username: 'mock_instagram_user',
      name: 'Mock Instagram User',
      profile_picture: 'https://via.placeholder.com/150'
    }), {
      path: '/',
      maxAge: 60 * 60 * 24 * 30,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production'
    });

    // Redirect back to the main application
    return NextResponse.redirect(
      new URL('/?instagram_connected=true&username=mock_instagram_user', request.url).origin
    );
  }

  // In a real application, exchange the code for an access token
  if (!code) {
    return NextResponse.redirect(
      new URL('/?error=instagram_auth_failed&message=No+authorization+code+received', request.url).origin
    );
  }

  try {
    // Exchange the code for an access token
    const tokenResponse = await fetch('https://api.instagram.com/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: INSTAGRAM_APP_ID,
        client_secret: INSTAGRAM_APP_SECRET,
        grant_type: 'authorization_code',
        redirect_uri: INSTAGRAM_REDIRECT_URI,
        code: code,
      }),
    });

    const tokenData = await tokenResponse.json();

    if (!tokenResponse.ok || !tokenData.access_token) {
      console.error('Instagram token exchange failed:', tokenData);
      return NextResponse.redirect(
        new URL('/?error=instagram_auth_failed&message=Token+exchange+failed', request.url).origin
      );
    }

    // Store the access token in a secure HTTP-only cookie
    const cookieStore = await cookies();
    cookieStore.set('instagram_access_token', tokenData.access_token, {
      path: '/',
      maxAge: 60 * 60 * 24 * 60, // Instagram tokens are typically valid for 60 days
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production'
    });

    // Store the user ID
    cookieStore.set('instagram_user_id', tokenData.user_id, {
      path: '/',
      maxAge: 60 * 60 * 24 * 60,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production'
    });

    // Get additional user information
    try {
      const userInfoResponse = await fetch(`https://graph.instagram.com/me?fields=id,username&access_token=${tokenData.access_token}`);
      const userInfo = await userInfoResponse.json();
      
      if (userInfoResponse.ok) {
        cookieStore.set('instagram_username', userInfo.username, {
          path: '/',
          maxAge: 60 * 60 * 24 * 60,
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production'
        });
      }
    } catch (error) {
      console.error('Error fetching Instagram user info:', error);
    }

    // Redirect back to the main application
    return NextResponse.redirect(
      new URL('/?instagram_connected=true', request.url).origin
    );
  } catch (error) {
    console.error('Instagram token exchange error:', error);
    return NextResponse.redirect(
      new URL('/?error=instagram_auth_failed&message=Token+exchange+error', request.url).origin
    );
  }
} 