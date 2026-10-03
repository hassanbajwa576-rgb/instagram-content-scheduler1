import Link from 'next/link';

export const metadata = { title: 'Privacy Policy · Universal Scheduler' };

export default function Privacy() {
  return (
    <main className="max-w-3xl mx-auto px-4 py-14 text-slate-800 bg-white min-h-screen">
      <Link href="/" className="text-sm text-blue-700 hover:underline">← Back to Universal Scheduler</Link>
      <h1 className="text-3xl font-bold mt-6">Privacy Policy</h1>
      <p className="text-sm text-slate-500 mt-1">Last updated: October 2026</p>

      <div className="mt-8 space-y-6 leading-relaxed">
        <section>
          <h2 className="text-xl font-semibold">What we collect</h2>
          <p className="mt-2">
            When you sign in with LinkedIn we receive your name and a LinkedIn member identifier. When you sign in with
            Instagram we receive your Instagram account identifier and username. We also store the access tokens those
            networks give us, and the posts you schedule (captions, hashtags, media links and times).
          </p>
        </section>
        <section>
          <h2 className="text-xl font-semibold">How we use it</h2>
          <p className="mt-2">
            Only to run the service: to publish the posts you schedule to the networks you connected, and to show you
            your queue. We do not sell your data, do not use it for advertising, and do not read your messages or
            timeline.
          </p>
        </section>
        <section>
          <h2 className="text-xl font-semibold">Where it is stored</h2>
          <p className="mt-2">
            Access tokens and posts are stored in a server-side database. Tokens are never sent to your browser. Your
            browser only holds a signed, expiring session cookie.
          </p>
        </section>
        <section>
          <h2 className="text-xl font-semibold">Your choices and deleting your data</h2>
          <p className="mt-2">
            You can disconnect LinkedIn from the LinkedIn page at any time, and you can remove this app from your
            Instagram or LinkedIn account settings, which revokes our access. To have your stored data deleted, email
            {' '}<a className="underline" href="mailto:hassanbajwa576@gmail.com?subject=Delete%20my%20data">hassanbajwa576@gmail.com</a>
            {' '}with the subject &quot;Delete my data&quot; and the name of your Instagram or LinkedIn account. We will remove your
            account, tokens and queued posts within 30 days.
          </p>
        </section>
        <section>
          <h2 className="text-xl font-semibold">Third parties</h2>
          <p className="mt-2">
            We send your posts to LinkedIn and Instagram (Meta) through their official APIs, and media you link is
            downloaded from the address you provide. Their own privacy policies apply to data on their platforms.
          </p>
        </section>
      </div>
    </main>
  );
}
