import { Pool } from 'pg';

export type PostStatus = 'pending' | 'publishing' | 'posted' | 'failed';

export interface UserRow {
  instagram_user_id: string;
  username: string | null;
  access_token: string;
  token_expires_at: Date | null;
}

export interface PostRow {
  id: number;
  instagram_user_id: string;
  caption: string;
  image_url: string | null;
  video_url: string | null;
  hashtags: string | null;
  scheduled_time: Date;
  status: PostStatus;
  meta_post_id: string | null;
  error_message: string | null;
  post_to_linkedin: boolean;
  linkedin_post_id: string | null;
  linkedin_error: string | null;
  /** Instagram media container while a video is still being processed. */
  ig_container_id: string | null;
  ig_container_at: Date | null;
}

export interface LinkedinPostRow {
  id: number;
  instagram_user_id: string;
  caption: string;
  image_url: string | null;
  video_url: string | null;
  hashtags: string | null;
  scheduled_time: Date;
  status: PostStatus;
  linkedin_post_id: string | null;
  error_message: string | null;
}

export interface LinkedinAccount {
  instagram_user_id: string;
  member_id: string;
  name: string | null;
  access_token: string;
  token_expires_at: Date | null;
}

const globalForPool = globalThis as unknown as {
  __pool?: Pool;
  __schemaReady?: Promise<void>;
};

function connectionString(): string {
  const url =
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL ||
    process.env.POSTGRES_PRISMA_URL ||
    process.env.DATABASE_URL_UNPOOLED ||
    '';
  if (!url) {
    throw new Error(
      'No database configured. Set DATABASE_URL (or POSTGRES_URL) to a Postgres connection string.'
    );
  }
  return url;
}

export function getPool(): Pool {
  if (!globalForPool.__pool) {
    const url = connectionString();
    const isLocal = /localhost|127\.0\.0\.1/.test(url);
    globalForPool.__pool = new Pool({
      connectionString: url,
      max: 3,
      ssl: isLocal ? undefined : { rejectUnauthorized: false },
    });
  }
  return globalForPool.__pool;
}

const SCHEMA = `
CREATE TABLE IF NOT EXISTS ig_users (
  instagram_user_id TEXT PRIMARY KEY,
  username TEXT,
  access_token TEXT NOT NULL,
  token_expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ig_posts (
  id SERIAL PRIMARY KEY,
  instagram_user_id TEXT NOT NULL REFERENCES ig_users(instagram_user_id) ON DELETE CASCADE,
  caption TEXT NOT NULL,
  image_url TEXT,
  video_url TEXT,
  hashtags TEXT,
  scheduled_time TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  meta_post_id TEXT,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ig_posts_user ON ig_posts(instagram_user_id);
CREATE INDEX IF NOT EXISTS idx_ig_posts_due ON ig_posts(status, scheduled_time);

ALTER TABLE ig_posts ADD COLUMN IF NOT EXISTS post_to_linkedin BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE ig_posts ADD COLUMN IF NOT EXISTS linkedin_post_id TEXT;
ALTER TABLE ig_posts ADD COLUMN IF NOT EXISTS linkedin_error TEXT;
ALTER TABLE ig_posts ADD COLUMN IF NOT EXISTS ig_container_id TEXT;
ALTER TABLE ig_posts ADD COLUMN IF NOT EXISTS ig_container_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS li_accounts (
  instagram_user_id TEXT PRIMARY KEY REFERENCES ig_users(instagram_user_id) ON DELETE CASCADE,
  member_id TEXT NOT NULL,
  name TEXT,
  access_token TEXT NOT NULL,
  token_expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS li_posts (
  id SERIAL PRIMARY KEY,
  instagram_user_id TEXT NOT NULL REFERENCES ig_users(instagram_user_id) ON DELETE CASCADE,
  caption TEXT NOT NULL,
  image_url TEXT,
  video_url TEXT,
  hashtags TEXT,
  scheduled_time TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  linkedin_post_id TEXT,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_li_posts_user ON li_posts(instagram_user_id);
CREATE INDEX IF NOT EXISTS idx_li_posts_due ON li_posts(status, scheduled_time);

CREATE TABLE IF NOT EXISTS tester_requests (
  id SERIAL PRIMARY KEY,
  instagram_username TEXT,
  contact_email TEXT,
  screenshot BYTEA,
  screenshot_type TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
`;

