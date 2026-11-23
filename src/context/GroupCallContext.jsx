import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import {
  MicrophoneIcon,
  PhoneArrowDownLeftIcon,
  PhoneXMarkIcon,
  UserPlusIcon,
  UserGroupIcon,
  VideoCameraIcon,
  VideoCameraSlashIcon,
} from "@heroicons/react/24/outline";
import api, { getApiError, getStoredUser } from "../services/api";
import UserAvatar from "../components/UserAvatar";
import GroupCallPicker from "../components/GroupCallPicker";
import { AUDIO_CONSTRAINTS, getIceServers, useCall } from "./CallContext";

const GroupCallContext = createContext(null);

const SYNC_INTERVAL_MS = 700;
const INCOMING_POLL_MS = 2500;
export const GROUP_CALL_MAX = 8;

/*
 * Group calls are a mesh: every participant has one RTCPeerConnection per other participant.
 * Signaling goes through the backend mailbox (POST /group-calls/:id/signals, GET .../sync).
 * For each pair, the participant with the lower user id sends the offer, so offers never collide.
 * A participant who rejoins gets a new joined_at, which resets the peer connection for that pair.
 */

function peerKey(participant) {
  return `${participant.user_id}:${participant.joined_at || ""}`;
}

function formatCallError(err, fallback) {
  if (err?.response) return getApiError(err, fallback);
  if (err?.name === "NotAllowedError") return "Microphone access was blocked. Allow it in your browser and try again.";
  if (err?.name === "NotFoundError") return "No microphone or camera was found on this device.";
  return err?.message || fallback;
}

function RemoteAudio({ stream }) {
  const ref = useCallback(
    (audio) => {
      if (!audio) return;
      if (audio.srcObject !== stream) audio.srcObject = stream || null;
      if (stream) audio.play().catch(() => {});
    },
    [stream]
  );
  return <audio ref={ref} autoPlay playsInline className="hidden" />;
}

function VideoView({ stream, mirrored = false }) {
  const ref = useCallback(
    (video) => {
      if (!video) return;
      if (video.srcObject !== stream) video.srcObject = stream || null;
      video.play?.().catch(() => {});
    },
    [stream]
  );
  return (
    <video
      ref={ref}
      autoPlay
      playsInline
      muted
      className={`absolute inset-0 h-full w-full object-cover ${mirrored ? "-scale-x-100" : ""}`}
    />
  );
}

function hasLiveVideo(stream) {
  return Boolean(stream?.getVideoTracks().some((track) => track.readyState === "live" && track.enabled && !track.muted));
}

function Tile({ name, image, stream, state, isSelf, muted, video }) {
  const showVideo = video && hasLiveVideo(stream);
  const stateLabel =
    state === "connected"
      ? ""
      : state === "ringing"
        ? "Ringing…"
        : state === "failed"
          ? "Reconnecting…"
          : isSelf
            ? ""
            : "Connecting…";
  return (
    <div className="relative flex aspect-video min-h-28 items-center justify-center overflow-hidden rounded-xl bg-slate-800">
      {showVideo ? <VideoView stream={stream} mirrored={isSelf} /> : null}
      {!showVideo ? (
        <UserAvatar user={{ username: name, image_url: image }} className="h-14 w-14 text-lg ring-2 ring-white/20" iconClassName="h-7 w-7" />
      ) : null}
      <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 bg-gradient-to-t from-black/70 to-transparent px-3 py-2 text-xs text-white">
        <span className="truncate font-semibold">{isSelf ? `${name} (you)` : name}</span>
        <span className="flex items-center gap-1 text-white/80">
          {stateLabel ? <span>{stateLabel}</span> : null}
          {muted ? <span title="Muted">🔇</span> : null}
        </span>
      </div>
    </div>
  );
}

