import { NextRequest, NextResponse } from 'next/server';
import {
  claimDueLinkedinPosts,
  claimDuePosts,
  getUser,
  markFailed,
  markLinkedinPostDone,
  markLinkedinPostFailed,
  markPosted,
  releaseStuckLinkedinPosts,
  releaseStuckPosts,
  upsertUser,
} from '@/lib/db';
import { publishToInstagram, refreshLongLivedToken } from '@/lib/instagram';
import { crossPostToLinkedin, publishLinkedinQueuedPost } from '@/lib/linkedin';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

const BATCH = 5;
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
    const due = await claimDuePosts(BATCH);
    const results: { id: number; status: 'posted' | 'failed'; detail: string }[] = [];

    for (const post of due) {
      try {
        const user = await getUser(post.instagram_user_id);
        if (!user) throw new Error('Instagram account is no longer connected. Log in again.');

        // Keep long-lived tokens alive.
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

        const metaPostId = await publishToInstagram(post, post.instagram_user_id, token);
        await markPosted(post.id, metaPostId);
        await crossPostToLinkedin(post, post.instagram_user_id);
        results.push({ id: post.id, status: 'posted', detail: metaPostId });
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
