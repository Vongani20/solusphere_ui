import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRightIcon,
  CalendarDaysIcon,
  CheckCircleIcon,
  CloudArrowUpIcon,
  DocumentChartBarIcon,
  ExclamationTriangleIcon,
  SparklesIcon,
  UserCircleIcon,
  UserGroupIcon,
} from "@heroicons/react/24/outline";
import DashboardLayout from "../components/DashboardLayout";
import api, { getApiError, getStoredUser } from "../services/api";
import { formatDate, statusTone, titleize } from "../utils/formatters";

export default function Dashboard() {
  const [profile, setProfile] = useState(() => getStoredUser());
  const [analyses, setAnalyses] = useState([]);
  const [events, setEvents] = useState([]);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let mounted = true;

    async function loadDashboard() {
      const [profileResult, analysesResult, eventsResult] = await Promise.allSettled([
        api.get("/profile"),
        api.get("/bpo/analyses", { params: { limit: 5 } }),
        api.get("/events"),
      ]);

      if (!mounted) return;

      if (profileResult.status === "fulfilled") {
        setProfile(profileResult.value.data.user);
      }
      if (analysesResult.status === "fulfilled") {
        setAnalyses(analysesResult.value.data.analyses || []);
      }
      if (eventsResult.status === "fulfilled") {
        setEvents(eventsResult.value.data.events || []);
      }

      const blocked = [analysesResult, eventsResult].find(
        (result) => result.status === "rejected" && result.reason?.response?.data?.face_required
      );
      if (blocked) {
        setNotice(getApiError(blocked.reason, "Complete face setup before using protected tools."));
      }
    }

    loadDashboard();
    return () => {
      mounted = false;
    };
  }, []);

  const completedAnalyses = useMemo(
    () => analyses.filter((item) => item.status === "completed").length,
    [analyses]
  );

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-7xl space-y-6">
        {notice && (
          <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-amber-900">
            <ExclamationTriangleIcon className="mt-0.5 h-5 w-5 shrink-0" />
            <div className="min-w-0">
              <p className="font-semibold">Face setup is pending</p>
              <p className="mt-1 text-sm">{notice}</p>
              <Link to="/profile" className="mt-3 inline-flex items-center gap-2 text-sm font-bold text-amber-900">
                Open profile <ArrowRightIcon className="h-4 w-4" />
              </Link>
            </div>
          </div>
        )}

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            icon={UserCircleIcon}
            label="Current user"
            value={profile?.username || "Loading"}
            detail={profile?.role ? titleize(profile.role) : profile?.email || "Signed in"}
            accent="page-icon-dark"
          />
          <MetricCard
            icon={CheckCircleIcon}
            label="Face status"
            value={profile?.face_status ? "Verified" : "Pending"}
            detail={profile?.face_status ? "Biometric login is active" : "Registration required"}
            accent={profile?.face_status ? "page-icon" : "bg-[#b07d20]"}
          />
          <MetricCard
            icon={DocumentChartBarIcon}
            label="Recent analyses"
            value={String(analyses.length)}
            detail={`${completedAnalyses} completed`}
            accent="page-icon"
          />
          <MetricCard
            icon={CalendarDaysIcon}
            label="Active events"
            value={String(events.length)}
            detail={events[0]?.title || "No events loaded"}
            accent="page-icon-accent"
          />
        </section>

        <section>
          <div className="card">
            <div className="mb-5 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-xs font-bold text-heading">Quick Actions</h2>
                <p className="text-[9px] font-medium text-muted">Jump into active backend tools</p>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <ActionLink to="/bpo" icon={DocumentChartBarIcon} label="Analyze PDF" />
              <ActionLink to="/uploads" icon={CloudArrowUpIcon} label="Upload File" />
              <ActionLink to="/user-chat" icon={UserGroupIcon} label="User Chat" />
              <ActionLink to="/events" icon={CalendarDaysIcon} label="Event Chat" />
              <ActionLink to="/chatbot" icon={SparklesIcon} label="SIA Chat" />
            </div>
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-2">
          <div className="card">
            <div className="mb-5 flex items-center justify-between gap-3">
              <h2 className="text-[11px] font-bold text-heading">Recent BPO Analyses</h2>
              <Link to="/bpo" className="text-[9px] font-semibold text-primary hover:text-primary-dark">
                View all
              </Link>
            </div>

            <div className="space-y-3">
              {analyses.length === 0 ? (
                <EmptyState text="No analyses yet" />
              ) : (
                analyses.map((analysis) => (
                  <div key={analysis.id} className="list-row">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-[11px] font-semibold text-heading">{analysis.filename}</p>
                        <p className="mt-1 text-[9px] text-muted">{formatDate(analysis.created_at)}</p>
                      </div>
                      <span className={`shrink-0 ${statusTone(analysis.status)}`}>
                        {analysis.status || "pending"}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="card">
            <div className="mb-5 flex items-center justify-between gap-3">
              <h2 className="text-[11px] font-bold text-heading">Events</h2>
              <Link to="/events" className="text-[9px] font-semibold text-primary hover:text-primary-dark">
                Open chat
              </Link>
            </div>

            <div className="space-y-3">
              {events.length === 0 ? (
                <EmptyState text="No events loaded" />
              ) : (
                events.slice(0, 5).map((event) => (
                  <div key={event.id} className="list-row">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-[11px] font-semibold text-heading">{event.title}</p>
                        <p className="mt-1 line-clamp-2 text-[9px] text-muted">{event.description || "No description"}</p>
                      </div>
                      <span className={`shrink-0 ${statusTone(event.status)}`}>
                        {event.status}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </section>
      </div>
    </DashboardLayout>
  );
}

function MetricCard({ icon: Icon, label, value, detail, accent }) {
  return (
    <div className="card">
      <div className="mb-2 flex items-center gap-2">
        <div className={`flex h-[30px] w-[30px] items-center justify-center rounded-md text-white ${accent}`}>
          <Icon className="h-4 w-4" />
        </div>
        <p className="text-[9px] font-medium text-muted">{label}</p>
      </div>
      <p className="truncate text-sm font-bold text-heading">{value}</p>
      <p className="mt-1 truncate text-[9px] text-muted">{detail}</p>
    </div>
  );
}

function ActionLink({ to, icon: Icon, label }) {
  return (
    <Link
      to={to}
      className="flex items-center justify-between gap-3 rounded-md border border-border-ui px-3 py-2 text-[10px] font-semibold text-nav-idle hover:border-primary/30 hover:bg-primary/5"
    >
      <span className="flex items-center gap-2">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </span>
      <span className="font-bold text-primary">→</span>
    </Link>
  );
}

function EmptyState({ text }) {
  return (
    <div className="rounded-md border border-dashed border-border-muted bg-sidebar p-5 text-center text-[10px] font-medium text-muted">
      {text}
    </div>
  );
}
