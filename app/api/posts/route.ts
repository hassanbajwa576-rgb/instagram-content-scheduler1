import { NextRequest, NextResponse } from 'next/server';
import { deletePendingPost, getLinkedinAccount, getUser, insertPosts, isLinkedinOnlyId, listPosts } from '@/lib/db';
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

/** GET /api/posts: the logged-in user's scheduled posts. */
export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  try {
    const posts = await listPosts(userId);
    return NextResponse.json({ posts });
  } catch (error) {
    console.error('List error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to load posts' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/posts: schedule posts.
 * Body: { posts: [{ caption, imageUrl|image_url, videoUrl|video_url, hashtags }],
 *         interval (minutes between posts, default 60), startTime (ISO, default now),
 *         linkedin (true to also post each one to the connected LinkedIn profile) }
 */
export async function POST(request: NextRequest) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  try {
    const igUser = await getUser(userId);
    if (!igUser || isLinkedinOnlyId(userId) || !igUser.access_token) {
      return NextResponse.json(
        { error: 'Connect Instagram first. You are signed in with LinkedIn only.' },
        { status: 400 }
      );
    }
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

    const postToLinkedin = body.linkedin === true;
    if (postToLinkedin) {
      const account = await getLinkedinAccount(userId);
      if (!account) {
        return NextResponse.json(
          { error: 'Connect LinkedIn first, or turn off "Also post to LinkedIn".' },
          { status: 400 }
        );
      }
    }

    const prepared = [];
    for (let i = 0; i < rawPosts.length; i++) {
      const p = rawPosts[i] as Record<string, unknown>;
      const caption = typeof p.caption === 'string' ? p.caption.trim() : '';
      const imageUrl = toUrl(p.imageUrl ?? p.image_url);
      const videoUrl = toUrl(p.videoUrl ?? p.video_url);

      if (!caption) {
        return NextResponse.json({ error: `Post ${i + 1}: caption is required` }, { status: 400 });
      }
      if (!imageUrl && !videoUrl) {
        return NextResponse.json(
          { error: `Post ${i + 1}: needs an imageUrl or videoUrl (Instagram requires media)` },
          { status: 400 }
        );
      }

      prepared.push({
        caption,
        imageUrl: videoUrl ? null : imageUrl,
        videoUrl,
        hashtags: toHashtags(p.hashtags),
        scheduledTime: new Date(start.getTime() + i * interval * 60_000),
        postToLinkedin,
      });
    }

    const posts = await insertPosts(userId, prepared);
    return NextResponse.json({
      success: true,
      message: `${posts.length} post${posts.length === 1 ? '' : 's'} scheduled`,
      posts,
    });
  } catch (error) {
    console.error('Schedule error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to schedule posts' },
      { status: 500 }
    );
  }
}

/** DELETE /api/posts?id=123: remove a pending or failed post. */
export async function DELETE(request: NextRequest) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const id = Number(request.nextUrl.searchParams.get('id'));
  if (!Number.isInteger(id)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });

  try {
    const removed = await deletePendingPost(id, userId);
    if (!removed) {
      return NextResponse.json(
        { error: 'Post not found, or it is already published/publishing' },
        { status: 404 }
      );
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete post' },
      { status: 500 }
    );
  }
}
