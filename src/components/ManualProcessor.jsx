import React from "react";

export default function ManualProcessor({
  url,
  setUrl,
  onManualSubmit,
  isLoading,
}) {
  return (
    <div className="bg-white/0 backdrop-blur-sm border flex border-gray-300 rounded-2xl p-8 shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 overflow-hidden">
      <div className="flex w-full flex-col justify-center items-start space-y-6">
        <h3 className="text-2xl font-bold mb-6 text-cyan-900 justify-center flex items-center gap-3">
          <span className="text-2xl">🎯</span>
          Generate Chapters for a Specific Video
        </h3>
        <form onSubmit={onManualSubmit} className="space-y-4 flex flex-col w-full">
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="Enter any YouTube Video URL"
            className="w-full px-4 py-3 bg-gray-300/50 border border-gray-300 rounded-xl text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-700 focus:border-transparent transition-all duration-300"
          />
          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-gradient-to-r from-cyan-900 to-cyan-800 hover:from-cyan-900 hover:to-cyan-800 text-white font-semibold px-6 py-3 rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300 relative overflow-hidden group"
          >
            <span className="relative z-10">Generate for URL</span>
            <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
          </button>
        </form>
      </div>
    </div>
  );
}