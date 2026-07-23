/**
 * Jitsi Call Modal — full-screen overlay hosting a JitsiRoom, used by both
 * the teacher/admin "enter live class" flow and the student "join live"
 * flow so the embedded call always opens the same way regardless of page.
 */

import { JitsiRoom } from './jitsi-room';

interface JitsiCallModalProps {
  roomName: string;
  displayName: string;
  isModerator: boolean;
  title: string;
  onClose: () => void;
}

export function JitsiCallModal({ roomName, displayName, isModerator, title, onClose }: JitsiCallModalProps) {
  return (
    <div className="fixed inset-0 z-[100] bg-black/90 flex flex-col p-3 sm:p-4">
      <div className="flex items-center justify-between mb-3 flex-shrink-0">
        <p className="text-sm font-semibold text-white flex items-center gap-2">
          <span className="inline-block h-2 w-2 rounded-full bg-red-500 animate-pulse" /> {title}
        </p>
        <button
          onClick={onClose}
          className="rounded-xl bg-white/10 hover:bg-white/20 px-4 py-2 text-sm font-semibold text-white transition-colors"
        >
          Leave Call
        </button>
      </div>
      <div className="flex-1 min-h-0">
        <JitsiRoom roomName={roomName} displayName={displayName} isModerator={isModerator} height="100%" onLeave={onClose} />
      </div>
    </div>
  );
}

export default JitsiCallModal;
