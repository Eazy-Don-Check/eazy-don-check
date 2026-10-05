import React, { useEffect, useRef } from 'react';
import { Mic, MicOff, PhoneOff, Video, VideoOff, Phone, X, Volume2, VolumeX } from 'lucide-react';

export default function DirectCallOverlay({
  callState,
  onAccept,
  onReject,
  onEnd,
  onToggleMute,
  onToggleCamera,
  onToggleSpeaker,
  error
}) {
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const remoteAudioRef = useRef(null);
  const [speakerOn, setSpeakerOn] = React.useState(Boolean(callState?.speakerOn));

  useEffect(() => {
    setSpeakerOn(Boolean(callState?.speakerOn));
  }, [callState?.speakerOn]);

  const applySpeakerMode = async (enabled) => {
    const outputElement = remoteAudioRef.current || remoteVideoRef.current;
    const next = Boolean(enabled);

    try {
      if (outputElement && typeof outputElement.setSinkId === 'function') {
        // Browsers that support setSinkId can route the media element
        // to the default output device. Mobile Safari may not support this.
        await outputElement.setSinkId('default');
      }

      if (outputElement) {
        outputElement.volume = next ? 1 : 0.65;
      }

      setSpeakerOn(next);
      onToggleSpeaker?.(next);
    } catch (speakerError) {
      console.warn('[Call] Speaker output selection is not supported by this browser:', speakerError);
      setSpeakerOn(false);
      onToggleSpeaker?.(false);
    }
  };

  useEffect(() => {
    if (localVideoRef.current && callState?.localStream) {
      localVideoRef.current.srcObject = callState.localStream;
    }
  }, [callState?.localStream]);

  useEffect(() => {
    const remoteStream = callState?.remoteStream;
    const videoElement = remoteVideoRef.current;
    const audioElement = remoteAudioRef.current;

    if (!remoteStream) return undefined;

    if (videoElement) {
      videoElement.srcObject = remoteStream;
      videoElement.play().catch((playError) => {
        console.warn('[Call] Remote video autoplay was blocked:', playError);
      });
    }

    if (audioElement) {
      audioElement.srcObject = remoteStream;
      audioElement.muted = false;
      audioElement.volume = 1;
      audioElement.autoplay = true;

      const playAudio = () => {
        audioElement.play().catch((playError) => {
          console.warn('[Call] Remote audio playback was blocked:', playError);
        });
      };

      audioElement.addEventListener('canplay', playAudio);
      playAudio();

      return () => {
        audioElement.removeEventListener('canplay', playAudio);
      };
    }

    return undefined;
  }, [callState?.remoteStream, callState?.withVideo]);

  if (!callState) return null;

  const incoming = callState.direction === 'incoming' && callState.status === 'incoming';
  const video = Boolean(callState.withVideo);

  return (
    <div className="fixed inset-0 z-[200] bg-slate-950 flex items-center justify-center overflow-hidden">
      {video ? (
        <div className="relative w-full h-full bg-black overflow-hidden flex items-center justify-center">
          <audio
            ref={remoteAudioRef}
            autoPlay
            playsInline
            controls={false}
            className="hidden"
          />
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className="w-full h-full max-h-full object-cover aspect-[9/16] sm:aspect-video"
          />

          <div className="absolute inset-0 bg-gradient-to-b from-black/35 via-transparent to-black/60 pointer-events-none" />

          {callState.localStream && (
            <div className="absolute right-3 top-3 sm:right-5 sm:top-5 w-24 sm:w-40 md:w-52 aspect-[9/16] sm:aspect-video rounded-xl sm:rounded-2xl overflow-hidden border border-white/30 bg-black shadow-2xl z-10">
              <video
                ref={localVideoRef}
                autoPlay
                muted
                playsInline
                className="w-full h-full object-cover"
              />
            </div>
          )}

          <div className="absolute top-3 left-3 sm:top-5 sm:left-5 z-10 max-w-[65%]">
            <div className="rounded-2xl bg-black/35 backdrop-blur-md border border-white/10 px-3 py-2">
              <p className="text-white text-sm sm:text-base font-semibold truncate">
                {callState.peerName || 'User'}
              </p>
              <p className="text-white/70 text-[10px] sm:text-xs mt-0.5">
                {incoming
                  ? 'Incoming video call'
                  : callState.status === 'connected'
                    ? 'Connected'
                    : callState.status === 'calling'
                      ? 'Calling…'
                      : callState.status === 'no_answer'
                        ? 'No Answer'
                        : 'Connecting…'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onEnd}
            className="absolute right-3 top-3 sm:right-5 sm:top-5 w-10 h-10 rounded-full bg-black/45 hover:bg-black/65 text-white flex items-center justify-center transition z-20"
            title="Close"
            aria-label="Close video call"
          >
            <X className="w-5 h-5" />
          </button>

          {error && (
            <div className="absolute left-3 right-3 sm:left-5 sm:right-5 bottom-28 sm:bottom-32 z-20 rounded-xl bg-rose-500/90 text-white px-4 py-3 text-xs shadow-xl">
              {error}
            </div>
          )}

          {incoming ? (
            <div className="absolute left-0 right-0 bottom-5 sm:bottom-8 flex items-center justify-center gap-5 z-20">
              <button
                type="button"
                onClick={onReject}
                className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-rose-600 hover:bg-rose-500 text-white flex items-center justify-center shadow-xl transition"
                title="Decline"
              >
                <PhoneOff className="w-5 h-5 sm:w-6 sm:h-6" />
              </button>
              <button
                type="button"
                onClick={onAccept}
                className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white flex items-center justify-center shadow-xl transition"
                title="Accept"
              >
                <Phone className="w-5 h-5 sm:w-6 sm:h-6" />
              </button>
            </div>
          ) : callState.status === 'no_answer' ? (
            <div className="absolute left-0 right-0 bottom-5 sm:bottom-8 flex items-center justify-center z-20">
              <button
                type="button"
                onClick={onEnd}
                className="px-6 py-3 rounded-full bg-slate-800/90 hover:bg-slate-700 text-white text-xs font-semibold transition border border-white/10"
              >
                Close
              </button>
            </div>
          ) : (
            <div className="absolute left-0 right-0 bottom-5 sm:bottom-8 flex items-center justify-center gap-3 sm:gap-4 z-20">
              {video && (
                <button
                  type="button"
                  onClick={onToggleCamera}
                  className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-black/55 hover:bg-black/70 text-white flex items-center justify-center transition border border-white/10"
                  title={callState.cameraOff ? 'Turn camera on' : 'Turn camera off'}
                >
                  {callState.cameraOff ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
                </button>
              )}
              <button
                type="button"
                onClick={() => applySpeakerMode(!speakerOn)}
                className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-black/55 hover:bg-black/70 text-white flex items-center justify-center transition border border-white/10"
                title={speakerOn ? 'Use earpiece/default audio' : 'Use loudspeaker'}
                aria-label={speakerOn ? 'Use earpiece/default audio' : 'Use loudspeaker'}
              >
                {speakerOn ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
              </button>
              <button
                type="button"
                onClick={onToggleMute}
                className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-black/55 hover:bg-black/70 text-white flex items-center justify-center transition border border-white/10"
                title={callState.muted ? 'Unmute' : 'Mute'}
              >
                {callState.muted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
              </button>
              <button
                type="button"
                onClick={onEnd}
                className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-rose-600 hover:bg-rose-500 text-white flex items-center justify-center shadow-xl transition"
                title="End call"
              >
                <PhoneOff className="w-5 h-5 sm:w-6 sm:h-6" />
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="relative w-full h-full flex items-center justify-center bg-slate-950">
          <audio
            ref={remoteAudioRef}
            autoPlay
            playsInline
            controls={false}
            className="hidden"
          />

          <div className="text-center text-white px-6">
            <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-brand-500/20 border border-brand-400/30 flex items-center justify-center text-4xl font-bold mx-auto mb-5">
              {(callState.peerName || 'M').charAt(0).toUpperCase()}
            </div>
            <p className="font-semibold text-xl">{callState.peerName}</p>
            <p className="text-sm text-slate-400 mt-2">
              {incoming
                ? 'Incoming voice call'
                : callState.status === 'calling'
                  ? 'Calling…'
                  : callState.status === 'no_answer'
                    ? 'No Answer'
                    : callState.status === 'connected'
                      ? 'Voice call'
                      : 'Connecting…'}
            </p>
          </div>

          <button
            type="button"
            onClick={onEnd}
            className="absolute right-4 top-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>

          {error && (
            <div className="absolute left-4 right-4 bottom-28 rounded-xl bg-rose-500/90 text-white px-4 py-3 text-xs">
              {error}
            </div>
          )}

          {incoming ? (
            <div className="absolute left-0 right-0 bottom-8 flex items-center justify-center gap-5">
              <button type="button" onClick={onReject} className="w-16 h-16 rounded-full bg-rose-600 text-white flex items-center justify-center shadow-xl" title="Decline">
                <PhoneOff className="w-6 h-6" />
              </button>
              <button type="button" onClick={onAccept} className="w-16 h-16 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-xl" title="Accept">
                <Phone className="w-6 h-6" />
              </button>
            </div>
          ) : callState.status === 'no_answer' ? (
            <div className="absolute left-0 right-0 bottom-8 flex items-center justify-center">
              <button type="button" onClick={onEnd} className="px-6 py-3 rounded-full bg-slate-800 text-white text-xs font-semibold">Close</button>
            </div>
          ) : (
            <div className="absolute left-0 right-0 bottom-8 flex items-center justify-center gap-4">
              <button
                type="button"
                onClick={() => applySpeakerMode(!speakerOn)}
                className="w-14 h-14 rounded-full bg-slate-800 text-white flex items-center justify-center transition"
                title={speakerOn ? 'Use earpiece/default audio' : 'Use loudspeaker'}
                aria-label={speakerOn ? 'Use earpiece/default audio' : 'Use loudspeaker'}
              >
                {speakerOn ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
              </button>
              <button type="button" onClick={onToggleMute} className="w-14 h-14 rounded-full bg-slate-800 text-white flex items-center justify-center" title={callState.muted ? 'Unmute' : 'Mute'}>
                {callState.muted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
              </button>
              <button type="button" onClick={onEnd} className="w-16 h-16 rounded-full bg-rose-600 text-white flex items-center justify-center shadow-xl" title="End call">
                <PhoneOff className="w-6 h-6" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}