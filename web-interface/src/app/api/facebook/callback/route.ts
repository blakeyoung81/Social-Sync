import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { auth } from '@/app/api/auth/[...nextauth]/route';

import { prisma } from '@/lib/prisma';

// These should be environment variables
const FACEBOOK_APP_ID = process.env.FACEBOOK_APP_ID;
const FACEBOOK_APP_SECRET = process.env.FACEBOOK_APP_SECRET;
const FACEBOOK_REDIRECT_URI = process.env.FACEBOOK_REDIRECT_URI || 'http://localhost:3000/api/facebook/callback';

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
    console.error('Facebook OAuth Error:', error, url.searchParams.get('error_description'));
    return NextResponse.redirect(
      new URL('/dashboard?facebook_error=' + encodeURIComponent(error), request.url)
    );
  }

  // In a real application, exchange the code for an access token
  if (!code) {
    return NextResponse.redirect(
      new URL('/?error=facebook_auth_failed&message=No+authorization+code+received', request.url)
    );
  }

  try {
    // Exchange the code for an access token
    const tokenUrl = new URL('https://graph.facebook.com/v18.0/oauth/access_token');
    tokenUrl.searchParams.append('client_id', FACEBOOK_APP_ID);
    tokenUrl.searchParams.append('client_secret', FACEBOOK_APP_SECRET);
    tokenUrl.searchParams.append('redirect_uri', FACEBOOK_REDIRECT_URI);
    tokenUrl.searchParams.append('code', code);

    const tokenResponse = await fetch(tokenUrl.toString());
    const tokenData = await tokenResponse.json();

    if (!tokenResponse.ok || !tokenData.access_token) {
      console.error('Facebook token exchange failed:', tokenData);
      return NextResponse.redirect(
        new URL('/?error=facebook_auth_failed&message=Token+exchange+failed', request.url)
      );
    }

    // Exchange short-lived token for long-lived token
    const longLivedTokenUrl = new URL('https://graph.facebook.com/v18.0/oauth/access_token');
    longLivedTokenUrl.searchParams.append('grant_type', 'fb_exchange_token');
    longLivedTokenUrl.searchParams.append('client_id', FACEBOOK_APP_ID);
    longLivedTokenUrl.searchParams.append('client_secret', FACEBOOK_APP_SECRET);
    longLivedTokenUrl.searchParams.append('fb_exchange_token', tokenData.access_token);

    const longLivedResponse = await fetch(longLivedTokenUrl.toString());
    const longLivedData = await longLivedResponse.json();

    const finalAccessToken = longLivedResponse.ok && longLivedData.access_token 
      ? longLivedData.access_token 
      : tokenData.access_token;

    // Store the access token in a secure HTTP-only cookie
    const cookieStore = await cookies();
    cookieStore.set('facebook_access_token', finalAccessToken, {
      path: '/',
      maxAge: 60 * 60 * 24 * 60, // 60 days
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production'
    });

    // Get user information
    let userInfo = null;
    try {
      const userInfoResponse = await fetch(`https://graph.facebook.com/v18.0/me?fields=id,name,picture&access_token=${finalAccessToken}`);
      userInfo = await userInfoResponse.json();
      
      if (userInfoResponse.ok) {
        cookieStore.set('facebook_user_info', JSON.stringify(userInfo), {
          path: '/',
          maxAge: 60 * 60 * 24 * 60,
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production'
        });
      }
    } catch (error) {
      console.error('Error fetching Facebook user info:', error);
    }

    // Get user's Facebook pages (required for posting)
    let pages = [];
    try {
      const pagesResponse = await fetch(`https://graph.facebook.com/v18.0/me/accounts?access_token=${finalAccessToken}`);
      const pagesData = await pagesResponse.json();
      
      if (pagesResponse.ok && pagesData.data) {
        pages = pagesData.data.map(page => ({
          id: page.id,
          name: page.name,
          access_token: page.access_token
        }));

        cookieStore.set('facebook_pages', JSON.stringify(pages), {
          path: '/',
          maxAge: 60 * 60 * 24 * 60,
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production'
        });
      }
    } catch (error) {
      console.error('Error fetching Facebook pages:', error);
    }

    // Save connection to database
    await prisma.socialConnection.upsert({
      where: {
        userId_platform: {
          userId: session.user.id,
          platform: 'facebook',
        },
      },
      update: {
        platformUserId: userInfo?.id,
        platformUsername: userInfo?.name,
        accessToken: finalAccessToken,
        metadata: JSON.stringify({
          name: userInfo?.name,
          picture: userInfo?.picture?.data?.url,
          pages: pages,
        }),
        updatedAt: new Date(),
      },
      create: {
        userId: session.user.id,
        platform: 'facebook',
        platformUserId: userInfo?.id,
        platformUsername: userInfo?.name,
        accessToken: finalAccessToken,
        metadata: JSON.stringify({
          name: userInfo?.name,
          picture: userInfo?.picture?.data?.url,
          pages: pages,
        }),
      },
    });

    // Redirect back to dashboard
    const redirectUrl = new URL('/dashboard', request.url);
    redirectUrl.searchParams.append('facebook_connected', 'true');
    if (userInfo?.name) {
      redirectUrl.searchParams.append('user_name', userInfo.name);
    }

    return NextResponse.redirect(redirectUrl.toString());
  } catch (error) {
    console.error('Facebook token exchange error:', error);
    return NextResponse.redirect(
      new URL('/?error=facebook_auth_failed&message=Token+exchange+error', request.url)
    );
  }
} 