import { useState, useEffect, useCallback, useRef } from 'react';
import './App.css';

function App() {
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [chapters, setChapters] = useState(null);
  const [creativity, setCreativity] = useState(2); // 0: GenZ, 1: Creative, 2: Neutral, 3: Formal, 4: Corporate
  const [threshold, setThreshold] = useState(1); // 0: Detailed, 1: Default, 2: Abstract
  const [error, setError] = useState('');
  const socket = useRef(null);
  
  const creativityLabels = ['GenZ', 'Creative', 'Neutral', 'Formal', 'Corporate'];
  const thresholdLabels = ['Detailed', 'Default', 'Abstract'];

  // Effect to establish and manage WebSocket connection
  useEffect(() => {
    // This check prevents creating a new socket on every re-render in StrictMode
    if (socket.current) return;

    // Replace with your actual WebSocket server URL.
    const wsUrl = 'ws://localhost:8765';
    const ws = new WebSocket(wsUrl);
    socket.current = ws;

    ws.onopen = () => {
      console.log('WebSocket connection established');
    };

    ws.onmessage = (event) => {
      console.log('Received message:', event.data);
      try {
        const data = JSON.parse(event.data);
        if (data && data.chapters) {
          setChapters(data.chapters);
          setIsLoading(false);
        }
      } catch (e) {
        console.error('Failed to parse incoming message:', e);
        setError('Received an invalid message from the server.');
      }
    };

    ws.onerror = (err) => {
      console.error('WebSocket error:', err);
      setError('WebSocket connection failed. Is the frontend-bridge running?');
    };

    ws.onclose = () => {
      console.log('WebSocket connection closed');
      socket.current = null; // Clean up the ref on close
    };

    // Cleanup on component unmount
    return () => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
    };
  }, []);

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    if (!youtubeUrl) {
      setError('Please enter a YouTube URL.');
      return;
    }
    if (!socket.current || socket.current.readyState !== WebSocket.OPEN) {
      setError('WebSocket is not connected. Please wait and try again.');
      return;
    }

    setIsLoading(true);
    setChapters(null);
    setError('');

    try {
      const response = await fetch('http://localhost:8000/process-youtube-url/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          youtube_url: youtubeUrl,
          generation_config: {
            creativity: creativityLabels[creativity],
            segmentation_threshold: thresholdLabels[threshold],
          }
         }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      const result = await response.json();
      console.log('Ingestion service response:', result);

    } catch (err) {
      console.error('Failed to send URL to ingestion service:', err);
      setError(`Failed to start process: ${err.message}`);
      setIsLoading(false);
    }
  }, [youtubeUrl, creativity, threshold]);

  return (
    <div className="App">
      <header className="App-header">
        <h1>AI YouTube Chapter Generator</h1>
        <form onSubmit={handleSubmit} className="url-form">
          <input
            type="text"
            value={youtubeUrl}
            onChange={(e) => setYoutubeUrl(e.target.value)}
            placeholder="Enter YouTube Video URL"
            className="url-input"
            disabled={isLoading}
          />
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
          <button type="submit" className="submit-btn" disabled={isLoading}>
            {isLoading ? 'Processing...' : 'Generate Chapters'}
          </button>
        </form>

        {error && <p className="error-message">{error}</p>}

        {isLoading && (
          <div className="loading-container">
            <p>Processing video... this may take a few minutes.</p>
            <p>Waiting for chapters to be generated.</p>
          </div>
        )}

        {chapters && (
          <div className="chapters-container">
            <h2>Generated Chapters</h2>
            <div className="chapters-list">
              {chapters.map((chapter, index) => {
                // Function to format seconds into MM:SS
                const formatTime = (seconds) => {
                  const minutes = Math.floor(seconds / 60);
                  const secs = Math.floor(seconds % 60);
                  return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
                };

                return (
                  <div key={index} className="chapter-item">
                    <span className="chapter-time">{formatTime(chapter.start_time)}</span>
                    <span className="chapter-title">{chapter.title}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </header>
    </div>
  );
}

export default App;