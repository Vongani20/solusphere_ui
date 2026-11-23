import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowPathIcon,
  ChevronLeftIcon,
  ChatBubbleLeftRightIcon,
  FaceSmileIcon,
  MicrophoneIcon,
  PaperAirplaneIcon,
  PhoneIcon,
  PhotoIcon,
  StopIcon,
  UserGroupIcon,
  UserIcon,
  VideoCameraIcon,
  PhoneXMarkIcon,
} from "@heroicons/react/24/outline";
import DashboardLayout from "../components/DashboardLayout";
import { AvatarWithPresence, PresenceIndicator } from "../components/PresenceIndicator";
import UserAvatar from "../components/UserAvatar";
import EmojiPicker from "../components/EmojiPicker";
import GroupCallPicker from "../components/GroupCallPicker";
import { GROUP_CALL_MAX, useGroupCall } from "../context/GroupCallContext";
import { useCall } from "../context/CallContext";
import api, { getApiError, getStoredUser } from "../services/api";
import { resolveImageUrl } from "../utils/assets";
import { formatDate, titleize } from "../utils/formatters";
import { formatPresenceLabel } from "../utils/presence";

function conversationKey(user) {
  return user?.user_id ?? user?.id;
}

function messagePreview(message) {
  if (message.message_type === "image") return message.message || "Photo";
  if (message.message_type === "voice") return message.message || "Voice note";
  return message.message;
}

function conversationPreviewIcon(type) {
  switch (type) {
    case "voice":
      return MicrophoneIcon;
    case "image":
      return PhotoIcon;
    case "missed_call":
      return PhoneXMarkIcon;
    case "video_call":
      return VideoCameraIcon;
    case "voice_call":
      return PhoneIcon;
    default:
      return ChatBubbleLeftRightIcon;
  }
}

const EMOJI_ONLY = /^(?:\p{Extended_Pictographic}|\p{Emoji_Modifier}|‍|️|\s)+$/u;

function isEmojiOnly(text) {
  if (!text || !EMOJI_ONLY.test(text)) return false;
  const count = [...text.matchAll(/\p{Extended_Pictographic}/gu)].length;
  return count > 0 && count <= 3;
}

function groupReactions(reactions = [], currentUserId) {
  const groups = new Map();
  for (const reaction of reactions) {
    const group = groups.get(reaction.emoji) || { emoji: reaction.emoji, count: 0, names: [], mine: false };
    group.count += 1;
    group.names.push(reaction.user_id === currentUserId ? "You" : reaction.username);
    if (reaction.user_id === currentUserId) group.mine = true;
    groups.set(reaction.emoji, group);
  }
  return [...groups.values()];
}