/** Creates the tables on first use, so no manual migration is needed. */
export function ensureSchema(): Promise<void> {
  if (!globalForPool.__schemaReady) {
    globalForPool.__schemaReady = getPool()
      .query(SCHEMA)
      .then(() => undefined)
      .catch((err) => {
        globalForPool.__schemaReady = undefined;
        throw err;
      });
  }
  return globalForPool.__schemaReady;
}

export async function upsertUser(
  instagramUserId: string,
  username: string | null,
  accessToken: string,
  expiresAt: Date | null
): Promise<void> {
  await ensureSchema();
  await getPool().query(
    `INSERT INTO ig_users (instagram_user_id, username, access_token, token_expires_at)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (instagram_user_id) DO UPDATE
       SET username = EXCLUDED.username,
           access_token = EXCLUDED.access_token,
           token_expires_at = EXCLUDED.token_expires_at,
           updated_at = now()`,
    [instagramUserId, username, accessToken, expiresAt]
  );
}

export async function getUser(instagramUserId: string): Promise<UserRow | null> {
  await ensureSchema();
  const { rows } = await getPool().query<UserRow>(
    'SELECT instagram_user_id, username, access_token, token_expires_at FROM ig_users WHERE instagram_user_id = $1',
    [instagramUserId]
  );
  return rows[0] ?? null;
}

