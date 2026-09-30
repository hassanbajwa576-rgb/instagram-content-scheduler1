'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface ScheduledPost {
  caption: string;
  imageUrl?: string;
  videoUrl?: string;
  hashtags?: string;
  scheduledTime: string;
  status: string;
}

export default function Dashboard() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [posts, setPosts] = useState<ScheduledPost[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    // Get username from cookie (in production, fetch from database)
    const username = localStorage.getItem('instagram_username');
    if (username) {
      setUsername(username);
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('instagram_username');
    router.push('/');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-6 flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-900">Instagram Content Scheduler</h1>
          <div className="flex items-center gap-4">
            {username && <span className="text-gray-600">@{username}</span>}
            <button
              onClick={handleLogout}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left: Create Posts */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-2xl font-bold mb-6">Give Claude a Prompt</h2>

              <div className="space-y-4 mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-sm text-gray-700">
                  <strong>Example:</strong> "Create 5 Instagram posts about fitness tips with motivational quotes,
                  using royalty-free workout videos from Pexels. Schedule them every 30 minutes starting now."
                </p>
              </div>

              <textarea
                placeholder="Give Claude a prompt to generate and schedule posts..."
                className="w-full h-40 p-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />

              <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600 mb-3">
                  <strong>How it works:</strong>
                </p>
                <ol className="list-decimal list-inside space-y-2 text-sm text-gray-600">
                  <li>Give Claude a prompt describing the posts you want</li>
                  <li>Claude generates captions and finds royalty-free media from Pixabay/Pexels</li>
                  <li>Claude uploads the posts to this app</li>
                  <li>Posts auto-publish to your Instagram at your specified intervals</li>
                </ol>
              </div>

              <button className="w-full mt-6 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-semibold">
                Generate & Schedule Posts
              </button>
            </div>
          </div>

          {/* Right: Scheduled Posts Preview */}
          <div>
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-bold mb-4">Scheduled Posts</h2>
              {posts.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No posts scheduled yet</p>
              ) : (
                <div className="space-y-4">
                  {posts.map((post, idx) => (
                    <div key={idx} className="border rounded-lg p-3 text-sm">
                      <p className="text-gray-700 truncate">{post.caption}</p>
                      <p className="text-xs text-gray-500 mt-2">
                        {new Date(post.scheduledTime).toLocaleString()}
                      </p>
                      <span className={`mt-2 inline-block text-xs px-2 py-1 rounded ${
                        post.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                        post.status === 'posted' ? 'bg-green-100 text-green-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {post.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
