import Link from 'next/link';
import { getSessionUserId } from '@/lib/session';

export const dynamic = 'force-dynamic';

const FEATURES = [
  {
    icon: '🗓️',
    title: 'Schedule weeks in one sitting',
    body: 'Queue as many posts as you like, set the first post time and the gap between them, and leave the rest to us. Posts go out on time, even while you sleep.',
  },
  {
    icon: '🎬',
    title: 'Photos, Reels and videos',
    body: 'Publish images and video to Instagram, and text, image or video posts to LinkedIn, all from the same simple form.',
  },
  {
    icon: '✍️',
    title: 'Long-form captions, handled properly',
    body: 'Write full captions with line breaks and hashtags. We format them for each network so nothing gets cut off or garbled.',
  },
  {
    icon: '🔀',
    title: 'Separate queues per network',
    body: 'Instagram and LinkedIn each get their own queue and their own tone. Nothing is cross-posted unless you choose it.',
  },
  {
    icon: '⚡',
    title: 'Publish now, any time',
    body: 'Changed your mind about timing? Send any queued post immediately, retry a failed one, or delete it before it goes live.',
  },
  {
    icon: '🤖',
    title: 'Built for AI-written content',
    body: 'Draft with Claude or any assistant, paste captions and media links in, and schedule. Bulk import is there when you have dozens of posts ready.',
  },
];

const STEPS = [
  {
    n: '1',
    title: 'Sign in with LinkedIn or Instagram',
    body: 'One click. No password to create and nothing to install. Connect the second network later if you want both.',
  },
  {
    n: '2',
    title: 'Write your post',
    body: 'Add a caption, paste a link to a photo or video, and drop in your hashtags. A live counter keeps you inside each network’s limit.',
  },
  {
    n: '3',
    title: 'Pick when it goes out',
    body: 'Post as soon as possible, or choose a start time and a spacing, such as one post per hour.',
  },
  {
    n: '4',
    title: 'We publish it for you',
    body: 'A background job checks the queue every few minutes and publishes whatever is due. Check the status any time.',
  },
];

const FAQ = [
  {
    q: 'Do I need to be added or approved before I can use it?',
    a: 'No. Anyone can sign in with LinkedIn and start scheduling straight away. Instagram works for professional (Business or Creator) accounts once you authorise the app.',
  },
  {
    q: 'Which Instagram accounts work?',
    a: 'Instagram Business and Creator accounts. Personal accounts cannot publish through Instagram’s official API. You can switch to a professional account for free in the Instagram app settings.',
  },
  {
    q: 'Where do the photos and videos come from?',
    a: 'From a public link you provide. Free stock sites such as Pexels and Pixabay work well, as does any file you host yourself. The link must point directly to an image or video file.',
  },
  {
    q: 'Can I connect both Instagram and LinkedIn?',
    a: 'Yes. Sign in with either one, then connect the other from its page. Both live under one profile with a separate queue for each.',
  },
  {
    q: 'How accurate is the timing?',
    a: 'Posts are picked up by a job that runs every few minutes, so they usually go out within a few minutes of the time you chose.',
  },
  {
    q: 'Is my login safe?',
    a: 'We use each network’s official sign-in. We never see your password. Access tokens are stored on the server, never in your browser, and you can disconnect LinkedIn from its page at any time.',
  },
  {
    q: 'What does it cost?',
    a: 'Nothing right now. There are no plans or paywalls in this version.',
  },
];

