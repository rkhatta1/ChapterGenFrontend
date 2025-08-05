import { useState, useEffect, useCallback, useRef } from 'react';

// --- Child Component for Manual URL processing ---
const ManualUrlProcessor = ({ user, socket, setIsLoading, setError }) => {
  const [url, setUrl] = useState('');

  const handleManualSubmit = async (e) => {
    e.preventDefault();
    if (!url) {
      setError('Please enter a YouTube video URL.');
      return;
    }
    setIsLoading(true);
    setError('');

    try {
        const backendResponse = await fetch('/process-youtube-url/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              youtube_url: url,
              // We need to signal the backend NOT to update the video
              generation_config: { update_video_description: false },
              access_token: user.access_token,
              // For manual URLs, video_details can be minimal
              video_details: { id: url.split('v=')[1]?.split('&')[0] || 'manual', snippet: { title: 'Manual URL', description: '', thumbnails: { high: { url: '' } } } }
            }),
        });

        if (!backendResponse.ok) {
            const errorResult = await backendResponse.json();
            throw new Error(errorResult.detail || `HTTP error! Status: ${backendResponse.status}`);
        }
        
    } catch (err) {
      setError(`An error occurred: ${err.message}`);
      setIsLoading(false);
    }
  };

  return (
    <div className="feature-box">
      <h3>Generate Chapters for a Specific Video</h3>
      <form onSubmit={handleManualSubmit}>
        <input
          type="text"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="Enter any YouTube Video URL"
          className="url-input"
        />
        <button type="submit" className="submit-btn">Generate Chapters</button>
      </form>
    </div>
  );
};


// --- Main Hero Page Component ---
export default function HeroPage({ user, profile, handleLogout }) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [processedVideos, setProcessedVideos] = useState([]);
  const [generatedChapters, setGeneratedChapters] = useState('');
  const socket = useRef(null);

  // Fetch user's previously processed videos
  const fetchProcessedVideos = useCallback(async (email) => {
    try {
      const response = await fetch(`/api/db/jobs/by-user/${email}`);
      if (response.ok) {
        setProcessedVideos(await response.json());
      }
    } catch (err) {
      console.error('Error fetching processed videos:', err);
    }
  }, []);

  useEffect(() => {
    if (profile) {
      fetchProcessedVideos(profile.email);
    }
  }, [profile, fetchProcessedVideos]);
  
  // WebSocket connection logic
  useEffect(() => {
    if (!user) return;

    const ws = new WebSocket('wss://chapgen.app/ws/');
    socket.current = ws;

    ws.onopen = () => {
      console.log('WebSocket connection established');
      ws.send(JSON.stringify({ access_token: user.access_token }));
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'chapters_ready' && data.data.chapters) {
          const formatted = data.data.chapters.map(ch => `${formatTime(ch.start_time)} ${ch.title}`).join('\n');
          setGeneratedChapters(formatted);
          setIsLoading(false); // Stop loading indicator
          alert("Chapters Generated!");
      }
    };

    ws.onerror = (err) => console.error('WebSocket error:', err);
    ws.onclose = () => console.log('WebSocket connection closed');

    return () => ws.close();
  }, [user]);

  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="hero-page">
      <div className="profile-header">
        <img src={profile.picture} alt="user" />
        <h3>{profile.name}</h3>
        <button onClick={handleLogout}>Log out</button>
      </div>
      
      {isLoading && (
          <div className="loading-container">
            <p>Processing video... this may take a few minutes.</p>
          </div>
      )}

      {error && <p className="error-message">{error}</p>}

      {generatedChapters && (
        <div className="results-box">
            <h3>Generated Chapters</h3>
            <textarea readOnly value={generatedChapters} rows="10"></textarea>
            <button onClick={() => navigator.clipboard.writeText(generatedChapters)}>Copy to Clipboard</button>
        </div>
      )}

      {/* We will add the "Latest Video" feature back in a similar component */}
      <ManualUrlProcessor user={user} socket={socket} setIsLoading={setIsLoading} setError={setError} />

      {processedVideos.length > 0 && (
        <div className="processed-videos">
          <h2>Previously Processed Videos</h2>
          {/* ... list rendering logic ... */}
        </div>
      )}
    </div>
  );
}