function formatTime(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function ReadReceipt({ message, onLightBackground }) {
  if (message.read_at) {
    return (
      <span
        className={`inline-flex items-center font-semibold ${onLightBackground ? "text-sky-600" : "text-sky-200"}`}
        title={`Seen by ${message.receiver_username} · ${formatDate(message.read_at)}`}
      >
        <span aria-hidden="true" className="tracking-[-0.3em]">✓✓</span>
        <span className="ml-1.5">Seen {formatTime(message.read_at)}</span>
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1" title="Sent · not seen yet">
      <span aria-hidden="true">✓</span>
      <span>Sent</span>
    </span>
  );
}

function TypingBubble({ user }) {
  return (
    <div className="flex items-end gap-2 sm:gap-3" aria-live="polite">
      <span className="hidden shrink-0 sm:block">
        <UserAvatar user={user} className="h-9 w-9" iconClassName="h-5 w-5" />
      </span>
      <div className="rounded-2xl bg-slate-100 px-4 py-3" title={`${user?.username || "They"} is typing`}>
        <span className="sr-only">{user?.username || "They"} is typing</span>
        <span className="typing-dots" aria-hidden="true">
          <span />
          <span />
          <span />
        </span>
      </div>
    </div>
  );
}

function ChatMessageBubble({ message, ownMessage, currentUser, onReact }) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const reactButtonRef = useRef(null);
  const sender = { username: message.sender_username, image_url: message.sender_image_url };
  const attachmentUrl = resolveImageUrl(message.attachment_url);
  const emojiOnly = (message.message_type || "text") === "text" && isEmojiOnly(message.message);
  const reactionGroups = groupReactions(message.reactions, currentUser?.id);

  const react = (emoji) => {
    setPickerOpen(false);
    onReact?.(message, emoji);
  };

  return (
    <div className={`group flex items-end gap-2 sm:gap-3 ${ownMessage ? "justify-end" : "justify-start"}`}>
      {!ownMessage ? (
        <span className="hidden shrink-0 sm:block">
          <UserAvatar user={sender} className="h-9 w-9" iconClassName="h-5 w-5" />
        </span>
      ) : null}
      <div className={`flex min-w-0 max-w-[92%] items-center gap-1 sm:max-w-[82%] ${ownMessage ? "flex-row-reverse" : ""}`}>
        <div className="min-w-0">
          <div
            className={`rounded-lg ${
              emojiOnly
                ? "bg-transparent px-1 py-1"
                : ownMessage
                  ? "bg-primary px-4 py-3 text-white"
                  : "bg-slate-100 px-4 py-3 text-slate-900"
            }`}
          >
            {!emojiOnly ? (
              <div className="mb-1 flex flex-wrap items-center gap-x-2 gap-y-1">
                <span className="text-xs font-bold">{sender.username}</span>
              </div>
            ) : null}

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
              <p className={`whitespace-pre-wrap break-words ${emojiOnly ? "text-4xl leading-tight" : "text-sm"}`}>
                {message.message}
              </p>
            ) : null}

            <p
              className={`mt-2 flex flex-wrap items-center gap-x-2 text-[11px] ${
                emojiOnly || !ownMessage ? "text-slate-500" : "text-white/75"
              } ${ownMessage ? "justify-end" : ""}`}
            >
              <span>{formatDate(message.created_at)}</span>
              {ownMessage ? <ReadReceipt message={message} onLightBackground={emojiOnly} /> : null}
            </p>
          </div>

          {reactionGroups.length ? (
            <div className={`-mt-1.5 flex flex-wrap gap-1 px-2 ${ownMessage ? "justify-end" : ""}`}>
              {reactionGroups.map((group) => (
                <button
                  key={group.emoji}
                  type="button"
                  onClick={() => react(group.emoji)}
                  title={`${group.names.join(", ")} reacted ${group.emoji}`}
                  className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-sm shadow-sm transition ${
                    group.mine
                      ? "border-primary/40 bg-sky-50 text-primary-dark"
                      : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <span className="leading-none">{group.emoji}</span>
                  {group.count > 1 ? <span className="text-xs font-semibold">{group.count}</span> : null}
                </button>
              ))}
            </div>
          ) : null}
        </div>

        <div className="shrink-0 self-center">
          <button
            ref={reactButtonRef}
            type="button"
            onClick={() => setPickerOpen((open) => !open)}
            className="rounded-full p-1.5 text-slate-400 opacity-60 transition hover:bg-slate-100 hover:text-slate-700 focus:opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
            aria-label="React to message"
            title="React"
          >
            <FaceSmileIcon className="h-5 w-5" />
          </button>
          {pickerOpen ? (
            <EmojiPicker
              quick
              anchorRef={reactButtonRef}
              align={ownMessage ? "right" : "left"}
              onSelect={react}
              onClose={() => setPickerOpen(false)}
            />
          ) : null}
        </div>
      </div>
      {ownMessage ? (
        <span className="hidden shrink-0 sm:block">
          <UserAvatar user={currentUser} className="h-9 w-9" iconClassName="h-5 w-5" />
        </span>
      ) : null}
    </div>
  );
}

