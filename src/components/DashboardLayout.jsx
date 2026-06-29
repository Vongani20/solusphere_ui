import React, { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  ArrowLeftOnRectangleIcon,
  Bars3Icon,
  CalendarDaysIcon,
  ChatBubbleLeftRightIcon,
  CloudArrowUpIcon,
  DocumentChartBarIcon,
  DocumentTextIcon,
  HomeIcon,
  KeyIcon,
  ShieldCheckIcon,
  TicketIcon,
  UserGroupIcon,
  UserCircleIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import api, { clearSession, getStoredUser } from "../services/api";
import { useCall } from "../context/CallContext";
import UserAvatar from "./UserAvatar";

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: HomeIcon },
  { name: "Profile", href: "/profile", icon: UserCircleIcon },
  { name: "Security", href: "/update-password", icon: KeyIcon },
  { name: "Events", href: "/events", icon: CalendarDaysIcon },
  { name: "User Chat", href: "/user-chat", icon: UserGroupIcon },
  { name: "Help Desk", href: "/helpdesk", icon: TicketIcon },
  { name: "SIA Chat", href: "/chatbot", icon: ChatBubbleLeftRightIcon },
  { name: "BPO Analysis", href: "/bpo", icon: DocumentChartBarIcon },
  { name: "CV Builder", href: "/cv-builder", icon: DocumentTextIcon },
  // { name: "Uploads", href: "/uploads", icon: CloudArrowUpIcon },
  { name: "Admin", href: "/admin", icon: ShieldCheckIcon, adminOnly: true },
];

export default function DashboardLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [user, setUser] = useState(() => getStoredUser());
  const { callPhase, callSession } = useCall();
  const location = useLocation();
  const navigate = useNavigate();
  const showCallBanner = callPhase !== "idle" && callPhase !== "ended";
  const incomingCallerId = callPhase === "incoming" ? callSession?.caller_id : null;
  const visibleNavigation = useMemo(
    () => navigation.filter((item) => !item.adminOnly || user?.role === "admin"),
    [user?.role]
  );

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

  const currentPage = useMemo(() => {
    return (
      visibleNavigation.find((item) => {
        if (item.href === "/dashboard") return location.pathname === item.href;
        return location.pathname === item.href || location.pathname.startsWith(`${item.href}/`);
      })?.name || "SoluSphere"
    );
  }, [location.pathname, visibleNavigation]);

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
        <div className="flex h-14 items-center justify-between border-b border-[#e1e6ea] px-4">
          <Link to="/dashboard" className="flex items-center gap-2.5" onClick={() => setSidebarOpen(false)}>
            <img src="/icon.png" alt="" className="h-6 w-6 rounded-md object-contain" />
            <div>
              <p className="text-xs font-bold leading-tight text-heading">SoluSphere</p>
              <p className="text-[8px] font-medium text-muted">Operations UI</p>
            </div>
          </Link>
          <button
            type="button"
            onClick={() => setSidebarOpen(false)}
            className="rounded-md p-1.5 text-muted hover:bg-white hover:text-heading lg:hidden"
            aria-label="Close navigation"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 space-y-0.5 overflow-y-auto px-2.5 py-3">
          {visibleNavigation.map((item) => {
            const Icon = item.icon;
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
                <Icon className="h-[13px] w-[13px] shrink-0" />
                <span className="truncate">{item.name}</span>
                {item.href === "/user-chat" && incomingCallerId ? (
                  <span className="ml-auto inline-flex h-2 w-2 animate-ping rounded-full bg-emerald-500" />
                ) : null}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-[#e1e6ea] p-3">
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

      <div className={`lg:pl-72 ${showCallBanner ? "pt-14" : ""}`}>
        <header className="sticky top-0 z-30 flex h-[52px] items-center border-b border-[#e7ebee] bg-white/95 px-4 backdrop-blur sm:px-5" style={showCallBanner ? { top: "3.5rem" } : undefined}>
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            className="mr-2.5 rounded-md p-1.5 text-nav-idle hover:bg-sidebar hover:text-heading lg:hidden"
            aria-label="Open navigation"
          >
            <Bars3Icon className="h-5 w-5" />
          </button>

          <div className="flex min-w-0 flex-1 items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-heading">{currentPage}</p>
              <p className="hidden text-[9px] font-medium text-muted sm:block">SoluSphere workspace</p>
            </div>
            <div className="flex items-center gap-2">
              <span className={`face-badge hidden sm:inline-flex ${!user?.face_status ? "!border-[#b07d20]/30 !bg-[#fff4e0] !text-[#b07d20]" : ""}`}>
                {user?.face_status ? "Face verified" : "Face setup pending"}
              </span>
              <UserAvatar user={user} className="h-7 w-7" iconClassName="h-4 w-4" />
            </div>
          </div>
        </header>

        <main className="p-4 sm:p-5">{children}</main>
      </div>
    </div>
  );
}
