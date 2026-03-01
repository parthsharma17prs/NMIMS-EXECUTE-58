import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import {
  Leaf,
  Zap,
  Sun,
  Cloud,
  Wind,
  Droplets,
  TrendingUp,
  Activity,
  Shield,
  Target,
  AlertTriangle,
  CheckCircle2,
  Info,
  Building2,
  Gauge,
  ThermometerSun,
  BatteryCharging,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  Wifi,
  WifiOff,
  Cpu,
  BrainCircuit,
  Download,
  IndianRupee,
} from "lucide-react";

const BASE = process.env.REACT_APP_API_URL || "";
const API_URL = `${BASE}/api/overview`;
const SURGE_URL = `${BASE}/api/predict-surge`;
const POLL_INTERVAL = 5000;
const CONSUMPTION_URL = `${BASE}/api/block-consumption`;
const FORECAST_URL   = `${BASE}/api/forecast`;
const DATA_MODE_URL  = `${BASE}/api/data-mode`;

const ANALYSIS_BLOCKS = [
  { key: "STME Block", short: "STME", color: "#38bdf8" },
  { key: "SBM Block",  short: "SBM",  color: "#a78bfa" },
  { key: "SOC Block",  short: "SOC",  color: "#34d399" },
  { key: "SOL Block",  short: "SOL",  color: "#fbbf24" },
  { key: "SPTM Block", short: "SPTM", color: "#f87171" },
];

const MONTH_NAMES = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const ELECTRICITY_RATE = 8; // ₹/kWh

/* ══════════════════════════════════════════════════════════════
   UTILITY HELPERS
   ══════════════════════════════════════════════════════════════ */

function formatINR(v) {
  if (v >= 1_00_00_000) return `\u20B9${(v / 1_00_00_000).toFixed(2)} Cr`;
  if (v >= 1_00_000) return `\u20B9${(v / 1_00_000).toFixed(2)} L`;
  if (v >= 1_000) return `\u20B9${(v / 1_000).toFixed(1)} K`;
  return `\u20B9${v.toFixed(0)}`;
}

function gradeColor(grade) {
  if (grade.startsWith("A")) return "text-emerald-400";
  if (grade.startsWith("B")) return "text-sky-400";
  if (grade.startsWith("C")) return "text-amber-400";
  return "text-red-400";
}

function gradeBg(grade) {
  if (grade.startsWith("A")) return "bg-emerald-500/15";
  if (grade.startsWith("B")) return "bg-sky-500/15";
  if (grade.startsWith("C")) return "bg-amber-500/15";
  return "bg-red-500/15";
}

function FormulaInfoButton({ formula }) {
  return (
    <details className="group relative">
      <summary className="list-none cursor-pointer w-4 h-4 rounded-md border border-white/[0.08] bg-white/[0.03] text-slate-500 hover:text-slate-300 hover:bg-white/[0.05] flex items-center justify-center">
        <Info className="w-2.5 h-2.5" />
      </summary>
      <div className="absolute right-0 mt-2 z-20 w-72 p-3 rounded-xl border border-white/[0.08] bg-[#090f1a]/95 backdrop-blur-xl shadow-xl">
        <p className="text-[10px] uppercase tracking-wider text-slate-500 mb-1">Formula</p>
        <p className="text-[11px] leading-relaxed text-slate-300">{formula}</p>
      </div>
    </details>
  );
}

/* ══════════════════════════════════════════════════════════════
   SUB-COMPONENTS
   ══════════════════════════════════════════════════════════════ */

/* ── 1. Net-Zero Progress Ring ─────────────────────────────── */
function NetZeroGauge({ progress, formula }) {
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (progress / 100) * circumference;

  const ringColor =
    progress >= 70 ? "#34d399" : progress >= 40 ? "#38bdf8" : "#fbbf24";

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-36 h-36">
        {/* Ambient glow behind gauge */}
        <div
          className="absolute inset-4 rounded-full blur-2xl opacity-20"
          style={{ backgroundColor: ringColor }}
        />
        <svg className="w-full h-full -rotate-90 relative" viewBox="0 0 120 120">
          <defs>
            <filter id="ringGlow">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <linearGradient id="ringGradient" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor={ringColor} />
              <stop offset="100%" stopColor={ringColor} stopOpacity="0.5" />
            </linearGradient>
          </defs>
          {/* Track */}
          <circle
            cx="60" cy="60" r={radius}
            stroke="rgba(255,255,255,0.04)" strokeWidth="8" fill="none"
          />
          {/* Progress ring with glow */}
          <circle
            cx="60" cy="60" r={radius}
            stroke="url(#ringGradient)"
            strokeWidth="8"
            fill="none"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            filter="url(#ringGlow)"
            className="transition-all duration-1000 ease-out"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-extrabold text-white">{progress}%</span>
          <span className="text-[8px] text-slate-500 uppercase tracking-[0.2em]">Net-Zero</span>
        </div>
      </div>
      <div className="mt-2 flex items-center gap-2">
        <p className="text-[10px] text-slate-500">Progress to Target</p>
        <FormulaInfoButton formula={formula} />
      </div>
    </div>
  );
}

/* ── 2. Stat Card (glass variant) ──────────────────────────── */
function StatCard({ icon: Icon, label, value, sub, accent, accentBg, trend, trendUp, accentBar, formula }) {
  return (
    <div className={`glass-card glass-card-hover ${accentBar || ""} p-4`}>
      <div className="flex items-center justify-between mb-3">
        <div className={`p-2 rounded-xl ${accentBg} border border-white/[0.04]`}>
          <Icon className={`w-4 h-4 ${accent}`} />
        </div>
        <div className="flex items-center gap-2">
          {formula && <FormulaInfoButton formula={formula} />}
          {trend && (
            <span className={`flex items-center gap-0.5 text-xs font-semibold px-2 py-0.5 rounded-full ${
              trendUp ? "bg-emerald-500/15 text-emerald-400" : "bg-red-500/15 text-red-400"
            }`}>
              {trendUp
                ? <ArrowUpRight className="w-3 h-3" />
                : <ArrowDownRight className="w-3 h-3" />}
              {trend}
            </span>
          )}
        </div>
      </div>
      <p className="text-xl font-extrabold text-white tracking-tight">{value}</p>
      <p className="text-[10px] text-slate-500 uppercase tracking-wider mt-1">{label}</p>
      {sub && <p className="text-[10px] text-slate-600 mt-0.5">{sub}</p>}
    </div>
  );
}

/* ── 3. Sustainability Score Badge ─────────────────────────── */
function SustainabilityBadge({ score, grade, formula }) {
  return (
    <div className="glass-card glass-card-hover p-5 flex flex-col items-center justify-center">
      <div className={`w-16 h-16 rounded-2xl ${gradeBg(grade)} flex items-center justify-center mb-3 border border-white/[0.04]`}>
        <span className={`text-2xl font-black ${gradeColor(grade)}`}>{grade}</span>
      </div>
      <div className="w-full bg-white/[0.04] rounded-full h-2 mb-2 overflow-hidden">
        <div
          className="h-2 rounded-full transition-all duration-1000"
          style={{
            width: `${score}%`,
            background: "linear-gradient(90deg, #ef4444, #f59e0b, #38bdf8, #34d399)",
          }}
        />
      </div>
      <p className="text-sm font-bold text-white">{score}/100</p>
      <p className="text-[9px] text-slate-500 uppercase tracking-[0.15em] mt-1">Sustainability</p>
      <div className="mt-1 flex items-center gap-2">
        <p className="text-[9px] text-slate-600 text-center">
          Renewable Mix &bull; Carbon &bull; Efficiency
        </p>
        <FormulaInfoButton formula={formula} />
      </div>
    </div>
  );
}

