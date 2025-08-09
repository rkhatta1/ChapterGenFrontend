import React from "react";

export default function ProcessedVideosList({ processedVideos }) {
  if (!processedVideos || processedVideos.length === 0) return null;
  return (
    <div className="bg-white/0 backdrop-blur-sm border border-gray-300 rounded-2xl p-8 shadow-xl">
      <h2 className="text-3xl font-bold text-center mb-8 text-cyan-900">
        Archive
      </h2>
      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {processedVideos.map((video) => (
          <a
            key={video.id}
            href={`https://www.youtube.com/watch?v=${video.video_id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex gap-4 p-6 bg-gray-300/50 border border-gray-300 rounded-xl hover:bg-gray-300 hover:-translate-y-1 transition-all duration-300"
          >
            {video.thumbnail_url && (
              <img
                src={video.thumbnail_url}
                alt={video.title}
                className="w-24 h-18 object-cover rounded-lg flex-shrink-0"
              />
            )}
            <div className="flex-1 min-w-0">
              <h4 className="font-semibold text-gray-900 text-sm mb-2 line-clamp-2">
                {video.title}
              </h4>
              <p className="text-gray-500 text-sm">Status: {video.status}</p>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}