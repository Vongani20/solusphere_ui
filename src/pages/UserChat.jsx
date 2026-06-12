import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowPathIcon,
  ChatBubbleLeftRightIcon,
  PaperAirplaneIcon,
  UserGroupIcon,
  UserPlusIcon,
} from "@heroicons/react/24/outline";
import DashboardLayout from "../components/DashboardLayout";
import UserAvatar from "../components/UserAvatar";
import api, { getApiError, getStoredUser } from "../services/api";
import { formatDate, statusTone, titleize } from "../utils/formatters";

export default function UserChat() {
  const [rooms, setRooms] = useState([]);
  const [activeRoom, setActiveRoom] = useState(null);
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState("");
  const [loadingRooms, setLoadingRooms] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [joining, setJoining] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [chatError, setChatError] = useState("");
  const currentUser = getStoredUser();
  const messagesEndRef = useRef(null);

  const orderedMessages = useMemo(() => [...messages].reverse(), [messages]);

  const loadRooms = useCallback(async () => {
    setLoadingRooms(true);
    setError("");

    try {
      const res = await api.get("/events");
      const loadedRooms = res.data.events || [];
      setRooms(loadedRooms);
      setActiveRoom((current) => {
        if (current && loadedRooms.some((room) => room.id === current.id)) return current;
        return loadedRooms[0] || null;
      });
    } catch (err) {
      setError(getApiError(err, "Failed to load user chat rooms."));
    } finally {
      setLoadingRooms(false);
    }
  }, []);

  const loadMessages = useCallback(
    async (roomID = activeRoom?.id, options = {}) => {
      if (!roomID) return;
      if (!options.silent) setLoadingMessages(true);
      setChatError("");

      try {
        const res = await api.get(`/events/${roomID}/messages`, { params: { limit: 100 } });
        setMessages(res.data.messages || []);
      } catch (err) {
        setMessages([]);
        setChatError(getApiError(err, "Join this chat before reading messages."));
      } finally {
        setLoadingMessages(false);
      }
    },
    [activeRoom?.id]
  );

  useEffect(() => {
    loadRooms();
  }, [loadRooms]);

  useEffect(() => {
    if (activeRoom?.id) {
      loadMessages(activeRoom.id);
    }
  }, [activeRoom?.id, loadMessages]);

  useEffect(() => {
    if (!activeRoom?.id) return undefined;

    const timer = window.setInterval(() => {
      loadMessages(activeRoom.id, { silent: true });
    }, 5000);

    return () => window.clearInterval(timer);
  }, [activeRoom?.id, loadMessages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [orderedMessages.length, activeRoom?.id]);

  const joinRoom = async () => {
    if (!activeRoom) return;
    setJoining(true);
    setChatError("");

    try {
      await api.post(`/events/${activeRoom.id}/join`);
      await loadMessages(activeRoom.id);
    } catch (err) {
      setChatError(getApiError(err, "Failed to join chat."));
    } finally {
      setJoining(false);
    }
  };

  const sendMessage = async (event) => {
    event.preventDefault();
    if (!activeRoom || !draft.trim() || sending) return;

    const body = draft.trim();
    setSending(true);
    setChatError("");

    try {
      const res = await api.post(`/events/${activeRoom.id}/messages`, { message: body });
      setMessages((items) => [res.data.message, ...items]);
      setDraft("");
    } catch (err) {
      setChatError(getApiError(err, "Failed to send message."));
    } finally {
      setSending(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="mx-auto grid max-w-7xl gap-6 xl:grid-cols-[22rem_1fr]">
        <section className="card h-fit">
          <div className="mb-5 flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-slate-900 text-white">
                <UserGroupIcon className="h-6 w-6" />
              </div>
              <div className="min-w-0">
                <h1 className="truncate text-xl font-bold text-slate-950">User Chat</h1>
                <p className="text-sm text-slate-500">{rooms.length} rooms</p>
              </div>
            </div>
            <button
              type="button"
              onClick={loadRooms}
              className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 hover:text-slate-950"
              aria-label="Refresh chat rooms"
            >
              <ArrowPathIcon className={`h-5 w-5 ${loadingRooms ? "animate-spin" : ""}`} />
            </button>
          </div>

          {error && (
            <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm font-medium text-rose-800">
              {error}
            </div>
          )}

          <div className="space-y-3">
            {rooms.length === 0 ? (
              <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm font-medium text-slate-500">
                {loadingRooms ? "Loading rooms..." : "No chat rooms found"}
              </div>
            ) : (
              rooms.map((room) => (
                <button
                  key={room.id}
                  type="button"
                  onClick={() => setActiveRoom(room)}
                  className={`w-full rounded-lg border p-4 text-left transition ${
                    activeRoom?.id === room.id
                      ? "border-primary bg-primary/5"
                      : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-bold text-slate-950">{room.title}</p>
                      <p className="mt-1 line-clamp-2 text-sm text-slate-500">
                        {room.description || "Shared conversation"}
                      </p>
                    </div>
                    <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ring-1 ${statusTone(room.status)}`}>
                      {room.status}
                    </span>
                  </div>
                </button>
              ))
            )}
          </div>
        </section>

        <section className="card flex min-h-[calc(100vh-8.5rem)] flex-col overflow-hidden">
          {activeRoom ? (
            <>
              <div className="mb-5 flex flex-wrap items-start justify-between gap-3 border-b border-slate-200 pb-4">
                <div className="min-w-0">
                  <div className="flex min-w-0 items-center gap-2">
                    <ChatBubbleLeftRightIcon className="h-6 w-6 shrink-0 text-primary" />
                    <h2 className="truncate text-xl font-bold text-slate-950">{activeRoom.title}</h2>
                  </div>
                  <p className="mt-1 max-w-3xl text-sm text-slate-500">
                    {activeRoom.description || "Shared conversation"}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={joinRoom}
                    disabled={joining}
                    className="btn btn-secondary inline-flex items-center gap-2 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <UserPlusIcon className="h-5 w-5" />
                    {joining ? "Joining..." : "Join"}
                  </button>
                  <button
                    type="button"
                    onClick={() => loadMessages(activeRoom.id)}
                    className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 hover:text-slate-950"
                    aria-label="Refresh messages"
                  >
                    <ArrowPathIcon className={`h-5 w-5 ${loadingMessages ? "animate-spin" : ""}`} />
                  </button>
                </div>
              </div>

              {chatError && (
                <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm font-medium text-amber-900">
                  {chatError}
                </div>
              )}

              <div className="flex-1 space-y-4 overflow-y-auto pr-1">
                {orderedMessages.length === 0 ? (
                  <div className="flex h-full min-h-64 items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm font-medium text-slate-500">
                    {loadingMessages ? "Loading messages..." : "No messages yet"}
                  </div>
                ) : (
                  orderedMessages.map((message) => {
                    const ownMessage = message.sender_id === currentUser?.id;
                    const sender = {
                      username: message.sender_username || titleize(message.sender_role),
                    };

                    return (
                      <div key={message.id} className={`flex items-end gap-3 ${ownMessage ? "justify-end" : "justify-start"}`}>
                        {!ownMessage && <UserAvatar user={sender} className="h-9 w-9" iconClassName="h-5 w-5" />}
                        <div
                          className={`max-w-[82%] rounded-lg px-4 py-3 ${
                            ownMessage ? "bg-primary text-white" : "bg-slate-100 text-slate-900"
                          }`}
                        >
                          <div className="mb-1 flex flex-wrap items-center gap-x-2 gap-y-1">
                            <span className="text-xs font-bold">{sender.username}</span>
                            <span
                              className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
                                ownMessage ? "bg-white/20 text-white" : "bg-white text-slate-600"
                              }`}
                            >
                              {titleize(message.sender_role)}
                            </span>
                          </div>
                          <p className="whitespace-pre-wrap break-words text-sm">{message.message}</p>
                          <p className={`mt-2 text-[11px] ${ownMessage ? "text-white/75" : "text-slate-500"}`}>
                            {formatDate(message.created_at)}
                          </p>
                        </div>
                        {ownMessage && <UserAvatar user={currentUser} className="h-9 w-9" iconClassName="h-5 w-5" />}
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              <form onSubmit={sendMessage} className="mt-5 flex gap-2 border-t border-slate-200 pt-4">
                <input
                  type="text"
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  placeholder="Message users in this room"
                  className="input flex-1"
                  disabled={sending}
                  maxLength={4000}
                />
                <button
                  type="submit"
                  disabled={!draft.trim() || sending}
                  className="btn btn-primary inline-flex items-center gap-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <PaperAirplaneIcon className="h-5 w-5" />
                  <span className="hidden sm:inline">{sending ? "Sending..." : "Send"}</span>
                </button>
              </form>
            </>
          ) : (
            <div className="flex min-h-96 items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm font-medium text-slate-500">
              Select a chat room
            </div>
          )}
        </section>
      </div>
    </DashboardLayout>
  );
}