export async function insertPosts(
  instagramUserId: string,
  posts: {
    caption: string;
    imageUrl: string | null;
    videoUrl: string | null;
    hashtags: string | null;
    scheduledTime: Date;
    postToLinkedin?: boolean;
  }[]
): Promise<PostRow[]> {
  await ensureSchema();
  const inserted: PostRow[] = [];
  for (const p of posts) {
    const { rows } = await getPool().query<PostRow>(
      `INSERT INTO ig_posts (instagram_user_id, caption, image_url, video_url, hashtags, scheduled_time, post_to_linkedin)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [instagramUserId, p.caption, p.imageUrl, p.videoUrl, p.hashtags, p.scheduledTime, p.postToLinkedin ?? false]
    );
    inserted.push(rows[0]);
  }
  return inserted;
}

export async function listPosts(instagramUserId: string): Promise<PostRow[]> {
  await ensureSchema();
  const { rows } = await getPool().query<PostRow>(
    `SELECT * FROM (
       (SELECT * FROM ig_posts WHERE instagram_user_id = $1 AND status IN ('pending', 'publishing')
         ORDER BY scheduled_time ASC, id ASC LIMIT 500)
       UNION ALL
       (SELECT * FROM ig_posts WHERE instagram_user_id = $1 AND status NOT IN ('pending', 'publishing')
         ORDER BY scheduled_time DESC, id DESC LIMIT 50)
     ) q ORDER BY scheduled_time ASC, id ASC`,
    [instagramUserId]
  );
  return rows;
}

export async function getPost(id: number, instagramUserId: string): Promise<PostRow | null> {
  await ensureSchema();
  const { rows } = await getPool().query<PostRow>(
    'SELECT * FROM ig_posts WHERE id = $1 AND instagram_user_id = $2',
    [id, instagramUserId]
  );
  return rows[0] ?? null;
}

export async function deletePendingPost(id: number, instagramUserId: string): Promise<boolean> {
  await ensureSchema();
  const res = await getPool().query(
    `DELETE FROM ig_posts WHERE id = $1 AND instagram_user_id = $2 AND status IN ('pending', 'failed')`,
    [id, instagramUserId]
  );
  return (res.rowCount ?? 0) > 0;
}

/**
 * Atomically claims up to `limit` due posts (status pending -> publishing) so two
 * overlapping cron runs can never publish the same post twice.
 */
export async function claimDuePosts(limit: number): Promise<PostRow[]> {
  await ensureSchema();
  const { rows } = await getPool().query<PostRow>(
    `UPDATE ig_posts SET status = 'publishing', updated_at = now()
     WHERE id IN (
       SELECT id FROM ig_posts
       WHERE status = 'pending' AND scheduled_time <= now()
       ORDER BY scheduled_time ASC
       LIMIT $1
       FOR UPDATE SKIP LOCKED
     )
     RETURNING *`,
    [limit]
  );
  return rows;
}

/** Claims one specific pending/failed post for an immediate "publish now". */
export async function claimPost(id: number, instagramUserId: string): Promise<PostRow | null> {
  await ensureSchema();
  const { rows } = await getPool().query<PostRow>(
    `UPDATE ig_posts SET status = 'publishing', ig_container_id = NULL, ig_container_at = NULL, updated_at = now()
     WHERE id = $1 AND instagram_user_id = $2 AND status IN ('pending', 'failed')
     RETURNING *`,
    [id, instagramUserId]
  );
  return rows[0] ?? null;
}

export async function markPosted(id: number, metaPostId: string): Promise<void> {
  await getPool().query(
    `UPDATE ig_posts SET status = 'posted', meta_post_id = $2, error_message = NULL, updated_at = now() WHERE id = $1`,
    [id, metaPostId]
  );
}

export async function markFailed(id: number, message: string): Promise<void> {
  await getPool().query(
    `UPDATE ig_posts SET status = 'failed', error_message = $2, updated_at = now() WHERE id = $1 AND status <> 'posted'`,
    [id, message.slice(0, 1000)]
  );
}

/**
 * Posts stuck in 'publishing' because the function died before Instagram was contacted go back to
 * pending after 15 minutes. Posts that already have an Instagram container are left alone: they are
 * waiting for Instagram to finish processing and are picked up by claimProcessingPosts.
 */
export async function releaseStuckPosts(): Promise<void> {
  await ensureSchema();
  await getPool().query(
    `UPDATE ig_posts SET status = 'pending', updated_at = now()
     WHERE status = 'publishing' AND ig_container_id IS NULL AND updated_at < now() - interval '15 minutes'`
  );
}

/** Remembers the Instagram container so a video that is still processing can be finished later. */
export async function saveContainer(id: number, containerId: string): Promise<void> {
  await getPool().query(
    `UPDATE ig_posts SET ig_container_id = $2, ig_container_at = now(), updated_at = now() WHERE id = $1`,
    [id, containerId]
  );
}

/** Videos Instagram has had for more than an hour without finishing are given up on. */
export async function failStaleContainers(): Promise<number> {
  await ensureSchema();
  const res = await getPool().query(
    `UPDATE ig_posts
     SET status = 'failed', error_message = 'Instagram did not finish processing the video within an hour. Try a shorter or smaller video.', updated_at = now()
     WHERE status = 'publishing' AND ig_container_id IS NOT NULL AND ig_container_at < now() - interval '60 minutes'`
  );
  return res.rowCount ?? 0;
}

/**
 * Atomically claims posts whose video is still being processed by Instagram so they can be checked
 * (and published once ready). Posts are only picked up after two minutes, so a "Publish now" that is
 * still waiting is never raced, and each claim hides the post from other runs for a minute.
 */
export async function claimProcessingPosts(limit: number): Promise<PostRow[]> {
  await ensureSchema();
  const { rows } = await getPool().query<PostRow>(
    `UPDATE ig_posts SET updated_at = now()
     WHERE id IN (
       SELECT id FROM ig_posts
       WHERE status = 'publishing' AND ig_container_id IS NOT NULL
         AND ig_container_at < now() - interval '2 minutes'
         AND updated_at < now() - interval '1 minute'
       ORDER BY ig_container_at ASC
       LIMIT $1
       FOR UPDATE SKIP LOCKED
     )
     RETURNING *`,
    [limit]
  );
  return rows;
}

export async function upsertLinkedinAccount(
  instagramUserId: string,
  memberId: string,
  name: string | null,
  accessToken: string,
  expiresAt: Date | null
): Promise<void> {
  await ensureSchema();
  await getPool().query(
    `INSERT INTO li_accounts (instagram_user_id, member_id, name, access_token, token_expires_at)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (instagram_user_id) DO UPDATE
       SET member_id = EXCLUDED.member_id,
           name = EXCLUDED.name,
           access_token = EXCLUDED.access_token,
           token_expires_at = EXCLUDED.token_expires_at,
           updated_at = now()`,
    [instagramUserId, memberId, name, accessToken, expiresAt]
  );
}

export async function getLinkedinAccount(instagramUserId: string): Promise<LinkedinAccount | null> {
  await ensureSchema();
  const { rows } = await getPool().query<LinkedinAccount>(
    `SELECT instagram_user_id, member_id, name, access_token, token_expires_at
     FROM li_accounts WHERE instagram_user_id = $1`,
    [instagramUserId]
  );
  return rows[0] ?? null;
}

export async function deleteLinkedinAccount(instagramUserId: string): Promise<void> {
  await ensureSchema();
  await getPool().query('DELETE FROM li_accounts WHERE instagram_user_id = $1', [instagramUserId]);
}

export async function markLinkedinResult(
  id: number,
  linkedinPostId: string | null,
  error: string | null
): Promise<void> {
  await getPool().query(
    `UPDATE ig_posts SET linkedin_post_id = $2, linkedin_error = $3, updated_at = now() WHERE id = $1`,
    [id, linkedinPostId, error ? error.slice(0, 1000) : null]
  );
}

/* ---------- LinkedIn-only posts (separate queue from Instagram) ---------- */

export async function insertLinkedinPosts(
  userId: string,
  posts: {
    caption: string;
    imageUrl: string | null;
    videoUrl: string | null;
    hashtags: string | null;
    scheduledTime: Date;
  }[]
): Promise<LinkedinPostRow[]> {
  await ensureSchema();
  const inserted: LinkedinPostRow[] = [];
  for (const p of posts) {
    const { rows } = await getPool().query<LinkedinPostRow>(
      `INSERT INTO li_posts (instagram_user_id, caption, image_url, video_url, hashtags, scheduled_time)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [userId, p.caption, p.imageUrl, p.videoUrl, p.hashtags, p.scheduledTime]
    );
    inserted.push(rows[0]);
  }
  return inserted;
}

