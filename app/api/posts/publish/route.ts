import { NextRequest, NextResponse } from 'next/server';
import { claimPost, getUser, markFailed } from '@/lib/db';
import { startPost } from '@/lib/publish';
import { getSessionUserId } from '@/lib/session';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

/** POST /api/posts/publish { id }: publish one scheduled post right now. */
export async function POST(request: NextRequest) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const { id } = await request.json().catch(() => ({ id: NaN }));
  const postId = Number(id);
  if (!Number.isInteger(postId)) {
    return NextResponse.json({ error: 'A post id is required' }, { status: 400 });
  }

  try {
    const user = await getUser(userId);
    if (!user) return NextResponse.json({ error: 'Account not found. Log in again.' }, { status: 401 });
    if (!user.access_token) {
      return NextResponse.json({ error: 'Connect Instagram first.' }, { status: 400 });
    }

    const post = await claimPost(postId, userId);
    if (!post) {
      return NextResponse.json(
        { error: 'Post not found, or it is already published/publishing' },
        { status: 404 }
      );
    }

    try {
      // Wait up to 85s for Instagram to process a video; longer ones are finished by the cron job.
      const outcome = await startPost(post, userId, user.access_token, 85_000);
      if (outcome.state === 'processing') {
        return NextResponse.json(
          {
            success: true,
            processing: true,
            message: 'Instagram is still processing the video. It will be published automatically within a few minutes.',
          },
          { status: 202 }
        );
      }
      return NextResponse.json({ success: true, postId: outcome.metaPostId, linkedin: post.post_to_linkedin });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to publish post';
      await markFailed(post.id, message);
      return NextResponse.json({ error: message }, { status: 502 });
    }
  } catch (error) {
    console.error('Publish error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to publish post' },
      { status: 500 }
    );
  }
}
