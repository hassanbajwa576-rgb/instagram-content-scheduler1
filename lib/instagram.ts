import axios from 'axios';
import type { PostRow } from './db';

const GRAPH = 'https://graph.instagram.com/v21.0';

function graphError(err: unknown): string {
  const e = err as { response?: { data?: { error?: { message?: string } } }; message?: string };
  return e.response?.data?.error?.message || e.message || 'Unknown Instagram API error';
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Publishes one post to Instagram. Images are published as photo posts and
 * videos as Reels. Returns the published media id, or throws with a readable message.
 */
export async function publishToInstagram(
  post: Pick<PostRow, 'caption' | 'image_url' | 'video_url' | 'hashtags'>,
  instagramUserId: string,
  accessToken: string
): Promise<string> {
  if (!post.image_url && !post.video_url) {
    throw new Error('Post has no image_url or video_url. Instagram requires media.');
  }

  const caption = post.hashtags ? `${post.caption}\n\n${post.hashtags}` : post.caption;

  const params: Record<string, string> = { caption, access_token: accessToken };
  if (post.video_url) {
    params.media_type = 'REELS';
    params.video_url = post.video_url;
  } else if (post.image_url) {
    params.image_url = post.image_url;
  }

  try {
    const container = await axios.post(`${GRAPH}/${instagramUserId}/media`, new URLSearchParams(params));
    const containerId: string = container.data.id;

    // Videos are processed asynchronously; wait until the container is ready.
    if (post.video_url) {
      let ready = false;
      for (let i = 0; i < 20; i++) {
        await sleep(3000);
        const status = await axios.get(`${GRAPH}/${containerId}`, {
          params: { fields: 'status_code', access_token: accessToken },
        });
        const code = status.data.status_code;
        if (code === 'FINISHED') {
          ready = true;
          break;
        }
        if (code === 'ERROR' || code === 'EXPIRED') {
          throw new Error(`Instagram could not process the video (status ${code}).`);
        }
      }
      if (!ready) throw new Error('Timed out waiting for Instagram to process the video.');
    }

    const published = await axios.post(
      `${GRAPH}/${instagramUserId}/media_publish`,
      new URLSearchParams({ creation_id: containerId, access_token: accessToken })
    );
    return String(published.data.id);
  } catch (err) {
    throw new Error(graphError(err));
  }
}

/** Exchanges a short-lived (1h) token for a long-lived (60 day) token. */
export async function exchangeForLongLivedToken(
  shortToken: string
): Promise<{ token: string; expiresAt: Date | null }> {
  try {
    const res = await axios.get('https://graph.instagram.com/access_token', {
      params: {
        grant_type: 'ig_exchange_token',
        client_secret: process.env.META_APP_SECRET,
        access_token: shortToken,
      },
    });
    const seconds: number | undefined = res.data.expires_in;
    return {
      token: res.data.access_token,
      expiresAt: seconds ? new Date(Date.now() + seconds * 1000) : null,
    };
  } catch (err) {
    throw new Error(graphError(err));
  }
}

/** Refreshes a long-lived token (must be at least 24h old, and not expired). */
export async function refreshLongLivedToken(
  token: string
): Promise<{ token: string; expiresAt: Date | null }> {
  try {
    const res = await axios.get('https://graph.instagram.com/refresh_access_token', {
      params: { grant_type: 'ig_refresh_token', access_token: token },
    });
    const seconds: number | undefined = res.data.expires_in;
    return {
      token: res.data.access_token,
      expiresAt: seconds ? new Date(Date.now() + seconds * 1000) : null,
    };
  } catch (err) {
    throw new Error(graphError(err));
  }
}