function InstagramMark() {
  return (
    <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

function LinkedinMark() {
  return (
    <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor" aria-hidden>
      <path d="M4.98 3.5a2.5 2.5 0 11-.01 5 2.5 2.5 0 01.01-5zM3 9.75h4V21H3V9.75zM9.75 9.75h3.83v1.54h.05c.53-1 1.84-2.06 3.78-2.06 4.04 0 4.79 2.66 4.79 6.12V21h-4v-4.9c0-1.17-.02-2.67-1.63-2.67-1.63 0-1.88 1.27-1.88 2.59V21h-4V9.75z" />
    </svg>
  );
}

function SignInButtons({ size = 'lg' }: { size?: 'lg' | 'md' }) {
  const pad = size === 'lg' ? 'px-6 py-3.5 text-base' : 'px-5 py-2.5 text-sm';
  return (
    <div className="flex flex-col sm:flex-row gap-3">
      <a
        href="/api/auth/linkedin/login"
        className={`inline-flex items-center justify-center gap-2 rounded-xl bg-[#0a66c2] hover:bg-[#084f97] text-white font-semibold shadow-lg shadow-blue-900/20 transition ${pad}`}
      >
        <LinkedinMark /> Continue with LinkedIn
      </a>
      <a
        href="/api/auth/login"
        className={`inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-fuchsia-600 via-pink-600 to-orange-500 hover:opacity-90 text-white font-semibold shadow-lg shadow-pink-900/20 transition ${pad}`}
      >
        <InstagramMark /> Continue with Instagram
      </a>
    </div>
  );
}

function MockQueue() {
  const rows = [
    { t: 'Today · 9:00 AM', c: '3 prompt habits that make AI answers 10x better…', s: 'posted', n: 'LinkedIn' },
    { t: 'Today · 10:00 AM', c: 'Monday motivation: small steps still move you forward…', s: 'pending', n: 'LinkedIn' },
    { t: 'Today · 12:30 PM', c: 'Behind the scenes of our product shoot 🎬 #reels', s: 'pending', n: 'Instagram' },
  ];
  return (
    <div className="rounded-2xl bg-white shadow-2xl shadow-slate-900/20 ring-1 ring-slate-900/5 p-5 text-slate-900">
      <div className="flex items-center justify-between mb-4">
        <p className="font-semibold">Your queue</p>
        <span className="text-xs text-slate-500">3 scheduled</span>
      </div>
      <div className="space-y-3">
        {rows.map((r) => (
          <div key={r.c} className="rounded-lg border border-slate-200 p-3">
            <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
              <span>{r.t}</span>
              <span className={r.n === 'LinkedIn' ? 'text-blue-700 font-medium' : 'text-pink-600 font-medium'}>
                {r.n}
              </span>
            </div>
            <p className="text-sm text-slate-800">{r.c}</p>
            <span
              className={`inline-block mt-2 text-xs px-2 py-0.5 rounded ${
                r.s === 'posted' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
              }`}
            >
              {r.s}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default async function Home({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  const signedIn = !!(await getSessionUserId().catch(() => null));

  return (
    <div className="bg-slate-950 text-slate-100">
      {/* Navigation */}
      <header className="sticky top-0 z-30 border-b border-white/10 bg-slate-950/80 backdrop-blur">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 font-bold text-lg">
            <span className="grid place-items-center w-8 h-8 rounded-lg bg-gradient-to-br from-fuchsia-500 to-blue-500">
              🗓️
            </span>
            Universal Scheduler
          </Link>
          <nav className="hidden md:flex items-center gap-7 text-sm text-slate-300">
            <a href="#features" className="hover:text-white">Features</a>
            <a href="#how" className="hover:text-white">How it works</a>
            <a href="#platforms" className="hover:text-white">Platforms</a>
            <a href="#faq" className="hover:text-white">FAQ</a>
          </nav>
          {signedIn ? (
            <Link href="/dashboard" className="rounded-lg bg-white text-slate-900 px-4 py-2 text-sm font-semibold hover:bg-slate-200">
              Open dashboard
            </Link>
          ) : (
            <a href="/api/auth/linkedin/login" className="rounded-lg bg-white text-slate-900 px-4 py-2 text-sm font-semibold hover:bg-slate-200">
              Sign in
            </a>
          )}
        </div>
      </header>

      {error && (
        <div className="bg-red-500/15 border-b border-red-500/30 text-red-200 text-sm text-center px-4 py-3">
          {error}
        </div>
      )}

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(60%_50%_at_20%_0%,rgba(217,70,239,0.25),transparent),radial-gradient(50%_50%_at_90%_10%,rgba(10,102,194,0.35),transparent)]" />
        <div className="max-w-6xl mx-auto px-4 py-20 md:py-28 grid md:grid-cols-2 gap-14 items-center">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs text-slate-300 mb-6">
              <span className="w-2 h-2 rounded-full bg-emerald-400" /> Free to use · No approval needed to start
            </p>
            <h1 className="text-4xl md:text-6xl font-bold leading-[1.05] tracking-tight">
              One scheduler for <span className="text-[#5aa9f0]">LinkedIn</span> and{' '}
              <span className="bg-gradient-to-r from-fuchsia-400 to-orange-400 bg-clip-text text-transparent">Instagram</span>
            </h1>
            <p className="mt-6 text-lg text-slate-300 max-w-xl">
              Write your posts once, pick the times, and we publish them for you. Sign in with the network you use
              most. There is nothing to install and no password to create.
            </p>
            <div className="mt-8">
              {signedIn ? (
                <div className="flex flex-col sm:flex-row gap-3">
                  <Link href="/linkedin" className="inline-flex justify-center rounded-xl bg-[#0a66c2] hover:bg-[#084f97] px-6 py-3.5 font-semibold">
                    Open LinkedIn scheduler
                  </Link>
                  <Link href="/dashboard" className="inline-flex justify-center rounded-xl bg-gradient-to-r from-fuchsia-600 to-orange-500 px-6 py-3.5 font-semibold">
                    Open Instagram scheduler
                  </Link>
                </div>
              ) : (
                <SignInButtons />
              )}
            </div>
            <p className="mt-4 text-xs text-slate-400">
              We use each network’s official sign-in and never see your password.
            </p>
          </div>
          <MockQueue />
        </div>
      </section>

      {/* Quick facts */}
      <section className="border-y border-white/10 bg-white/[0.02]">
        <div className="max-w-6xl mx-auto px-4 py-8 grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          {[
            ['2', 'networks in one place'],
            ['50', 'posts per batch'],
            ['5 min', 'queue check interval'],
            ['3,000', 'LinkedIn caption characters'],
          ].map(([big, small]) => (
            <div key={small}>
              <p className="text-3xl font-bold">{big}</p>
              <p className="text-sm text-slate-400 mt-1">{small}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section id="features" className="max-w-6xl mx-auto px-4 py-20">
        <div className="max-w-2xl">
          <p className="text-sm font-semibold text-fuchsia-300 uppercase tracking-wide">Features</p>
          <h2 className="mt-2 text-3xl md:text-4xl font-bold">Everything you need to stay consistent</h2>
          <p className="mt-4 text-slate-300">
            Consistency beats bursts of effort. Plan your content when you have the time and let it publish when your
            audience is online.
          </p>
        </div>
        <div className="mt-12 grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {FEATURES.map((f) => (
            <div key={f.title} className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 hover:bg-white/[0.06] transition">
              <div className="text-3xl">{f.icon}</div>
              <h3 className="mt-4 text-lg font-semibold">{f.title}</h3>
              <p className="mt-2 text-sm text-slate-300 leading-relaxed">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="bg-white/[0.03] border-y border-white/10">
        <div className="max-w-6xl mx-auto px-4 py-20">
          <p className="text-sm font-semibold text-fuchsia-300 uppercase tracking-wide">How it works</p>
          <h2 className="mt-2 text-3xl md:text-4xl font-bold">From sign-in to published in four steps</h2>
          <div className="mt-12 grid md:grid-cols-4 gap-6">
            {STEPS.map((s) => (
              <div key={s.n} className="relative rounded-2xl border border-white/10 bg-slate-900/60 p-6">
                <span className="grid place-items-center w-9 h-9 rounded-full bg-gradient-to-br from-fuchsia-500 to-blue-500 font-bold">
                  {s.n}
                </span>
                <h3 className="mt-4 font-semibold">{s.title}</h3>
                <p className="mt-2 text-sm text-slate-300 leading-relaxed">{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Platforms */}
      <section id="platforms" className="max-w-6xl mx-auto px-4 py-20">
        <p className="text-sm font-semibold text-fuchsia-300 uppercase tracking-wide">Platforms</p>
        <h2 className="mt-2 text-3xl md:text-4xl font-bold">Built for the way each network works</h2>
        <div className="mt-12 grid md:grid-cols-2 gap-6">
          <div className="rounded-2xl border border-blue-400/30 bg-gradient-to-br from-blue-600/20 to-transparent p-8">
            <div className="flex items-center gap-3 text-[#5aa9f0]">
              <LinkedinMark />
              <h3 className="text-xl font-bold text-white">LinkedIn</h3>
            </div>
            <ul className="mt-5 space-y-3 text-sm text-slate-200">
              <li>✓ Text, image and video posts to your personal profile</li>
              <li>✓ Captions up to 3,000 characters with line breaks</li>
              <li>✓ Hashtags added at the end of each post</li>
              <li>✓ Sign in with LinkedIn: no extra approval needed</li>
              <li>✓ Connection lasts about 60 days, then reconnect in one click</li>
            </ul>
            <div className="mt-6">
              <a href="/api/auth/linkedin/login" className="inline-flex items-center gap-2 rounded-lg bg-[#0a66c2] hover:bg-[#084f97] px-4 py-2.5 text-sm font-semibold">
                <LinkedinMark /> Continue with LinkedIn
              </a>
            </div>
          </div>
          <div className="rounded-2xl border border-pink-400/30 bg-gradient-to-br from-fuchsia-600/20 to-orange-500/10 p-8">
            <div className="flex items-center gap-3 text-pink-300">
              <InstagramMark />
              <h3 className="text-xl font-bold text-white">Instagram</h3>
            </div>
            <ul className="mt-5 space-y-3 text-sm text-slate-200">
              <li>✓ Photo posts and Reels for Business and Creator accounts</li>
              <li>✓ Captions up to 2,200 characters</li>
              <li>✓ Tokens refreshed automatically so scheduling keeps working</li>
              <li>✓ Every post needs a photo or video link</li>
              <li>✓ Switch to a professional account free in Instagram settings</li>
            </ul>
            <div className="mt-6">
              <a href="/api/auth/login" className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-fuchsia-600 to-orange-500 hover:opacity-90 px-4 py-2.5 text-sm font-semibold">
                <InstagramMark /> Continue with Instagram
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Who it's for */}
      <section className="bg-white/[0.03] border-y border-white/10">
        <div className="max-w-6xl mx-auto px-4 py-20">
          <p className="text-sm font-semibold text-fuchsia-300 uppercase tracking-wide">Who it’s for</p>
          <h2 className="mt-2 text-3xl md:text-4xl font-bold">Anyone who posts regularly and would rather not do it by hand</h2>
          <div className="mt-10 grid sm:grid-cols-2 lg:grid-cols-4 gap-5 text-sm">
            {[
              ['Creators', 'Batch a week of Reels and captions on Sunday, then get on with creating.'],
              ['Founders and freelancers', 'Keep a steady LinkedIn presence for your business without living in the feed.'],
              ['Small businesses', 'Show up on both networks with offers, updates and behind-the-scenes content.'],
              ['Teams using AI', 'Turn AI-drafted captions into a live posting calendar in minutes.'],
            ].map(([t, b]) => (
              <div key={t} className="rounded-2xl border border-white/10 bg-slate-900/60 p-6">
                <h3 className="font-semibold text-base">{t}</h3>
                <p className="mt-2 text-slate-300 leading-relaxed">{b}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Security */}
      <section className="max-w-6xl mx-auto px-4 py-20 grid md:grid-cols-2 gap-12 items-center">
        <div>
          <p className="text-sm font-semibold text-fuchsia-300 uppercase tracking-wide">Privacy and security</p>
          <h2 className="mt-2 text-3xl md:text-4xl font-bold">Your accounts stay yours</h2>
          <p className="mt-4 text-slate-300">
            We only ask for the permissions needed to publish the posts you schedule. We do not read your messages,
            follow accounts, or post anything you did not queue.
          </p>
        </div>
        <ul className="space-y-3 text-sm text-slate-200">
          {[
            'Official OAuth sign-in: your password never reaches us',
            'Access tokens stay on the server and are never sent to your browser',
            'Signed, expiring session cookies',
            'Disconnect LinkedIn from its page whenever you like',
            'Only posts you schedule are ever published',
          ].map((t) => (
            <li key={t} className="flex gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-4">
              <span className="text-emerald-400">✓</span>
              {t}
            </li>
          ))}
        </ul>
      </section>

      {/* FAQ */}
      <section id="faq" className="bg-white/[0.03] border-y border-white/10">
        <div className="max-w-3xl mx-auto px-4 py-20">
          <p className="text-sm font-semibold text-fuchsia-300 uppercase tracking-wide text-center">FAQ</p>
          <h2 className="mt-2 text-3xl md:text-4xl font-bold text-center">Questions, answered</h2>
          <div className="mt-10 space-y-3">
            {FAQ.map((f) => (
              <details key={f.q} className="group rounded-xl border border-white/10 bg-slate-900/60 p-5">
                <summary className="cursor-pointer list-none flex items-center justify-between gap-4 font-medium">
                  {f.q}
                  <span className="text-slate-400 group-open:rotate-45 transition text-xl leading-none">+</span>
                </summary>
                <p className="mt-3 text-sm text-slate-300 leading-relaxed">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="max-w-6xl mx-auto px-4 py-20 text-center">
        <h2 className="text-3xl md:text-5xl font-bold">Ready to put your posting on autopilot?</h2>
        <p className="mt-4 text-slate-300 max-w-xl mx-auto">
          Sign in, write your first post, and schedule it in under a minute.
        </p>
        <div className="mt-8 flex justify-center">
          {signedIn ? (
            <Link href="/dashboard" className="rounded-xl bg-white text-slate-900 px-8 py-3.5 font-semibold hover:bg-slate-200">
              Open dashboard
            </Link>
          ) : (
            <SignInButtons />
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10">
        <div className="max-w-6xl mx-auto px-4 py-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-slate-400">
          <p>© {new Date().getFullYear()} Universal Scheduler</p>
          <div className="flex gap-6">
            <Link href="/privacy" className="hover:text-white">Privacy</Link>
            <Link href="/terms" className="hover:text-white">Terms</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
