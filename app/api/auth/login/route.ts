import { NextResponse } from 'next/server';

export async function GET() {
  const redirectUri = encodeURIComponent(process.env.META_REDIRECT_URI || '');
  const clientId = process.env.META_APP_ID;
  const scopes = encodeURIComponent('instagram_business_basic,instagram_business_content_publish');

  const authUrl = `https://www.instagram.com/oauth/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&scope=${scopes}&response_type=code`;

  return NextResponse.redirect(authUrl);
}
