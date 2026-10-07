import { Building2, ClipboardList, FileText, LayoutDashboard, LogOut, MapPinned, Menu, ScrollText, Users, X } from "lucide-react";
import { useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import type { RoleCode } from "../types/api.types";

const navItems = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, roles: ["SYSTEM_ADMIN", "ORG_ADMIN", "SUPERVISOR", "INSPECTOR"] },
  { to: "/users", label: "Users", icon: Users, roles: ["SYSTEM_ADMIN", "ORG_ADMIN"] },
  { to: "/organizations", label: "Organizations", icon: Building2, roles: ["SYSTEM_ADMIN"] },
  { to: "/inspection-requests", label: "Inspections", icon: ClipboardList, roles: ["SYSTEM_ADMIN", "ORG_ADMIN"] },
  { to: "/farmers", label: "Client & Site Registry", icon: MapPinned, roles: ["SYSTEM_ADMIN", "ORG_ADMIN", "SUPERVISOR", "INSPECTOR"] },
  { to: "/forms", label: "Forms & Standards", icon: ScrollText, roles: ["SYSTEM_ADMIN", "ORG_ADMIN", "SUPERVISOR"] },
  { to: "/reports", label: "Reports", icon: FileText, roles: ["SYSTEM_ADMIN", "ORG_ADMIN", "SUPERVISOR", "INSPECTOR", "FARMER"] },
  { to: "/supervisor/queue", label: "Supervisor Queue", icon: ClipboardList, roles: ["SYSTEM_ADMIN", "ORG_ADMIN", "SUPERVISOR"] },
  { to: "/inspector/jobs", label: "Inspector Jobs", icon: ClipboardList, roles: ["SYSTEM_ADMIN", "ORG_ADMIN", "INSPECTOR"] },
  { to: "/client/dashboard", label: "Client Portal", icon: FileText, roles: ["SYSTEM_ADMIN", "ORG_ADMIN", "FARMER"] }
] satisfies Array<{ to: string; label: string; icon: typeof LayoutDashboard; roles: RoleCode[] }>;

export function Shell() {
  const { user, logout } = useAuth();
  const [isMobileNavOpen, setMobileNavOpen] = useState(false);
  const [isLoggingOut, setLoggingOut] = useState(false);
  const roles = user?.roles ?? [];
  const visibleItems = navItems.filter((item) => item.roles.some((role) => roles.includes(role)));
  const handleLogout = async () => {
    if (isLoggingOut) return;
    setLoggingOut(true);
    await logout();
  };

  return (
    <div className="min-h-screen bg-tic-surface">
      <aside className="fixed inset-y-0 left-0 hidden w-72 border-r border-slate-200 bg-tic-navy text-white lg:block">
        <div className="flex h-16 items-center px-6 text-lg font-bold">TIC Operations</div>
        <nav className="space-y-1 px-3">
          {visibleItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium ${isActive ? "bg-white/12 text-white" : "text-slate-300 hover:bg-white/8 hover:text-white"}`
              }
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>

      <div className="lg:pl-72">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-slate-200 bg-white/90 px-5 backdrop-blur">
          <div className="flex items-center gap-3">
            <button type="button" className="rounded-md border border-slate-200 p-2 lg:hidden" aria-label="Open navigation" onClick={() => setMobileNavOpen(true)}>
              <Menu className="h-5 w-5" />
            </button>
            <div>
            <p className="text-sm font-semibold text-tic-navy">{user?.name}</p>
            <p className="text-xs text-tic-muted">{user?.email}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-semibold text-tic-muted hover:bg-slate-100 disabled:cursor-wait disabled:opacity-60"
          >
            <LogOut className="h-4 w-4" />
            {isLoggingOut ? "Logging out..." : "Logout"}
          </button>
        </header>
        <main className="p-5 lg:p-8">
          <Outlet />
        </main>
      </div>
      {isMobileNavOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button className="absolute inset-0 bg-tic-navy/50" aria-label="Close navigation" onClick={() => setMobileNavOpen(false)} />
          <aside className="relative h-full w-80 max-w-[85vw] bg-tic-navy p-4 text-white shadow-xl">
            <div className="flex items-center justify-between">
              <div className="text-lg font-bold">TIC Operations</div>
              <button type="button" className="rounded-md border border-white/15 p-2" aria-label="Close navigation" onClick={() => setMobileNavOpen(false)}>
                <X className="h-5 w-5" />
              </button>
            </div>
            <nav className="mt-6 space-y-1">
              {visibleItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={() => setMobileNavOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium ${isActive ? "bg-white/12 text-white" : "text-slate-300 hover:bg-white/8 hover:text-white"}`
                  }
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </NavLink>
              ))}
            </nav>
          </aside>
        </div>
      ) : null}
    </div>
  );
}
