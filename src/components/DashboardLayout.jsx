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
  { name: "Uploads", href: "/uploads", icon: CloudArrowUpIcon },
  { name: "Admin", href: "/admin", icon: ShieldCheckIcon, adminOnly: true },
];

export default function DashboardLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [user, setUser] = useState(() => getStoredUser());
  const location = useLocation();
  const navigate = useNavigate();
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
    <div className="min-h-screen bg-slate-50 text-slate-950">
      {sidebarOpen && (
        <button
          type="button"
          aria-label="Close navigation"
          className="fixed inset-0 z-40 bg-slate-950/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={`fixed left-0 top-0 z-50 flex h-screen w-72 flex-col border-r border-slate-200 bg-white transition-transform duration-300 lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-16 items-center justify-between border-b border-slate-200 px-5">
          <Link to="/dashboard" className="flex items-center gap-3" onClick={() => setSidebarOpen(false)}>
            <img src="/icon.png" alt="" className="h-9 w-9 rounded-lg object-contain" />
            <div>
              <p className="text-base font-bold leading-tight text-slate-950">SoluSphere</p>
              <p className="text-xs font-medium text-slate-500">Operations UI</p>
            </div>
          </Link>
          <button
            type="button"
            onClick={() => setSidebarOpen(false)}
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-800 lg:hidden"
            aria-label="Close navigation"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
          {visibleNavigation.map((item) => {
            const Icon = item.icon;
            const isActive =
              location.pathname === item.href ||
              (item.href !== "/dashboard" && location.pathname.startsWith(`${item.href}/`));

            return (
              <Link
                key={item.name}
                to={item.href}
                className={`sidebar-link ${isActive ? "active" : ""}`}
                onClick={() => setSidebarOpen(false)}
              >
                <Icon className="h-5 w-5 shrink-0" />
                <span className="truncate">{item.name}</span>
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-slate-200 p-4">
          <div className="mb-3 flex items-center gap-3 rounded-lg bg-slate-50 p-3">
            <UserAvatar user={user} />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-slate-900">{user?.username || "Signed in"}</p>
              <p className="truncate text-xs text-slate-500">{user?.role || user?.email || "User"}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-semibold text-rose-700 hover:bg-rose-50"
          >
            <ArrowLeftOnRectangleIcon className="h-5 w-5" />
            Logout
          </button>
        </div>
      </aside>

      <div className="lg:pl-72">
        <header className="sticky top-0 z-30 flex h-16 items-center border-b border-slate-200 bg-white/95 px-4 backdrop-blur sm:px-6">
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            className="mr-3 rounded-lg p-2 text-slate-600 hover:bg-slate-100 hover:text-slate-900 lg:hidden"
            aria-label="Open navigation"
          >
            <Bars3Icon className="h-6 w-6" />
          </button>

          <div className="flex min-w-0 flex-1 items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="truncate text-lg font-bold text-slate-950">{currentPage}</p>
              <p className="hidden text-xs text-slate-500 sm:block">SoluSphere workspace</p>
            </div>
            <div className="flex items-center gap-3">
              <span
                className={`hidden rounded-full px-3 py-1 text-xs font-semibold ring-1 sm:inline-flex ${
                  user?.face_status
                    ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
                    : "bg-amber-50 text-amber-700 ring-amber-200"
                }`}
              >
                {user?.face_status ? "Face verified" : "Face setup pending"}
              </span>
              <UserAvatar user={user} />
            </div>
          </div>
        </header>

        <main className="p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
