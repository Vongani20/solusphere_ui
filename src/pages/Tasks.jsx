import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowPathIcon,
  CalendarDaysIcon,
  CheckCircleIcon,
  MagnifyingGlassIcon,
  PlayIcon,
  PlusIcon,
  TrashIcon,
  ArrowUturnLeftIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import DashboardLayout from "../components/DashboardLayout";
import UserAvatar from "../components/UserAvatar";
import DimensionalIcon from "../components/DimensionalIcon";
import api, { getApiError, getStoredUser } from "../services/api";

const COLUMNS = [
  { status: "todo", label: "To do", dot: "bg-slate-400" },
  { status: "in_progress", label: "In progress", dot: "bg-sky-500" },
  { status: "done", label: "Done", dot: "bg-emerald-500" },
];

const PRIORITY = {
  high: { label: "High", className: "border-rose-200 bg-rose-50 text-rose-700" },
  medium: { label: "Medium", className: "border-amber-200 bg-amber-50 text-amber-800" },
  low: { label: "Low", className: "border-slate-200 bg-slate-100 text-slate-600" },
};

const SCOPES = [
  { value: "mine", label: "Assigned to me" },
  { value: "created", label: "Created by me" },
  { value: "all", label: "All tasks", adminOnly: true },
];

const emptyForm = { title: "", description: "", priority: "medium", due_date: "", assigned_to: "" };

