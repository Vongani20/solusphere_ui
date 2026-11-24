import React, { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  ArrowLeftOnRectangleIcon,
  Bars3Icon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import {
  CalendarDaysIcon,
  ChatBubbleLeftRightIcon,
  CheckCircleIcon,
  ClipboardDocumentListIcon,
  DocumentChartBarIcon,
  DocumentTextIcon,
  HomeIcon,
  LightBulbIcon,
  ShieldCheckIcon,
  TicketIcon,
  UserGroupIcon,
  UserCircleIcon,
} from "@heroicons/react/24/solid";
import api, { clearSession, getStoredUser } from "../services/api";
import { externalTools } from "../data/externalTools";
import { useCall } from "../context/CallContext";
import { useChatInbox } from "../hooks/useChatInbox";
import DimensionalIcon from "./DimensionalIcon";
import ThemeSwitcher from "./ThemeSwitcher";
import UserAvatar from "./UserAvatar";
import TechBackground from "./TechBackground";
import { LeafIcon } from "./BirthdayBoard";

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: HomeIcon, tone: "teal" },
  { name: "Tasks", href: "/tasks", icon: CheckCircleIcon, tone: "navy" },
  { name: "Birthdays", href: "/birthdays", icon: LeafIcon, tone: "forest" },
  { name: "Profile & Security", href: "/profile", icon: UserCircleIcon, tone: "navy" },
  { name: "Events", href: "/events", icon: CalendarDaysIcon, tone: "amber" },
  { name: "User Chat", href: "/user-chat", icon: UserGroupIcon, tone: "forest" },
  { name: "Help Desk", href: "/helpdesk", icon: TicketIcon, tone: "rose" },
  { name: "SIA Chat", href: "/chatbot", icon: ChatBubbleLeftRightIcon, tone: "teal" },
  { name: "BPO Analysis", href: "/bpo", icon: DocumentChartBarIcon, tone: "navy" },
  { name: "CV Builder", href: "/cv-builder", icon: DocumentTextIcon, tone: "teal" },
  { name: "Tender Proposal", href: "/rfp-builder", icon: ClipboardDocumentListIcon, tone: "forest" },
  { name: "SoluGility", href: "/innovation", icon: LightBulbIcon, tone: "amber" },
  { name: "Admin", href: "/admin", icon: ShieldCheckIcon, tone: "rose", adminOnly: true },
];

