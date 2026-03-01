import React, { useState, useEffect, useRef } from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { Activity, Wifi, WifiOff } from "lucide-react";

const BASE = process.env.REACT_APP_API_URL || "";
const LIVE_URL = `${BASE}/api/live-status`;
const MODE_URL = `${BASE}/api/data-mode`;
const IOT_CONN_URL = `${BASE}/api/iot-connection`;
const IOT_LOGS_URL = `${BASE}/api/iot-logs?limit=60`;
const CONSUMPTION_URL = `${BASE}/api/block-consumption`;
const POLL_INTERVAL_MS = 5000;
const MAX_DATA_POINTS = 60;

/* ── Custom Tooltip ────────────────────────────────────────── */
function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div
      className="glass-card px-4 py-3 shadow-xl !rounded-xl"
      style={{ backdropFilter: "blur(16px)" }}
    >
      <p className="text-[11px] text-slate-500 font-mono mb-2">{label}</p>
      {payload.map((entry) => (
        <div key={entry.dataKey} className="flex items-center gap-2 text-sm">
          <span
            className="w-2.5 h-2.5 rounded-full"
            style={{
              backgroundColor: entry.color,
              boxShadow: `0 0 6px ${entry.color}`,
            }}
          />
          <span className="text-slate-400">{entry.name}:</span>
          <span className="text-white font-bold">
            {entry.value.toFixed(1)} kW
          </span>
        </div>
      ))}
    </div>
  );
}

/* ── Custom Legend ──────────────────────────────────────────── */
function ChartLegend({ payload }) {
  if (!payload) return null;
  return (
    <div className="flex items-center justify-center gap-6 mt-2">
      {payload.map((entry) => (
        <div key={entry.value} className="flex items-center gap-2 text-xs">
          <span
            className="w-2 h-2 rounded-full"
            style={{
              backgroundColor: entry.color,
              boxShadow: `0 0 4px ${entry.color}`,
            }}
          />
          <span className="text-slate-400">{entry.value}</span>
        </div>
      ))}
    </div>
  );
}

