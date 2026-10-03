import { NextResponse } from 'next/server';
import { deleteLinkedinAccount } from '@/lib/db';
import { getSessionUserId } from '@/lib/session';

export const dynamic = 'force-dynamic';

/** POST /api/linkedin/disconnect: forget the saved LinkedIn login. */
export async function POST() {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  await deleteLinkedinAccount(userId);
  return NextResponse.json({ success: true });
}
