import React, { useContext } from "react";
import { JobContext } from "../context/JobContext";

export default function JobStatusPanel() {
  const jc = useContext(JobContext);
  const job = jc?.job;

  if (!job) return null;

  return (
    <div className="p-3 bg-white border border-gray-200 rounded-lg shadow-sm flex items-center justify-between">
      <div>
        <div className="text-sm text-gray-500">Active Job</div>
        <div className="text-sm font-mono text-cyan-900">{job.jobId}</div>
        <div className="text-xs text-gray-600 mt-1">
          Video: <span className="font-medium">{job.videoId ?? "—"}</span>
        </div>
      </div>
      <div className="text-right">
        <div className="text-sm font-semibold text-cyan-900">{job.status}</div>
        <button
          onClick={() => jc.clearJob()}
          className="mt-2 bg-red-50 text-red-600 px-3 py-1 rounded-md text-xs"
        >
          Clear
        </button>
      </div>
    </div>
  );
}