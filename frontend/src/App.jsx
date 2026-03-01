import React, { useState, useEffect, useCallback } from "react";
import { Routes, Route, Navigate, useNavigate, useParams } from "react-router-dom";
import DashboardLayout from "./components/DashboardLayout";
import OverviewPage from "./components/OverviewPage";
import LiveEnergyChart from "./components/LiveEnergyChart";
import ROICalculator from "./components/ROICalculator";
import SolarEnergyPage from "./components/SolarEnergyPage";
import DataEntries from "./components/DataEntries";
import SustainabilityKPIPage from "./components/SustainabilityKPIPage";
import LandingPage from "./components/LandingPage";
import LoginPage from "./components/LoginPage";
import RegisterPage from "./components/RegisterPage";
import StudentDashboard from "./components/StudentDashboard";

/**
 * App — root component with React Router
 * ──────────────────────────────────────────────────────────────
 * Routes:
 *   /                   → Landing page
 *   /login              → Login page
 *   /register           → Register page
 *   /admin/:page?       → Admin Dashboard (overview, analytics, data, sustainability, solar, roi)
 *   /student/:page?     → Student Dashboard (dashboard, leaderboard, challenges, etc.)
 *
 * Auth persists in localStorage so refresh keeps you logged in.
 */

const BASE = process.env.REACT_APP_API_URL || "";
const PREDICT_URL = `${BASE}/api/predict-surge`;
const DATA_MODE_URL = `${BASE}/api/data-mode`;
const LIVE_STATUS_URL = `${BASE}/api/live-status`;
const CONSUMPTION_URL = `${BASE}/api/block-consumption`;

const BLOCKS = [
  { name: "STME Block", color: "border-l-sky-400/50" },
  { name: "SBM Block", color: "border-l-emerald-400/50" },
  { name: "SOC Block", color: "border-l-violet-400/50" },
  { name: "SOL Block", color: "border-l-amber-400/50" },
  { name: "SPTM Block", color: "border-l-rose-400/50" },
];

