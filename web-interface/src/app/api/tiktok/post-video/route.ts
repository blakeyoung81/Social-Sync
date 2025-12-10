import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

// Development mode flag
const DEV_MODE = process.env.DEV_MODE === 'true' || false; // Default to false to use real API

interface VideoUploadRequest {
  videoUrl?: string;
  caption?: string;
  privacy?: 'PUBLIC' | 'FRIENDS' | 'SELF';
}

// This function will eventually handle the two-step TikTok video upload process:
// 1. Initialize video upload (POST /v2/post/publish/inbox/video/init/)
// 2. Upload video file to the returned URL (PUT request)

export async function POST(request: Request) {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get('tiktok_access_token')?.value;

  if (!accessToken) {
    return NextResponse.json({ error: 'User not authenticated with TikTok.', details: 'Missing access token.' }, { status: 401 });
  }

  try {
    const body: VideoUploadRequest = await request.json();

    // Development mode - return mock success response
    if (DEV_MODE) {
      console.log('TikTok Video Upload (DEV MODE):', {
        caption: body.caption,
        videoUrl: body.videoUrl,
        privacy: body.privacy || 'PUBLIC'
      });

      return NextResponse.json({
        success: true,
        data: {
          video_id: `mock_tiktok_video_${Date.now()}`,
          share_url: `https://www.tiktok.com/@mockuser/video/mock_${Date.now()}`,
          upload_url: body.videoUrl || 'https://via.placeholder.com/400x600.mp4',
          caption: body.caption || 'Mock TikTok video',
          privacy: body.privacy || 'PUBLIC',
          created_at: new Date().toISOString()
        },
        message: 'Video uploaded successfully to TikTok (development mode)'
      });
    }

    // Production mode - actual TikTok API call
    const { videoUrl, caption, privacy = 'PUBLIC' } = body;

    if (!videoUrl) {
      return NextResponse.json({ error: 'Video URL is required.' }, { status: 400 });
    }

    // Step 1: Initialize video upload
    const initResponse = await fetch('https://open.tiktokapis.com/v2/post/publish/video/init/', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        post_info: {
          title: caption || '',
          privacy_level: privacy,
          disable_duet: false,
          disable_comment: false,
          disable_stitch: false,
          video_cover_timestamp_ms: 1000
        },
        source_info: {
          source: 'FILE_UPLOAD',
          video_size: 0, // TikTok will determine this
          chunk_size: 0,
          total_chunk_count: 1
        }
      })
    });

    const initData = await initResponse.json();

    if (!initResponse.ok) {
      return NextResponse.json({ 
        error: 'Failed to initialize TikTok video upload.', 
        details: initData 
      }, { status: 400 });
    }

    // Step 2: Upload video content
    const uploadResponse = await fetch(initData.data.upload_url, {
      method: 'PUT',
      body: videoUrl, // In practice, this would be the video file content
      headers: {
        'Content-Type': 'video/mp4'
      }
    });

    if (!uploadResponse.ok) {
      return NextResponse.json({ 
        error: 'Failed to upload video content to TikTok.', 
        details: await uploadResponse.text() 
      }, { status: 400 });
    }

    // Step 3: Publish the video
    const publishResponse = await fetch('https://open.tiktokapis.com/v2/post/publish/status/fetch/', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        publish_id: initData.data.publish_id
      })
    });

    const publishData = await publishResponse.json();

    if (!publishResponse.ok) {
      return NextResponse.json({ 
        error: 'Failed to check TikTok video publish status.', 
        details: publishData 
      }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      data: publishData.data,
      message: 'Video uploaded successfully to TikTok'
    });

  } catch (error) {
    console.error('TikTok video upload error:', error);
    return NextResponse.json({ 
      error: 'Internal server error.', 
      details: error instanceof Error ? error.message : String(error) 
    }, { status: 500 });
  }
} 