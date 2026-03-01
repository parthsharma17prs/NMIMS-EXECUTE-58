import React, { useEffect, useMemo, useState } from "react";
import {
  Leaf,
  Zap,
  Unplug,
  IndianRupee,
  ArrowUpRight,
  ArrowDownRight,
  Info,
  RefreshCw,
} from "lucide-react";

const BASE_URL = process.env.REACT_APP_API_URL || "";

function formatINR(value) {
  if (value >= 1_00_00_000) return `₹${(value / 1_00_00_000).toFixed(2)} Cr`;
  if (value >= 1_00_000) return `₹${(value / 1_00_000).toFixed(2)} L`;
  if (value >= 1_000) return `₹${(value / 1_000).toFixed(1)} K`;
  return `₹${value.toFixed(0)}`;
}

function monthLabel(year, month) {
  const d = new Date(year, month - 1, 1);
  return d.toLocaleString("en-IN", { month: "short", year: "numeric" });
}

function FormulaInfo({ formula }) {
  return (
    <details className="group relative">
      <summary className="list-none cursor-pointer flex items-center justify-center w-5 h-5 rounded-md bg-white/[0.03] border border-white/[0.08] text-slate-500 hover:text-slate-300 hover:bg-white/[0.05]">
        <Info className="w-3 h-3" />
      </summary>
      <div className="absolute right-0 mt-2 z-20 w-72 p-3 rounded-xl border border-white/[0.08] bg-[#090f1a]/95 backdrop-blur-xl shadow-xl">
        <p className="text-[10px] uppercase tracking-wider text-slate-500 mb-1">Formula</p>
        <p className="text-[11px] leading-relaxed text-slate-300">{formula}</p>
      </div>
    </details>
  );
}

