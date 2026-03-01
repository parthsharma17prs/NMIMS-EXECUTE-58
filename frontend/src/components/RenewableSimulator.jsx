import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from "recharts";
import {
  Sun,
  Cloud,
  CloudRain,
  CloudSnow,
  CloudLightning,
  CloudFog,
  Zap,
  Battery,
  BatteryCharging,
  MapPin,
  RefreshCw,
  Loader2,
  Droplets,
  Wind,
  ArrowDown,
  ArrowUp,
} from "lucide-react";

const BASE = process.env.REACT_APP_API_URL || "";
const API_URL = `${BASE}/api/renewable-mix`;
const POLL_INTERVAL = 5000;

/* ── Weather condition → icon ─────────────────────────────────── */
function WeatherIcon({ condition, className = "w-8 h-8" }) {
  const c = (condition || "").toLowerCase();
  if (c.includes("clear") || c.includes("sunny"))
    return <Sun className={`${className} text-amber-400 animate-float drop-shadow-[0_0_12px_rgba(251,191,36,0.5)]`} />;
  if (c.includes("rain") || c.includes("shower"))
    return <CloudRain className={`${className} text-blue-400`} />;
  if (c.includes("snow"))
    return <CloudSnow className={`${className} text-slate-300`} />;
  if (c.includes("thunder"))
    return <CloudLightning className={`${className} text-yellow-400`} />;
  if (c.includes("fog"))
    return <CloudFog className={`${className} text-slate-400`} />;
  return <Cloud className={`${className} text-slate-400`} />;
}

/* ── Gradient Donut Colors ────────────────────────────────────── */
const MIX_COLORS = {
  Grid: "url(#mixGridGrad)",
  Solar: "url(#mixSolarGrad)",
  Battery: "url(#mixBatteryGrad)",
};
const LEGEND_DOT = {
  Grid: "#ef4444",
  Solar: "#facc15",
  Battery: "#22d3ee",
};

/* ── Battery gauge ────────────────────────────────────────────── */
function BatteryGauge({ soc, status, currentKw, capacityKwh }) {
  const Icon = status === "Charging" ? BatteryCharging : Battery;
  const gradientBar =
    soc > 60
      ? "from-emerald-500 to-emerald-400"
      : soc > 25
      ? "from-amber-400 to-yellow-400"
      : "from-red-500 to-rose-400";
  const glowColor =
    soc > 60
      ? "shadow-[0_0_10px_rgba(16,185,129,0.4)]"
      : soc > 25
      ? "shadow-[0_0_10px_rgba(245,158,11,0.4)]"
      : "shadow-[0_0_10px_rgba(239,68,68,0.4)]";

  return (
    <div className="glass-card accent-bar-cyan p-5 animate-fade-in-up stagger-2">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-cyan-500/10 border border-cyan-500/20">
            <Icon className="w-4 h-4 text-cyan-400" />
          </div>
          <span className="text-sm font-medium text-slate-300">
            Battery Storage
          </span>
        </div>
        <span
          className={`text-[10px] px-2.5 py-0.5 rounded-full font-semibold tracking-wide ${
            status === "Charging"
              ? "bg-emerald-500/15 text-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.15)]"
              : status === "Discharging"
              ? "bg-amber-500/15 text-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.15)]"
              : "bg-white/5 text-slate-500"
          }`}
        >
          {status}
        </span>
      </div>

      {/* SoC bar with gradient + glow */}
      <div className="relative h-6 bg-white/[0.04] rounded-full overflow-hidden border border-white/[0.06] mb-2">
        <div
          className={`absolute inset-y-0 left-0 bg-gradient-to-r ${gradientBar} rounded-full transition-all duration-700 ${glowColor}`}
          style={{ width: `${Math.max(2, soc)}%` }}
        />
        <span className="absolute inset-0 flex items-center justify-center text-[11px] font-bold text-white drop-shadow-md">
          {soc.toFixed(1)}%
        </span>
      </div>

      <div className="flex justify-between text-[11px] text-slate-500">
        <span>{capacityKwh} kWh capacity</span>
        <span className="flex items-center gap-1">
          {currentKw < 0 ? (
            <ArrowDown className="w-3 h-3 text-emerald-400" />
          ) : currentKw > 0 ? (
            <ArrowUp className="w-3 h-3 text-amber-400" />
          ) : null}
          {Math.abs(currentKw).toFixed(1)} kW
        </span>
      </div>
    </div>
  );
}

