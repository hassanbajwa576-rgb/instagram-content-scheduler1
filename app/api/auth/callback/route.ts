import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const state = searchParams.get('state');

  if (!code) {
    return NextResponse.json(
      { error: 'No authorization code provided' },
      { status: 400 }
    );
  }

  try {
    // Exchange code for access token
    const tokenResponse = await axios.post(
      'https://graph.instagram.com/v18.0/oauth/access_token',
      {
        client_id: process.env.META_APP_ID,
        client_secret: process.env.META_APP_SECRET,
        grant_type: 'authorization_code',
        redirect_uri: process.env.META_REDIRECT_URI,
        code,
      }
    );

    const { access_token, user_id } = tokenResponse.data;

    // Get user info
    const userResponse = await axios.get(
      `https://graph.instagram.com/v18.0/${user_id}?fields=id,username,name&access_token=${access_token}`
    );

    // Save to session/database (for now, store in cookie)
    const response = NextResponse.redirect(new URL('/dashboard', request.url));

    response.cookies.set('meta_access_token', access_token, {
      httpOnly: true,
      maxAge: 60 * 60 * 24 * 30, // 30 days
    });

    response.cookies.set('instagram_user_id', user_id, {
      maxAge: 60 * 60 * 24 * 30,
    });

    response.cookies.set('instagram_username', userResponse.data.username, {
      maxAge: 60 * 60 * 24 * 30,
    });

    return response;
  } catch (error: any) {
    console.error('OAuth error:', error.response?.data || error.message);
    return NextResponse.json(
      { error: 'Authentication failed' },
      { status: 500 }
    );
  }
}
