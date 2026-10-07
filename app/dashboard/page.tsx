'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { PostComposer, PostQueue, type QueuePost } from '@/components/PostForms';

interface Me {
  name: string | null;
  instagramUsername: string | null;
  hasInstagram: boolean;
  hasLinkedin: boolean;
}

export default function Dashboard() {
  const router = useRouter();
  const [me, setMe] = useState<Me | null>(null);
  const [posts, setPosts] = useState<QueuePost[]>([]);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const loadPosts = useCallback(async () => {
    const res = await fetch('/api/posts', { cache: 'no-store' });
    if (res.status === 401) {
      router.push('/');
      return;
    }
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || 'Could not load posts');
      return;
    }
    setPosts(data.posts);
  }, [router]);

  useEffect(() => {
    const init = async () => {
      try {
        const res = await fetch('/api/me', { cache: 'no-store' });
        if (res.status === 401) {
          router.push('/');
          return;
        }
        if (res.ok) setMe(await res.json());
        await loadPosts();
      } catch {
        setError('Could not load posts');
      }
    };
    void init();
  }, [loadPosts, router]);

  async function publishNow(id: number) {
    setError('');
    setNotice('');
    setBusyId(id);
    try {
      const res = await fetch('/api/posts/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      const data = await res.json();
      if (!res.ok) setError(data.error || 'Failed to publish');
      else setNotice(data.processing ? data.message : 'Published to Instagram');
    } catch {
      setError('Network error while publishing');
    } finally {
      setBusyId(null);
      await loadPosts();
    }
  }

  async function removePost(id: number) {
    setError('');
    setBusyId(id);
    try {
      const res = await fetch(`/api/posts?id=${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) setError(data.error || 'Failed to delete');
    } finally {
      setBusyId(null);
      await loadPosts();
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-6 flex flex-wrap gap-3 justify-between items-center">
          <div>
            <Link href="/" className="text-xs font-semibold tracking-wide text-purple-700 uppercase">
              Universal Scheduler
            </Link>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Instagram</h1>
          </div>
          <div className="flex items-center gap-3">
            {me?.instagramUsername && <span className="text-gray-600">@{me.instagramUsername}</span>}
            <a href="/linkedin" className="bg-blue-700 hover:bg-blue-800 text-white px-4 py-2 rounded">
              LinkedIn
            </a>
            <a href="/api/auth/logout" className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded">
              Logout
            </a>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {error && (
          <p className="mb-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded p-3">{error}</p>
        )}
        {notice && (
          <p className="mb-4 text-sm text-green-800 bg-green-50 border border-green-200 rounded p-3">{notice}</p>
        )}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            {me && !me.hasInstagram ? (
              <div className="bg-white rounded-lg shadow p-8 text-center">
                <h2 className="text-2xl font-bold mb-2">Connect your Instagram account</h2>
                <p className="text-gray-600 mb-6">
                  You signed in with LinkedIn{me.name ? `, ${me.name}` : ''}. Add your Instagram professional
                  account to schedule photos and Reels too. Your LinkedIn queue stays exactly as it is.
                </p>
                <a
                  href="/api/auth/login"
                  className="inline-block bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg font-semibold"
                >
                  Connect Instagram
                </a>
              </div>
            ) : (
              <PostComposer
                platform="instagram"
                endpoint="/api/posts"
                mediaRequired
                onScheduled={async (message) => {
                  setError('');
                  setNotice(message);
                  await loadPosts();
                }}
              />
            )}
          </div>
          <div>
            <PostQueue
              title="Scheduled Posts"
              posts={posts}
              busyId={busyId}
              mediaLabel={(p) => (p.video_url ? 'Reel' : 'Photo')}
              onRefresh={() => void loadPosts()}
              onPublish={publishNow}
              onDelete={removePost}
            />
          </div>
        </div>
      </main>
    </div>
  );
}
