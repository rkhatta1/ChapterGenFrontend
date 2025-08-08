export async function fetchProcessedVideos(email) {
  const res = await fetch(`/api/db/jobs/by-user/${email}`);
  if (!res.ok) throw new Error("Failed to fetch processed videos");
  return res.json();
}

export async function processYoutubeUrl(payload) {
  // Sends the request and returns the parsed JSON (including job_id if accepted).
  const res = await fetch("/process-youtube-url/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  let data;
  try {
    data = await res.json();
  } catch {
    data = null;
  }

  if (!res.ok && res.status !== 202) {
    // Try to surface a helpful error message
    const errMsg = data?.message || `HTTP ${res.status}`;
    throw new Error(errMsg);
  }
  return data; // expected shape: { status: "accepted", job_id, ... } or error shape
}

/**
 * updateVideoDescriptionFrontend remains unchanged from the prior version.
 * Keep it here if you still perform direct YouTube updates from the client.
 */
export async function updateVideoDescriptionFrontend({
  access_token,
  video,
  chapters,
}) {
  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${minutes.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;
  };

  const formattedChapters = chapters
    .map((ch) => `${formatTime(ch.start_time)} ${ch.title}`)
    .join("\n");
  const newDescription = `${video.snippet.description}\n\n\nChapters:\n${formattedChapters}`;

  const updatedVideoPayload = {
    id: video.id,
    snippet: { ...video.snippet, description: newDescription },
  };

  const res = await fetch(
    `https://www.googleapis.com/youtube/v3/videos?part=snippet`,
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${access_token}`,
      },
      body: JSON.stringify(updatedVideoPayload),
    }
  );

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || `YouTube update failed (${res.status})`);
  }
  return res.json();
}