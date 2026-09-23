import { useCallback, useEffect } from 'react';
import { io } from 'socket.io-client';
import { getAccessToken, getClientAccessToken } from '../js/httpClient';

/**
 * useRealtime — thin hook over a single shared Socket.IO client.
 *
 * - Connects to the same origin in dev (Vite proxies /socket.io → backend),
 *   to `VITE_SOCKET_URL` if set, else the API host in production.
 * - Authenticates with the in-memory JWT (getAccessToken/getClientAccessToken)
 *   when available, otherwise connects anonymously (public booking tracking).
 * - `subscribe(event, handler)` registers a listener returning an unsubscriber;
 *   call it from a useEffect cleanup. Safe from several components — the socket
 *   is a module singleton and socket.io automatically reconnects.
 *
 * Server events used today:
 *   booking:event    { bookingId, type, title, status, ... }
 *   notification:new { id, type, title, message, link, createdAt }
 *   payment:status   { bookingId, status, amount, currency, providerId }
 */
const SOCKET_URL =
  import.meta.env.VITE_SOCKET_URL ||
  (import.meta.env.PROD ? 'https://api.angisoft.co.ke' : undefined);

let socket = null;

function getSocket() {
  if (socket) return socket;
  const token = getClientAccessToken() || getAccessToken();
  socket = io(SOCKET_URL, {
    transports: ['websocket', 'polling'],
    auth: token ? { token } : {},
    autoConnect: true,
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
  });
  return socket;
}

function useRealtime() {
  const subscribe = useCallback((event, handler) => {
    const sock = getSocket();
    sock.on(event, handler);
    return () => sock.off(event, handler);
  }, []);

  const emit = useCallback((event, payload, ack) => {
    const sock = getSocket();
    if (ack) sock.emit(event, payload, ack);
    else sock.emit(event, payload);
  }, []);

  const connected = useCallback(() => Boolean(socket?.connected), []);

  // Silent connect on mount so the event listeners receive pushes immediately.
  useEffect(() => {
    getSocket();
  }, []);

  return { subscribe, emit, connected };
}

export default useRealtime;