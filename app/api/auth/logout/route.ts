import { NextRequest, NextResponse } from 'next/server';
import { SESSION_COOKIE, USERNAME_COOKIE } from '@/lib/session';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const response = NextResponse.redirect(new URL('/', request.url));
  response.cookies.delete(SESSION_COOKIE);
  response.cookies.delete(USERNAME_COOKIE);
  return response;
}
