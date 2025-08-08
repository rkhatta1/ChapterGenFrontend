import { useEffect, useRef } from "react";
import useWebSocket from "../hooks/useWebSocket";
import useAuth from "../hooks/useAuth";

/**
 * MessageRouter now forwards raw messages to onMessage, and also supports
 * the older callbacks onChaptersReady/onStatusUpdate if provided.
 *
 * onMessage: (msg) => {}  // receives every parsed incoming message
 * onChaptersReady: (chapters, meta) => {}
 * onStatusUpdate: (job_id, status, meta) => {}
 */
export default function MessageRouter({
  onMessage,
  onChaptersReady,
  onStatusUpdate,
}) {
  const { subscribe } = useWebSocket();
  const { user } = useAuth();
  const onMessageRef = useRef(onMessage);
  const onChaptersRef = useRef(onChaptersReady);
  const onStatusRef = useRef(onStatusUpdate);

  useEffect(() => {
    onMessageRef.current = onMessage;
  }, [onMessage]);
  useEffect(() => {
    onChaptersRef.current = onChaptersReady;
  }, [onChaptersReady]);
  useEffect(() => {
    onStatusRef.current = onStatusUpdate;
  }, [onStatusUpdate]);

  useEffect(() => {
    const cb = (msg) => {
      if (!msg) return;
      try {
        // Deliver full raw message to the app-level handler
        onMessageRef.current?.(msg);

        // Backwards-compatible routing:
        if (msg.type === "chapters_ready" && msg.data?.chapters) {
          // Call onChaptersReady with (chapters, meta) where meta may include
          // job_id, video_id, user_id, etc.
          onChaptersRef.current?.(msg.data.chapters, {
            job_id: msg.job_id ?? msg.data.job_id,
            video_id: msg.data.video_id ?? msg.video_id,
            user_id: msg.data.user_id ?? msg.user_id,
            raw: msg,
          });
        } else if (msg.type === "status_update") {
          // status update may contain job_id or video_id
          const jobId = msg.job_id ?? msg.data?.job_id;
          const status = msg.status ?? msg.data?.status ?? msg.data?.state;
          onStatusRef.current?.(jobId, status, { raw: msg });
        }
      } catch (e) {
        console.error("MessageRouter failed to handle message:", e);
      }
    };

    const unsubscribe = subscribe(cb);
    return () => unsubscribe();
  }, [subscribe, user]);
  return null;
}