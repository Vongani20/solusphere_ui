import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ComputerDesktopIcon, PlusIcon, UserPlusIcon } from "@heroicons/react/24/outline";
import { VideoCameraIcon } from "@heroicons/react/24/solid";
import DashboardLayout from "../components/DashboardLayout";
import DimensionalIcon from "../components/DimensionalIcon";
import UserAvatar from "../components/UserAvatar";
import api, { getApiError, getStoredUser } from "../services/api";
import { useGroupCall } from "../context/GroupCallContext";

const MAX_PEOPLE = 7;

function pad(value) {
  return String(value).padStart(2, "0");
}

function toLocalInput(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function defaultStart() {
  const date = new Date();
  const minutes = date.getMinutes();
  date.setMinutes(minutes + ((15 - (minutes % 15)) % 15 || 15), 0, 0);
  return toLocalInput(date);
}

function whenLabel(meeting) {
  const start = new Date(meeting.starts_at);
  if (Number.isNaN(start.getTime())) return "Time not set";
  const date = start.toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
  if (!meeting.ends_at) return date;
  const end = new Date(meeting.ends_at);
  if (Number.isNaN(end.getTime())) return date;
  return `${date} – ${end.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}`;
}

export default function Meetings() {
  const me = getStoredUser();
  const { startGroupCall, inGroupCall, groupBusy, openMeetingNotes } = useGroupCall();
  const [meetings, setMeetings] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [title, setTitle] = useState("");
  const [starts, setStarts] = useState(defaultStart);
  const [ends, setEnds] = useState("");
  const [picked, setPicked] = useState([]);
  const [draftNotes, setDraftNotes] = useState("");
  const [noteText, setNoteText] = useState("");
  const [noteStatus, setNoteStatus] = useState("");
  const [addUserId, setAddUserId] = useState("");

  const load = useCallback(async () => {
    setError("");
    try {
      const [meetingRes, userRes] = await Promise.all([api.get("/meetings"), api.get("/users")]);
      setMeetings(meetingRes.data.meetings || []);
      setUsers(userRes.data.users || []);
    } catch (err) {
      setError(getApiError(err, "Could not load meetings."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const selected = meetings.find((meeting) => meeting.id === selectedId) || null;

  useEffect(() => {
    setNoteText(selected?.notes || "");
    setNoteStatus("");
  }, [selected?.id]);

  const others = useMemo(
    () => users.filter((user) => user.id !== me?.id).sort((a, b) => a.username.localeCompare(b.username)),
    [users, me?.id]
  );

  const togglePerson = (id) => {
    setPicked((current) => {
      if (current.includes(id)) return current.filter((item) => item !== id);
      if (current.length >= MAX_PEOPLE) return current;
      return [...current, id];
    });
  };

  const schedule = async (event) => {
    event.preventDefault();
    if (!title.trim()) {
      setError("Give the meeting a title.");
      return;
    }
    if (!starts) {
      setError("Choose a start time.");
      return;
    }
    if (!picked.length) {
      setError("Add at least one person.");
      return;
    }
    const startDate = new Date(starts);
    const endDate = ends ? new Date(ends) : null;
    if (Number.isNaN(startDate.getTime()) || (endDate && Number.isNaN(endDate.getTime()))) {
      setError("Use a valid date and time.");
      return;
    }
    if (endDate && endDate <= startDate) {
      setError("The end time must be after the start time.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const res = await api.post("/meetings", {
        title: title.trim(),
        starts_at: startDate.toISOString(),
        ends_at: endDate ? endDate.toISOString() : "",
        notes: draftNotes.trim(),
        user_ids: picked,
      });
      const meeting = res.data.meeting;
      setMeetings((current) => [meeting, ...current.filter((item) => item.id !== meeting.id)]);
      setSelectedId(meeting.id);
      setTitle("");
      setStarts(defaultStart());
      setEnds("");
      setPicked([]);
      setDraftNotes("");
    } catch (err) {
      setError(getApiError(err, "Could not schedule the meeting."));
    } finally {
      setSaving(false);
    }
  };

  const replaceMeeting = (meeting) => {
    setMeetings((current) => current.map((item) => (item.id === meeting.id ? meeting : item)));
  };

  const saveNotes = async (text) => {
    if (!selected) return;
    setNoteStatus("Saving…");
    try {
      const res = await api.put(`/meetings/${selected.id}/notes`, { notes: text });
      replaceMeeting(res.data.meeting);
      setNoteStatus("Saved");
    } catch (err) {
      setNoteStatus(getApiError(err, "Could not save notes."));
    }
  };

  const onNotesChange = (value) => {
    setNoteText(value);
    setNoteStatus("");
    window.clearTimeout(onNotesChange.timer);
    onNotesChange.timer = window.setTimeout(() => saveNotes(value), 700);
  };

  const addPerson = async (event) => {
    event.preventDefault();
    if (!selected || !addUserId) return;
    try {
      const res = await api.post(`/meetings/${selected.id}/participants`, { user_id: Number(addUserId) });
      replaceMeeting(res.data.meeting);
      setAddUserId("");
      setError("");
    } catch (err) {
      setError(getApiError(err, "Could not add that person."));
    }
  };

  const begin = async (meeting) => {
    if (inGroupCall || groupBusy) {
      setError("Leave the current call before starting this meeting.");
      return;
    }
    const ids = (meeting.participants || []).map((person) => person.user_id);
    if (!ids.length) {
      setError("Add at least one person before starting.");
      return;
    }
    setError("");
    openMeetingNotes(meeting);
    const started = await startGroupCall(ids, "screen");
    if (!started) openMeetingNotes(null);
  };

  const availableToAdd = others.filter(
    (user) => user.id !== selected?.host_id && !(selected?.participants || []).some((person) => person.user_id === user.id)
  );

  const ordered = [...meetings].sort((a, b) => new Date(a.starts_at) - new Date(b.starts_at));

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-6xl space-y-4">
        <section className="card">
          <div className="flex items-center gap-3">
            <DimensionalIcon icon={VideoCameraIcon} tone="teal" />
            <div>
              <h1 className="text-xl font-bold text-slate-950">Meetings</h1>
              <p className="text-sm text-slate-500">Set a time, invite people, share your screen, and keep notes together.</p>
            </div>
          </div>
        </section>

        {error ? <p className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm font-medium text-rose-800">{error}</p> : null}

        <div className="grid items-start gap-4 lg:grid-cols-2">
          <form onSubmit={schedule} className="card space-y-4">
            <h2 className="text-lg font-bold text-slate-950">Schedule a meeting</h2>
            <label className="block">
              <span className="field-label">Title</span>
              <input value={title} onChange={(event) => setTitle(event.target.value)} maxLength={200} className="input" placeholder="Sprint check-in" />
            </label>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="field-label">Starts</span>
                <input type="datetime-local" value={starts} onChange={(event) => setStarts(event.target.value)} className="input" required />
              </label>
              <label className="block">
                <span className="field-label">Ends</span>
                <input type="datetime-local" value={ends} onChange={(event) => setEnds(event.target.value)} className="input" />
              </label>
            </div>
            <fieldset>
              <legend className="field-label">People</legend>
              <div className="mt-2 max-h-52 space-y-1 overflow-y-auto rounded-xl border border-slate-200 p-2">
                {others.length === 0 ? <p className="px-2 py-3 text-sm text-slate-500">{loading ? "Loading people…" : "No other people to invite."}</p> : null}
                {others.map((user) => (
                  <label key={user.id} className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-1.5 hover:bg-slate-50">
                    <input
                      type="checkbox"
                      checked={picked.includes(user.id)}
                      onChange={() => togglePerson(user.id)}
                      disabled={!picked.includes(user.id) && picked.length >= MAX_PEOPLE}
                    />
                    <UserAvatar user={user} className="h-8 w-8 text-xs" iconClassName="h-4 w-4" />
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold text-slate-900">{user.username}</span>
                      <span className="block truncate text-xs text-slate-500">{user.email}</span>
                    </span>
                  </label>
                ))}
              </div>
              <p className="mt-1 text-xs text-slate-500">{picked.length} of {MAX_PEOPLE} selected. You are the host.</p>
            </fieldset>
            <label className="block">
              <span className="field-label">Notes</span>
              <textarea value={draftNotes} onChange={(event) => setDraftNotes(event.target.value)} maxLength={20000} className="input" placeholder="Agenda or anything to share before the call" />
            </label>
            <button type="submit" disabled={saving} className="btn btn-primary inline-flex items-center gap-2">
              <PlusIcon className="h-5 w-5" /> {saving ? "Saving…" : "Schedule meeting"}
            </button>
          </form>

          <section className="card space-y-3">
            <h2 className="text-lg font-bold text-slate-950">Your meetings</h2>
            {loading ? <p className="text-sm text-slate-500">Loading…</p> : null}
            {!loading && ordered.length === 0 ? (
              <p className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-500">
                Meetings you host or are invited to show up here.
              </p>
            ) : null}
            <div className="space-y-2">
              {ordered.map((meeting) => {
                const open = meeting.id === selectedId;
                const people = meeting.participants || [];
                return (
                  <article key={meeting.id} className={`rounded-xl border p-3 ${open ? "border-teal-300 bg-teal-50/40" : "border-slate-200 bg-white"}`}>
                    <button type="button" onClick={() => setSelectedId(open ? null : meeting.id)} className="w-full text-left">
                      <p className="font-bold text-slate-950">{meeting.title}</p>
                      <p className="text-sm text-slate-600">{whenLabel(meeting)}</p>
                      <p className="mt-1 truncate text-xs text-slate-500">
                        Host {meeting.host_username}
                        {people.length ? ` · ${people.map((person) => person.username).join(", ")}` : ""}
                      </p>
                    </button>
                    {open ? (
                      <div className="mt-3 space-y-3">
                        <button type="button" onClick={() => begin(meeting)} disabled={groupBusy} className="btn btn-primary inline-flex items-center gap-2">
                          <ComputerDesktopIcon className="h-5 w-5" /> {groupBusy ? "Starting…" : "Start and share screen"}
                        </button>
                        {meeting.host_id === me?.id && availableToAdd.length > 0 ? (
                          <form onSubmit={addPerson} className="flex flex-wrap items-end gap-2">
                            <label className="block min-w-[12rem] flex-1">
                              <span className="field-label">Add a person</span>
                              <select value={addUserId} onChange={(event) => setAddUserId(event.target.value)} className="input">
                                <option value="">Choose someone</option>
                                {availableToAdd.map((user) => (
                                  <option key={user.id} value={user.id}>{user.username}</option>
                                ))}
                              </select>
                            </label>
                            <button type="submit" className="btn btn-secondary inline-flex items-center gap-2">
                              <UserPlusIcon className="h-5 w-5" /> Add
                            </button>
                          </form>
                        ) : null}
                        <label className="block">
                          <span className="field-label">Shared notes</span>
                          <textarea
                            value={noteText}
                            onChange={(event) => onNotesChange(event.target.value)}
                            onBlur={() => saveNotes(noteText)}
                            maxLength={20000}
                            className="input"
                            placeholder="Decisions, actions, and anything the group should remember"
                          />
                        </label>
                        <p className="text-xs text-slate-500">{noteStatus || "Anyone in the meeting can edit these notes."}</p>
                      </div>
                    ) : null}
                  </article>
                );
              })}
            </div>
          </section>
        </div>
      </div>
    </DashboardLayout>
  );
}
