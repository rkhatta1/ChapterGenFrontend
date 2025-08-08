import React, { useContext } from "react";
import LatestProcessor from "../components/LatestProcessor";
import JobStatusPanel from "../components/JobStatusPanel";
import { JobContext } from "../context/JobContext";

/**
 * LatestPage now delegates generation to onSubmitLatest (no sliders here).
 * The settings page provides persistent slider configuration.
 */
export default function LatestPage({
  onSubmitLatest, // function passed from App to handle backend call
  isLoading,
  setIsLoading,
}) {
  const jobCtx = useContext(JobContext);

  const handleGenerate = () => {
    onSubmitLatest();
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-cyan-900">Generate for Latest Video</h2>
        <p className="text-sm text-gray-600">
          Generate semantic chapters for your most recent upload and optionally
          update the video description. Use the Settings page to adjust
          creativity and segmentation preferences.
        </p>
      </div>

      <div className="space-y-6">
        <JobStatusPanel />

        <LatestProcessor
          onGenerate={handleGenerate}
          isLoading={isLoading}
        />
      </div>
    </div>
  );
}