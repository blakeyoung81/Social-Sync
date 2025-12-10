import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const accessToken = cookieStore.get('facebook_access_token')?.value;
    const userInfoCookie = cookieStore.get('facebook_user_info')?.value;
    const pagesCookie = cookieStore.get('facebook_pages')?.value;

    if (!accessToken) {
      return NextResponse.json({ 
        authenticated: false,
        message: 'No Facebook access token found'
      });
    }

    let userInfo = null;
    let pages = [];

    if (userInfoCookie) {
      try {
        userInfo = JSON.parse(userInfoCookie);
      } catch (e) {
        console.error('Error parsing Facebook user info:', e);
      }
    }

    if (pagesCookie) {
      try {
        pages = JSON.parse(pagesCookie);
      } catch (e) {
        console.error('Error parsing Facebook pages:', e);
      }
    }

    // Verify token is still valid (optional - can be expensive)
    // For now, we'll assume it's valid if it exists

    return NextResponse.json({
      authenticated: true,
      user: userInfo,
      pages: pages,
      pageCount: pages.length,
      message: `Connected to Facebook as ${userInfo?.name || 'Unknown User'} with ${pages.length} page(s)`
    });

  } catch (error) {
    console.error('Error checking Facebook status:', error);
    return NextResponse.json({
      authenticated: false,
      error: 'Failed to check Facebook authentication status'
    }, { status: 500 });
  }
} 