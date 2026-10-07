import axios from 'axios';
import type { PostRow } from './db';

const GRAPH = 'https://graph.instagram.com/v21.0';

function graphError(err: unknown): string {
  const e = err as { response?: { data?: { error?: { message?: string } } }; message?: string };
  return e.response?.data?.error?.message || e.message || 'Unknown Instagram API error';
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

type MediaPost = Pick<PostRow, 'caption' | 'image_url' | 'video_url' | 'hashtags'>;

/**
 * Step 1 of publishing: asks Instagram to fetch and process the media. Videos become Reels and
 * can take minutes to process, so this returns the container id straight away and the caller
 * decides how long to wait (see lib/publish.ts). Throws with a readable message on failure.
 */
export async function createMediaContainer(
  post: MediaPost,
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
    return String(container.data.id);
  } catch (err) {
    throw new Error(graphError(err));
  }
}

export interface ContainerStatus {
  /** IN_PROGRESS, FINISHED, ERROR, EXPIRED or PUBLISHED. */
  code: string;
  /** Instagram's own explanation when processing fails, if it gave one. */
  detail: string | null;
}

export async function getContainerStatus(containerId: string, accessToken: string): Promise<ContainerStatus> {
  try {
    const res = await axios.get(`${GRAPH}/${containerId}`, {
      params: { fields: 'status_code,status', access_token: accessToken },
    });
    return {
      code: String(res.data.status_code ?? 'IN_PROGRESS'),
      detail: typeof res.data.status === 'string' ? res.data.status : null,
    };
  } catch (err) {
    const e = err as { response?: { status?: number } };
    const transient = !e.response || (e.response.status ?? 0) >= 500 || e.response.status === 429;
    throw Object.assign(new Error(graphError(err)), { transient });
  }
}

/** True for errors worth trying again later (network trouble, Instagram 5xx, rate limits). */
export function isTransientError(err: unknown): boolean {
  return (err as { transient?: boolean }).transient === true;
}

export function processingFailedMessage(status: ContainerStatus): string {
  const reason = status.code === 'EXPIRED' ? 'the upload expired' : status.detail || status.code;
  return `Instagram could not process the video (${reason}).`;
}

/**
 * Polls until Instagram has finished processing, up to maxWaitMs. Returns true when ready and
 * false when it is still processing. Throws if Instagram rejects the media.
 */
export async function waitForContainer(
  containerId: string,
  accessToken: string,
  maxWaitMs: number
): Promise<boolean> {
  if (maxWaitMs < 5000) return false; // not enough time for even one check: leave it for the next run
  const deadline = Date.now() + maxWaitMs;
  for (;;) {
    await sleep(4000);
    const status = await getContainerStatus(containerId, accessToken);
    if (status.code === 'FINISHED') return true;
    if (status.code === 'ERROR' || status.code === 'EXPIRED') {
      throw new Error(processingFailedMessage(status));
    }
    if (Date.now() + 4000 > deadline) return false;
  }
}

/** Step 2 of publishing: makes a finished container live. Returns the Instagram media id. */
export async function publishContainer(
  containerId: string,
  instagramUserId: string,
  accessToken: string
): Promise<string> {
  try {
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
