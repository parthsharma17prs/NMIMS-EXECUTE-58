import React, { useEffect, useMemo, useState } from "react";
import { Leaf, Gauge, TrendingUp, Users, Info, RefreshCw } from "lucide-react";

const BASE = process.env.REACT_APP_API_URL || "";
const KPI_URL = `${BASE}/api/sustainability-kpis`;

function valueColor(id) {
  if (id === "renewable_pct") return "text-emerald-400";
  if (id === "peak_reduction") return "text-amber-400";
  if (id === "energy_intensity") return "text-sky-400";
  return "text-violet-400";
}

function iconFor(id) {
  if (id === "renewable_pct") return Leaf;
  if (id === "peak_reduction") return TrendingUp;
  if (id === "energy_intensity") return Gauge;
  return Users;
}

function renderValue(v) {
  if (typeof v === "number") return Number(v).toLocaleString("en-IN", { maximumFractionDigits: 2 });
  return String(v);
}

function MiniSparkline({ labels = [], values = [] }) {
  const cleaned = values.map((v) => (typeof v === "number" ? v : null)).filter((v) => v !== null);
  const max = cleaned.length ? Math.max(...cleaned) : 1;
  const min = cleaned.length ? Math.min(...cleaned) : 0;
  const range = max - min || 1;

  return (
    <div className="mt-3">
      <div className="flex items-end gap-1 h-10">
        {values.map((v, idx) => {
          if (typeof v !== "number") {
            return <div key={idx} className="flex-1 h-1 rounded bg-white/[0.04]" />;
          }
          const pct = Math.max(12, ((v - min) / range) * 100);
          return (
            <div
              key={idx}
              className="flex-1 rounded-t bg-sky-400/60"
              style={{ height: `${pct}%` }}
              title={`${labels[idx] || ""}: ${v}`}
            />
          );
        })}
      </div>
      <div className="flex justify-between mt-1 text-[9px] text-slate-600">
        <span>{labels[0] || ""}</span>
        <span>{labels[labels.length - 1] || ""}</span>
      </div>
    </div>
  );
}

function KpiCard({ kpi }) {
  const Icon = iconFor(kpi.id);
  const deltaSigned = kpi.delta_signed_pct;
  const deltaLabel = typeof deltaSigned === "number"
    ? `${deltaSigned >= 0 ? "+" : ""}${deltaSigned.toFixed(1)}%`
    : "NA";

  return (
    <div className="glass-card glass-card-hover p-5 border-t-2 border-t-sky-500/20">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-sky-500/10 border border-white/[0.05]">
            <Icon className={`w-4 h-4 ${valueColor(kpi.id)}`} />
          </div>
          <div>
            <p className="text-xs text-slate-500 uppercase tracking-wider">{kpi.title}</p>
            <p className="text-[10px] text-slate-600 mt-0.5">{kpi.description}</p>
          </div>
        </div>

        <details className="group relative">
          <summary className="list-none cursor-pointer w-5 h-5 rounded-md bg-white/[0.03] border border-white/[0.06] text-slate-500 hover:text-slate-300 flex items-center justify-center">
            <Info className="w-3 h-3" />
          </summary>
          <div className="absolute right-0 mt-2 z-20 w-72 p-3 rounded-xl border border-white/[0.08] bg-[#090f1a]/95 backdrop-blur-xl shadow-xl">
            <p className="text-[10px] uppercase tracking-wider text-slate-500 mb-1">Formula</p>
            <p className="text-[11px] leading-relaxed text-slate-300">{kpi.formula}</p>
          </div>
        </details>
      </div>

      <div className="flex items-end justify-between gap-2">
        <div>
          <p className={`text-2xl font-extrabold ${valueColor(kpi.id)}`}>{renderValue(kpi.value)}</p>
          <p className="text-[11px] text-slate-500 mt-0.5">{kpi.unit}</p>
        </div>
        <span className={`text-[11px] font-semibold px-2 py-1 rounded-full ${
          deltaLabel === "NA"
            ? "bg-white/[0.05] text-slate-500"
            : kpi.trend === "improved"
            ? "bg-emerald-500/15 text-emerald-400"
            : "bg-amber-500/15 text-amber-400"
        }`}>
          {deltaLabel}
        </span>
      </div>

      <MiniSparkline labels={kpi.sparkline?.labels || []} values={kpi.sparkline?.values || []} />
    </div>
  );
}

export default function SustainabilityKPIPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch(KPI_URL);
      if (!res.ok) throw new Error("Failed to load sustainability KPIs");
      setData(await res.json());
    } catch {
      setData({ status: "error", kpis: [] });
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
    const id = setInterval(load, 15000);
    return () => clearInterval(id);
  }, []);

  const kpis = useMemo(() => data?.kpis || [], [data]);

  return (
    <div className="space-y-5 animate-fade-in-up">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wider">Sustainability KPIs</h2>
          <p className="text-[11px] text-slate-500 mt-1">
            Source: {data?.mode === "iot" ? "IoT telemetry (Data Management)" : "Manual billing entries (Data Management)"}
            {data?.period ? ` · Period: ${data.period}` : ""}
          </p>
        </div>
        <button
          onClick={load}
          className="flex items-center gap-1.5 text-[11px] text-slate-500 hover:text-slate-300 transition-colors px-2 py-1 rounded-lg hover:bg-white/[0.03]"
        >
          <RefreshCw className="w-3 h-3" /> Refresh
        </button>
      </div>

      {loading ? (
        <div className="glass-card h-48 flex items-center justify-center">
          <span className="text-sm text-slate-500">Loading sustainability metrics…</span>
        </div>
      ) : kpis.length === 0 ? (
        <div className="glass-card p-8 text-center">
          <p className="text-sm text-slate-400">{data?.message || "No KPI data available"}</p>
          <p className="text-[10px] text-slate-600 mt-1">Add/Connect data in Data Management to enable this section.</p>
        </div>
      ) : (
        <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {kpis.map((kpi) => <KpiCard key={kpi.id} kpi={kpi} />)}
        </section>
      )}

      <div className="glass-card p-5 border-l-2 border-l-violet-500/30">
        <h3 className="text-sm font-semibold text-slate-300 mb-2">Information required for full KPI accuracy</h3>
        <ul className="space-y-1.5 text-[11px] text-slate-500 list-disc list-inside">
          {(data?.requirements?.needed_for_full_accuracy || []).map((item, idx) => (
            <li key={idx}>{item}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
