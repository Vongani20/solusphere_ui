import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowPathIcon,
  CalendarDaysIcon,
  ChatBubbleLeftRightIcon,
  PaperAirplaneIcon,
  PhotoIcon,
  UserPlusIcon,
} from "@heroicons/react/24/outline";
import DashboardLayout from "../components/DashboardLayout";
import api, { getApiError, getStoredUser } from "../services/api";
import { formatDate, statusTone, titleize } from "../utils/formatters";

export default function Events() {
  const [events, setEvents] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messageText, setMessageText] = useState("");
  const [loadingEvents, setLoadingEvents] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState("");
  const [chatError, setChatError] = useState("");
  const currentUser = getStoredUser();

  const orderedMessages = useMemo(() => [...messages].reverse(), [messages]);

  const loadEvents = useCallback(async () => {
    setLoadingEvents(true);
    setError("");

    try {
      const res = await api.get("/events");
      const loadedEvents = res.data.events || [];
      setEvents(loadedEvents);
      setSelectedEvent((current) => current || loadedEvents[0] || null);
    } catch (err) {
      setError(getApiError(err, "Failed to load events."));
    } finally {
      setLoadingEvents(false);
    }
  }, []);

  const loadMessages = useCallback(
    async (eventID = selectedEvent?.id) => {
      if (!eventID) return;
      setLoadingMessages(true);
      setChatError("");

      try {
        const res = await api.get(`/events/${eventID}/comments`, { params: { limit: 75 } });
        setMessages(res.data.comments || res.data.messages || []);
      } catch (err) {
        setMessages([]);
        setChatError(getApiError(err, "Failed to load messages."));
      } finally {
        setLoadingMessages(false);
      }
    },
    [selectedEvent?.id]
  );

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  useEffect(() => {
    if (selectedEvent?.id) {
      loadMessages(selectedEvent.id);
    }
  }, [loadMessages, selectedEvent?.id]);

  useEffect(() => {
    if (!selectedEvent?.id) return undefined;

    const timer = window.setInterval(() => {
      loadMessages(selectedEvent.id);
    }, 7000);

    return () => window.clearInterval(timer);
  }, [loadMessages, selectedEvent?.id]);

  const joinEvent = async () => {
    if (!selectedEvent) return;
    setJoining(true);
    setChatError("");

    try {
      await api.post(`/events/${selectedEvent.id}/join`);
      await loadMessages(selectedEvent.id);
    } catch (err) {
      setChatError(getApiError(err, "Failed to join event."));
    } finally {
      setJoining(false);
    }
  };

  const sendMessage = async (event) => {
    event.preventDefault();
    if (!selectedEvent || !messageText.trim() || sending) return;

    setSending(true);
    setChatError("");

    try {
      const res = await api.post(`/events/${selectedEvent.id}/comments`, {
        message: messageText.trim(),
      });
      setMessages((items) => [res.data.comment || res.data.message, ...items]);
      setMessageText("");
    } catch (err) {
      setChatError(getApiError(err, "Failed to send message."));
    } finally {
      setSending(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="mx-auto grid max-w-7xl gap-6 xl:grid-cols-[0.8fr_1.2fr]">
        <section className="card h-fit">
          <div className="mb-5 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-cyan-600 text-white">
                <CalendarDaysIcon className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-950">Events</h1>
                <p className="text-sm text-slate-500">{events.length} available</p>
              </div>
            </div>
            <button
              type="button"
              onClick={loadEvents}
              className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 hover:text-slate-950"
              aria-label="Refresh events"
            >
              <ArrowPathIcon className={`h-5 w-5 ${loadingEvents ? "animate-spin" : ""}`} />
            </button>
          </div>

          {error && (
            <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm font-medium text-rose-800">
              {error}
            </div>
          )}

          <div className="space-y-3">
            {events.length === 0 ? (
              <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm font-medium text-slate-500">
                {loadingEvents ? "Loading events..." : "No events found"}
              </div>
            ) : (
              events.map((event) => (
                <button
                  type="button"
                  key={event.id}
                  onClick={() => setSelectedEvent(event)}
                  className={`w-full rounded-lg border p-4 text-left transition ${
                    selectedEvent?.id === event.id
                      ? "border-primary bg-primary/5"
                      : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-bold text-slate-950">{event.title}</p>
                      <p className="mt-1 line-clamp-2 text-sm text-slate-500">
                        {event.description || "No description"}
                      </p>
                    </div>
                    <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ring-1 ${statusTone(event.status)}`}>
                      {event.status}
                    </span>
                  </div>
                  <p className="mt-3 text-xs font-medium text-slate-500">{formatDate(event.created_at)}</p>
                </button>
              ))
            )}
          </div>
        </section>

        <section className="card flex min-h-[calc(100vh-8.5rem)] flex-col">
          {selectedEvent ? (
            <>
              <div className="mb-5 flex flex-wrap items-start justify-between gap-3 border-b border-slate-200 pb-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <ChatBubbleLeftRightIcon className="h-6 w-6 text-primary" />
                    <h2 className="truncate text-xl font-bold text-slate-950">{selectedEvent.title}</h2>
                  </div>
                  <p className="mt-1 max-w-3xl text-sm text-slate-500">
                    {selectedEvent.description || "No description"}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={joinEvent}
                    disabled={joining}
                    className="btn btn-secondary inline-flex items-center gap-2 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <UserPlusIcon className="h-5 w-5" />
                    {joining ? "Joining..." : "Join"}
                  </button>
                  <button
                    type="button"
                    onClick={() => loadMessages(selectedEvent.id)}
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

              <div className="flex-1 overflow-y-auto pr-1">
                <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
                  <div className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-white">
                        {selectedEvent.title?.slice(0, 1)?.toUpperCase() || "E"}
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-base font-bold text-slate-950">{selectedEvent.title}</h3>
                        <p className="text-xs font-medium text-slate-500">{formatDate(selectedEvent.created_at)}</p>
                      </div>
                    </div>
                    {selectedEvent.description && (
                      <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-slate-600">{selectedEvent.description}</p>
                    )}
                  </div>

                  <div className="bg-slate-100">
                    {selectedEvent.image_url ? (
                      <img
                        src={selectedEvent.image_url}
                        alt={selectedEvent.title}
                        className="max-h-[520px] w-full object-cover"
                      />
                    ) : (
                      <div className="flex aspect-[16/9] items-center justify-center bg-gradient-to-br from-slate-900 via-primary to-cyan-700 p-8 text-center text-white">
                        <div>
                          <PhotoIcon className="mx-auto h-12 w-12 opacity-80" />
                          <p className="mt-3 text-lg font-bold">{selectedEvent.title}</p>
                          <p className="mt-1 text-sm text-white/70">Add an event image from Admin</p>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="border-t border-slate-200 p-4">
                    <div className="mb-4 flex items-center justify-between gap-3">
                      <div>
                        <h3 className="text-sm font-bold text-slate-950">Comments</h3>
                        <p className="text-xs text-slate-500">{orderedMessages.length} people joined the discussion</p>
                      </div>
                      <ChatBubbleLeftRightIcon className="h-5 w-5 text-slate-400" />
                    </div>

                    {orderedMessages.length === 0 ? (
                      <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm font-medium text-slate-500">
                        {loadingMessages ? "Loading comments..." : "No comments yet"}
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {orderedMessages.map((message) => (
                          <Comment key={message.id} message={message} currentUserID={currentUser?.id} />
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <form onSubmit={sendMessage} className="mt-5 flex gap-2 border-t border-slate-200 pt-4">
                <input
                  type="text"
                  value={messageText}
                  onChange={(event) => setMessageText(event.target.value)}
                  placeholder="Write a comment"
                  className="input flex-1"
                  disabled={sending}
                />
                <button
                  type="submit"
                  disabled={!messageText.trim() || sending}
                  className="btn btn-primary inline-flex items-center gap-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <PaperAirplaneIcon className="h-5 w-5" />
                  <span className="hidden sm:inline">{sending ? "Posting..." : "Comment"}</span>
                </button>
              </form>
            </>
          ) : (
            <div className="flex min-h-96 items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm font-medium text-slate-500">
              Select an event
            </div>
          )}
        </section>
      </div>
    </DashboardLayout>
  );
}

function Comment({ message, currentUserID }) {
  const sender = message.sender || {};
  const name = message.sender_username || sender.username || titleize(message.sender_role) || "User";
  const email = message.sender_email || sender.email || "";
  const role = message.sender_role || sender.role || "user";
  const ownMessage = message.sender_id === currentUserID || sender.id === currentUserID;

  return (
    <article className="flex items-start gap-3">
      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white ${ownMessage ? "bg-primary" : "bg-slate-800"}`}>
        {initials(name)}
      </div>
      <div className="min-w-0 flex-1">
        <div className="inline-block max-w-full rounded-lg bg-slate-100 px-4 py-3">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="text-sm font-bold text-slate-950">{name}</span>
            <span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-bold text-slate-600 ring-1 ring-slate-200">
              {titleize(role)}
            </span>
            {ownMessage && <span className="text-[11px] font-semibold text-primary">You</span>}
          </div>
          {email && <p className="mt-0.5 truncate text-xs text-slate-500">{email}</p>}
          <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-slate-700">{message.message}</p>
        </div>
        <p className="mt-1 text-xs font-medium text-slate-400">{formatDate(message.created_at)}</p>
      </div>
    </article>
  );
}

function initials(name) {
  return String(name || "U")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}
