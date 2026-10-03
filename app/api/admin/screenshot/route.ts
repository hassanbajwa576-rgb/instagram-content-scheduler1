import { NextRequest, NextResponse } from 'next/server';
import { getTesterScreenshot } from '@/lib/db';

export const dynamic = 'force-dynamic';

/** GET /api/admin/screenshot?id=1&key=ADMIN_SECRET: view a tester's uploaded profile screenshot. */
export async function GET(request: NextRequest) {
  const secret = process.env.ADMIN_SECRET;
  if (!secret || request.nextUrl.searchParams.get('key') !== secret) {
    return new NextResponse('Not found', { status: 404 });
  }
  const id = Number(request.nextUrl.searchParams.get('id'));
  if (!Number.isInteger(id)) return new NextResponse('Bad id', { status: 400 });
  const shot = await getTesterScreenshot(id);
  if (!shot) return new NextResponse('Not found', { status: 404 });
  return new NextResponse(new Uint8Array(shot.data), {
    headers: { 'Content-Type': shot.type, 'Cache-Control': 'private, no-store' },
  });
}
