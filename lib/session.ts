import { createHmac, timingSafeEqual } from 'crypto';
import { cookies } from 'next/headers';

export const SESSION_COOKIE = 'ig_session';
export const USERNAME_COOKIE = 'instagram_username';
export const SESSION_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

function secret(): string {
  const s = process.env.SESSION_SECRET || process.env.META_APP_SECRET || process.env.CRON_SECRET;
  if (!s) {
    throw new Error('Set SESSION_SECRET (or META_APP_SECRET) so login sessions can be signed.');
  }
  return s;
}

function sign(payload: string): string {
  return createHmac('sha256', secret()).update(payload).digest('base64url');
}

/** Returns a signed cookie value: `<instagramUserId>.<expiryEpochSeconds>.<signature>` */
export function createSessionValue(instagramUserId: string): string {
  const exp = Math.floor(Date.now() / 1000) + SESSION_MAX_AGE;
  const payload = `${instagramUserId}.${exp}`;
  return `${payload}.${sign(payload)}`;
}

export function verifySessionValue(value: string | undefined): string | null {
  if (!value) return null;
  const parts = value.split('.');
  if (parts.length !== 3) return null;
  const [userId, exp, sig] = parts;
  const expected = sign(`${userId}.${exp}`);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  if (Number(exp) < Math.floor(Date.now() / 1000)) return null;
  return userId;
}

/** The logged-in Instagram user id, or null when there is no valid session. */
export async function getSessionUserId(): Promise<string | null> {
  const store = await cookies();
  try {
    return verifySessionValue(store.get(SESSION_COOKIE)?.value);
  } catch {
    return null;
  }
}
