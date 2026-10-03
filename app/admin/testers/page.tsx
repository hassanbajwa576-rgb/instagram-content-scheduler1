import { notFound } from 'next/navigation';
import { listTesterRequests } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Tester requests', robots: { index: false, follow: false } };

/** /admin/testers?key=ADMIN_SECRET: the Instagram tester requests people have sent. */
export default async function Testers({ searchParams }: { searchParams: Promise<{ key?: string }> }) {
  const { key } = await searchParams;
  const secret = process.env.ADMIN_SECRET;
  if (!secret || key !== secret) notFound();

  const rows = await listTesterRequests();
  return (
    <main className="min-h-screen bg-white p-6 text-slate-900">
      <h1 className="text-2xl font-bold">Instagram tester requests ({rows.length})</h1>
      <p className="mt-1 text-sm text-slate-600">
        Add each person under Meta app → App roles → Roles → Instagram Testers.
      </p>
      <table className="mt-6 w-full text-left text-sm">
        <thead>
          <tr className="border-b font-semibold">
            <th className="py-2 pr-4">#</th>
            <th className="py-2 pr-4">When</th>
            <th className="py-2 pr-4">Username</th>
            <th className="py-2 pr-4">Email</th>
            <th className="py-2">Screenshot</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-b align-top">
              <td className="py-2 pr-4">{r.id}</td>
              <td className="py-2 pr-4">{new Date(r.created_at).toLocaleString()}</td>
              <td className="py-2 pr-4">{r.instagram_username ? `@${r.instagram_username}` : '—'}</td>
              <td className="py-2 pr-4">{r.contact_email || '—'}</td>
              <td className="py-2">
                {r.has_screenshot ? (
                  <a
                    className="text-blue-700 underline"
                    href={`/api/admin/screenshot?id=${r.id}&key=${encodeURIComponent(key!)}`}
                    target="_blank"
                  >
                    View
                  </a>
                ) : (
                  '—'
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {rows.length === 0 && <p className="mt-6 text-slate-500">No requests yet.</p>}
    </main>
  );
}
