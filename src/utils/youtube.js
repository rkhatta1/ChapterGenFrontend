// src/utils/youtube.js (new file)
export function extractVideoIdFromUrl(url) {
  if (!url) return null;
  try {
    if (url.includes("v=")) return url.split("v=")[1].split("&")[0];
    if (url.includes("youtu.be/")) return url.split("youtu.be/")[1].split("?")[0];
    // fallback: last segment
    const seg = url.split("/").filter(Boolean).pop();
    return seg && seg.length >= 6 ? seg : null;
  } catch {
    return null;
  }
}