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

const ICE_SERVERS = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
  {
    urls: "turn:openrelay.metered.ca:80",
    username: "openrelayproject",
    credential: "openrelayproject",
  },
  {
    urls: "turn:openrelay.metered.ca:443",
    username: "openrelayproject",
    credential: "openrelayproject",
  },
  {
    urls: "turn:openrelay.metered.ca:443?transport=tcp",
    username: "openrelayproject",
    credential: "openrelayproject",
  },
];

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
    if (remoteStream) {
      audio.play().catch(() => {});
    }
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
              {callPhase === "outgoing" && "Calling..."}
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
  const pcRef = useRef(null);
  const callIdRef = useRef("");
  const candidateSinceRef = useRef(0);
  const pollTimerRef = useRef(null);
  const incomingTimerRef = useRef(null);
  const remoteDescriptionSetRef = useRef(false);
  const pendingRemoteCandidatesRef = useRef([]);
  const localStreamRef = useRef(null);

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

  const stopLocalMedia = useCallback(() => {
    localStreamRef.current?.getTracks().forEach((track) => track.stop());
    localStreamRef.current = null;
    setLocalStream(null);
    setRemoteStream(null);
  }, []);

  const resetPeerState = useCallback(() => {
    stopPolling();
    pcRef.current?.close();
    pcRef.current = null;
    callIdRef.current = "";
    candidateSinceRef.current = 0;
    remoteDescriptionSetRef.current = false;
    pendingRemoteCandidatesRef.current = [];
  }, [stopPolling]);

  const cleanupMedia = useCallback(() => {
    resetPeerState();
    stopLocalMedia();
  }, [resetPeerState, stopLocalMedia]);

  const resetCall = useCallback(() => {
    cleanupMedia();
    setCallSession(null);
    setCallPhase("idle");
    setCallType("audio");
    setCallError("");
    setBusy(false);
  }, [cleanupMedia]);

  const getMedia = useCallback(async (type) => {
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error("This browser does not support camera or microphone access.");
    }
    const constraints =
      type === "video" ? { audio: true, video: { facingMode: "user" } } : { audio: true, video: false };
    return navigator.mediaDevices.getUserMedia(constraints);
  }, []);

  const postIceCandidate = useCallback(async (callId, candidate) => {
    if (!callId || !candidate?.candidate) return;
    await api.post(`/chats/calls/${callId}/candidates`, {
      candidate: {
        candidate: candidate.candidate,
        sdpMid: candidate.sdpMid ?? "",
        sdpMLineIndex: candidate.sdpMLineIndex ?? 0,
      },
    });
  }, []);

  const attachPeerHandlers = useCallback(
    (pc) => {
      pc.onicecandidate = (event) => {
        if (!event.candidate || !callIdRef.current) return;
        postIceCandidate(callIdRef.current, event.candidate).catch(() => {});
      };

      pc.ontrack = (event) => {
        const remote = event.streams?.[0] || new MediaStream([event.track]);
        setRemoteStream(remote);
        setCallPhase((phase) => (phase === "connecting" || phase === "outgoing" ? "active" : phase));
      };

      pc.onconnectionstatechange = () => {
        const state = pc.connectionState;
        if (state === "connected") {
          setCallPhase("active");
        } else if (state === "failed") {
          setCallError("Call connection failed. Check your network and try again.");
          setCallPhase("ended");
          stopPolling();
        }
      };
    },
    [postIceCandidate, stopPolling]
  );

  const flushPendingRemoteCandidates = useCallback(async () => {
    const pc = pcRef.current;
    if (!pc || !remoteDescriptionSetRef.current) return;

    const pending = pendingRemoteCandidatesRef.current.splice(0);
    for (const candidate of pending) {
      try {
        await pc.addIceCandidate(candidate);
      } catch {
        // Ignore candidates that arrive out of order.
      }
    }
  }, []);

  const setRemoteDescription = useCallback(
    async (description) => {
      const pc = pcRef.current;
      if (!pc) return;
      await pc.setRemoteDescription(description);
      remoteDescriptionSetRef.current = true;
      await flushPendingRemoteCandidates();
    },
    [flushPendingRemoteCandidates]
  );

  const ingestCandidates = useCallback(async () => {
    const pc = pcRef.current;
    if (!callIdRef.current || !pc) return;

    const res = await api.get(`/chats/calls/${callIdRef.current}/candidates`, {
      params: { since_id: candidateSinceRef.current, _ts: Date.now() },
      headers: { "Cache-Control": "no-cache" },
    });

    for (const item of res.data.candidates || []) {
      candidateSinceRef.current = Math.max(candidateSinceRef.current, item.id);
      if (!item.candidate) continue;

      const ice = new RTCIceCandidate({
        candidate: item.candidate,
        sdpMid: item.sdp_mid || undefined,
        sdpMLineIndex: item.sdp_m_line_index ?? undefined,
      });

      if (remoteDescriptionSetRef.current) {
        try {
          await pc.addIceCandidate(ice);
        } catch {
          pendingRemoteCandidatesRef.current.push(ice);
        }
      } else {
        pendingRemoteCandidatesRef.current.push(ice);
      }
    }
  }, []);

  const startPolling = useCallback(
    (callId, role) => {
      stopPolling();
      pollTimerRef.current = window.setInterval(async () => {
        try {
          await ingestCandidates();
          const res = await api.get(`/chats/calls/${callId}`, {
            params: { _ts: Date.now() },
            headers: { "Cache-Control": "no-cache" },
          });
          const call = res.data.call;
          setCallSession(call);

          if (
            role === "caller" &&
            call.status === "accepted" &&
            call.answer_sdp &&
            pcRef.current &&
            !remoteDescriptionSetRef.current
          ) {
            setCallPhase("connecting");
            await setRemoteDescription({ type: "answer", sdp: call.answer_sdp });
            setCallPhase("active");
          }

          if (["rejected", "ended", "missed"].includes(call.status)) {
            setCallPhase("ended");
            stopPolling();
          }
        } catch {
          // Ignore transient polling errors.
        }
      }, 800);
    },
    [ingestCandidates, setRemoteDescription, stopPolling]
  );

  const createPeerConnection = useCallback(
    (callId, stream) => {
      const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));
      attachPeerHandlers(pc);
      pcRef.current = pc;
      callIdRef.current = callId;
      return pc;
    },
    [attachPeerHandlers]
  );

  const startCall = useCallback(
    async (peerUserId, type = "audio") => {
      if (!peerUserId || callPhase !== "idle") return;
      setBusy(true);
      setCallError("");
      setCallType(type);
      resetPeerState();

      try {
        const stream = await getMedia(type);
        localStreamRef.current = stream;
        setLocalStream(stream);

        const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
        stream.getTracks().forEach((track) => pc.addTrack(track, stream));
        attachPeerHandlers(pc);
        pcRef.current = pc;

        const offer = await pc.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: type === "video" });
        const res = await api.post(`/chats/${peerUserId}/calls`, {
          call_type: type,
          offer: { type: offer.type, sdp: offer.sdp },
        });

        const call = res.data.call;
        callIdRef.current = call.id;
        await pc.setLocalDescription(offer);

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
    [attachPeerHandlers, callPhase, cleanupMedia, getMedia, resetPeerState, startPolling]
  );

  const acceptCall = useCallback(async () => {
    if (!callSession?.id) return;
    if (!callSession.offer_sdp) {
      setCallError("Call offer was missing. Ask the caller to try again.");
      return;
    }

    setBusy(true);
    setCallError("");
    setCallType(callSession.call_type || "audio");
    resetPeerState();

    try {
      const stream = await getMedia(callSession.call_type || "audio");
      localStreamRef.current = stream;
      setLocalStream(stream);
      const pc = createPeerConnection(callSession.id, stream);

      setCallPhase("connecting");
      await setRemoteDescription({ type: "offer", sdp: callSession.offer_sdp });
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
  }, [
    callSession,
    cleanupMedia,
    createPeerConnection,
    getMedia,
    resetPeerState,
    setRemoteDescription,
    startPolling,
  ]);

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

    const pollIncoming = async () => {
      try {
        const res = await api.get("/chats/calls/incoming", {
          params: { _ts: Date.now() },
          headers: { "Cache-Control": "no-cache" },
        });
        const calls = res.data.calls || [];
        if (calls.length > 0) {
          setCallSession(calls[0]);
          setCallType(calls[0].call_type || "audio");
          setCallPhase("incoming");
        }
      } catch {
        // Ignore polling errors.
      }
    };

    pollIncoming();
    incomingTimerRef.current = window.setInterval(pollIncoming, 1000);

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
