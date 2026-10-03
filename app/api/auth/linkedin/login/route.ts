import { NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import { LI_SCOPES, linkedinRedirectUri } from '@/lib/linkedin';

export const dynamic = 'force-dynamic';

/**
 * Starts "Continue with LinkedIn". Works for anyone: new visitors sign in (an account is created on
 * the fly), and people already signed in with Instagram simply link LinkedIn to their account.
 */
export async function GET() {
  const clientId = process.env.LINKEDIN_CLIENT_ID;
  if (!clientId) {
    return NextResponse.json({ error: 'LINKEDIN_CLIENT_ID is not set' }, { status: 500 });
  }

  const state = randomBytes(16).toString('hex');
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    redirect_uri: linkedinRedirectUri(),
    scope: LI_SCOPES,
    state,
  });
  const res = NextResponse.redirect(`https://www.linkedin.com/oauth/v2/authorization?${params}`);
  res.cookies.set('li_state', state, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 600,
  });
  return res;
}
