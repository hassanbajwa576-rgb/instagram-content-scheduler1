import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import { mergeUserInto, upsertUser } from '@/lib/db';
import { exchangeForLongLivedToken } from '@/lib/instagram';
import {
  createSessionValue,
  getSessionUserId,
  SESSION_COOKIE,
  SESSION_MAX_AGE,
  USERNAME_COOKIE,
} from '@/lib/session';

export const dynamic = 'force-dynamic';

/** Instagram user ids are ~17 digits, which exceeds JS number precision, so read them as text. */
function extractId(raw: string, key: string): string | null {
  const m = raw.match(new RegExp(`"${key}"\\s*:\\s*"?(\\d+)"?`));
  return m ? m[1] : null;
}

function extractString(raw: string, key: string): string | null {
  const m = raw.match(new RegExp(`"${key}"\\s*:\\s*"([^"]*)"`));
  return m ? m[1] : null;
}

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code');

  if (!code) {
    // Cancelled, or Instagram refused the sign-in (for example, the account is not a tester yet).
    return NextResponse.redirect(new URL('/request-access?from=instagram', request.url));
  }

  try {
    // 1. Exchange the code for a short-lived token (form-encoded, per Instagram's API).
    const tokenRes = await axios.post(
      'https://api.instagram.com/oauth/access_token',
      new URLSearchParams({
        client_id: process.env.META_APP_ID || '',
        client_secret: process.env.META_APP_SECRET || '',
        grant_type: 'authorization_code',
        redirect_uri: process.env.META_REDIRECT_URI || '',
        code: code.replace(/#_$/, ''),
      }),
      { responseType: 'text', transformResponse: (d) => d }
    );
    const tokenRaw = String(tokenRes.data);
    const shortToken = extractString(tokenRaw, 'access_token');
    if (!shortToken) throw new Error('Instagram did not return an access token.');

    // 2. Upgrade to a 60-day token so scheduled posts keep working.
    const { token, expiresAt } = await exchangeForLongLivedToken(shortToken);

    // 3. Look up the professional account id + username.
    const meRes = await axios.get('https://graph.instagram.com/v21.0/me', {
      params: { fields: 'user_id,username', access_token: token },
      responseType: 'text',
      transformResponse: (d) => d,
    });
    const meRaw = String(meRes.data);
    const igUserId = extractId(meRaw, 'user_id') || extractId(meRaw, 'id');
    const username = extractString(meRaw, 'username');
    if (!igUserId) throw new Error('Could not determine the Instagram account id.');

    // 4. Persist the token server-side; the browser only gets a signed session cookie.
    await upsertUser(igUserId, username, token, expiresAt);

    // Someone who signed in with LinkedIn first keeps their LinkedIn login and queue.
    const previous = await getSessionUserId();
    if (previous) await mergeUserInto(previous, igUserId);

    const response = NextResponse.redirect(new URL('/dashboard', request.url));
    response.cookies.set(SESSION_COOKIE, createSessionValue(igUserId), {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      path: '/',
      maxAge: SESSION_MAX_AGE,
    });
    response.cookies.set(USERNAME_COOKIE, username ?? '', {
      path: '/',
      maxAge: SESSION_MAX_AGE,
    });
    return response;
  } catch (error) {
    const e = error as { response?: { data?: unknown }; message?: string };
    console.error('OAuth error:', e.response?.data || e.message);
    return NextResponse.redirect(new URL('/request-access?from=instagram', request.url));
  }
}
