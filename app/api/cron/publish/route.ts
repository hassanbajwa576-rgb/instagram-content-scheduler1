import { NextRequest, NextResponse } from 'next/server';
import {
  claimDueLinkedinPosts,
  claimDuePosts,
  claimProcessingPosts,
  failStaleContainers,
  getUser,
  markFailed,
  markLinkedinPostDone,
  markLinkedinPostFailed,
  releaseStuckLinkedinPosts,
  releaseStuckPosts,
  upsertUser,
  type PostRow,
} from '@/lib/db';
import { refreshLongLivedToken } from '@/lib/instagram';
import { resumePost, startPost } from '@/lib/publish';
import { publishLinkedinQueuedPost } from '@/lib/linkedin';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

const BATCH = 5;
// How long to wait for Instagram to process a video before leaving it for the next run (5 posts x 30s fits in maxDuration).
const VIDEO_WAIT_MS = 30_000;
const REFRESH_WINDOW_MS = 10 * 24 * 60 * 60 * 1000; // refresh tokens expiring within 10 days

/**
 * Called by Vercel Cron. Publishes posts whose scheduled time has passed.
 * Vercel sends `Authorization: Bearer $CRON_SECRET` automatically once CRON_SECRET is set.
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get('Authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await releaseStuckPosts();
    await failStaleContainers();

    type Result = { id: number; status: 'posted' | 'failed' | 'processing'; detail: string };
    const results: Result[] = [];

    /** The account's access token, refreshed when it is close to expiring. */
    async function tokenFor(post: PostRow): Promise<string> {
      const user = await getUser(post.instagram_user_id);
      if (!user) throw new Error('Instagram account is no longer connected. Log in again.');

      let token = user.access_token;
      if (user.token_expires_at && user.token_expires_at.getTime() - Date.now() < REFRESH_WINDOW_MS) {
        try {
          const refreshed = await refreshLongLivedToken(token);
          token = refreshed.token;
          await upsertUser(user.instagram_user_id, user.username, token, refreshed.expiresAt);
        } catch (e) {
          console.warn('Token refresh failed:', e instanceof Error ? e.message : e);
        }
      }
      return token;
    }

    // 1. Finish videos Instagram was still processing on an earlier run.
    const waiting = await claimProcessingPosts(BATCH);
    for (const post of waiting) {
      try {
        const token = await tokenFor(post);
        const state = await resumePost(post, post.instagram_user_id, token);
        results.push({ id: post.id, status: state, detail: state === 'posted' ? 'published' : 'still processing' });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to publish';
        await markFailed(post.id, message);
        results.push({ id: post.id, status: 'failed', detail: message });
      }
    }

    // 2. Start posts that are now due.
    const due = await claimDuePosts(BATCH);
    for (const post of due) {
      try {
        const token = await tokenFor(post);
        const outcome = await startPost(post, post.instagram_user_id, token, VIDEO_WAIT_MS);
        results.push(
          outcome.state === 'posted'
            ? { id: post.id, status: 'posted', detail: outcome.metaPostId }
            : { id: post.id, status: 'processing', detail: 'Instagram is still processing the video' }
        );
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to publish';
        await markFailed(post.id, message);
        results.push({ id: post.id, status: 'failed', detail: message });
      }
    }

    // LinkedIn-only queue (separate from Instagram).
    await releaseStuckLinkedinPosts();
    const liDue = await claimDueLinkedinPosts(BATCH);
    const linkedinResults: { id: number; status: 'posted' | 'failed'; detail: string }[] = [];
    for (const post of liDue) {
      try {
        const liId = await publishLinkedinQueuedPost(post);
        await markLinkedinPostDone(post.id, liId);
        linkedinResults.push({ id: post.id, status: 'posted', detail: liId });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to publish to LinkedIn';
        await markLinkedinPostFailed(post.id, message);
        linkedinResults.push({ id: post.id, status: 'failed', detail: message });
      }
    }

    return NextResponse.json({
      success: true,
      processed: results.length,
      results,
      linkedinProcessed: linkedinResults.length,
      linkedinResults,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Cron error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Cron job failed' },
      { status: 500 }
    );
  }
}