/* ── 4. Peak Demand Indicator ──────────────────────────────── */
function PeakDemandCard({ peak, target, time, formula }) {
  const pct = Math.min(100, (peak / target) * 100);
  const isAlert = pct > 85;

  return (
    <div className={`glass-card glass-card-hover p-4 ${isAlert ? "accent-bar-coral" : "accent-bar-sky"}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className={`p-2 rounded-xl ${isAlert ? "bg-orange-500/10" : "bg-sky-500/10"} border border-white/[0.04]`}>
            <Gauge className={`w-4 h-4 ${isAlert ? "text-orange-400" : "text-sky-400"}`} />
          </div>
          <span className="text-xs text-slate-400 font-medium">Peak Demand</span>
        </div>
        <div className="flex items-center gap-2">
          <FormulaInfoButton formula={formula} />
          {isAlert && (
            <AlertTriangle className="w-4 h-4 text-amber-400 animate-pulse" />
          )}
        </div>
      </div>
      <div className="flex items-baseline gap-2 mb-2">
        <span className="text-xl font-extrabold text-white">{peak}</span>
        <span className="text-xs text-slate-500">/ {target} kW</span>
      </div>
      <div className="w-full bg-white/[0.04] rounded-full h-2 mb-2 overflow-hidden">
        <div
          className="h-2 rounded-full transition-all duration-700"
          style={{
            width: `${pct}%`,
            background: isAlert
              ? "linear-gradient(90deg, #f59e0b, #ef4444)"
              : "linear-gradient(90deg, #0284c7, #38bdf8)",
          }}
        />
      </div>
      <div className="flex justify-between text-[10px] text-slate-600">
        <span>Peak at {time}</span>
        <span>{pct.toFixed(0)}% of target</span>
      </div>
    </div>
  );
}

/* ── 5. Energy Flow Visualization ──────────────────────────── */
function EnergyFlowDiagram({ solar, grid, hvac, total }) {
  return (
    <div className="glass-card accent-bar-cyan p-5 animate-fade-in-up stagger-3">
      <div className="flex items-center gap-2 mb-4">
        <div className="p-2 rounded-xl bg-cyan-500/10 border border-white/[0.04]">
          <BatteryCharging className="w-4 h-4 text-cyan-400" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-slate-200 tracking-tight">
            Energy Flow &mdash; Right Now
          </h3>
          <p className="text-[10px] text-slate-500">Real-time generation &rarr; consumption</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {/* Sources */}
        <div className="space-y-3">
          <p className="text-[9px] text-slate-500 uppercase tracking-[0.15em] text-center">Sources</p>
          <div className="rounded-xl p-3 border border-cyan-500/15 bg-gradient-to-b from-cyan-500/[0.06] to-transparent">
            <Sun className="w-5 h-5 text-cyan-400 mx-auto mb-1" />
            <p className="text-center text-sm font-bold text-cyan-400">{solar} kW</p>
            <p className="text-center text-[9px] text-slate-500">Solar</p>
          </div>
          <div className="rounded-xl p-3 border border-amber-500/15 bg-gradient-to-b from-amber-500/[0.06] to-transparent">
            <Zap className="w-5 h-5 text-amber-400 mx-auto mb-1" />
            <p className="text-center text-sm font-bold text-amber-400">{grid} kW</p>
            <p className="text-center text-[9px] text-slate-500">Grid</p>
          </div>
        </div>

        {/* Flow center */}
        <div className="flex flex-col items-center justify-center space-y-3">
          <div className="flex items-center gap-1">
            <div className="w-8 h-0.5 bg-gradient-to-r from-cyan-500/60 to-transparent" />
            <ArrowUpRight className="w-3 h-3 text-cyan-400/60 animate-pulse" />
          </div>
          <div className="rounded-xl p-3 border border-white/[0.06] bg-gradient-to-b from-white/[0.04] to-transparent">
            <Building2 className="w-6 h-6 text-slate-400 mx-auto mb-1" />
            <p className="text-center text-sm font-bold text-white">{total} kW</p>
            <p className="text-center text-[9px] text-slate-500">NMIMS Load</p>
          </div>
          <div className="flex items-center gap-1">
            <ArrowDownRight className="w-3 h-3 text-amber-400/60 animate-pulse" />
            <div className="w-8 h-0.5 bg-gradient-to-l from-amber-500/60 to-transparent" />
          </div>
        </div>

        {/* Consumers */}
        <div className="space-y-3">
          <p className="text-[9px] text-slate-500 uppercase tracking-[0.15em] text-center">Consumers</p>
          <div className="rounded-xl p-3 border border-violet-500/15 bg-gradient-to-b from-violet-500/[0.06] to-transparent">
            <ThermometerSun className="w-5 h-5 text-violet-400 mx-auto mb-1" />
            <p className="text-center text-sm font-bold text-violet-400">{hvac} kW</p>
            <p className="text-center text-[9px] text-slate-500">HVAC</p>
          </div>
          <div className="rounded-xl p-3 border border-slate-500/15 bg-gradient-to-b from-white/[0.02] to-transparent">
            <Zap className="w-5 h-5 text-slate-400 mx-auto mb-1" />
            <p className="text-center text-sm font-bold text-slate-300">
              {Math.max(0, total - hvac).toFixed(1)} kW
            </p>
            <p className="text-center text-[9px] text-slate-500">Other</p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── 6. Weather Impact Panel ───────────────────────────────── */
function WeatherPanel({ weather }) {
  if (!weather) return null;

  const CondIcon = weather.condition?.includes("Cloud") || weather.condition?.includes("Overcast")
    ? Cloud : Sun;

  const isSunny = !weather.condition?.includes("Cloud") && !weather.condition?.includes("Overcast");

  return (
    <div className="glass-card accent-bar-amber p-5 animate-fade-in-up stagger-4">
      <div className="flex items-center gap-2 mb-4">
        <div className="p-2 rounded-xl bg-sky-500/10 border border-white/[0.04]">
          <Cloud className="w-4 h-4 text-sky-400" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-slate-200 tracking-tight">
            Weather &amp; Impact
          </h3>
          <p className="text-[10px] text-slate-500">Ambient conditions affecting energy use</p>
        </div>
      </div>

      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="relative">
            <CondIcon className={`w-10 h-10 ${isSunny ? "text-amber-300" : "text-slate-400"} ${isSunny ? "animate-float" : ""}`} />
            {isSunny && <div className="absolute -inset-1 rounded-full bg-amber-400/10 blur-lg -z-10" />}
          </div>
          <div>
            <p className="text-2xl font-extrabold text-white">{weather.temp_c}&deg;C</p>
            <p className="text-xs text-slate-500">{weather.condition}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {[
          { icon: Droplets, color: "text-blue-400", value: `${weather.humidity}%`, label: "Humidity" },
          { icon: Wind, color: "text-teal-400", value: `${weather.wind_kmh} km/h`, label: "Wind" },
          { icon: Sun, color: "text-yellow-400", value: `${weather.solar_irradiance_w_m2}`, label: "W/m\u00B2" },
        ].map((item, i) => (
          <div key={i} className="rounded-xl p-2 text-center bg-white/[0.02] border border-white/[0.04]">
            <item.icon className={`w-3.5 h-3.5 ${item.color} mx-auto mb-1`} />
            <p className="text-xs font-bold text-white">{item.value}</p>
            <p className="text-[8px] text-slate-600">{item.label}</p>
          </div>
        ))}
      </div>

      {/* Insight */}
      <div className="mt-3 px-3 py-2 rounded-xl bg-white/[0.02] border border-white/[0.04]">
        <p className="text-[10px] text-slate-400">
          <span className="text-sky-400 font-semibold">Insight:</span>{" "}
          {weather.temp_c > 32
            ? "High temperature driving increased HVAC load. Consider pre-cooling strategy."
            : weather.solar_irradiance_w_m2 > 500
            ? "Strong solar irradiance \u2014 solar panels operating near peak efficiency."
            : weather.solar_irradiance_w_m2 < 100
            ? "Low solar irradiance \u2014 grid dependency is higher than normal."
            : "Moderate conditions \u2014 energy systems operating within normal parameters."}
        </p>
      </div>
    </div>
  );
}

/* ── 7. Block Performance Card ─────────────────────────────── */
function BlockCard({ block, index }) {
  const scoreColor =
    block.efficiency_score >= 75 ? "text-emerald-400" :
    block.efficiency_score >= 50 ? "text-amber-400" : "text-red-400";
  const barGradient =
    block.efficiency_score >= 75 ? "from-emerald-500 to-emerald-400" :
    block.efficiency_score >= 50 ? "from-amber-500 to-amber-400" : "from-red-500 to-red-400";
  const borderAccent =
    block.efficiency_score >= 75 ? "border-l-emerald-500/30" :
    block.efficiency_score >= 50 ? "border-l-amber-500/30" : "border-l-red-500/30";

  return (
    <div className={`glass-card glass-card-hover border-l-2 ${borderAccent} p-4 animate-fade-in-up stagger-${Math.min(index + 1, 6)}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Building2 className="w-4 h-4 text-slate-500" />
          <span className="text-sm font-bold text-slate-200">{block.name}</span>
        </div>
        <span className={`text-lg font-extrabold ${scoreColor}`}>{block.efficiency_score}</span>
      </div>

      <div className="w-full bg-white/[0.04] rounded-full h-1.5 mb-3 overflow-hidden">
        <div
          className={`h-1.5 rounded-full bg-gradient-to-r ${barGradient} transition-all duration-700`}
          style={{ width: `${block.efficiency_score}%` }}
        />
      </div>

      <div className="grid grid-cols-3 gap-2 text-center">
        <div>
          <p className="text-xs font-bold text-amber-400">{block.grid_kw}</p>
          <p className="text-[8px] text-slate-600">Grid kW</p>
        </div>
        <div>
          <p className="text-xs font-bold text-cyan-400">{block.solar_kw}</p>
          <p className="text-[8px] text-slate-600">Solar kW</p>
        </div>
        <div>
          <p className="text-xs font-bold text-violet-400">{block.hvac_kw}</p>
          <p className="text-[8px] text-slate-600">HVAC kW</p>
        </div>
      </div>

      <div className="mt-2 pt-2 border-t border-white/[0.04] flex justify-between text-[9px]">
        <span className="text-slate-600">EUI: {block.eui} kWh/m&sup2;</span>
        <span className="text-slate-600">{block.sqft?.toLocaleString()} sq ft</span>
      </div>
    </div>
  );
}

/* ── 8. Activity Feed ──────────────────────────────────────── */
function ActivityFeed({ events }) {
  const typeStyles = {
    warning: { icon: AlertTriangle, color: "text-amber-400", bg: "bg-amber-500/10", dot: "bg-amber-400" },
    success: { icon: CheckCircle2, color: "text-emerald-400", bg: "bg-emerald-500/10", dot: "bg-emerald-400" },
    info:    { icon: Info,          color: "text-sky-400",     bg: "bg-sky-500/10", dot: "bg-sky-400" },
  };

  return (
    <div className="glass-card accent-bar-violet p-5 animate-fade-in-up stagger-5">
      <div className="flex items-center gap-2 mb-4">
        <div className="p-2 rounded-xl bg-violet-500/10 border border-white/[0.04]">
          <Activity className="w-4 h-4 text-violet-400" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-slate-200 tracking-tight">
            Live Activity Feed
          </h3>
          <p className="text-[10px] text-slate-500">Real-time NMIMS Indore events</p>
        </div>
      </div>

      <div className="relative space-y-0.5 max-h-[280px] overflow-y-auto pr-1">
        {/* Timeline connector line */}
        <div className="absolute left-[15px] top-2 bottom-2 w-[1px] bg-gradient-to-b from-violet-500/20 via-sky-500/10 to-transparent" />

        {events.length === 0 && (
          <p className="text-xs text-slate-600 text-center py-4">Waiting for events&hellip;</p>
        )}
        {events.map((evt, i) => {
          const style = typeStyles[evt.type] || typeStyles.info;
          return (
            <div key={i} className="flex items-start gap-3 py-1.5 px-1 rounded-xl hover:bg-white/[0.02] transition-colors animate-fade-in">
              <div className="relative z-10 mt-1.5">
                <div className={`w-[6px] h-[6px] rounded-full ${style.dot}`} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[11px] text-slate-300 leading-relaxed">{evt.event}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[9px] text-slate-600 font-mono">{evt.time}</span>
                  <span className="text-[9px] text-slate-600">&bull; {evt.block}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── 9. Custom Chart Tooltip ───────────────────────────────── */
function AreaTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass-card px-4 py-3 shadow-xl !rounded-xl" style={{ backdropFilter: "blur(16px)" }}>
      <p className="text-[11px] text-slate-500 font-mono mb-2">{label}</p>
      {payload.map((entry) => (
        <div key={entry.dataKey} className="flex items-center gap-2 text-xs">
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color, boxShadow: `0 0 6px ${entry.color}` }} />
          <span className="text-slate-400">{entry.name}:</span>
          <span className="text-white font-bold">{entry.value} kW</span>
        </div>
      ))}
    </div>
  );
}

/* ── 10. Surge Prediction Card ─────────────────────────────── */
function SurgePredictionCard({ surgeData }) {
  if (!surgeData) return null;
  const isAlert = surgeData.anomaly_alert;

  return (
    <div className={`glass-card glass-card-hover p-4 ${
      isAlert ? "accent-bar-coral" : "accent-bar-emerald"
    }`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className={`p-2 rounded-xl border border-white/[0.04] ${isAlert ? "bg-red-500/10" : "bg-emerald-500/10"}`}>
            <Shield className={`w-4 h-4 ${isAlert ? "text-red-400" : "text-emerald-400"}`} />
          </div>
          <span className="text-xs font-medium text-slate-400">ML Surge Prediction</span>
        </div>
        <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-semibold ${
          isAlert ? "bg-red-500/15 text-red-400" : "bg-emerald-500/15 text-emerald-400"
        }`}>
          {isAlert ? "ALERT" : "NORMAL"}
        </span>
      </div>
      <div className="flex items-baseline gap-2">
        <span className="text-xl font-extrabold text-white">
          {surgeData.predicted_Grid_Power_Draw_kW} kW
        </span>
        <span className="text-[10px] text-slate-500">predicted in 1hr</span>
      </div>
      <div className="flex justify-between mt-2 text-[10px] text-slate-600">
        <span>Threshold: {surgeData.surge_threshold_kW} kW</span>
        <span>{surgeData.data_points_used} data points</span>
      </div>
      {isAlert && surgeData.alert?.recommended_actions && (
        <div className="mt-3 space-y-1">
          {surgeData.alert.recommended_actions.map((action, i) => (
            <div key={i} className="flex items-center gap-1.5 text-[10px] text-amber-400/80">
              <span>&bull;</span>
              <span>{action}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}


/* ══════════════════════════════════════════════════════════════
   MAIN OVERVIEW PAGE
   ══════════════════════════════════════════════════════════════ */

export default function OverviewPage() {
  const [data, setData] = useState(null);
  const [surgeData, setSurgeData] = useState(null);
  const [connected, setConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [overviewTab, setOverviewTab] = useState("iot"); // auto-set from data mode

  /* ── Analysis Models state ── */
  const [consumptionRecords, setConsumptionRecords] = useState([]);
  const [forecastData, setForecastData] = useState(null);
  const [forecastLoading, setForecastLoading] = useState(false);

  const intervalRef = useRef(null);

  const fetchData = async () => {
    try {
      const [ovRes, surgeRes] = await Promise.all([
        fetch(API_URL),
        fetch(SURGE_URL),
      ]);
      if (ovRes.ok) {
        const json = await ovRes.json();
        setData(json);
        setConnected(true);
        setLastUpdate(new Date());
      } else {
        setConnected(false);
      }
      if (surgeRes.ok) {
        const surgeJson = await surgeRes.json();
        setSurgeData(surgeJson);
      }
    } catch {
      setConnected(false);
    }
  };

  useEffect(() => {
    fetchData();
    intervalRef.current = setInterval(fetchData, POLL_INTERVAL);
    return () => clearInterval(intervalRef.current);
  }, []);

  /* Fetch data mode from backend to auto-set overview tab */
  const fetchDataMode = async () => {
    try {
      const res = await fetch(DATA_MODE_URL);
      if (res.ok) {
        const d = await res.json();
        setOverviewTab(d.mode === "iot" ? "iot" : "analysis");
      }
    } catch { /* ignore */ }
  };
  useEffect(() => { fetchDataMode(); }, []);
  // Re-check mode periodically
  useEffect(() => {
    const id = setInterval(fetchDataMode, 10000);
    return () => clearInterval(id);
  }, []);

  /* Fetch saved consumption data */
  const fetchConsumption = async () => {
    try {
      const res = await fetch(CONSUMPTION_URL);
      if (res.ok) setConsumptionRecords(await res.json());
    } catch { /* ignore */ }
  };
  useEffect(() => { fetchConsumption(); }, []);

  /* Fetch forecast data */
  const fetchForecast = async () => {
    setForecastLoading(true);
    try {
      const res = await fetch(FORECAST_URL);
      if (res.ok) setForecastData(await res.json());
    } catch { /* ignore */ }
    setForecastLoading(false);
  };
  useEffect(() => {
    if (overviewTab === "analysis" && consumptionRecords.length > 0) {
      fetchForecast();
    }
  }, [overviewTab, consumptionRecords.length]);

  useEffect(() => {
    const id = setInterval(fetchConsumption, 10000);
    return () => clearInterval(id);
  }, []);

  /* Derived: monthly chart data */
  const monthlyChartData = useMemo(() => {
    const byMonth = {};
    consumptionRecords.forEach(r => {
      const key = `${r.year}-${String(r.month).padStart(2, "0")}`;
      if (!byMonth[key]) byMonth[key] = { month: key, label: `${MONTH_NAMES[r.month - 1]} ${r.year}`, total: 0, cost: 0 };
      const blk = ANALYSIS_BLOCKS.find(b => b.key === r.block);
      if (blk) byMonth[key][blk.short] = r.kwh;
      byMonth[key].total += r.kwh;
      byMonth[key].cost += r.cost;
    });
    return Object.values(byMonth).sort((a, b) => a.month.localeCompare(b.month));
  }, [consumptionRecords]);

  /* Derived: block totals */
  const blockTotals = useMemo(() => {
    const totals = {};
    ANALYSIS_BLOCKS.forEach(b => { totals[b.key] = { kwh: 0, cost: 0, months: 0 }; });
    consumptionRecords.forEach(r => {
      if (totals[r.block]) {
        totals[r.block].kwh += r.kwh;
        totals[r.block].cost += r.cost;
        totals[r.block].months += 1;
      }
    });
    return totals;
  }, [consumptionRecords]);

  const pieData = useMemo(() => {
    if (!data) return [];
    return [
      { name: "Solar", value: data.renewable_pct || 0 },
      { name: "Grid", value: data.grid_pct || 100 },
    ];
  }, [data]);

  const totalGrid = data?.blocks?.reduce((s, b) => s + b.grid_kw, 0)?.toFixed(1) || "0";
  const totalSolar = data?.blocks?.reduce((s, b) => s + b.solar_kw, 0)?.toFixed(1) || "0";
  const totalHVAC = data?.blocks?.reduce((s, b) => s + b.hvac_kw, 0)?.toFixed(1) || "0";
  const totalLoad = (parseFloat(totalGrid) + parseFloat(totalSolar)).toFixed(1);
  const hasManualData = consumptionRecords.length > 0;

  /* Loading */
  if (!data) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center h-64 glass-card">
          <div className="flex flex-col items-center gap-3">
            <RefreshCw className="w-6 h-6 text-sky-400/40 animate-spin" />
            <p className="text-sm text-slate-500">Loading overview data&hellip;</p>
            <p className="text-[10px] text-slate-600">Ensure Flask backend is running on port 5000</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Connection Status + View Toggle */}
      <div className="flex items-center justify-between animate-fade-in">
        <div className="flex items-center gap-2">
          {connected
            ? <><Wifi className="w-3.5 h-3.5 text-emerald-400" /><span className="text-[11px] text-emerald-400 font-mono font-medium">Live</span></>
            : <><WifiOff className="w-3.5 h-3.5 text-red-400" /><span className="text-[11px] text-red-400 font-mono font-medium">Disconnected</span></>
          }
          {lastUpdate && (
            <span className="text-[10px] text-slate-600 font-mono ml-1">
              Updated {lastUpdate.toLocaleTimeString("en-IN", { hour12: false })}
            </span>
          )}
        </div>

        {/* ─── IoT / Analysis Mode Indicator ─── */}
        <div className="flex items-center gap-2">
          <div className={`flex items-center gap-1.5 text-[11px] font-medium px-3 py-1.5 rounded-lg ${
            overviewTab === "iot"
              ? "bg-sky-500/15 text-sky-400 border border-sky-500/20"
              : "bg-violet-500/15 text-violet-400 border border-violet-500/20"
          }`}>
            {overviewTab === "iot"
              ? <><Cpu className="w-3.5 h-3.5" /> IoT Mode</>
              : <><BrainCircuit className="w-3.5 h-3.5" /> Analysis Mode</>
            }
          </div>
          <span className="text-[9px] text-slate-600 font-mono">Set via Data Management</span>
        </div>

        <button
          onClick={fetchData}
          className="flex items-center gap-1.5 text-[11px] text-slate-500 hover:text-slate-300 transition-colors px-2 py-1 rounded-lg hover:bg-white/[0.03]"
        >
          <RefreshCw className="w-3 h-3" />
          Refresh
        </button>
      </div>

      {overviewTab === "iot" ? (
      <>
      {/* ═══════ ROW 1 — Hero Metrics ═══════ */}
      <section className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <div className="glass-card p-5 flex items-center justify-center animate-scale-in">
          <NetZeroGauge
            progress={data.net_zero_progress}
            formula="Net-Zero Progress (%) = min(100, Renewable% × 1.3 + (100 - Grid Intensity) × 0.2), where Grid Intensity = (Total Grid kW / Campus Area) × 500"
          />
        </div>

        <div className="lg:col-span-2 grid grid-cols-2 gap-4">
          <StatCard
            icon={Leaf}
            label="Carbon Saved Today"
            value={`${data.carbon_saved_today_kg} kg`}
            sub="CO\u2082 offset via solar"
            accent="text-emerald-400"
            accentBg="bg-emerald-500/10"
            accentBar="accent-bar-emerald"
            trend="+12%"
            trendUp={true}
            formula="Carbon Saved (kg CO₂) = Solar Energy Generated Today (kWh) × 0.82"
          />
          <StatCard
            icon={TrendingUp}
            label="Financial Savings"
            value={formatINR(data.financial_savings_inr)}
            sub="Today's solar-based savings"
            accent="text-amber-400"
            accentBg="bg-amber-500/10"
            accentBar="accent-bar-amber"
            trend="+8.5%"
            trendUp={true}
            formula="Financial Savings (₹) = Solar Energy Generated Today (kWh) × Avoided Grid Tariff (₹/kWh)"
          />
          <StatCard
            icon={Zap}
            label="Total Consumption"
            value={`${data.total_consumption_kwh} kWh`}
            sub={`Grid: ${data.total_grid_kwh} \u2022 Solar: ${data.total_solar_kwh}`}
            accent="text-sky-400"
            accentBg="bg-sky-500/10"
            accentBar="accent-bar-sky"
            formula="Total Consumption (kWh) = Grid Energy (kWh) + Solar Energy (kWh)"
          />
          <PeakDemandCard
            peak={data.peak_demand_kw}
            target={data.peak_target_kw}
            time={data.peak_demand_time}
            formula="Peak Demand (kW) = max(Grid Power Draw across today's logs); Utilization (%) = (Peak ÷ Threshold) × 100"
          />
        </div>

        <SustainabilityBadge
          score={data.sustainability_score}
          grade={data.sustainability_grade}
          formula="Sustainability Score = Renewable% × 0.4 + Carbon Component × 0.3 + Avg Efficiency Score × 0.3"
        />
      </section>

      {/* ═══════ ROW 2 — Charts ═══════ */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* 24-Hour Energy Profile */}
        <div className="lg:col-span-2 glass-card accent-bar-sky p-5 chart-glow animate-fade-in-up stagger-1">
          <div className="flex items-center gap-2 mb-4">
            <div className="p-2 rounded-xl bg-sky-500/10 border border-white/[0.04]">
              <BarChart3 className="w-4 h-4 text-sky-400" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-200 tracking-tight">
                24-Hour Energy Profile
              </h3>
              <p className="text-[10px] text-slate-500">Today's hourly consumption pattern</p>
            </div>
          </div>

          {data.hourly_profile?.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={data.hourly_profile} margin={{ top: 8, right: 12, left: -8, bottom: 0 }}>
                <defs>
                  <linearGradient id="gridGradNew" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f97316" stopOpacity={0.5} />
                    <stop offset="50%" stopColor="#f59e0b" stopOpacity={0.15} />
                    <stop offset="100%" stopColor="#f59e0b" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="solarGradNew" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#06b6d4" stopOpacity={0.5} />
                    <stop offset="50%" stopColor="#22d3ee" stopOpacity={0.15} />
                    <stop offset="100%" stopColor="#22d3ee" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="hvacGradNew" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.5} />
                    <stop offset="50%" stopColor="#a78bfa" stopOpacity={0.15} />
                    <stop offset="100%" stopColor="#a78bfa" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 6" stroke="rgba(255,255,255,0.03)" vertical={false} />
                <XAxis
                  dataKey="hour" tick={{ fontSize: 10, fill: "#475569" }}
                  tickLine={false} axisLine={{ stroke: "rgba(255,255,255,0.04)" }}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: "#475569" }}
                  tickLine={false} axisLine={false} unit=" kW"
                />
                <Tooltip content={<AreaTooltip />} />
                <Legend
                  verticalAlign="top"
                  height={30}
                  formatter={(v) => <span className="text-[11px] text-slate-400">{v}</span>}
                />
                <Area type="monotone" dataKey="grid" name="Grid" stroke="#f97316" fill="url(#gridGradNew)" strokeWidth={2.5} animationDuration={1500} />
                <Area type="monotone" dataKey="solar" name="Solar" stroke="#06b6d4" fill="url(#solarGradNew)" strokeWidth={2.5} animationDuration={1500} />
                <Area type="monotone" dataKey="hvac" name="HVAC" stroke="#8b5cf6" fill="url(#hvacGradNew)" strokeWidth={2} strokeDasharray="6 3" animationDuration={1500} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-60 flex items-center justify-center rounded-xl border border-dashed border-white/[0.06]">
              <p className="text-xs text-slate-600">Hourly data accumulating&hellip;</p>
            </div>
          )}
        </div>

        {/* Renewable Mix Donut */}
        <div className="glass-card accent-bar-cyan p-5 animate-fade-in-up stagger-2">
          <div className="flex items-center gap-2 mb-4">
            <div className="p-2 rounded-xl bg-cyan-500/10 border border-white/[0.04]">
              <Sun className="w-4 h-4 text-cyan-400" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-200 tracking-tight">
                Energy Mix
              </h3>
              <p className="text-[10px] text-slate-500">Solar vs Grid ratio today</p>
            </div>
          </div>

          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <defs>
                <linearGradient id="solarPieGrad" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#06b6d4" />
                  <stop offset="100%" stopColor="#22d3ee" />
                </linearGradient>
                <linearGradient id="gridPieGrad" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#d97706" />
                  <stop offset="100%" stopColor="#fbbf24" />
                </linearGradient>
              </defs>
              <Pie
                data={pieData}
                cx="50%" cy="50%"
                innerRadius={45} outerRadius={75}
                paddingAngle={4}
                dataKey="value"
                strokeWidth={0}
                animationDuration={1200}
              >
                <Cell fill="url(#solarPieGrad)" />
                <Cell fill="url(#gridPieGrad)" />
              </Pie>
              <Tooltip
                formatter={(val) => `${val.toFixed(1)}%`}
                contentStyle={{
                  background: "rgba(12,18,32,0.9)",
                  border: "1px solid rgba(255,255,255,0.06)",
                  borderRadius: "12px",
                  fontSize: "11px",
                  backdropFilter: "blur(12px)",
                }}
              />
            </PieChart>
          </ResponsiveContainer>

          <div className="flex justify-center gap-6 mt-2">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-400" style={{ boxShadow: "0 0 6px #06b6d4" }} />
              <span className="text-xs text-slate-400">Solar {data.renewable_pct}%</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400" style={{ boxShadow: "0 0 6px #fbbf24" }} />
              <span className="text-xs text-slate-400">Grid {data.grid_pct}%</span>
            </div>
          </div>

          <div className="mt-4 px-3 py-2 rounded-xl bg-white/[0.02] border border-white/[0.04]">
            <p className="text-[10px] text-slate-500 text-center">
              <span className="text-sky-400 font-semibold">vs Industry:</span>{" "}
              {data.renewable_pct > 25
                ? `${(data.renewable_pct - 25).toFixed(1)}% above 25% benchmark`
                : `${(25 - data.renewable_pct).toFixed(1)}% below 25% benchmark`}
            </p>
          </div>
        </div>
      </section>

      {/* ═══════ ROW 3 — Energy Flow + Weather ═══════ */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <EnergyFlowDiagram solar={totalSolar} grid={totalGrid} hvac={totalHVAC} total={totalLoad} />
        <WeatherPanel weather={data.weather} />
      </section>

      {/* ═══════ ROW 4 — Block Performance ═══════ */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <Target className="w-4 h-4 text-sky-400" />
          <h3 className="text-sm font-bold text-slate-300 tracking-tight">
            Block Performance Index
          </h3>
          <div className="flex-1 h-[1px] bg-gradient-to-r from-sky-500/20 to-transparent ml-3" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {data.blocks?.map((block, i) => (
            <BlockCard key={block.name} block={block} index={i} />
          ))}
        </div>
      </section>

      {/* ═══════ ROW 5 — Activity + ML + EUI ═══════ */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ActivityFeed events={data.activity_feed || []} />
        <div className="space-y-4">
          <SurgePredictionCard surgeData={surgeData} />

          {/* Campus EUI Benchmark */}
          <div className="glass-card accent-bar-violet p-5 animate-fade-in-up stagger-6">
            <div className="flex items-center gap-2 mb-4">
              <div className="p-2 rounded-xl bg-violet-500/10 border border-white/[0.04]">
                <BarChart3 className="w-4 h-4 text-violet-400" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-200 tracking-tight">
                  Campus EUI Benchmark
                </h3>
                <p className="text-[10px] text-slate-500">Energy Use Intensity comparison</p>
              </div>
            </div>

            <div className="space-y-3">
              {[
                { label: "NMIMS Indore", value: data.campus_eui, gradient: "from-sky-500 to-sky-400", dot: "bg-sky-400" },
                { label: "India Avg (Office)", value: 180, gradient: "from-slate-600 to-slate-500", dot: "bg-slate-500" },
                { label: "GRIHA 5-Star", value: 90, gradient: "from-emerald-500 to-emerald-400", dot: "bg-emerald-400" },
                { label: "Net-Zero Target", value: 50, gradient: "from-cyan-500 to-cyan-400", dot: "bg-cyan-400" },
              ].map((item) => (
                <div key={item.label}>
                  <div className="flex justify-between text-[10px] mb-1">
                    <span className="text-slate-400 flex items-center gap-1.5">
                      <span className={`w-1.5 h-1.5 rounded-full ${item.dot}`} />
                      {item.label}
                    </span>
                    <span className="text-slate-500 font-mono">{item.value} kWh/m&sup2;</span>
                  </div>
                  <div className="w-full bg-white/[0.04] rounded-full h-1.5 overflow-hidden">
                    <div
                      className={`h-1.5 rounded-full bg-gradient-to-r ${item.gradient} transition-all duration-700`}
                      style={{ width: `${Math.min(100, (item.value / 250) * 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-3 px-3 py-2 rounded-xl bg-white/[0.02] border border-white/[0.04]">
              <p className="text-[10px] text-slate-400 text-center">
                {data.campus_eui < 100
                  ? "\u2726 Excellent \u2014 NMIMS Indore EUI below GRIHA 5-Star"
                  : data.campus_eui < 180
                  ? "\u25C9 Good \u2014 Below India average, room to improve"
                  : "\u26A0 Above Average \u2014 Efficiency improvements needed"}
              </p>
            </div>
          </div>
        </div>
      </section>
      </>
      ) : (
      /* ═══════ ANALYSIS MODELS TAB ═══════ */
      <div className="space-y-5 animate-fade-in-up">

        {/* ── Section Header ── */}
        <div className="flex items-center gap-2">
          <BrainCircuit className="w-4 h-4 text-violet-400" />
          <h2 className="text-sm font-bold text-slate-300 tracking-tight">Electricity Consumption Analysis</h2>
          <div className="flex-1 h-[1px] bg-gradient-to-r from-violet-500/20 to-transparent ml-3" />
          <span className="text-[9px] text-slate-600 font-mono px-2 py-0.5 rounded bg-white/[0.03] border border-white/[0.04]">
            Data entered via Data Management
          </span>
        </div>

        {/* ─── Monthly Comparison Chart ─── */}
        {monthlyChartData.length > 0 && (
          <div className="glass-card accent-bar-sky p-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="p-2 rounded-xl bg-sky-500/10 border border-white/[0.04]">
                <BarChart3 className="w-4 h-4 text-sky-400" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-200">Monthly Consumption — Block Comparison</h3>
                <p className="text-[10px] text-slate-500">Stacked bar chart of kWh per block by month</p>
              </div>
            </div>

            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={monthlyChartData} margin={{ top: 8, right: 12, left: -8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 6" stroke="rgba(255,255,255,0.03)" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#475569" }} tickLine={false} axisLine={{ stroke: "rgba(255,255,255,0.04)" }} />
                <YAxis tick={{ fontSize: 10, fill: "#475569" }} tickLine={false} axisLine={false} unit=" kWh" />
                <Tooltip
                  contentStyle={{ background: "rgba(12,18,32,0.95)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "12px", fontSize: "11px", backdropFilter: "blur(12px)" }}
                  formatter={(val, name) => [`${Number(val).toLocaleString("en-IN")} kWh`, name]}
                />
                <Legend
                  verticalAlign="top" height={30}
                  formatter={v => <span className="text-[11px] text-slate-400">{v}</span>}
                />
                {ANALYSIS_BLOCKS.map(blk => (
                  <Bar key={blk.short} dataKey={blk.short} name={blk.short} fill={blk.color} stackId="a" radius={[0, 0, 0, 0]} fillOpacity={0.75} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* ─── Block Totals Summary Cards ─── */}
        {consumptionRecords.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Building2 className="w-4 h-4 text-sky-400" />
              <h3 className="text-sm font-bold text-slate-300 tracking-tight">Block-wise Cumulative Summary</h3>
              <div className="flex-1 h-[1px] bg-gradient-to-r from-sky-500/20 to-transparent ml-3" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              {ANALYSIS_BLOCKS.map(blk => {
                const t = blockTotals[blk.key];
                const avgKwh = t.months > 0 ? Math.round(t.kwh / t.months) : 0;
                return (
                  <div key={blk.key} className="glass-card p-4 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-[2px]" style={{ background: `linear-gradient(to right, ${blk.color}80, transparent)` }} />
                    <div className="flex items-center gap-2 mb-2">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ background: blk.color, boxShadow: `0 0 6px ${blk.color}60` }} />
                      <span className="text-xs font-semibold text-slate-300">{blk.short}</span>
                    </div>
                    <div className="text-lg font-bold text-slate-200 font-mono">
                      {t.kwh.toLocaleString("en-IN")} <span className="text-[10px] text-slate-500 font-normal">kWh</span>
                    </div>
                    <div className="text-[11px] text-slate-500 font-mono mt-1">
                      ₹{t.cost.toLocaleString("en-IN")} total
                    </div>
                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/[0.04]">
                      <span className="text-[10px] text-slate-600">{t.months} month{t.months !== 1 && "s"}</span>
                      <span className="text-[10px] text-slate-500 font-mono">~{avgKwh.toLocaleString("en-IN")} avg/mo</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ─── Saved Data Table ─── */}
        {consumptionRecords.length > 0 && (
          <div className="glass-card accent-bar-emerald p-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="p-2 rounded-xl bg-emerald-500/10 border border-white/[0.04]">
                <Download className="w-4 h-4 text-emerald-400" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-200">Saved Consumption Records</h3>
                <p className="text-[10px] text-slate-500">{consumptionRecords.length} record{consumptionRecords.length !== 1 && "s"} saved</p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-white/[0.06]">
                    <th className="text-left py-2 px-3 text-slate-500 font-medium">Month</th>
                    <th className="text-left py-2 px-3 text-slate-500 font-medium">Block</th>
                    <th className="text-right py-2 px-3 text-slate-500 font-medium">Energy (kWh)</th>
                    <th className="text-right py-2 px-3 text-slate-500 font-medium">Cost (₹)</th>
                    <th className="text-right py-2 px-3 text-slate-500 font-medium">Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {[...consumptionRecords]
                    .sort((a, b) => b.year - a.year || b.month - a.month || a.block.localeCompare(b.block))
                    .map((r, i) => {
                      const blk = ANALYSIS_BLOCKS.find(b => b.key === r.block);
                      return (
                        <tr key={i} className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors">
                          <td className="py-2 px-3 text-slate-400 font-mono">
                            {MONTH_NAMES[r.month - 1]} {r.year}
                          </td>
                          <td className="py-2 px-3">
                            <span className="flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full" style={{ background: blk?.color || "#64748b" }} />
                              <span className="text-slate-300">{blk?.short || r.block}</span>
                            </span>
                          </td>
                          <td className="py-2 px-3 text-right text-slate-300 font-mono">{r.kwh.toLocaleString("en-IN")}</td>
                          <td className="py-2 px-3 text-right text-slate-400 font-mono">₹{r.cost.toLocaleString("en-IN")}</td>
                          <td className="py-2 px-3 text-right text-slate-500 font-mono">₹{r.rate}/kWh</td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Empty state */}
        {consumptionRecords.length === 0 && (
          <div className="glass-card p-8 flex flex-col items-center justify-center text-center">
            <Info className="w-6 h-6 text-slate-600 mb-2" />
            <p className="text-sm text-slate-500">No consumption data yet — add records in Data Management</p>
          </div>
        )}

        {/* ═══════ ENERGY DEMAND FORECAST ═══════ */}
        {hasManualData && (
          <div className="flex items-center gap-2 mt-4">
            <TrendingUp className="w-4 h-4 text-cyan-400" />
            <h2 className="text-sm font-bold text-slate-300 tracking-tight">Energy Demand Forecast (2026–2032)</h2>
            <div className="flex-1 h-[1px] bg-gradient-to-r from-cyan-500/20 to-transparent ml-3" />
          </div>
        )}

        {hasManualData && forecastLoading && (
          <div className="glass-card p-8 flex items-center justify-center">
            <RefreshCw className="w-5 h-5 text-cyan-400/40 animate-spin mr-2" />
            <span className="text-sm text-slate-500">Loading forecast model…</span>
          </div>
        )}

        {hasManualData && forecastData && !forecastData.error && (
          <>
            {/* Model Info Card */}
            <div className="glass-card accent-bar-cyan p-5">
              <div className="flex items-center gap-2 mb-4">
                <div className="p-2 rounded-xl bg-cyan-500/10 border border-white/[0.04]">
                  <BrainCircuit className="w-4 h-4 text-cyan-400" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-200">Forecasting Model</h3>
                  <p className="text-[10px] text-slate-500">{forecastData.model}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-white/[0.03] rounded-xl p-3 border border-white/[0.04]">
                  <p className="text-[10px] text-slate-500 mb-1">R² Score</p>
                  <p className="text-lg font-bold font-mono text-emerald-400">{forecastData.r_squared}</p>
                </div>
                <div className="bg-white/[0.03] rounded-xl p-3 border border-white/[0.04]">
                  <p className="text-[10px] text-slate-500 mb-1">MAE</p>
                  <p className="text-lg font-bold font-mono text-sky-400">{Number(forecastData.mae_kwh).toLocaleString("en-IN")} <span className="text-[10px] text-slate-500">kWh</span></p>
                </div>
                <div className="bg-white/[0.03] rounded-xl p-3 border border-white/[0.04]">
                  <p className="text-[10px] text-slate-500 mb-1">Net-Zero Year</p>
                  <p className="text-lg font-bold font-mono text-amber-400">{forecastData.net_zero_year}</p>
                </div>
                <div className="bg-white/[0.03] rounded-xl p-3 border border-white/[0.04]">
                  <p className="text-[10px] text-slate-500 mb-1">Solar Capacity</p>
                  <p className="text-lg font-bold font-mono text-violet-400">{forecastData.config?.solar_capacity_kw} <span className="text-[10px] text-slate-500">kW</span></p>
                </div>
              </div>
            </div>

            {/* Baseline 2025 */}
            <div className="glass-card accent-bar-amber p-5">
              <div className="flex items-center gap-2 mb-4">
                <div className="p-2 rounded-xl bg-amber-500/10 border border-white/[0.04]">
                  <Zap className="w-4 h-4 text-amber-400" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-200">Baseline (2025)</h3>
                  <p className="text-[10px] text-slate-500">Current campus energy profile</p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-white/[0.03] rounded-xl p-3 border border-white/[0.04] text-center">
                  <p className="text-[10px] text-slate-500 mb-1">Consumption</p>
                  <p className="text-sm font-bold font-mono text-slate-200">{Number(forecastData.baseline_2025?.consumption_kwh).toLocaleString("en-IN")} kWh</p>
                </div>
                <div className="bg-white/[0.03] rounded-xl p-3 border border-white/[0.04] text-center">
                  <p className="text-[10px] text-slate-500 mb-1">Annual Bill</p>
                  <p className="text-sm font-bold font-mono text-slate-200">₹{Number(forecastData.baseline_2025?.annual_bill_inr).toLocaleString("en-IN")}</p>
                </div>
                <div className="bg-white/[0.03] rounded-xl p-3 border border-white/[0.04] text-center">
                  <p className="text-[10px] text-slate-500 mb-1">Carbon Emissions</p>
                  <p className="text-sm font-bold font-mono text-slate-200">{forecastData.baseline_2025?.carbon_emissions_tonnes} T CO₂</p>
                </div>
              </div>
            </div>

            {/* Demand vs Solar Chart */}
            <div className="glass-card accent-bar-sky p-5">
              <div className="flex items-center gap-2 mb-4">
                <div className="p-2 rounded-xl bg-sky-500/10 border border-white/[0.04]">
                  <BarChart3 className="w-4 h-4 text-sky-400" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-200">Demand vs Solar Generation</h3>
                  <p className="text-[10px] text-slate-500">Historical + Projected with confidence band</p>
                </div>
              </div>

              <ResponsiveContainer width="100%" height={320}>
                <AreaChart
                  data={[
                    ...(forecastData.historical || []).map(h => ({
                      year: h.year,
                      consumption: h.consumption_kwh,
                      type: "historical",
                    })),
                    ...(forecastData.forecast || []).map(f => ({
                      year: f.year,
                      consumption: f.predicted_consumption_kwh,
                      upper: f.upper_band_kwh,
                      lower: f.lower_band_kwh,
                      solar: f.solar_generation_kwh,
                      net: f.net_grid_dependency_kwh,
                      type: "forecast",
                    })),
                  ]}
                  margin={{ top: 8, right: 12, left: 8, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="fcDemandGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#f97316" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="#f97316" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="fcSolarGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#06b6d4" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="#06b6d4" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="fcBandGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#f97316" stopOpacity={0.1} />
                      <stop offset="100%" stopColor="#f97316" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 6" stroke="rgba(255,255,255,0.03)" vertical={false} />
                  <XAxis dataKey="year" tick={{ fontSize: 10, fill: "#475569" }} tickLine={false} axisLine={{ stroke: "rgba(255,255,255,0.04)" }} />
                  <YAxis tick={{ fontSize: 10, fill: "#475569" }} tickLine={false} axisLine={false} tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
                  <Tooltip
                    contentStyle={{ background: "rgba(12,18,32,0.95)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "12px", fontSize: "11px", backdropFilter: "blur(12px)" }}
                    formatter={(val, name) => [`${Number(val).toLocaleString("en-IN")} kWh`, name]}
                  />
                  <Legend verticalAlign="top" height={30} formatter={v => <span className="text-[11px] text-slate-400">{v}</span>} />
                  <Area type="monotone" dataKey="upper" name="Upper Band" stroke="none" fill="url(#fcBandGrad)" fillOpacity={1} />
                  <Area type="monotone" dataKey="lower" name="Lower Band" stroke="none" fill="#000" fillOpacity={0} />
                  <Area type="monotone" dataKey="consumption" name="Demand (kWh)" stroke="#f97316" fill="url(#fcDemandGrad)" strokeWidth={2.5} dot={{ r: 3, fill: "#f97316" }} />
                  <Area type="monotone" dataKey="solar" name="Solar (kWh)" stroke="#06b6d4" fill="url(#fcSolarGrad)" strokeWidth={2.5} dot={{ r: 3, fill: "#06b6d4" }} />
                  <Area type="monotone" dataKey="net" name="Grid Dep. (kWh)" stroke="#a78bfa" fill="none" strokeWidth={1.5} strokeDasharray="6 3" dot={{ r: 2, fill: "#a78bfa" }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Forecast Table */}
            <div className="glass-card accent-bar-emerald p-5">
              <div className="flex items-center gap-2 mb-4">
                <div className="p-2 rounded-xl bg-emerald-500/10 border border-white/[0.04]">
                  <Download className="w-4 h-4 text-emerald-400" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-200">Year-wise Forecast Detail</h3>
                  <p className="text-[10px] text-slate-500">{forecastData.forecast?.length} years projected</p>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-white/[0.06]">
                      <th className="text-left py-2 px-2 text-slate-500 font-medium">Year</th>
                      <th className="text-right py-2 px-2 text-slate-500 font-medium">Demand</th>
                      <th className="text-right py-2 px-2 text-slate-500 font-medium">Solar</th>
                      <th className="text-right py-2 px-2 text-slate-500 font-medium">Net Grid</th>
                      <th className="text-right py-2 px-2 text-slate-500 font-medium">CO₂ (T)</th>
                      <th className="text-right py-2 px-2 text-slate-500 font-medium">Bill (₹)</th>
                      <th className="text-right py-2 px-2 text-slate-500 font-medium">Savings</th>
                      <th className="text-right py-2 px-2 text-slate-500 font-medium">Offset</th>
                      <th className="text-right py-2 px-2 text-slate-500 font-medium">Students</th>
                    </tr>
                  </thead>
                  <tbody>
                    {forecastData.forecast?.map((f, i) => (
                      <tr key={f.year} className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors">
                        <td className="py-2 px-2 text-slate-300 font-mono font-semibold">{f.year}</td>
                        <td className="py-2 px-2 text-right text-slate-300 font-mono">{Number(f.predicted_consumption_kwh).toLocaleString("en-IN")}</td>
                        <td className="py-2 px-2 text-right font-mono" style={{ color: f.solar_generation_kwh > 0 ? "#06b6d4" : "#64748b" }}>{Number(f.solar_generation_kwh).toLocaleString("en-IN")}</td>
                        <td className="py-2 px-2 text-right text-slate-400 font-mono">{Number(f.net_grid_dependency_kwh).toLocaleString("en-IN")}</td>
                        <td className="py-2 px-2 text-right text-slate-400 font-mono">{f.carbon_emissions_tonnes}</td>
                        <td className="py-2 px-2 text-right text-slate-400 font-mono">₹{Number(f.annual_electricity_bill_inr).toLocaleString("en-IN")}</td>
                        <td className="py-2 px-2 text-right font-mono" style={{ color: f.savings_vs_baseline_inr > 0 ? "#34d399" : "#64748b" }}>
                          {f.savings_vs_baseline_inr > 0 ? "+" : ""}₹{Number(f.savings_vs_baseline_inr).toLocaleString("en-IN")}
                        </td>
                        <td className="py-2 px-2 text-right font-mono" style={{ color: f.renewable_offset_pct > 0 ? "#fbbf24" : "#64748b" }}>{f.renewable_offset_pct}%</td>
                        <td className="py-2 px-2 text-right text-slate-500 font-mono">{Number(f.students_projected).toLocaleString("en-IN")}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Anomaly Detection */}
            {forecastData.anomalies?.length > 0 && (
              <div className="glass-card accent-bar-amber p-5">
                <div className="flex items-center gap-2 mb-4">
                  <div className="p-2 rounded-xl bg-amber-500/10 border border-white/[0.04]">
                    <AlertTriangle className="w-4 h-4 text-amber-400" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-200">Anomaly Detection</h3>
                    <p className="text-[10px] text-slate-500">Year-over-year growth analysis (threshold: 7%)</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
                  {forecastData.anomalies.map(a => (
                    <div
                      key={a.year}
                      className={`rounded-xl p-3 border text-center ${
                        a.flag === "HIGH GROWTH"
                          ? "bg-amber-500/[0.06] border-amber-500/15"
                          : "bg-white/[0.02] border-white/[0.04]"
                      }`}
                    >
                      <p className="text-xs font-semibold text-slate-300 font-mono">{a.year}</p>
                      <p className={`text-sm font-bold font-mono mt-1 ${
                        a.flag === "HIGH GROWTH" ? "text-amber-400" : "text-emerald-400"
                      }`}>
                        {a.yoy_growth_pct}%
                      </p>
                      <p className="text-[9px] text-slate-500 mt-1">{a.flag === "HIGH GROWTH" ? "⚠ High" : "✓ Normal"}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Config Summary */}
            <div className="glass-card p-5">
              <div className="flex items-center gap-2 mb-3">
                <div className="p-2 rounded-xl bg-slate-500/10 border border-white/[0.04]">
                  <Info className="w-4 h-4 text-slate-400" />
                </div>
                <h3 className="text-sm font-bold text-slate-200">Model Configuration</h3>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
                {forecastData.config && Object.entries(forecastData.config).map(([k, v]) => (
                  <div key={k} className="bg-white/[0.02] rounded-lg p-2 border border-white/[0.04]">
                    <p className="text-[9px] text-slate-600 truncate">{k.replace(/_/g, " ")}</p>
                    <p className="text-xs text-slate-300 font-mono font-semibold">{v}</p>
                  </div>
                ))}
              </div>
              <div className="mt-3 px-3 py-2 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                <p className="text-[10px] text-slate-500 text-center">
                  Features: {forecastData.features?.join(", ")} · Residual σ: {Number(forecastData.residual_std).toLocaleString("en-IN")} kWh
                </p>
              </div>
            </div>
          </>
        )}

        {hasManualData && forecastData?.error && (
          <div className="glass-card p-8 flex flex-col items-center justify-center text-center">
            <AlertTriangle className="w-6 h-6 text-amber-500 mb-2" />
            <p className="text-sm text-amber-400">Forecast error: {forecastData.error}</p>
            <p className="text-[10px] text-slate-600 mt-1">Ensure backend is running with numpy & scikit-learn installed</p>
          </div>
        )}

        {!hasManualData && (
          <div className="glass-card p-8 flex flex-col items-center justify-center text-center border border-dashed border-white/[0.08]">
            <BrainCircuit className="w-6 h-6 text-violet-400/70 mb-2" />
            <p className="text-sm text-slate-400">Forecast is locked until manual billing data is entered.</p>
            <p className="text-[10px] text-slate-600 mt-1">Go to Data Management → Manual Entry, save at least one month for any block.</p>
          </div>
        )}

      </div>
      )}
    </div>
  );
}
