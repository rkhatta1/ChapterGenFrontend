import { useState, useEffect, useCallback, useRef } from 'react';
import LatestVideoProcessor from './LatestVideoProcessor'; // Import the new component

// --- Child Component for Manual URL processing (from previous step) ---
const ManualUrlProcessor = ({ user, setIsLoading, setError, setProcessingMode }) => {
    const [url, setUrl] = useState('');
  
    const handleManualSubmit = async (e) => {
      e.preventDefault();
      if (!url) {
        setError('Please enter a YouTube video URL.');
        return;
      }
      
      const videoId = url.split('v=')[1]?.split('&')[0];
      if (!videoId) {
          setError('Could not extract a valid Video ID from the URL.');
          return;
      }

      setIsLoading(true);
      setError('');
      setProcessingMode('manual');
  
      try {
          // --- NEW LOGIC: Fetch video details first ---
          const videoDetailsResponse = await fetch(`https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${videoId}`, {
            headers: { Authorization: `Bearer ${user.access_token}` }
          });
          const videoDetailsData = await videoDetailsResponse.json();
          if (!videoDetailsResponse.ok || !videoDetailsData.items || videoDetailsData.items.length === 0) {
              throw new Error(videoDetailsData.error?.message || 'Could not fetch details for the provided video URL.');
          }
          const video = videoDetailsData.items[0];
          // --- END NEW LOGIC ---

          const backendResponse = await fetch('/process-youtube-url/', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                youtube_url: url,
                generation_config: { update_video_description: false },
                access_token: user.access_token,
                // Now we send the complete video object, just like the other workflow
                video_details: video
              }),
          });
  
          if (!backendResponse.ok) {
              const errorResult = await backendResponse.json();
              throw new Error(errorResult.message || `HTTP error! Status: ${backendResponse.status}`);
          }
          
      } catch (err) {
        setError(`An error occurred: ${err.message}`);
        setIsLoading(false);
        setProcessingMode(null);
      }
    };
  
    return (
      <div className="feature-box">
        <h3>Or, Generate Chapters for a Specific Video</h3>
        <form onSubmit={handleManualSubmit}>
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="Enter any YouTube Video URL"
            className="url-input"
          />
          <button type="submit" className="submit-btn">Generate for URL</button>
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
  const [latestVideo, setLatestVideo] = useState(null);
  const [processingMode, setProcessingMode] = useState(null); // 'latest' or 'manual'
  const socket = useRef(null);
  const userRef = useRef(user);
  const latestVideoRef = useRef(latestVideo);

  useEffect(() => {
    userRef.current = user;
    latestVideoRef.current = latestVideo;
  }, [user, latestVideo]);

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

  const updateVideoDescription = useCallback((chapters) => {
    const currentUser = userRef.current;
    const currentVideo = latestVideoRef.current;

    if (!currentUser || !currentVideo) {
        setError("User or video data is missing for update.");
        setIsLoading(false);
        return;
    }

    const formattedChapters = chapters.map(ch => `${formatTime(ch.start_time)} ${ch.title}`).join('\n');
    const newDescription = `${currentVideo.snippet.description}\n\n\nChapters:\n${formattedChapters}`;

    const updatedVideoPayload = {
      id: currentVideo.id,
      snippet: { ...currentVideo.snippet, description: newDescription },
    };

    fetch(`https://www.googleapis.com/youtube/v3/videos?part=snippet`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${currentUser.access_token}`,
      },
      body: JSON.stringify(updatedVideoPayload),
    })
      .then(res => res.json())
      .then(data => {
        if (data.error) {
          throw new Error(data.error.message);
        }
        alert('Video description updated successfully!');
        // you might want to refetch processed videos here
      })
      .catch(err => {
        setError(`Error updating video: ${err.message}`);
      })
      .finally(() => {
        setIsLoading(false);
        setProcessingMode(null);
      });
  }, []);

  useEffect(() => {
    if (profile) fetchProcessedVideos(profile.email);
  }, [profile, fetchProcessedVideos]);
  
  // WebSocket connection logic
  useEffect(() => {
    if (!user || socket.current) return;

    const ws = new WebSocket('wss://chapgen.app/ws/');
    socket.current = ws;

    ws.onopen = () => {
        console.log('WebSocket connection established');
        ws.send(JSON.stringify({ access_token: user.access_token }));
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'chapters_ready' && data.data.chapters) {
          if (processingMode === 'latest') {
              updateVideoDescription(data.data.chapters);
          } else if (processingMode === 'manual') {
              const formatted = data.data.chapters.map(ch => `${formatTime(ch.start_time)} ${ch.title}`).join('\n');
              setGeneratedChapters(formatted);
              setIsLoading(false);
              setProcessingMode(null);
              alert("Chapters Generated!");
          }
      }
    };

    ws.onerror = (error) => console.error('WebSocket error:', error);
    ws.onclose = () => {
        console.log('WebSocket connection closed');
        socket.current = null;
    };

    return () => {
        if (socket.current) {
            socket.current.close();
            socket.current = null;
        }
    };
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
      
      {isLoading && ( <div className="loading-container"><p>Processing video...</p></div> )}
      {error && <p className="error-message">{error}</p>}

      {generatedChapters && (
        <div className="results-box">
            <h3>Generated Chapters (for Manual URL)</h3>
            <textarea readOnly value={generatedChapters} rows="10"></textarea>
            <button onClick={() => navigator.clipboard.writeText(generatedChapters)}>Copy to Clipboard</button>
        </div>
      )}

      <LatestVideoProcessor
        user={user}
        setIsLoading={setIsLoading}
        setError={setError}
        setLatestVideo={setLatestVideo}
        setProcessingMode={setProcessingMode}
      />
      
      <hr style={{width: '80%', margin: '40px auto'}} />

      <ManualUrlProcessor
        user={user}
        setIsLoading={setIsLoading}
        setError={setError}
        setProcessingMode={setProcessingMode}
      />

      {processedVideos && processedVideos.length > 0 && (
        <div className="processed-videos">
          <h2>Previously Processed Videos</h2>
          <ul>
            {processedVideos.map(video => (
              <li key={video.id}>
                {video.thumbnail_url && (
                  <img src={video.thumbnail_url} alt={video.title} width="120" />
                )}
                <div>
                  <h4>{video.title}</h4>
                  <p>Status: {video.status}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}