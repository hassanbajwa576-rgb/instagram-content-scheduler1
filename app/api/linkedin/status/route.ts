import { NextResponse } from 'next/server';
import { getLinkedinAccount } from '@/lib/db';
import { getSessionUserId } from '@/lib/session';

export const dynamic = 'force-dynamic';

/** GET /api/linkedin/status: whether the logged-in user has LinkedIn connected. */
export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  try {
    const account = await getLinkedinAccount(userId);
    const expired = !!account?.token_expires_at && account.token_expires_at.getTime() < Date.now();
    return NextResponse.json({
      connected: !!account && !expired,
      expired,
      name: account?.name ?? null,
      expiresAt: account?.token_expires_at ?? null,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Could not check LinkedIn' },
      { status: 500 }
    );
  }
}
