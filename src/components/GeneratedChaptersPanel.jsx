import React from "react";

export default function GeneratedChaptersPanel({
  generatedChapters,
  onCopy,
}) {
  if (!generatedChapters) return null;
  return (
    <div className="bg-white/0 backdrop-blur-sm border border-gray-300 rounded-2xl p-8 shadow-xl">
      <h3 className="text-2xl font-bold mb-6 text-cyan-900">
        Generated Chapters (for Manual URL)
      </h3>
      <textarea
        readOnly
        value={generatedChapters}
        rows="10"
        className="w-full p-4 bg-gray-800 border border-cyan-700 rounded-xl text-gray-200 font-mono text-sm resize-y focus:outline-none focus:ring-2 focus:ring-green-500"
      />
      <button
        onClick={onCopy}
        className="mt-4 bg-gradient-to-r from-cyan-900 to-cyan-800 hover:from-cyan-900 hover:to-cyan-800 text-white font-semibold px-6 py-3 rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300"
      >
        Copy to Clipboard
      </button>
    </div>
  );
}