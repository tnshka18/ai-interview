import { useEffect, useRef, useCallback, useState } from 'react';

// Auto-detect ws:// vs wss:// based on page protocol when env var not set
const DEFAULT_WS = window.location.protocol === 'https:'
  ? `wss://${window.location.host}/ws`
  : 'ws://localhost:5000/ws';

const WS_URL = process.env.REACT_APP_WS_URL || DEFAULT_WS;

export function useWebSocket(handlers = {}) {
  const ws          = useRef(null);
  const retries     = useRef(0);
  const handlersRef = useRef(handlers); // always-current handlers, avoids stale closures
  const [status, setStatus] = useState('disconnected');

  // Keep handlersRef current without re-connecting
  useEffect(() => { handlersRef.current = handlers; });

  const send = useCallback((type, payload) => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify({ type, payload }));
      return true;
    }
    return false;
  }, []);

  const connect = useCallback(() => {
    if (ws.current?.readyState === WebSocket.OPEN) return;
    setStatus('connecting');

    try {
      ws.current = new WebSocket(WS_URL);

      ws.current.onopen = () => {
        setStatus('connected');
        retries.current = 0;
        handlersRef.current.onOpen?.();
      };

      ws.current.onmessage = (e) => {
        try {
          const msg = JSON.parse(e.data);
          handlersRef.current.onMessage?.(msg);
          const specific = handlersRef.current[msg.type];
          specific?.(msg.payload ?? msg);
        } catch {}
      };

      ws.current.onclose = () => {
        setStatus('disconnected');
        handlersRef.current.onClose?.();
        if (retries.current < 5) {
          const delay = Math.min(1000 * 2 ** retries.current, 16000);
          retries.current++;
          setTimeout(connect, delay);
        }
      };

      ws.current.onerror = () => {
        setStatus('disconnected');
        ws.current?.close();
      };
    } catch {
      setStatus('disconnected');
    }
  }, []); // eslint-disable-line

  useEffect(() => {
    connect();
    return () => {
      ws.current?.close();
    };
  }, []); // eslint-disable-line

  return { send, status, ws };
}