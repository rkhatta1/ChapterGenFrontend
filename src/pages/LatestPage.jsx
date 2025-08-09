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
    <div className="flex flex-col max-w-full 2xl:max-w-[55%] mx-auto items-start p-6">
      <div className="mb-6 flex flex-col space-y-2 max-w-2xl">
        <h2 className="text-2xl font-bold text-cyan-900">Generate for Latest Video</h2>
        <p className="text-sm text-gray-600">
          Generate semantic chapters for your most recent upload and optionally
          update the video description. Use the Settings page to adjust
          creativity and segmentation preferences.
        </p>
      </div>

      <div className="flex flex-col space-y-6">
        <JobStatusPanel />

        <LatestProcessor
          onGenerate={handleGenerate}
          isLoading={isLoading || !!jobCtx.job}
        />
      </div>
    </div>
  );
}