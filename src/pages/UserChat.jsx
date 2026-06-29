import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowPathIcon,
  ChatBubbleLeftRightIcon,
  MicrophoneIcon,
  PaperAirplaneIcon,
  PhoneIcon,
  PhotoIcon,
  StopIcon,
  UserIcon,
  VideoCameraIcon,
} from "@heroicons/react/24/outline";
import DashboardLayout from "../components/DashboardLayout";
import UserAvatar from "../components/UserAvatar";
import { useCall } from "../context/CallContext";
import api, { getApiError, getStoredUser } from "../services/api";
import { resolveImageUrl } from "../utils/assets";
import { formatDate, titleize } from "../utils/formatters";

function conversationKey(user) {
  return user?.user_id ?? user?.id;
}

function messagePreview(message) {
  if (message.message_type === "image") return message.message || "Photo";
  if (message.message_type === "voice") return message.message || "Voice note";
  return message.message;
}

function ChatMessageBubble({ message, ownMessage, currentUser }) {
  const sender = { username: message.sender_username };
  const attachmentUrl = resolveImageUrl(message.attachment_url);

  return (
    <div className={`flex items-end gap-3 ${ownMessage ? "justify-end" : "justify-start"}`}>
      {!ownMessage && <UserAvatar user={sender} className="h-9 w-9" iconClassName="h-5 w-5" />}
      <div
        className={`max-w-[82%] rounded-lg px-4 py-3 ${
          ownMessage ? "bg-primary text-white" : "bg-slate-100 text-slate-900"
        }`}
      >
        <div className="mb-1 flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="text-xs font-bold">{sender.username}</span>
        </div>

        {message.message_type === "image" && attachmentUrl ? (
          <a href={attachmentUrl} target="_blank" rel="noreferrer" className="block">
            <img
              src={attachmentUrl}
              alt={message.message || "Shared image"}
              className="max-h-72 w-full rounded-md object-cover"
            />
          </a>
        ) : null}

        {message.message_type === "voice" && attachmentUrl ? (
          <audio controls preload="metadata" className="w-full max-w-sm">
            <source src={attachmentUrl} type={message.attachment_mime || "audio/webm"} />
          </audio>
        ) : null}

        {message.message ? (
          <p className="whitespace-pre-wrap break-words text-sm">{message.message}</p>
        ) : null}

        <p className={`mt-2 text-[11px] ${ownMessage ? "text-white/75" : "text-slate-500"}`}>
          {formatDate(message.created_at)}
        </p>
      </div>
      {ownMessage ? <UserAvatar user={currentUser} className="h-9 w-9" iconClassName="h-5 w-5" /> : null}
    </div>
  );
}

