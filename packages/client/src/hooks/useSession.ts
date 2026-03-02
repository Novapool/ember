import { useState, useEffect, useRef } from 'react';
import { useBonfireContext } from '../context/BonfireProvider';

/** Check if a bonfire session exists in localStorage without parsing it */
function hasSavedSession(): boolean {
  try {
    return localStorage.getItem('bonfire_session') !== null;
  } catch {
    return false;
  }
}

/**
 * Automatically restores a saved Bonfire session on mount.
 *
 * On mount, checks localStorage for a saved session (roomId + playerId).
 * When the socket connects, attempts `reconnectToRoom` if not already in a room.
 * Cleans up stale sessions by clearing them on failed reconnect.
 *
 * @returns `{ isRestoring, restored, failed }`
 *   - `isRestoring` — true while the reconnect attempt is in flight; show a loading overlay
 *   - `restored` — true if the reconnect succeeded
 *   - `failed` — true if the reconnect was attempted but failed (room gone, etc.)
 *
 * @example
 * function GameRouter() {
 *   const { isRestoring } = useSession();
 *   if (isRestoring) return <ReconnectingScreen />;
 *   if (!phase) return <LandingScreen />;
 *   // ...
 * }
 */
export function useSession(): { isRestoring: boolean; restored: boolean; failed: boolean } {
  // Start as restoring if there's a saved session — avoids landing-screen flash on reconnect
  const [isRestoring, setIsRestoring] = useState(hasSavedSession);
  const [restored, setRestored] = useState(false);
  const [failed, setFailed] = useState(false);
  const attemptedRef = useRef(false);

  const { client, status } = useBonfireContext();

  useEffect(() => {
    // Wait until connected
    if (status !== 'connected') return;
    // Only attempt once per mount
    if (attemptedRef.current) return;
    // If already in a room (e.g. user just created/joined), skip
    if (client.roomId) {
      setIsRestoring(false);
      return;
    }

    const session = client.loadSession();
    if (!session) {
      setIsRestoring(false);
      return;
    }

    attemptedRef.current = true;

    client.reconnectToRoom(session.roomId, session.playerId).then((response) => {
      if (response.success) {
        setRestored(true);
      } else {
        setFailed(true);
      }
      setIsRestoring(false);
    });
  }, [status, client]);

  return { isRestoring, restored, failed };
}
