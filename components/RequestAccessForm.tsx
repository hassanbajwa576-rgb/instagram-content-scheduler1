'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function RequestAccessForm({ fromSignIn = false }: { fromSignIn?: boolean }) {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!username.trim() && !file) {
      setError('Enter your Instagram username or upload a screenshot of your profile.');
      return;
    }
    setBusy(true);
    try {
      const body = new FormData();
      body.set('username', username);
      body.set('email', email);
      if (file) body.set('screenshot', file);
      const res = await fetch('/api/tester-request', { method: 'POST', body });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) setError(data.error || 'Could not send your request.');
      else setDone(true);
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  const input =
    'mt-1 w-full rounded-lg border border-slate-300 bg-white p-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-fuchsia-500';

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <div className="max-w-xl mx-auto px-4 py-14">
        <Link href="/" className="text-sm text-fuchsia-700 hover:underline">
          ← Back to Universal Scheduler
        </Link>
        {fromSignIn && (
          <p className="mt-6 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            Instagram sign-in did not complete. If you have not been added as a tester yet, send your details below
            and we will add you. If you were already added, accept the invite in Instagram (Settings → Apps and
            websites → Tester invites) and try again.
          </p>
        )}
        <h1 className="mt-6 text-3xl font-bold">Request Instagram tester access</h1>
        <p className="mt-3 text-slate-600">
          While our Instagram connection is in testing, each account has to be added as a tester before it can sign
          in. Send us your Instagram username or a screenshot of your profile and we will add you, usually within a
          day. LinkedIn does not need this step.
        </p>

        {done ? (
          <div className="mt-8 rounded-xl border border-green-200 bg-green-50 p-6 text-green-900">
            <p className="font-semibold">Request sent.</p>
            <p className="mt-2 text-sm">
              We will add your account as a tester. Once you accept the invitation in Instagram (Settings →
              Apps and websites → Tester invites), come back and choose “Continue with Instagram”.
            </p>
          </div>
        ) : (
          <form onSubmit={submit} className="mt-8 space-y-5 rounded-xl bg-white p-6 shadow">
            <label className="block text-sm font-medium text-slate-700">
              Instagram username
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="@yourname"
                autoComplete="off"
                className={input}
              />
            </label>
            <label className="block text-sm font-medium text-slate-700">
              Or a screenshot of your Instagram profile
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                className={input}
              />
              <span className="text-xs font-normal text-slate-500">PNG, JPG or WebP, up to 3 MB.</span>
            </label>
            <label className="block text-sm font-medium text-slate-700">
              Your email (optional, so we can tell you when you are added)
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className={input}
              />
            </label>

            {error && (
              <p className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>
            )}

            <button
              type="submit"
              disabled={busy}
              className="w-full rounded-lg bg-gradient-to-r from-fuchsia-600 to-orange-500 py-3 font-semibold text-white disabled:opacity-50"
            >
              {busy ? 'Sending…' : 'Send request'}
            </button>
            <p className="text-xs text-slate-500">
              We only use this to add you as a tester. See the{' '}
              <Link href="/privacy" className="underline">
                Privacy Policy
              </Link>
              .
            </p>
          </form>
        )}
      </div>
    </main>
  );
}