function todayISO() {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

function dueLabel(task) {
  if (!task.due_date) return null;
  const today = todayISO();
  const date = new Date(`${task.due_date}T00:00:00`);
  const pretty = date.toLocaleDateString(undefined, { day: "numeric", month: "short" });
  if (task.status !== "done" && task.due_date < today) return { text: `Overdue · ${pretty}`, tone: "border-rose-200 bg-rose-50 text-rose-700" };
  if (task.status !== "done" && task.due_date === today) return { text: "Due today", tone: "border-amber-200 bg-amber-50 text-amber-800" };
  return { text: `Due ${pretty}`, tone: "border-slate-200 bg-slate-50 text-slate-600" };
}

export default function Tasks() {
  const currentUser = getStoredUser();
  const [scope, setScope] = useState("mine");
  const [tasks, setTasks] = useState([]);
  const [isAdmin, setIsAdmin] = useState(currentUser?.role === "admin");
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [mobileStatus, setMobileStatus] = useState("todo");
  const [editing, setEditing] = useState(null); // null | "new" | task
  const [dragId, setDragId] = useState(null);

  const notifyChanged = () => window.dispatchEvent(new Event("ss-tasks-changed"));

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.get("/tasks", { params: { scope } });
      setTasks(res.data.tasks || []);
      setIsAdmin(Boolean(res.data.is_admin));
    } catch (err) {
      setError(getApiError(err, "Failed to load tasks."));
    } finally {
      setLoading(false);
    }
  }, [scope]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    api
      .get("/users")
      .then((res) => setUsers(res.data.users || []))
      .catch(() => {});
  }, []);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return tasks;
    return tasks.filter((t) =>
      [t.title, t.description, t.assigned_to_name, t.created_by_name].some((v) => v?.toLowerCase().includes(needle))
    );
  }, [query, tasks]);

  const byStatus = useMemo(() => {
    const groups = { todo: [], in_progress: [], done: [] };
    visible.forEach((t) => groups[t.status]?.push(t));
    return groups;
  }, [visible]);

  const openCount = tasks.filter((t) => t.status !== "done").length;
  const overdueCount = tasks.filter((t) => t.overdue).length;

  const moveTask = async (task, status) => {
    if (!task.can_change_status || task.status === status) return;
    const previous = tasks;
    setTasks((items) => items.map((t) => (t.id === task.id ? { ...t, status, overdue: status === "done" ? false : t.overdue } : t)));
    try {
      const res = await api.patch(`/tasks/${task.id}`, { status });
      setTasks((items) => items.map((t) => (t.id === task.id ? res.data.task : t)));
      notifyChanged();
    } catch (err) {
      setTasks(previous);
      setError(getApiError(err, "Could not update the task."));
    }
  };

  const saveTask = async (form, original) => {
    const payload = {
      title: form.title,
      description: form.description,
      priority: form.priority,
      due_date: form.due_date,
    };
    if (form.assigned_to) payload.assigned_to = Number(form.assigned_to);
    if (original && form.status) payload.status = form.status;
    const res = original
      ? await api.patch(`/tasks/${original.id}`, original.can_edit ? payload : { status: form.status })
      : await api.post("/tasks", payload);
    notifyChanged();
    await load();
    return res.data.task;
  };

  const deleteTask = async (task) => {
    if (!window.confirm(`Delete "${task.title}"? This cannot be undone.`)) return;
    try {
      await api.delete(`/tasks/${task.id}`);
      setEditing(null);
      notifyChanged();
      await load();
    } catch (err) {
      setError(getApiError(err, "Could not delete the task."));
    }
  };

  const scopes = SCOPES.filter((s) => !s.adminOnly || isAdmin);

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-7xl space-y-4">
        <section className="card">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <DimensionalIcon icon={CheckCircleIcon} tone="teal" />
              <div className="min-w-0">
                <h1 className="text-xl font-bold text-slate-950">Tasks</h1>
                <p className="text-sm text-slate-500">
                  {loading ? "Loading…" : `${openCount} open${overdueCount ? ` · ${overdueCount} overdue` : ""}`}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button type="button" onClick={load} className="btn btn-secondary px-3" aria-label="Refresh tasks">
                <ArrowPathIcon className={`h-5 w-5 ${loading ? "animate-spin" : ""}`} />
              </button>
              <button type="button" onClick={() => setEditing("new")} className="btn btn-primary inline-flex items-center gap-2">
                <PlusIcon className="h-5 w-5" /> New task
              </button>
            </div>
          </div>

          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex gap-1 overflow-x-auto rounded-xl border border-slate-200 bg-slate-50 p-1" role="tablist">
              {scopes.map((s) => (
                <button
                  key={s.value}
                  type="button"
                  role="tab"
                  aria-selected={scope === s.value}
                  onClick={() => setScope(s.value)}
                  className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-semibold transition ${
                    scope === s.value ? "bg-white text-primary shadow-sm" : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
            <label className="relative block sm:w-72">
              <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search tasks"
                className="input pl-9"
              />
            </label>
          </div>
        </section>

        {error ? (
          <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm font-medium text-rose-800">{error}</div>
        ) : null}

        {/* Phones: one column at a time */}
        <div className="grid grid-cols-3 gap-1 rounded-xl border border-slate-200 bg-white p-1 lg:hidden">
          {COLUMNS.map((c) => (
            <button
              key={c.status}
              type="button"
              onClick={() => setMobileStatus(c.status)}
              className={`rounded-lg px-2 py-2 text-xs font-bold ${
                mobileStatus === c.status ? "bg-primary text-white" : "text-slate-600"
              }`}
            >
              {c.label} ({byStatus[c.status].length})
            </button>
          ))}
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          {COLUMNS.map((column) => (
            <section
              key={column.status}
              onDragOver={(e) => {
                if (dragId) e.preventDefault();
              }}
              onDrop={(e) => {
                e.preventDefault();
                const task = tasks.find((t) => t.id === dragId);
                setDragId(null);
                if (task) moveTask(task, column.status);
              }}
              className={`${mobileStatus === column.status ? "block" : "hidden"} well-3d min-h-40 rounded-2xl border border-slate-200 bg-slate-50 p-3 lg:block`}
            >
              <header className="mb-3 flex items-center justify-between px-1">
                <h2 className="flex items-center gap-2 text-sm font-bold text-slate-800">
                  <span className={`h-2.5 w-2.5 rounded-full ${column.dot}`} />
                  {column.label}
                </h2>
                <span className="rounded-full bg-white px-2 py-0.5 text-xs font-bold text-slate-600">
                  {byStatus[column.status].length}
                </span>
              </header>
              <div className="space-y-2.5">
                {byStatus[column.status].length === 0 ? (
                  <p className="rounded-xl border border-dashed border-slate-300 p-5 text-center text-sm text-slate-500">
                    {loading ? "Loading…" : column.status === "done" ? "Nothing finished yet" : "Nothing here"}
                  </p>
                ) : (
                  byStatus[column.status].map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      scope={scope}
                      currentUserId={currentUser?.id}
                      onOpen={() => setEditing(task)}
                      onMove={(status) => moveTask(task, status)}
                      onDragStart={() => setDragId(task.id)}
                      onDragEnd={() => setDragId(null)}
                    />
                  ))
                )}
              </div>
            </section>
          ))}
        </div>
      </div>

      {editing ? (
        <TaskModal
          task={editing === "new" ? null : editing}
          users={users}
          currentUser={currentUser}
          onClose={() => setEditing(null)}
          onSave={saveTask}
          onDelete={deleteTask}
        />
      ) : null}
    </DashboardLayout>
  );
}

