import { useState } from 'react';

export default function LatestVideoProcessor({ user, setIsLoading, setError, setLatestVideo, setProcessingMode }) {
  const [creativity, setCreativity] = useState(2);
  const [threshold, setThreshold] = useState(1);
  const creativityLabels = ['GenZ', 'Creative', 'Neutral', 'Formal', 'Corporate'];
  const thresholdLabels = ['Detailed', 'Default', 'Abstract'];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setProcessingMode('latest');

    try {
      // 1. Find the user's channel
      let response = await fetch(`https://www.googleapis.com/youtube/v3/channels?part=contentDetails&mine=true`, {
        headers: { Authorization: `Bearer ${user.access_token}` },
      });
      let data = await response.json();
      if (!response.ok || !data.items || data.items.length === 0) throw new Error(data.error?.message || 'Could not find YouTube channel.');
      const uploadsPlaylistId = data.items[0].contentDetails.relatedPlaylists.uploads;

      // 2. Find the latest video in the uploads playlist
      response = await fetch(`https://www.googleapis.com/youtube/v3/playlistItems?part=contentDetails&playlistId=${uploadsPlaylistId}&maxResults=1`, {
        headers: { Authorization: `Bearer ${user.access_token}` },
      });
      data = await response.json();
      if (!response.ok || !data.items || data.items.length === 0) throw new Error(data.error?.message || 'Could not find latest video.');
      const videoId = data.items[0].contentDetails.videoId;

      // 3. Get the full video details
      response = await fetch(`https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${videoId}`, {
          headers: { Authorization: `Bearer ${user.access_token}` }
      });
      data = await response.json();
      if (!response.ok) throw new Error(data.error.message);
      const video = data.items[0];
      setLatestVideo(video);

      // 4. Send the request to backend
      const videoUrl = `https://www.youtube.com/watch?v=${video.id}`;
      const backendResponse = await fetch('/process-youtube-url/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          youtube_url: videoUrl,
          generation_config: {
            creativity: creativityLabels[creativity],
            segmentation_threshold: thresholdLabels[threshold],
            update_video_description: true,
          },
          access_token: user.access_token,
          video_details: video
        }),
      });

      if (!backendResponse.ok) {
        const errorResult = await backendResponse.json();
        throw new Error(errorResult.message || `HTTP error! Status: ${backendResponse.status}`);
      }

      const result = await backendResponse.json();
      if (result.status === 'failure') {
        throw new Error(result.message || 'Failed to process the video.');
      }

    } catch (err) {
      setError(`An error occurred: ${err.message}`);
      setIsLoading(false);
      setProcessingMode(null);
    }
  };

  return (
    <div className="bg-white/0 backdrop-blur-sm border border-gray-300 rounded-2xl p-8 shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 relative overflow-hidden">
      {/* Gradient border effect on hover */}
      {/* <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/20 via-purple-500/20 to-cyan-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl"></div> */}
      
      <div className="flex flex-col items-center justify-center space-y-6 w-full">
        <h3 className="text-2xl font-bold mb-8 text-cyan-900 flex items-center gap-3">
          <span className="text-2xl">⚡</span>
          Generate & Add Chapters to Your Latest Video
        </h3>
        
        <div className="space-y-8 flex flex-col items-center w-full">
          {/* Creativity Slider */}
          <div className="space-y-4 flex flex-col items-center w-full">
            <label className="block text-lg font-semibold text-gray-500">
              Creativity: <span className="text-cyan-900">{creativityLabels[creativity]}</span>
            </label>
            <div className="w-full flex flex-col">
              <input
                type="range"
                id="creativity"
                min="0"
                max="4"
                value={creativity}
                onChange={(e) => setCreativity(parseInt(e.target.value))}
                className="w-full h-2 bg-cyan-700 rounded-lg appearance-none cursor-pointer slider"
                style={{
                  background: `linear-gradient(to right, rgb(22 78 99) 0%, rgb(22 78 99) ${(creativity / 4) * 100}%, rgb(6 182 212) ${(creativity / 4) * 100}%, rgb(6 182 212) 100%)`
                }}
              />
              <div className="flex justify-between items-center text-center text-xs text-gray-500 mt-2">
                <span>GenZ</span>
                <span>Creative</span>
                <span>Neutral</span>
                <span>Formal</span>
                <span>Corporate</span>
              </div>
            </div>
          </div>

          {/* Segmentation Slider */}
          <div className="space-y-4 flex flex-col items-center w-full">
            <label className="block text-lg font-semibold text-gray-500">
              Segmentation: <span className="text-cyan-900">{thresholdLabels[threshold]}</span>
            </label>
            <div className="flex flex-col items-center w-full">
              <input
                type="range"
                id="segmentation"
                min="0"
                max="2"
                value={threshold}
                onChange={(e) => setThreshold(parseInt(e.target.value))}
                className="w-full h-2 bg-gray-800 rounded-lg appearance-none cursor-pointer slider"
                style={{
                  background: `linear-gradient(to right, rgb(22 78 99) 0%, rgb(22 78 99) ${(threshold / 2) * 100}%, rgb(6 182 212) ${(threshold / 2) * 100}%, rgb(6 182 212) 100%)`
                }}
              />
              <div className="flex w-full justify-between text-xs text-gray-500 mt-2">
                <span>Detailed</span>
                <span>Default</span>
                <span>Abstract</span>
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <button 
            onClick={handleSubmit}
            className="w-full bg-gradient-to-r from-cyan-900 to-cyan-800 hover:from-cyan-900 hover:to-cyan-800 text-white font-semibold px-8 py-4 rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300 relative overflow-hidden group"
          >
            <span className="relative z-10">Generate & Add Chapters</span>
            <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
          </button>
        </div>
      </div>

      {/* Custom slider styles */}
      <style jsx>{`
        .slider::-webkit-slider-thumb {
          appearance: none;
          height: 20px;
          width: 20px;
          border-radius: 50%;
          background: rgb(22 78 99);
          cursor: pointer;
          box-shadow: 0 0 15px rgba(22, 78, 99, 0.5);
          transition: all 0.2s ease;
        }
        
        .slider::-webkit-slider-thumb:hover {
          transform: scale(1.1);
          box-shadow: 0 0 20px rgba(22, 78, 99, 0.7);
        }
        
        .slider::-moz-range-thumb {
          height: 20px;
          width: 20px;
          border-radius: 50%;
          background: rgb(22 78 99);
          cursor: pointer;
          border: none;
          box-shadow: 0 0 15px rgba(22, 78, 99, 0.5);
        }
      `}</style>
    </div>
  );
}