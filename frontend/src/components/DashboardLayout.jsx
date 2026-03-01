import React, { useState } from "react";
import {
  LayoutDashboard,
  BarChart3,
  Calculator,
  ChevronLeft,
  ChevronRight,
  Building2,
  Sparkles,
  Sun,
  Database,
  Gauge,
  LogOut,
} from "lucide-react";
import AlertBanner from "./AlertBanner";
import TopMetricsBar from "./TopMetricsBar";

/* ── Navigation items ─────────────────────────────────────── */
const navItems = [
  { key: "overview",    label: "Overview",              icon: LayoutDashboard },
  { key: "analytics",   label: "Energy Analytics",      icon: BarChart3 },
  { key: "data",        label: "Data Management",       icon: Database },
  { key: "sustainability", label: "Sustainability KPIs", icon: Gauge },
  { key: "solar",       label: "Solar Energy",          icon: Sun },
  { key: "roi",         label: "ROI Calculator",        icon: Calculator },
];

export default function DashboardLayout({
  alertMessage,
  onDismissAlert,
  children,
  activeNav: controlledNav,
  onNavChange,
  onLogout,
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [internalNav, setInternalNav] = useState("overview");

  const activeNav = controlledNav ?? internalNav;
  const handleNavChange = (key) => {
    setInternalNav(key);
    onNavChange?.(key);
  };

  return (
    <div className="flex h-screen overflow-hidden bg-black">
      {/* ─── Sidebar ────────────────────────────────────────── */}
      <aside
        className={`
          flex flex-col relative
          border-r border-white/[0.06]
          transition-[width] duration-300 ease-in-out
          ${collapsed ? "w-[74px]" : "w-64"}
        `}
        style={{
          background: 'linear-gradient(180deg, #080808 0%, #000000 50%, #080808 100%)',
        }}
      >
        {/* Subtle side glow */}
        <div className="absolute inset-y-0 right-0 w-[1px] bg-gradient-to-b from-transparent via-sky-500/10 to-transparent" />

        {/* Logo / Brand */}
        <div className={`px-4 ${collapsed ? "h-16" : "h-[78px]"} border-b border-white/[0.06] flex items-center`}>
          <div className={`flex items-center ${collapsed ? "justify-center w-full" : "gap-3"}`}>
          <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-sky-500/20 to-violet-500/20 border border-sky-400/25 shadow-[0_0_14px_rgba(56,189,248,0.08)]">
            <Building2 className="w-5 h-5 text-sky-300" />
            <div className="absolute -inset-0.5 rounded-xl bg-sky-400/10 blur-sm -z-10" />
          </div>
          {!collapsed && (
            <div className="overflow-hidden">
              <p className="text-[24px] font-extrabold text-white leading-none tracking-tight">
                NMIMS Indore
              </p>
              <p className="text-[10px] text-sky-400/75 uppercase tracking-[0.18em] font-semibold mt-1">
                Admin Dashboard
              </p>
            </div>
          )}
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 px-3 pt-6 pb-4 overflow-y-auto flex flex-col justify-start gap-2">
          {navItems.map(({ key, label, icon: Icon }) => {
            const isActive = key === activeNav;
            return (
              <button
                key={key}
                onClick={() => handleNavChange(key)}
                title={collapsed ? label : undefined}
                className={`
                  group relative flex items-center ${collapsed ? "justify-center" : "justify-start"} gap-3 w-full
                  rounded-2xl ${collapsed ? "px-2 py-3" : "px-4 py-3"} text-[15px] font-medium
                  transition-all duration-200
                  ${isActive
                    ? "text-white"
                    : "text-slate-500 hover:text-slate-200 hover:bg-white/[0.035]"
                  }
                `}
              >
                {isActive && (
                  <>
                    <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-sky-500/[0.14] to-violet-500/[0.07] border border-sky-400/15" />
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-6 rounded-r-full bg-sky-400 shadow-[0_0_10px_rgba(56,189,248,0.55)]" />
                  </>
                )}
                <Icon
                  className={`relative w-[19px] h-[19px] flex-shrink-0 transition-colors duration-200 ${
                    isActive ? "text-sky-400" : "text-slate-600 group-hover:text-slate-300"
                  }`}
                />
                {!collapsed && <span className="relative tracking-[0.01em] leading-none">{label}</span>}
              </button>
            );
          })}
        </nav>

        {/* Version badge */}
        {!collapsed && (
          <div className="px-4 pb-3">
            <div className="flex items-center gap-1.5 text-[10px] text-slate-600">
              <Sparkles className="w-3 h-3" />
              <span>v1.0 — Smart Campus</span>
            </div>
          </div>
        )}

        {/* Logout */}
        {onLogout && (
          <div className="border-t border-white/[0.06] p-3">
            <button
              onClick={onLogout}
              title={collapsed ? "Logout" : undefined}
              className="flex items-center gap-3 w-full rounded-2xl px-4 py-3 text-[15px] font-medium text-red-400/70 hover:text-red-400 hover:bg-red-500/[0.06] transition-all duration-200"
              style={collapsed ? { justifyContent: "center", padding: "0.75rem 0.5rem" } : {}}
            >
              <LogOut className="w-[19px] h-[19px] flex-shrink-0" />
              {!collapsed && <span className="tracking-[0.01em] leading-none">Logout</span>}
            </button>
          </div>
        )}

        {/* Collapse Toggle */}
        <div className="border-t border-white/[0.06] p-2">
          <button
            onClick={() => setCollapsed((c) => !c)}
            className="
              flex items-center justify-center w-full
              rounded-xl py-2.5 text-slate-600
              hover:bg-white/[0.03] hover:text-slate-400
              transition-all duration-200
            "
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? (
              <ChevronRight className="w-4 h-4" />
            ) : (
              <ChevronLeft className="w-4 h-4" />
            )}
          </button>
        </div>
      </aside>

      {/* ─── Main Content Area ──────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Alert Banner */}
        <AlertBanner
          alertMessage={alertMessage}
          severity="high"
          onDismiss={onDismissAlert}
        />

        {/* Header — frosted glass */}
        <header className="relative flex items-center justify-between px-6 h-16 border-b border-white/[0.06] bg-campus-950/60 backdrop-blur-xl">
          <div className="absolute inset-x-0 bottom-0 h-[1px] bg-gradient-to-r from-transparent via-sky-500/10 to-transparent" />
          <div>
            <h1 className="text-lg font-bold text-white tracking-tight">
              {navItems.find((n) => n.key === activeNav)?.label ?? "Dashboard"}
            </h1>
            <p className="text-[11px] text-slate-500">
              Real-time NMIMS Indore energy monitoring
            </p>
          </div>
          <div className="flex items-center gap-2.5">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
            </span>
            <span className="text-xs text-emerald-400/80 font-mono font-medium tracking-wider">LIVE</span>
          </div>
        </header>

        {/* Scrollable body */}
        <main className="flex-1 overflow-y-auto p-6 space-y-6">
          {activeNav !== "solar" && activeNav !== "roi" && activeNav !== "sustainability" && <TopMetricsBar />}
          {/* Page content with entrance animation keyed to nav */}
          <div key={activeNav} className="page-enter">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
