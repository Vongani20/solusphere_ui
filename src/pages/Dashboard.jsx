import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRightIcon,
  ArrowTopRightOnSquareIcon,
  CalendarDaysIcon,
  CheckBadgeIcon,
  ClipboardDocumentListIcon,
  CloudArrowUpIcon,
  DocumentChartBarIcon,
  ExclamationTriangleIcon,
  SparklesIcon,
  UserCircleIcon,
  UserGroupIcon,
} from "@heroicons/react/24/solid";
import BirthdayBoard from "../components/BirthdayBoard";
import DashboardLayout from "../components/DashboardLayout";
import DimensionalIcon from "../components/DimensionalIcon";
import UserAvatar from "../components/UserAvatar";
import { externalTools } from "../data/externalTools";
import api, { getApiError, getStoredUser } from "../services/api";
import { formatDate, titleize } from "../utils/formatters";

const quickActions = [
  { to: "/bpo", icon: DocumentChartBarIcon, label: "Analyze PDF", tone: "teal" },
  { to: "/uploads", icon: CloudArrowUpIcon, label: "Upload File", tone: "amber" },
  { to: "/user-chat", icon: UserGroupIcon, label: "User Chat", tone: "forest" },
  { to: "/events", icon: CalendarDaysIcon, label: "Event Chat", tone: "navy" },
  { to: "/chatbot", icon: SparklesIcon, label: "SIA Chat", tone: "teal" },
  { to: "/rfp-builder", icon: ClipboardDocumentListIcon, label: "Tender Proposal", tone: "forest" },
];