/* ── Custom pie chart label ───────────────────────────────────── */
const renderCustomLabel = ({
  cx,
  cy,
  midAngle,
  innerRadius,
  outerRadius,
  percent,
}) => {
  if (percent < 0.04) return null;
  const RADIAN = Math.PI / 180;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  return (
    <text
      x={x}
      y={y}
      fill="white"
      textAnchor="middle"
      dominantBaseline="central"
      fontSize={12}
      fontWeight={700}
      style={{ textShadow: "0 1px 4px rgba(0,0,0,0.6)" }}
    >
      {(percent * 100).toFixed(0)}%
    </text>
  );
};

/* ── Custom Legend ─────────────────────────────────────────────── */
const CustomLegend = ({ payload }) => (
  <div className="flex items-center justify-center gap-5 mt-2">
    {payload?.map((entry) => (
      <div key={entry.value} className="flex items-center gap-1.5">
        <span
          className="w-2.5 h-2.5 rounded-full"
          style={{
            backgroundColor: LEGEND_DOT[entry.value] || entry.color,
            boxShadow: `0 0 6px ${LEGEND_DOT[entry.value] || entry.color}60`,
          }}
        />
        <span className="text-[11px] text-slate-400">{entry.value}</span>
      </div>
    ))}
  </div>
);

/* ═══════════════════════════════════════════════════════════════════
   RenewableSimulator — Glass-Card Design
   ═══════════════════════════════════════════════════════════════════ */
