import { NextRequest, NextResponse } from 'next/server';
import { deleteLinkedinPost, getLinkedinAccount, insertLinkedinPosts, listLinkedinPosts } from '@/lib/db';
import { getSessionUserId } from '@/lib/session';

export const dynamic = 'force-dynamic';

const MAX_POSTS = 50;

function toUrl(value: unknown): string | null {
  if (typeof value !== 'string' || !value.trim()) return null;
  try {
    const u = new URL(value.trim());
    return u.protocol === 'https:' || u.protocol === 'http:' ? u.toString() : null;
  } catch {
    return null;
  }
}

function toHashtags(value: unknown): string | null {
  if (Array.isArray(value)) {
    const tags = value.map((t) => String(t).trim()).filter(Boolean);
    return tags.length ? tags.join(' ') : null;
  }
  if (typeof value === 'string' && value.trim()) return value.trim();
  return null;
}

/** GET /api/linkedin/posts: the logged-in user's LinkedIn queue. */
export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  try {
    return NextResponse.json({ posts: await listLinkedinPosts(userId) });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to load posts' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/linkedin/posts: schedule LinkedIn-only posts.
 * Body: { posts: [{ caption, imageUrl?, videoUrl?, hashtags? }], interval (minutes, default 60), startTime (ISO) }
 * Media is optional: a post with no media is a text post.
 */
export async function POST(request: NextRequest) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  try {
    const body = await request.json();
    const rawPosts: unknown = body.posts;
    if (!Array.isArray(rawPosts) || rawPosts.length === 0) {
      return NextResponse.json({ error: 'No posts provided' }, { status: 400 });
    }
    if (rawPosts.length > MAX_POSTS) {
      return NextResponse.json({ error: `At most ${MAX_POSTS} posts at a time` }, { status: 400 });
    }

    const interval = Number(body.interval ?? 60);
    if (!Number.isFinite(interval) || interval < 0) {
      return NextResponse.json({ error: 'interval must be a number of minutes' }, { status: 400 });
    }
    const start = body.startTime ? new Date(body.startTime) : new Date();
    if (Number.isNaN(start.getTime())) {
      return NextResponse.json({ error: 'startTime is not a valid date' }, { status: 400 });
    }

    if (!(await getLinkedinAccount(userId))) {
      return NextResponse.json({ error: 'Connect LinkedIn first.' }, { status: 400 });
    }

    const prepared = [];
    for (let i = 0; i < rawPosts.length; i++) {
      const p = rawPosts[i] as Record<string, unknown>;
      const caption = typeof p.caption === 'string' ? p.caption.trim() : '';
      if (!caption) {
        return NextResponse.json({ error: `Post ${i + 1}: caption is required` }, { status: 400 });
      }
      const imageUrl = toUrl(p.imageUrl ?? p.image_url);
      const videoUrl = toUrl(p.videoUrl ?? p.video_url);
      prepared.push({
        caption,
        imageUrl: videoUrl ? null : imageUrl,
        videoUrl,
        hashtags: toHashtags(p.hashtags),
        scheduledTime: new Date(start.getTime() + i * interval * 60_000),
      });
    }

    const posts = await insertLinkedinPosts(userId, prepared);
    return NextResponse.json({
      success: true,
      message: `${posts.length} LinkedIn post${posts.length === 1 ? '' : 's'} scheduled`,
      posts,
    });
  } catch (error) {
    console.error('LinkedIn schedule error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to schedule posts' },
      { status: 500 }
    );
  }
}

/** DELETE /api/linkedin/posts?id=123: remove a pending or failed LinkedIn post. */
export async function DELETE(request: NextRequest) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  const id = Number(request.nextUrl.searchParams.get('id'));
  if (!Number.isInteger(id)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
  const removed = await deleteLinkedinPost(id, userId);
  if (!removed) {
    return NextResponse.json(
      { error: 'Post not found, or it is already published/publishing' },
      { status: 404 }
    );
  }
  return NextResponse.json({ success: true });
}
