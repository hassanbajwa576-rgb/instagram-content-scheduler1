import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

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
    const {
      posts, // Array of { caption, image_url, video_url, hashtags }
      interval, // in minutes
      startTime, // ISO string
    } = body;

    if (!posts || posts.length === 0) {
      return NextResponse.json(
        { error: 'No posts provided' },
        { status: 400 }
      );
    }

    // For now, store in memory (in production, use database)
    // We'll create a queue that gets processed by a cron job
    const scheduledPosts = posts.map((post: any, index: number) => ({
      ...post,
      scheduledTime: new Date(new Date(startTime).getTime() + index * interval * 60000),
      status: 'pending',
    }));

    // In production, save to database
    console.log('Scheduling posts:', scheduledPosts);

    return NextResponse.json({
      success: true,
      message: `${posts.length} posts scheduled successfully`,
      posts: scheduledPosts,
    });
  } catch (error: any) {
    console.error('Schedule error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to schedule posts' },
      { status: 500 }
    );
  }
}
