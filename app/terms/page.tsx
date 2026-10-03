import Link from 'next/link';

export const metadata = { title: 'Terms of Service · Universal Scheduler' };

export default function Terms() {
  return (
    <main className="max-w-3xl mx-auto px-4 py-14 text-slate-800 bg-white min-h-screen">
      <Link href="/" className="text-sm text-blue-700 hover:underline">← Back to Universal Scheduler</Link>
      <h1 className="text-3xl font-bold mt-6">Terms of Service</h1>
      <p className="text-sm text-slate-500 mt-1">Last updated: October 2026</p>

      <div className="mt-8 space-y-6 leading-relaxed">
        <section>
          <h2 className="text-xl font-semibold">The service</h2>
          <p className="mt-2">
            Universal Scheduler lets you schedule posts to LinkedIn and Instagram accounts that you own or are
            authorised to manage. It is provided as is, without guarantees of availability or exact timing.
          </p>
        </section>
        <section>
          <h2 className="text-xl font-semibold">Your content</h2>
          <p className="mt-2">
            You are responsible for everything you publish, including having the right to use any photos, videos and
            text you schedule. Do not use the service to post unlawful, misleading or abusive content, or spam.
          </p>
        </section>
        <section>
          <h2 className="text-xl font-semibold">Platform rules</h2>
          <p className="mt-2">
            You must follow the rules of LinkedIn and Instagram. We may stop publishing or disconnect an account that
            violates them or puts the service at risk.
          </p>
        </section>
        <section>
          <h2 className="text-xl font-semibold">Limits of liability</h2>
          <p className="mt-2">
            To the extent permitted by law, we are not liable for missed, delayed or failed posts, or for loss caused by
            the networks’ own outages or policy changes.
          </p>
        </section>
        <section>
          <h2 className="text-xl font-semibold">Ending your use</h2>
          <p className="mt-2">
            You can stop at any time by disconnecting your accounts. See the <Link href="/privacy" className="text-blue-700 underline">Privacy Policy</Link> for how your data is handled.
          </p>
        </section>
      </div>
    </main>
  );
}