export default function LiveEnergyChart() {
  const [chartData, setChartData] = useState([]);
  const [connected, setConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [dataMode, setDataMode] = useState("iot");
  const intervalRef = useRef(null);

  const fetchLiveData = async () => {
    try {
      const modeRes = await fetch(MODE_URL);
      const modeJson = modeRes.ok ? await modeRes.json() : { mode: "iot" };
      const mode = modeJson.mode === "manual" ? "manual" : "iot";
      setDataMode(mode);

      if (mode === "manual") {
        const res = await fetch(CONSUMPTION_URL);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const records = await res.json();

        const byMonth = {};
        records.forEach((r) => {
          const key = `${r.year}-${String(r.month).padStart(2, "0")}`;
          if (!byMonth[key]) {
            byMonth[key] = {
              key,
              year: r.year,
              month: r.month,
              consumption: 0,
              billedCost: 0,
            };
          }
          byMonth[key].consumption += Number(r.kwh || 0);
          byMonth[key].billedCost += Number(r.cost || 0);
        });

        const monthly = Object.values(byMonth)
          .sort((a, b) => a.year - b.year || a.month - b.month)
          .slice(-12)
          .map((m) => ({
            time: new Date(m.year, m.month - 1, 1).toLocaleString("en-IN", {
              month: "short",
              year: "2-digit",
            }),
            consumption: parseFloat(m.consumption.toFixed(2)),
            billedCost: parseFloat(m.billedCost.toFixed(2)),
          }));

        setChartData(monthly);
        setConnected(true);
        setLastUpdate(new Date());
        return;
      }

      // IoT mode: prefer IoT device logs if connected, fallback to live simulator status
      let iotConnected = false;
      try {
        const connRes = await fetch(IOT_CONN_URL);
        if (connRes.ok) {
          const conn = await connRes.json();
          iotConnected = !!conn.connected;
        }
      } catch {
        iotConnected = false;
      }

      if (iotConnected) {
        const logsRes = await fetch(IOT_LOGS_URL);
        if (logsRes.ok) {
          const logsJson = await logsRes.json();
          const logs = (logsJson.logs || []).slice().reverse();
          const transformed = logs.map((log) => {
            let totalGrid = 0;
            let totalSolar = 0;
            let totalHVAC = 0;
            Object.values(log.readings || {}).forEach((r) => {
              totalGrid += Number(r.grid_kw || 0);
              totalSolar += Number(r.solar_kw || 0);
              totalHVAC += Number(r.hvac_kw || 0);
            });
            const dt = new Date(log.timestamp);
            return {
              time: dt.toLocaleTimeString("en-IN", {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
                hour12: false,
              }),
              gridPower: parseFloat(totalGrid.toFixed(2)),
              solarPower: parseFloat(totalSolar.toFixed(2)),
              hvacPower: parseFloat(totalHVAC.toFixed(2)),
            };
          });
          setChartData(transformed.slice(-MAX_DATA_POINTS));
          setConnected(true);
          setLastUpdate(new Date());
          return;
        }
      }

      const res = await fetch(LIVE_URL);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();

      let totalGrid = 0;
      let totalSolar = 0;
      let totalHVAC = 0;

      (json.blocks || []).forEach((block) => {
        totalGrid += block.Grid_Power_Draw_kW || 0;
        totalSolar += block.Solar_Power_Generated_kW || 0;
        totalHVAC += block.HVAC_Power_kW || 0;
      });

      const now = new Date();
      const timeLabel = now.toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      });

      const point = {
        time: timeLabel,
        gridPower: parseFloat(totalGrid.toFixed(2)),
        solarPower: parseFloat(totalSolar.toFixed(2)),
        hvacPower: parseFloat(totalHVAC.toFixed(2)),
      };

      setChartData((prev) => {
        const next = [...prev, point];
        return next.length > MAX_DATA_POINTS ? next.slice(-MAX_DATA_POINTS) : next;
      });

      setConnected(true);
      setLastUpdate(now);
    } catch (err) {
      console.error("[LiveEnergyChart] Fetch error:", err);
      setConnected(false);
    }
  };

  useEffect(() => {
    fetchLiveData();
    intervalRef.current = setInterval(fetchLiveData, POLL_INTERVAL_MS);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  return (
    <div className="glass-card accent-bar-sky p-6 chart-glow animate-fade-in-up">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-sky-500/10 border border-white/[0.04]">
            <Activity className="w-4 h-4 text-sky-400" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-200 tracking-tight">
              Energy Consumption &mdash; {dataMode === "manual" ? "Manual Records" : "Live Feed"}
            </h2>
            <p className="text-[11px] text-slate-500 mt-0.5">
              {dataMode === "manual"
                ? "Monthly electricity bill entries from Data Management"
                : "Grid Power vs Solar Generation (all blocks aggregated)"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {connected ? (
            <>
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
              </span>
              <span className="text-[11px] text-emerald-400 font-mono font-medium">Connected</span>
            </>
          ) : (
            <>
              <WifiOff className="w-3.5 h-3.5 text-red-400" />
              <span className="text-[11px] text-red-400 font-mono font-medium">Disconnected</span>
            </>
          )}
          {lastUpdate && (
            <span className="text-[10px] text-slate-600 ml-2 font-mono">
              {lastUpdate.toLocaleTimeString("en-IN", { hour12: false })}
            </span>
          )}
        </div>
      </div>

      {/* Chart */}
      {chartData.length === 0 ? (
        <div className="h-72 flex items-center justify-center rounded-xl border border-dashed border-white/[0.06]">
          <p className="text-slate-600 text-sm">
            {dataMode === "manual"
              ? "No manual entries yet. Add data in Data Management."
              : "Waiting for data from API&hellip;"}
          </p>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={288}>
          <AreaChart
            data={chartData}
            margin={{ top: 8, right: 12, left: -8, bottom: 0 }}
          >
            <defs>
              <linearGradient id="liveGridGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#f97316" stopOpacity={0.45} />
                <stop offset="50%" stopColor="#f59e0b" stopOpacity={0.12} />
                <stop offset="100%" stopColor="#f59e0b" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="liveSolarGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#06b6d4" stopOpacity={0.45} />
                <stop offset="50%" stopColor="#22d3ee" stopOpacity={0.12} />
                <stop offset="100%" stopColor="#22d3ee" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="liveHvacGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.35} />
                <stop offset="50%" stopColor="#a78bfa" stopOpacity={0.08} />
                <stop offset="100%" stopColor="#a78bfa" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="3 6"
              stroke="rgba(255,255,255,0.03)"
              vertical={false}
            />
            <XAxis
              dataKey="time"
              tick={{ fontSize: 10, fill: "#475569" }}
              tickLine={false}
              axisLine={{ stroke: "rgba(255,255,255,0.04)" }}
              interval="preserveStartEnd"
              minTickGap={40}
            />
            <YAxis
              tick={{ fontSize: 10, fill: "#475569" }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => `${v}`}
              domain={["auto", "auto"]}
              unit={dataMode === "manual" ? " kWh" : " kW"}
            />
            <Tooltip content={<ChartTooltip />} />
            <Legend content={<ChartLegend />} />

            {dataMode === "manual" ? (
              <Area
                type="monotone"
                dataKey="consumption"
                name="Monthly Consumption"
                stroke="#f97316"
                fill="url(#liveGridGrad)"
                strokeWidth={2.5}
                dot={{ r: 3, fill: "#f97316" }}
                activeDot={{ r: 5, fill: "#f97316", stroke: "#060a14", strokeWidth: 2 }}
                animationDuration={800}
                isAnimationActive
              />
            ) : (
              <>
                <Area
                  type="monotone"
                  dataKey="gridPower"
                  name="Grid Power"
                  stroke="#f97316"
                  fill="url(#liveGridGrad)"
                  strokeWidth={2.5}
                  dot={false}
                  activeDot={{ r: 5, fill: "#f97316", stroke: "#060a14", strokeWidth: 2 }}
                  animationDuration={800}
                  isAnimationActive
                />
                <Area
                  type="monotone"
                  dataKey="solarPower"
                  name="Solar Power"
                  stroke="#06b6d4"
                  fill="url(#liveSolarGrad)"
                  strokeWidth={2.5}
                  dot={false}
                  activeDot={{ r: 5, fill: "#06b6d4", stroke: "#060a14", strokeWidth: 2 }}
                  animationDuration={800}
                  isAnimationActive
                />
                <Area
                  type="monotone"
                  dataKey="hvacPower"
                  name="HVAC Power"
                  stroke="#8b5cf6"
                  fill="url(#liveHvacGrad)"
                  strokeWidth={1.5}
                  strokeDasharray="5 3"
                  dot={false}
                  activeDot={{ r: 4, fill: "#8b5cf6", stroke: "#060a14", strokeWidth: 2 }}
                  animationDuration={800}
                  isAnimationActive
                />
              </>
            )}
          </AreaChart>
        </ResponsiveContainer>
      )}

      {/* Footer stats */}
      {chartData.length > 0 && (
        <div className="flex items-center gap-6 mt-4 pt-3 border-t border-white/[0.04]">
          {dataMode === "manual" ? (
            <>
              <div className="text-center pl-3 border-l-2 border-l-orange-400">
                <p className="text-lg font-extrabold text-orange-400">
                  {chartData[chartData.length - 1].consumption.toFixed(1)}
                  <span className="text-[10px] text-slate-500 ml-1">kWh</span>
                </p>
                <p className="text-[10px] text-slate-500 uppercase tracking-wider">
                  Latest Month
                </p>
              </div>
              <div className="text-center pl-3 border-l-2 border-l-amber-400">
                <p className="text-lg font-extrabold text-amber-400">
                  {chartData.length}
                </p>
                <p className="text-[10px] text-slate-500 uppercase tracking-wider">
                  Months of Data
                </p>
              </div>
            </>
          ) : (
            <>
              {[
                { label: "Grid", key: "gridPower", color: "text-orange-400", border: "border-l-orange-400" },
                { label: "Solar", key: "solarPower", color: "text-cyan-400", border: "border-l-cyan-400" },
                { label: "HVAC", key: "hvacPower", color: "text-violet-400", border: "border-l-violet-400" },
              ].map(({ label, key, color, border }) => {
                const latest = chartData[chartData.length - 1][key];
                return (
                  <div key={key} className={`text-center pl-3 border-l-2 ${border}`}>
                    <p className={`text-lg font-extrabold ${color}`}>
                      {latest.toFixed(1)}
                      <span className="text-[10px] text-slate-500 ml-1">kW</span>
                    </p>
                    <p className="text-[10px] text-slate-500 uppercase tracking-wider">
                      {label} Now
                    </p>
                  </div>
                );
              })}
            </>
          )}
          <div className="ml-auto text-right">
            <p className="text-xs text-slate-500 font-mono">
              {chartData.length} data points
            </p>
            <p className="text-[10px] text-slate-600">
              {dataMode === "manual"
                ? "Synced from Data Management"
                : `Polling every ${POLL_INTERVAL_MS / 1000}s`}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
