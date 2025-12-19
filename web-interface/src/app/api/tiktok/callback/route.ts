import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { auth } from '@/app/api/auth/[...nextauth]/route';

import { prisma } from '@/lib/prisma';

// Development mode flag
const DEV_MODE = process.env.DEV_MODE === 'true' || false; // Default to false to use real API

// These should be environment variables in production
const TIKTOK_CLIENT_KEY = process.env.TIKTOK_CLIENT_KEY || 'development_client_key';
const TIKTOK_CLIENT_SECRET = process.env.TIKTOK_CLIENT_SECRET || 'development_client_secret';
const TIKTOK_REDIRECT_URI = process.env.TIKTOK_REDIRECT_URI || 'http://localhost:3000/api/tiktok/callback';

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.redirect(new URL('/login?error=not_authenticated', request.url));
  }

  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const error = url.searchParams.get('error');

  if (error) {
    console.error('TikTok OAuth Error:', error, url.searchParams.get('error_description'));
    return NextResponse.redirect(
      new URL('/dashboard?tiktok_error=' + encodeURIComponent(error), request.url)
    );
  }

  // For development mode, use mock data
  if (DEV_MODE || state === 'development') {
    // Set mock cookies
    const cookieStore = await cookies();
    cookieStore.set('tiktok_access_token', 'mock_access_token', {
      path: '/',
      maxAge: 60 * 60 * 24 * 30, // 30 days
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production'
    });
    
    cookieStore.set('tiktok_user_info', JSON.stringify({
      username: 'MockUser123',
      display_name: 'Mock TikTok User',
      avatar: 'https://via.placeholder.com/150'
    }), {
      path: '/',
      maxAge: 60 * 60 * 24 * 30,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production'
    });

    // Redirect back to the main application
    return NextResponse.redirect(
      new URL('/?tiktok_connected=true&username=MockUser123', request.url).origin
    );
  }

  // In a real application, exchange the code for an access token
  if (!code) {
    return NextResponse.redirect(
      new URL('/?error=tiktok_auth_failed&message=No+authorization+code+received', request.url).origin
    );
  }

  try {
    // Exchange the code for an access token
    const tokenResponse = await fetch('https://open.tiktokapis.com/v2/oauth/token/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_key: TIKTOK_CLIENT_KEY,
        client_secret: TIKTOK_CLIENT_SECRET,
        code: code,
        grant_type: 'authorization_code',
        redirect_uri: TIKTOK_REDIRECT_URI,
      }),
    });

    const tokenData = await tokenResponse.json();

    if (!tokenResponse.ok || !tokenData.access_token) {
      console.error('TikTok token exchange failed:', tokenData);
      return NextResponse.redirect(
        new URL('/?error=tiktok_auth_failed&message=Token+exchange+failed', request.url).origin
      );
    }

    // Store the access token in a secure HTTP-only cookie
    const cookieStore = await cookies();
    cookieStore.set('tiktok_access_token', tokenData.access_token, {
      path: '/',
      maxAge: tokenData.expires_in || 60 * 60 * 24 * 30,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production'
    });

    // Store the user ID
    cookieStore.set('tiktok_user_id', tokenData.open_id, {
      path: '/',
      maxAge: tokenData.expires_in || 60 * 60 * 24 * 30,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production'
    });

    // Get user information
    let username = tokenData.open_id;
    let displayName = null;
    try {
      const userInfoResponse = await fetch('https://open.tiktokapis.com/v2/user/info/', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${tokenData.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fields: ['open_id', 'username', 'display_name', 'avatar_url']
        }),
      });

      const userInfoData = await userInfoResponse.json();
      
      if (userInfoResponse.ok && userInfoData.data) {
        const userInfo = userInfoData.data.user;
        username = userInfo.username || tokenData.open_id;
        displayName = userInfo.display_name;
        cookieStore.set('tiktok_user_info', JSON.stringify(userInfo), {
          path: '/',
          maxAge: tokenData.expires_in || 60 * 60 * 24 * 30,
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production'
        });
      }
    } catch (error) {
      console.error('Error fetching TikTok user info:', error);
    }

    // Save connection to database
    await prisma.socialConnection.upsert({
      where: {
        userId_platform: {
          userId: session.user.id,
          platform: 'tiktok',
        },
      },
      update: {
        platformUserId: tokenData.open_id,
        platformUsername: username,
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token,
        expiresAt: tokenData.expires_in ? new Date(Date.now() + tokenData.expires_in * 1000) : null,
        metadata: JSON.stringify({
          open_id: tokenData.open_id,
          username: username,
          display_name: displayName,
        }),
        updatedAt: new Date(),
      },
      create: {
        userId: session.user.id,
        platform: 'tiktok',
        platformUserId: tokenData.open_id,
        platformUsername: username,
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token,
        expiresAt: tokenData.expires_in ? new Date(Date.now() + tokenData.expires_in * 1000) : null,
        metadata: JSON.stringify({
          open_id: tokenData.open_id,
          username: username,
          display_name: displayName,
        }),
      },
    });

    // Redirect back to dashboard
    return NextResponse.redirect(
      new URL('/dashboard?tiktok_connected=true', request.url)
    );

  } catch (error) {
    console.error('TikTok token exchange error:', error);
    return NextResponse.redirect(
      new URL('/?error=tiktok_auth_failed&message=Token+exchange+error', request.url).origin
    );
  }
} 