export async function listLinkedinPosts(userId: string): Promise<LinkedinPostRow[]> {
  await ensureSchema();
  const { rows } = await getPool().query<LinkedinPostRow>(
    `SELECT * FROM (
       (SELECT * FROM li_posts WHERE instagram_user_id = $1 AND status IN ('pending', 'publishing')
         ORDER BY scheduled_time ASC, id ASC LIMIT 500)
       UNION ALL
       (SELECT * FROM li_posts WHERE instagram_user_id = $1 AND status NOT IN ('pending', 'publishing')
         ORDER BY scheduled_time DESC, id DESC LIMIT 50)
     ) q ORDER BY scheduled_time ASC, id ASC`,
    [userId]
  );
  return rows;
}

export async function deleteLinkedinPost(id: number, userId: string): Promise<boolean> {
  await ensureSchema();
  const res = await getPool().query(
    `DELETE FROM li_posts WHERE id = $1 AND instagram_user_id = $2 AND status IN ('pending', 'failed')`,
    [id, userId]
  );
  return (res.rowCount ?? 0) > 0;
}

/** Atomically claims due LinkedIn posts (pending -> publishing) so overlapping cron runs never double-post. */
export async function claimDueLinkedinPosts(limit: number): Promise<LinkedinPostRow[]> {
  await ensureSchema();
  const { rows } = await getPool().query<LinkedinPostRow>(
    `UPDATE li_posts SET status = 'publishing', updated_at = now()
     WHERE id IN (
       SELECT id FROM li_posts
       WHERE status = 'pending' AND scheduled_time <= now()
       ORDER BY scheduled_time ASC
       LIMIT $1
       FOR UPDATE SKIP LOCKED
     )
     RETURNING *`,
    [limit]
  );
  return rows;
}

export async function claimLinkedinPost(id: number, userId: string): Promise<LinkedinPostRow | null> {
  await ensureSchema();
  const { rows } = await getPool().query<LinkedinPostRow>(
    `UPDATE li_posts SET status = 'publishing', updated_at = now()
     WHERE id = $1 AND instagram_user_id = $2 AND status IN ('pending', 'failed')
     RETURNING *`,
    [id, userId]
  );
  return rows[0] ?? null;
}

export async function markLinkedinPostDone(id: number, linkedinPostId: string): Promise<void> {
  await getPool().query(
    `UPDATE li_posts SET status = 'posted', linkedin_post_id = $2, error_message = NULL, updated_at = now() WHERE id = $1`,
    [id, linkedinPostId]
  );
}

export async function markLinkedinPostFailed(id: number, message: string): Promise<void> {
  await getPool().query(
    `UPDATE li_posts SET status = 'failed', error_message = $2, updated_at = now() WHERE id = $1`,
    [id, message.slice(0, 1000)]
  );
}

