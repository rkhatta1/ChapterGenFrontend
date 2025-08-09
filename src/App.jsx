import React, { useCallback, useEffect, useRef, useState } from "react";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { useGoogleLogin, googleLogout } from "@react-oauth/google";

import { extractVideoIdFromUrl } from "./utils/youtube";
import Sidebar from "./components/Sidebar";
import MessageRouter from "./components/MessageRouter";

import LatestPage from "./pages/LatestPage";
import ManualPage from "./pages/ManualPage";
import ProcessedPage from "./pages/ProcessedPage";
import SettingsPage from "./pages/SettingsPage";
import HomePage from "./pages/HomePage";
import ContactPage from "./pages/ContactPage";

import { JobProvider, JobContext } from "./context/JobContext";
import useAuth from "./hooks/useAuth";

import {
  fetchProcessedVideos,
  processYoutubeUrl,
  updateVideoDescriptionFrontend,
} from "./services/api";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { X } from "lucide-react";

/**
 * RequireAuth component for route protection. If user is not logged in,
 * redirects to home ("/").
 */
function RequireAuth({ children }) {
  const { user } = useAuth();
  if (!user) {
    return <Navigate to="/" replace />;
  }
  return children;
}

/**
 * AppInner: main app layout and logic. This component assumes AuthProvider
 * is mounted at a higher level and useAuth() is available.
 */
