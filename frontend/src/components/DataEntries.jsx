import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import {
  Database,
  Plus,
  Save,
  Calendar,
  Building2,
  Cpu,
  Wifi,
  WifiOff,
  Activity,
  RefreshCw,
  Download,
  Trash2,
  Info,
  BarChart3,
  BrainCircuit,
  IndianRupee,
  Clock,
  Zap,
  Sun,
  ThermometerSun,
  CheckCircle2,
  AlertTriangle,
  Settings2,
  Radio,
  ToggleLeft,
  ToggleRight,
  Users,
} from "lucide-react";

/* ── Constants ─────────────────────────────────────────────── */
const BASE_URL = process.env.REACT_APP_API_URL || "";
const ELECTRICITY_RATE = 8;
const SUSTAINABILITY_INPUTS_URL = `${BASE_URL}/api/sustainability-inputs`;

const ANALYSIS_BLOCKS = [
  { key: "STME Block", short: "STME", color: "#38bdf8" },
  { key: "SBM Block",  short: "SBM",  color: "#a78bfa" },
  { key: "SOC Block",  short: "SOC",  color: "#34d399" },
  { key: "SOL Block",  short: "SOL",  color: "#fbbf24" },
  { key: "SPTM Block", short: "SPTM", color: "#f87171" },
];

const MONTH_NAMES = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const FULL_MONTH_NAMES = ["January","February","March","April","May","June","July","August","September","October","November","December"];

function formatINR(v) {
  if (v >= 1_00_00_000) return `\u20B9${(v / 1_00_00_000).toFixed(2)} Cr`;
  if (v >= 1_00_000) return `\u20B9${(v / 1_00_000).toFixed(2)} L`;
  if (v >= 1_000) return `\u20B9${(v / 1_000).toFixed(1)} K`;
  return `\u20B9${v.toFixed(0)}`;
}

/* ══════════════════════════════════════════════════════════════
   DataEntries Page
   ══════════════════════════════════════════════════════════════ */
