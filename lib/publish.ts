import { markPosted, saveContainer, type PostRow } from './db';
import {
  createMediaContainer,
  getContainerStatus,
  isTransientError,
  processingFailedMessage,
  publishContainer,
  waitForContainer,
} from './instagram';
import { crossPostToLinkedin } from './linkedin';

export type PublishOutcome =
  | { state: 'posted'; metaPostId: string }
  /** Instagram is still processing the video; the cron job will finish it. */
  | { state: 'processing'; containerId: string };

async function goLive(
  post: PostRow,
  containerId: string,
  instagramUserId: string,
  accessToken: string
): Promise<PublishOutcome> {
  const metaPostId = await publishContainer(containerId, instagramUserId, accessToken);
  await markPosted(post.id, metaPostId);
  await crossPostToLinkedin(post, instagramUserId);
  return { state: 'posted', metaPostId };
}

/**
 * Starts publishing a claimed post. Photos go live straight away. Videos are handed to Instagram,
 * the container is saved, and we wait up to `waitMs` for processing to finish. If Instagram needs
 * longer, the post stays 'publishing' and resumePost finishes it on a later cron run, so long
 * videos no longer fail with a timeout. Throws a readable error if Instagram rejects the media.
 */
export async function startPost(
  post: PostRow,
  instagramUserId: string,
  accessToken: string,
  waitMs: number
): Promise<PublishOutcome> {
  const containerId = await createMediaContainer(post, instagramUserId, accessToken);

  if (post.video_url) {
    // Save before waiting, so the post can be resumed even if this function is cut off.
    await saveContainer(post.id, containerId);
    const ready = await waitForContainer(containerId, accessToken, waitMs);
    if (!ready) return { state: 'processing', containerId };
  }

  return goLive(post, containerId, instagramUserId, accessToken);
}

/**
 * Checks a post whose video Instagram was still processing and publishes it if it is ready.
 * Returns 'processing' when it should be checked again later. Throws if Instagram rejected it.
 */
export async function resumePost(
  post: PostRow,
  instagramUserId: string,
  accessToken: string
): Promise<'posted' | 'processing'> {
  const containerId = post.ig_container_id;
  if (!containerId) throw new Error('Post has no Instagram upload to resume.');

  let status;
  try {
    status = await getContainerStatus(containerId, accessToken);
  } catch (err) {
    if (isTransientError(err)) return 'processing'; // network blip: try again next run
    throw err;
  }

  if (status.code === 'FINISHED') {
    await goLive(post, containerId, instagramUserId, accessToken);
    return 'posted';
  }
  if (status.code === 'PUBLISHED') {
    // Already live (an earlier run published it but could not record it).
    await markPosted(post.id, containerId);
    await crossPostToLinkedin(post, instagramUserId);
    return 'posted';
  }
  if (status.code === 'ERROR' || status.code === 'EXPIRED') {
    throw new Error(processingFailedMessage(status));
  }
  return 'processing';
}

