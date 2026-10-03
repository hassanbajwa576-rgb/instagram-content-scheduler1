import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import {
  ensureLinkedinOnlyUser,
  getUserIdByLinkedinMember,
  upsertLinkedinAccount,
} from '@/lib/db';
import { linkedinRedirectUri } from '@/lib/linkedin';
import {
  createSessionValue,
  getSessionUserId,
  SESSION_COOKIE,
  SESSION_MAX_AGE,
  USERNAME_COOKIE,
} from '@/lib/session';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  const back = (q: string) => NextResponse.redirect(new URL(`/linkedin?${q}`, request.url));
  const home = (detail: string) =>
    NextResponse.redirect(new URL(`/?error=${encodeURIComponent(detail)}`, request.url));

  if (sp.get('error')) {
    return home(sp.get('error_description') || sp.get('error') || 'LinkedIn sign-in was cancelled.');
  }

  const code = sp.get('code');
  const state = sp.get('state');
  const savedState = request.cookies.get('li_state')?.value;
  if (!code || !state || !savedState || state !== savedState) {
    return home('Login expired. Please try again.');
  }

  try {
    const tokenRes = await axios.post(
      'https://www.linkedin.com/oauth/v2/accessToken',
      new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        client_id: process.env.LINKEDIN_CLIENT_ID || '',
        client_secret: process.env.LINKEDIN_CLIENT_SECRET || '',
        redirect_uri: linkedinRedirectUri(),
      }),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );
    const { access_token, expires_in } = tokenRes.data as { access_token: string; expires_in?: number };

    const me = await axios.get('https://api.linkedin.com/v2/userinfo', {
      headers: { Authorization: `Bearer ${access_token}` },
    });
    const memberId = String(me.data.sub);
    const name: string | null = me.data.name || null;

    // Who is this? Signed-in user -> link. Known LinkedIn member -> their account. Otherwise create one.
    const sessionUser = await getSessionUserId();
    const userId =
      sessionUser ||
      (await getUserIdByLinkedinMember(memberId)) ||
      (await ensureLinkedinOnlyUser(memberId, name));

    await upsertLinkedinAccount(
      userId,
      memberId,
      name,
      access_token,
      expires_in ? new Date(Date.now() + expires_in * 1000) : null
    );

    const res = back('linkedin=connected');
    res.cookies.delete('li_state');
    if (!sessionUser) {
      res.cookies.set(SESSION_COOKIE, createSessionValue(userId), {
        httpOnly: true,
        secure: true,
        sameSite: 'lax',
        path: '/',
        maxAge: SESSION_MAX_AGE,
      });
      res.cookies.set(USERNAME_COOKIE, name ?? '', { path: '/', maxAge: SESSION_MAX_AGE });
    }
    return res;
  } catch (error) {
    const e = error as { response?: { data?: unknown }; message?: string };
    console.error('LinkedIn OAuth error:', e.response?.data || e.message);
    return home('LinkedIn sign-in failed. Please try again.');
  }
}
