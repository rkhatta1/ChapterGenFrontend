import { useState, useEffect, useCallback, useRef } from 'react';
import { useGoogleLogin, googleLogout } from '@react-oauth/google';
import './App.css';

function App() {
  const [isLoading, setIsLoading] = useState(false);
  const [creativity, setCreativity] = useState(2);
  const [threshold, setThreshold] = useState(1);
  const [error, setError] = useState('');
  const [profile, setProfile] = useState(null);
  const [user, setUser] = useState(null);
  const [latestVideo, setLatestVideo] = useState(null);
  const socket = useRef(null);

  const userRef = useRef(user);
  const latestVideoRef = useRef(latestVideo);
  useEffect(() => {
    userRef.current = user;
    latestVideoRef.current = latestVideo;
  }, [user, latestVideo]);

  const creativityLabels = ['GenZ', 'Creative', 'Neutral', 'Formal', 'Corporate'];
  const thresholdLabels = ['Detailed', 'Default', 'Abstract'];

  const login = useGoogleLogin({
    onSuccess: (codeResponse) => setUser(codeResponse),
    onError: (error) => console.log('Login Failed:', error),
    scope: 'https://www.googleapis.com/auth/youtube',
  });

  const updateVideoDescription = useCallback((chapters) => {
    const currentUser = userRef.current;
    const currentVideo = latestVideoRef.current;

    if (currentUser && currentVideo) {
      const formattedChapters = chapters.map(ch => `${formatTime(ch.start_time)} ${ch.title}`).join('\n');
      const newDescription = `${currentVideo.snippet.description}\n\n\n\n\nChapters:\n${formattedChapters}`;

      const updatedVideo = {
        id: currentVideo.id,
        snippet: {
          ...currentVideo.snippet,
          description: newDescription,
        },
      };

      fetch(`https://www.googleapis.com/youtube/v3/videos?part=snippet`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${currentUser.access_token}`,
        },
        body: JSON.stringify(updatedVideo),
      })
        .then((res) => res.json())
        .then((data) => {
          console.log('Video updated:', data);
          setIsLoading(false);
          if (data.error) {
            setError(`Error updating video: ${data.error.message}`);
            alert(`Error updating video: ${data.error.message}`);
          } else {
            alert('Video description updated successfully!');
          }
        })
        .catch((err) => {
          setIsLoading(false);
          setError(`An error occurred while updating the video: ${err.message}`);
          console.log(err);
        });
    }
  }, []);

  useEffect(() => {
    if (user) {
      fetch(`https://www.googleapis.com/oauth2/v1/userinfo?access_token=${user.access_token}`, {
        headers: {
          Authorization: `Bearer ${user.access_token}`,
          Accept: 'application/json',
        },
      })
        .then((res) => res.json())
        .then((data) => setProfile(data))
        .catch((err) => console.log(err));
    }
  }, [user]);

  useEffect(() => {
    if (!user) {
      if (socket.current) {
        socket.current.close();
        socket.current = null;
      }
      return;
    }

    if (socket.current) return;

    const wsUrl = 'ws://localhost:8765';
    const ws = new WebSocket(wsUrl);
    socket.current = ws;

    ws.onopen = () => {
      console.log('WebSocket connection established');
      ws.send(JSON.stringify({ access_token: user.access_token }));
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data && data.chapters) {
          updateVideoDescription(data.chapters);
        }
      } catch (e) {
        setIsLoading(false);
        console.error('Failed to parse incoming message:', e);
        setError('Received an invalid message from the server.');
      }
    };

    ws.onerror = (err) => {
      setIsLoading(false);
      console.error('WebSocket error:', err);
      setError('WebSocket connection failed. Is the frontend-bridge running?');
    };

    ws.onclose = () => {
      console.log('WebSocket connection closed');
      socket.current = null;
    };

    return () => {
      if (socket.current) {
        socket.current.close();
      }
    };
  }, [user, updateVideoDescription]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user) {
      setError('Please sign in first.');
      return;
    }
    if (!socket.current || socket.current.readyState !== WebSocket.OPEN) {
      setError('WebSocket is not connected. Please wait and try again.');
      return;
    }

    setIsLoading(true);
    setError('');
    setLatestVideo(null);

    try {
      // 1. Fetch user's channel to get uploads playlist ID
      let response = await fetch(`https://www.googleapis.com/youtube/v3/channels?part=contentDetails&mine=true`, {
        headers: { Authorization: `Bearer ${user.access_token}` },
      });
      let data = await response.json();
      if (!response.ok) throw new Error(data.error.message);
      const uploadsPlaylistId = data.items[0].contentDetails.relatedPlaylists.uploads;

      // 2. Fetch the latest video from the uploads playlist
      response = await fetch(`https://www.googleapis.com/youtube/v3/playlistItems?part=contentDetails&playlistId=${uploadsPlaylistId}&maxResults=1`, {
        headers: { Authorization: `Bearer ${user.access_token}` },
      });
      data = await response.json();
      if (!response.ok) throw new Error(data.error.message);
      const videoId = data.items[0].contentDetails.videoId;
      
      // 3. Fetch the full video details (including description and categoryId)
      response = await fetch(`https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${videoId}`, {
          headers: { Authorization: `Bearer ${user.access_token}` }
      });
      data = await response.json();
      if (!response.ok) throw new Error(data.error.message);
      const video = data.items[0];
      setLatestVideo(video); // Save the full video object

      // 4. Send the video URL to the backend for chapter generation
      const videoUrl = `https://www.youtube.com/watch?v=${video.id}`;
      const backendResponse = await fetch('http://localhost:8000/process-youtube-url/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          youtube_url: videoUrl,
          generation_config: {
            access_token: user.access_token,
            creativity: creativityLabels[creativity],
            segmentation_threshold: thresholdLabels[threshold],
          },
        }),
      });

      if (!backendResponse.ok) {
        const errorResult = await backendResponse.json();
        throw new Error(errorResult.detail || `HTTP error! Status: ${backendResponse.status}`);
      }

      console.log('Ingestion service response:', await backendResponse.json());
      // Now we wait for the WebSocket message to trigger the description update

    } catch (err) {
      console.error('An error occurred:', err);
      setError(`An error occurred: ${err.message}`);
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    googleLogout();
    setProfile(null);
    setUser(null);
    setLatestVideo(null);
  };

  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>AI YouTube Chapter Generator</h1>
        {profile ? (
          <div>
            <img src={profile.picture} alt="user" />
            <h3>Welcome, {profile.name}</h3>
            <p>({profile.email})</p>
            <br />
            <button onClick={handleLogout}>Log out</button>
          </div>
        ) : (
          <button onClick={() => login()}>Sign in with Google 🚀</button>
        )}

        {profile && (
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
                disabled={isLoading}
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
                disabled={isLoading}
              />
            </div>
            <button onClick={handleSubmit} className="submit-btn" disabled={isLoading}>
              {isLoading ? 'Processing...' : 'Generate & Add Chapters to Latest Video'}
            </button>
          </div>
        )}

        {error && <p className="error-message">{error}</p>}

        {isLoading && (
          <div className="loading-container">
            <p>Processing video... this may take a few minutes.</p>
            <p>Generating chapters and updating your video.</p>
          </div>
        )}
      </header>
    </div>
  );
}

export default App;
