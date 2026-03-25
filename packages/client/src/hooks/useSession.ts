import { useState, useEffect, useRef } from 'react';
import { useEmberContext } from '../context/EmberProvider';

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
 * Also handles iOS background recovery: if the tab becomes visible again after
 * being backgrounded, and the socket is connected but the room session may have
 * been lost server-side, this hook re-attempts `reconnectToRoom` to re-validate.
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

  const { client, status } = useEmberContext();

  // Initial reconnect on mount: fires when socket first connects
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

  // iOS background recovery: re-validate session when tab becomes visible again.
  // Only fires if: (a) document became visible, (b) socket is connected,
  // (c) there is a saved session or active roomId, and (d) the initial mount
  // reconnect already succeeded (so we don't double-attempt on first load).
  useEffect(() => {
    const unsubscribe = client.onVisibilityReconnect(() => {
      // Guard: only re-validate if we've already successfully restored a session
      // and we're not currently in a room (which would mean we got kicked while backgrounded)
      if (!attemptedRef.current) return;
      if (client.roomId) return; // still in room — nothing to do

      const session = client.loadSession();
      if (!session) return;

      setIsRestoring(true);
      setRestored(false);
      setFailed(false);

      client.reconnectToRoom(session.roomId, session.playerId).then((response) => {
        if (response.success) {
          setRestored(true);
        } else {
          setFailed(true);
        }
        setIsRestoring(false);
      });
    });

    return unsubscribe;
  }, [client]);

  return { isRestoring, restored, failed };
}
