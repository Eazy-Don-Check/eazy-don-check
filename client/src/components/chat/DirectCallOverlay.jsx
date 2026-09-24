import React, { useEffect, useRef } from 'react';
import { Mic, MicOff, PhoneOff, Video, VideoOff, Phone, X } from 'lucide-react';

export default function DirectCallOverlay({
  callState,
  onAccept,
  onReject,
  onEnd,
  onToggleMute,
  onToggleCamera,
  error
}) {
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);

  useEffect(() => {
    if (localVideoRef.current && callState?.localStream) {
      localVideoRef.current.srcObject = callState.localStream;
    }
  }, [callState?.localStream]);

  useEffect(() => {
    if (remoteVideoRef.current && callState?.remoteStream) {
      remoteVideoRef.current.srcObject = callState.remoteStream;
    }
  }, [callState?.remoteStream]);

  if (!callState) return null;

  const incoming = callState.direction === 'incoming' && callState.status === 'incoming';
  const video = Boolean(callState.withVideo);

  return (
    <div className="fixed inset-0 z-[100] bg-slate-950/90 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-2xl overflow-hidden rounded-3xl border border-white/10 bg-slate-900 shadow-2xl">
        <div className="relative aspect-video bg-black overflow-hidden">
          {video ? (
            <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-white">
              <div className="w-20 h-20 rounded-full bg-brand-500/20 border border-brand-400/30 flex items-center justify-center text-3xl font-bold mb-4">
                {(callState.peerName || 'M').charAt(0).toUpperCase()}
              </div>
              <p className="font-semibold text-lg">{callState.peerName}</p>
              <p className="text-sm text-slate-400 mt-1">
                {incoming ? 'Incoming voice call' : callState.status === 'calling' ? 'Calling…' : callState.status === 'no_answer' ? 'No Answer' : callState.status === 'connected' ? 'Voice call' : 'Connecting…'}
              </p>
            </div>
          )}

          {video && callState.localStream && (
            <div className="absolute right-4 top-4 w-32 sm:w-40 aspect-video rounded-xl overflow-hidden border border-white/20 bg-black shadow-xl">
              <video ref={localVideoRef} autoPlay muted playsInline className="w-full h-full object-cover" />
            </div>
          )}

          <button type="button" onClick={onEnd} className="absolute right-4 top-4 w-9 h-9 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70 transition">
            <X className="w-4 h-4" />
          </button>

          {error && (
            <div className="absolute left-4 right-4 bottom-4 rounded-xl bg-rose-500/90 text-white px-4 py-3 text-xs">
              {error}
            </div>
          )}
        </div>

        <div className="px-5 py-5">
          <div className="text-center mb-5">
            <p className="text-white font-semibold">{callState.peerName}</p>
            <p className="text-xs text-slate-400 mt-1">
              {incoming ? 'wants to call you' : callState.status === 'connected' ? 'Connected' : callState.status === 'calling' ? 'Calling…' : callState.status === 'no_answer' ? 'No Answer' : 'Connecting…'}
            </p>
          </div>

          {incoming ? (
            <div className="flex items-center justify-center gap-4">
              <button type="button" onClick={onReject} className="w-14 h-14 rounded-full bg-rose-600 hover:bg-rose-500 text-white flex items-center justify-center transition" title="Decline">
                <PhoneOff className="w-5 h-5" />
              </button>
              <button type="button" onClick={onAccept} className="w-14 h-14 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white flex items-center justify-center transition" title="Accept">
                <Phone className="w-5 h-5" />
              </button>
            </div>
          ) : callState.status === 'no_answer' ? (
            <div className="flex items-center justify-center gap-3">
              <button type="button" onClick={onEnd} className="px-5 py-2.5 rounded-xl bg-slate-700 hover:bg-slate-600 text-white text-xs font-semibold transition">Close</button>
            </div>
          ) : (
            <div className="flex items-center justify-center gap-3">
              {video && (
                <button type="button" onClick={onToggleCamera} className="w-12 h-12 rounded-full bg-slate-700 hover:bg-slate-600 text-white flex items-center justify-center transition" title={callState.cameraOff ? 'Turn camera on' : 'Turn camera off'}>
                  {callState.cameraOff ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
                </button>
              )}
              <button type="button" onClick={onToggleMute} className="w-12 h-12 rounded-full bg-slate-700 hover:bg-slate-600 text-white flex items-center justify-center transition" title={callState.muted ? 'Unmute' : 'Mute'}>
                {callState.muted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
              </button>
              <button type="button" onClick={onEnd} className="w-14 h-14 rounded-full bg-rose-600 hover:bg-rose-500 text-white flex items-center justify-center transition" title="End call">
                <PhoneOff className="w-5 h-5" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}