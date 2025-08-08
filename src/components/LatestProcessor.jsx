import React from "react";

export default function LatestProcessor({
  onGenerate,
  isLoading,
}) {
  return (
    <div className="bg-white/0 backdrop-blur-sm border border-gray-300 rounded-2xl p-8 shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 relative overflow-hidden">
      <div className="flex flex-col items-center justify-center space-y-6 w-full">
        <h3 className="text-2xl font-bold mb-8 text-cyan-900 flex items-center gap-3">
          <span className="text-2xl">⚡</span>
          Generate & Add Chapters to Your Latest Video
        </h3>

        <div className="w-full max-w-xl">
          <p className="text-gray-600 mb-6">
            Generate semantic chapters for your most recent upload and optionally update the video
            description. Use the Settings page to adjust creativity and segmentation preferences.
          </p>

          <button
            onClick={onGenerate}
            disabled={isLoading}
            className="w-full bg-gradient-to-r from-cyan-900 to-cyan-800 hover:from-cyan-900 hover:to-cyan-800 text-white font-semibold px-8 py-4 rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300 relative overflow-hidden group"
          >
            <span className="relative z-10">Generate & Add Chapters</span>
            <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
          </button>
        </div>
      </div>
    </div>
  );
}