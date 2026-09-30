# Instagram Content Scheduler

Automate your Instagram posts with AI-generated captions and royalty-free media. Give Claude a prompt, and it generates posts, finds media from Pexels/Pixabay, and schedules them automatically to your Instagram.

## Features

- 🔐 Secure OAuth 2.0 authentication with Instagram
- 📝 AI-generated captions via Claude (integrated separately)
- 🎬 Royalty-free media from Pexels/Pixabay
- ⏰ Automatic scheduling at custom intervals
- 📊 Dashboard to manage scheduled posts
- 🚀 Deployed on Vercel with PostgreSQL

## Quick Start

1. Connect your Instagram business account
2. Go to Claude and give a prompt: "Create 5 Instagram posts about fitness tips with royalty-free videos from Pexels"
3. Claude generates captions and finds videos
4. Paste the JSON into the app
5. Posts auto-publish at your intervals

## Setup

```bash
npm install
npm run dev
```

## Environment Variables

```env
META_APP_ID=1027582156990592
META_APP_SECRET=054fea5a71377a865f3494ff8a4c5232
META_REDIRECT_URI=http://localhost:3000/api/auth/callback
NEXT_PUBLIC_API_URL=http://localhost:3000
```

## How It Works

- **Dashboard**: Connect Instagram, view scheduled posts
- **Claude Integration**: Give Claude a prompt to generate captions and find media
- **Auto-Scheduling**: Posts publish at specified intervals via Vercel Cron
- **Royalty-Free**: Uses Pexels/Pixabay API for media

## Tech Stack

- Next.js 14 (App Router)
- Tailwind CSS
- Meta Graph API
- Vercel Postgres
- Vercel Cron

## Deployment

1. Push to GitHub
2. Connect to Vercel
3. Add environment variables
4. Deploy

---

Built for automating Instagram content with AI
