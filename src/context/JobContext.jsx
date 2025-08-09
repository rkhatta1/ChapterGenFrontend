import React, { createContext, useCallback, useEffect, useMemo, useState } from "react";

const STORAGE_KEY = "chapgen_current_job";

export const JobContext = createContext(null);

/**
 * JobProvider persists current job state (jobId, videoId, status,
 * processingMode) to localStorage so UI survives page refreshes.
 */
export function JobProvider({ children }) {
  const [job, setJob] = useState(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });

  useEffect(() => {
    try {
      if (job) localStorage.setItem(STORAGE_KEY, JSON.stringify(job));
      else localStorage.removeItem(STORAGE_KEY);
    } catch {
      // noop
    }
  }, [job]);

  const startJob = useCallback((payload) => {
    // payload: { jobId, videoId, mode }
    const now = Date.now();
    const newJob = {
      jobId: payload.jobId,
      videoId: payload.videoId || null,
      processingMode: payload.mode || null,
      status: payload.status || "queued",
      createdAt: payload.createdAt || now,
    };
    setJob(newJob);
  }, []);

  const updateJobStatus = useCallback((jobId, status) => {
    setJob((prev) => {
      if (!prev || prev.jobId !== jobId) return prev;
      return { ...prev, status };
    });
  }, []);

  const clearJob = useCallback(() => setJob(null), []);

  const value = useMemo(
    () => ({ job, startJob, updateJobStatus, clearJob }),
    [job, startJob, updateJobStatus, clearJob]
  );

  return <JobContext.Provider value={value}>{children}</JobContext.Provider>;
}