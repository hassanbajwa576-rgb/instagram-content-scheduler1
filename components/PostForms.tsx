'use client';

import { useState } from 'react';

export type Platform = 'instagram' | 'linkedin';

export interface QueuePost {
  id: number;
  caption: string;
  image_url: string | null;
  video_url: string | null;
  hashtags: string | null;
  scheduled_time: string;
  status: 'pending' | 'publishing' | 'posted' | 'failed';
  error_message: string | null;
}

interface Draft {
  key: number;
  caption: string;
  mediaUrl: string;
  mediaType: 'auto' | 'image' | 'video';
  hashtags: string;
}

const LIMITS: Record<Platform, number> = { instagram: 2200, linkedin: 3000 };
const VIDEO_EXT = /\.(mp4|mov|m4v|webm)(\?|#|$)/i;

const THEME: Record<Platform, { button: string; ring: string; accent: string }> = {
  instagram: {
    button: 'bg-purple-600 hover:bg-purple-700',
    ring: 'focus:ring-purple-500',
    accent: 'text-purple-700',
  },
  linkedin: {
    button: 'bg-blue-700 hover:bg-blue-800',
    ring: 'focus:ring-blue-500',
    accent: 'text-blue-700',
  },
};

let nextKey = 1;
const blankDraft = (): Draft => ({ key: nextKey++, caption: '', mediaUrl: '', mediaType: 'auto', hashtags: '' });

function pad(n: number) {
  return String(n).padStart(2, '0');
}
function localValue(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const inputClass = (p: Platform) =>
  `w-full p-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 ${THEME[p].ring}`;

function isVideo(d: Draft): boolean {
  if (d.mediaType === 'video') return true;
  if (d.mediaType === 'image') return false;
  return VIDEO_EXT.test(d.mediaUrl.trim());
}

/** The form that replaces pasting JSON: one card per post with caption, media link and hashtags. */
export function PostComposer({
  platform,
  endpoint,
  mediaRequired,
  disabled,
  disabledReason,
  onScheduled,
}: {
  platform: Platform;
  endpoint: string;
  mediaRequired: boolean;
  disabled?: boolean;
  disabledReason?: string;
  onScheduled: (message: string) => void | Promise<void>;
}) {
  const [drafts, setDrafts] = useState<Draft[]>(() => [blankDraft()]);
  const [when, setWhen] = useState<'soon' | 'pick'>('soon');
  const [startTime, setStartTime] = useState('');
  const [interval, setIntervalMinutes] = useState('60');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [showJson, setShowJson] = useState(false);
  const [json, setJson] = useState('');
  const theme = THEME[platform];
  const limit = LIMITS[platform];

  function update(key: number, patch: Partial<Draft>) {
    setDrafts((list) => list.map((d) => (d.key === key ? { ...d, ...patch } : d)));
  }

  function pickWhen(next: 'soon' | 'pick') {
    setWhen(next);
    if (next === 'pick' && !startTime) setStartTime(localValue(new Date(Date.now() + 10 * 60_000)));
  }

  async function send(posts: unknown[]) {
    setBusy(true);
    setError('');
    try {
      const start =
        when === 'pick' && startTime ? new Date(startTime) : new Date(Date.now() + 60_000);
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          posts,
          interval: Number(interval) || 0,
          startTime: start.toISOString(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Could not schedule');
        return false;
      }
      await onScheduled(data.message || 'Scheduled');
      return true;
    } catch {
      setError('Network error while scheduling');
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function submit() {
    for (let i = 0; i < drafts.length; i++) {
      const d = drafts[i];
      const label = drafts.length > 1 ? `Post ${i + 1}: ` : '';
      if (!d.caption.trim()) return setError(`${label}write a caption first.`);
      if (mediaRequired && !d.mediaUrl.trim()) {
        return setError(`${label}Instagram needs an image or video link.`);
      }
      if (d.mediaUrl.trim() && !/^https?:\/\//i.test(d.mediaUrl.trim())) {
        return setError(`${label}the media link must start with http:// or https://`);
      }
      if (d.caption.length > limit) {
        return setError(`${label}caption is over the ${limit} character limit.`);
      }
    }
    if (when === 'pick' && (!startTime || Number.isNaN(new Date(startTime).getTime()))) {
      return setError('Pick a valid date and time.');
    }
    const posts = drafts.map((d) => {
      const url = d.mediaUrl.trim();
      return {
        caption: d.caption.trim(),
        ...(url ? (isVideo(d) ? { videoUrl: url } : { imageUrl: url }) : {}),
        hashtags: d.hashtags.trim() || undefined,
      };
    });
    if (await send(posts)) setDrafts([blankDraft()]);
  }

  async function importJson() {
    setError('');
    let parsed: unknown;
    try {
      parsed = JSON.parse(json);
    } catch {
      return setError('That is not valid JSON.');
    }
    const list = Array.isArray(parsed) ? parsed : (parsed as { posts?: unknown[] } | null)?.posts;
    if (!Array.isArray(list) || list.length === 0) {
      return setError('Expected a JSON array of posts.');
    }
    if (await send(list)) setJson('');
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-2xl font-bold mb-1">New {platform === 'instagram' ? 'Instagram' : 'LinkedIn'} post</h2>
      <p className="text-sm text-gray-600 mb-5">
        {platform === 'instagram'
          ? 'Every Instagram post needs a photo or video link.'
          : 'Add a photo or video link, or leave it empty for a text post.'}{' '}
        Links must be public, direct file URLs.
      </p>

      <div className="space-y-5">
        {drafts.map((d, i) => (
          <div key={d.key} className="border border-gray-200 rounded-lg p-4 bg-gray-50/60">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold text-gray-700">Post {i + 1}</span>
              {drafts.length > 1 && (
                <button
                  type="button"
                  onClick={() => setDrafts((l) => l.filter((x) => x.key !== d.key))}
                  className="text-xs text-red-600 hover:underline"
                >
                  Remove
                </button>
              )}
            </div>

            <label className="block text-sm text-gray-700">
              Caption
              <textarea
                value={d.caption}
                onChange={(e) => update(d.key, { caption: e.target.value })}
                rows={6}
                placeholder="Write your caption here…"
                className={`mt-1 ${inputClass(platform)}`}
              />
            </label>
            <p className={`text-xs mt-1 text-right ${d.caption.length > limit ? 'text-red-600' : 'text-gray-500'}`}>
              {d.caption.length} / {limit}
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-2">
              <label className="block text-sm text-gray-700 sm:col-span-2">
                {mediaRequired ? 'Image or video link' : 'Image or video link (optional)'}
                <input
                  type="url"
                  value={d.mediaUrl}
                  onChange={(e) => update(d.key, { mediaUrl: e.target.value })}
                  placeholder="https://…/clip.mp4"
                  className={`mt-1 ${inputClass(platform)}`}
                />
              </label>
              <label className="block text-sm text-gray-700">
                Type
                <select
                  value={d.mediaType}
                  onChange={(e) => update(d.key, { mediaType: e.target.value as Draft['mediaType'] })}
                  className={`mt-1 ${inputClass(platform)}`}
                >
                  <option value="auto">Auto-detect</option>
                  <option value="image">Photo</option>
                  <option value="video">Video</option>
                </select>
              </label>
            </div>

            <label className="block text-sm text-gray-700 mt-3">
              Hashtags
              <input
                type="text"
                value={d.hashtags}
                onChange={(e) => update(d.key, { hashtags: e.target.value })}
                placeholder="#AI #Productivity #Learning"
                className={`mt-1 ${inputClass(platform)}`}
              />
            </label>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={() => setDrafts((l) => [...l, blankDraft()])}
        className={`mt-4 text-sm font-medium ${theme.accent} hover:underline`}
      >
        + Add another post
      </button>

      <div className="mt-6 border-t pt-5">
        <p className="text-sm font-semibold text-gray-700 mb-2">When to post</p>
        <div className="flex flex-wrap gap-4 text-sm text-gray-700">
          <label className="flex items-center gap-2">
            <input type="radio" checked={when === 'soon'} onChange={() => pickWhen('soon')} />
            As soon as possible
          </label>
          <label className="flex items-center gap-2">
            <input type="radio" checked={when === 'pick'} onChange={() => pickWhen('pick')} />
            Pick date and time
          </label>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-3">
          {when === 'pick' && (
            <label className="text-sm text-gray-700">
              First post at
              <input
                type="datetime-local"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className={`mt-1 ${inputClass(platform)}`}
              />
            </label>
          )}
          {drafts.length > 1 && (
            <label className="text-sm text-gray-700">
              Minutes between posts
              <input
                type="number"
                min={0}
                value={interval}
                onChange={(e) => setIntervalMinutes(e.target.value)}
                className={`mt-1 ${inputClass(platform)}`}
              />
            </label>
          )}
        </div>
        <p className="text-xs text-gray-500 mt-2">
          Posts go out within a few minutes of their time. Use &quot;Publish now&quot; in the queue to send one
          immediately.
        </p>
      </div>

      {error && (
        <p className="mt-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded p-3">{error}</p>
      )}
      {disabled && disabledReason && (
        <p className="mt-4 text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded p-3">
          {disabledReason}
        </p>
      )}

      <button
        type="button"
        onClick={submit}
        disabled={busy || disabled}
        className={`w-full mt-5 ${theme.button} disabled:opacity-50 text-white py-3 rounded-lg font-semibold`}
      >
        {busy ? 'Scheduling…' : drafts.length > 1 ? `Schedule ${drafts.length} posts` : 'Schedule post'}
      </button>

      <div className="mt-5 text-xs text-gray-500">
        <button type="button" onClick={() => setShowJson((v) => !v)} className="underline">
          {showJson ? 'Hide bulk import' : 'Have many posts ready? Bulk import'}
        </button>
        {showJson && (
          <div className="mt-2">
            <textarea
              value={json}
              onChange={(e) => setJson(e.target.value)}
              rows={6}
              spellCheck={false}
              placeholder='[{"caption":"…","videoUrl":"https://…","hashtags":"#tag"}]'
              className={`${inputClass(platform)} font-mono`}
            />
            <button
              type="button"
              onClick={importJson}
              disabled={busy || disabled || !json.trim()}
              className="mt-2 bg-gray-800 hover:bg-gray-900 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm"
            >
              Import and schedule
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

const STATUS_STYLE: Record<QueuePost['status'], string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  publishing: 'bg-blue-100 text-blue-800',
  posted: 'bg-green-100 text-green-800',
  failed: 'bg-red-100 text-red-800',
};

/** The queue of scheduled posts, with full captions available on click. */
export function PostQueue({
  title,
  posts,
  busyId,
  mediaLabel,
  onRefresh,
  onPublish,
  onDelete,
}: {
  title: string;
  posts: QueuePost[];
  busyId: number | null;
  mediaLabel: (p: QueuePost) => string;
  onRefresh: () => void;
  onPublish: (id: number) => void;
  onDelete: (id: number) => void;
}) {
  const [open, setOpen] = useState<Record<number, boolean>>({});
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold">{title}</h2>
        <button onClick={onRefresh} className="text-sm text-blue-600 hover:underline">
          Refresh
        </button>
      </div>
      {posts.length === 0 ? (
        <p className="text-gray-500 text-center py-8">Nothing scheduled yet</p>
      ) : (
        <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
          {posts.map((post) => {
            const expanded = !!open[post.id];
            const long = post.caption.length > 160;
            return (
              <div key={post.id} className="border rounded-lg p-3 text-sm">
                <p className={`text-gray-800 whitespace-pre-wrap break-words ${expanded ? '' : 'line-clamp-3'}`}>
                  {post.caption}
                </p>
                {long && (
                  <button
                    onClick={() => setOpen((o) => ({ ...o, [post.id]: !expanded }))}
                    className="text-xs text-blue-600 hover:underline mt-1"
                  >
                    {expanded ? 'Show less' : 'Show full caption'}
                  </button>
                )}
                {post.hashtags && <p className="text-xs text-gray-500 mt-1 break-words">{post.hashtags}</p>}
                <p className="text-xs text-gray-500 mt-2">
                  {new Date(post.scheduled_time).toLocaleString()} · {mediaLabel(post)}
                </p>
                <span className={`mt-2 inline-block text-xs px-2 py-1 rounded ${STATUS_STYLE[post.status]}`}>
                  {post.status}
                </span>
                {post.error_message && (
                  <p className="mt-2 text-xs text-red-700 break-words">{post.error_message}</p>
                )}
                {(post.status === 'pending' || post.status === 'failed') && (
                  <div className="mt-3 flex gap-2">
                    <button
                      onClick={() => onPublish(post.id)}
                      disabled={busyId === post.id}
                      className="text-xs bg-gray-900 hover:bg-black disabled:opacity-50 text-white px-3 py-1 rounded"
                    >
                      {busyId === post.id ? 'Working…' : post.status === 'failed' ? 'Retry now' : 'Publish now'}
                    </button>
                    <button
                      onClick={() => onDelete(post.id)}
                      disabled={busyId === post.id}
                      className="text-xs bg-gray-200 hover:bg-gray-300 disabled:opacity-50 text-gray-800 px-3 py-1 rounded"
                    >
                      Delete
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
