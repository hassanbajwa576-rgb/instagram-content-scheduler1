import { NextResponse } from 'next/server';
import { getLinkedinAccount, getUser, isLinkedinOnlyId } from '@/lib/db';
import { getSessionUserId } from '@/lib/session';

export const dynamic = 'force-dynamic';

/** GET /api/me: which platforms the signed-in person has connected. */
export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  try {
    const [user, li] = await Promise.all([getUser(userId), getLinkedinAccount(userId)]);
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    const hasInstagram = !isLinkedinOnlyId(userId) && !!user.access_token;
    const liValid = !!li && !(li.token_expires_at && li.token_expires_at.getTime() < Date.now());
    return NextResponse.json({
      name: li?.name || user.username,
      instagramUsername: hasInstagram ? user.username : null,
      hasInstagram,
      hasLinkedin: liValid,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Could not load account' },
      { status: 500 }
    );
  }
}