export default function DashboardLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [user, setUser] = useState(() => getStoredUser());
  const { callPhase, callSession } = useCall();
  const inbox = useChatInbox(30000);
  const inboxCount = inbox.unread_messages + inbox.missed_calls;
  const [taskSummary, setTaskSummary] = useState({ open: 0, overdue: 0 });
  const location = useLocation();
  const navigate = useNavigate();
  const showCallBanner = callPhase !== "idle" && callPhase !== "ended";
  const incomingCallerId = callPhase === "incoming" ? callSession?.caller_id : null;
  const visibleNavigation = useMemo(
    () => navigation.filter((item) => !item.adminOnly || user?.role === "admin"),
    [user?.role]
  );

  // Keep the sidebar avatar in sync when the profile photo changes.
  useEffect(() => {
    const refresh = () => setUser(getStoredUser());
    window.addEventListener("ss-profile-updated", refresh);
    return () => window.removeEventListener("ss-profile-updated", refresh);
  }, []);

  // Open-task badge for the Tasks menu item.
  useEffect(() => {
    let mounted = true;
    const load = () =>
      api
        .get("/tasks/summary")
        .then((res) => mounted && setTaskSummary(res.data || { open: 0, overdue: 0 }))
        .catch(() => {});
    load();
    const timer = window.setInterval(load, 60000);
    window.addEventListener("ss-tasks-changed", load);
    return () => {
      mounted = false;
      window.clearInterval(timer);
      window.removeEventListener("ss-tasks-changed", load);
    };
  }, []);

  useEffect(() => {
    let mounted = true;

    api
      .get("/profile")
      .then((res) => {
        if (!mounted || !res.data?.user) return;
        setUser(res.data.user);
        localStorage.setItem("user", JSON.stringify(res.data.user));
      })
      .catch(() => {});

    return () => {
      mounted = false;
    };
  }, []);

  const handleLogout = () => {
    clearSession();
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-surface text-heading">
      {sidebarOpen && (
        <button
          type="button"
          aria-label="Close navigation"
          className="fixed inset-0 z-40 bg-heading/40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={`fixed left-0 top-0 z-50 flex h-screen w-72 flex-col border-r border-[#e1e6ea] bg-sidebar transition-transform duration-300 lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex justify-end px-3 pt-3 lg:hidden">
          <button
            type="button"
            onClick={() => setSidebarOpen(false)}
            className="rounded-md p-1.5 text-muted hover:bg-white hover:text-heading"
            aria-label="Close navigation"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 space-y-0.5 overflow-y-auto px-2.5 py-3 lg:pt-5">
          {visibleNavigation.map((item) => {
            const isActive =
              location.pathname === item.href ||
              (item.href !== "/dashboard" && location.pathname.startsWith(`${item.href}/`));

            return (
              <Link
                key={item.name}
                to={item.href}
                className={`sidebar-link ${isActive ? "active" : ""} ${
                  item.href === "/user-chat" && incomingCallerId ? "ring-2 ring-emerald-400 ring-offset-2" : ""
                }`}
                onClick={() => setSidebarOpen(false)}
              >
                <DimensionalIcon icon={item.icon} tone={item.tone} size="sm" soft />
                <span className="truncate">{item.name}</span>
                {item.href === "/user-chat" && incomingCallerId ? (
                  <span className="ml-auto inline-flex h-2 w-2 animate-ping rounded-full bg-emerald-500" />
                ) : null}
                {item.href === "/tasks" && taskSummary.open > 0 ? (
                  <span
                    className={`ml-auto inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-bold text-white ${
                      taskSummary.overdue > 0 ? "bg-rose-600" : "bg-slate-600"
                    }`}
                    title={taskSummary.overdue > 0 ? `${taskSummary.overdue} overdue` : `${taskSummary.open} open`}
                  >
                    {taskSummary.open > 99 ? "99+" : taskSummary.open}
                  </span>
                ) : null}
                {item.href === "/user-chat" && !incomingCallerId && inboxCount > 0 ? (
                  <span className="ml-auto inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-bold text-white">
                    {inboxCount > 99 ? "99+" : inboxCount}
                  </span>
                ) : null}
              </Link>
            );
          })}
          <p className="px-2 pb-1 pt-4 text-[8px] font-bold uppercase tracking-wide text-muted">External</p>
          {externalTools.map((item, index) => {
            const tone = ["teal", "forest", "amber"][index % 3];
            return (
              <a
                key={item.href}
                href={item.href}
                target="_blank"
                rel="noreferrer"
                className="sidebar-link"
                onClick={() => setSidebarOpen(false)}
              >
                <DimensionalIcon icon={item.icon} tone={tone} size="sm" soft />
                <span className="truncate">{item.name}</span>
              </a>
            );
          })}
        </nav>

        <div className="border-t border-[#e1e6ea] p-3">
          <ThemeSwitcher className="mb-2.5" />
          <div className="mb-2.5 flex items-center gap-2 rounded-md bg-white/60 p-2">
            <UserAvatar user={user} className="h-[26px] w-[26px]" iconClassName="h-4 w-4" />
            <div className="min-w-0">
              <p className="truncate text-[11px] font-semibold text-heading">{user?.username || "Signed in"}</p>
              <p className="truncate text-[9px] text-muted">{user?.role || user?.email || "User"}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[11px] font-semibold text-[#c0473f] hover:bg-[#fde8e8]"
          >
            <ArrowLeftOnRectangleIcon className="h-4 w-4" />
            Logout
          </button>
        </div>
      </aside>

      <div className={`relative lg:pl-72 ${showCallBanner ? "pt-14" : ""}`}>
        <TechBackground variant="subtle" className="fixed inset-0 lg:left-72" />
        {/* No top bar: on phones and tablets a floating button opens the menu. */}
        <button
          type="button"
          onClick={() => setSidebarOpen(true)}
          className="mobile-menu-button fixed left-3 z-30 lg:hidden"
          style={{ top: showCallBanner ? "4.25rem" : "0.75rem" }}
          aria-label="Open navigation"
        >
          <Bars3Icon className="h-5 w-5" />
          {inboxCount > 0 ? (
            <span className="absolute -right-1 -top-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[9px] font-bold text-white">
              {inboxCount > 99 ? "99+" : inboxCount}
            </span>
          ) : null}
        </button>

        <main className="app-stage p-4 pt-16 sm:p-5 sm:pt-16 lg:pt-5">{children}</main>
      </div>
    </div>
  );
}
