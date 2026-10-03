import { NextRequest, NextResponse } from 'next/server';
import { insertTesterRequest } from '@/lib/db';

export const dynamic = 'force-dynamic';

const MAX_BYTES = 3 * 1024 * 1024; // 3 MB
const ALLOWED = ['image/png', 'image/jpeg', 'image/webp'];
const NOTIFY_TO = process.env.TESTER_NOTIFY_EMAIL || 'hassanbajwa576@gmail.com';

function clean(v: FormDataEntryValue | null, max: number): string | null {
  if (typeof v !== 'string') return null;
  const t = v.trim().slice(0, max);
  return t || null;
}

/** Emails the owner through Resend when RESEND_API_KEY is set. Never throws. */
async function notify(
  id: number,
  username: string | null,
  contact: string | null,
  shot: { data: Buffer; type: string } | null
): Promise<boolean> {
  const key = process.env.RESEND_API_KEY;
  if (!key) return false;
  const ext = shot?.type === 'image/jpeg' ? 'jpg' : shot?.type === 'image/webp' ? 'webp' : 'png';
  const esc = (x: string) => x.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: process.env.RESEND_FROM || 'Universal Scheduler <onboarding@resend.dev>',
        to: [NOTIFY_TO],
        subject: `Instagram tester request${username ? `: @${username}` : ''}`,
        html:
          `<p>New Instagram tester request (#${id}).</p>` +
          `<p><b>Instagram username:</b> ${username ? '@' + esc(username) : '(not given)'}</p>` +
          `<p><b>Contact email:</b> ${contact ? esc(contact) : '(not given)'}</p>` +
          `<p>${shot ? 'Profile screenshot attached.' : 'No screenshot attached.'}</p>` +
          `<p>Add them as an Instagram Tester in your Meta app, then let them know.</p>`,
        ...(shot
          ? { attachments: [{ filename: `profile-${id}.${ext}`, content: shot.data.toString('base64') }] }
          : {}),
      }),
    });
    if (!res.ok) console.error('Resend error:', res.status, await res.text().catch(() => ''));
    return res.ok;
  } catch (e) {
    console.error('Resend failed:', e instanceof Error ? e.message : e);
    return false;
  }
}

/** POST /api/tester-request (multipart): username and/or screenshot, optional contact email. */
export async function POST(request: NextRequest) {
  try {
    const form = await request.formData();
    const username = clean(form.get('username'), 60)?.replace(/^@/, '') ?? null;
    const contact = clean(form.get('email'), 200);

    if (username && !/^[A-Za-z0-9._]{1,30}$/.test(username)) {
      return NextResponse.json(
        { error: 'That does not look like an Instagram username (letters, numbers, dots and underscores only).' },
        { status: 400 }
      );
    }
    if (contact && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact)) {
      return NextResponse.json({ error: 'That email address does not look right.' }, { status: 400 });
    }

    let shot: { data: Buffer; type: string } | null = null;
    const file = form.get('screenshot');
    if (file instanceof File && file.size > 0) {
      if (!ALLOWED.includes(file.type)) {
        return NextResponse.json({ error: 'The screenshot must be a PNG, JPG or WebP image.' }, { status: 400 });
      }
      if (file.size > MAX_BYTES) {
        return NextResponse.json({ error: 'The screenshot is too large (3 MB maximum).' }, { status: 400 });
      }
      shot = { data: Buffer.from(await file.arrayBuffer()), type: file.type };
    }

    if (!username && !shot) {
      return NextResponse.json(
        { error: 'Enter your Instagram username or upload a screenshot of your profile.' },
        { status: 400 }
      );
    }

    const id = await insertTesterRequest(username, contact, shot?.data ?? null, shot?.type ?? null);
    const emailed = await notify(id, username, contact, shot);
    return NextResponse.json({ success: true, emailed });
  } catch (error) {
    console.error('Tester request error:', error);
    return NextResponse.json({ error: 'Could not send your request. Please try again.' }, { status: 500 });
  }
}