/* ── Helpers ──────────────────────────────────────────────── */
function getAuth() {
  try {
    const raw = localStorage.getItem("campusAuth");
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

/* ── Admin dashboard content (uses URL param) ────────────── */
function AdminContent() {
  const { page } = useParams();
  const activeNav = page || "overview";
  const navigate = useNavigate();

  const [alert, setAlert] = useState(null);
  const [dataMode, setDataMode] = useState("manual");
  const [blockBreakdown, setBlockBreakdown] = useState({});

  const handleNavChange = (key) => {
    navigate(`/admin/${key}`, { replace: true });
  };

  const handleLogout = () => {
    localStorage.removeItem("campusAuth");
    navigate("/");
  };

  /* ── Fetch surge prediction ─────────────────────────────── */
  const fetchSurge = useCallback(async () => {
    try {
      const res = await fetch(PREDICT_URL);
      if (!res.ok) return;
      const data = await res.json();
      if (data.anomaly_alert && data.alert) {
        setAlert(data.alert.message);
      }
    } catch { /* silent */ }
  }, []);

  useEffect(() => {
    fetchSurge();
    const id = setInterval(fetchSurge, 30_000);
    return () => clearInterval(id);
  }, [fetchSurge]);

  const fetchBlockBreakdown = useCallback(async () => {
    try {
      const modeRes = await fetch(DATA_MODE_URL);
      const modeJson = modeRes.ok ? await modeRes.json() : { mode: "manual" };
      const mode = modeJson.mode === "iot" ? "iot" : "manual";
      setDataMode(mode);

      if (mode === "iot") {
        const liveRes = await fetch(LIVE_STATUS_URL);
        if (!liveRes.ok) return;
        const liveJson = await liveRes.json();
        const next = {};
        (liveJson.blocks || []).forEach((b) => {
          next[b.Block_Name] = Number((b.Grid_Power_Draw_kW || 0).toFixed(1));
        });
        setBlockBreakdown(next);
        return;
      }

      const consRes = await fetch(CONSUMPTION_URL);
      if (!consRes.ok) return;
      const records = await consRes.json();
      if (!records.length) {
        setBlockBreakdown({});
        return;
      }

      const latest = records.reduce(
        (acc, r) => {
          if (r.year > acc.year || (r.year === acc.year && r.month > acc.month)) {
            return { year: r.year, month: r.month };
          }
          return acc;
        },
        { year: -1, month: -1 }
      );

      const next = {};
      records
        .filter((r) => r.year === latest.year && r.month === latest.month)
        .forEach((r) => {
          next[r.block] = Number((r.kwh || 0).toFixed(1));
        });
      setBlockBreakdown(next);
    } catch { /* keep previous */ }
  }, []);

  useEffect(() => {
    if (activeNav !== "analytics") return;
    fetchBlockBreakdown();
    const id = setInterval(fetchBlockBreakdown, 10000);
    return () => clearInterval(id);
  }, [activeNav, fetchBlockBreakdown]);

  /* ── Page content based on active nav ────────────────────── */
  const renderPage = () => {
    switch (activeNav) {
      case "overview":
        return <OverviewPage />;

      case "analytics":
        return (
          <>
            <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="lg:col-span-2">
                <LiveEnergyChart />
              </div>
              <div className="glass-card accent-bar-violet p-6 animate-fade-in-up stagger-2">
                <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-4">
                  Block-wise Breakdown
                </h2>
                <p className="text-[10px] text-slate-600 mb-2">
                  Source: {dataMode === "iot" ? "IoT live grid draw" : "Data Management (latest monthly entries)"}
                </p>
                {BLOCKS.map((block) => (
                  <div
                    key={block.name}
                    className={`flex items-center justify-between py-3 pl-3 border-l-2 ${block.color} border-b border-white/[0.04] last:border-b-0 hover:bg-white/[0.03] transition-colors`}
                  >
                    <span className="text-sm text-slate-300">{block.name}</span>
                    <span className="text-xs font-mono text-slate-500">
                      {blockBreakdown[block.name] !== undefined
                        ? `${blockBreakdown[block.name].toLocaleString("en-IN", { maximumFractionDigits: 1 })} ${dataMode === "iot" ? "kW" : "kWh"}`
                        : `— ${dataMode === "iot" ? "kW" : "kWh"}`}
                    </span>
                  </div>
                ))}
              </div>
            </section>
            <section className="glass-card accent-bar-sky p-6 animate-fade-in-up stagger-3">
              <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-4">
                Surge Prediction Model
              </h2>
              <div className="h-48 flex items-center justify-center rounded-xl border border-dashed border-white/[0.08] text-slate-600 text-sm bg-white/[0.02]">
                Connect to /api/predict-surge for chart
              </div>
            </section>
          </>
        );

      case "data":
        return <DataEntries />;

      case "sustainability":
        return <SustainabilityKPIPage />;

      case "solar":
        return <SolarEnergyPage />;

      case "roi":
        return <ROICalculator />;

      default:
        return <OverviewPage />;
    }
  };

  return (
    <DashboardLayout
      alertMessage={alert}
      onDismissAlert={() => setAlert(null)}
      activeNav={activeNav}
      onNavChange={handleNavChange}
      onLogout={handleLogout}
    >
      {renderPage()}
    </DashboardLayout>
  );
}

/* ── Protected route wrapper ─────────────────────────────── */
function RequireAuth({ role, children }) {
  const auth = getAuth();
  if (!auth?.loggedIn) return <Navigate to="/login" replace />;
  if (role && auth.role !== role) return <Navigate to="/login" replace />;
  return children;
}

/* ══════════════════════════════════════════════════════════ */
export default function App() {
  const navigate = useNavigate();

  const handleLogin = (role) => {
    const authData = { role, loggedIn: true };
    localStorage.setItem("campusAuth", JSON.stringify(authData));
    window.scrollTo(0, 0);
    navigate(role === "admin" ? "/admin/overview" : "/student/dashboard");
  };

  const handleLogout = () => {
    localStorage.removeItem("campusAuth");
    navigate("/");
  };

  return (
    <Routes>
      {/* Landing */}
      <Route path="/" element={<LandingPage onEnterDashboard={() => navigate("/login")} />} />

      {/* Auth */}
      <Route
        path="/login"
        element={
          getAuth()?.loggedIn
            ? <Navigate to={getAuth()?.role === "admin" ? "/admin/overview" : "/student/dashboard"} replace />
            : <LoginPage
                onLogin={handleLogin}
                onGoToRegister={() => navigate("/register")}
                onBackToLanding={() => navigate("/")}
              />
        }
      />
      <Route
        path="/register"
        element={
          <RegisterPage
            onGoToLogin={() => navigate("/login")}
            onBackToLanding={() => navigate("/")}
          />
        }
      />

      {/* Admin dashboard — /admin or /admin/:page */}
      <Route
        path="/admin"
        element={<Navigate to="/admin/overview" replace />}
      />
      <Route
        path="/admin/:page"
        element={
          <RequireAuth role="admin">
            <AdminContent />
          </RequireAuth>
        }
      />

      {/* Student dashboard — /student or /student/:page */}
      <Route
        path="/student"
        element={<Navigate to="/student/dashboard" replace />}
      />
      <Route
        path="/student/:page"
        element={
          <RequireAuth role="student">
            <StudentDashboard onLogout={handleLogout} />
          </RequireAuth>
        }
      />

      {/* Catch-all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
