import React, { useEffect, useMemo, useRef } from "react";
import useAuth from "../hooks/useAuth";

export const WebSocketContext = React.createContext(null);

const DEFAULT_WS = import.meta.env.VITE_WS_URL || "wss://chapgen.app/ws/";

function backoff(attempt) {
  return Math.min(30000, 500 * 2 ** attempt);
}

/**
 * WebSocketProvider: single socket, reconnection, heartbeat, queueing.
 * It exposes .send(), .subscribe(cb), .unsubscribe(cb), .getReadyState()
 */
export function WebSocketProvider({ children, wsUrl = DEFAULT_WS }) {
  const wsRef = useRef(null);
  const listenersRef = useRef(new Set());
  const sendQueueRef = useRef([]);
  const attemptRef = useRef(0);
  const pingTimerRef = useRef(null);
  const shouldReconnectRef = useRef(true);
  const { user } = useAuth();

  // config: set VITE_WS_QUERY_AUTH=true if your server requires token in handshake
  const queryAuthEnabled = Boolean(import.meta.env.VITE_WS_QUERY_AUTH);

  const api = useMemo(() => {
    return {
      send: (msg) => {
        try {
          const text = typeof msg === "string" ? msg : JSON.stringify(msg);
          const ws = wsRef.current;
          if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(text);
            return true;
          }
          sendQueueRef.current.push(text);
          return false;
        } catch (e) {
          console.error("WS send error:", e);
          return false;
        }
      },
      subscribe: (cb) => {
        listenersRef.current.add(cb);
      },
      unsubscribe: (cb) => {
        listenersRef.current.delete(cb);
      },
      getReadyState: () => wsRef.current?.readyState ?? WebSocket.CLOSED,
      close: () => {
        shouldReconnectRef.current = false;
        if (wsRef.current) wsRef.current.close();
      },
    };
  }, []);

  useEffect(() => {
    shouldReconnectRef.current = true;
    let mounted = true;

    const connect = async () => {
      if (!mounted) return;

      // if server expects token in handshake query param, and token is present,
      // append it to the URL. Otherwise use wsUrl.
      const baseUrl = wsUrl;
      const token = user?.access_token;
      const url = queryAuthEnabled && token
        ? `${baseUrl}${baseUrl.includes('?') ? '&' : '?'}access_token=${encodeURIComponent(token)}`
        : baseUrl;

      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        attemptRef.current = 0;
        console.info("WS open (readyState)", ws.readyState);

        // flush queued messages
        while (sendQueueRef.current.length > 0) {
          const t = sendQueueRef.current.shift();
          try {
            ws.send(t);
          } catch (e) {
            // push back and stop flush
            sendQueueRef.current.unshift(t);
            break;
          }
        }

        // heartbeat
        clearInterval(pingTimerRef.current);
        pingTimerRef.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            try {
              ws.send(JSON.stringify({ type: "ping" }));
            } catch (err) {
              console.warn("ping send failed:", err);
            }
          }
        }, 25000);

        // If query-auth wasn't used, attempt to send token message now (backend may expect it)
        if (!queryAuthEnabled && token) {
          try {
            ws.send(JSON.stringify({ access_token: token }));
          } catch (e) {
            // queue if failed
            sendQueueRef.current.push(JSON.stringify({ access_token: token }));
          }
        }
      };

      ws.onmessage = (evt) => {
        let parsed;
        try {
          parsed = JSON.parse(evt.data);
        } catch (e) {
          parsed = evt.data;
        }
        listenersRef.current.forEach((cb) => {
          try {
            cb(parsed);
          } catch (err) {
            console.error("WS listener error:", err);
          }
        });
      };

      ws.onerror = (err) => {
        console.error("WebSocket error event:", err);
      };

      ws.onclose = (ev) => {
        clearInterval(pingTimerRef.current);
        console.warn("WebSocket closed:", {
          code: ev.code,
          reason: ev.reason,
          wasClean: ev.wasClean,
        });
        wsRef.current = null;
        if (!shouldReconnectRef.current) return;
        const ms = backoff(attemptRef.current++);
        console.warn(`WS closed, reconnecting in ${ms}ms`);
        setTimeout(connect, ms);
      };
    };

    connect();

    return () => {
      mounted = false;
      shouldReconnectRef.current = false;
      clearInterval(pingTimerRef.current);
      if (wsRef.current) wsRef.current.close();
      wsRef.current = null;
    };
    // NOTE: we intentionally don't include `user` here to avoid reconnect loops.
  }, [wsUrl, queryAuthEnabled]);

  // New effect: when user becomes available (i.e. logs in),
  // send or queue the token so backend receives it without reconnecting.
  useEffect(() => {
    const token = user?.access_token;
    if (!token) return;

    const msg = JSON.stringify({ access_token: token });
    const ws = wsRef.current;

    // If server expects token in query param and we did not open with token,
    // you could *optionally* force a reconnect with token in URL, but prefer
    // send-if-open first.
    if (ws && ws.readyState === WebSocket.OPEN) {
      try {
        ws.send(msg);
      } catch (e) {
        sendQueueRef.current.push(msg);
      }
    } else {
      // ensures message will be flushed on next onopen
      sendQueueRef.current.push(msg);
    }
  }, [user?.access_token]);

  return (
    <WebSocketContext.Provider value={api}>
      {children}
    </WebSocketContext.Provider>
  );
}