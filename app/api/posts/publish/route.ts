import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import axios from 'axios';

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const accessToken = cookieStore.get('meta_access_token')?.value;
    const userId = cookieStore.get('instagram_user_id')?.value;

    if (!accessToken || !userId) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { caption, imageUrl, videoUrl, hashtags } = body;

    if (!caption) {
      return NextResponse.json(
        { error: 'Caption is required' },
        { status: 400 }
      );
    }

    const fullCaption = hashtags ? `${caption}\n\n${hashtags}` : caption;

    // Create container for image/video
    const containerData: any = {
      caption: fullCaption,
      access_token: accessToken,
    };

    if (imageUrl) {
      containerData.image_url = imageUrl;
    } else if (videoUrl) {
      containerData.video_url = videoUrl;
      containerData.media_type = 'VIDEO';
    }

    const containerResponse = await axios.post(
      `https://graph.instagram.com/v18.0/${userId}/media`,
      containerData
    );

    const containerId = containerResponse.data.id;

    // Publish the container
    const publishResponse = await axios.post(
      `https://graph.instagram.com/v18.0/${userId}/media_publish`,
      {
        creation_id: containerId,
        access_token: accessToken,
      }
    );

    return NextResponse.json({
      success: true,
      message: 'Post published successfully',
      postId: publishResponse.data.id,
    });
  } catch (error: any) {
    console.error('Publish error:', error.response?.data || error.message);
    return NextResponse.json(
      { error: error.response?.data?.error?.message || 'Failed to publish post' },
      { status: 500 }
    );
  }
}
