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
    setProcessingMode('latest'); // Signal that the latest video workflow is running

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

      // 3. Get the full video details (needed for the description)
      response = await fetch(`https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${videoId}`, {
          headers: { Authorization: `Bearer ${user.access_token}` }
      });
      data = await response.json();
      if (!response.ok) throw new Error(data.error.message);
      const video = data.items[0];
      setLatestVideo(video); // Save video details for later use

      // 4. Send the request to your backend
      const videoUrl = `https://www.youtube.com/watch?v=${video.id}`;
      const backendResponse = await fetch('/process-youtube-url/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          youtube_url: videoUrl,
          generation_config: {
            creativity: creativityLabels[creativity],
            segmentation_threshold: thresholdLabels[threshold],
            update_video_description: true, // Signal backend this is an auto-update job
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
    <div className="feature-box">
      <h3>Generate & Add Chapters to Your Latest Video</h3>
      <div className="generator-controls">
        <div className="creativity-slider-container">
          <label htmlFor="creativity">Creativity: {creativityLabels[creativity]}</label>
          <input
            type="range"
            id="creativity"
            min="0"
            max="4"
            value={creativity}
            onChange={(e) => setCreativity(e.target.value)}
            className="creativity-slider"
          />
        </div>
        <div className="segmentation-slider-container">
          <label htmlFor="segmentation">Segmentation: {thresholdLabels[threshold]}</label>
          <input
            type="range"
            id="segmentation"
            min="0"
            max="2"
            value={threshold}
            onChange={(e) => setThreshold(e.target.value)}
            className="segmentation-slider"
          />
        </div>
        <button onClick={handleSubmit} className="submit-btn">
          Generate & Add Chapters
        </button>
      </div>
    </div>
  );
}