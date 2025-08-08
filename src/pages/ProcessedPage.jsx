import React, { useEffect } from "react";
import ProcessedVideosList from "../components/ProcessedVideosList";

/**
 * ProcessedPage simply renders the previously processed videos list
 * (data is provided via props from App or fetched inside).
 */
export default function ProcessedPage({ processedVideos, refresh }) {
  useEffect(() => {
    if (!processedVideos || processedVideos.length === 0) {
      refresh && refresh();
    }
  }, [processedVideos, refresh]);

  return (
    <div className="p-6">
      <ProcessedVideosList processedVideos={processedVideos} />
    </div>
  );
}