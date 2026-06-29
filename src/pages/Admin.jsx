import React, { useEffect, useMemo, useState } from "react";
import {
  ArrowDownTrayIcon,
  ArrowPathIcon,
  CalendarDaysIcon,
  ClockIcon,
  DocumentTextIcon,
  EnvelopeIcon,
  PencilSquareIcon,
  PhoneIcon,
  PhotoIcon,
  PlusIcon,
  ShieldCheckIcon,
  TicketIcon,
  TrashIcon,
  UserIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import DashboardLayout from "../components/DashboardLayout";
import api, { getApiError, saveSession } from "../services/api";
import { resolveImageUrl } from "../utils/assets";
import { formatDate, formatDateOnly, statusTone, titleize } from "../utils/formatters";

const emptyUserForm = {
  username: "",
  email: "",
  phone_number: "",
  password: "",
  role: "user",
};

const emptyEventForm = {
  title: "",
  description: "",
  image_url: "",
  status: "active",
};

const emptyTicketForm = {
  subject: "",
  description: "",
  status: "open",
};

const tabs = [
  { id: "users", label: "Users", icon: UserIcon },
  { id: "events", label: "Events", icon: CalendarDaysIcon },
  { id: "helpdesk", label: "Helpdesk", icon: TicketIcon },
  { id: "login-audit", label: "Login Audit", icon: ClockIcon },
  { id: "cvs", label: "CV Management", icon: DocumentTextIcon },
];

export default function Admin() {
  const [profile, setProfile] = useState(null);
  const [users, setUsers] = useState([]);
  const [events, setEvents] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [activeTab, setActiveTab] = useState("users");
  const [loading, setLoading] = useState(false);
  const [bootstrapping, setBootstrapping] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [userForm, setUserForm] = useState(emptyUserForm);
  const [editingUserID, setEditingUserID] = useState(null);
  const [savingUser, setSavingUser] = useState(false);
  const [deletingUserID, setDeletingUserID] = useState(null);

  const [eventForm, setEventForm] = useState(emptyEventForm);
  const [editingEventID, setEditingEventID] = useState(null);
  const [eventImageFile, setEventImageFile] = useState(null);
  const [eventImagePreview, setEventImagePreview] = useState("");
  const [eventFileInputKey, setEventFileInputKey] = useState(0);
  const [savingEvent, setSavingEvent] = useState(false);
  const [deletingEventID, setDeletingEventID] = useState(null);

  const [ticketForm, setTicketForm] = useState(emptyTicketForm);
  const [editingTicketID, setEditingTicketID] = useState(null);
  const [savingTicket, setSavingTicket] = useState(false);
  const [deletingTicketID, setDeletingTicketID] = useState(null);

  const [cvs, setCvs] = useState([]);
  const [cvTotalCount, setCvTotalCount] = useState(0);
  const [cvSearchSkill, setCvSearchSkill] = useState("");
  const [cvSearchQualification, setCvSearchQualification] = useState("");
  const [cvSearchQuery, setCvSearchQuery] = useState("");
  const [cvSearchMatch, setCvSearchMatch] = useState("all");
  const [loadingCvs, setLoadingCvs] = useState(false);
  const [selectedCv, setSelectedCv] = useState(null);
  const [downloadingCvId, setDownloadingCvId] = useState(null);

  const [loginAudits, setLoginAudits] = useState([]);
  const [loginAuditPagination, setLoginAuditPagination] = useState(null);
  const [loadingLoginAudits, setLoadingLoginAudits] = useState(false);
  const [loginAuditEmail, setLoginAuditEmail] = useState("");
  const [loginAuditStatus, setLoginAuditStatus] = useState("");
  const [loginAuditMethod, setLoginAuditMethod] = useState("");
  const [loginAuditPage, setLoginAuditPage] = useState(1);

  const selectedUser = useMemo(
    () => users.find((user) => user.id === editingUserID),
    [editingUserID, users]
  );
  const selectedEvent = useMemo(
    () => events.find((event) => event.id === editingEventID),
    [editingEventID, events]
  );
  const selectedTicket = useMemo(
    () => tickets.find((ticket) => ticket.id === editingTicketID),
    [editingTicketID, tickets]
  );
  const usersByID = useMemo(() => {
    return users.reduce((map, user) => {
      map.set(String(user.id), user);
      return map;
    }, new Map());
  }, [users]);

  const loadAdminContext = async () => {
    setLoading(true);
    setError("");

    const [profileRes, usersRes, eventsRes, ticketsRes, cvsRes] = await Promise.allSettled([
      api.get("/profile"),
      api.get("/admin/users"),
      api.get("/events"),
      api.get("/admin/helpdesk"),
      api.get("/admin/cvs"),
    ]);

    if (profileRes.status === "fulfilled") {
      setProfile(profileRes.value.data.user);
      saveSession({ user: profileRes.value.data.user });
    }
    if (usersRes.status === "fulfilled") {
      setUsers(usersRes.value.data.users || []);
    }
    if (eventsRes.status === "fulfilled") {
      setEvents(eventsRes.value.data.events || []);
    }
    if (ticketsRes.status === "fulfilled") {
      setTickets(ticketsRes.value.data.tickets || []);
    }
    if (cvsRes.status === "fulfilled") {
      const allCvs = cvsRes.value.data.cvs || [];
      setCvTotalCount(allCvs.length);
    }

    const failed = [profileRes, usersRes, eventsRes, ticketsRes].find((result) => result.status === "rejected");
    if (failed) {
      setError(getApiError(failed.reason, "Failed to load admin data."));
    }

    setLoading(false);
  };

  useEffect(() => {
    loadAdminContext();
  }, []);

  useEffect(() => {
    return () => {
      if (eventImagePreview && eventImagePreview.startsWith("blob:")) {
        URL.revokeObjectURL(eventImagePreview);
      }
    };
  }, [eventImagePreview]);

  useEffect(() => {
    if (activeTab === "cvs" && cvs.length === 0) loadCvs();
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === "login-audit") loadLoginAudits();
  }, [activeTab, loginAuditPage]);

  const viewUserLoginHistory = (user) => {
    setLoginAuditEmail(user.email || "");
    setLoginAuditStatus("");
    setLoginAuditMethod("");
    setLoginAuditPage(1);
    setActiveTab("login-audit");
  };

  const loadLoginAudits = async () => {
    setLoadingLoginAudits(true);
    setError("");
    try {
      const res = await api.get("/admin/login-audit", {
        params: {
          page: loginAuditPage,
          limit: 50,
          email: loginAuditEmail || undefined,
          status: loginAuditStatus || undefined,
          method: loginAuditMethod || undefined,
        },
      });
      setLoginAudits(res.data.logs || []);
      setLoginAuditPagination(res.data.pagination || null);
    } catch (err) {
      setError(getApiError(err, "Failed to load login audit logs."));
    } finally {
      setLoadingLoginAudits(false);
    }
  };

  const loadCvs = async () => {
    setLoadingCvs(true);
    setError("");
    try {
      const res = await api.get("/admin/cvs", {
        params: {
          skill: cvSearchSkill || undefined,
          qualification: cvSearchQualification || undefined,
          q: cvSearchQuery || undefined,
          match: cvSearchMatch || "all",
        },
      });
      const rows = res.data.cvs || [];
      setCvs(rows);
      if (!cvSearchSkill && !cvSearchQualification && !cvSearchQuery) {
        setCvTotalCount(rows.length);
      }
    } catch (err) {
      showError(err, "Failed to load CVs.");
    } finally {
      setLoadingCvs(false);
    }
  };

  const clearCvSearch = async () => {
    setCvSearchSkill("");
    setCvSearchQualification("");
    setCvSearchQuery("");
    setCvSearchMatch("all");
    setLoadingCvs(true);
    setError("");
    try {
      const res = await api.get("/admin/cvs");
      const rows = res.data.cvs || [];
      setCvs(rows);
      setCvTotalCount(rows.length);
    } catch (err) {
      showError(err, "Failed to load CVs.");
    } finally {
      setLoadingCvs(false);
    }
  };

  const viewCv = async (userId) => {
    setError("");
    try {
      const res = await api.get(`/admin/cvs/${userId}`);
      setSelectedCv(res.data.cv);
    } catch (err) {
      showError(err, "Failed to load CV detail.");
    }
  };

  const downloadCvPdf = async (userId, name) => {
    setDownloadingCvId(userId);
    try {
      const res = await api.get(`/admin/cvs/${userId}/download`, { responseType: "blob" });
      const url = URL.createObjectURL(new Blob([res.data], { type: "application/pdf" }));
      const a = document.createElement("a");
      a.href = url;
      a.download = `${name || "cv"}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      showError(err, "PDF download failed.");
    } finally {
      setDownloadingCvId(null);
    }
  };

  const showSuccess = (text) => {
    setMessage(text);
    setError("");
  };

  const showError = (err, fallback) => {
    setError(getApiError(err, fallback));
    setMessage("");
  };

  const resetUserForm = () => {
    setUserForm(emptyUserForm);
    setEditingUserID(null);
  };

  const editUser = (user) => {
    setActiveTab("users");
    setEditingUserID(user.id);
    setUserForm({
      username: user.username || "",
      email: user.email || "",
      phone_number: user.phone_number || "",
      password: "",
      role: user.role || "user",
    });
  };

  const submitUser = async (event) => {
    event.preventDefault();
    setSavingUser(true);
    setError("");
    setMessage("");

    const payload = {
      username: userForm.username.trim(),
      email: userForm.email.trim(),
      phone_number: userForm.phone_number.trim(),
      role: userForm.role,
    };
    if (!editingUserID || userForm.password.trim()) {
      payload.password = userForm.password;
    }

    try {
      const res = editingUserID
        ? await api.patch(`/admin/users/${editingUserID}`, payload)
        : await api.post("/admin/users", payload);
      const savedUser = res.data.user;
      if (savedUser) {
        setUsers((items) =>
          editingUserID
            ? items.map((item) => (item.id === savedUser.id ? savedUser : item))
            : [savedUser, ...items.filter((item) => item.id !== savedUser.id)]
        );
      }
      showSuccess(editingUserID ? "User updated." : "User created.");
      resetUserForm();
    } catch (err) {
      showError(err, editingUserID ? "Failed to update user." : "Failed to create user.");
    } finally {
      setSavingUser(false);
    }
  };

  const deleteUser = async (user) => {
    if (!window.confirm(`Delete ${user.username}?`)) return;
    setDeletingUserID(user.id);
    setError("");
    setMessage("");

    try {
      await api.delete(`/admin/users/${user.id}`);
      setUsers((items) => items.filter((item) => item.id !== user.id));
      if (editingUserID === user.id) resetUserForm();
      showSuccess("User deleted.");
    } catch (err) {
      showError(err, "Failed to delete user.");
    } finally {
      setDeletingUserID(null);
    }
  };

  const resetEventForm = () => {
    setEventForm(emptyEventForm);
    setEditingEventID(null);
    setEventImageFile(null);
    if (eventImagePreview && eventImagePreview.startsWith("blob:")) {
      URL.revokeObjectURL(eventImagePreview);
    }
    setEventImagePreview("");
    setEventFileInputKey((value) => value + 1);
  };

  const editEvent = (item) => {
    setActiveTab("events");
    setEditingEventID(item.id);
    setEventForm({
      title: item.title || "",
      description: item.description || "",
      image_url: item.image_url || "",
      status: item.status || "active",
    });
    setEventImageFile(null);
    if (eventImagePreview && eventImagePreview.startsWith("blob:")) {
      URL.revokeObjectURL(eventImagePreview);
    }
    setEventImagePreview(resolveImageUrl(item.image_url));
    setEventFileInputKey((value) => value + 1);
  };

  const handleEventImage = (event) => {
    const file = event.target.files?.[0] || null;
    if (eventImagePreview && eventImagePreview.startsWith("blob:")) {
      URL.revokeObjectURL(eventImagePreview);
    }
    setEventImageFile(file);
    setEventImagePreview(file ? URL.createObjectURL(file) : resolveImageUrl(eventForm.image_url));
  };

  const uploadEventImage = async () => {
    if (!eventImageFile) return eventForm.image_url;

    const formData = new FormData();
    formData.append("file", eventImageFile);
    const uploadRes = await api.post("/upload", formData);
    return uploadRes.data.file_url || "";
  };

  const submitEvent = async (event) => {
    event.preventDefault();
    setSavingEvent(true);
    setError("");
    setMessage("");

    try {
      const imageURL = await uploadEventImage();
      const payload = {
        title: eventForm.title.trim(),
        description: eventForm.description.trim(),
        image_url: imageURL,
        status: eventForm.status,
      };
      const res = editingEventID
        ? await api.patch(`/admin/events/${editingEventID}`, payload)
        : await api.post("/admin/events", payload);
      const savedEvent = res.data.event;
      if (savedEvent) {
        setEvents((items) =>
          editingEventID
            ? items.map((item) => (item.id === savedEvent.id ? savedEvent : item))
            : [savedEvent, ...items.filter((item) => item.id !== savedEvent.id)]
        );
      }
      showSuccess(editingEventID ? "Event updated." : "Event created.");
      resetEventForm();
    } catch (err) {
      showError(err, editingEventID ? "Failed to update event." : "Failed to create event.");
    } finally {
      setSavingEvent(false);
    }
  };

  const deleteEvent = async (item) => {
    if (!window.confirm(`Delete event "${item.title}"?`)) return;
    setDeletingEventID(item.id);
    setError("");
    setMessage("");

    try {
      await api.delete(`/admin/events/${item.id}`);
      setEvents((items) => items.filter((event) => event.id !== item.id));
      if (editingEventID === item.id) resetEventForm();
      showSuccess("Event deleted.");
    } catch (err) {
      showError(err, "Failed to delete event.");
    } finally {
      setDeletingEventID(null);
    }
  };

  const resetTicketForm = () => {
    setTicketForm(emptyTicketForm);
    setEditingTicketID(null);
  };

  const editTicket = (ticket) => {
    setActiveTab("helpdesk");
    setEditingTicketID(ticket.id);
    setTicketForm({
      subject: ticket.subject || "",
      description: ticket.description || "",
      status: ticket.status || "open",
    });
  };

  const submitTicket = async (event) => {
    event.preventDefault();
    setSavingTicket(true);
    setError("");
    setMessage("");

    try {
      const payload = {
        subject: ticketForm.subject.trim(),
        description: ticketForm.description.trim(),
        status: ticketForm.status,
      };
      const res = editingTicketID
        ? await api.patch(`/admin/helpdesk/${editingTicketID}`, payload)
        : await api.post("/helpdesk", {
            subject: payload.subject,
            description: payload.description,
          });
      const savedTicket = res.data.ticket;
      if (savedTicket) {
        setTickets((items) =>
          editingTicketID
            ? items.map((item) => (item.id === savedTicket.id ? savedTicket : item))
            : [savedTicket, ...items.filter((item) => item.id !== savedTicket.id)]
        );
      }
      showSuccess(editingTicketID ? "Helpdesk ticket updated." : "Helpdesk ticket created.");
      resetTicketForm();
    } catch (err) {
      showError(err, editingTicketID ? "Failed to update helpdesk ticket." : "Failed to create helpdesk ticket.");
    } finally {
      setSavingTicket(false);
    }
  };

  const deleteTicket = async (ticket) => {
    if (!window.confirm(`Delete ticket #${ticket.id}?`)) return;
    setDeletingTicketID(ticket.id);
    setError("");
    setMessage("");

    try {
      await api.delete(`/admin/helpdesk/${ticket.id}`);
      setTickets((items) => items.filter((item) => item.id !== ticket.id));
      if (editingTicketID === ticket.id) resetTicketForm();
      showSuccess("Helpdesk ticket deleted.");
    } catch (err) {
      showError(err, "Failed to delete helpdesk ticket.");
    } finally {
      setDeletingTicketID(null);
    }
  };

  const getTicketOwnerName = (ticket) => {
    const directName = ticket.username || ticket.user_name || ticket.email || ticket.user_email;
    if (directName) return directName;

    const owner = usersByID.get(String(ticket.user_id));
    return owner?.username || owner?.email || "Unknown user";
  };

  const bootstrapAdmin = async () => {
    setBootstrapping(true);
    setError("");
    setMessage("");

    try {
      const res = await api.post("/admin/bootstrap");
      showSuccess(res.data.message || "Admin bootstrap complete.");
      await loadAdminContext();
    } catch (err) {
      showError(err, "Admin bootstrap failed.");
    } finally {
      setBootstrapping(false);
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
                  {profile ? `${profile.username} - ${titleize(profile.role)}` : "Loading role"}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={bootstrapAdmin}
                disabled={bootstrapping}
                className="btn btn-secondary inline-flex items-center gap-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <ShieldCheckIcon className="h-5 w-5" />
                {bootstrapping ? "Bootstrapping..." : "Bootstrap"}
              </button>
              <button type="button" onClick={loadAdminContext} className="btn btn-secondary inline-flex items-center gap-2">
                <ArrowPathIcon className={`h-5 w-5 ${loading ? "animate-spin" : ""}`} />
                Refresh
              </button>
            </div>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-4">
            <SummaryTile label="Users" value={users.length} />
            <SummaryTile label="Events" value={events.length} />
            <SummaryTile label="Tickets" value={tickets.length} />
            <SummaryTile label="CVs" value={cvTotalCount} />
          </div>
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

        <div className="flex gap-2 overflow-x-auto rounded-lg border border-slate-200 bg-white p-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`inline-flex shrink-0 items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-bold transition ${
                  active ? "bg-primary text-white" : "text-slate-600 hover:bg-slate-100 hover:text-slate-950"
                }`}
              >
                <Icon className="h-5 w-5" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {activeTab === "users" && (
          <section className="grid gap-6 xl:grid-cols-[0.82fr_1.18fr]">
            <form onSubmit={submitUser} className="card h-fit">
              <FormHeader
                icon={UserIcon}
                title={editingUserID ? "Edit User" : "Create User"}
                detail={selectedUser ? selectedUser.email : "Manage account access and roles"}
                onCancel={editingUserID ? resetUserForm : undefined}
              />
              <div className="grid gap-4 sm:grid-cols-2">
                <AdminInput label="Username" value={userForm.username} onChange={(value) => setUserFormField(setUserForm, "username", value)} icon={UserIcon} required />
                <AdminInput label="Email" type="email" value={userForm.email} onChange={(value) => setUserFormField(setUserForm, "email", value)} icon={EnvelopeIcon} required />
                <AdminInput label="Phone" type="tel" value={userForm.phone_number} onChange={(value) => setUserFormField(setUserForm, "phone_number", value)} icon={PhoneIcon} />
                <AdminInput
                  label={editingUserID ? "New Password" : "Temporary Password"}
                  type="password"
                  value={userForm.password}
                  onChange={(value) => setUserFormField(setUserForm, "password", value)}
                  icon={ShieldCheckIcon}
                  minLength={userForm.password ? 6 : undefined}
                  required={!editingUserID}
                />
                <label className="block sm:col-span-2">
                  <span className="mb-2 block text-sm font-semibold text-slate-700">Role</span>
                  <select value={userForm.role} onChange={(event) => setUserFormField(setUserForm, "role", event.target.value)} className="input bg-white">
                    <option value="user">User</option>
                    <option value="admin">Admin</option>
                  </select>
                </label>
              </div>
              <button
                type="submit"
                disabled={
                  savingUser ||
                  !userForm.username.trim() ||
                  !userForm.email.trim() ||
                  (!editingUserID && userForm.password.length < 6) ||
                  (editingUserID && userForm.password && userForm.password.length < 6)
                }
                className="btn btn-primary mt-5 inline-flex w-full items-center justify-center gap-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <PlusIcon className="h-5 w-5" />
                {savingUser ? "Saving..." : editingUserID ? "Update User" : "Create User"}
              </button>
            </form>

            <DataCard title="Users" detail={`${users.length} records`}>
              <div className="space-y-3">
                {users.length === 0 ? (
                  <EmptyState text={loading ? "Loading users..." : "No users loaded"} />
                ) : (
                  users.map((user) => (
                    <RecordRow
                      key={user.id}
                      title={user.username}
                      detail={user.email}
                      meta={titleize(user.role)}
                      statusKey={user.role}
                      subDetail={user.phone_number || user.auth_provider || "No phone"}
                      placeholderIcon={UserIcon}
                      onEdit={() => editUser(user)}
                      onViewLogins={() => viewUserLoginHistory(user)}
                      onDelete={() => deleteUser(user)}
                      deleting={deletingUserID === user.id}
                      deleteDisabled={profile?.id === user.id}
                    />
                  ))
                )}
              </div>
            </DataCard>
          </section>
        )}

        {activeTab === "events" && (
          <section className="grid gap-6 xl:grid-cols-[0.82fr_1.18fr]">
            <form onSubmit={submitEvent} className="card h-fit">
              <FormHeader
                icon={CalendarDaysIcon}
                title={editingEventID ? "Edit Event" : "Create Event"}
                detail={selectedEvent ? selectedEvent.title : "Manage event media and comment spaces"}
                onCancel={editingEventID ? resetEventForm : undefined}
              />
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-2 block text-sm font-semibold text-slate-700">Title</span>
                  <input
                    type="text"
                    value={eventForm.title}
                    onChange={(event) => setEventFormField("title", event.target.value)}
                    className="input"
                    maxLength={255}
                    required
                  />
                </label>
                <label className="block">
                  <span className="mb-2 block text-sm font-semibold text-slate-700">Status</span>
                  <select value={eventForm.status} onChange={(event) => setEventFormField("status", event.target.value)} className="input bg-white">
                    <option value="active">Active</option>
                    <option value="closed">Closed</option>
                  </select>
                </label>
                <label className="block sm:col-span-2">
                  <span className="mb-2 block text-sm font-semibold text-slate-700">Description</span>
                  <textarea
                    value={eventForm.description}
                    onChange={(event) => setEventFormField("description", event.target.value)}
                    className="input min-h-28 resize-y"
                  />
                </label>
                <label className="block sm:col-span-2">
                  <span className="mb-2 block text-sm font-semibold text-slate-700">Event Image</span>
                  <input
                    key={eventFileInputKey}
                    type="file"
                    accept="image/*"
                    onChange={handleEventImage}
                    className="block w-full rounded-lg border border-slate-300 bg-white text-sm text-slate-700 file:mr-4 file:border-0 file:bg-slate-900 file:px-4 file:py-3 file:text-sm file:font-semibold file:text-white hover:file:bg-slate-700"
                    required={!editingEventID}
                  />
                </label>
                {eventImagePreview && (
                  <div className="flex max-h-80 items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-slate-50 sm:col-span-2">
                    <img src={eventImagePreview} alt="Event preview" className="max-h-80 w-full object-contain" />
                  </div>
                )}
              </div>
              <button
                type="submit"
                disabled={savingEvent || !eventForm.title.trim() || (!editingEventID && !eventImageFile)}
                className="btn btn-primary mt-5 inline-flex w-full items-center justify-center gap-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <PlusIcon className="h-5 w-5" />
                {savingEvent ? "Saving..." : editingEventID ? "Update Event" : "Create Event"}
              </button>
            </form>

            <DataCard title="Events" detail={`${events.length} records`}>
              <div className="space-y-3">
                {events.length === 0 ? (
                  <EmptyState text={loading ? "Loading events..." : "No events loaded"} />
                ) : (
                  events.map((event) => (
                    <RecordRow
                      key={event.id}
                      title={event.title}
                      detail={event.description || "No description"}
                      meta={titleize(event.status)}
                      statusKey={event.status}
                      subDetail={formatDate(event.created_at)}
                      image={resolveImageUrl(event.image_url)}
                      placeholderIcon={PhotoIcon}
                      onEdit={() => editEvent(event)}
                      onDelete={() => deleteEvent(event)}
                      deleting={deletingEventID === event.id}
                    />
                  ))
                )}
              </div>
            </DataCard>
          </section>
        )}

        {activeTab === "helpdesk" && (
          <section className="grid gap-6 xl:grid-cols-[0.82fr_1.18fr]">
            <form onSubmit={submitTicket} className="card h-fit">
              <FormHeader
                icon={TicketIcon}
                title={editingTicketID ? "Edit Ticket" : "Create Ticket"}
                detail={selectedTicket ? `Ticket #${selectedTicket.id}` : "Manage support tickets"}
                onCancel={editingTicketID ? resetTicketForm : undefined}
              />
              <div className="space-y-4">
                <label className="block">
                  <span className="mb-2 block text-sm font-semibold text-slate-700">Subject</span>
                  <input
                    type="text"
                    value={ticketForm.subject}
                    onChange={(event) => setTicketFormField("subject", event.target.value)}
                    className="input"
                    required
                  />
                </label>
                <label className="block">
                  <span className="mb-2 block text-sm font-semibold text-slate-700">Description</span>
                  <textarea
                    value={ticketForm.description}
                    onChange={(event) => setTicketFormField("description", event.target.value)}
                    className="input min-h-36 resize-y"
                    required
                  />
                </label>
                {editingTicketID && (
                  <label className="block">
                    <span className="mb-2 block text-sm font-semibold text-slate-700">Status</span>
                    <select value={ticketForm.status} onChange={(event) => setTicketFormField("status", event.target.value)} className="input bg-white">
                      <option value="open">Open</option>
                      <option value="in_progress">In Progress</option>
                      <option value="resolved">Resolved</option>
                      <option value="closed">Closed</option>
                    </select>
                  </label>
                )}
              </div>
              <button
                type="submit"
                disabled={savingTicket || !ticketForm.subject.trim() || !ticketForm.description.trim()}
                className="btn btn-primary mt-5 inline-flex w-full items-center justify-center gap-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <PlusIcon className="h-5 w-5" />
                {savingTicket ? "Saving..." : editingTicketID ? "Update Ticket" : "Create Ticket"}
              </button>
            </form>

            <DataCard title="Helpdesk Tickets" detail={`${tickets.length} records`}>
              <div className="space-y-3">
                {tickets.length === 0 ? (
                  <EmptyState text={loading ? "Loading tickets..." : "No tickets loaded"} />
                ) : (
                  tickets.map((ticket) => (
                    <RecordRow
                      key={ticket.id}
                      title={`#${ticket.id} ${ticket.subject}`}
                      detail={ticket.description}
                      meta={titleize(ticket.status)}
                      statusKey={ticket.status}
                      subDetail={`${getTicketOwnerName(ticket)} - ${formatDate(ticket.created_at)}`}
                      placeholderIcon={TicketIcon}
                      onEdit={() => editTicket(ticket)}
                      onDelete={() => deleteTicket(ticket)}
                      deleting={deletingTicketID === ticket.id}
                    />
                  ))
                )}
              </div>
            </DataCard>
          </section>
        )}

        {activeTab === "login-audit" && (
          <section className="card space-y-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-slate-950">Login Audit Trail</h2>
                <p className="text-sm text-slate-500">
                  Password and face login attempts across the platform
                </p>
              </div>
              <button
                type="button"
                onClick={loadLoginAudits}
                className="btn btn-secondary inline-flex items-center gap-2"
              >
                <ArrowPathIcon className={`h-5 w-5 ${loadingLoginAudits ? "animate-spin" : ""}`} />
                Refresh
              </button>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-slate-700">Email</span>
                <input
                  type="text"
                  value={loginAuditEmail}
                  onChange={(event) => setLoginAuditEmail(event.target.value)}
                  className="input"
                  placeholder="Search by email"
                />
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-slate-700">Status</span>
                <select
                  value={loginAuditStatus}
                  onChange={(event) => {
                    setLoginAuditStatus(event.target.value);
                    setLoginAuditPage(1);
                  }}
                  className="input bg-white"
                >
                  <option value="">All</option>
                  <option value="success">Success</option>
                  <option value="failed">Failed</option>
                </select>
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-slate-700">Method</span>
                <select
                  value={loginAuditMethod}
                  onChange={(event) => {
                    setLoginAuditMethod(event.target.value);
                    setLoginAuditPage(1);
                  }}
                  className="input bg-white"
                >
                  <option value="">All</option>
                  <option value="password">Password</option>
                  <option value="face">Face</option>
                </select>
              </label>
              <div className="flex items-end">
                <button
                  type="button"
                  onClick={() => {
                    setLoginAuditPage(1);
                    loadLoginAudits();
                  }}
                  className="btn btn-primary w-full"
                >
                  Apply filters
                </button>
              </div>
            </div>

            <DataCard
              title="Login events"
              detail={
                loginAuditPagination
                  ? `${loginAuditPagination.total} total records`
                  : `${loginAudits.length} records`
              }
            >
              {loginAudits.length === 0 ? (
                <EmptyState
                  text={loadingLoginAudits ? "Loading login audit logs..." : "No login events found."}
                />
              ) : (
                <div className="overflow-x-auto rounded-lg border border-slate-200">
                  <table className="min-w-full divide-y divide-slate-200">
                    <thead className="bg-slate-50">
                      <tr>
                        {["When", "User", "Email", "Method", "Status", "IP", "Details"].map((heading) => (
                          <th
                            key={heading}
                            className="whitespace-nowrap px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-500"
                          >
                            {heading}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {loginAudits.map((entry) => (
                        <tr key={entry.id} className="hover:bg-slate-50">
                          <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">
                            {formatDate(entry.created_at)}
                          </td>
                          <td className="px-4 py-3 text-sm font-semibold text-slate-800 whitespace-nowrap">
                            {entry.username || (entry.user_id ? `User #${entry.user_id}` : "—")}
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-600">{entry.email || "—"}</td>
                          <td className="px-4 py-3 text-sm text-slate-700">{titleize(entry.login_method)}</td>
                          <td className="px-4 py-3">
                            <span className={statusTone(entry.status)}>{entry.status}</span>
                          </td>
                          <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">
                            {entry.ip_address || "—"}
                          </td>
                          <td className="px-4 py-3 text-xs text-slate-500 max-w-xs truncate">
                            {entry.failure_reason || "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </DataCard>

            {loginAuditPagination && loginAuditPagination.totalPages > 1 && (
              <div className="flex items-center justify-between gap-3">
                <button
                  type="button"
                  disabled={loginAuditPage <= 1}
                  onClick={() => setLoginAuditPage((value) => Math.max(1, value - 1))}
                  className="btn btn-secondary disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Previous
                </button>
                <p className="text-sm font-semibold text-slate-600">
                  Page {loginAuditPagination.page} of {loginAuditPagination.totalPages}
                </p>
                <button
                  type="button"
                  disabled={loginAuditPage >= loginAuditPagination.totalPages}
                  onClick={() => setLoginAuditPage((value) => value + 1)}
                  className="btn btn-secondary disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            )}
          </section>
        )}

        {activeTab === "cvs" && (
          <section className="space-y-6">
            {/* Search filters */}
            <div className="card">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-white">
                  <DocumentTextIcon className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-950">CV Management</h2>
                  <p className="text-sm text-slate-500">Search and download candidate CVs</p>
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <label className="block">
                  <span className="mb-2 block text-sm font-semibold text-slate-700">Skill</span>
                  <input
                    className="input"
                    value={cvSearchSkill}
                    onChange={(e) => setCvSearchSkill(e.target.value)}
                    placeholder="e.g. Python, SQL"
                    onKeyDown={(e) => e.key === "Enter" && loadCvs()}
                  />
                </label>
                <label className="block">
                  <span className="mb-2 block text-sm font-semibold text-slate-700">Qualification</span>
                  <input
                    className="input"
                    value={cvSearchQualification}
                    onChange={(e) => setCvSearchQualification(e.target.value)}
                    placeholder="e.g. BSc, MBA"
                    onKeyDown={(e) => e.key === "Enter" && loadCvs()}
                  />
                </label>
                <label className="block sm:col-span-2 lg:col-span-1">
                  <span className="mb-2 block text-sm font-semibold text-slate-700">Keyword</span>
                  <input
                    className="input"
                    value={cvSearchQuery}
                    onChange={(e) => setCvSearchQuery(e.target.value)}
                    placeholder="Name, role, experience…"
                    onKeyDown={(e) => e.key === "Enter" && loadCvs()}
                  />
                </label>
                <label className="block">
                  <span className="mb-2 block text-sm font-semibold text-slate-700">Match mode</span>
                  <select
                    className="input"
                    value={cvSearchMatch}
                    onChange={(e) => setCvSearchMatch(e.target.value)}
                  >
                    <option value="all">Match all filters</option>
                    <option value="any">Match any filter</option>
                  </select>
                </label>
              </div>
              <p className="mt-3 text-xs text-slate-500">
                Advanced search scans skills, qualifications, computer skills, languages, experience, profile text, and names.
                Use &quot;Match any&quot; if a strict skill + qualification search returns no results.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={loadCvs}
                  disabled={loadingCvs}
                  className="btn btn-primary inline-flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <ArrowPathIcon className={`h-4 w-4 ${loadingCvs ? "animate-spin" : ""}`} />
                  {loadingCvs ? "Searching…" : "Search"}
                </button>
                <button
                  type="button"
                  onClick={clearCvSearch}
                  className="btn btn-secondary"
                >
                  Clear &amp; show all
                </button>
              </div>
            </div>

            {/* CV list */}
            <div className="card">
              <div className="mb-4 flex items-center justify-between">
                <p className="text-sm text-slate-500">
                  {cvs.length} CV{cvs.length !== 1 ? "s" : ""} found
                  {cvTotalCount > 0 && cvs.length !== cvTotalCount ? ` (${cvTotalCount} total in directory)` : ""}
                </p>
                <button
                  type="button"
                  onClick={loadCvs}
                  className="btn btn-secondary inline-flex items-center gap-2"
                >
                  <ArrowPathIcon className={`h-4 w-4 ${loadingCvs ? "animate-spin" : ""}`} />
                  Refresh
                </button>
              </div>
              {cvs.length === 0 ? (
                <EmptyState
                  text={
                    loadingCvs
                      ? "Loading CVs…"
                      : cvTotalCount === 0
                        ? "No completed CVs in the directory yet."
                        : "No CVs matched these filters. Try Match any, fewer keywords, or Clear & show all."
                  }
                />
              ) : (
                <div className="overflow-hidden rounded-lg border border-slate-200">
                  <table className="min-w-full divide-y divide-slate-200">
                    <thead className="bg-slate-50">
                      <tr>
                        {["Photo", "Name", "Top Skills", "Qualifications", "Updated", "Actions"].map((h) => (
                          <th
                            key={h}
                            className="whitespace-nowrap px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-500"
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {cvs.map((cv) => (
                        <tr key={cv.user_id} className="hover:bg-slate-50">
                          <td className="px-4 py-3">
                            <CvSearchPhoto photoUrl={cv.profile_photo_url} name={`${cv.first_name} ${cv.last_name}`} />
                          </td>
                          <td className="px-4 py-3 text-sm font-semibold text-slate-800 whitespace-nowrap">
                            {cv.first_name} {cv.last_name}
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-600 max-w-xs truncate">
                            {cv.professional_skills?.map((s) => s.skill).filter(Boolean).join(", ") || "—"}
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-600 max-w-xs truncate">
                            {cv.qualifications?.filter(Boolean).join(", ") || "—"}
                          </td>
                          <td className="px-4 py-3 text-xs text-slate-400 whitespace-nowrap">
                            {formatDate(cv.updated_at)}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={() => viewCv(cv.user_id)}
                                className="rounded-lg px-3 py-1.5 text-xs font-semibold text-primary border border-primary hover:bg-primary hover:text-white transition"
                              >
                                View
                              </button>
                              <button
                                type="button"
                                onClick={() => downloadCvPdf(cv.user_id, `${cv.first_name}_${cv.last_name}`)}
                                disabled={downloadingCvId === cv.user_id}
                                className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-semibold bg-slate-800 text-white hover:bg-slate-700 disabled:opacity-50 transition"
                              >
                                <ArrowDownTrayIcon className="h-3.5 w-3.5" />
                                {downloadingCvId === cv.user_id ? "…" : "PDF"}
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* CV detail panel */}
            {selectedCv && (
              <div className="card space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {selectedCv.profile_photo_url ? (
                      <CvSearchPhoto
                        photoUrl={selectedCv.profile_photo_url}
                        name={`${selectedCv.first_name} ${selectedCv.last_name}`}
                        size="lg"
                      />
                    ) : (
                      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-100">
                        <PhotoIcon className="h-7 w-7 text-slate-400" />
                      </div>
                    )}
                    <div>
                      <h3 className="text-lg font-bold text-slate-950">
                        {selectedCv.first_name} {selectedCv.last_name}
                      </h3>
                      <p className="text-sm text-slate-500">
                        {selectedCv.nationality} · {selectedCv.gender} · DOB: {formatDateOnly(selectedCv.date_of_birth)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => downloadCvPdf(selectedCv.user_id, `${selectedCv.first_name}_${selectedCv.last_name}`)}
                      disabled={downloadingCvId === selectedCv.user_id}
                      className="btn btn-primary inline-flex items-center gap-2 disabled:opacity-50"
                    >
                      <ArrowDownTrayIcon className="h-4 w-4" />
                      {downloadingCvId === selectedCv.user_id ? "Downloading…" : "Download PDF"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedCv(null)}
                      className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
                    >
                      <XMarkIcon className="h-5 w-5" />
                    </button>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <CvDetailSection title="Profile">
                    <p className="text-sm text-slate-700">{selectedCv.profile_text || "—"}</p>
                  </CvDetailSection>
                  <CvDetailSection title="Value Proposition">
                    <p className="text-sm text-slate-700">{selectedCv.value_proposition || "—"}</p>
                  </CvDetailSection>
                  <CvDetailSection title="Languages">
                    <CvDetailList items={selectedCv.languages} />
                  </CvDetailSection>
                  <CvDetailSection title="Professional Skills">
                    {selectedCv.professional_skills?.map((s, i) => (
                      <div key={i} className="mb-1">
                        <p className="text-sm font-medium text-slate-800">{s.skill}</p>
                        {s.details?.filter(Boolean).length > 0 && (
                          <p className="text-xs text-slate-500">{s.details.join(", ")}</p>
                        )}
                      </div>
                    ))}
                  </CvDetailSection>
                  <CvDetailSection title="Qualifications">
                    <CvDetailList items={selectedCv.qualifications} />
                  </CvDetailSection>
                  <CvDetailSection title="Computer Skills">
                    <CvDetailList items={selectedCv.computer_skills} />
                  </CvDetailSection>
                  {selectedCv.professional_memberships?.filter(Boolean).length > 0 && (
                    <CvDetailSection title="Memberships">
                      <CvDetailList items={selectedCv.professional_memberships} />
                    </CvDetailSection>
                  )}
                </div>

                {selectedCv.experience?.length > 0 && (
                  <CvDetailSection title="Experience">
                    <div className="space-y-3">
                      {selectedCv.experience.map((exp, i) => (
                        <div key={i} className="rounded-lg border border-slate-100 p-3">
                          <p className="text-sm font-semibold text-slate-800">{exp.company}</p>
                          <p className="text-sm text-slate-600">{exp.position}</p>
                          <p className="text-xs text-slate-400">
                            {exp.period_start} – {exp.period_end || "Present"}
                          </p>
                          {exp.scope_of_work?.filter(Boolean).length > 0 && (
                            <ul className="ml-4 mt-1 list-disc text-xs text-slate-600">
                              {exp.scope_of_work.filter(Boolean).map((s, si) => (
                                <li key={si}>{s}</li>
                              ))}
                            </ul>
                          )}
                        </div>
                      ))}
                    </div>
                  </CvDetailSection>
                )}
              </div>
            )}
          </section>
        )}
      </div>
    </DashboardLayout>
  );

  function setEventFormField(field, value) {
    setEventForm((current) => ({ ...current, [field]: value }));
  }

  function setTicketFormField(field, value) {
    setTicketForm((current) => ({ ...current, [field]: value }));
  }
}

function setUserFormField(setter, field, value) {
  setter((current) => ({ ...current, [field]: value }));
}

function SummaryTile({ label, value }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
      <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-extrabold text-slate-950">{value}</p>
    </div>
  );
}

function FormHeader({ icon: Icon, title, detail, onCancel }) {
  return (
    <div className="mb-5 flex items-start justify-between gap-3">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-white">
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-slate-950">{title}</h2>
          <p className="text-sm text-slate-500">{detail}</p>
        </div>
      </div>
      {onCancel && (
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
          aria-label="Cancel edit"
        >
          <XMarkIcon className="h-5 w-5" />
        </button>
      )}
    </div>
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

function DataCard({ title, detail, children }) {
  return (
    <div className="card">
      <div className="mb-5 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-950">{title}</h2>
          <p className="text-sm text-slate-500">{detail}</p>
        </div>
      </div>
      {children}
    </div>
  );
}

function RecordRow({
  title,
  detail,
  meta,
  statusKey,
  subDetail,
  image,
  placeholderIcon: PlaceholderIcon = PhotoIcon,
  onEdit,
  onViewLogins,
  onDelete,
  deleting,
  deleteDisabled = false,
}) {
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-slate-200 p-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-center gap-3">
        {image ? (
          <span className="flex h-14 w-20 shrink-0 items-center justify-center rounded-lg bg-slate-100">
            <img src={image} alt="" className="max-h-14 max-w-20 rounded-lg object-contain" />
          </span>
        ) : (
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
            <PlaceholderIcon className="h-5 w-5" />
          </span>
        )}
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate text-sm font-bold text-slate-950">{title}</p>
            {meta && <span className={statusTone(statusKey || meta)}>{meta}</span>}
          </div>
          <p className="mt-1 line-clamp-2 text-sm text-slate-500">{detail || "No detail"}</p>
          {subDetail && <p className="mt-1 text-xs font-medium text-slate-400">{subDetail}</p>}
        </div>
      </div>
      <div className="flex shrink-0 gap-2">
        {onViewLogins && (
          <button
            type="button"
            onClick={onViewLogins}
            className="rounded-lg p-2 text-slate-600 hover:bg-primary/10 hover:text-primary"
            aria-label="View login history"
            title="View login history"
          >
            <ClockIcon className="h-5 w-5" />
          </button>
        )}
        <button type="button" onClick={onEdit} className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 hover:text-primary" aria-label="Edit">
          <PencilSquareIcon className="h-5 w-5" />
        </button>
        <button
          type="button"
          onClick={onDelete}
          disabled={deleting || deleteDisabled}
          className="rounded-lg p-2 text-slate-600 hover:bg-rose-50 hover:text-rose-700 disabled:cursor-not-allowed disabled:opacity-40"
          aria-label="Delete"
        >
          <TrashIcon className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}

function EmptyState({ text }) {
  return (
    <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm font-medium text-slate-500">
      {text}
    </div>
  );
}

function CvSearchPhoto({ photoUrl, name, size = "sm" }) {
  const [failed, setFailed] = useState(false);
  const src = resolveImageUrl(photoUrl);
  const classes = size === "lg" ? "h-14 w-14 border-2" : "h-10 w-10 border";

  if (!src || failed) {
    return (
      <div className={`flex ${classes} items-center justify-center rounded-full border-slate-200 bg-slate-100`}>
        <PhotoIcon className={`${size === "lg" ? "h-7 w-7" : "h-5 w-5"} text-slate-400`} />
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={name ? `${name} profile` : "Profile"}
      className={`${classes} rounded-full object-cover border-slate-200`}
      onError={() => setFailed(true)}
    />
  );
}

function CvDetailSection({ title, children }) {
  return (
    <div className="rounded-lg border border-slate-100 bg-slate-50 p-3">
      <p className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-400">{title}</p>
      {children}
    </div>
  );
}

function CvDetailList({ items }) {
  const filtered = (items || []).filter(Boolean);
  if (!filtered.length) return <p className="text-xs text-slate-400">None</p>;
  return (
    <ul className="list-disc ml-4 space-y-0.5 text-sm text-slate-700">
      {filtered.map((item, i) => (
        <li key={i}>{item}</li>
      ))}
    </ul>
  );
}
