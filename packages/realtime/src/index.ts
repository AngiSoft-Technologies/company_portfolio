import { useCallback, useEffect } from 'react';
import { io, type Socket } from 'socket.io-client';
import { getAccessToken, getClientAccessToken } from '@angisoft/api-client';

const SOCKET_URL: string | undefined =
  (import.meta.env.VITE_SOCKET_URL as string) ||
  (import.meta.env.PROD ? 'https://api.angisoft.co.ke' : undefined);

let socket: Socket | null = null;

function getSocket(): Socket {
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

export function useRealtime(): {
  subscribe: (event: string, handler: (...args: unknown[]) => void) => () => void;
  emit: (event: string, payload?: unknown, ack?: (...args: unknown[]) => void) => void;
  connected: () => boolean;
} {
  const subscribe = useCallback((event: string, handler: (...args: unknown[]) => void) => {
    const sock = getSocket();
    sock.on(event, handler as () => void);
    return () => sock.off(event, handler as () => void);
  }, []);

  const emit = useCallback((event: string, payload?: unknown, ack?: (...args: unknown[]) => void) => {
    const sock = getSocket();
    if (ack) sock.emit(event, payload, ack);
    else sock.emit(event, payload);
  }, []);

  const connected = useCallback(() => Boolean(socket?.connected), []);

  useEffect(() => {
    getSocket();
  }, []);

  return { subscribe, emit, connected };
}

export default useRealtime;