function TaskCard({ task, scope, currentUserId, onOpen, onMove, onDragStart, onDragEnd }) {
  const due = dueLabel(task);
  const priority = PRIORITY[task.priority] || PRIORITY.medium;
  const showAssignee = scope !== "mine" || task.assigned_to !== currentUserId;

  return (
    <article
      draggable={task.can_change_status}
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = "move";
        onDragStart();
      }}
      onDragEnd={onDragEnd}
      className={`lift-3d group rounded-xl border border-slate-200 bg-white p-3 hover:border-primary/40 ${
        task.status === "done" ? "opacity-80" : ""
      } ${task.can_change_status ? "cursor-grab active:cursor-grabbing" : ""}`}
    >
      <button type="button" onClick={onOpen} className="block w-full text-left">
        <div className="flex items-start justify-between gap-2">
          <h3 className={`text-sm font-bold text-slate-900 ${task.status === "done" ? "line-through decoration-slate-400" : ""}`}>
            {task.title}
          </h3>
          <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase ${priority.className}`}>
            {priority.label}
          </span>
        </div>
        {task.description ? <p className="mt-1 line-clamp-2 text-xs text-slate-500">{task.description}</p> : null}
        <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
          {due ? (
            <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${due.tone}`}>
              <CalendarDaysIcon className="h-3.5 w-3.5" /> {due.text}
            </span>
          ) : null}
          {showAssignee ? (
            <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-slate-600">
              <UserAvatar
                user={{ username: task.assigned_to_name, image_url: task.assigned_to_image_url }}
                className="h-5 w-5 !rounded-full text-[9px]"
                iconClassName="h-3 w-3"
              />
              {task.assigned_to === currentUserId ? "You" : task.assigned_to_name}
            </span>
          ) : task.created_by !== currentUserId ? (
            <span className="text-[11px] text-slate-500">from {task.created_by_name}</span>
          ) : null}
        </div>
      </button>

      {task.can_change_status ? (
        <div className="mt-2.5 flex gap-1.5 border-t border-slate-100 pt-2.5">
          {task.status === "todo" ? (
            <QuickButton icon={PlayIcon} label="Start" onClick={() => onMove("in_progress")} />
          ) : null}
          {task.status !== "done" ? (
            <QuickButton icon={CheckCircleIcon} label="Done" tone="emerald" onClick={() => onMove("done")} />
          ) : (
            <QuickButton icon={ArrowUturnLeftIcon} label="Reopen" onClick={() => onMove("todo")} />
          )}
        </div>
      ) : null}
    </article>
  );
}

