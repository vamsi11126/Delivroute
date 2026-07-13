import { io, type Socket } from 'socket.io-client';

/**
 * Socket.io base URL — the API server root (without the `/v1` REST prefix).
 * Derived from NEXT_PUBLIC_API_URL so a single env var configures both.
 */
function socketBaseUrl(): string {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/v1';
  return apiUrl.replace(/\/v1\/?$/, '');
}

/**
 * Open a connection to a store's private namespace (`/store-{storeId}`).
 *
 * The API's socket middleware authenticates from `handshake.auth.token`, so we
 * pass the NextAuth access token there. Caller owns the returned socket and
 * must call `socket.disconnect()` on unmount.
 */
export function connectStoreSocket(storeId: string, accessToken: string): Socket {
  return io(`${socketBaseUrl()}/store-${storeId}`, {
    auth: { token: accessToken },
    transports: ['websocket'],
    autoConnect: true,
  });
}
