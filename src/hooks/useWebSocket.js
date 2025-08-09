import { useContext, useCallback } from "react";
import { WebSocketContext } from "../context/WebSocketProvider";

export default function useWebSocket() {
  const api = useContext(WebSocketContext);

  const subscribe = useCallback(
    (cb) => {
      if (!api) return () => {};
      api.subscribe(cb);
      return () => api.unsubscribe(cb);
    },
    [api]
  );

  const send = useCallback(
    (msg) => {
      if (!api) {
        console.warn("No WS API available");
        return false;
      }
      return api.send(msg);
    },
    [api]
  );

  const getReadyState = useCallback(
    () => api?.getReadyState?.() ?? WebSocket.CLOSED,
    [api]
  );

  return { send, subscribe, getReadyState };
}