export default function UserChat() {
  const [conversations, setConversations] = useState([]);
  const [inbox, setInbox] = useState({ unread_messages: 0, missed_calls: 0 });
  const [users, setUsers] = useState([]);
  const [activeUser, setActiveUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState("");
  const [peerTyping, setPeerTyping] = useState(false);
  const typingSentAtRef = useRef(0);
  const [loadingSidebar, setLoadingSidebar] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [recording, setRecording] = useState(false);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [groupPickerOpen, setGroupPickerOpen] = useState(false);
  const { startGroupCall, inGroupCall, groupBusy } = useGroupCall();
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
  const draftInputRef = useRef(null);
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
    return users
      .filter((user) => !conversationIDs.has(user.id))
      .sort((a, b) => Number(b.is_online) - Number(a.is_online) || a.username.localeCompare(b.username));
  }, [conversations, users]);

  const onlineCount = useMemo(
    () => users.filter((user) => user.is_online).length,
    [users]
  );

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
      setInbox(conversationsRes.data.inbox || { unread_messages: 0, missed_calls: 0 });
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
    const timer = window.setInterval(() => {
      loadSidebar();
    }, 30000);
    return () => window.clearInterval(timer);
  }, [loadSidebar]);

  useEffect(() => {
    if (activeUserID) {
      loadMessages(activeUserID).then(() => loadSidebar());
    } else {
      setMessages([]);
    }
  }, [activeUserID, loadMessages, loadSidebar]);

  useEffect(() => {
    if (!activeUserID) return undefined;

    const timer = window.setInterval(() => {
      loadMessages(activeUserID, { silent: true });
      loadSidebar();
    }, 5000);

    return () => window.clearInterval(timer);
  }, [activeUserID, loadMessages, loadSidebar]);

  // Typing indicator: tell the other person while I type (at most every 3s)...
  useEffect(() => {
    if (!activeUserID) return;
    const hasText = draft.trim().length > 0;
    const now = Date.now();
    if (hasText && now - typingSentAtRef.current > 3000) {
      typingSentAtRef.current = now;
      api.post(`/chats/${activeUserID}/typing`, { typing: true }).catch(() => {});
    } else if (!hasText && typingSentAtRef.current) {
      typingSentAtRef.current = 0;
      api.post(`/chats/${activeUserID}/typing`, { typing: false }).catch(() => {});
    }
  }, [draft, activeUserID]);

  // ...and check every 2s whether they are typing to me.
  useEffect(() => {
    setPeerTyping(false);
    typingSentAtRef.current = 0;
    if (!activeUserID) return undefined;
    let stopped = false;
    const check = async () => {
      if (document.hidden) return;
      try {
        const res = await api.get(`/chats/${activeUserID}/typing`, { params: { _ts: Date.now() } });
        if (!stopped) setPeerTyping(Boolean(res.data?.typing));
      } catch {
        // ignore transient errors
      }
    };
    check();
    const timer = window.setInterval(check, 2000);
    return () => {
      stopped = true;
      window.clearInterval(timer);
    };
  }, [activeUserID]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [orderedMessages.length, activeUserID, peerTyping]);

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
        latest_message_type: message.message_type || "text",
        latest_message_at: message.created_at,
        unread_count: existing?.unread_count || 0,
        missed_call_count: existing?.missed_call_count || 0,
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
      typingSentAtRef.current = 0; // the server clears my typing state when the message is saved
      setDraft("");
    } catch (err) {
      setChatError(getApiError(err, "Failed to send message."));
    } finally {
      setSending(false);
    }
  };

  const insertEmoji = (emoji) => {
    const input = draftInputRef.current;
    const start = input?.selectionStart ?? draft.length;
    const end = input?.selectionEnd ?? draft.length;
    setDraft(draft.slice(0, start) + emoji + draft.slice(end));
    window.requestAnimationFrame(() => {
      if (!input) return;
      input.focus();
      const caret = start + emoji.length;
      input.setSelectionRange(caret, caret);
    });
  };

  const reactToMessage = async (message, emoji) => {
    const previous = message.reactions || [];
    const mine = previous.find((item) => item.user_id === currentUser?.id);
    const optimistic = previous.filter((item) => item.user_id !== currentUser?.id);
    if (!mine || mine.emoji !== emoji) {
      optimistic.push({ user_id: currentUser?.id, username: currentUser?.username || "You", emoji });
    }
    const setReactions = (reactions) =>
      setMessages((items) => items.map((item) => (item.id === message.id ? { ...item, reactions } : item)));

    setReactions(optimistic);
    try {
      const res = await api.post(`/chats/messages/${message.id}/reactions`, { emoji });
      setReactions(res.data.reactions || []);
    } catch (err) {
      setReactions(previous);
      setChatError(getApiError(err, "Could not add reaction."));
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
      <div className="mx-auto grid max-w-7xl gap-4 lg:grid-cols-[20rem_minmax(0,1fr)] lg:gap-6 xl:grid-cols-[22rem_minmax(0,1fr)]">
        <section
          className={`card min-w-0 lg:h-[calc(100dvh-7rem)] lg:overflow-y-auto ${activeUser ? "hidden lg:block" : ""}`}
        >
          <div className="mb-5 flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-slate-900 text-white">
                <ChatBubbleLeftRightIcon className="h-6 w-6" />
              </div>
              <div className="min-w-0">
                <h1 className="truncate text-xl font-bold text-slate-950">Direct Chat</h1>
                <p className="text-sm text-slate-500">
                  {onlineCount} available · {conversations.length} conversations
                  {inbox.unread_messages > 0 || inbox.missed_calls > 0
                    ? ` · ${inbox.unread_messages} new message${inbox.unread_messages === 1 ? "" : "s"}${inbox.missed_calls > 0 ? ` · ${inbox.missed_calls} missed call${inbox.missed_calls === 1 ? "" : "s"}` : ""}`
                    : ""}
                </p>
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

          <button
            type="button"
            onClick={() => setGroupPickerOpen(true)}
            disabled={inCall || inGroupCall || groupBusy}
            className="btn btn-secondary mb-5 inline-flex w-full items-center justify-center gap-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <UserGroupIcon className="h-5 w-5" />
            Start a group call
          </button>

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
                    const PreviewIcon = conversationPreviewIcon(conversation.latest_message_type);
                    const hasMissed = conversation.missed_call_count > 0;

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
                              : hasMissed
                                ? "border-amber-300 bg-amber-50 hover:border-amber-400"
                                : conversation.unread_count > 0
                                  ? "border-primary/30 bg-primary/5 hover:border-primary/40"
                                  : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="truncate font-bold text-slate-950">{conversation.username}</p>
                            <PresenceIndicator user={conversation} showLabel />
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
                            {hasMissed && !isRinging ? (
                              <span className="inline-flex rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-bold uppercase text-white">
                                Missed call
                              </span>
                            ) : null}
                          </div>
                          <p className="mt-1 flex items-center gap-1.5 line-clamp-2 text-sm text-slate-500">
                            <PreviewIcon
                              className={`h-4 w-4 shrink-0 ${
                                conversation.latest_message_type === "missed_call" ? "text-amber-600" : ""
                              }`}
                            />
                            <span>{conversation.latest_message || "Start chatting"}</span>
                          </p>
                        </div>
                        <div className="flex shrink-0 flex-col items-end gap-1">
                          {hasMissed ? (
                            <span
                              className="inline-flex h-6 min-w-6 items-center justify-center gap-1 rounded-full bg-amber-500 px-2 text-xs font-bold text-white"
                              title="Missed calls"
                            >
                              <PhoneXMarkIcon className="h-3.5 w-3.5" />
                              {conversation.missed_call_count}
                            </span>
                          ) : null}
                          {conversation.unread_count > 0 ? (
                            <span
                              className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-primary px-2 text-xs font-bold text-white"
                              title="Unread messages"
                            >
                              {conversation.unread_count}
                            </span>
                          ) : null}
                        </div>
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
                      <AvatarWithPresence
                        user={user}
                        avatar={<UserAvatar user={user} className="h-9 w-9" iconClassName="h-5 w-5" />}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="truncate font-bold text-slate-950">{user.username}</p>
                          <PresenceIndicator user={user} showLabel />
                        </div>
                        <p className="truncate text-sm text-slate-500">{user.email}</p>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>
        </section>

        <section
          className={`card min-w-0 flex-col overflow-hidden !p-3 sm:!p-5 h-[calc(100dvh-6rem)] min-h-[26rem] sm:h-[calc(100dvh-7rem)] ${
            activeUser ? "flex" : "hidden lg:flex"
          }`}
        >
          {activeUser ? (
            <>
              <div className="mb-3 flex items-center justify-between gap-2 border-b border-slate-200 pb-3 sm:mb-5 sm:gap-3 sm:pb-4">
                <div className="flex min-w-0 items-center gap-2 sm:gap-3">
                  <button
                    type="button"
                    onClick={() => setActiveUser(null)}
                    className="-ml-1 rounded-lg p-1.5 text-slate-600 hover:bg-slate-100 lg:hidden"
                    aria-label="Back to chats"
                  >
                    <ChevronLeftIcon className="h-6 w-6" />
                  </button>
                  <AvatarWithPresence
                    user={activeUser}
                    avatar={<UserAvatar user={activeUser} className="h-11 w-11" iconClassName="h-6 w-6" />}
                  />
                  <div className="min-w-0">
                    <h2 className="truncate text-base font-bold text-slate-950 sm:text-xl">{activeDisplayName}</h2>
                    <p className="truncate text-xs text-slate-500 sm:text-sm">
                      {peerTyping ? (
                        <span className="font-semibold text-emerald-600">typing…</span>
                      ) : (
                        <span className={activeUser?.is_online ? "font-semibold text-emerald-600" : ""}>
                          {formatPresenceLabel(activeUser)}
                        </span>
                      )}
                      {activeRole ? ` · ${activeRole}` : ""}
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-1 sm:gap-2">
                  <button
                    type="button"
                    onClick={() => startCall(activeUserID, "audio")}
                    disabled={inCall || callBusy || inGroupCall}
                    title={activeUser?.is_online ? "Start voice call" : "User is offline — call may not be answered"}
                    className="btn btn-secondary inline-flex items-center gap-2 px-2.5 disabled:cursor-not-allowed disabled:opacity-50 sm:px-4"
                    aria-label="Start voice call"
                  >
                    <PhoneIcon className="h-5 w-5" />
                    <span className="hidden sm:inline">Call</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => startCall(activeUserID, "video")}
                    disabled={inCall || callBusy || inGroupCall}
                    title={activeUser?.is_online ? "Start video call" : "User is offline — call may not be answered"}
                    className="btn btn-secondary inline-flex items-center gap-2 px-2.5 disabled:cursor-not-allowed disabled:opacity-50 sm:px-4"
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

              <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain pr-1">
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
                      onReact={reactToMessage}
                    />
                  ))
                )}
                {peerTyping ? <TypingBubble user={activeUser} /> : null}
                <div ref={messagesEndRef} />
              </div>

              <form onSubmit={sendTextMessage} className="mt-3 border-t border-slate-200 pt-3 sm:mt-5 sm:pt-4">
                <div className="flex items-stretch gap-1.5 sm:gap-2">
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
                    className="btn btn-secondary inline-flex shrink-0 items-center justify-center px-2.5 disabled:cursor-not-allowed sm:px-3 disabled:opacity-50"
                    aria-label="Send image"
                  >
                    <PhotoIcon className="h-5 w-5" />
                  </button>
                  <button
                    type="button"
                    onClick={recording ? stopRecording : startRecording}
                    disabled={sending}
                    className={`btn inline-flex shrink-0 items-center justify-center px-2.5 disabled:cursor-not-allowed sm:px-3 disabled:opacity-50 ${
                      recording ? "btn-danger" : "btn-secondary"
                    }`}
                    aria-label={recording ? "Stop recording" : "Record voice note"}
                  >
                    {recording ? <StopIcon className="h-5 w-5" /> : <MicrophoneIcon className="h-5 w-5" />}
                  </button>
                  <div className="relative flex">
                    <button
                      type="button"
                      onClick={() => setEmojiOpen((open) => !open)}
                      disabled={sending || recording}
                      className="btn btn-secondary inline-flex shrink-0 items-center justify-center px-2.5 disabled:cursor-not-allowed sm:px-3 disabled:opacity-50"
                      aria-label="Add emoji"
                      aria-expanded={emojiOpen}
                    >
                      <FaceSmileIcon className="h-5 w-5" />
                    </button>
                    {emojiOpen ? <EmojiPicker onSelect={insertEmoji} onClose={() => setEmojiOpen(false)} /> : null}
                  </div>
                  <input
                    ref={draftInputRef}
                    type="text"
                    value={draft}
                    onChange={(event) => setDraft(event.target.value)}
                    placeholder={`Message ${activeDisplayName}`}
                    className="input min-w-0 flex-1"
                    disabled={sending || recording}
                    maxLength={4000}
                  />
                  <button
                    type="submit"
                    disabled={!draft.trim() || sending || recording}
                    className="btn btn-primary inline-flex shrink-0 items-center gap-2 px-3 disabled:cursor-not-allowed disabled:opacity-50 sm:px-4"
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
      {groupPickerOpen ? (
        <GroupCallPicker
          showCallType
          maxSelectable={GROUP_CALL_MAX - 1}
          confirmLabel="Start call"
          onClose={() => setGroupPickerOpen(false)}
          onConfirm={(ids, type) => {
            setGroupPickerOpen(false);
            startGroupCall(ids, type);
          }}
        />
      ) : null}
    </DashboardLayout>
  );
}