export default function Dashboard() {
  const [profile, setProfile] = useState(() => getStoredUser());
  const [analyses, setAnalyses] = useState([]);
  const [events, setEvents] = useState([]);
  const [birthdays, setBirthdays] = useState([]);
  const [birthdaysToday, setBirthdaysToday] = useState([]);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let mounted = true;

    async function loadDashboard() {
      const [profileResult, analysesResult, eventsResult, birthdaysResult] = await Promise.allSettled([
        api.get("/profile"),
        api.get("/bpo/analyses", { params: { limit: 5 } }),
        api.get("/events"),
        api.get("/birthdays"),
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
      if (birthdaysResult.status === "fulfilled") {
        setBirthdays(birthdaysResult.value.data.birthdays || []);
        setBirthdaysToday(birthdaysResult.value.data.today || []);
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

  const completionRate = analyses.length
    ? Math.round((completedAnalyses / analyses.length) * 100)
    : 0;

  const faceReady = Boolean(profile?.face_status);
  const birthReady = Boolean(profile?.birth_date);
  const readiness = [
    { label: "Face verified", value: faceReady ? 100 : 35, tone: "teal" },
    { label: "Birth date saved", value: birthReady ? 100 : 20, tone: "forest" },
    { label: "Analyses complete", value: completionRate || 12, tone: "amber" },
    { label: "Events live", value: events.length ? Math.min(100, events.length * 20) : 18, tone: "navy" },
  ];

  const activity = useMemo(() => {
    const rows = analyses.slice(0, 4).map((analysis) => ({
      id: `analysis-${analysis.id}`,
      title: analysis.filename || "BPO analysis",
      detail: formatDate(analysis.created_at),
      percent: analysis.status === "completed" ? 100 : analysis.status === "failed" ? 18 : 62,
      badge: analysis.status || "pending",
      tone: analysis.status === "completed" ? "forest" : analysis.status === "failed" ? "rose" : "amber",
    }));

    events.slice(0, 3).forEach((event) => {
      rows.push({
        id: `event-${event.id}`,
        title: event.title || "Event",
        detail: event.description || "Team event",
        percent: event.status === "active" ? 84 : 48,
        badge: event.status || "open",
        tone: "teal",
      });
    });

    return rows.slice(0, 5);
  }, [analyses, events]);

  return (
    <DashboardLayout>
      <div className="dash-shell mx-auto max-w-7xl space-y-5">
        <div className="flex flex-wrap items-end justify-between gap-3 px-1">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#7b858d]">Workspace</p>
            <h1 className="text-2xl font-extrabold tracking-tight text-[#2d353c]">
              Hello, {profile?.username || "there"}
            </h1>
            <p className="text-sm text-[#7b858d]">Your live view of people, tools, and work in progress.</p>
          </div>
          <div className="flex items-center gap-3 rounded-[1.25rem] bg-white/80 px-3 py-2 shadow-[0_10px_24px_rgba(45,53,60,0.08)]">
            <UserAvatar user={profile} className="h-11 w-11 rounded-full" iconClassName="h-6 w-6" />
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-[#2d353c]">{profile?.username || "Signed in"}</p>
              <p className="truncate text-xs text-[#7b858d]">{profile?.email || "SoluSphere"}</p>
            </div>
          </div>
        </div>

        <BirthdayBoard
          people={birthdays}
          today={birthdaysToday}
          missingBirthDate={Boolean(profile) && !profile.birth_date}
          compact
        />

        {notice && (
          <div className="dash-card flex items-start gap-3 p-4 text-[#8a5a12]">
            <DimensionalIcon icon={ExclamationTriangleIcon} tone="amber" size="sm" />
            <div className="min-w-0">
              <p className="font-bold">Face setup is pending</p>
              <p className="mt-1 text-sm">{notice}</p>
              <Link to="/profile" className="mt-3 inline-flex items-center gap-2 text-sm font-bold">
                Open profile <ArrowRightIcon className="h-4 w-4" />
              </Link>
            </div>
          </div>
        )}

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricTile
            tone="teal"
            icon={UserCircleIcon}
            label="Team member"
            value={profile?.username || "Loading"}
            detail={profile?.role ? titleize(profile.role) : "Signed in"}
          />
          <MetricTile
            tone="amber"
            icon={CheckBadgeIcon}
            label="Face status"
            value={faceReady ? "Verified" : "Pending"}
            detail={faceReady ? "Biometric login is active" : "Registration required"}
          />
          <MetricTile
            tone="forest"
            icon={DocumentChartBarIcon}
            label="Analyses"
            value={String(analyses.length)}
            detail={`${completedAnalyses} completed`}
          />
          <MetricTile
            tone="navy"
            icon={CalendarDaysIcon}
            label="Events"
            value={String(events.length)}
            detail={events[0]?.title || "No events loaded"}
          />
        </section>

        <section className="grid gap-5 xl:grid-cols-[1.35fr_0.95fr]">
          <div className="space-y-5">
            <div className="dash-card p-5">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-bold text-[#2d353c]">Activity</h2>
                  <p className="text-sm text-[#7b858d]">Recent analyses and events at a glance</p>
                </div>
                <Link to="/bpo" className="text-sm font-bold text-[#0285a1] hover:underline">
                  View all
                </Link>
              </div>

              <div className="space-y-3">
                {activity.length === 0 ? (
                  <EmptyState text="No activity yet. Start with a PDF analysis or open chat." />
                ) : (
                  activity.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center gap-3 rounded-[1rem] border border-[#edf0f2] bg-[#fbfcfd] p-3 shadow-[0_8px_18px_rgba(45,53,60,0.05)]"
                    >
                      <RingMeter value={item.percent} tone={item.tone} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-bold text-[#2d353c]">{item.title}</p>
                        <p className="mt-0.5 line-clamp-1 text-xs text-[#7b858d]">{item.detail}</p>
                      </div>
                      <span className="shrink-0 rounded-full bg-[#eef3f5] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-[#52606a]">
                        {item.badge}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="dash-card p-5">
              <div className="mb-4">
                <h2 className="text-lg font-bold text-[#2d353c]">Quick actions</h2>
                <p className="text-sm text-[#7b858d]">Jump into the tools you use most</p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {quickActions.map((action) => (
                  <Link
                    key={action.to}
                    to={action.to}
                    className="group flex items-center justify-between gap-3 rounded-[1rem] border border-[#edf0f2] bg-white px-3 py-3 shadow-[0_10px_20px_rgba(45,53,60,0.06)] transition hover:-translate-y-0.5 hover:shadow-[0_16px_28px_rgba(45,53,60,0.1)]"
                  >
                    <span className="flex min-w-0 items-center gap-3">
                      <DimensionalIcon icon={action.icon} tone={action.tone} size="sm" />
                      <span className="truncate text-sm font-bold text-[#2d353c]">{action.label}</span>
                    </span>
                    <ArrowRightIcon className="h-4 w-4 text-[#9aa3ab] transition group-hover:translate-x-0.5 group-hover:text-[#0285a1]" />
                  </Link>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-5">
            <div className="dash-card p-5">
              <div className="mb-4">
                <h2 className="text-lg font-bold text-[#2d353c]">Workspace pulse</h2>
                <p className="text-sm text-[#7b858d]">How ready your account and tools are</p>
              </div>
              <div className="space-y-4">
                {readiness.map((item) => (
                  <div key={item.label}>
                    <div className="mb-1.5 flex items-center justify-between gap-3 text-sm">
                      <span className="font-semibold text-[#2d353c]">{item.label}</span>
                      <span className="font-bold text-[#52606a]">{item.value}%</span>
                    </div>
                    <div className="progress-track">
                      <div
                        className={`progress-fill bg-gradient-to-r ${progressTone(item.tone)}`}
                        style={{ width: `${item.value}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="dash-card p-5">
              <div className="mb-4">
                <h2 className="text-lg font-bold text-[#2d353c]">Connected tools</h2>
                <p className="text-sm text-[#7b858d]">Open external workspaces in a new tab</p>
              </div>
              <div className="space-y-3">
                {externalTools.map((tool, index) => {
                  const tone = ["teal", "forest", "amber"][index % 3];
                  const Icon = tool.icon;
                  return (
                    <a
                      key={tool.href}
                      href={tool.href}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-3 rounded-[1rem] border border-[#edf0f2] bg-[#fbfcfd] p-3 shadow-[0_8px_18px_rgba(45,53,60,0.05)] transition hover:-translate-y-0.5 hover:shadow-[0_14px_24px_rgba(45,53,60,0.1)]"
                    >
                      <DimensionalIcon icon={Icon} tone={tone} size="sm" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-bold text-[#2d353c]">{tool.name}</p>
                        <p className="truncate text-xs text-[#7b858d]">External workspace</p>
                      </div>
                      <ArrowTopRightOnSquareIcon className="h-4 w-4 text-[#9aa3ab]" />
                    </a>
                  );
                })}
              </div>
            </div>

            <div className="dash-card overflow-hidden p-0">
              <div className="bg-gradient-to-br from-[#2f6b45] via-[#0285a1] to-[#026d84] px-5 py-5 text-white">
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-white/70">Paperless wishes</p>
                <p className="mt-2 text-lg font-bold">Celebrate birthdays on screen</p>
                <p className="mt-1 text-sm text-white/80">
                  Photos and wishes stay digital, so nothing needs printing.
                </p>
                <Link
                  to="/birthdays"
                  className="mt-4 inline-flex items-center gap-2 rounded-xl bg-white/15 px-3 py-2 text-sm font-bold backdrop-blur hover:bg-white/25"
                >
                  Open birthday board <ArrowRightIcon className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </div>
        </section>
      </div>
    </DashboardLayout>
  );
}

function MetricTile({ tone, icon, label, value, detail }) {
  return (
    <div className={`dash-metric dash-metric-${tone}`}>
      <div className="relative z-[1] flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-white/70">{label}</p>
          <p className="mt-2 truncate text-2xl font-extrabold tracking-tight">{value}</p>
          <p className="mt-1 truncate text-xs text-white/75">{detail}</p>
        </div>
        <DimensionalIcon icon={icon} tone={tone} />
      </div>
      <p className="relative z-[1] mt-4 text-[10px] font-semibold uppercase tracking-wide text-white/65">
        Updated just now
      </p>
    </div>
  );
}

function RingMeter({ value, tone }) {
  const radius = 18;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (Math.min(100, Math.max(0, value)) / 100) * circumference;
  const stroke = {
    teal: "#0285a1",
    amber: "#d97706",
    forest: "#2f6b45",
    navy: "#2d353c",
    rose: "#c0473f",
  }[tone] || "#0285a1";

  return (
    <div className="ring-meter h-12 w-12">
      <svg width="48" height="48" viewBox="0 0 48 48">
        <circle cx="24" cy="24" r={radius} fill="none" stroke="#e6ebef" strokeWidth="5" />
        <circle
          cx="24"
          cy="24"
          r={radius}
          fill="none"
          stroke={stroke}
          strokeWidth="5"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <span className="ring-meter-label">{value}%</span>
    </div>
  );
}

function progressTone(tone) {
  return {
    teal: "from-[#4ec3d8] to-[#0285a1]",
    amber: "from-[#f7c078] to-[#d97706]",
    forest: "from-[#78c28f] to-[#2f6b45]",
    navy: "from-[#6d7d8a] to-[#2d353c]",
  }[tone] || "from-[#4ec3d8] to-[#0285a1]";
}

function EmptyState({ text }) {
  return (
    <div className="rounded-[1rem] border border-dashed border-[#d5dce1] bg-[#f7f8fa] p-8 text-center text-sm font-medium text-[#7b858d]">
      {text}
    </div>
  );
}