export default function UserChat() {
  const [conversations, setConversations] = useState([]);
  const [users, setUsers] = useState([]);
  const [activeUser, setActiveUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState("");
  const [loadingSidebar, setLoadingSidebar] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [recording, setRecording] = useState(false);
  const [error, setError] = useState("");
  const [chatError, setChatError] = useState("");
  const currentUser = getStoredUser();
  const {
    startCall,
    inCall,
    busy: callBusy,
    callPhase,
    callSession,
    callType,
    acceptCall,
    rejectCall,
    endCall,
  } = useCall();
  const messagesEndRef = useRef(null);
  const imageInputRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const voiceChunksRef = useRef([]);

  const orderedMessages = useMemo(() => [...messages].reverse(), [messages]);

  const activeUserID = conversationKey(activeUser);

  const callPeerId = useMemo(() => {
    if (!callSession) return null;
    return callSession.caller_id === currentUser?.id ? callSession.callee_id : callSession.caller_id;
  }, [callSession, currentUser?.id]);

  const callWithActiveUser = Boolean(activeUserID && callPeerId === activeUserID);
  const showCallPanel = inCall && callPhase !== "ended" && (callWithActiveUser || callPhase === "incoming");

  const callStatusLabel = useMemo(() => {
    if (!callSession || callPhase === "idle" || callPhase === "ended") return "";
    const peerName =
      callSession.caller_id === currentUser?.id ? callSession.callee_username : callSession.caller_username;
    const kind = callType === "video" ? "Video" : "Voice";
    if (callPhase === "incoming") return `Incoming ${kind.toLowerCase()} call from ${peerName}`;
    if (callPhase === "outgoing") return `Calling ${peerName}...`;
    if (callPhase === "connecting") return `Connecting to ${peerName}...`;
    if (callPhase === "active") return `${kind} call with ${peerName}`;
    return "";
  }, [callPhase, callSession, callType, currentUser?.id]);

  const otherUsers = useMemo(() => {
    const conversationIDs = new Set(conversations.map((item) => item.user_id));
    return users.filter((user) => !conversationIDs.has(user.id));
  }, [conversations, users]);

  useEffect(() => {
    if (callPhase !== "incoming" || !callSession?.caller_id) return;
    const callerId = callSession.caller_id;
    setActiveUser((current) => {
      if (conversationKey(current) === callerId) return current;
      const fromConversations = conversations.find((item) => item.user_id === callerId);
      if (fromConversations) return fromConversations;
      const fromUsers = users.find((item) => item.id === callerId);
      return fromUsers || current;
    });
  }, [callPhase, callSession, conversations, users]);

  const loadSidebar = useCallback(async () => {
    setLoadingSidebar(true);
    setError("");

    try {
      const [conversationsRes, usersRes] = await Promise.all([
        api.get("/chats"),
        api.get("/users"),
      ]);
      const loadedConversations = conversationsRes.data.conversations || [];
      const loadedUsers = usersRes.data.users || [];
      setConversations(loadedConversations);
      setUsers(loadedUsers);
      setActiveUser((current) => {
        const currentID = conversationKey(current);
        if (!currentID) return current;
        const fromConversations = loadedConversations.find((item) => item.user_id === currentID);
        if (fromConversations) return fromConversations;
        const fromUsers = loadedUsers.find((item) => item.id === currentID);
        return fromUsers || current;
      });
    } catch (err) {
      setError(getApiError(err, "Failed to load chats."));
    } finally {
      setLoadingSidebar(false);
    }
  }, []);

  const loadMessages = useCallback(
    async (userID = activeUserID, options = {}) => {
      if (!userID) return;
      if (!options.silent) setLoadingMessages(true);
      setChatError("");

      try {
        const res = await api.get(`/chats/${userID}/messages`, { params: { limit: 100 } });
        setMessages(res.data.messages || []);
      } catch (err) {
        setMessages([]);
        setChatError(getApiError(err, "Failed to load messages."));
      } finally {
        setLoadingMessages(false);
      }
    },
    [activeUserID]
  );

  useEffect(() => {
    loadSidebar();
  }, [loadSidebar]);

  useEffect(() => {
    if (activeUserID) {
      loadMessages(activeUserID);
    } else {
      setMessages([]);
    }
  }, [activeUserID, loadMessages]);

  useEffect(() => {
    if (!activeUserID) return undefined;

    const timer = window.setInterval(() => {
      loadMessages(activeUserID, { silent: true });
      loadSidebar();
    }, 5000);

    return () => window.clearInterval(timer);
  }, [activeUserID, loadMessages, loadSidebar]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [orderedMessages.length, activeUserID]);

  useEffect(() => {
    return () => {
      mediaRecorderRef.current?.stream?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  const appendMessage = (message) => {
    setMessages((items) => [message, ...items]);
    setConversations((items) => {
      const otherID = message.sender_id === currentUser?.id ? message.receiver_id : message.sender_id;
      const otherName =
        message.sender_id === currentUser?.id ? message.receiver_username : message.sender_username;
      const preview = messagePreview(message);
      const existing = items.find((item) => item.user_id === otherID);
      const updated = {
        user_id: otherID,
        username: otherName,
        email: existing?.email || "",
        role: existing?.role || "",
        latest_message: preview,
        latest_message_at: message.created_at,
        unread_count: existing?.unread_count || 0,
      };
      const rest = items.filter((item) => item.user_id !== otherID);
      return [updated, ...rest];
    });
  };

  const sendTextMessage = async (event) => {
    event.preventDefault();
    if (!activeUserID || !draft.trim() || sending) return;

    const body = draft.trim();
    setSending(true);
    setChatError("");

    try {
      const res = await api.post(`/chats/${activeUserID}/messages`, { message: body });
      appendMessage(res.data.message);
      setDraft("");
    } catch (err) {
      setChatError(getApiError(err, "Failed to send message."));
    } finally {
      setSending(false);
    }
  };

  const sendAttachment = async (file, messageType, caption = "") => {
    if (!activeUserID || sending) return;

    const formData = new FormData();
    formData.append("message_type", messageType);
    formData.append("file", file);
    if (caption.trim()) {
      formData.append("message", caption.trim());
    }

    setSending(true);
    setChatError("");

    try {
      const res = await api.post(`/chats/${activeUserID}/messages`, formData);
      appendMessage(res.data.message);
    } catch (err) {
      setChatError(getApiError(err, "Failed to send attachment."));
    } finally {
      setSending(false);
    }
  };

  const handleImageSelect = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    await sendAttachment(file, "image");
  };

  const stopRecording = () => {
    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state === "inactive") return;
    recorder.stop();
    setRecording(false);
  };

  const startRecording = async () => {
    if (!activeUserID || sending || recording) return;
    setChatError("");

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const preferredTypes = ["audio/webm;codecs=opus", "audio/webm", "audio/ogg;codecs=opus"];
      const mimeType = preferredTypes.find((type) => MediaRecorder.isTypeSupported(type)) || "";
      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      voiceChunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          voiceChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());
        const blobType = recorder.mimeType || "audio/webm";
        const blob = new Blob(voiceChunksRef.current, { type: blobType });
        voiceChunksRef.current = [];
        if (!blob.size) return;

        const extension = blobType.includes("ogg") ? ".ogg" : ".webm";
        const file = new File([blob], `voice-note${extension}`, { type: blobType });
        await sendAttachment(file, "voice");
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
      setRecording(true);
    } catch (err) {
      setChatError(getApiError(err, "Microphone access is required to record voice notes."));
    }
  };

  const selectUser = (user) => {
    setActiveUser(user);
    setChatError("");
  };

  const activeDisplayName = activeUser?.username || activeUser?.email || "User";
  const activeRole = activeUser?.role ? titleize(activeUser.role) : "";

  return (
    <DashboardLayout>
      <div className="mx-auto grid max-w-7xl gap-6 xl:grid-cols-[22rem_1fr]">
        <section className="card h-fit">
          <div className="mb-5 flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-slate-900 text-white">
                <ChatBubbleLeftRightIcon className="h-6 w-6" />
              </div>
              <div className="min-w-0">
                <h1 className="truncate text-xl font-bold text-slate-950">Direct Chat</h1>
                <p className="text-sm text-slate-500">{conversations.length} conversations</p>
              </div>
            </div>
            <button
              type="button"
              onClick={loadSidebar}
              className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 hover:text-slate-950"
              aria-label="Refresh chats"
            >
              <ArrowPathIcon className={`h-5 w-5 ${loadingSidebar ? "animate-spin" : ""}`} />
            </button>
          </div>

          {error ? (
            <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm font-medium text-rose-800">
              {error}
            </div>
          ) : null}

          <div className="space-y-6">
            <div>
              <p className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-500">Recent</p>
              <div className="space-y-2">
                {conversations.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm font-medium text-slate-500">
                    {loadingSidebar ? "Loading conversations..." : "No conversations yet"}
                  </div>
                ) : (
                  conversations.map((conversation) => {
                    const isRinging =
                      callPhase === "incoming" && conversation.user_id === callSession?.caller_id;
                    const isOnCall =
                      callPeerId === conversation.user_id &&
                      ["outgoing", "connecting", "active"].includes(callPhase);

                    return (
                    <button
                      key={conversation.user_id}
                      type="button"
                      onClick={() => selectUser(conversation)}
                      className={`w-full rounded-lg border p-4 text-left transition ${
                        activeUserID === conversation.user_id
                          ? "border-primary bg-primary/5"
                          : isRinging
                            ? "border-emerald-400 bg-emerald-50 ring-2 ring-emerald-300"
                            : isOnCall
                              ? "border-sky-400 bg-sky-50"
                              : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="truncate font-bold text-slate-950">{conversation.username}</p>
                            {isRinging ? (
                              <span className="inline-flex animate-pulse rounded-full bg-emerald-500 px-2 py-0.5 text-[10px] font-bold uppercase text-white">
                                Ringing
                              </span>
                            ) : null}
                            {isOnCall ? (
                              <span className="inline-flex rounded-full bg-sky-500 px-2 py-0.5 text-[10px] font-bold uppercase text-white">
                                On call
                              </span>
                            ) : null}
                          </div>
                          <p className="mt-1 line-clamp-2 text-sm text-slate-500">
                            {conversation.latest_message || "Start chatting"}
                          </p>
                        </div>
                        {conversation.unread_count > 0 ? (
                          <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-primary px-2 text-xs font-bold text-white">
                            {conversation.unread_count}
                          </span>
                        ) : null}
                      </div>
                    </button>
                    );
                  })
                )}
              </div>
            </div>

            <div>
              <p className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-500">Start new chat</p>
              <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
                {otherUsers.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm font-medium text-slate-500">
                    {loadingSidebar ? "Loading users..." : "No other users available"}
                  </div>
                ) : (
                  otherUsers.map((user) => (
                    <button
                      key={user.id}
                      type="button"
                      onClick={() => selectUser(user)}
                      className={`flex w-full items-center gap-3 rounded-lg border p-3 text-left transition ${
                        activeUserID === user.id
                          ? "border-primary bg-primary/5"
                          : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                      }`}
                    >
                      <UserAvatar user={user} className="h-9 w-9" iconClassName="h-5 w-5" />
                      <div className="min-w-0">
                        <p className="truncate font-bold text-slate-950">{user.username}</p>
                        <p className="truncate text-sm text-slate-500">{user.email}</p>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>
        </section>

        <section className="card flex min-h-[calc(100vh-8.5rem)] flex-col overflow-hidden">
          {activeUser ? (
            <>
              <div className="mb-5 flex flex-wrap items-start justify-between gap-3 border-b border-slate-200 pb-4">
                <div className="flex min-w-0 items-center gap-3">
                  <UserAvatar user={activeUser} className="h-11 w-11" iconClassName="h-6 w-6" />
                  <div className="min-w-0">
                    <h2 className="truncate text-xl font-bold text-slate-950">{activeDisplayName}</h2>
                    <p className="text-sm text-slate-500">
                      {activeRole ? `${activeRole} · ` : ""}
                      Private conversation
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => startCall(activeUserID, "audio")}
                    disabled={inCall || callBusy}
                    className="btn btn-secondary inline-flex items-center gap-2 disabled:cursor-not-allowed disabled:opacity-50"
                    aria-label="Start voice call"
                  >
                    <PhoneIcon className="h-5 w-5" />
                    <span className="hidden sm:inline">Call</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => startCall(activeUserID, "video")}
                    disabled={inCall || callBusy}
                    className="btn btn-secondary inline-flex items-center gap-2 disabled:cursor-not-allowed disabled:opacity-50"
                    aria-label="Start video call"
                  >
                    <VideoCameraIcon className="h-5 w-5" />
                    <span className="hidden sm:inline">Video</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => loadMessages(activeUserID)}
                    className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 hover:text-slate-950"
                    aria-label="Refresh messages"
                  >
                    <ArrowPathIcon className={`h-5 w-5 ${loadingMessages ? "animate-spin" : ""}`} />
                  </button>
                </div>
              </div>

              {showCallPanel && callStatusLabel ? (
                <div
                  className={`mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border px-4 py-3 ${
                    callPhase === "incoming"
                      ? "border-emerald-300 bg-emerald-50 text-emerald-950"
                      : "border-sky-300 bg-sky-50 text-sky-950"
                  }`}
                >
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="relative flex h-2.5 w-2.5 shrink-0">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-current opacity-60" />
                      <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-current" />
                    </span>
                    <p className="text-sm font-bold">{callStatusLabel}</p>
                  </div>
                  {callPhase === "incoming" ? (
                    <div className="flex gap-2">
                      <button type="button" onClick={rejectCall} className="btn btn-secondary px-3 py-1.5 text-sm">
                        Decline
                      </button>
                      <button type="button" onClick={acceptCall} className="btn btn-primary px-3 py-1.5 text-sm">
                        Accept
                      </button>
                    </div>
                  ) : (
                    <button type="button" onClick={endCall} className="btn btn-danger px-3 py-1.5 text-sm">
                      {callPhase === "outgoing" ? "Cancel call" : "End call"}
                    </button>
                  )}
                </div>
              ) : null}

              {chatError ? (
                <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm font-medium text-amber-900">
                  {chatError}
                </div>
              ) : null}

              <div className="flex-1 space-y-4 overflow-y-auto pr-1">
                {orderedMessages.length === 0 ? (
                  <div className="flex h-full min-h-64 items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm font-medium text-slate-500">
                    {loadingMessages ? "Loading messages..." : "No messages yet. Say hello."}
                  </div>
                ) : (
                  orderedMessages.map((message) => (
                    <ChatMessageBubble
                      key={message.id}
                      message={message}
                      ownMessage={message.sender_id === currentUser?.id}
                      currentUser={currentUser}
                    />
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>

              <form onSubmit={sendTextMessage} className="mt-5 border-t border-slate-200 pt-4">
                <div className="flex gap-2">
                  <input
                    ref={imageInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={handleImageSelect}
                  />
                  <button
                    type="button"
                    onClick={() => imageInputRef.current?.click()}
                    disabled={sending || recording}
                    className="btn btn-secondary inline-flex items-center justify-center px-3 disabled:cursor-not-allowed disabled:opacity-50"
                    aria-label="Send image"
                  >
                    <PhotoIcon className="h-5 w-5" />
                  </button>
                  <button
                    type="button"
                    onClick={recording ? stopRecording : startRecording}
                    disabled={sending}
                    className={`btn inline-flex items-center justify-center px-3 disabled:cursor-not-allowed disabled:opacity-50 ${
                      recording ? "btn-danger" : "btn-secondary"
                    }`}
                    aria-label={recording ? "Stop recording" : "Record voice note"}
                  >
                    {recording ? <StopIcon className="h-5 w-5" /> : <MicrophoneIcon className="h-5 w-5" />}
                  </button>
                  <input
                    type="text"
                    value={draft}
                    onChange={(event) => setDraft(event.target.value)}
                    placeholder={`Message ${activeDisplayName}`}
                    className="input flex-1"
                    disabled={sending || recording}
                    maxLength={4000}
                  />
                  <button
                    type="submit"
                    disabled={!draft.trim() || sending || recording}
                    className="btn btn-primary inline-flex items-center gap-2 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <PaperAirplaneIcon className="h-5 w-5" />
                    <span className="hidden sm:inline">{sending ? "Sending..." : "Send"}</span>
                  </button>
                </div>
                {recording ? (
                  <p className="mt-2 text-sm font-medium text-rose-600">Recording voice note... tap stop when done.</p>
                ) : null}
              </form>
            </>
          ) : (
            <div className="flex min-h-96 flex-col items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm font-medium text-slate-500">
              <UserIcon className="mb-3 h-10 w-10 text-slate-400" />
              Select a user to start a private chat
            </div>
          )}
        </section>
      </div>
    </DashboardLayout>
  );
}
