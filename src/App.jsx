import { useState, useEffect, useCallback, useRef } from 'react';
import { useGoogleLogin, googleLogout } from '@react-oauth/google';
import { FaGoogle } from 'react-icons/fa';

const LandingPage = ({ login }) => (
  <div className="min-h-screen flex items-center justify-center">
    <div className="max-w-2xl mx-auto text-center bg-white/0 backdrop-blur-sm border border-gray-300 rounded-3xl shadow-xl flex items-center overflow-hidden">
      <div className="flex flex-col items-center space-y-8 p-12 cursor-default">
        <h1 className="text-6xl font-black text-cyan-900">ChapGen</h1>
        <p className="text-xl leading-normal">
          AI-powered YouTube chapter generation, built on a fully cloud-native,
          event-driven architecture.
        </p>
        <button
          onClick={login}
          className="bg-gradient-to-r from-cyan-900 to-cyan-800 hover:from-cyan-900 hover:to-cyan-800 text-white font-semibold px-8 py-4 rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300 relative overflow-hidden group cursor-pointer"
        >
          <span className="flex items-center justify-center">
            <FaGoogle className="text-xl inline-block mb-0.5 mr-4" />
            Sign in to Generate Chapters
          </span>
          <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
        </button>
      </div>
    </div>
  </div>
);

