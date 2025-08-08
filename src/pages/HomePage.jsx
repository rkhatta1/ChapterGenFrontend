import React from "react";

/**
 * HomePage: simple landing page that prompts user to sign in to use ChapGen.
 * The parent App should pass a `onLogin` callback that triggers the Google login.
 */
export default function HomePage({ onLogin }) {
  return (
    <div className="h-screen flex items-center justify-center bg-gray-50 p-6">
      <div className="max-w-2xl w-full bg-white border border-gray-200 rounded-2xl shadow-lg p-12 text-center">
        <h1 className="text-5xl font-black text-cyan-900 mb-4">ChapGen</h1>
        <p className="text-lg text-gray-600 mb-8">
          AI-powered YouTube chapter generation — event driven and cloud native.
        </p>

        <div className="space-y-4">
          <p className="text-sm text-gray-500">
            Sign in with Google to start generating chapters for your videos.
          </p>

          <button
            onClick={onLogin}
            className="inline-flex items-center gap-3 px-8 py-3 rounded-xl bg-gradient-to-r from-cyan-900 to-cyan-800 text-white font-semibold shadow hover:scale-[1.01] transition-transform duration-150"
          >
            Sign in with Google
          </button>
        </div>
      </div>
    </div>
  );
}