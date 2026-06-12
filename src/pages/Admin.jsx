import React, { useEffect, useState } from "react";
import {
  ArrowPathIcon,
  CalendarDaysIcon,
  EnvelopeIcon,
  PlusIcon,
  PhotoIcon,
  PhoneIcon,
  ShieldCheckIcon,
  UserIcon,
} from "@heroicons/react/24/outline";
import DashboardLayout from "../components/DashboardLayout";
import api, { getApiError, saveSession } from "../services/api";
import { resolveImageUrl } from "../utils/assets";
import { formatDate, statusTone, titleize } from "../utils/formatters";

export default function Admin() {
  const [profile, setProfile] = useState(null);
  const [events, setEvents] = useState([]);
  const [users, setUsers] = useState([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [eventImageFile, setEventImageFile] = useState(null);
  const [eventImagePreview, setEventImagePreview] = useState("");
  const [targetUserID, setTargetUserID] = useState("");
  const [targetRole, setTargetRole] = useState("admin");
  const [newUsername, setNewUsername] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPhoneNumber, setNewPhoneNumber] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newUserRole, setNewUserRole] = useState("user");
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [creatingUser, setCreatingUser] = useState(false);
  const [updatingRole, setUpdatingRole] = useState(false);
  const [bootstrapping, setBootstrapping] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const loadAdminContext = async () => {
    setLoading(true);
    setError("");

    try {
      const [profileRes, eventsRes, usersRes] = await Promise.allSettled([
        api.get("/profile"),
        api.get("/events"),
        api.get("/users"),
      ]);

      if (profileRes.status === "fulfilled") {
        setProfile(profileRes.value.data.user);
        saveSession({ user: profileRes.value.data.user });
      }
      if (eventsRes.status === "fulfilled") {
        setEvents(eventsRes.value.data.events || []);
      }
      if (usersRes.status === "fulfilled") {
        setUsers(usersRes.value.data.users || []);
      }
    } catch (err) {
      setError(getApiError(err, "Failed to load admin data."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAdminContext();
  }, []);

  useEffect(() => {
    return () => {
      if (eventImagePreview) URL.revokeObjectURL(eventImagePreview);
    };
  }, [eventImagePreview]);

  const handleEventImage = (event) => {
    const file = event.target.files?.[0] || null;
    if (eventImagePreview) URL.revokeObjectURL(eventImagePreview);
    setEventImageFile(file);
    setEventImagePreview(file ? URL.createObjectURL(file) : "");
  };

  const bootstrapAdmin = async () => {
    setBootstrapping(true);
    setMessage("");
    setError("");

    try {
      const res = await api.post("/admin/bootstrap");
      setMessage(res.data.message || "Admin bootstrap complete.");
      await loadAdminContext();
    } catch (err) {
      setError(getApiError(err, "Admin bootstrap failed."));
    } finally {
      setBootstrapping(false);
    }
  };

  const createEvent = async (submitEvent) => {
    submitEvent.preventDefault();
    const form = submitEvent.currentTarget;
    setCreating(true);
    setMessage("");
    setError("");

    try {
      let uploadedImageURL = "";

      if (eventImageFile) {
        const formData = new FormData();
        formData.append("file", eventImageFile);
        const uploadRes = await api.post("/upload", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        uploadedImageURL = uploadRes.data.file_url || "";
      }

      const res = await api.post("/admin/events", {
        title: title.trim(),
        description: description.trim(),
        image_url: uploadedImageURL,
      });
      setMessage("Event created.");
      setEvents((items) => [res.data.event, ...items]);
      setTitle("");
      setDescription("");
      setEventImageFile(null);
      if (eventImagePreview) URL.revokeObjectURL(eventImagePreview);
      setEventImagePreview("");
      form.reset();
    } catch (err) {
      setError(getApiError(err, "Failed to create event."));
    } finally {
      setCreating(false);
    }
  };

  const createUser = async (event) => {
    event.preventDefault();
    setCreatingUser(true);
    setMessage("");
    setError("");

    try {
      const res = await api.post("/admin/users", {
        username: newUsername.trim(),
        email: newEmail.trim(),
        phone_number: newPhoneNumber.trim(),
        password: newPassword,
        role: newUserRole,
      });
      const createdUser = res.data.user;
      setMessage(`${createdUser?.username || "User"} created successfully.`);
      if (createdUser) {
        setUsers((items) => [createdUser, ...items.filter((item) => item.id !== createdUser.id)]);
      }
      setNewUsername("");
      setNewEmail("");
      setNewPhoneNumber("");
      setNewPassword("");
      setNewUserRole("user");
    } catch (err) {
      setError(getApiError(err, "Failed to create user."));
    } finally {
      setCreatingUser(false);
    }
  };

  const updateRole = async (event) => {
    event.preventDefault();
    setUpdatingRole(true);
    setMessage("");
    setError("");

    try {
      const res = await api.patch(`/admin/users/${targetUserID}/role`, { role: targetRole });
      const updatedUser = res.data.user;
      setMessage(
        updatedUser
          ? `${updatedUser.username} is now ${titleize(updatedUser.role)}.`
          : res.data.message || "User role updated."
      );
      if (updatedUser) {
        setUsers((items) => items.map((item) => (item.id === updatedUser.id ? { ...item, ...updatedUser } : item)));
      }
      setTargetUserID("");
    } catch (err) {
      setError(getApiError(err, "Failed to update user role."));
    } finally {
      setUpdatingRole(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="card">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-slate-900 text-white">
                <ShieldCheckIcon className="h-7 w-7" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-950">Admin Console</h1>
                <p className="text-sm text-slate-500">
                  {profile ? `${profile.username} - ${profile.role}` : "Loading role"}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={loadAdminContext}
              className="btn btn-secondary inline-flex items-center gap-2"
            >
              <ArrowPathIcon className={`h-5 w-5 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </button>
          </div>

          {profile?.role !== "admin" && (
            <div className="mt-5 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
              <p className="font-bold">Admin access is not active for this account.</p>
              <p className="mt-1">Bootstrap is available only while no admin user exists.</p>
            </div>
          )}
        </section>

        {(message || error) && (
          <div
            className={`rounded-lg border p-4 text-sm font-semibold ${
              error
                ? "border-rose-200 bg-rose-50 text-rose-800"
                : "border-emerald-200 bg-emerald-50 text-emerald-800"
            }`}
          >
            {error || message}
          </div>
        )}

        <section className="grid gap-6 lg:grid-cols-3">
          <div className="card">
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-600 text-white">
                <ShieldCheckIcon className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-950">Bootstrap</h2>
                <p className="text-sm text-slate-500">First admin setup</p>
              </div>
            </div>
            <button
              type="button"
              onClick={bootstrapAdmin}
              disabled={bootstrapping}
              className="btn btn-primary inline-flex w-full items-center justify-center gap-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <ShieldCheckIcon className="h-5 w-5" />
              {bootstrapping ? "Bootstrapping..." : "Bootstrap Admin"}
            </button>
          </div>

          <form onSubmit={createUser} className="card lg:col-span-2">
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-white">
                <UserIcon className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-950">Create User</h2>
                <p className="text-sm text-slate-500">Add an account and assign the starting role</p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <AdminInput label="Username" value={newUsername} onChange={setNewUsername} icon={UserIcon} required />
              <AdminInput label="Email" type="email" value={newEmail} onChange={setNewEmail} icon={EnvelopeIcon} required />
              <AdminInput label="Phone Number" type="tel" value={newPhoneNumber} onChange={setNewPhoneNumber} icon={PhoneIcon} />
              <AdminInput
                label="Temporary Password"
                type="password"
                value={newPassword}
                onChange={setNewPassword}
                icon={ShieldCheckIcon}
                minLength={6}
                required
              />
              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-slate-700">Role</span>
                <select value={newUserRole} onChange={(event) => setNewUserRole(event.target.value)} className="input bg-white">
                  <option value="user">User</option>
                  <option value="admin">Admin</option>
                </select>
              </label>
              <div className="flex items-end">
                <button
                  type="submit"
                  disabled={!newUsername.trim() || !newEmail.trim() || newPassword.length < 6 || creatingUser}
                  className="btn btn-primary inline-flex w-full items-center justify-center gap-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <PlusIcon className="h-5 w-5" />
                  {creatingUser ? "Creating..." : "Create User"}
                </button>
              </div>
            </div>
          </form>
        </section>

        <section className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
          <form onSubmit={updateRole} className="card">
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-white">
                <UserIcon className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-950">User Role</h2>
                <p className="text-sm text-slate-500">Select a user by name or email</p>
              </div>
            </div>

            <div className="space-y-4">
              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-slate-700">User</span>
                <select
                  value={targetUserID}
                  onChange={(event) => setTargetUserID(event.target.value)}
                  className="input bg-white"
                  required
                >
                  <option value="">Select user</option>
                  {users.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.username} - {user.email} ({titleize(user.role)})
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-slate-700">Role</span>
                <select
                  value={targetRole}
                  onChange={(event) => setTargetRole(event.target.value)}
                  className="input bg-white"
                >
                  <option value="admin">Admin</option>
                  <option value="user">User</option>
                </select>
              </label>
              <button
                type="submit"
                disabled={!targetUserID || updatingRole}
                className="btn btn-primary inline-flex w-full items-center justify-center gap-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <UserIcon className="h-5 w-5" />
                {updatingRole ? "Updating..." : "Update Role"}
              </button>
            </div>
          </form>

          <form onSubmit={createEvent} className="card">
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-cyan-600 text-white">
                <CalendarDaysIcon className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-950">Create Event</h2>
                <p className="text-sm text-slate-500">Event image and comment workspace</p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-slate-700">Title</span>
                <input
                  type="text"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  className="input"
                  maxLength={255}
                  required
                />
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-slate-700">Event Image</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleEventImage}
                  className="block w-full rounded-lg border border-slate-300 bg-white text-sm text-slate-700 file:mr-4 file:border-0 file:bg-slate-900 file:px-4 file:py-3 file:text-sm file:font-semibold file:text-white hover:file:bg-slate-700"
                  required
                />
              </label>
              <label className="block sm:col-span-2">
                <span className="mb-2 block text-sm font-semibold text-slate-700">Description</span>
                <textarea
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  className="input min-h-32 resize-y"
                />
              </label>
              {eventImagePreview && (
                <div className="flex max-h-80 items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-slate-50 sm:col-span-2">
                  <img src={eventImagePreview} alt="Event preview" className="max-h-80 w-full object-contain" />
                </div>
              )}
              <div className="flex items-end sm:col-span-2">
                <button
                  type="submit"
                  disabled={!title.trim() || !eventImageFile || creating}
                  className="btn btn-primary inline-flex w-full items-center justify-center gap-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <PlusIcon className="h-5 w-5" />
                  {creating ? "Uploading..." : "Create Event"}
                </button>
              </div>
            </div>
          </form>
        </section>

        <section className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
          <div className="card">
            <div className="mb-5 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-slate-950">Users</h2>
                <p className="text-sm text-slate-500">{users.length} users visible</p>
              </div>
            </div>
            <div className="space-y-3">
              {users.length === 0 ? (
                <EmptyState text="No users loaded" />
              ) : (
                users.map((user) => (
                  <div key={user.id} className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 p-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-slate-950">{user.username}</p>
                      <p className="truncate text-xs text-slate-500">{user.email}</p>
                    </div>
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-700 ring-1 ring-slate-200">
                      {titleize(user.role)}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="card">
            <div className="mb-5 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-slate-950">Events</h2>
                <p className="text-sm text-slate-500">{events.length} records visible</p>
              </div>
            </div>

            <div className="overflow-hidden rounded-lg border border-slate-200">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200">
                  <thead className="bg-slate-50">
                    <tr>
                      <TableHead>Title</TableHead>
                      <TableHead>Image</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created</TableHead>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 bg-white">
                    {events.length === 0 ? (
                      <tr>
                        <td colSpan="4" className="px-4 py-10 text-center text-sm font-medium text-slate-500">
                          No events loaded
                        </td>
                      </tr>
                    ) : (
                      events.map((event) => (
                        <tr key={event.id} className="hover:bg-slate-50">
                          <td className="max-w-[320px] px-4 py-3">
                            <p className="truncate text-sm font-semibold text-slate-950">{event.title}</p>
                            <p className="truncate text-xs text-slate-500">{event.description || "No description"}</p>
                          </td>
                          <td className="px-4 py-3">
                            {resolveImageUrl(event.image_url) ? (
                              <span className="flex h-12 w-16 items-center justify-center rounded-lg bg-slate-100">
                                <img src={resolveImageUrl(event.image_url)} alt="" className="max-h-12 max-w-16 rounded-lg object-contain" />
                              </span>
                            ) : (
                              <span className="flex h-12 w-16 items-center justify-center rounded-lg bg-slate-100 text-slate-400">
                                <PhotoIcon className="h-5 w-5" />
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`rounded-full px-2.5 py-1 text-xs font-bold ring-1 ${statusTone(event.status)}`}>
                              {event.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-500">{formatDate(event.created_at)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </section>
      </div>
    </DashboardLayout>
  );
}

function AdminInput({ label, type = "text", value, onChange, icon: Icon, required = false, minLength }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-semibold text-slate-700">{label}</span>
      <span className="relative block">
        <Icon className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
        <input
          type={type}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          minLength={minLength}
          className="input pl-10"
          required={required}
        />
      </span>
    </label>
  );
}

function EmptyState({ text }) {
  return (
    <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm font-medium text-slate-500">
      {text}
    </div>
  );
}

function TableHead({ children }) {
  return (
    <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
      {children}
    </th>
  );
}