export default function RenewableSimulator() {
  const [data, setData] = useState(null);
  const [location, setLocation] = useState({ lat: null, lon: null });
  const [geoStatus, setGeoStatus] = useState("pending");
  const [loading, setLoading] = useState(true);
  const timerRef = useRef(null);

  /* ── Geolocation ────────────────────────────────────────────── */
  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) { setGeoStatus("unsupported"); return; }
    setGeoStatus("pending");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation({ lat: pos.coords.latitude.toFixed(4), lon: pos.coords.longitude.toFixed(4) });
        setGeoStatus("granted");
      },
      () => setGeoStatus("denied"),
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 }
    );
  }, []);

  useEffect(() => { requestLocation(); }, [requestLocation]);

  /* ── Poll backend ───────────────────────────────────────────── */
  const fetchMix = useCallback(async () => {
    try {
      let url = API_URL;
      if (location.lat && location.lon) url += `?lat=${location.lat}&lon=${location.lon}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setData(await res.json());
    } catch (err) {
      console.error("Renewable-mix fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, [location]);

  useEffect(() => {
    fetchMix();
    timerRef.current = setInterval(fetchMix, POLL_INTERVAL);
    return () => clearInterval(timerRef.current);
  }, [fetchMix]);

  /* ── Pie data ───────────────────────────────────────────────── */
  const pieData = data
    ? [
        { name: "Grid", value: Math.max(0, data.energy_mix.grid_kw) },
        { name: "Solar", value: Math.max(0, data.energy_mix.solar_kw) },
        { name: "Battery", value: Math.max(0, data.energy_mix.battery_kw) },
      ].filter((d) => d.value > 0)
    : [];
  const totalSupply = pieData.reduce((s, d) => s + d.value, 0);

  /* ── Loading / error states ─────────────────────────────────── */
  if (loading && !data) {
    return (
      <div className="flex items-center justify-center h-96 text-slate-500">
        <Loader2 className="w-6 h-6 animate-spin mr-2" />
        Loading renewable data…
      </div>
    );
  }
  if (!data) {
    return (
      <div className="text-center text-slate-500 py-20">
        Unable to reach backend. Make sure Flask is running on port 5000.
      </div>
    );
  }

  const { weather, solar_multiplier, energy_mix, battery, blocks } = data;

  return (
    <div className="space-y-6">
      {/* ── Location Bar ──────────────────────────────────────── */}
      <div className="glass-card flex flex-wrap items-center gap-3 px-5 py-3 animate-fade-in-up">
        <div className="p-1.5 rounded-lg bg-sky-500/10 border border-sky-500/20">
          <MapPin className="w-4 h-4 text-sky-400" />
        </div>
        {geoStatus === "granted" ? (
          <span className="text-sm text-slate-300">
            Live Location:{" "}
            <span className="font-mono text-sky-400 font-semibold">
              {location.lat}°, {location.lon}°
            </span>
          </span>
        ) : geoStatus === "denied" ? (
          <span className="text-sm text-amber-400">
            Location access denied — using simulated weather
          </span>
        ) : geoStatus === "unsupported" ? (
          <span className="text-sm text-amber-400">
            Geolocation not supported — using simulated weather
          </span>
        ) : (
          <span className="text-sm text-slate-500 flex items-center gap-1">
            <Loader2 className="w-3 h-3 animate-spin" /> Locating…
          </span>
        )}
        <button
          onClick={requestLocation}
          title="Refresh location"
          className="ml-auto p-1.5 rounded-lg hover:bg-white/[0.06] text-slate-500 hover:text-slate-300 transition-all"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
        {weather.source === "live" && (
          <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 font-semibold tracking-wide shadow-[0_0_8px_rgba(16,185,129,0.15)]">
            LIVE WEATHER
          </span>
        )}
        {weather.source === "simulated" && (
          <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-400 font-semibold tracking-wide">
            SIMULATED
          </span>
        )}
      </div>

      {/* ── Row 2: Weather + Donut + Battery ──────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* ── Weather Panel ──────────────────────────────────── */}
        <div className="glass-card glass-card-hover accent-bar-amber p-5 animate-fade-in-up stagger-1">
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4">
            Weather Conditions
          </h3>
          <div className="flex items-center gap-4 mb-5">
            <div className="relative">
              <WeatherIcon condition={weather.condition} className="w-14 h-14 relative z-10" />
              {(weather.condition || "").toLowerCase().includes("clear") && (
                <div className="absolute inset-0 bg-amber-400/15 rounded-full blur-xl" />
              )}
            </div>
            <div>
              <p className="text-3xl font-extrabold text-white tracking-tight">
                {weather.temp_c}°C
              </p>
              <p className="text-sm text-slate-400 mt-0.5">{weather.condition}</p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 text-center">
            {[
              { icon: Cloud, color: "text-slate-400", bg: "bg-white/[0.04] border-white/[0.06]", value: `${weather.cloud_cover_pct}%`, label: "Cloud Cover" },
              { icon: Droplets, color: "text-blue-400", bg: "bg-blue-500/[0.06] border-blue-500/[0.1]", value: `${weather.humidity_pct}%`, label: "Humidity" },
              { icon: Wind, color: "text-teal-400", bg: "bg-teal-500/[0.06] border-teal-500/[0.1]", value: weather.wind_kmh, label: "km/h Wind" },
            ].map((item) => (
              <div key={item.label} className={`rounded-xl p-2.5 border ${item.bg}`}>
                <item.icon className={`w-4 h-4 mx-auto mb-1.5 ${item.color}`} />
                <p className="text-lg font-bold text-white">{item.value}</p>
                <p className="text-[10px] text-slate-500">{item.label}</p>
              </div>
            ))}
          </div>

          {/* Solar efficiency bar */}
          <div className="mt-4 rounded-xl p-3 bg-white/[0.03] border border-white/[0.06]">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-400 flex items-center gap-1.5">
                <Sun className="w-4 h-4 text-yellow-400" />
                Solar Efficiency
              </span>
              <span
                className={`font-bold ${
                  solar_multiplier > 0.7
                    ? "text-emerald-400"
                    : solar_multiplier > 0.4
                    ? "text-amber-400"
                    : "text-red-400"
                }`}
              >
                {(solar_multiplier * 100).toFixed(0)}%
              </span>
            </div>
            <div className="mt-2 h-2.5 bg-white/[0.04] rounded-full overflow-hidden border border-white/[0.06]">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${solar_multiplier * 100}%`,
                  background:
                    solar_multiplier > 0.7
                      ? "linear-gradient(90deg, #10b981, #34d399)"
                      : solar_multiplier > 0.4
                      ? "linear-gradient(90deg, #f59e0b, #fbbf24)"
                      : "linear-gradient(90deg, #ef4444, #f87171)",
                  boxShadow:
                    solar_multiplier > 0.7
                      ? "0 0 8px rgba(16,185,129,0.4)"
                      : solar_multiplier > 0.4
                      ? "0 0 8px rgba(245,158,11,0.4)"
                      : "0 0 8px rgba(239,68,68,0.4)",
                }}
              />
            </div>
            <p className="text-[10px] text-slate-600 mt-1.5">
              {weather.cloud_cover_pct}% cloud cover reduces solar output by{" "}
              {(100 - solar_multiplier * 100).toFixed(0)}%
            </p>
          </div>
        </div>

        {/* ── Donut Chart ─────────────────────────────────────── */}
        <div className="glass-card glass-card-hover accent-bar-violet p-5 flex flex-col items-center animate-fade-in-up stagger-2">
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 self-start">
            Live Energy Mix
          </h3>
          <div className="w-full chart-glow" style={{ height: 260 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <defs>
                  <linearGradient id="mixGridGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#ef4444" />
                    <stop offset="100%" stopColor="#dc2626" />
                  </linearGradient>
                  <linearGradient id="mixSolarGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#fbbf24" />
                    <stop offset="100%" stopColor="#f59e0b" />
                  </linearGradient>
                  <linearGradient id="mixBatteryGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#22d3ee" />
                    <stop offset="100%" stopColor="#06b6d4" />
                  </linearGradient>
                </defs>
                <Pie
                  data={pieData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={3}
                  strokeWidth={0}
                  label={renderCustomLabel}
                  labelLine={false}
                  animationDuration={1200}
                  isAnimationActive
                >
                  {pieData.map((entry) => (
                    <Cell key={entry.name} fill={MIX_COLORS[entry.name]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: "rgba(15,22,41,0.95)",
                    backdropFilter: "blur(12px)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    borderRadius: 12,
                    fontSize: 12,
                    boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
                  }}
                  formatter={(val) => `${val.toFixed(1)} kW`}
                />
                <Legend content={<CustomLegend />} verticalAlign="bottom" />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Total supply:{" "}
            <span className="text-white font-semibold">
              {totalSupply.toFixed(1)} kW
            </span>
          </p>
        </div>

        {/* ── Battery + Power Balance ─────────────────────────── */}
        <div className="space-y-5">
          <BatteryGauge
            soc={battery.soc_pct}
            status={battery.status}
            currentKw={battery.current_kw}
            capacityKwh={battery.capacity_kwh}
          />

          <div className="glass-card accent-bar-emerald p-5 animate-fade-in-up stagger-3">
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
              Power Balance
            </h3>
            <div className="space-y-3">
              {[
                {
                  label: "Total Demand",
                  value: energy_mix.total_demand_kw,
                  color: "text-white",
                  icon: Zap,
                  iconColor: "text-slate-400",
                  iconBg: "bg-white/[0.06] border-white/[0.08]",
                  border: "border-l-white/20",
                },
                {
                  label: "Grid Import",
                  value: energy_mix.grid_kw,
                  color: "text-red-400",
                  icon: Zap,
                  iconColor: "text-red-400",
                  iconBg: "bg-red-500/[0.08] border-red-500/[0.15]",
                  border: "border-l-red-400/40",
                },
                {
                  label: "Solar Generation",
                  value: energy_mix.solar_kw,
                  color: "text-yellow-400",
                  icon: Sun,
                  iconColor: "text-yellow-400",
                  iconBg: "bg-yellow-500/[0.08] border-yellow-500/[0.15]",
                  border: "border-l-yellow-400/40",
                },
                {
                  label: "Battery",
                  value: Math.abs(energy_mix.battery_kw),
                  color: "text-cyan-400",
                  icon: Battery,
                  iconColor: "text-cyan-400",
                  iconBg: "bg-cyan-500/[0.08] border-cyan-500/[0.15]",
                  border: "border-l-cyan-400/40",
                  suffix:
                    energy_mix.battery_kw < 0
                      ? " (charging)"
                      : energy_mix.battery_kw > 0
                      ? " (supply)"
                      : " (idle)",
                },
              ].map((item) => (
                <div
                  key={item.label}
                  className={`flex items-center justify-between pl-3 border-l-2 ${item.border} py-1`}
                >
                  <span className="text-sm text-slate-400 flex items-center gap-2">
                    <span className={`p-1 rounded-md border ${item.iconBg}`}>
                      <item.icon className={`w-3.5 h-3.5 ${item.iconColor}`} />
                    </span>
                    {item.label}
                  </span>
                  <span className={`text-sm font-mono font-semibold ${item.color}`}>
                    {item.value.toFixed(1)} kW
                    {item.suffix && (
                      <span className="text-[10px] text-slate-500 ml-1">
                        {item.suffix}
                      </span>
                    )}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Row 3: Block-wise Solar ───────────────────────────── */}
      <div className="glass-card accent-bar-sky p-5 animate-fade-in-up stagger-4">
        <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4">
          Block-wise Solar Adjustment
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {blocks.map((b, index) => {
            const penalty =
              b.solar_raw_kw > 0
                ? (((b.solar_raw_kw - b.solar_adjusted_kw) / b.solar_raw_kw) * 100).toFixed(0)
                : 0;
            const efficiency =
              b.solar_raw_kw > 0
                ? (b.solar_adjusted_kw / b.solar_raw_kw) * 100
                : 0;
            const borderColor =
              efficiency > 70
                ? "border-l-emerald-500/60"
                : efficiency > 40
                ? "border-l-amber-400/60"
                : "border-l-red-500/60";

            return (
              <div
                key={b.name}
                className={`rounded-xl p-4 bg-white/[0.03] border border-white/[0.06] border-l-2 ${borderColor} hover:bg-white/[0.05] transition-all duration-300 animate-fade-in-up`}
                style={{ animationDelay: `${index * 80}ms` }}
              >
                <p className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-sky-400" style={{ boxShadow: "0 0 6px rgba(56,189,248,0.5)" }} />
                  {b.name}
                </p>
                <div className="space-y-2 text-[13px]">
                  {[
                    { label: "Grid Draw", value: b.grid_kw, color: "text-red-400" },
                    { label: "Solar (raw)", value: b.solar_raw_kw, color: "text-yellow-300" },
                    { label: "Solar (adjusted)", value: b.solar_adjusted_kw, color: "text-yellow-400" },
                    { label: "HVAC", value: b.hvac_kw, color: "text-sky-400" },
                  ].map((item) => (
                    <div key={item.label} className="flex justify-between">
                      <span className="text-slate-400">{item.label}</span>
                      <span className={`${item.color} font-mono font-medium`}>
                        {item.value.toFixed(1)} kW
                      </span>
                    </div>
                  ))}
                  {penalty > 0 && (
                    <div className="mt-2 text-[11px] text-amber-400/80 bg-amber-500/[0.08] border border-amber-500/[0.12] rounded-lg px-2.5 py-1.5">
                      ☁️ Cloud penalty: −{penalty}% solar
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