export function GroupCallProvider({ children }) {
  const { inCall: inDirectCall } = useCall();
  const currentUser = getStoredUser();
  const myId = currentUser?.id;

  const [phase, setPhase] = useState("idle"); // idle | starting | active | ended
  const [call, setCall] = useState(null);
  const [incoming, setIncoming] = useState([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [localStream, setLocalStream] = useState(null);
  const [remoteStreams, setRemoteStreams] = useState({}); // userId -> MediaStream
  const [peerStates, setPeerStates] = useState({}); // userId -> connection state
  const [muted, setMuted] = useState(false);
  const [cameraOff, setCameraOff] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);

  const callIdRef = useRef("");
  const cursorRef = useRef(0);
  const peersRef = useRef(new Map()); // userId -> { pc, key, pending: [], remoteSet }
  const localStreamRef = useRef(null);
  const iceServersRef = useRef(null);
  const syncTimerRef = useRef(null);
  const syncingRef = useRef(false);

  const sendSignal = useCallback(async (toUserId, kind, payload) => {
    const callId = callIdRef.current;
    if (!callId) return;
    await api.post(`/group-calls/${callId}/signals`, {
      to_user_id: toUserId,
      kind,
      payload: JSON.stringify(payload),
    });
  }, []);

  const closePeer = useCallback((userId) => {
    const peer = peersRef.current.get(userId);
    if (!peer) return;
    peer.pc.onicecandidate = null;
    peer.pc.ontrack = null;
    peer.pc.onconnectionstatechange = null;
    peer.pc.close();
    peersRef.current.delete(userId);
    setRemoteStreams((current) => {
      const next = { ...current };
      delete next[userId];
      return next;
    });
    setPeerStates((current) => {
      const next = { ...current };
      delete next[userId];
      return next;
    });
  }, []);

  const createPeer = useCallback(
    (participant) => {
      const userId = participant.user_id;
      const pc = new RTCPeerConnection({ iceServers: iceServersRef.current || [] });
      const peer = { pc, key: peerKey(participant), pending: [], remoteSet: false };
      localStreamRef.current?.getTracks().forEach((track) => pc.addTrack(track, localStreamRef.current));

      pc.onicecandidate = (event) => {
        if (event.candidate) sendSignal(userId, "candidate", event.candidate.toJSON()).catch(() => {});
      };
      pc.ontrack = (event) => {
        const stream = event.streams?.[0] || new MediaStream([event.track]);
        setRemoteStreams((current) => ({ ...current, [userId]: stream }));
      };
      pc.onconnectionstatechange = () => {
        setPeerStates((current) => ({ ...current, [userId]: pc.connectionState }));
        if (pc.connectionState === "failed") {
          // Drop it; the next sync recreates the pair and the lower id re-offers.
          closePeer(userId);
        }
      };
      peersRef.current.set(userId, peer);
      setPeerStates((current) => ({ ...current, [userId]: "connecting" }));
      return peer;
    },
    [closePeer, sendSignal]
  );

  const makeOffer = useCallback(
    async (userId, peer) => {
      const offer = await peer.pc.createOffer();
      await peer.pc.setLocalDescription(offer);
      await sendSignal(userId, "offer", { type: offer.type, sdp: offer.sdp });
    },
    [sendSignal]
  );

  const flushCandidates = async (peer) => {
    const pending = peer.pending.splice(0);
    for (const candidate of pending) {
      try {
        await peer.pc.addIceCandidate(candidate);
      } catch {
        // stale candidate
      }
    }
  };

  const reconcilePeers = useCallback(
    async (nextCall) => {
      const joinedOthers = (nextCall.participants || []).filter(
        (p) => p.status === "joined" && p.user_id !== myId
      );
      const wanted = new Map(joinedOthers.map((p) => [p.user_id, p]));

      for (const [userId, peer] of peersRef.current) {
        const participant = wanted.get(userId);
        if (!participant || peer.key !== peerKey(participant)) closePeer(userId);
      }
      for (const participant of joinedOthers) {
        if (peersRef.current.has(participant.user_id)) continue;
        const peer = createPeer(participant);
        if (myId < participant.user_id) {
          try {
            await makeOffer(participant.user_id, peer);
          } catch {
            closePeer(participant.user_id);
          }
        }
      }
    },
    [closePeer, createPeer, makeOffer, myId]
  );

  const handleSignal = useCallback(
    async (signal, participantsById) => {
      const from = signal.from_user_id;
      let payload;
      try {
        payload = JSON.parse(signal.payload);
      } catch {
        return;
      }
      let peer = peersRef.current.get(from);

      if (signal.kind === "offer") {
        const participant = participantsById.get(from);
        if (!participant || participant.status !== "joined") return;
        if (peer && (peer.remoteSet || peer.pc.signalingState !== "stable")) {
          closePeer(from); // the other side restarted
          peer = null;
        }
        if (!peer) peer = createPeer(participant);
        await peer.pc.setRemoteDescription(payload);
        peer.remoteSet = true;
        await flushCandidates(peer);
        const answer = await peer.pc.createAnswer();
        await peer.pc.setLocalDescription(answer);
        await sendSignal(from, "answer", { type: answer.type, sdp: answer.sdp });
      } else if (signal.kind === "answer") {
        if (!peer || peer.pc.signalingState !== "have-local-offer") return;
        await peer.pc.setRemoteDescription(payload);
        peer.remoteSet = true;
        await flushCandidates(peer);
      } else if (signal.kind === "candidate") {
        if (!peer) return;
        const candidate = new RTCIceCandidate(payload);
        if (peer.remoteSet) {
          try {
            await peer.pc.addIceCandidate(candidate);
          } catch {
            peer.pending.push(candidate);
          }
        } else {
          peer.pending.push(candidate);
        }
      }
    },
    [closePeer, createPeer, sendSignal]
  );

  const teardown = useCallback(() => {
    window.clearTimeout(syncTimerRef.current);
    syncTimerRef.current = null;
    for (const userId of [...peersRef.current.keys()]) closePeer(userId);
    localStreamRef.current?.getTracks().forEach((track) => track.stop());
    localStreamRef.current = null;
    setLocalStream(null);
    setRemoteStreams({});
    setPeerStates({});
    callIdRef.current = "";
    cursorRef.current = 0;
    setMuted(false);
    setCameraOff(false);
    setPickerOpen(false);
  }, [closePeer]);

  const sync = useCallback(async () => {
    const callId = callIdRef.current;
    if (!callId || syncingRef.current) return;
    syncingRef.current = true;
    try {
      const res = await api.get(`/group-calls/${callId}/sync`, {
        params: { since_id: cursorRef.current, _ts: Date.now() },
        headers: { "Cache-Control": "no-cache" },
      });
      if (callIdRef.current !== callId) return;
      const nextCall = res.data.call;
      setCall(nextCall);
      const me = nextCall.participants?.find((p) => p.user_id === myId);
      if (nextCall.status !== "active" || !me || me.status !== "joined") {
        teardown();
        setPhase("ended");
        return;
      }
      await reconcilePeers(nextCall);
      const participantsById = new Map((nextCall.participants || []).map((p) => [p.user_id, p]));
      for (const signal of res.data.signals || []) {
        cursorRef.current = Math.max(cursorRef.current, signal.id);
        try {
          await handleSignal(signal, participantsById);
        } catch {
          // A broken pair is rebuilt on a later sync.
        }
      }
    } catch (err) {
      if (err?.response?.status === 404 || err?.response?.status === 410) {
        teardown();
        setPhase("ended");
      }
    } finally {
      syncingRef.current = false;
      if (callIdRef.current === callId) {
        syncTimerRef.current = window.setTimeout(sync, SYNC_INTERVAL_MS);
      }
    }
  }, [handleSignal, myId, reconcilePeers, teardown]);

  const prepareMedia = useCallback(async (callType) => {
    if (!navigator.mediaDevices?.getUserMedia) throw new Error("This browser does not support calls.");
    const [stream, iceServers] = await Promise.all([
      navigator.mediaDevices.getUserMedia({
        audio: AUDIO_CONSTRAINTS,
        video: callType === "video" ? { facingMode: "user", width: { ideal: 640 }, height: { ideal: 360 } } : false,
      }),
      getIceServers(),
    ]);
    localStreamRef.current = stream;
    iceServersRef.current = iceServers;
    setLocalStream(stream);
    return stream;
  }, []);

  const enterCall = useCallback(
    (nextCall, cursor) => {
      callIdRef.current = nextCall.id;
      cursorRef.current = cursor || 0;
      setCall(nextCall);
      setPhase("active");
      sync();
    },
    [sync]
  );

  const startGroupCall = useCallback(
    async (userIds, callType = "audio") => {
      if (phase === "active" || inDirectCall) return;
      setBusy(true);
      setError("");
      setPhase("starting");
      try {
        await prepareMedia(callType);
        const res = await api.post("/group-calls", { user_ids: userIds, call_type: callType });
        enterCall(res.data.call, res.data.signal_cursor);
      } catch (err) {
        teardown();
        setError(formatCallError(err, "Could not start the group call."));
        setPhase("ended");
      } finally {
        setBusy(false);
      }
    },
    [enterCall, inDirectCall, phase, prepareMedia, teardown]
  );

  const acceptGroupCall = useCallback(
    async (invite) => {
      if (phase === "active") return;
      setBusy(true);
      setError("");
      setIncoming((items) => items.filter((item) => item.id !== invite.id));
      setPhase("starting");
      try {
        await prepareMedia(invite.call_type);
        const res = await api.post(`/group-calls/${invite.id}/join`);
        enterCall(res.data.call, res.data.signal_cursor);
      } catch (err) {
        teardown();
        setError(formatCallError(err, "Could not join the group call."));
        setPhase("ended");
      } finally {
        setBusy(false);
      }
    },
    [enterCall, phase, prepareMedia, teardown]
  );

  const declineGroupCall = useCallback(async (invite) => {
    setIncoming((items) => items.filter((item) => item.id !== invite.id));
    try {
      await api.post(`/group-calls/${invite.id}/decline`);
    } catch {
      // ignore
    }
  }, []);

  const leaveGroupCall = useCallback(async () => {
    const callId = callIdRef.current;
    teardown();
    setPhase("idle");
    setCall(null);
    setError("");
    if (callId) {
      try {
        await api.post(`/group-calls/${callId}/leave`);
      } catch {
        // the server drops us after the heartbeat stops anyway
      }
    }
  }, [teardown]);

  const inviteToGroupCall = useCallback(async (userIds) => {
    const callId = callIdRef.current;
    if (!callId || !userIds.length) return;
    try {
      const res = await api.post(`/group-calls/${callId}/invite`, { user_ids: userIds });
      setCall(res.data.call);
      setPickerOpen(false);
    } catch (err) {
      setError(getApiError(err, "Could not add people to the call."));
    }
  }, []);

  const toggleMute = useCallback(() => {
    const next = !muted;
    localStreamRef.current?.getAudioTracks().forEach((track) => {
      track.enabled = !next;
    });
    setMuted(next);
  }, [muted]);

  const toggleCamera = useCallback(() => {
    const next = !cameraOff;
    localStreamRef.current?.getVideoTracks().forEach((track) => {
      track.enabled = !next;
    });
    setCameraOff(next);
  }, [cameraOff]);

  // Ring for incoming group calls while idle.
  useEffect(() => {
    if (phase === "active" || phase === "starting") return undefined;
    let stopped = false;
    const poll = async () => {
      if (!localStorage.getItem("token")) return;
      try {
        const res = await api.get("/group-calls/incoming", { params: { _ts: Date.now() } });
        if (!stopped) setIncoming(res.data.calls || []);
      } catch {
        // ignore transient errors
      }
    };
    poll();
    const timer = window.setInterval(poll, INCOMING_POLL_MS);
    return () => {
      stopped = true;
      window.clearInterval(timer);
    };
  }, [phase]);

  // Leave cleanly when the tab closes.
  useEffect(() => {
    const onUnload = () => {
      const callId = callIdRef.current;
      const token = localStorage.getItem("token");
      if (!callId || !token) return;
      try {
        fetch(`${api.defaults.baseURL}/group-calls/${callId}/leave`, {
          method: "POST",
          keepalive: true,
          headers: { Authorization: `Bearer ${token}` },
        });
      } catch {
        // best effort
      }
    };
    window.addEventListener("pagehide", onUnload);
    return () => window.removeEventListener("pagehide", onUnload);
  }, []);

  useEffect(() => () => teardown(), [teardown]);

  const value = {
    groupCall: call,
    groupPhase: phase,
    inGroupCall: phase === "active" || phase === "starting",
    groupBusy: busy,
    incomingGroupCalls: incoming,
    startGroupCall,
    acceptGroupCall,
    declineGroupCall,
    leaveGroupCall,
    inviteToGroupCall,
  };

  const invite = phase !== "active" && phase !== "starting" ? incoming[0] : null;
  const isVideo = call?.call_type === "video";
  const others = (call?.participants || []).filter(
    (p) => p.user_id !== myId && (p.status === "joined" || p.status === "invited")
  );
  const takenIds = (call?.participants || [])
    .filter((p) => p.status === "joined" || p.status === "invited")
    .map((p) => p.user_id);

  return (
    <GroupCallContext.Provider value={value}>
      {children}

      {invite ? (
        <div className="fixed inset-x-4 top-4 z-[110] mx-auto max-w-md rounded-2xl border border-emerald-400 bg-gradient-to-b from-emerald-950 to-slate-950 p-5 text-white shadow-2xl">
          <div className="flex items-center gap-3">
            <span className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-emerald-500/20">
              <span className="absolute inset-0 animate-ping rounded-full bg-emerald-400/30" />
              <UserGroupIcon className="h-6 w-6 text-emerald-300" />
            </span>
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-300">
                Incoming group {invite.call_type === "video" ? "video" : "voice"} call
              </p>
              <p className="truncate text-lg font-bold">{invite.host_username}</p>
              <p className="truncate text-sm text-slate-300">
                with{" "}
                {invite.participants
                  .filter((p) => p.user_id !== myId && p.user_id !== invite.host_id)
                  .map((p) => p.username)
                  .join(", ") || "you"}
              </p>
            </div>
          </div>
          {inDirectCall ? (
            <p className="mt-3 text-sm text-amber-200">End your current call to join.</p>
          ) : null}
          <div className="mt-4 flex justify-end gap-2">
            <button type="button" onClick={() => declineGroupCall(invite)} className="btn btn-danger inline-flex items-center gap-2">
              <PhoneXMarkIcon className="h-5 w-5" /> Decline
            </button>
            <button
              type="button"
              onClick={() => acceptGroupCall(invite)}
              disabled={busy || inDirectCall}
              className="btn btn-primary inline-flex items-center gap-2 disabled:opacity-50"
            >
              <PhoneArrowDownLeftIcon className="h-5 w-5" /> Join
            </button>
          </div>
        </div>
      ) : null}

      {phase === "starting" || phase === "active" || (phase === "ended" && error) ? (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/90 p-4 backdrop-blur-md">
          <div className="flex max-h-full w-full max-w-4xl flex-col overflow-hidden rounded-3xl border border-slate-700 bg-slate-950 text-white shadow-2xl">
            <div className="flex items-center justify-between gap-3 border-b border-slate-800 px-5 py-4">
              <div className="min-w-0">
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">
                  Group {isVideo ? "video" : "voice"} call
                </p>
                <p className="truncate text-lg font-bold">
                  {phase === "starting"
                    ? "Starting…"
                    : `${(call?.participants || []).filter((p) => p.status === "joined").length} in call`}
                </p>
              </div>
              {phase === "active" ? (
                <button
                  type="button"
                  onClick={() => setPickerOpen(true)}
                  disabled={takenIds.length >= GROUP_CALL_MAX}
                  className="btn btn-secondary inline-flex items-center gap-2 disabled:opacity-50"
                >
                  <UserPlusIcon className="h-5 w-5" /> <span className="hidden sm:inline">Add people</span>
                </button>
              ) : null}
            </div>

            <div className="grid flex-1 grid-cols-1 gap-3 overflow-y-auto p-4 sm:grid-cols-2 lg:grid-cols-3">
              <Tile
                name={currentUser?.username || "You"}
                image={currentUser?.image_url}
                stream={localStream}
                state="connected"
                isSelf
                muted={muted}
                video={isVideo && !cameraOff}
              />
              {others.map((participant) => (
                <Tile
                  key={participant.user_id}
                  name={participant.username}
                  image={participant.image_url}
                  stream={remoteStreams[participant.user_id]}
                  state={participant.status === "invited" ? "ringing" : peerStates[participant.user_id]}
                  video={isVideo}
                />
              ))}
            </div>

            {Object.entries(remoteStreams).map(([userId, stream]) => (
              <RemoteAudio key={userId} stream={stream} />
            ))}

            {error ? (
              <div className="border-t border-rose-500/30 bg-rose-950/40 px-6 py-3 text-sm font-medium text-rose-200">{error}</div>
            ) : null}

            <div className="flex flex-wrap items-center justify-center gap-3 border-t border-slate-800 px-6 py-4">
              {phase === "ended" ? (
                <button
                  type="button"
                  onClick={() => {
                    setError("");
                    setPhase("idle");
                    setCall(null);
                  }}
                  className="btn btn-secondary"
                >
                  Close
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={toggleMute}
                    className={`btn inline-flex items-center gap-2 ${muted ? "btn-danger" : "btn-secondary"}`}
                    aria-pressed={muted}
                  >
                    <MicrophoneIcon className="h-5 w-5" /> {muted ? "Unmute" : "Mute"}
                  </button>
                  {isVideo ? (
                    <button
                      type="button"
                      onClick={toggleCamera}
                      className={`btn inline-flex items-center gap-2 ${cameraOff ? "btn-danger" : "btn-secondary"}`}
                      aria-pressed={cameraOff}
                    >
                      {cameraOff ? <VideoCameraSlashIcon className="h-5 w-5" /> : <VideoCameraIcon className="h-5 w-5" />}
                      {cameraOff ? "Camera on" : "Camera off"}
                    </button>
                  ) : null}
                  <button type="button" onClick={leaveGroupCall} className="btn btn-danger inline-flex items-center gap-2">
                    <PhoneXMarkIcon className="h-5 w-5" /> Leave
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      ) : null}

      {pickerOpen ? (
        <GroupCallPicker
          title="Add people to the call"
          confirmLabel="Ring them"
          excludeIds={takenIds}
          maxSelectable={GROUP_CALL_MAX - takenIds.length}
          onConfirm={(ids) => inviteToGroupCall(ids)}
          onClose={() => setPickerOpen(false)}
        />
      ) : null}
    </GroupCallContext.Provider>
  );
}

export function useGroupCall() {
  const context = useContext(GroupCallContext);
  if (!context) throw new Error("useGroupCall must be used inside GroupCallProvider");
  return context;
}
