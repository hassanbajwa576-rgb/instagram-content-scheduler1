import { NextRequest, NextResponse } from 'next/server';
import { claimLinkedinPost, markLinkedinPostDone, markLinkedinPostFailed } from '@/lib/db';
import { publishLinkedinQueuedPost } from '@/lib/linkedin';
import { getSessionUserId } from '@/lib/session';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

/** POST /api/linkedin/posts/publish { id }: publish one queued LinkedIn post right now. */
export async function POST(request: NextRequest) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const { id } = await request.json().catch(() => ({ id: NaN }));
  const postId = Number(id);
  if (!Number.isInteger(postId)) {
    return NextResponse.json({ error: 'A post id is required' }, { status: 400 });
  }

  const post = await claimLinkedinPost(postId, userId);
  if (!post) {
    return NextResponse.json(
      { error: 'Post not found, or it is already published/publishing' },
      { status: 404 }
    );
  }
  try {
    const liId = await publishLinkedinQueuedPost(post);
    await markLinkedinPostDone(post.id, liId);
    return NextResponse.json({ success: true, postId: liId });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to publish to LinkedIn';
    await markLinkedinPostFailed(post.id, message);
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