export default function DataEntries() {
  /* ── Mode ── */
  const [dataMode, setDataMode] = useState("manual");
  const [modeLoading, setModeLoading] = useState(true);

  /* ── Manual entry state ── */
  const [consumptionRecords, setConsumptionRecords] = useState([]);
  const [entryYear, setEntryYear] = useState(new Date().getFullYear());
  const [entryMonth, setEntryMonth] = useState(new Date().getMonth() + 1);
  const [blockInputs, setBlockInputs] = useState(() =>
    Object.fromEntries(ANALYSIS_BLOCKS.map(b => [b.key, ""]))
  );
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");

  /* ── Sustainability input state ── */
  const [verifiedCampusArea, setVerifiedCampusArea] = useState("");
  const [baselinePeakKw, setBaselinePeakKw] = useState("");
  const [studentYear, setStudentYear] = useState(new Date().getFullYear());
  const [activeStudents, setActiveStudents] = useState("");
  const [studentsByYear, setStudentsByYear] = useState({});
  const [renewableYear, setRenewableYear] = useState(new Date().getFullYear());
  const [renewableMonth, setRenewableMonth] = useState(new Date().getMonth() + 1);
  const [renewableKwh, setRenewableKwh] = useState("");
  const [renewableRecords, setRenewableRecords] = useState([]);
  const [occupancyInputs, setOccupancyInputs] = useState(() =>
    Object.fromEntries(ANALYSIS_BLOCKS.map(b => [b.key, ""]))
  );
  const [sustainSaveMsg, setSustainSaveMsg] = useState("");
  const [sustainSaving, setSustainSaving] = useState(false);

  /* ── IoT state ── */
  const [iotConn, setIotConn] = useState({ connected: false });
  const [iotLogs, setIotLogs] = useState([]);
  const [iotLogsTotal, setIotLogsTotal] = useState(0);
  const [connecting, setConnecting] = useState(false);
  const [deviceName, setDeviceName] = useState("Smart Energy Meter");
  const [deviceId, setDeviceId] = useState("");
  const [intervalSec, setIntervalSec] = useState(60);
  const logPollRef = useRef(null);

  /* ── Fetch data mode ── */
  const fetchMode = useCallback(async () => {
    try {
      const res = await fetch(`${BASE_URL}/api/data-mode`);
      if (res.ok) {
        const d = await res.json();
        setDataMode(d.mode);
      }
    } catch { /* ignore */ }
    setModeLoading(false);
  }, []);

  /* ── Fetch IoT connection ── */
  const fetchIotConn = useCallback(async () => {
    try {
      const res = await fetch(`${BASE_URL}/api/iot-connection`);
      if (res.ok) setIotConn(await res.json());
    } catch { /* ignore */ }
  }, []);

  /* ── Fetch consumption records ── */
  const fetchConsumption = useCallback(async () => {
    try {
      const res = await fetch(`${BASE_URL}/api/block-consumption`);
      if (res.ok) setConsumptionRecords(await res.json());
    } catch { /* ignore */ }
  }, []);

  /* ── Fetch sustainability inputs ── */
  const fetchSustainabilityInputs = useCallback(async () => {
    try {
      const res = await fetch(SUSTAINABILITY_INPUTS_URL);
      if (!res.ok) return;
      const d = await res.json();
      setVerifiedCampusArea(d.verified_campus_area_m2 ?? "");
      setBaselinePeakKw(d.baseline_peak_kw ?? "");
      setStudentsByYear(d.students_by_year || {});
      setRenewableRecords(d.monthly_renewable_generation || []);
      const occ = d.occupancy_schedule || {};
      setOccupancyInputs(Object.fromEntries(
        ANALYSIS_BLOCKS.map(b => [b.key, occ[b.key] ?? ""])
      ));
    } catch { /* ignore */ }
  }, []);

  /* ── Fetch IoT logs ── */
  const fetchIotLogs = useCallback(async () => {
    try {
      const res = await fetch(`${BASE_URL}/api/iot-logs?limit=100`);
      if (res.ok) {
        const d = await res.json();
        setIotLogs(d.logs);
        setIotLogsTotal(d.total);
      }
    } catch { /* ignore */ }
  }, []);

  /* ── Initial load ── */
  useEffect(() => {
    fetchMode();
    fetchIotConn();
    fetchConsumption();
    fetchSustainabilityInputs();
  }, [fetchMode, fetchIotConn, fetchConsumption, fetchSustainabilityInputs]);

  /* ── Poll IoT logs when connected ── */
  useEffect(() => {
    if (dataMode === "iot" && iotConn.connected) {
      fetchIotLogs();
      logPollRef.current = setInterval(fetchIotLogs, 10000);
    }
    return () => clearInterval(logPollRef.current);
  }, [dataMode, iotConn.connected, fetchIotLogs]);

  /* ── Switch mode ── */
  const switchMode = async (mode) => {
    try {
      const res = await fetch(`${BASE_URL}/api/data-mode`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode }),
      });
      if (res.ok) {
        setDataMode(mode);
      }
    } catch { /* ignore */ }
  };

  /* ── Connect IoT ── */
  const handleConnectIot = async () => {
    setConnecting(true);
    try {
      const res = await fetch(`${BASE_URL}/api/iot-connection`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "connect",
          device_id: deviceId || undefined,
          device_name: deviceName,
          interval_sec: intervalSec,
        }),
      });
      if (res.ok) {
        const d = await res.json();
        setIotConn(d);
        setDataMode("iot");
      }
    } catch { /* ignore */ }
    setConnecting(false);
  };

  /* ── Disconnect IoT ── */
  const handleDisconnectIot = async () => {
    try {
      const res = await fetch(`${BASE_URL}/api/iot-connection`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "disconnect" }),
      });
      if (res.ok) {
        setIotConn({ connected: false });
        setDataMode("manual");
      }
    } catch { /* ignore */ }
  };

  /* ── Clear IoT logs ── */
  const handleClearLogs = async () => {
    try {
      await fetch(`${BASE_URL}/api/iot-logs`, { method: "DELETE" });
      setIotLogs([]);
      setIotLogsTotal(0);
    } catch { /* ignore */ }
  };

  /* ── Save manual consumption ── */
  const handleSaveConsumption = async () => {
    const filled = Object.entries(blockInputs).filter(([, v]) => v !== "" && Number(v) > 0);
    if (filled.length === 0) { setSaveMsg("Enter at least one block's kWh"); return; }
    setSaving(true);
    setSaveMsg("");
    try {
      const res = await fetch(`${BASE_URL}/api/block-consumption`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          year: entryYear,
          month: entryMonth,
          blocks: Object.fromEntries(filled.map(([k, v]) => [k, Number(v)])),
          rate: ELECTRICITY_RATE,
        }),
      });
      if (res.ok) {
        setSaveMsg(`Saved ${filled.length} block(s) for ${FULL_MONTH_NAMES[entryMonth - 1]} ${entryYear}`);
        setBlockInputs(Object.fromEntries(ANALYSIS_BLOCKS.map(b => [b.key, ""])));
        fetchConsumption();
      } else {
        setSaveMsg("Save failed — check backend");
      }
    } catch { setSaveMsg("Network error"); }
    setSaving(false);
  };

  const handleSaveCoreSustainability = async () => {
    setSustainSaving(true);
    setSustainSaveMsg("");
    try {
      const payload = {
        verified_campus_area_m2: verifiedCampusArea === "" ? null : Number(verifiedCampusArea),
        baseline_peak_kw: baselinePeakKw === "" ? null : Number(baselinePeakKw),
        occupancy_schedule: Object.fromEntries(
          Object.entries(occupancyInputs).filter(([, v]) => v !== "")
            .map(([k, v]) => [k, Number(v)])
        ),
      };
      const res = await fetch(SUSTAINABILITY_INPUTS_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        setSustainSaveMsg("Sustainability base inputs saved");
        fetchSustainabilityInputs();
      } else {
        setSustainSaveMsg("Failed to save sustainability inputs");
      }
    } catch {
      setSustainSaveMsg("Network error while saving sustainability inputs");
    }
    setSustainSaving(false);
  };

  const handleSaveStudentCount = async () => {
    if (!studentYear || !activeStudents) {
      setSustainSaveMsg("Enter student year and active student count");
      return;
    }
    setSustainSaving(true);
    setSustainSaveMsg("");
    try {
      const res = await fetch(SUSTAINABILITY_INPUTS_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          student_year: Number(studentYear),
          active_students: Number(activeStudents),
        }),
      });
      if (res.ok) {
        setSustainSaveMsg(`Student count saved for ${studentYear}`);
        setActiveStudents("");
        fetchSustainabilityInputs();
      } else {
        setSustainSaveMsg("Failed to save student count");
      }
    } catch {
      setSustainSaveMsg("Network error while saving student count");
    }
    setSustainSaving(false);
  };

  const handleSaveRenewableGeneration = async () => {
    if (!renewableYear || !renewableMonth || !renewableKwh || Number(renewableKwh) <= 0) {
      setSustainSaveMsg("Enter valid renewable generation month and kWh");
      return;
    }
    setSustainSaving(true);
    setSustainSaveMsg("");
    try {
      const res = await fetch(SUSTAINABILITY_INPUTS_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          renewable_entry: {
            year: Number(renewableYear),
            month: Number(renewableMonth),
            kwh: Number(renewableKwh),
          },
        }),
      });
      if (res.ok) {
        setSustainSaveMsg(`Renewable generation saved for ${FULL_MONTH_NAMES[renewableMonth - 1]} ${renewableYear}`);
        setRenewableKwh("");
        fetchSustainabilityInputs();
      } else {
        setSustainSaveMsg("Failed to save renewable generation");
      }
    } catch {
      setSustainSaveMsg("Network error while saving renewable generation");
    }
    setSustainSaving(false);
  };

  /* ── Derived: monthly chart data ── */
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

  /* ── Derived: block totals ── */
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

  const grandTotal = useMemo(() =>
    consumptionRecords.reduce((s, r) => ({ kwh: s.kwh + r.kwh, cost: s.cost + r.cost }), { kwh: 0, cost: 0 }),
    [consumptionRecords]
  );

  if (modeLoading) {
    return (
      <div className="flex items-center justify-center h-64 glass-card">
        <RefreshCw className="w-5 h-5 text-sky-400/40 animate-spin mr-2" />
        <span className="text-sm text-slate-500">Loading...</span>
      </div>
    );
  }

  return (
    <div className="space-y-5">

      {/* ═══════ MODE SELECTOR ═══════ */}
      <div className="flex items-center justify-between animate-fade-in">
        <div className="flex items-center gap-2">
          <Database className="w-4 h-4 text-violet-400" />
          <h2 className="text-sm font-bold text-slate-300 tracking-tight">Data Input Mode</h2>
        </div>

        <div className="flex items-center gap-1 bg-white/[0.03] border border-white/[0.06] rounded-xl p-0.5">
          <button
            onClick={() => switchMode("manual")}
            className={`flex items-center gap-1.5 text-[11px] font-medium px-4 py-2 rounded-lg transition-all duration-300 ${
              dataMode === "manual"
                ? "bg-violet-500/15 text-violet-400 shadow-[0_0_8px_rgba(139,92,246,0.15)] border border-violet-500/20"
                : "text-slate-500 hover:text-slate-300 hover:bg-white/[0.03] border border-transparent"
            }`}
          >
            <BrainCircuit className="w-3.5 h-3.5" />
            Manual Entry
          </button>
          <button
            onClick={() => switchMode("iot")}
            className={`flex items-center gap-1.5 text-[11px] font-medium px-4 py-2 rounded-lg transition-all duration-300 ${
              dataMode === "iot"
                ? "bg-sky-500/15 text-sky-400 shadow-[0_0_8px_rgba(56,189,248,0.15)] border border-sky-500/20"
                : "text-slate-500 hover:text-slate-300 hover:bg-white/[0.03] border border-transparent"
            }`}
          >
            <Cpu className="w-3.5 h-3.5" />
            IoT Device
          </button>
        </div>
      </div>

      {/* ═══════ MANUAL ENTRY MODE ═══════ */}
      {dataMode === "manual" && (
        <div className="space-y-5 animate-fade-in-up">

          {/* Info banner */}
          <div className="glass-card p-4 flex items-start gap-3 border-l-2 border-l-violet-500/30">
            <Info className="w-4 h-4 text-violet-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-xs text-slate-300 font-medium">Manual Data Entry Mode</p>
              <p className="text-[10px] text-slate-500 mt-0.5">
                Enter monthly electricity consumption (kWh) from bills for each campus block.
                This data drives the Overview analytics and forecasting models.
              </p>
            </div>
          </div>

          {/* ─── Entry Form ─── */}
          <div className="glass-card accent-bar-violet p-5">
            <div className="flex items-center gap-3 mb-5">
              <div className="p-2 rounded-xl bg-violet-500/10 border border-white/[0.04]">
                <Plus className="w-4 h-4 text-violet-400" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-200">Add Monthly Consumption</h3>
                <p className="text-[10px] text-slate-500">Enter kWh consumed by each block from electricity bill</p>
              </div>
            </div>

            {/* Year & Month selector */}
            <div className="flex items-center gap-4 mb-5">
              <div className="flex items-center gap-2">
                <Calendar className="w-3.5 h-3.5 text-slate-500" />
                <select
                  value={entryMonth}
                  onChange={e => setEntryMonth(Number(e.target.value))}
                  className="bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-1.5 text-xs text-slate-300 focus:border-violet-500/30 focus:outline-none transition-colors"
                >
                  {FULL_MONTH_NAMES.map((m, i) => (
                    <option key={i} value={i + 1} className="bg-[#0c1220] text-slate-300">{m}</option>
                  ))}
                </select>
                <input
                  type="number"
                  value={entryYear}
                  onChange={e => setEntryYear(Number(e.target.value))}
                  min={2020} max={2040}
                  className="bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-1.5 text-xs text-slate-300 w-20 focus:border-violet-500/30 focus:outline-none transition-colors"
                />
              </div>
              <span className="text-[10px] text-slate-600 font-mono">Rate: ₹{ELECTRICITY_RATE}/kWh</span>
            </div>

            {/* Block inputs grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 mb-5">
              {ANALYSIS_BLOCKS.map(blk => (
                <div key={blk.key} className="relative">
                  <label className="text-[10px] text-slate-500 font-medium mb-1 flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full" style={{ background: blk.color }} />
                    {blk.short} Block
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      placeholder="kWh"
                      value={blockInputs[blk.key]}
                      onChange={e => setBlockInputs(prev => ({ ...prev, [blk.key]: e.target.value }))}
                      min={0}
                      className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-600 focus:border-violet-500/30 focus:outline-none transition-colors font-mono"
                    />
                    {blockInputs[blk.key] && Number(blockInputs[blk.key]) > 0 && (
                      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] text-slate-600 font-mono">
                        ₹{(Number(blockInputs[blk.key]) * ELECTRICITY_RATE).toLocaleString("en-IN")}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Save button */}
            <div className="flex items-center gap-3">
              <button
                onClick={handleSaveConsumption}
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-violet-500/15 border border-violet-500/25 text-violet-400 text-xs font-semibold hover:bg-violet-500/25 transition-all duration-300 disabled:opacity-50"
              >
                <Save className="w-3.5 h-3.5" />
                {saving ? "Saving..." : "Save to Database"}
              </button>
              {saveMsg && (
                <span className={`text-[11px] font-mono ${saveMsg.includes("Saved") ? "text-emerald-400" : "text-amber-400"}`}>
                  {saveMsg}
                </span>
              )}
            </div>
          </div>

          {/* ─── Sustainability KPI Inputs ─── */}
          <div className="glass-card accent-bar-cyan p-5">
            <div className="flex items-center gap-3 mb-5">
              <div className="p-2 rounded-xl bg-cyan-500/10 border border-white/[0.04]">
                <Settings2 className="w-4 h-4 text-cyan-400" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-200">Sustainability KPI Inputs</h3>
                <p className="text-[10px] text-slate-500">Configure baseline and normalization fields used by Sustainability KPIs</p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {/* Core campus inputs */}
              <div className="space-y-3 rounded-xl bg-white/[0.02] border border-white/[0.05] p-4">
                <p className="text-xs font-semibold text-slate-300">Campus Baseline Inputs</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] text-slate-500 font-medium mb-1 block">Verified Campus Area (m²)</label>
                    <input
                      type="number"
                      value={verifiedCampusArea}
                      onChange={(e) => setVerifiedCampusArea(e.target.value)}
                      placeholder="120000"
                      min={1}
                      className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-600 focus:border-cyan-500/30 focus:outline-none transition-colors font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 font-medium mb-1 block">Baseline Peak Demand (kW)</label>
                    <input
                      type="number"
                      value={baselinePeakKw}
                      onChange={(e) => setBaselinePeakKw(e.target.value)}
                      placeholder="2400"
                      min={1}
                      className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-600 focus:border-cyan-500/30 focus:outline-none transition-colors font-mono"
                    />
                  </div>
                </div>

                <p className="text-[10px] text-slate-500 font-medium mt-2">Block Occupancy Schedule (Optional, %)</p>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  {ANALYSIS_BLOCKS.map((blk) => (
                    <div key={`occ-${blk.key}`}>
                      <label className="text-[10px] text-slate-600 mb-1 block">{blk.short}</label>
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={occupancyInputs[blk.key]}
                        onChange={(e) => setOccupancyInputs(prev => ({ ...prev, [blk.key]: e.target.value }))}
                        placeholder="%"
                        className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-2 py-1.5 text-xs text-slate-200 placeholder-slate-600 focus:border-cyan-500/30 focus:outline-none transition-colors font-mono"
                      />
                    </div>
                  ))}
                </div>

                <button
                  onClick={handleSaveCoreSustainability}
                  disabled={sustainSaving}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-cyan-500/15 border border-cyan-500/25 text-cyan-400 text-xs font-semibold hover:bg-cyan-500/25 transition-all duration-300 disabled:opacity-50"
                >
                  <Save className="w-3.5 h-3.5" /> Save Baseline Inputs
                </button>
              </div>

              {/* Year-wise students + renewable monthly */}
              <div className="space-y-3 rounded-xl bg-white/[0.02] border border-white/[0.05] p-4">
                <p className="text-xs font-semibold text-slate-300">Operational Inputs</p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] text-slate-500 font-medium mb-1 block">Student Year</label>
                    <input
                      type="number"
                      min={2020}
                      max={2050}
                      value={studentYear}
                      onChange={(e) => setStudentYear(Number(e.target.value))}
                      className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-slate-200 focus:border-cyan-500/30 focus:outline-none transition-colors font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 font-medium mb-1 block">Active Students</label>
                    <input
                      type="number"
                      min={1}
                      value={activeStudents}
                      onChange={(e) => setActiveStudents(e.target.value)}
                      placeholder="12000"
                      className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-600 focus:border-cyan-500/30 focus:outline-none transition-colors font-mono"
                    />
                  </div>
                </div>
                <button
                  onClick={handleSaveStudentCount}
                  disabled={sustainSaving}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-violet-500/15 border border-violet-500/25 text-violet-400 text-xs font-semibold hover:bg-violet-500/25 transition-all duration-300 disabled:opacity-50"
                >
                  <Users className="w-3.5 h-3.5" /> Save Student Count
                </button>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-white/[0.05]">
                  <div>
                    <label className="text-[10px] text-slate-500 font-medium mb-1 block">Renewable Month</label>
                    <select
                      value={renewableMonth}
                      onChange={(e) => setRenewableMonth(Number(e.target.value))}
                      className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-slate-200 focus:border-cyan-500/30 focus:outline-none transition-colors"
                    >
                      {FULL_MONTH_NAMES.map((m, i) => (
                        <option key={`ren-m-${i}`} value={i + 1} className="bg-[#0c1220] text-slate-300">{m}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 font-medium mb-1 block">Year</label>
                    <input
                      type="number"
                      min={2020}
                      max={2050}
                      value={renewableYear}
                      onChange={(e) => setRenewableYear(Number(e.target.value))}
                      className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-slate-200 focus:border-cyan-500/30 focus:outline-none transition-colors font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 font-medium mb-1 block">Renewable Generation (kWh)</label>
                    <input
                      type="number"
                      min={0}
                      value={renewableKwh}
                      onChange={(e) => setRenewableKwh(e.target.value)}
                      placeholder="168000"
                      className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-600 focus:border-cyan-500/30 focus:outline-none transition-colors font-mono"
                    />
                  </div>
                </div>
                <button
                  onClick={handleSaveRenewableGeneration}
                  disabled={sustainSaving}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500/15 border border-emerald-500/25 text-emerald-400 text-xs font-semibold hover:bg-emerald-500/25 transition-all duration-300 disabled:opacity-50"
                >
                  <Sun className="w-3.5 h-3.5" /> Save Renewable Generation
                </button>
              </div>
            </div>

            {sustainSaveMsg && (
              <p className={`text-[11px] font-mono mt-4 ${sustainSaveMsg.includes("saved") || sustainSaveMsg.includes("Saved") ? "text-emerald-400" : "text-amber-400"}`}>
                {sustainSaveMsg}
              </p>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
              <div className="rounded-xl bg-white/[0.02] border border-white/[0.05] p-3">
                <p className="text-[10px] text-slate-500 mb-2">Saved Student Count by Year</p>
                {Object.keys(studentsByYear).length > 0 ? (
                  <div className="space-y-1.5 max-h-24 overflow-y-auto pr-1">
                    {Object.entries(studentsByYear)
                      .sort((a, b) => Number(b[0]) - Number(a[0]))
                      .map(([yr, cnt]) => (
                        <div key={yr} className="flex items-center justify-between text-[11px] border-b border-white/[0.04] pb-1">
                          <span className="text-slate-400 font-mono">{yr}</span>
                          <span className="text-slate-300 font-mono">{Number(cnt).toLocaleString("en-IN")}</span>
                        </div>
                      ))}
                  </div>
                ) : <p className="text-[10px] text-slate-600">No student-year data saved yet</p>}
              </div>
              <div className="rounded-xl bg-white/[0.02] border border-white/[0.05] p-3">
                <p className="text-[10px] text-slate-500 mb-2">Saved Monthly Renewable Generation</p>
                {renewableRecords.length > 0 ? (
                  <div className="space-y-1.5 max-h-24 overflow-y-auto pr-1">
                    {[...renewableRecords]
                      .sort((a, b) => Number(b.year) - Number(a.year) || Number(b.month) - Number(a.month))
                      .slice(0, 12)
                      .map((r, idx) => (
                        <div key={`${r.year}-${r.month}-${idx}`} className="flex items-center justify-between text-[11px] border-b border-white/[0.04] pb-1">
                          <span className="text-slate-400 font-mono">{FULL_MONTH_NAMES[r.month - 1]} {r.year}</span>
                          <span className="text-emerald-400 font-mono">{Number(r.kwh).toLocaleString("en-IN")} kWh</span>
                        </div>
                      ))}
                  </div>
                ) : <p className="text-[10px] text-slate-600">No renewable month entries saved yet</p>}
              </div>
            </div>
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
                <div className="text-[10px] text-slate-500 font-mono">
                  Total: {grandTotal.kwh.toLocaleString("en-IN")} kWh · {formatINR(grandTotal.cost)}
                </div>
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
                  <p className="text-[10px] text-slate-500">{consumptionRecords.length} record{consumptionRecords.length !== 1 && "s"} in database</p>
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
              <Database className="w-8 h-8 text-slate-600 mb-3" />
              <p className="text-sm text-slate-400 font-medium">No consumption data yet</p>
              <p className="text-[10px] text-slate-600 mt-1">Add your first electricity bill entry above to start tracking</p>
            </div>
          )}
        </div>
      )}

      {/* ═══════ IoT DEVICE MODE ═══════ */}
      {dataMode === "iot" && (
        <div className="space-y-5 animate-fade-in-up">

          {/* ── IoT Connection Card ── */}
          <div className="glass-card accent-bar-sky p-5">
            <div className="flex items-center gap-3 mb-5">
              <div className="p-2 rounded-xl bg-sky-500/10 border border-white/[0.04]">
                <Radio className="w-4 h-4 text-sky-400" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-200">IoT Device Connection</h3>
                <p className="text-[10px] text-slate-500">Connect a smart energy meter to auto-collect consumption data</p>
              </div>
              <div className="ml-auto">
                {iotConn.connected ? (
                  <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/20">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
                    </span>
                    <span className="text-[10px] text-emerald-400 font-mono font-medium">CONNECTED</span>
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-500/10 border border-white/[0.06]">
                    <WifiOff className="w-3 h-3 text-slate-500" />
                    <span className="text-[10px] text-slate-500 font-mono">DISCONNECTED</span>
                  </span>
                )}
              </div>
            </div>

            {!iotConn.connected ? (
              /* ── Connect Form ── */
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-[10px] text-slate-500 font-medium mb-1 block">Device Name</label>
                    <input
                      type="text"
                      value={deviceName}
                      onChange={e => setDeviceName(e.target.value)}
                      placeholder="Smart Energy Meter"
                      className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-600 focus:border-sky-500/30 focus:outline-none transition-colors"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 font-medium mb-1 block">Device ID (optional)</label>
                    <input
                      type="text"
                      value={deviceId}
                      onChange={e => setDeviceId(e.target.value)}
                      placeholder="Auto-generated"
                      className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-600 focus:border-sky-500/30 focus:outline-none transition-colors font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 font-medium mb-1 block">Poll Interval (sec)</label>
                    <input
                      type="number"
                      value={intervalSec}
                      onChange={e => setIntervalSec(Number(e.target.value))}
                      min={10} max={300}
                      className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-slate-200 focus:border-sky-500/30 focus:outline-none transition-colors font-mono"
                    />
                  </div>
                </div>

                <button
                  onClick={handleConnectIot}
                  disabled={connecting}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-sky-500/15 border border-sky-500/25 text-sky-400 text-xs font-semibold hover:bg-sky-500/25 transition-all duration-300 disabled:opacity-50"
                >
                  <Wifi className="w-4 h-4" />
                  {connecting ? "Connecting..." : "Connect IoT Device"}
                </button>
              </div>
            ) : (
              /* ── Connected State ── */
              <div className="space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="bg-white/[0.03] rounded-xl p-3 border border-white/[0.04]">
                    <p className="text-[10px] text-slate-500 mb-1">Device</p>
                    <p className="text-sm font-bold text-sky-400 truncate">{iotConn.device_name}</p>
                  </div>
                  <div className="bg-white/[0.03] rounded-xl p-3 border border-white/[0.04]">
                    <p className="text-[10px] text-slate-500 mb-1">Device ID</p>
                    <p className="text-sm font-bold text-slate-300 font-mono truncate">{iotConn.device_id}</p>
                  </div>
                  <div className="bg-white/[0.03] rounded-xl p-3 border border-white/[0.04]">
                    <p className="text-[10px] text-slate-500 mb-1">Interval</p>
                    <p className="text-sm font-bold text-amber-400">{iotConn.interval_sec}s</p>
                  </div>
                  <div className="bg-white/[0.03] rounded-xl p-3 border border-white/[0.04]">
                    <p className="text-[10px] text-slate-500 mb-1">Connected Since</p>
                    <p className="text-sm font-bold text-slate-300 font-mono">
                      {iotConn.connected_at ? new Date(iotConn.connected_at).toLocaleTimeString("en-IN", { hour12: false }) : "—"}
                    </p>
                  </div>
                </div>

                <button
                  onClick={handleDisconnectIot}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-semibold hover:bg-red-500/20 transition-all duration-300"
                >
                  <WifiOff className="w-3.5 h-3.5" />
                  Disconnect Device
                </button>
              </div>
            )}
          </div>

          {/* ── IoT Data Logs ── */}
          {iotConn.connected && (
            <div className="glass-card accent-bar-emerald p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-emerald-500/10 border border-white/[0.04]">
                    <Activity className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-200">IoT Device Logs</h3>
                    <p className="text-[10px] text-slate-500">
                      Real-time energy readings every {iotConn.interval_sec}s · {iotLogsTotal} total entries
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={fetchIotLogs}
                    className="flex items-center gap-1 px-2 py-1 rounded-lg bg-white/[0.04] border border-white/[0.08] text-slate-500 text-[10px] hover:bg-white/[0.08] hover:text-slate-300 transition-all"
                  >
                    <RefreshCw className="w-3 h-3" /> Refresh
                  </button>
                  <button
                    onClick={handleClearLogs}
                    className="flex items-center gap-1 px-2 py-1 rounded-lg bg-red-500/5 border border-red-500/15 text-red-400/70 text-[10px] hover:bg-red-500/10 hover:text-red-400 transition-all"
                  >
                    <Trash2 className="w-3 h-3" /> Clear
                  </button>
                </div>
              </div>

              {iotLogs.length > 0 ? (
                <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
                  <table className="w-full text-xs">
                    <thead className="sticky top-0 bg-black/90 backdrop-blur-sm z-10">
                      <tr className="border-b border-white/[0.06]">
                        <th className="text-left py-2 px-2 text-slate-500 font-medium">Timestamp</th>
                        <th className="text-left py-2 px-2 text-slate-500 font-medium">Device</th>
                        {ANALYSIS_BLOCKS.map(b => (
                          <th key={b.short} className="text-right py-2 px-2 text-slate-500 font-medium">{b.short} (kW)</th>
                        ))}
                        <th className="text-right py-2 px-2 text-slate-500 font-medium">Total kWh</th>
                      </tr>
                    </thead>
                    <tbody>
                      {iotLogs.map((log, i) => (
                        <tr key={i} className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors">
                          <td className="py-1.5 px-2 text-slate-400 font-mono whitespace-nowrap">
                            {new Date(log.timestamp).toLocaleTimeString("en-IN", { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                          </td>
                          <td className="py-1.5 px-2 text-sky-400/70 font-mono text-[10px]">{log.device_id}</td>
                          {ANALYSIS_BLOCKS.map(b => {
                            const r = log.readings?.[b.key];
                            return (
                              <td key={b.short} className="py-1.5 px-2 text-right font-mono" style={{ color: b.color }}>
                                {r ? r.grid_kw.toFixed(1) : "—"}
                              </td>
                            );
                          })}
                          <td className="py-1.5 px-2 text-right text-white font-bold font-mono">{log.total_kwh}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="flex items-center justify-center py-8">
                  <div className="flex flex-col items-center gap-2">
                    <Clock className="w-6 h-6 text-slate-600 animate-pulse" />
                    <p className="text-xs text-slate-500">Waiting for first reading...</p>
                    <p className="text-[10px] text-slate-600">Data arrives every {iotConn.interval_sec} seconds</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Not connected state ── */}
          {!iotConn.connected && (
            <div className="glass-card p-8 flex flex-col items-center justify-center text-center">
              <Cpu className="w-8 h-8 text-slate-600 mb-3" />
              <p className="text-sm text-slate-400 font-medium">No IoT device connected</p>
              <p className="text-[10px] text-slate-600 mt-1">Connect a smart energy meter above to begin auto-collecting data</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