function QuickButton({ icon: Icon, label, onClick, tone }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-xs font-semibold transition ${
        tone === "emerald"
          ? "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
          : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
      }`}
    >
      <Icon className="h-3.5 w-3.5" /> {label}
    </button>
  );
}

function TaskModal({ task, users, currentUser, onClose, onSave, onDelete }) {
  const readOnly = task && !task.can_edit;
  const [form, setForm] = useState(() =>
    task
      ? {
          title: task.title,
          description: task.description || "",
          priority: task.priority,
          due_date: task.due_date || "",
          assigned_to: String(task.assigned_to),
          status: task.status,
        }
      : { ...emptyForm, assigned_to: String(currentUser?.id || "") }
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    if (!readOnly && !form.title.trim()) {
      setError("Give the task a title.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await onSave(form, task);
      onClose();
    } catch (err) {
      setError(getApiError(err, "Could not save the task."));
    } finally {
      setSaving(false);
    }
  };

  const people = [{ id: currentUser?.id, username: `${currentUser?.username || "Me"} (me)` }, ...users];

  return (
    <div className="fixed inset-0 z-[120] flex items-end justify-center bg-slate-950/60 p-0 sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-label={task ? "Edit task" : "New task"}>
      <form onSubmit={submit} className="flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <h2 className="text-lg font-bold text-slate-950">{task ? (readOnly ? "Task" : "Edit task") : "New task"}</h2>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100" aria-label="Close">
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4 overflow-y-auto px-5 py-4">
          {error ? <p className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{error}</p> : null}
          {readOnly ? (
            <p className="rounded-lg border border-sky-200 bg-sky-50 p-3 text-sm text-sky-800">
              {task.created_by_name} assigned this to you. You can change its status.
            </p>
          ) : null}

          <label className="block">
            <span className="field-label">Title</span>
            <input value={form.title} onChange={set("title")} disabled={readOnly} maxLength={200} className="input" placeholder="What needs doing?" autoFocus={!task} />
          </label>
          <label className="block">
            <span className="field-label">Details</span>
            <textarea value={form.description} onChange={set("description")} disabled={readOnly} rows={4} maxLength={4000} className="input" placeholder="Optional notes, links or steps" />
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="field-label">Assign to</span>
              <select value={form.assigned_to} onChange={set("assigned_to")} disabled={readOnly} className="input">
                {people.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.username}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="field-label">Due date</span>
              <input type="date" value={form.due_date} onChange={set("due_date")} disabled={readOnly} className="input" />
            </label>
          </div>

          <div>
            <span className="field-label">Priority</span>
            <div className="grid grid-cols-3 gap-2">
              {["low", "medium", "high"].map((p) => (
                <button
                  key={p}
                  type="button"
                  disabled={readOnly}
                  onClick={() => setForm((f) => ({ ...f, priority: p }))}
                  aria-pressed={form.priority === p}
                  className={`rounded-lg border px-3 py-2 text-sm font-semibold transition disabled:opacity-60 ${
                    form.priority === p ? PRIORITY[p].className : "border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {PRIORITY[p].label}
                </button>
              ))}
            </div>
          </div>

          {task ? (
            <div>
              <span className="field-label">Status</span>
              <div className="grid grid-cols-3 gap-2">
                {COLUMNS.map((c) => (
                  <button
                    key={c.status}
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, status: c.status }))}
                    aria-pressed={form.status === c.status}
                    className={`rounded-lg border px-2 py-2 text-sm font-semibold transition ${
                      form.status === c.status ? "border-primary bg-primary/10 text-primary-dark" : "border-slate-200 text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </div>

        <div className="flex items-center justify-between gap-2 border-t border-slate-200 px-5 py-4">
          {task?.can_edit ? (
            <button type="button" onClick={() => onDelete(task)} className="inline-flex items-center gap-1.5 rounded-lg px-2 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-50">
              <TrashIcon className="h-4 w-4" /> Delete
            </button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="btn btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="btn btn-primary disabled:opacity-60">
              {saving ? "Saving…" : task ? "Save" : "Create task"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