function AppInner() {
  const { user, setUser, profile, setProfile } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [processedVideos, setProcessedVideos] = useState([]);
  const [generatedChapters, setGeneratedChapters] = useState("");
  const [error, setError] = useState("");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const jobCtx = React.useContext(JobContext);

  const userRef = useRef(user);
  useEffect(() => {
    userRef.current = user;
  }, [user]);

  const refreshProcessed = useCallback(async (email) => {
    try {
      const data = await fetchProcessedVideos(email);
      setProcessedVideos(data);
    } catch (err) {
      console.error("Error fetching processed videos:", err);
    }
  }, []);

  useEffect(() => {
    if (profile) refreshProcessed(profile.email);
  }, [profile, refreshProcessed]);

  // WebSocket handlers
  const handleChaptersReady = useCallback(
    async (chapters, meta) => {
      const active = jobCtx?.job;
      const incomingJob = meta?.job_id ?? meta?.raw?.job_id ?? null;
      const incomingVideo = meta?.video_id ?? meta?.raw?.video_id ?? null;

      const matches =
        (active && incomingJob && active.jobId === incomingJob) ||
        (!active && incomingVideo && active?.videoId === incomingVideo) ||
        (active && active.processingMode === "manual" && !incomingJob);

      if (!matches) return;

      if (active && active.processingMode === "latest") {
        try {
          const currentUser = userRef.current;
          const currentVideo = { id: incomingVideo };
          if (!currentUser) throw new Error("Missing user token");
          await updateVideoDescriptionFrontend({
            access_token: currentUser.access_token,
            video: currentVideo,
            chapters,
          });
        } catch (err) {
          console.error("Failed to update video description:", err);
        } finally {
          if (profile) setTimeout(() => refreshProcessed(profile.email), 1500);
          jobCtx.clearJob();
        }
      } else if (active && active.processingMode === "manual") {
        const formatted = chapters
          .map((ch) => {
            const minutes = Math.floor(ch.start_time / 60)
              .toString()
              .padStart(2, "0");
            const secs = Math.floor(ch.start_time % 60)
              .toString()
              .padStart(2, "0");
            return `${minutes}:${secs} ${ch.title}`;
          })
          .join("\n");
        setGeneratedChapters(formatted);
        jobCtx.updateJobStatus(active.jobId, "completed");
        jobCtx.clearJob();
      } else {
        jobCtx.clearJob();
      }
    },
    [jobCtx, profile, refreshProcessed]
  );

  const handleStatusUpdate = useCallback(
    (job_id, status) => {
      if (!job_id) return;
      jobCtx.updateJobStatus(job_id, status);
      if (status === "completed" || status === "failed") {
        if (profile) setTimeout(() => refreshProcessed(profile.email), 1500);
      }
    },
    [jobCtx, profile, refreshProcessed]
  );

  // Page-level handlers
  const onSubmitManual = useCallback(
    async (url) => {
      if (!user) throw new Error("User not logged in");
      if (!url) {
        setError("Please enter a YouTube video URL.");
        return;
      }

      const videoId = extractVideoIdFromUrl(url);
      if (!videoId) {
        setError("Could not extract a valid Video ID from the URL.");
        return;
      }

      setIsLoading(true);
      setError("");

      try {
        const ytRes = await fetch(
          `https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${encodeURIComponent(
            videoId
          )}`,
          {
            headers: { Authorization: `Bearer ${user.access_token}` },
          }
        );

        const ytJson = await ytRes.json();
        if (!ytRes.ok || !ytJson.items || ytJson.items.length === 0) {
          throw new Error(
            ytJson?.error?.message ||
              "Could not fetch details for the provided video URL."
          );
        }
        const video = ytJson.items[0];

        const backendResponse = await processYoutubeUrl({
          youtube_url: url,
          generation_config: { update_video_description: false },
          access_token: user.access_token,
          video_details: video,
        });

        if (backendResponse?.status === "accepted" && backendResponse.job_id) {
          jobCtx.startJob({
            jobId: backendResponse.job_id,
            videoId: backendResponse.video_id || videoId,
            mode: "manual",
            status: "queued",
          });
        } else {
          throw new Error(backendResponse?.message || "Failed to queue job");
        }
      } catch (err) {
        setError(`An error occurred: ${err.message}`);
        setIsLoading(false);
      }
    },
    [user, jobCtx]
  );

  const onSubmitLatest = useCallback(async () => {
    if (!user) throw new Error("User not logged in");
    setIsLoading(true);
    setError("");
    try {
      const SETTINGS_KEY = "chapgen_user_settings";
      let creativityLabel = "Neutral";
      let segmentationLabel = "Default";
      try {
        const raw = localStorage.getItem(SETTINGS_KEY);
        if (raw) {
          const s = JSON.parse(raw);
          const creativityIndex = Number.isFinite(s.creativity)
            ? s.creativity
            : 2;
          const thresholdIndex = Number.isFinite(s.threshold) ? s.threshold : 1;
          const creativityLabels = [
            "GenZ",
            "Creative",
            "Neutral",
            "Formal",
            "Corporate",
          ];
          const thresholdLabels = ["Detailed", "Default", "Abstract"];
          creativityLabel = creativityLabels[creativityIndex] || "Neutral";
          segmentationLabel = thresholdLabels[thresholdIndex] || "Default";
        }
      } catch (e) {}

      let response = await fetch(
        `https://www.googleapis.com/youtube/v3/channels?part=contentDetails&mine=true`,
        {
          headers: { Authorization: `Bearer ${user.access_token}` },
        }
      );
      let data = await response.json();
      if (!response.ok || !data.items || data.items.length === 0)
        throw new Error(
          data.error?.message || "Could not find YouTube channel."
        );
      const uploadsPlaylistId =
        data.items[0].contentDetails.relatedPlaylists.uploads;

      response = await fetch(
        `https://www.googleapis.com/youtube/v3/playlistItems?part=contentDetails&playlistId=${uploadsPlaylistId}&maxResults=1`,
        {
          headers: { Authorization: `Bearer ${user.access_token}` },
        }
      );
      data = await response.json();
      if (!response.ok || !data.items || data.items.length === 0)
        throw new Error(data.error?.message || "Could not find latest video.");
      const videoId = data.items[0].contentDetails.videoId;

      response = await fetch(
        `https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${videoId}`,
        {
          headers: { Authorization: `Bearer ${user.access_token}` },
        }
      );
      data = await response.json();
      if (!response.ok) throw new Error(data.error.message);
      const video = data.items[0];

      const videoUrl = `https://www.youtube.com/watch?v=${video.id}`;
      const backendResponse = await processYoutubeUrl({
        youtube_url: videoUrl,
        generation_config: {
          creativity: creativityLabel,
          segmentation_threshold: segmentationLabel,
          update_video_description: true,
        },
        access_token: user.access_token,
        video_details: video,
      });

      if (backendResponse?.status === "accepted" && backendResponse.job_id) {
        jobCtx.startJob({
          jobId: backendResponse.job_id,
          videoId: backendResponse.video_id || video.id,
          mode: "latest",
          status: "queued",
        });
      } else {
        throw new Error(backendResponse?.message || "Failed to queue job");
      }
    } catch (err) {
        setError(`An error occurred: ${err.message}`);
        setIsLoading(false);
    }
  }, [user, jobCtx]);

  const location = useLocation();

  useEffect(() => {
    if (user && profile) {
      localStorage.setItem("chapgen_last_path", location.pathname);
    }
  }, [location, user, profile]);

  // Login / logout
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
    const onLogout = () => {
      // Reuse existing handleLogout
      handleLogout && handleLogout();
    };
    window.addEventListener("chapgen:logout", onLogout);
    return () => window.removeEventListener("chapgen:logout", onLogout);
  }, [handleLogout]);

  return (
    <div className="h-screen overflow-hidden flex bg-gray-50">
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed((s) => !s)}
        profile={profile}
        onLogout={handleLogout}
      />
      <div className="h-screen flex-1 p-6 overflow-y-auto">
        {error && (
          <Alert variant="destructive" className="flex w-full mb-4">
            <div className="flex w-full justify-between items-center">
              <AlertDescription>{error}</AlertDescription>
              <button onClick={() => setError('')} className="p-1 rounded-full hover:bg-red-100">
                <X className="h-4 w-4" />
              </button>
            </div>
          </Alert>
        )}

        <Routes>
          {/* Home at /: if user is logged in, redirect to /latest, otherwise show HomePage */}
          <Route
            path="/"
            element={
              user ? (
                <Navigate to={localStorage.getItem("chapgen_last_path") || "/latest"} replace />
              ) : (
                <HomePage onLogin={login} />
              )
            }
          />

          {/* Protected routes */}
          <Route
            path="/latest"
            element={
              <RequireAuth>
                <LatestPage
                  onSubmitLatest={onSubmitLatest}
                  isLoading={isLoading}
                  setIsLoading={setIsLoading}
                />
              </RequireAuth>
            }
          />
          <Route
            path="/manual"
            element={
              <RequireAuth>
                <ManualPage
                  onManualSubmit={onSubmitManual}
                  isLoading={isLoading}
                  setIsLoading={setIsLoading}
                  generatedChapters={generatedChapters}
                />
              </RequireAuth>
            }
          />
          <Route
            path="/processed"
            element={
              <RequireAuth>
                <ProcessedPage
                  processedVideos={processedVideos}
                  refresh={() => profile && refreshProcessed(profile.email)}
                />
              </RequireAuth>
            }
          />
          import ContactPage from "./pages/ContactPage";

// ... inside App.jsx

          <Route
            path="/settings"
            element={
              <RequireAuth>
                <SettingsPage />
              </RequireAuth>
            }
          />

          <Route
            path="/contact"
            element={
              <RequireAuth>
                <ContactPage />
              </RequireAuth>
            }
          />

          {/* Catch-all: redirect to root */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>

      {/* Central websocket message router */}
      <MessageRouter
        onMessage={() => {}}
        onChaptersReady={handleChaptersReady}
        onStatusUpdate={handleStatusUpdate}
      />
    </div>
  );
}

// Top-level App wrapper that includes JobProvider to persist job across refresh
export default function App() {
  return (
    <JobProvider>
      <BrowserRouter>
        <AppInner />
      </BrowserRouter>
    </JobProvider>
  );
}
