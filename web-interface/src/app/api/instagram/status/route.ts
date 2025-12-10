import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const accessToken = cookieStore.get('instagram_access_token')?.value;
    const userInfoCookie = cookieStore.get('instagram_user_info')?.value;
    const userId = cookieStore.get('instagram_user_id')?.value;
    const username = cookieStore.get('instagram_username')?.value;

    if (!accessToken) {
      return NextResponse.json({ 
        authenticated: false,
        message: 'No Instagram access token found'
      });
    }

    let userInfo = null;

    if (userInfoCookie) {
      try {
        userInfo = JSON.parse(userInfoCookie);
      } catch (e) {
        console.error('Error parsing Instagram user info:', e);
      }
    }

    // Combine available user data
    const userData = {
      id: userId,
      username: username,
      ...userInfo
    };

    return NextResponse.json({
      authenticated: true,
      user: userData,
      message: `Connected to Instagram as @${username || userInfo?.username || 'Unknown User'}`
    });

  } catch (error) {
    console.error('Error checking Instagram status:', error);
    return NextResponse.json({
      authenticated: false,
      error: 'Failed to check Instagram authentication status'
    }, { status: 500 });
  }
} 