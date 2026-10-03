import axios from 'axios';
import { getLinkedinAccount, markLinkedinResult, type LinkedinPostRow, type PostRow } from './db';

type MediaPost = {
  caption: string;
  hashtags: string | null;
  image_url: string | null;
  video_url: string | null;
};

const API = 'https://api.linkedin.com';
const LI_VERSION = process.env.LINKEDIN_API_VERSION || '202606';

export const LI_SCOPES = 'openid profile w_member_social';

export function linkedinRedirectUri(): string {
  return (
    process.env.LINKEDIN_REDIRECT_URI ||
    'https://instagram-content-scheduler-delta.vercel.app/api/auth/callback/linkedin'
  );
}

function liError(err: unknown): string {
  const e = err as {
    response?: { status?: number; data?: { message?: string } };
    message?: string;
  };
  const status = e.response?.status;
  const msg = e.response?.data?.message || e.message || 'Unknown LinkedIn API error';
  if (status === 401) return 'LinkedIn rejected the saved login (it may have expired). Reconnect LinkedIn.';
  return msg;
}

/**
 * LinkedIn's Posts API parses commentary as "little text": these characters are reserved and
 * silently truncate or garble the post unless escaped with a backslash. '#' is left alone so
 * hashtags still work.
 */
export function escapeLinkedinText(text: string): string {
  return text.replace(/[\\|{}@\[\]()<>*_~]/g, (c) => `\\${c}`);
}

const restHeaders = (token: string) => ({
  Authorization: `Bearer ${token}`,
  'LinkedIn-Version': LI_VERSION,
  'X-Restli-Protocol-Version': '2.0.0',
});

/** Publishes a text, image or video post to the member's LinkedIn profile. Returns the post URN. */
export async function publishToLinkedin(
  post: MediaPost,
  memberId: string,
  accessToken: string
): Promise<string> {
  const author = `urn:li:person:${memberId}`;
  const commentary = escapeLinkedinText(
    post.hashtags ? `${post.caption}\n\n${post.hashtags}` : post.caption
  );

  try {
    let content: Record<string, unknown> | undefined;
    const mediaUrl = post.video_url || post.image_url;

    if (mediaUrl) {
      const file = await axios.get<ArrayBuffer>(mediaUrl, { responseType: 'arraybuffer' });
      const bytes = Buffer.from(file.data);

      if (post.video_url) {
        const init = await axios.post(
          `${API}/rest/videos?action=initializeUpload`,
          {
            initializeUploadRequest: {
              owner: author,
              fileSizeBytes: bytes.length,
              uploadThumbnail: false,
              uploadCaptions: false,
            },
          },
          { headers: restHeaders(accessToken) }
        );
        const { video, uploadInstructions, uploadToken } = init.data.value as {
          video: string;
          uploadToken?: string;
          uploadInstructions: { uploadUrl: string; firstByte: number; lastByte: number }[];
        };
        const etags: string[] = [];
        for (const part of uploadInstructions) {
          const chunk = bytes.subarray(part.firstByte, part.lastByte + 1);
          const up = await axios.put(part.uploadUrl, chunk, {
            headers: { 'Content-Type': 'application/octet-stream' },
            maxBodyLength: Infinity,
            maxContentLength: Infinity,
          });
          etags.push(String(up.headers['etag']));
        }
        await axios.post(
          `${API}/rest/videos?action=finalizeUpload`,
          { finalizeUploadRequest: { video, uploadToken: uploadToken || '', uploadedPartIds: etags } },
          { headers: restHeaders(accessToken) }
        );
        content = { media: { id: video } };
      } else {
        const init = await axios.post(
          `${API}/rest/images?action=initializeUpload`,
          { initializeUploadRequest: { owner: author } },
          { headers: restHeaders(accessToken) }
        );
        const { uploadUrl, image } = init.data.value as { uploadUrl: string; image: string };
        await axios.put(uploadUrl, bytes, {
          headers: { 'Content-Type': 'application/octet-stream' },
          maxBodyLength: Infinity,
        });
        content = { media: { id: image } };
      }
    }

    const res = await axios.post(
      `${API}/rest/posts`,
      {
        author,
        commentary,
        visibility: 'PUBLIC',
        distribution: {
          feedDistribution: 'MAIN_FEED',
          targetEntities: [],
          thirdPartyDistributionChannels: [],
        },
        ...(content ? { content } : {}),
        lifecycleState: 'PUBLISHED',
        isReshareDisabledByAuthor: false,
      },
      { headers: restHeaders(accessToken) }
    );
    return String(res.headers['x-restli-id'] || 'published');
  } catch (err) {
    throw new Error(liError(err));
  }
}

/**
 * Cross-posts an already-published Instagram post to LinkedIn when the post asked for it.
 * Never throws: the outcome is stored on the post (linkedin_post_id / linkedin_error), so a
 * LinkedIn problem can never turn a successful Instagram post into a failed one.
 */
export async function crossPostToLinkedin(post: PostRow, instagramUserId: string): Promise<void> {
  if (!post.post_to_linkedin || post.linkedin_post_id) return;
  try {
    const account = await getLinkedinAccount(instagramUserId);
    if (!account) throw new Error('LinkedIn is not connected. Connect it on the dashboard.');
    if (account.token_expires_at && account.token_expires_at.getTime() < Date.now()) {
      throw new Error('The LinkedIn connection expired. Reconnect LinkedIn on the dashboard.');
    }
    const id = await publishToLinkedin(post, account.member_id, account.access_token);
    await markLinkedinResult(post.id, id, null);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'LinkedIn post failed';
    await markLinkedinResult(post.id, null, message);
  }
}

/** Publishes one LinkedIn-only queued post using the saved LinkedIn login. Throws a readable error on failure. */
export async function publishLinkedinQueuedPost(post: LinkedinPostRow): Promise<string> {
  const account = await getLinkedinAccount(post.instagram_user_id);
  if (!account) throw new Error('LinkedIn is not connected. Connect it on the LinkedIn page.');
  if (account.token_expires_at && account.token_expires_at.getTime() < Date.now()) {
    throw new Error('The LinkedIn connection expired. Reconnect LinkedIn on the LinkedIn page.');
  }
  return publishToLinkedin(post, account.member_id, account.access_token);
}
