'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { PostComposer, PostQueue, type QueuePost } from '@/components/PostForms';

interface LinkedinStatus {
  connected: boolean;
  expired: boolean;
  name: string | null;
}

export default function LinkedinDashboard() {
  const router = useRouter();
  const [posts, setPosts] = useState<(QueuePost & { image_url: string | null; video_url: string | null })[]>([]);
  const [linkedin, setLinkedin] = useState<LinkedinStatus>({ connected: false, expired: false, name: null });
  const [statusLoaded, setStatusLoaded] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const loadPosts = useCallback(async () => {
    const res = await fetch('/api/linkedin/posts', { cache: 'no-store' });
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

  const loadStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/linkedin/status', { cache: 'no-store' });
      if (res.ok) setLinkedin(await res.json());
    } catch {
      /* optional */
    } finally {
      setStatusLoaded(true);
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      const q = new URLSearchParams(window.location.search);
      if (q.get('linkedin') === 'connected') setNotice('LinkedIn connected.');
      if (q.get('linkedin') === 'error') setError(q.get('detail') || 'LinkedIn connection failed');
      void loadStatus();
      try {
        await loadPosts();
      } catch {
        setError('Could not load posts');
      }
    };
    void init();
  }, [loadPosts, loadStatus]);

  async function publishNow(id: number) {
    setError('');
    setNotice('');
    setBusyId(id);
    try {
      const res = await fetch('/api/linkedin/posts/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      const data = await res.json();
      if (!res.ok) setError(data.error || 'Failed to publish');
      else setNotice('Published to LinkedIn');
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
      const res = await fetch(`/api/linkedin/posts?id=${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) setError(data.error || 'Failed to delete');
    } finally {
      setBusyId(null);
      await loadPosts();
    }
  }

  async function disconnect() {
    setError('');
    await fetch('/api/linkedin/disconnect', { method: 'POST' });
    await loadStatus();
    setNotice('LinkedIn disconnected.');
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-6 flex flex-wrap gap-3 justify-between items-center">
          <div>
            <Link href="/" className="text-xs font-semibold tracking-wide text-blue-700 uppercase">
              Universal Scheduler
            </Link>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">LinkedIn</h1>
          </div>
          <div className="flex items-center gap-3">
            <a href="/dashboard" className="text-blue-700 hover:underline">
              Instagram
            </a>
            {!statusLoaded ? (
              <span className="text-sm text-gray-500">Checking LinkedIn…</span>
            ) : linkedin.connected ? (
              <button
                onClick={disconnect}
                title="Click to disconnect LinkedIn"
                className="bg-blue-100 hover:bg-blue-200 text-blue-900 px-4 py-2 rounded"
              >
                {linkedin.name || 'LinkedIn connected'}
              </button>
            ) : (
              <a
                href="/api/auth/linkedin/login"
                className="bg-blue-700 hover:bg-blue-800 text-white px-4 py-2 rounded"
              >
                {linkedin.expired ? 'Reconnect LinkedIn' : 'Connect LinkedIn'}
              </a>
            )}
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
            <PostComposer
              platform="linkedin"
              endpoint="/api/linkedin/posts"
              mediaRequired={false}
              disabled={!statusLoaded || !linkedin.connected}
              disabledReason={statusLoaded ? 'Connect LinkedIn (top right) before scheduling.' : undefined}
              onScheduled={async (message) => {
                setError('');
                setNotice(message);
                await loadPosts();
              }}
            />
          </div>
          <div>
            <PostQueue
              title="LinkedIn Queue"
              posts={posts}
              busyId={busyId}
              mediaLabel={(p) => {
                const x = p as { video_url?: string | null; image_url?: string | null };
                return x.video_url ? 'Video' : x.image_url ? 'Image' : 'Text';
              }}
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
