import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-500 to-purple-600">
      {/* Navigation */}
      <nav className="bg-white/10 backdrop-blur-md text-white py-4">
        <div className="max-w-7xl mx-auto px-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold">📱 Instagram Content Scheduler</h1>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-4 py-20 text-white">
        <div className="text-center">
          <h2 className="text-5xl font-bold mb-6">
            Automate Your Instagram Posts with AI
          </h2>
          <p className="text-xl mb-8 text-white/90">
            Give Claude a prompt, and it generates captions, finds royalty-free media,
            and schedules posts automatically to your Instagram.
          </p>

          <Link
            href="/api/auth/login"
            className="inline-block bg-white text-purple-600 px-8 py-4 rounded-lg font-bold text-lg hover:bg-gray-100 transition"
          >
            Connect Instagram Account
          </Link>
        </div>

        {/* Features */}
        <div className="grid md:grid-cols-3 gap-8 mt-20">
          <div className="bg-white/10 backdrop-blur p-6 rounded-lg">
            <div className="text-4xl mb-4">✨</div>
            <h3 className="text-xl font-bold mb-2">AI-Powered</h3>
            <p>Give Claude a prompt and it generates creative captions and finds perfect media</p>
          </div>

          <div className="bg-white/10 backdrop-blur p-6 rounded-lg">
            <div className="text-4xl mb-4">🎬</div>
            <h3 className="text-xl font-bold mb-2">Royalty-Free Media</h3>
            <p>Automatically fetches videos and images from Pexels and Pixabay</p>
          </div>

          <div className="bg-white/10 backdrop-blur p-6 rounded-lg">
            <div className="text-4xl mb-4">⏰</div>
            <h3 className="text-xl font-bold mb-2">Auto-Scheduling</h3>
            <p>Posts publish automatically at your specified intervals</p>
          </div>
        </div>

        {/* How It Works */}
        <div className="mt-20 bg-white/10 backdrop-blur p-8 rounded-lg">
          <h3 className="text-3xl font-bold mb-6">How It Works</h3>
          <ol className="space-y-4 text-lg">
            <li><strong>1. Connect:</strong> Link your Instagram business account</li>
            <li><strong>2. Prompt:</strong> Tell Claude what kind of posts you want</li>
            <li><strong>3. Generate:</strong> Claude creates captions and finds media</li>
            <li><strong>4. Schedule:</strong> Posts automatically publish at your intervals</li>
            <li><strong>5. Relax:</strong> Your Instagram grows on autopilot</li>
          </ol>
        </div>
      </main>
    </div>
  );
}