function buildManualMetrics(records) {
  if (!records.length) {
    return [
      {
        id: "carbon",
        label: "Net Carbon Emissions",
        value: "--",
        unit: "enter data first",
        delta: "NA",
        deltaDirection: "down",
        icon: Leaf,
        accent: "text-emerald-400",
        accentBg: "bg-emerald-500/10",
        barClass: "accent-bar-emerald",
        glowClass: "hover:shadow-glow-emerald",
        borderAccent: "hover:border-emerald-500/20",
        formula: "Carbon (tonnes CO₂) = Monthly Consumption (kWh) × 0.00082",
      },
      {
        id: "eui",
        label: "Energy Use Intensity",
        value: "--",
        unit: "needs campus area",
        delta: "NA",
        deltaDirection: "down",
        icon: Zap,
        accent: "text-sky-400",
        accentBg: "bg-sky-500/10",
        barClass: "accent-bar-sky",
        glowClass: "hover:shadow-glow-sky",
        borderAccent: "hover:border-sky-500/20",
        formula: "EUI = Total Energy Consumption (kWh) ÷ Built-up Area (m²)",
      },
      {
        id: "grid",
        label: "Grid Independence",
        value: "--",
        unit: "needs solar data",
        delta: "NA",
        deltaDirection: "up",
        icon: Unplug,
        accent: "text-violet-400",
        accentBg: "bg-violet-500/10",
        barClass: "accent-bar-violet",
        glowClass: "hover:shadow-glow-violet",
        borderAccent: "hover:border-violet-500/20",
        formula: "Grid Independence (%) = (Solar Energy ÷ Total Energy) × 100",
      },
      {
        id: "savings",
        label: "Financial Spend",
        value: "--",
        unit: "enter data first",
        delta: "NA",
        deltaDirection: "up",
        icon: IndianRupee,
        accent: "text-amber-400",
        accentBg: "bg-amber-500/10",
        barClass: "accent-bar-amber",
        glowClass: "hover:shadow-glow-amber",
        borderAccent: "hover:border-amber-500/20",
        formula: "Monthly Electricity Cost (₹) = Monthly Consumption (kWh) × Tariff (₹/kWh)",
      },
    ];
  }

  const grouped = {};
  records.forEach((r) => {
    const key = `${r.year}-${String(r.month).padStart(2, "0")}`;
    if (!grouped[key]) grouped[key] = { year: r.year, month: r.month, kwh: 0, cost: 0 };
    grouped[key].kwh += Number(r.kwh || 0);
    grouped[key].cost += Number(r.cost || 0);
  });

  const months = Object.values(grouped).sort((a, b) => a.year - b.year || a.month - b.month);
  const latest = months[months.length - 1];
  const previous = months.length > 1 ? months[months.length - 2] : null;

  const carbonTonnes = latest.kwh * 0.00082;
  const deltaCost = previous && previous.cost > 0
    ? ((latest.cost - previous.cost) / previous.cost) * 100
    : null;
  const deltaKwh = previous && previous.kwh > 0
    ? ((latest.kwh - previous.kwh) / previous.kwh) * 100
    : null;

  return [
    {
      id: "carbon",
      label: "Net Carbon Emissions",
      value: carbonTonnes.toFixed(2),
      unit: "tonnes CO₂",
      delta: deltaKwh === null ? "NA" : `${deltaKwh >= 0 ? "+" : ""}${deltaKwh.toFixed(1)}%`,
      deltaDirection: deltaKwh !== null && deltaKwh <= 0 ? "down" : "up",
      icon: Leaf,
      accent: "text-emerald-400",
      accentBg: "bg-emerald-500/10",
      barClass: "accent-bar-emerald",
      glowClass: "hover:shadow-glow-emerald",
      borderAccent: "hover:border-emerald-500/20",
      formula: "Carbon (tonnes CO₂) = Monthly Consumption (kWh) × 0.00082",
    },
    {
      id: "eui",
      label: "Energy Use Intensity",
      value: "--",
      unit: "kWh / m²",
      delta: "NA",
      deltaDirection: "down",
      icon: Zap,
      accent: "text-sky-400",
      accentBg: "bg-sky-500/10",
      barClass: "accent-bar-sky",
      glowClass: "hover:shadow-glow-sky",
      borderAccent: "hover:border-sky-500/20",
      formula: "EUI = Total Energy Consumption (kWh) ÷ Built-up Area (m²). (Area data pending in manual mode)",
    },
    {
      id: "grid",
      label: "Grid Independence",
      value: "--",
      unit: "%",
      delta: "NA",
      deltaDirection: "up",
      icon: Unplug,
      accent: "text-violet-400",
      accentBg: "bg-violet-500/10",
      barClass: "accent-bar-violet",
      glowClass: "hover:shadow-glow-violet",
      borderAccent: "hover:border-violet-500/20",
      formula: "Grid Independence (%) = (Solar Energy ÷ Total Energy) × 100. (Solar split unavailable in manual bill entries)",
    },
    {
      id: "savings",
      label: "Financial Spend",
      value: formatINR(latest.cost),
      unit: monthLabel(latest.year, latest.month),
      delta: deltaCost === null ? "NA" : `${deltaCost >= 0 ? "+" : ""}${deltaCost.toFixed(1)}%`,
      deltaDirection: deltaCost !== null && deltaCost <= 0 ? "down" : "up",
      icon: IndianRupee,
      accent: "text-amber-400",
      accentBg: "bg-amber-500/10",
      barClass: "accent-bar-amber",
      glowClass: "hover:shadow-glow-amber",
      borderAccent: "hover:border-amber-500/20",
      formula: "Monthly Electricity Cost (₹) = Monthly Consumption (kWh) × Tariff (₹/kWh)",
    },
  ];
}

function buildIotMetrics(overview) {
  const carbonTonnes = Number(overview?.carbon_saved_today_kg || 0) / 1000;
  return [
    {
      id: "carbon",
      label: "Carbon Saved Today",
      value: carbonTonnes.toFixed(2),
      unit: "tonnes CO₂",
      delta: "Live",
      deltaDirection: "up",
      icon: Leaf,
      accent: "text-emerald-400",
      accentBg: "bg-emerald-500/10",
      barClass: "accent-bar-emerald",
      glowClass: "hover:shadow-glow-emerald",
      borderAccent: "hover:border-emerald-500/20",
      formula: "Carbon Saved (kg) = Solar Energy (kWh) × 0.82; tonnes = kg ÷ 1000",
    },
    {
      id: "eui",
      label: "Energy Use Intensity",
      value: Number(overview?.campus_eui || 0).toFixed(1),
      unit: "kWh / m²",
      delta: "Live",
      deltaDirection: "down",
      icon: Zap,
      accent: "text-sky-400",
      accentBg: "bg-sky-500/10",
      barClass: "accent-bar-sky",
      glowClass: "hover:shadow-glow-sky",
      borderAccent: "hover:border-sky-500/20",
      formula: "EUI = Total Consumption (kWh) ÷ Built-up Area (m²)",
    },
    {
      id: "grid",
      label: "Grid Independence",
      value: Number(overview?.renewable_pct || 0).toFixed(1),
      unit: "%",
      delta: "Live",
      deltaDirection: "up",
      icon: Unplug,
      accent: "text-violet-400",
      accentBg: "bg-violet-500/10",
      barClass: "accent-bar-violet",
      glowClass: "hover:shadow-glow-violet",
      borderAccent: "hover:border-violet-500/20",
      formula: "Grid Independence (%) = (Solar Energy ÷ Total Energy) × 100",
    },
    {
      id: "savings",
      label: "Financial Savings",
      value: formatINR(Number(overview?.financial_savings_inr || 0)),
      unit: "today",
      delta: "Live",
      deltaDirection: "up",
      icon: IndianRupee,
      accent: "text-amber-400",
      accentBg: "bg-amber-500/10",
      barClass: "accent-bar-amber",
      glowClass: "hover:shadow-glow-amber",
      borderAccent: "hover:border-amber-500/20",
      formula: "Financial Savings (₹) = Solar Energy (kWh) × Avoided Grid Tariff (₹/kWh)",
    },
  ];
}