function App() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [processedVideos, setProcessedVideos] = useState([]);
  const [generatedChapters, setGeneratedChapters] = useState('');
  const [latestVideo, setLatestVideo] = useState(null);
  const [processingMode, setProcessingMode] = useState(null);
  const [creativity, setCreativity] = useState(2);
  const [threshold, setThreshold] = useState(1);
  const [url, setUrl] = useState('');
  const socket = useRef(null);

  const userRef = useRef(user);
  const latestVideoRef = useRef(latestVideo);
  const profileRef = useRef(profile);
  const processingModeRef = useRef(processingMode);

  useEffect(() => {
    userRef.current = user;
    latestVideoRef.current = latestVideo;
    profileRef.current = profile;
    processingModeRef.current = processingMode;
  }, [user, latestVideo, profile, processingMode]);

  const creativityLabels = ['GenZ', 'Creative', 'Neutral', 'Formal', 'Corporate'];
  const thresholdLabels = ['Detailed', 'Default', 'Abstract'];

  const fetchProcessedVideos = useCallback(async (email) => {
    try {
      const response = await fetch(`/api/db/jobs/by-user/${email}`);
      if (response.ok) {
        setProcessedVideos(await response.json());
      }
    } catch (err) {
      console.error("Error fetching processed videos:", err);
    }
  }, []);

  const reportJobStatus = (video_id, status) => {
    if (socket.current && socket.current.readyState === WebSocket.OPEN) {
      socket.current.send(
        JSON.stringify({
          type: "status_update",
          video_id: video_id,
          status: status,
        })
      );
    }
  };

  const updateVideoDescription = useCallback(
    (chapters) => {
      const currentUser = userRef.current;
      const currentVideo = latestVideoRef.current;
      const currentProfile = profileRef.current;

      if (!currentUser || !currentVideo || !currentProfile) {
        setError("User, video, or profile data is missing for update.");
        setIsLoading(false);
        return;
      }

      const formattedChapters = chapters
        .map((ch) => `${formatTime(ch.start_time)} ${ch.title}`)
        .join("\n");
      const newDescription = `${currentVideo.snippet.description}\n\n\nChapters:\n${formattedChapters}`;

      const updatedVideoPayload = {
        id: currentVideo.id,
        snippet: { ...currentVideo.snippet, description: newDescription },
      };

      fetch(`https://www.googleapis.com/youtube/v3/videos?part=snippet`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${currentUser.access_token}`,
        },
        body: JSON.stringify(updatedVideoPayload),
      })
        .then((res) => {
          if (!res.ok)
            return res.json().then((err) => {
              throw new Error(err.error.message);
            });
          return res.json();
        })
        .then((data) => {
          alert("Video description updated successfully!");
          reportJobStatus(currentVideo.id, "completed");
        })
        .catch((err) => {
          setError(`Error updating video: ${err.message}`);
          reportJobStatus(currentVideo.id, "failed");
        })
        .finally(() => {
          // Refresh the list regardless of success or failure
          setTimeout(() => fetchProcessedVideos(currentProfile.email), 1500);
          setIsLoading(false);
          setProcessingMode(null);
        });
    },
    [fetchProcessedVideos]
  );

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
        const videoDetailsResponse = await fetch(`https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${videoId}`, {
          headers: { Authorization: `Bearer ${user.access_token}` }
        });
        const videoDetailsData = await videoDetailsResponse.json();
        if (!videoDetailsResponse.ok || !videoDetailsData.items || videoDetailsData.items.length === 0) {
            throw new Error(videoDetailsData.error?.message || 'Could not fetch details for the provided video URL.');
        }
        const video = videoDetailsData.items[0];

        const backendResponse = await fetch('/process-youtube-url/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              youtube_url: url,
              generation_config: { update_video_description: false },
              access_token: user.access_token,
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

  useEffect(() => {
    if (profile) fetchProcessedVideos(profile.email);
  }, [profile, fetchProcessedVideos]);

  useEffect(() => {
    if (!user) {
      if (socket.current) {
        socket.current.close();
        socket.current = null;
      }
      return;
    }

    if (socket.current) return;

    const wsUrl = "wss://chapgen.app/ws/";
    const ws = new WebSocket(wsUrl);
    socket.current = ws;

    ws.onopen = () => {
      console.log("WebSocket connection established");
      ws.send(JSON.stringify({ access_token: user.access_token }));
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === "chapters_ready" && data.data.chapters) {
            if (processingModeRef.current === "latest") {
                updateVideoDescription(data.data.chapters);
            } else if (processingModeRef.current === "manual") {
                const formatted = data.data.chapters
                .map((ch) => `${formatTime(ch.start_time)} ${ch.title}`)
                .join("\n");
                setGeneratedChapters(formatted);
                setIsLoading(false);
                setProcessingMode(null);
                alert("Chapters Generated!");
            }
        }
      } catch (e) {
        setIsLoading(false);
        console.error("Failed to parse incoming message:", e);
        setError("Received an invalid message from the server.");
      }
    };

    ws.onerror = (err) => {
      setIsLoading(false);
      console.error("WebSocket error:", err);
      setError("WebSocket connection failed. Is the frontend-bridge running?");
    };

    ws.onclose = () => {
      console.log("WebSocket connection closed");
      socket.current = null;
    };

    return () => {
      if (socket.current) {
        socket.current.close();
      }
    };
  }, [user, updateVideoDescription]);

  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${minutes.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;
  };

  const login = useGoogleLogin({
    onSuccess: (codeResponse) => {
      localStorage.setItem("chapgen_user", JSON.stringify(codeResponse));
      setUser(codeResponse);
    },
    onError: (error) => console.log("Login Failed:", error),
    scope: "https://www.googleapis.com/auth/youtube",
  });

  const handleLogout = () => {
    googleLogout();
    localStorage.removeItem("chapgen_user");
    setUser(null);
    setProfile(null);
  };

  useEffect(() => {
    if (user && !profile) {
      fetch(
        `https://www.googleapis.com/oauth2/v1/userinfo?access_token=${user.access_token}`,
        {
          headers: {
            Authorization: `Bearer ${user.access_token}`,
            Accept: "application/json",
          },
        }
      )
        .then((res) => {
          if (!res.ok) throw new Error("Token is invalid");
          return res.json();
        })
        .then((data) => setProfile(data))
        .catch((err) => {
          console.log("Failed to fetch profile, logging out:", err);
          handleLogout();
        });
    }
  }, [user, profile]);

  useEffect(() => {
    const savedUser = localStorage.getItem("chapgen_user");
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
  }, []);

  return (
    <div className="min-h-screen flex justify-center items-center bg-gray-200 text-gray-900">
      <div className="min-h-screen">
        {profile ? (
          <div className="min-h-screen p-6">
            <div className="max-w-4xl mx-auto space-y-8">
              {/* Profile Header */}
              <div className="flex items-center justify-center gap-6 p-6 bg-white/0 backdrop-blur-sm border border-gray-300 rounded-2xl shadow-xl overflow-hidden">
                <img
                  src={profile.picture}
                  alt="user"
                  className="w-16 h-16 rounded-full ring-4 ring-cyan-700/50 shadow-lg"
                />
                <h3 className="text-2xl font-semibold text-cyan-900">
                  {profile.name}
                </h3>
                <button
                  onClick={handleLogout}
                  className="px-4 py-2 bg-cyan-700 hover:bg-cyan-700/50 text-white font-semibold hover:text-white rounded-lg transition-all duration-300"
                >
                  Log out
                </button>
              </div>

              {/* Loading State */}
              {isLoading && (
                <div className="flex flex-col items-center justify-center p-12 bg-white/0 backdrop-blur-sm border border-gray-300 rounded-2xl shadow-xl">
                  <div className="w-12 h-12 border-4 border-gray-300 border-t-cyan-900 rounded-full animate-spin mb-4"></div>
                  <p className="text-gray-500 text-lg font-medium">
                    Processing video...
                  </p>
                </div>
              )}

              {/* Error State */}
              {error && (
                <div className="p-6 bg-red-900/20 border border-red-800/50 rounded-2xl shadow-xl">
                  <p className="text-red-300 font-medium">{error}</p>
                </div>
              )}

              {/* Generated Chapters Results */}
              {generatedChapters && (
                <div className="bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-2xl p-8 shadow-xl">
                  <h3 className="text-2xl font-bold mb-6 text-green-400">
                    Generated Chapters (for Manual URL)
                  </h3>
                  <textarea
                    readOnly
                    value={generatedChapters}
                    rows="10"
                    className="w-full p-4 bg-gray-800/50 border border-gray-700 rounded-xl text-gray-300 font-mono text-sm resize-y focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                  <button
                    onClick={() => navigator.clipboard.writeText(generatedChapters)}
                    className="mt-4 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-semibold px-6 py-3 rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300"
                  >
                    Copy to Clipboard
                  </button>
                </div>
              )}

              {/* Latest Video Processor */}
              <div className="bg-white/0 backdrop-blur-sm border border-gray-300 rounded-2xl p-8 shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 relative overflow-hidden">
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
              </div>

              {/* Divider */}
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-500"></div>
                </div>
                <div className="relative flex justify-center">
                  <span className="bg-cyan-900 py-2 px-6 text-white font-semibold uppercase">
                    or
                  </span>
                </div>
              </div>

              {/* Manual URL Processor */}
              <div className="bg-gray-white/0 backdrop-blur-sm border w-full flex border-gray-300 rounded-2xl p-8 shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 overflow-hidden">
                <div className="flex w-full flex-col items-center space-y-6">
                  <h3 className="text-2xl font-bold mb-6 text-cyan-900 flex items-center gap-3">
                    <span className="text-2xl">🎯</span>
                    Or, Generate Chapters for a Specific Video
                  </h3>
                  <form
                    onSubmit={handleManualSubmit}
                    className="space-y-4 flex flex-col w-full"
                  >
                    <input
                      type="text"
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                      placeholder="Enter any YouTube Video URL"
                      className="w-full px-4 py-3 bg-gray-300/50 border border-gray-300 rounded-xl text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-700 focus:border-transparent transition-all duration-300"
                    />
                    <button
                      type="submit"
                      className="w-full bg-gradient-to-r from-cyan-900 to-cyan-800 hover:from-cyan-900 hover:to-cyan-800 text-white font-semibold px-6 py-3 rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300 relative overflow-hidden group"
                    >
                      <span className="relative z-10">Generate for URL</span>
                      <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
                    </button>
                  </form>
                </div>
              </div>

              {/* Previously Processed Videos */}
              {processedVideos && processedVideos.length > 0 && (
                <div className="bg-white/0 backdrop-blur-sm border border-gray-300 rounded-2xl p-8 shadow-xl">
                  <h2 className="text-3xl font-bold text-center mb-8 text-cyan-900">
                    Previously Processed Videos
                  </h2>
                  <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {processedVideos.map((video) => (
                      <div
                        key={video.id}
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
                          <p className="text-gray-500 text-sm">
                            Status: {video.status}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <LandingPage login={login} />
        )}
      </div>
    </div>
  );
}

export default App;
