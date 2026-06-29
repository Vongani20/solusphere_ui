import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  PhoneArrowDownLeftIcon,
  PhoneXMarkIcon,
  VideoCameraIcon,
} from "@heroicons/react/24/outline";
import api, { getApiError, getStoredUser } from "../services/api";
import UserAvatar from "../components/UserAvatar";

const CallContext = createContext(null);

const ICE_SERVERS = [{ urls: "stun:stun.l.google.com:19302" }];

function peerLabel(call, currentUserId) {
  if (!call) return "User";
  if (call.caller_id === currentUserId) return call.callee_username || "User";
  return call.caller_username || "User";
}

function MediaTile({ stream, muted = false, label, className = "" }) {
  const videoRef = useRef(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.srcObject = stream || null;
  }, [stream]);

  if (!stream) {
    return (
      <div className={`flex items-center justify-center bg-slate-900 text-white ${className}`}>
        <p className="text-sm font-medium text-slate-300">{label}</p>
      </div>
    );
  }

  const hasVideo = stream.getVideoTracks().some((track) => track.enabled && track.readyState === "live");

  if (!hasVideo) {
    return (
      <div className={`flex items-center justify-center bg-slate-900 text-white ${className}`}>
        <p className="text-sm font-medium">{label}</p>
      </div>
    );
  }

  return (
    <video
      ref={videoRef}
      autoPlay
      playsInline
      muted={muted}
      className={`bg-slate-900 object-cover ${className}`}
    />
  );
}