export async function releaseStuckLinkedinPosts(): Promise<void> {
  await ensureSchema();
  await getPool().query(
    `UPDATE li_posts SET status = 'pending', updated_at = now()
     WHERE status = 'publishing' AND updated_at < now() - interval '15 minutes'`
  );
}

/* ---------- Self-serve accounts (sign in with LinkedIn and/or Instagram) ---------- */

/** A user id that belongs to a person who signed in with LinkedIn only (no Instagram token yet). */
export function isLinkedinOnlyId(userId: string): boolean {
  return userId.startsWith('li_');
}

export async function getUserIdByLinkedinMember(memberId: string): Promise<string | null> {
  await ensureSchema();
  const { rows } = await getPool().query<{ instagram_user_id: string }>(
    'SELECT instagram_user_id FROM li_accounts WHERE member_id = $1 ORDER BY updated_at DESC LIMIT 1',
    [memberId]
  );
  return rows[0]?.instagram_user_id ?? null;
}

/** Creates (or refreshes) the placeholder account for someone who signs in with LinkedIn first. */
export async function ensureLinkedinOnlyUser(memberId: string, name: string | null): Promise<string> {
  await ensureSchema();
  const id = `li_${memberId}`;
  await getPool().query(
    `INSERT INTO ig_users (instagram_user_id, username, access_token, token_expires_at)
     VALUES ($1, $2, '', NULL)
     ON CONFLICT (instagram_user_id) DO UPDATE SET username = COALESCE(EXCLUDED.username, ig_users.username), updated_at = now()`,
    [id, name]
  );
  return id;
}

/**
 * When a LinkedIn-only user later connects Instagram, move their LinkedIn login and queue onto the
 * Instagram account so both platforms live under one profile, then drop the placeholder.
 */
export async function mergeUserInto(oldId: string, newId: string): Promise<void> {
  if (oldId === newId || !isLinkedinOnlyId(oldId)) return;
  await ensureSchema();
  const pool = getPool();
  const existing = await pool.query('SELECT 1 FROM li_accounts WHERE instagram_user_id = $1', [newId]);
  if (existing.rowCount === 0) {
    await pool.query('UPDATE li_accounts SET instagram_user_id = $2 WHERE instagram_user_id = $1', [oldId, newId]);
  }
  await pool.query('UPDATE li_posts SET instagram_user_id = $2 WHERE instagram_user_id = $1', [oldId, newId]);
  await pool.query('DELETE FROM ig_users WHERE instagram_user_id = $1', [oldId]);
}

/* ---------- Instagram tester access requests ---------- */

export interface TesterRequestRow {
  id: number;
  instagram_username: string | null;
  contact_email: string | null;
  screenshot_type: string | null;
  has_screenshot: boolean;
  created_at: Date;
}

export async function insertTesterRequest(
  username: string | null,
  contactEmail: string | null,
  screenshot: Buffer | null,
  screenshotType: string | null
): Promise<number> {
  await ensureSchema();
  const { rows } = await getPool().query<{ id: number }>(
    `INSERT INTO tester_requests (instagram_username, contact_email, screenshot, screenshot_type)
     VALUES ($1, $2, $3, $4) RETURNING id`,
    [username, contactEmail, screenshot, screenshotType]
  );
  return rows[0].id;
}

export async function listTesterRequests(): Promise<TesterRequestRow[]> {
  await ensureSchema();
  const { rows } = await getPool().query<TesterRequestRow>(
    `SELECT id, instagram_username, contact_email, screenshot_type,
            (screenshot IS NOT NULL) AS has_screenshot, created_at
     FROM tester_requests ORDER BY created_at DESC LIMIT 200`
  );
  return rows;
}

export async function getTesterScreenshot(
  id: number
): Promise<{ data: Buffer; type: string } | null> {
  await ensureSchema();
  const { rows } = await getPool().query<{ screenshot: Buffer | null; screenshot_type: string | null }>(
    'SELECT screenshot, screenshot_type FROM tester_requests WHERE id = $1',
    [id]
  );
  const r = rows[0];
  return r?.screenshot ? { data: r.screenshot, type: r.screenshot_type || 'image/png' } : null;
}
