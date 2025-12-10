import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

// Development mode flag
const DEV_MODE = process.env.DEV_MODE === 'true' || false; // Default to false to use real API

interface MediaUploadRequest {
  mediaType: 'IMAGE' | 'VIDEO' | 'CAROUSEL';
  mediaUrl?: string;
  caption?: string;
}

export async function POST(request: Request) {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get('instagram_access_token')?.value;

  if (!accessToken) {
    return NextResponse.json({ error: 'User not authenticated with Instagram.', details: 'Missing access token.' }, { status: 401 });
  }

  try {
    const body: MediaUploadRequest = await request.json();

    // Development mode - return mock success response
    if (DEV_MODE) {
      console.log('Instagram Media Upload (DEV MODE):', {
        mediaType: body.mediaType,
        caption: body.caption,
        mediaUrl: body.mediaUrl
      });

      return NextResponse.json({
        success: true,
        data: {
          id: `mock_instagram_media_${Date.now()}`,
          media_type: body.mediaType,
          media_url: body.mediaUrl || 'https://via.placeholder.com/600x600',
          caption: body.caption || 'Mock Instagram post',
          timestamp: new Date().toISOString(),
          permalink: `https://www.instagram.com/p/mock_${Date.now()}/`
        },
        message: 'Media uploaded successfully (development mode)'
      });
    }

    // Production mode - actual Instagram API call
    const { mediaType, mediaUrl, caption } = body;

    if (!mediaUrl) {
      return NextResponse.json({ error: 'Media URL is required.' }, { status: 400 });
    }

    // Step 1: Create media object
    const createMediaResponse = await fetch(`https://graph.facebook.com/v18.0/me/media`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        image_url: mediaType === 'IMAGE' ? mediaUrl : undefined,
        video_url: mediaType === 'VIDEO' ? mediaUrl : undefined,
        media_type: mediaType,
        caption: caption || '',
        access_token: accessToken
      })
    });

    const mediaData = await createMediaResponse.json();

    if (!createMediaResponse.ok) {
      return NextResponse.json({ error: 'Failed to create media object.', details: mediaData }, { status: 400 });
    }

    // Step 2: Publish the media
    const userId = cookieStore.get('instagram_user_id')?.value;
    if (!userId) {
      return NextResponse.json({ error: 'User ID not found.' }, { status: 400 });
    }

    const publishResponse = await fetch(`https://graph.facebook.com/v18.0/${userId}/media_publish`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        creation_id: mediaData.id,
        access_token: accessToken
      })
    });

    const publishData = await publishResponse.json();

    if (!publishResponse.ok) {
      return NextResponse.json({ error: 'Failed to publish media.', details: publishData }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      data: publishData,
      message: 'Media posted to Instagram successfully'
    });

  } catch (error) {
    console.error('Instagram media upload error:', error);
    return NextResponse.json({ 
      error: 'Internal server error.', 
      details: error instanceof Error ? error.message : String(error) 
    }, { status: 500 });
  }
} 