/* ── Single KPI Card ──────────────────────────────────────── */
function KpiCard({ metric, index }) {
  const Icon = metric.icon;
  const DeltaIcon = metric.deltaDirection === "up" ? ArrowUpRight : ArrowDownRight;
  const hasNumericDelta = metric.delta !== "NA" && metric.delta !== "Live";
  const isLive = metric.delta === "Live";
  const isPositive =
    (metric.deltaDirection === "down" && (metric.id === "carbon" || metric.id === "eui")) ||
    (metric.deltaDirection === "up" && metric.id !== "carbon" && metric.id !== "eui");

  return (
    <div
      className={`
        glass-card glass-card-hover ${metric.barClass} p-5 min-w-[200px]
        animate-fade-in-up stagger-${index + 1}
        ${metric.glowClass} ${metric.borderAccent}
      `}
    >
      {/* Top row: icon + delta badge */}
      <div className="flex items-center justify-between mb-4">
        <div className={`p-2.5 rounded-xl ${metric.accentBg} border border-white/[0.04]`}>
          <Icon className={`w-5 h-5 ${metric.accent}`} />
        </div>
        <div className="flex items-center gap-2">
          <FormulaInfo formula={metric.formula} />
          <span
            className={`
              flex items-center gap-0.5 text-xs font-semibold tracking-wide px-2 py-0.5 rounded-full
              ${isLive
                ? "bg-sky-500/15 text-sky-400"
                : hasNumericDelta
                ? isPositive
                  ? "bg-emerald-500/15 text-emerald-400"
                  : "bg-red-500/15 text-red-400"
                : "bg-white/[0.06] text-slate-500"
              }
            `}
          >
            {!isLive && hasNumericDelta && <DeltaIcon className="w-3 h-3" />}
            {metric.delta}
          </span>
        </div>
      </div>

      {/* Value */}
      <p className="text-2xl font-extrabold text-white leading-none tracking-tight">
        {metric.value}
        <span className="text-xs font-normal text-slate-500 ml-1.5">
          {metric.unit}
        </span>
      </p>

      {/* Label */}
      <p className="text-[11px] text-slate-500 mt-2.5 uppercase tracking-wider font-medium">
        {metric.label}
      </p>
    </div>
  );
}

/* ── Exported Component ───────────────────────────────────── */
export default function TopMetricsBar() {
  const [mode, setMode] = useState("manual");
  const [overview, setOverview] = useState(null);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const [modeRes, ovRes, recRes] = await Promise.all([
          fetch(`${BASE_URL}/api/data-mode`),
          fetch(`${BASE_URL}/api/overview`),
          fetch(`${BASE_URL}/api/block-consumption`),
        ]);

        if (cancelled) return;

        if (modeRes.ok) {
          const m = await modeRes.json();
          setMode(m.mode || "manual");
        }
        if (ovRes.ok) setOverview(await ovRes.json());
        if (recRes.ok) setRecords(await recRes.json());
      } catch {
        // keep silent; UI shows placeholders
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    const id = setInterval(load, 10000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  const metrics = useMemo(() => {
    return mode === "iot" ? buildIotMetrics(overview) : buildManualMetrics(records);
  }, [mode, overview, records]);

  return (
    <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
      {loading && (
        <div className="col-span-full flex items-center gap-2 text-[11px] text-slate-500">
          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
          Syncing dashboard metrics from Data Management...
        </div>
      )}
      {metrics.map((m, i) => (
        <KpiCard key={m.id} metric={m} index={i} />
      ))}
    </section>
  );
}
