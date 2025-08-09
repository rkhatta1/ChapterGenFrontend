import React, { useContext, useState } from "react";
import ManualProcessor from "../components/ManualProcessor";
import GeneratedChaptersPanel from "../components/GeneratedChaptersPanel";
import JobStatusPanel from "../components/JobStatusPanel";
import { JobContext } from "../context/JobContext";

/**
 * Manual page calls onManualSubmit passed from App and starts a job when
 * backend returns job_id.
 */
export default function ManualPage({ onManualSubmit, isLoading, setIsLoading, generatedChapters }) {
  const [url, setUrl] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    onManualSubmit(url);
  };

  const jobCtx = useContext(JobContext);

  return (
    <div className="flex flex-col max-w-full 2xl:max-w-[55%] mx-auto p-6">
      <div className="mb-6 flex flex-col space-y-2 max-w-2xl items-start">
        <h2 className="text-2xl font-bold text-cyan-900">Generate for a Specific Video</h2>
        <p className="text-sm text-gray-600">
          Provide any YouTube URL to generate chapters for that video.
        </p>
      </div>

      <div className="flex flex-col w-full space-y-6">
        <JobStatusPanel />

        <ManualProcessor
          url={url}
          setUrl={setUrl}
          onManualSubmit={handleSubmit}
          isLoading={isLoading || !!jobCtx.job}
        />

        <GeneratedChaptersPanel
          generatedChapters={generatedChapters}
          onCopy={() => navigator.clipboard.writeText(generatedChapters)}
        />
      </div>
    </div>
  );
}