function CallOverlay({
  callSession,
  callPhase,
  callError,
  callType,
  localStream,
  remoteStream,
  onAccept,
  onReject,
  onEnd,
  busy,
}) {
  const currentUser = getStoredUser();
  const label = peerLabel(callSession, currentUser?.id);
  const peerUser =
    callSession?.caller_id === currentUser?.id
      ? { username: callSession?.callee_username }
      : { username: callSession?.caller_username };
  const remoteAudioRef = useRef(null);

  useEffect(() => {
    const audio = remoteAudioRef.current;
    if (!audio) return;
    audio.srcObject = remoteStream || null;
  }, [remoteStream]);

  if (callPhase === "idle") return null;

  const isVideo = callType === "video";
  const showActiveMedia = callPhase === "active" || callPhase === "connecting";

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
      <div className="w-full max-w-3xl overflow-hidden rounded-2xl border border-slate-700 bg-slate-950 shadow-2xl">
        {showActiveMedia && isVideo ? (
          <div className="relative aspect-video w-full bg-black">
            <MediaTile stream={remoteStream} label={`${label} camera off`} className="h-full w-full" />
            <MediaTile
              stream={localStream}
              muted
              label="You"
              className="absolute bottom-4 right-4 h-28 w-40 rounded-lg border border-white/20 shadow-lg"
            />
          </div>
        ) : (
          <div className="flex flex-col items-center px-8 pb-8 pt-10 text-center text-white">
            <UserAvatar user={peerUser} className="mb-4 h-20 w-20 text-2xl" iconClassName="h-10 w-10" />
            <h2 className="text-2xl font-bold">{label}</h2>
            <p className="mt-2 text-sm text-slate-300">
              {callPhase === "incoming" && `Incoming ${isVideo ? "video" : "voice"} call`}
              {callPhase === "outgoing" && `Calling...`}
              {callPhase === "connecting" && "Connecting..."}
              {callPhase === "active" && `${isVideo ? "Video" : "Voice"} call in progress`}
              {callPhase === "ended" && "Call ended"}
            </p>
            {!isVideo && showActiveMedia ? (
              <audio ref={remoteAudioRef} autoPlay playsInline className="hidden" />
            ) : null}
          </div>
        )}

        {callError ? (
          <div className="border-t border-rose-500/30 bg-rose-950/40 px-6 py-3 text-sm font-medium text-rose-200">
            {callError}
          </div>
        ) : null}

        <div className="flex flex-wrap items-center justify-center gap-3 border-t border-slate-800 px-6 py-5">
          {callPhase === "incoming" ? (
            <>
              <button
                type="button"
                onClick={onReject}
                disabled={busy}
                className="btn btn-danger inline-flex items-center gap-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <PhoneXMarkIcon className="h-5 w-5" />
                Decline
              </button>
              <button
                type="button"
                onClick={onAccept}
                disabled={busy}
                className="btn btn-primary inline-flex items-center gap-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isVideo ? <VideoCameraIcon className="h-5 w-5" /> : <PhoneArrowDownLeftIcon className="h-5 w-5" />}
                Accept
              </button>
            </>
          ) : null}

          {callPhase === "outgoing" || callPhase === "connecting" || callPhase === "active" ? (
            <button
              type="button"
              onClick={onEnd}
              disabled={busy && callPhase === "outgoing"}
              className="btn btn-danger inline-flex items-center gap-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <PhoneXMarkIcon className="h-5 w-5" />
              {callPhase === "outgoing" ? "Cancel" : "End call"}
            </button>
          ) : null}

          {callPhase === "ended" ? (
            <button type="button" onClick={onEnd} className="btn btn-secondary">
              Close
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export function CallProvider({ children }) {
  const currentUser = getStoredUser();
  const pcRef = useRef(null);
  const callIdRef = useRef("");
  const candidateSinceRef = useRef(0);
  const pollTimerRef = useRef(null);
  const incomingTimerRef = useRef(null);
  const remoteSetRef = useRef(false);

  const [callSession, setCallSession] = useState(null);
  const [callPhase, setCallPhase] = useState("idle");
  const [callType, setCallType] = useState("audio");
  const [callError, setCallError] = useState("");
  const [busy, setBusy] = useState(false);
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);

  const stopPolling = useCallback(() => {
    if (pollTimerRef.current) {
      window.clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
  }, []);

  const cleanupMedia = useCallback(() => {
    stopPolling();
    pcRef.current?.close();
    pcRef.current = null;
    localStream?.getTracks().forEach((track) => track.stop());
    setLocalStream(null);
    setRemoteStream(null);
    callIdRef.current = "";
    candidateSinceRef.current = 0;
    remoteSetRef.current = false;
  }, [localStream, stopPolling]);

  const resetCall = useCallback(() => {
    cleanupMedia();
    setCallSession(null);
    setCallPhase("idle");
    setCallType("audio");
    setCallError("");
    setBusy(false);
  }, [cleanupMedia]);

  const getMedia = useCallback(async (type) => {
    const constraints = type === "video" ? { audio: true, video: true } : { audio: true, video: false };
    return navigator.mediaDevices.getUserMedia(constraints);
  }, []);

  const createPeerConnection = useCallback((callId, stream) => {
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    stream.getTracks().forEach((track) => pc.addTrack(track, stream));

    pc.onicecandidate = (event) => {
      if (!event.candidate || !callIdRef.current) return;
      api
        .post(`/chats/calls/${callIdRef.current}/candidates`, {
          candidate: {
            candidate: event.candidate.candidate,
            sdpMid: event.candidate.sdpMid,
            sdpMLineIndex: event.candidate.sdpMLineIndex,
          },
        })
        .catch(() => {});
    };

    pc.ontrack = (event) => {
      const stream = event.streams?.[0] || new MediaStream([event.track]);
      setRemoteStream(stream);
    };

    pcRef.current = pc;
    callIdRef.current = callId;
    return pc;
  }, []);

  const ingestCandidates = useCallback(async () => {
    if (!callIdRef.current || !pcRef.current) return;
    try {
      const res = await api.get(`/chats/calls/${callIdRef.current}/candidates`, {
        params: { since_id: candidateSinceRef.current },
      });
      for (const item of res.data.candidates || []) {
        candidateSinceRef.current = Math.max(candidateSinceRef.current, item.id);
        if (!item.candidate) continue;
        await pcRef.current.addIceCandidate(
          new RTCIceCandidate({
            candidate: item.candidate,
            sdpMid: item.sdp_mid || undefined,
            sdpMLineIndex: item.sdp_m_line_index ?? undefined,
          })
        );
      }
    } catch {
      // Ignore transient polling errors.
    }
  }, []);

  const startPolling = useCallback(
    (callId, role) => {
      stopPolling();
      pollTimerRef.current = window.setInterval(async () => {
        try {
          await ingestCandidates();
          const res = await api.get(`/chats/calls/${callId}`);
          const call = res.data.call;
          setCallSession(call);

          if (
            role === "caller" &&
            call.status === "accepted" &&
            call.answer_sdp &&
            pcRef.current &&
            !remoteSetRef.current
          ) {
            await pcRef.current.setRemoteDescription({ type: "answer", sdp: call.answer_sdp });
            remoteSetRef.current = true;
            setCallPhase("active");
          }

          if (["rejected", "ended", "missed"].includes(call.status)) {
            setCallPhase("ended");
            stopPolling();
          }
        } catch {
          // Ignore transient polling errors.
        }
      }, 1200);
    },
    [ingestCandidates, stopPolling]
  );

  const startCall = useCallback(
    async (peerUserId, type = "audio") => {
      if (!peerUserId || callPhase !== "idle") return;
      setBusy(true);
      setCallError("");
      setCallType(type);

      try {
        const stream = await getMedia(type);
        setLocalStream(stream);

        const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
        stream.getTracks().forEach((track) => pc.addTrack(track, stream));
        pc.onicecandidate = (event) => {
          if (!event.candidate || !callIdRef.current) return;
          api
            .post(`/chats/calls/${callIdRef.current}/candidates`, {
              candidate: {
                candidate: event.candidate.candidate,
                sdpMid: event.candidate.sdpMid,
                sdpMLineIndex: event.candidate.sdpMLineIndex,
              },
            })
            .catch(() => {});
        };
        pc.ontrack = (event) => {
          const remote = event.streams?.[0] || new MediaStream([event.track]);
          setRemoteStream(remote);
        };
        pcRef.current = pc;

        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);

        const res = await api.post(`/chats/${peerUserId}/calls`, {
          call_type: type,
          offer: { type: offer.type, sdp: offer.sdp },
        });

        const call = res.data.call;
        callIdRef.current = call.id;
        setCallSession(call);
        setCallPhase("outgoing");
        startPolling(call.id, "caller");
      } catch (err) {
        cleanupMedia();
        setCallError(getApiError(err, "Failed to start call."));
        setCallPhase("idle");
      } finally {
        setBusy(false);
      }
    },
    [callPhase, cleanupMedia, getMedia, startPolling]
  );

  const acceptCall = useCallback(async () => {
    if (!callSession?.id || !callSession.offer_sdp) return;
    setBusy(true);
    setCallError("");
    setCallType(callSession.call_type || "audio");

    try {
      const stream = await getMedia(callSession.call_type || "audio");
      setLocalStream(stream);
      const pc = createPeerConnection(callSession.id, stream);

      await pc.setRemoteDescription({ type: "offer", sdp: callSession.offer_sdp });
      remoteSetRef.current = true;
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      const res = await api.post(`/chats/calls/${callSession.id}/accept`, {
        answer: { type: answer.type, sdp: answer.sdp },
      });

      setCallSession(res.data.call);
      setCallPhase("active");
      startPolling(callSession.id, "callee");
    } catch (err) {
      cleanupMedia();
      setCallError(getApiError(err, "Failed to accept call."));
      setCallPhase("idle");
      setCallSession(null);
    } finally {
      setBusy(false);
    }
  }, [callSession, cleanupMedia, createPeerConnection, getMedia, startPolling]);

  const rejectCall = useCallback(async () => {
    if (!callSession?.id) {
      resetCall();
      return;
    }
    setBusy(true);
    try {
      await api.post(`/chats/calls/${callSession.id}/reject`);
    } catch {
      // Ignore reject failures and reset locally.
    } finally {
      resetCall();
    }
  }, [callSession, resetCall]);

  const endCall = useCallback(async () => {
    if (callSession?.id && ["outgoing", "connecting", "active"].includes(callPhase)) {
      try {
        await api.post(`/chats/calls/${callSession.id}/end`);
      } catch {
        // Ignore end failures and reset locally.
      }
    }
    if (callPhase === "ended") {
      resetCall();
      return;
    }
    resetCall();
  }, [callPhase, callSession, resetCall]);

  useEffect(() => {
    if (callPhase !== "idle" || !localStorage.getItem("token")) return undefined;

    incomingTimerRef.current = window.setInterval(async () => {
      try {
        const res = await api.get("/chats/calls/incoming");
        const calls = res.data.calls || [];
        if (calls.length > 0) {
          setCallSession(calls[0]);
          setCallType(calls[0].call_type || "audio");
          setCallPhase("incoming");
        }
      } catch {
        // Ignore polling errors.
      }
    }, 2000);

    return () => {
      if (incomingTimerRef.current) {
        window.clearInterval(incomingTimerRef.current);
        incomingTimerRef.current = null;
      }
    };
  }, [callPhase]);

  useEffect(() => () => cleanupMedia(), [cleanupMedia]);

  const value = {
    callSession,
    callPhase,
    callType,
    callError,
    busy,
    localStream,
    remoteStream,
    startCall,
    acceptCall,
    rejectCall,
    endCall,
    inCall: callPhase !== "idle",
  };

  return (
    <CallContext.Provider value={value}>
      {children}
      <CallOverlay
        callSession={callSession}
        callPhase={callPhase}
        callError={callError}
        callType={callType}
        localStream={localStream}
        remoteStream={remoteStream}
        onAccept={acceptCall}
        onReject={rejectCall}
        onEnd={endCall}
        busy={busy}
      />
    </CallContext.Provider>
  );
}

export function useCall() {
  const context = useContext(CallContext);
  if (!context) {
    throw new Error("useCall must be used within CallProvider");
  }
  return context;
}
