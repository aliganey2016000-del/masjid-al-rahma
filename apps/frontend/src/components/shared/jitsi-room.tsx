/**
 * Jitsi Room — embeds a live video classroom directly in the page using the
 * free public Jitsi Meet server (meet.jit.si) via its IFrame External API.
 * No API key, no Jitsi account, no signup — a room is simply created the
 * moment the first participant joins a given room name.
 *
 * Each course gets its own room, named deterministically from the course id
 * (see `jitsiRoomName` below) so teachers and students always land in the
 * same room without any link to copy/paste or store.
 */

import { useEffect, useRef, useState } from 'react';

declare global {
  interface Window {
    JitsiMeetExternalAPI?: new (domain: string, options: Record<string, unknown>) => JitsiMeetAPI;
  }
}

interface JitsiMeetAPI {
  dispose: () => void;
  executeCommand: (command: string, ...args: unknown[]) => void;
  addEventListener: (event: string, handler: (...args: any[]) => void) => void;
}

const JITSI_DOMAIN = 'meet.jit.si';
const SCRIPT_SRC = `https://${JITSI_DOMAIN}/external_api.js`;

/** Deterministic, reasonably unguessable room name for a course's live class. */
export function jitsiRoomName(courseId: string): string {
  return `MinhajEdu-${courseId}`;
}

let scriptLoadPromise: Promise<void> | null = null;

function loadJitsiScript(): Promise<void> {
  if (window.JitsiMeetExternalAPI) return Promise.resolve();
  if (scriptLoadPromise) return scriptLoadPromise;

  scriptLoadPromise = new Promise((resolve, reject) => {
    const existing = document.getElementById('jitsi-external-api');
    if (existing) {
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', () => reject(new Error('Failed to load Jitsi script')));
      return;
    }
    const tag = document.createElement('script');
    tag.id = 'jitsi-external-api';
    tag.src = SCRIPT_SRC;
    tag.async = true;
    tag.onload = () => resolve();
    tag.onerror = () => reject(new Error('Failed to load Jitsi script'));
    document.body.appendChild(tag);
  });
  return scriptLoadPromise;
}

interface JitsiRoomProps {
  roomName: string;
  displayName: string;
  /** Teachers join camera+mic on with full moderator controls; students join muted. */
  isModerator: boolean;
  height?: string | number;
  onLeave?: () => void;
}

export function JitsiRoom({ roomName, displayName, isModerator, height = '70vh', onLeave }: JitsiRoomProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const apiRef = useRef<JitsiMeetAPI | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    loadJitsiScript()
      .then(() => {
        if (cancelled || !containerRef.current || !window.JitsiMeetExternalAPI) return;

        const api = new window.JitsiMeetExternalAPI(JITSI_DOMAIN, {
          roomName,
          parentNode: containerRef.current,
          width: '100%',
          height: '100%',
          userInfo: { displayName },
          configOverwrite: {
            prejoinPageEnabled: false,
            disableDeepLinking: true,
            startWithAudioMuted: !isModerator,
            startWithVideoMuted: false,
          },
          interfaceConfigOverwrite: {
            SHOW_JITSI_WATERMARK: false,
            SHOW_WATERMARK_FOR_GUESTS: false,
            DEFAULT_REMOTE_DISPLAY_NAME: 'Participant',
            MOBILE_APP_PROMO: false,
          },
        });
        apiRef.current = api;

        api.addEventListener('videoConferenceJoined', () => setLoading(false));
        api.addEventListener('readyToClose', () => onLeave?.());
      })
      .catch(() => {
        if (!cancelled) {
          setError('Could not load the video classroom. Check your connection and try again.');
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
      apiRef.current?.dispose();
      apiRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomName]);

  if (error) {
    return (
      <div className="flex items-center justify-center rounded-2xl border border-red-200 dark:border-red-900/40 bg-red-50 dark:bg-red-950/20 p-8 text-center text-sm text-red-600 dark:text-red-400" style={{ height }}>
        {error}
      </div>
    );
  }

  return (
    <div className="relative rounded-2xl overflow-hidden bg-black" style={{ height }}>
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-10">
          <div className="flex flex-col items-center gap-3 text-white">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/30 border-t-white" />
            <p className="text-sm">Joining the live classroom...</p>
          </div>
        </div>
      )}
      <div ref={containerRef} className="w-full h-full" />
    </div>
  );
}

export default JitsiRoom;
