import React, { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import "./StudentPortal.css";

const BASE = process.env.REACT_APP_API_URL || "";

/* ──────────────────────────────────────────────────────────────
   StudentDashboard — full CampusZero student portal
   Mirrors the standalone HTML portal as a React SPA component.
   All data is fetched from /api/student/* Flask endpoints.
   Page navigation is URL-based via React Router.
   ────────────────────────────────────────────────────────────── */
export default function StudentDashboard({ onLogout }) {
  // Navigation — driven by URL params
  const { page: urlPage } = useParams();
  const page = urlPage || "dashboard";
  const routerNav = useNavigate();

  // Global state
  const [profile, setProfile] = useState(null);
  const [coins, setCoins] = useState(0);
  const [toasts, setToasts] = useState([]);
  const [notifs, setNotifs] = useState([]);
  const [showNotifs, setShowNotifs] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  // Dashboard data
  const [dashData, setDashData] = useState(null);
  const [leaderboard, setLeaderboard] = useState(null);
  const [challenges, setChallenges] = useState([]);
  const [walletData, setWalletData] = useState(null);
  const [badges, setBadges] = useState(null);
  const [feed, setFeed] = useState([]);
  const [events, setEvents] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [shopItems, setShopItems] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [taskFilter, setTaskFilter] = useState("all");

  // Request a Call state
  const [callPhone, setCallPhone] = useState("+91");
  const [callRequesting, setCallRequesting] = useState(false);
  const [callSuccess, setCallSuccess] = useState(false);
  const [callError, setCallError] = useState("");

  // Scanner state
  const [scanResult, setScanResult] = useState(null);

  // Spin modal
  const [showSpinModal, setShowSpinModal] = useState(false);
  const [spinning, setSpinning] = useState(false);
  const [spinEmoji, setSpinEmoji] = useState("🎁");
  const [spinResult, setSpinResult] = useState(null);

  // Canvas refs
  const energyMapRef = useRef(null);
  const coinsChartRef = useRef(null);
  const radarChartRef = useRef(null);
  const animFrameRef = useRef(null);

  // ── Toast helper ──────────────────────────────────────
  const showToast = useCallback((color, icon, title, desc, coinAmt = 0) => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, color, icon, title, desc, coinAmt }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000);
  }, []);

  // ── Confetti ──────────────────────────────────────────
  const burstConfetti = useCallback(() => {
    const colors = ["#4a9b6d", "#c17a5e", "#5a9ba5", "#8b7ea8", "#b8a042"];
    for (let i = 0; i < 20; i++) {
      const el = document.createElement("div");
      el.className = "sp-confetti";
      el.style.left = Math.random() * 100 + "vw";
      el.style.top = "-20px";
      el.style.background = colors[Math.floor(Math.random() * colors.length)];
      const sz = Math.random() * 6 + 6 + "px";
      el.style.width = sz;
      el.style.height = sz;
      el.style.animationDuration = Math.random() * 1.5 + 1.5 + "s";
      document.body.appendChild(el);
      setTimeout(() => el.remove(), 3000);
    }
  }, []);

  // ── Data fetching ─────────────────────────────────────
  const fetchDashboard = useCallback(async () => {
    try {
      const res = await fetch(`${BASE}/api/student/dashboard`);
      if (!res.ok) return;
      const data = await res.json();
      setDashData(data);
      if (data.profile) {
        setProfile(data.profile);
        setCoins(data.profile.coins || 0);
      }
    } catch { /* silent */ }
  }, []);

  const fetchNotifs = useCallback(async () => {
    try {
      const res = await fetch(`${BASE}/api/student/notifications`);
      if (res.ok) setNotifs(await res.json());
    } catch { /* silent */ }
  }, []);

  const fetchLeaderboard = useCallback(async () => {
    try {
      const res = await fetch(`${BASE}/api/student/leaderboard`);
      if (res.ok) setLeaderboard(await res.json());
    } catch { /* silent */ }
  }, []);

  const fetchChallenges = useCallback(async () => {
    try {
      const res = await fetch(`${BASE}/api/student/challenges`);
      if (res.ok) setChallenges(await res.json());
    } catch { /* silent */ }
  }, []);

  const fetchWallet = useCallback(async () => {
    try {
      const res = await fetch(`${BASE}/api/student/wallet`);
      if (res.ok) setWalletData(await res.json());
    } catch { /* silent */ }
  }, []);

  const fetchBadges = useCallback(async () => {
    try {
      const res = await fetch(`${BASE}/api/student/badges`);
      if (res.ok) setBadges(await res.json());
    } catch { /* silent */ }
  }, []);

  const fetchFeed = useCallback(async () => {
    try {
      const [feedRes, eventsRes] = await Promise.all([
        fetch(`${BASE}/api/student/feed`),
        fetch(`${BASE}/api/student/events`),
      ]);
      if (feedRes.ok) setFeed(await feedRes.json());
      if (eventsRes.ok) setEvents(await eventsRes.json());
    } catch { /* silent */ }
  }, []);

  const fetchAnalytics = useCallback(async () => {
    try {
      const res = await fetch(`${BASE}/api/student/analytics`);
      if (res.ok) setAnalytics(await res.json());
    } catch { /* silent */ }
  }, []);

  const fetchShop = useCallback(async () => {
    try {
      const res = await fetch(`${BASE}/api/student/shop`);
      if (res.ok) setShopItems(await res.json());
    } catch { /* silent */ }
  }, []);

  const fetchTasks = useCallback(async () => {
    try {
      const res = await fetch(`${BASE}/api/student/tasks`);
      if (res.ok) setTasks(await res.json());
    } catch { /* silent */ }
  }, []);

  // Initial load
  useEffect(() => {
    fetchDashboard();
    fetchNotifs();
  }, [fetchDashboard, fetchNotifs]);

  // Fetch page-specific data on navigation
  useEffect(() => {
    switch (page) {
      case "dashboard": fetchDashboard(); fetchLeaderboard(); fetchChallenges(); break;
      case "leaderboard": fetchLeaderboard(); break;
      case "challenges": fetchChallenges(); break;
      case "wallet": fetchWallet(); break;
      case "badges": fetchBadges(); break;
      case "feed": fetchFeed(); break;
      case "analytics": fetchAnalytics(); break;
      case "shop": fetchShop(); break;
      case "tasks": fetchTasks(); break;
      default: break;
    }
  }, [page, fetchDashboard, fetchLeaderboard, fetchChallenges, fetchWallet, fetchBadges, fetchFeed, fetchAnalytics, fetchShop, fetchTasks]);

  // Live data refresh
  useEffect(() => {
    const id = setInterval(fetchDashboard, 15000);
    return () => clearInterval(id);
  }, [fetchDashboard]);

  // ── Navigation ────────────────────────────────────────
  const navTo = (p) => {
    routerNav(`/student/${p}`);

  };

  // ── Coin operations ───────────────────────────────────
  const earnCoins = async (amount, reason) => {
    setCoins((prev) => prev + amount);
    try {
      const res = await fetch(`${BASE}/api/student/wallet/earn`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount, reason }),
      });
      if (res.ok) {
        const data = await res.json();
        setCoins(data.balance);
      }
    } catch { /* silent */ }
  };

  const spendCoins = async (amount, item) => {
    if (coins < amount) {
      showToast("coral", "❌", "Insufficient Balance", `Need ${amount} coins`);
      return false;
    }
    setCoins((prev) => prev - amount);
    try {
      const res = await fetch(`${BASE}/api/student/wallet/spend`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount, item }),
      });
      if (res.ok) {
        const data = await res.json();
        setCoins(data.balance);
        return true;
      }
    } catch { /* silent */ }
    return false;
  };

  // ── Request a Call logic ──────────────────────────────
  const requestCall = async () => {
    const num = callPhone.replace(/\s+/g, "");
    if (num.length < 13 || !num.startsWith("+91")) {
      setCallError("Please enter a valid 10-digit Indian mobile number");
      return;
    }
    setCallRequesting(true);
    setCallError("");
    setCallSuccess(false);
    try {
      const res = await fetch(`${BASE}/api/call`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phoneNumber: num }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setCallSuccess(true);
        showToast("acid", "📞", "Call Requested!", "You will receive a call shortly");
      } else {
        setCallError(data.error || "Failed to request call");
      }
    } catch (err) {
      setCallError("Could not reach server. Please try again.");
    } finally {
      setCallRequesting(false);
    }
  };

  // Cleanup intervals
  useEffect(() => {
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, []);

  // ── Solar Spin ────────────────────────────────────────
  const triggerSpin = () => {
    setSpinning(true);
    setSpinResult(null);
    const emojis = ["⚡", "☀️", "🌱", "🔋", "🔌", "🎁"];
    const intId = setInterval(() => {
      setSpinEmoji(emojis[Math.floor(Math.random() * emojis.length)]);
    }, 80);
    setTimeout(() => {
      clearInterval(intId);
      setSpinEmoji("🎉");
      const prizes = [25, 50, 75, 100, 150, 200, 250, 300];
      const win = prizes[Math.floor(Math.random() * prizes.length)];
      setSpinResult(win);
      setSpinning(false);
      earnCoins(win, "Solar Spin");
      burstConfetti();
      showToast("acid", "☀️", "Solar Spin Winner", `Bonus ${win} coins added.`, win);
    }, 2200);
  };

  // ── Scanner ───────────────────────────────────────────
  const triggerScan = async () => {
    try {
      const res = await fetch(`${BASE}/api/student/scan`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "camera" }),
      });
      if (res.ok) {
        const data = await res.json();
        setScanResult(data);
        setCoins(data.balance);
        burstConfetti();
        showToast("acid", "📸", "Scan Submitted!", data.analysis.title, data.reward);
      }
    } catch { showToast("coral", "❌", "Scan Failed", "Could not submit scan"); }
  };

  const quickReport = async (type) => {
    try {
      const res = await fetch(`${BASE}/api/student/scan/quick`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type }),
      });
      if (res.ok) {
        const data = await res.json();
        setCoins(data.balance);
        showToast("acid", "✅", "Quick Report Sent!", type, 50);
      }
    } catch { /* silent */ }
  };

  // ── Challenge join ────────────────────────────────────
  const joinChallenge = async (cid, reward) => {
    setChallenges((prev) => prev.map((c) => c.id === cid ? { ...c, joined: true } : c));
    burstConfetti();
    showToast("acid", "✅", "Challenge Joined", "Start completing tasks.", reward);
    try {
      await fetch(`${BASE}/api/student/challenges/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ challenge_id: cid }),
      });
    } catch { /* silent */ }
  };

  // ── Redeem ────────────────────────────────────────────
  const redeem = async (name, price) => {
    const ok = await spendCoins(price, name);
    if (ok) {
      burstConfetti();
      showToast("coral", "🛍️", "Redeemed", name);
    }
  };

  // ── Feed like ─────────────────────────────────────────
  const likeFeedPost = async (fid) => {
    setFeed((prev) => prev.map((f) => f.id === fid ? { ...f, likes: (f.likes || 0) + 1 } : f));
    try {
      await fetch(`${BASE}/api/student/feed/like`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ post_id: fid }),
      });
    } catch { /* silent */ }
  };

  // ── RSVP ──────────────────────────────────────────────
  const rsvp = (eid) => {
    setEvents((prev) => prev.map((e) => e.id === eid ? { ...e, joined: true } : e));
    showToast("acid", "🎫", "RSVP Confirmed!", "Event added to calendar", 50);
    earnCoins(50, "Event RSVP");
  };



  // ── Energy Map Canvas ─────────────────────────────────
  useEffect(() => {
    if (page !== "dashboard") return;
    const canvas = energyMapRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let w, h, tick = 0;

    const bldgs = [
      { x: 40, y: 80, w: 60, h: 100, label: "MPSTME Block A", flow: "42.3 kWh", status: "acid" },
      { x: 180, y: 40, w: 50, h: 60, label: "Chemistry Lab", flow: "89.1 kWh", status: "coral" },
      { x: 360, y: 90, w: 80, h: 50, label: "Library", flow: "31.7 kWh", status: "acid" },
      { x: 60, y: 200, w: 70, h: 40, label: "Hostel D", flow: "58.4 kWh", status: "yellow" },
      { x: 240, y: 120, w: 60, h: 60, label: "Solar Array", flow: "+124 kWh", status: "cyan" },
      { x: 400, y: 180, w: 50, h: 40, label: "Admin Block", flow: "28.9 kWh", status: "acid" },
    ];

    const resize = () => {
      w = canvas.width = canvas.parentElement.clientWidth;
      h = canvas.height = 260;
    };
    resize();
    window.addEventListener("resize", resize);

    const colorMap = { acid: "74,155,109", coral: "193,122,94", cyan: "90,155,165", yellow: "184,160,66" };

    const draw = () => {
      ctx.clearRect(0, 0, w, h);
      tick++;
      // Grid
      ctx.strokeStyle = "rgba(74,155,109,0.03)";
      ctx.lineWidth = 1;
      for (let i = 0; i < w; i += 40) { ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, h); ctx.stroke(); }
      for (let j = 0; j < h; j += 40) { ctx.beginPath(); ctx.moveTo(0, j); ctx.lineTo(w, j); ctx.stroke(); }
      // Lines
      ctx.strokeStyle = "rgba(255,255,255,0.1)";
      ctx.lineWidth = 2;
      ctx.setLineDash([10, 10]);
      ctx.lineDashOffset = -tick * 0.5;
      bldgs.forEach((b) => { ctx.beginPath(); ctx.moveTo(b.x + b.w / 2, b.y + b.h / 2); ctx.lineTo(270, 150); ctx.stroke(); });
      ctx.setLineDash([]);
      // Moving dot
      const dotX = 270 + Math.cos(tick * 0.02) * 100;
      const dotY = 150 + Math.sin(tick * 0.03) * 50;
      ctx.fillStyle = "#fff";
      ctx.shadowBlur = 10;
      ctx.shadowColor = "#fff";
      ctx.beginPath();
      ctx.arc(dotX, dotY, 4, 0, Math.PI * 2);
      ctx.fill();
      // Buildings
      bldgs.forEach((b) => {
        const rgb = colorMap[b.status] || "200,255,0";
        ctx.shadowBlur = 8;
        ctx.shadowColor = `rgba(${rgb}, 0.5)`;
        ctx.fillStyle = `rgba(${rgb}, 0.08)`;
        ctx.strokeStyle = `rgba(${rgb}, 0.7)`;
        ctx.lineWidth = 1;
        ctx.fillRect(b.x, b.y, b.w, b.h);
        ctx.strokeRect(b.x, b.y, b.w, b.h);
        ctx.shadowBlur = 0;
        ctx.fillStyle = "#fff";
        ctx.font = 'bold 9px "JetBrains Mono", monospace';
        ctx.fillText(b.label, b.x, b.y - 14);
        ctx.fillStyle = `rgba(${rgb}, 0.9)`;
        ctx.fillText(b.flow, b.x, b.y - 4);
        if (b.status === "coral" && tick % 60 < 30) {
          ctx.beginPath();
          ctx.arc(b.x + b.w, b.y, 3, 0, Math.PI * 2);
          ctx.fill();
        }
      });
      animFrameRef.current = requestAnimationFrame(draw);
    };
    animFrameRef.current = requestAnimationFrame(draw);

    return () => {
      window.removeEventListener("resize", resize);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [page]);

  // ── Analytics Charts ──────────────────────────────────
  useEffect(() => {
    if (page !== "analytics" || !analytics) return;

    // Coins chart
    const cChart = coinsChartRef.current;
    if (cChart) {
      const cCtx = cChart.getContext("2d");
      cChart.width = cChart.parentElement.clientWidth;
      cChart.height = 140;
      const vals = analytics.weekly_coins || [320, 480, 210, 650, 890, 540, 760];
      const maxV = Math.max(...vals);
      const bw = 20;
      const sp = cChart.width / 7;
      vals.forEach((v, i) => {
        const ht = (v / maxV) * 100;
        cCtx.fillStyle = i === 6 ? "#4a9b6d" : "rgba(74,155,109,0.2)";
        cCtx.fillRect(i * sp + (sp / 2) - bw / 2, 140 - ht, bw, ht);
      });
    }

    // Radar chart
    const rChart = radarChartRef.current;
    if (rChart) {
      const rCtx = rChart.getContext("2d");
      const cx = 130, cy = 130, r = 100;
      const vs = analytics.radar || [0.85, 0.72, 0.90, 0.68, 0.55, 0.78];
      const lbls = analytics.radar_labels || ["Scanning", "Challenges", "Streaks", "Reporting", "Social", "Actions"];
      rCtx.clearRect(0, 0, 260, 260);
      rCtx.strokeStyle = "rgba(255,255,255,0.1)";
      [0.25, 0.5, 0.75, 1].forEach((pct) => {
        rCtx.beginPath();
        for (let i = 0; i < 6; i++) {
          const a = (Math.PI * 2 / 6) * i - Math.PI / 2;
          const px = cx + Math.cos(a) * r * pct;
          const py = cy + Math.sin(a) * r * pct;
          if (i === 0) rCtx.moveTo(px, py); else rCtx.lineTo(px, py);
        }
        rCtx.closePath();
        rCtx.stroke();
      });
      rCtx.fillStyle = "rgba(74,155,109,0.15)";
      rCtx.strokeStyle = "#4a9b6d";
      rCtx.beginPath();
      vs.forEach((v, i) => {
        const a = (Math.PI * 2 / 6) * i - Math.PI / 2;
        const px = cx + Math.cos(a) * r * v;
        const py = cy + Math.sin(a) * r * v;
        if (i === 0) rCtx.moveTo(px, py); else rCtx.lineTo(px, py);
      });
      rCtx.closePath();
      rCtx.fill();
      rCtx.stroke();
      rCtx.fillStyle = "#4a9b6d";
      vs.forEach((v, i) => {
        const a = (Math.PI * 2 / 6) * i - Math.PI / 2;
        const px = cx + Math.cos(a) * r * v;
        const py = cy + Math.sin(a) * r * v;
        rCtx.beginPath();
        rCtx.arc(px, py, 3, 0, Math.PI * 2);
        rCtx.fill();
      });
      rCtx.fillStyle = "#8a8d87";
      rCtx.font = '10px "JetBrains Mono", monospace';
      rCtx.textAlign = "center";
      lbls.forEach((l, i) => {
        const a = (Math.PI * 2 / 6) * i - Math.PI / 2;
        const px = cx + Math.cos(a) * (r + 15);
        const py = cy + Math.sin(a) * (r + 15);
        rCtx.fillText(l, px, py + 3);
      });
    }
  }, [page, analytics]);

  // Close dropdowns on outside click
  useEffect(() => {
    const handler = () => { setShowNotifs(false); setShowProfileMenu(false); };
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, []);

  // ── Derived values ────────────────────────────────────
  const p = profile || {};
  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
  };
  const dateStr = new Date().toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" });
  const fmt = (n) => (n || 0).toLocaleString("en-IN");
  const xpPct = p.xp_next ? ((p.xp || 0) / p.xp_next * 100) : 0;

  const lb = leaderboard || {};
  const lbStudents = lb.students || [];
  const deptStandings = lb.dept_standings || [];
  const maxDeptCoins = deptStandings.length ? Math.max(...deptStandings.map((d) => d.coins)) : 1;

  /* ════════════════════════════════════════════════════════
     NAV ITEMS
     ════════════════════════════════════════════════════════ */
  const navSections = [
    {
      label: "Navigation",
      items: [
        { id: "dashboard", icon: "⚡", text: "Dashboard" },
        { id: "leaderboard", icon: "🏆", text: "Leaderboard", badge: "3" },
        { id: "challenges", icon: "🎯", text: "Challenges", badge: "4 NEW", badgeRed: true },
        { id: "scanner", icon: "📸", text: "AI Scanner" },
        { id: "callcenter", icon: "📞", text: "Request a Call" },
        { id: "tasks", icon: "✅", text: "Green Tasks", badge: `${tasks.filter(t => !t.completed).length}` },
      ],
    },
    {
      label: "Rewards",
      items: [
        { id: "wallet", icon: "🪙", text: "GreenCoins" },
        { id: "shop", icon: "🛍️", text: "Reward Shop" },
        { id: "badges", icon: "🎖️", text: "Badges" },
      ],
    },
    {
      label: "Community",
      items: [
        { id: "feed", icon: "📢", text: "Campus Feed" },
        { id: "analytics", icon: "📊", text: "My Analytics" },
        { id: "profile", icon: "👤", text: "Profile" },
      ],
    },
  ];

  const colorVar = (c) => {
    const map = { accent: "var(--accent)", acid: "var(--accent)", coral: "var(--coral)", cyan: "var(--cyan)", yellow: "var(--yellow)", violet: "var(--violet)", fog: "var(--fog)" };
    return map[c] || c;
  };

  /* ════════════════════════════════════════════════════════
     RENDER — PAGE CONTENT
     ════════════════════════════════════════════════════════ */

  // ── Dashboard Page ────────────────────────────────────
  const renderDashboard = () => (
    <>
      <div className="sp-hero-greeting">
        <div>
          <h1>{greeting()}, {p.name?.split(" ")[0] || "Student"}</h1>
          <div className="sp-hero-sub">
            {dateStr} · <span className="sp-dot" /> {dashData?.agents_online || 6} agents online · Solar output {dashData?.solar_kwh_today || 847} kWh today
          </div>
        </div>
        <button className="sp-btn sp-btn-primary" onClick={() => setShowSpinModal(true)}>Spin for Coins</button>
      </div>

      <div className="sp-grid-4">
        <div className="sp-card accent-hover">
          <div className="sp-stat-label">Carbon score</div>
          <div className="sp-stat-val text-acid">{p.carbon_score || 87}<span>/100</span></div>
          <div className="sp-stat-sub">Overall rating <span className="sp-delta-chip up">+8 this week</span></div>
        </div>
        <div className="sp-card accent-hover">
          <div className="sp-stat-label">GreenCoin balance</div>
          <div className="sp-stat-val">{fmt(coins)}<span>coins</span></div>
          <div className="sp-stat-sub">This month <span className="sp-delta-chip up">+340 today</span></div>
        </div>
        <div className="sp-card accent-hover">
          <div className="sp-stat-label">CO₂ you've avoided</div>
          <div className="sp-stat-val text-cyan">{p.co2_avoided_kg || 142}<span>kg</span></div>
          <div className="sp-stat-sub">This semester <span className="sp-delta-chip up" style={{ color: "var(--cyan)", background: "rgba(90,155,165,0.1)" }}>+12kg this week</span></div>
        </div>
        <div className="sp-card accent-hover">
          <div className="sp-stat-label">Your campus rank</div>
          <div className="sp-stat-val text-coral">#{p.campus_rank || 3}</div>
          <div className="sp-stat-sub">of {fmt(p.total_students || 4200)} students <span className="sp-delta-chip up-coral">moved up 2</span></div>
        </div>
      </div>

      {/* Energy Map */}
      <div className="sp-card sp-energy-map-card">
        <canvas ref={energyMapRef} />
        <div className="sp-map-legend">
          <div className="sp-legend-item"><span className="sp-dot" style={{ background: "rgba(74,155,109,0.6)" }} /> Efficient</div>
          <div className="sp-legend-item"><span className="sp-dot" style={{ background: "#555" }} /> Normal</div>
          <div className="sp-legend-item"><span className="sp-dot" style={{ background: "var(--coral)" }} /> Waste Detected</div>
          <div className="sp-legend-item"><span className="sp-dot" style={{ background: "var(--cyan)" }} /> Solar Surplus</div>
        </div>
      </div>

      <div className="sp-dash-row-2">
        {/* Mini leaderboard */}
        <div className="sp-card">
          <div className="sp-section-head">
            <div className="sp-section-title">Top Students</div>
            <button className="sp-btn sp-btn-outline" style={{ padding: "4px 8px", fontSize: 10 }} onClick={() => navTo("leaderboard")}>View All</button>
          </div>
          {lbStudents.slice(0, 5).map((s) => (
            <div key={s.rank} className={`sp-lb-row${s.is_user ? " me" : ""}`}>
              <div className={`sp-lb-rank${s.rank === 1 ? " gold" : s.rank === 2 ? " silver" : s.rank === 3 ? " bronze" : ""}`}>{s.rank}</div>
              <div className="sp-lb-ava" style={{ background: s.color }}>{s.initials}</div>
              <div className="sp-lb-info">
                <div className="sp-lb-name">{s.name} {s.is_user && <span className="text-acid">(YOU)</span>}</div>
                <div className="sp-lb-dept">{s.dept}</div>
              </div>
              <div className={`sp-lb-coins${s.is_user ? " text-acid" : ""}`}>{fmt(s.coins)} 🪙</div>
            </div>
          ))}
        </div>

        {/* Weekly performance */}
        <div className="sp-card">
          <div className="sp-section-title" style={{ marginBottom: 16 }}>Weekly performance</div>
          <div className="sp-mini-charts">
            {[
              { label: "MY ACTIONS", val: "24", color: "text-acid", bars: [40, 60, 30, 80, 50, 70, 100] },
              { label: "DEPT ENERGY", val: "-14%", color: "text-cyan", bars: [100, 90, 80, 85, 70, 60, 40] },
              { label: "CO₂ SAVED", val: "142kg", color: "text-coral", bars: [20, 30, 40, 30, 60, 80, 100] },
            ].map((row) => (
              <div key={row.label} className="sp-mini-chart-row">
                <div className="sp-mcr-info">
                  <h5>{row.label}</h5>
                  <div className={`val ${row.color}`}>{row.val}</div>
                </div>
                <div className="sp-mcr-bars">
                  {row.bars.map((h, i) => (
                    <div key={i} className="sp-mcr-bar" style={{ height: `${h}%`, background: i === 6 ? colorVar(row.color.replace("text-", "")) : undefined }} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Active challenges */}
      <div className="sp-section-head" style={{ marginTop: 8 }}>
        <div className="sp-section-title">Active challenges</div>
        <button className="sp-btn sp-btn-outline" onClick={() => navTo("challenges")}>See all →</button>
      </div>
      <div className="sp-grid-3">
        {challenges.slice(0, 3).map((c) => (
          <div key={c.id} className="sp-chal-card">
            <div className="sp-chal-top">
              <div className="sp-chal-title" style={{ color: c.color !== "coral" ? colorVar(c.color) : undefined }}>{c.title}</div>
              <div className="sp-chal-reward">{c.reward}🪙</div>
            </div>
            <div className="sp-chal-desc">{c.desc}</div>
            <div className="sp-chal-prog-wrap">
              <div className="sp-chal-prog-bg"><div className="sp-chal-prog-fill" style={{ width: `${c.progress}%`, background: colorVar(c.color) }} /></div>
              <div className="sp-chal-prog-info"><span>{c.progress_text || `${c.progress}%`}</span><span>{c.deadline}</span></div>
            </div>
            <div className="sp-chal-bot">
              <div className="sp-chal-timer">⏰ {c.timer}</div>
              <button className={`sp-btn ${c.joined ? "sp-btn-outline" : "sp-btn-primary"}`} disabled={c.joined} onClick={() => joinChallenge(c.id, c.reward)}>
                {c.joined ? "JOINED" : "JOIN"}
              </button>
            </div>
          </div>
        ))}
      </div>
    </>
  );

  // ── Leaderboard Page ──────────────────────────────────
  const renderLeaderboard = () => {
    const top3 = lbStudents.slice(0, 3);
    return (
      <>
        <div className="sp-section-head">
          <div className="sp-section-title" style={{ fontSize: 18 }}>Campus Leaderboard</div>
          <select style={{ background: "var(--bg-panels)", color: "white", border: "1px solid var(--border)", padding: 8, borderRadius: 6, fontFamily: "var(--font-mono)" }}>
            <option>Overall</option><option>MPSTME</option><option>Hostel D</option><option>This Week</option><option>This Month</option>
          </select>
        </div>

        {/* Podium */}
        <div style={{ display: "flex", justifyContent: "center", alignItems: "flex-end", gap: 20, margin: "40px 0" }}>
          {[top3[1], top3[0], top3[2]].filter(Boolean).map((s, i) => {
            const sizes = [{ ava: 64, fs: 20, pW: 80, pH: 60, medal: "🥈", shift: 0 }, { ava: 80, fs: 28, pW: 100, pH: 80, medal: "🥇", shift: -20 }, { ava: 60, fs: 18, pW: 80, pH: 50, medal: "🥉", shift: 0 }];
            const sz = sizes[i];
            return (
              <div key={s.rank} style={{ display: "flex", flexDirection: "column", alignItems: "center", transform: `translateY(${sz.shift}px)` }}>
                <div style={{ fontSize: i === 1 ? 32 : 24, marginBottom: 10 }}>{sz.medal}</div>
                <div style={{ width: sz.ava, height: sz.ava, borderRadius: "50%", background: s.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: sz.fs, fontFamily: "var(--font-heading)", fontWeight: 700, color: "#000", marginBottom: 12, border: i === 1 ? `3px solid ${s.color}` : `2px solid ${i === 0 ? "silver" : "#cd7f32"}`, position: "relative" }}>
                  {s.initials}
                  {s.is_user && <div style={{ position: "absolute", inset: -2, border: "1px solid var(--accent)", borderRadius: "50%", opacity: 0.4 }} />}
                </div>
                <div style={{ fontFamily: "var(--font-heading)", fontSize: i === 1 ? 18 : 14, color: s.is_user ? "var(--accent)" : undefined, marginBottom: 4 }}>{s.name}</div>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: i === 1 ? 14 : 12, color: s.color, fontWeight: i === 1 ? 700 : 400, marginBottom: 12 }}>{fmt(s.coins)} 🪙</div>
                <div style={{ width: sz.pW, height: sz.pH, background: "rgba(255,255,255,0.05)", borderRadius: "8px 8px 0 0", border: i === 1 ? "1px solid rgba(184,160,66,0.2)" : undefined }} />
              </div>
            );
          })}
        </div>

        <div className="sp-dash-row-2">
          <div className="sp-card" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {lbStudents.map((s) => (
              <div key={s.rank} className={`sp-lb-row${s.is_user ? " me" : ""}`}>
                <div className={`sp-lb-rank${s.rank === 1 ? " gold" : s.rank === 2 ? " silver" : s.rank === 3 ? " bronze" : ""}`}>{s.rank}</div>
                <div className="sp-lb-ava" style={{ background: s.color }}>{s.initials}</div>
                <div className="sp-lb-info">
                  <div className="sp-lb-name">{s.name} {s.is_user && <span className="text-acid">(YOU)</span>}</div>
                  <div className="sp-lb-dept">{s.dept}</div>
                </div>
                <div className={`sp-lb-coins${s.is_user ? " text-acid" : ""}`}>{fmt(s.coins)} 🪙</div>
              </div>
            ))}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div className="sp-card" style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", padding: "40px 20px" }}>
              <div className="sp-section-title text-fog" style={{ marginBottom: 8 }}>Your Position</div>
              <div style={{ fontFamily: "var(--font-heading)", fontSize: 40, fontWeight: 600, color: "var(--accent)", lineHeight: 1, marginBottom: 4 }}>#{p.campus_rank || 3}</div>
              <div className="text-fog" style={{ marginBottom: 20 }}>of {fmt(p.total_students || 4200)} students</div>
              <div style={{ background: "var(--accent-dim)", border: "1px solid var(--accent)", color: "var(--accent)", fontFamily: "var(--font-mono)", fontSize: 12, padding: 12, borderRadius: 8, marginBottom: 12 }}>300 coins to reach #2 🏆</div>
              <div className="sp-delta-chip up">↑ Moved up 2 positions this week</div>
            </div>

            <div className="sp-card">
              <div className="sp-section-title" style={{ marginBottom: 16 }}>Dept. standings</div>
              {deptStandings.map((d) => (
                <div key={d.dept} style={{ marginBottom: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontFamily: "var(--font-mono)", fontSize: 10, marginBottom: 4 }}>
                    <span>{d.dept}</span>
                    <span style={{ color: colorVar(d.color) }}>{fmt(d.coins)} 🪙</span>
                  </div>
                  <div className="sp-prog-bar"><div className="sp-prog-fill" style={{ width: `${(d.coins / maxDeptCoins) * 100}%`, background: colorVar(d.color) }} /></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </>
    );
  };

  // ── Challenges Page ───────────────────────────────────
  const [chalFilter, setChalFilter] = useState("All");
  const renderChallenges = () => (
    <>
      <div className="sp-tabs" style={{ border: "none", marginBottom: 0 }}>
        {["All", "Daily", "Weekly", "Campus-Wide", "Monthly"].map((f) => (
          <button key={f} className={`sp-tab${chalFilter === f ? " active" : ""}`} onClick={() => setChalFilter(f)}>{f}</button>
        ))}
      </div>
      <div className="sp-grid-3" style={{ marginTop: 20 }}>
        {challenges
          .filter((c) => chalFilter === "All" || c.category === chalFilter)
          .map((c) => (
            <div key={c.id} className="sp-chal-card">
              <div className="sp-chal-top">
                <div className="sp-chal-title">{c.title}</div>
                <div className="sp-chal-reward">{c.reward}🪙</div>
              </div>
              <div className="sp-chal-desc">{c.desc}</div>
              <div className="sp-chal-prog-wrap">
                <div className="sp-chal-prog-bg"><div className="sp-chal-prog-fill" style={{ width: `${c.progress}%`, background: colorVar(c.color) }} /></div>
                <div className="sp-chal-prog-info"><span>{c.progress_text || `${c.progress}%`}</span><span>{c.deadline}</span></div>
              </div>
              <div className="sp-chal-bot">
                <div className="sp-chal-timer">⏰ {c.timer}</div>
                <button className={`sp-btn ${c.joined ? "sp-btn-outline" : "sp-btn-primary"}`} disabled={c.joined} onClick={() => joinChallenge(c.id, c.reward)}>
                  {c.joined ? "JOINED" : "JOIN"}
                </button>
              </div>
            </div>
          ))}
      </div>
    </>
  );

  // ── AI Scanner Page ───────────────────────────────────
  const renderScanner = () => (
    <>
      <div className="sp-section-title" style={{ fontSize: 18, marginBottom: 16 }}>AI Energy Scanner</div>
      <div className="sp-cc-grid">
        <div className="sp-cc-left">
          <div className="sp-dropzone" onClick={triggerScan} style={scanResult ? { height: 120 } : undefined}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>📷</div>
            <div style={{ fontFamily: "var(--font-heading)", fontSize: 18, fontWeight: 700, marginBottom: 4 }}>Tap to Scan or Drop Image</div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--fog)" }}>AI detects energy waste · Earn 50–200 coins per scan</div>
          </div>

          {scanResult && (
            <div className="sp-card" style={{ marginTop: 10, background: "var(--bg-elevated)", border: "1px solid var(--accent)", padding: 24 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
                <div style={{ background: "rgba(193,122,94,0.1)", color: "var(--coral)", fontFamily: "var(--font-mono)", fontWeight: 700, fontSize: 10, padding: "4px 12px", borderRadius: 12 }}>{scanResult.severity?.toUpperCase()} SEVERITY</div>
                <div style={{ fontFamily: "var(--font-heading)", fontSize: 24, color: "var(--accent)", fontWeight: 600 }}>🪙 +{scanResult.reward}</div>
              </div>
              <div style={{ fontFamily: "var(--font-heading)", fontSize: 16, marginBottom: 8 }}>{scanResult.analysis?.title}</div>
              <div style={{ fontStyle: "italic", fontSize: 13, color: "var(--fog)", marginBottom: 20 }}>"{scanResult.analysis?.description}"</div>
              <div className="sp-grid-3" style={{ gap: 12, textAlign: "center" }}>
                <div style={{ background: "var(--bg-panels)", border: "1px solid var(--border)", padding: 12, borderRadius: 8 }}>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--fog)", marginBottom: 4 }}>RATE</div>
                  <div style={{ fontFamily: "var(--font-heading)", fontSize: 18, color: "white" }}>{scanResult.analysis?.rate_kwh}<span style={{ fontSize: 10 }}>kWh/h</span></div>
                </div>
                <div style={{ background: "var(--bg-panels)", border: "1px solid var(--border)", padding: 12, borderRadius: 8 }}>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--fog)", marginBottom: 4 }}>COST</div>
                  <div style={{ fontFamily: "var(--font-heading)", fontSize: 18, color: "var(--coral)" }}>₹{scanResult.analysis?.cost_inr}<span style={{ fontSize: 10 }}>/day</span></div>
                </div>
                <div style={{ background: "var(--bg-panels)", border: "1px solid var(--border)", padding: 12, borderRadius: 8 }}>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--fog)", marginBottom: 4 }}>CARBON</div>
                  <div style={{ fontFamily: "var(--font-heading)", fontSize: 18, color: "var(--cyan)" }}>{scanResult.analysis?.carbon_kg}<span style={{ fontSize: 10 }}>kg/d</span></div>
                </div>
              </div>
            </div>
          )}

          <div className="sp-section-title text-fog" style={{ fontSize: 12, marginTop: 20 }}>Quick reports</div>
          <div className="sp-grid-2">
            {[
              { icon: "💡", label: "Lights On" },
              { icon: "❄️", label: "AC Empty" },
              { icon: "🖥️", label: "Screen On" },
              { icon: "🚰", label: "Tap Running" },
            ].map((r) => (
              <button key={r.label} className="sp-btn sp-btn-outline" style={{ padding: 16, justifyContent: "space-between", width: "100%" }} onClick={() => quickReport(r.label)}>
                <span>{r.icon} {r.label}</span>
                <span className="text-acid" style={{ fontFamily: "var(--font-mono)" }}>+50🪙</span>
              </button>
            ))}
          </div>
        </div>

        <div className="sp-cc-right">
          <div className="sp-card" style={{ marginBottom: 20 }}>
            <div className="sp-section-title" style={{ marginBottom: 16 }}>Scan history</div>
            {[
              { icon: "❄️", title: "AC left running", sub: "Chemistry Lab", coins: 150, time: "Today" },
              { icon: "🖥️", title: "2 Screens On", sub: "Library 3rd Fl", coins: 50, time: "Yesterday" },
              { icon: "💡", title: "Empty class lights", sub: "MPSTME 402", coins: 100, time: "2 days ago" },
              { icon: "🚰", title: "Leaking Tap", sub: "Hostel Washroom", coins: 200, time: "3 days ago" },
            ].map((s, i) => (
              <div key={i} className="sp-data-row">
                <div className="sp-dr-icon">{s.icon}</div>
                <div className="sp-dr-main"><div className="sp-dr-title">{s.title}</div><div className="sp-dr-sub">{s.sub}</div></div>
                <div className="sp-dr-right"><div className="sp-dr-stat text-acid">+{s.coins}🪙</div><div className="sp-dr-sub">{s.time}</div></div>
              </div>
            ))}
          </div>

          <div className="sp-card sp-grid-2" style={{ background: "var(--accent-dim)", borderColor: "var(--accent)" }}>
            <div><div className="sp-dr-sub" style={{ marginBottom: 4 }}>Total Scans</div><div style={{ fontFamily: "var(--font-heading)", fontSize: 32, color: "var(--accent)" }}>{p.total_scans || 23}</div></div>
            <div><div className="sp-dr-sub" style={{ marginBottom: 4 }}>Total Coins</div><div style={{ fontFamily: "var(--font-heading)", fontSize: 32, color: "white" }}>{fmt(p.total_scan_coins || 1490)}</div></div>
            <div><div className="sp-dr-sub" style={{ marginBottom: 4 }}>Validated</div><div style={{ fontFamily: "var(--font-heading)", fontSize: 32, color: "var(--cyan)" }}>{p.validated_scans || 18}</div></div>
            <div><div className="sp-dr-sub" style={{ marginBottom: 4 }}>CO₂ Saved</div><div style={{ fontFamily: "var(--font-heading)", fontSize: 32, color: "var(--yellow)" }}>{p.scan_co2_kg || 31}kg</div></div>
          </div>
        </div>
      </div>
    </>
  );

  // ── Request a Call Page ────────────────────────────────
  const renderCallCenter = () => (
    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "60vh" }}>
      <div className="sp-card" style={{ maxWidth: 480, width: "100%", padding: 40, textAlign: "center" }}>
        {/* Header */}
        <div style={{ fontSize: 48, marginBottom: 16 }}>📞</div>
        <div style={{ fontFamily: "var(--font-heading)", fontSize: 24, fontWeight: 700, color: "white", marginBottom: 8 }}>
          Have a Query?
        </div>
        <div style={{ fontFamily: "var(--font-heading)", fontSize: 18, color: "var(--accent)", marginBottom: 8 }}>
          Request a Call
        </div>
        <div style={{ fontFamily: "var(--font-body)", fontSize: 14, color: "var(--fog)", marginBottom: 32, lineHeight: 1.6 }}>
          Our CampusZero AI voice agent will call you to help with energy queries, waste reports, or campus sustainability questions.
        </div>

        {/* Phone input */}
        <div style={{ marginBottom: 24 }}>
          <label style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--fog)", display: "block", textAlign: "left", marginBottom: 8 }}>
            MOBILE NUMBER
          </label>
          <div style={{
            display: "flex", alignItems: "center", gap: 0,
            background: "var(--bg-elevated)", border: "1px solid var(--border)",
            borderRadius: 8, overflow: "hidden"
          }}>
            <div style={{
              padding: "14px 16px", fontFamily: "var(--font-mono)", fontSize: 16,
              color: "var(--accent)", background: "rgba(74,155,109,0.1)",
              borderRight: "1px solid var(--border)", fontWeight: 600,
              userSelect: "none"
            }}>
              🇮🇳 +91
            </div>
            <input
              type="tel"
              value={callPhone.replace("+91", "")}
              onChange={(e) => {
                const digits = e.target.value.replace(/\D/g, "").slice(0, 10);
                setCallPhone("+91" + digits);
              }}
              placeholder="Enter 10-digit number"
              maxLength={10}
              style={{
                flex: 1, padding: "14px 16px", background: "transparent",
                border: "none", outline: "none", color: "white",
                fontFamily: "var(--font-mono)", fontSize: 16, letterSpacing: 1
              }}
            />
          </div>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--fog)", textAlign: "left", marginTop: 6 }}>
            Full number: {callPhone.length > 3 ? callPhone : "+91XXXXXXXXXX"}
          </div>
        </div>

        {/* Error message */}
        {callError && (
          <div style={{
            background: "rgba(193,122,94,0.1)", border: "1px solid var(--coral)",
            borderRadius: 8, padding: "10px 16px", marginBottom: 16,
            fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--coral)", textAlign: "left"
          }}>
            ⚠️ {callError}
          </div>
        )}

        {/* Success message */}
        {callSuccess && (
          <div style={{
            background: "rgba(74,155,109,0.1)", border: "1px solid var(--accent)",
            borderRadius: 8, padding: "16px", marginBottom: 16, textAlign: "left"
          }}>
            <div style={{ fontFamily: "var(--font-heading)", fontSize: 14, color: "var(--accent)", marginBottom: 4 }}>
              ✅ Call Requested Successfully!
            </div>
            <div style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "var(--fog)" }}>
              You will receive a call from our AI agent shortly on {callPhone}. Please keep your phone nearby.
            </div>
          </div>
        )}

        {/* Request button */}
        <button
          className="sp-btn sp-btn-primary"
          disabled={callRequesting || callPhone.length < 13}
          onClick={requestCall}
          style={{
            width: "100%", padding: 16, fontSize: 16, fontWeight: 700,
            opacity: callRequesting || callPhone.length < 13 ? 0.5 : 1,
            cursor: callRequesting || callPhone.length < 13 ? "not-allowed" : "pointer"
          }}
        >
          {callRequesting ? "⏳ Requesting Call..." : "📞 Request a Call"}
        </button>

        {/* Verification note */}
        <div style={{
          marginTop: 20, background: "rgba(255,193,59,0.08)", border: "1px solid rgba(255,193,59,0.25)",
          borderRadius: 8, padding: "12px 16px", textAlign: "left"
        }}>
          <div style={{ fontFamily: "var(--font-heading)", fontSize: 12, color: "#ffc13b", marginBottom: 4 }}>⚠️ Note</div>
          <div style={{ fontFamily: "var(--font-body)", fontSize: 12, color: "var(--fog)", lineHeight: 1.6 }}>
            This feature requires your mobile number to be <strong style={{ color: "white" }}>verified</strong> in our system before you can receive a call.
            Unverified numbers will not receive the callback. Please contact the admin to get your number verified.
          </div>
        </div>

        {/* Footer note */}
        <div style={{ marginTop: 16, fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--fog)", lineHeight: 1.6 }}>
          Powered by <span className="text-acid">CampusZero AI</span> × <span className="text-cyan">Twilio</span> × <span style={{ color: "var(--violet)" }}>Ultravox</span>
        </div>
      </div>
    </div>
  );

  // ── Wallet Page ───────────────────────────────────────
  const renderWallet = () => {
    const w = walletData || {};
    return (
      <div className="sp-grid-2">
        <div className="sp-card" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", padding: 40 }}>
          <div className="sp-section-title text-fog" style={{ fontFamily: "var(--font-mono)", marginBottom: 12 }}>GreenCoin Balance</div>
          <div style={{ fontFamily: "var(--font-heading)", fontSize: 48, fontWeight: 600, color: "var(--accent)", lineHeight: 1, marginBottom: 12 }}>{fmt(coins)}</div>
          <div style={{ fontSize: 24, marginBottom: 24 }}>🪙</div>
          <div style={{ display: "flex", gap: 20, width: "100%", marginBottom: 32 }}>
            <div style={{ flex: 1, background: "rgba(74,155,109,0.06)", border: "1px solid rgba(74,155,109,0.2)", padding: 16, borderRadius: 8 }}>
              <div className="sp-dr-sub" style={{ marginBottom: 8 }}>Total Earned</div>
              <div className="text-acid" style={{ fontFamily: "var(--font-mono)", fontSize: 16, fontWeight: 700 }}>+{fmt(w.total_earned || p.total_earned || 12400)}</div>
            </div>
            <div style={{ flex: 1, background: "rgba(193,122,94,0.06)", border: "1px solid rgba(193,122,94,0.2)", padding: 16, borderRadius: 8 }}>
              <div className="sp-dr-sub" style={{ marginBottom: 8 }}>Total Spent</div>
              <div className="text-coral" style={{ fontFamily: "var(--font-mono)", fontSize: 16, fontWeight: 700 }}>-{fmt(w.total_spent || p.total_spent || 7580)}</div>
            </div>
          </div>
          <button className="sp-btn sp-btn-primary" style={{ width: "100%", padding: 16 }} onClick={() => navTo("shop")}>Redeem your green points →</button>
        </div>

        <div className="sp-card" style={{ padding: 0 }}>
          <div className="sp-section-title" style={{ padding: 20, borderBottom: "1px solid var(--border)" }}>Transaction History</div>
          {(w.transactions || []).map((tx, i) => (
            <div key={i} className="sp-data-row">
              <div className="sp-dr-icon">{tx.icon}</div>
              <div className="sp-dr-main"><div className="sp-dr-title">{tx.title}</div><div className="sp-dr-sub">{tx.sub}</div></div>
              <div className="sp-dr-right">
                <div className={`sp-dr-stat ${tx.type === "earn" ? "text-acid" : "text-coral"}`}>{tx.type === "earn" ? "+" : "-"}{tx.amount}🪙</div>
                <div className="sp-dr-sub">{tx.time}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // ── Tasks Page ────────────────────────────────────────
  const renderTasks = () => {
    const cats = ["all", "daily", "weekly", "campus"];
    const filtered = taskFilter === "all" ? tasks : tasks.filter((t) => t.category === taskFilter);
    const completed = tasks.filter((t) => t.completed).length;
    const total = tasks.length;
    const pct = total > 0 ? Math.round((completed / total) * 100) : 0;

    const completeTask = async (taskId) => {
      try {
        const res = await fetch(`${BASE}/api/student/tasks/complete`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ task_id: taskId }),
        });
        if (res.ok) {
          const data = await res.json();
          setCoins(data.balance);
          setTasks((prev) => prev.map((t) => t.id === taskId ? { ...t, completed: true } : t));
          burstConfetti();
          showToast("acid", "✅", "Task Complete!", `+${data.reward} GreenCoins earned`, data.reward);
        }
      } catch {
        showToast("coral", "❌", "Error", "Could not complete task.");
      }
    };

    return (
      <>
        <div className="sp-section-head">
          <div className="sp-section-title">Green Tasks</div>
          <div className="sp-greencoin-badge">✅ {completed}/{total} done · {pct}%</div>
        </div>

        {/* Progress bar */}
        <div className="sp-card" style={{ marginBottom: 24 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
            <span style={{ color: "var(--text-secondary)", fontSize: 12 }}>Daily progress</span>
            <span style={{ color: "var(--accent)", fontSize: 12, fontWeight: 600 }}>{pct}% complete</span>
          </div>
          <div style={{ background: "rgba(255,255,255,0.06)", borderRadius: 8, height: 10 }}>
            <div style={{ background: "var(--accent)", height: "100%", borderRadius: 8, width: `${pct}%`, transition: "width 0.5s ease" }} />
          </div>
          <div style={{ display: "flex", gap: 16, marginTop: 12 }}>
            <span style={{ color: "var(--accent)", fontSize: 12 }}>🪙 Green Tokens: {fmt(p.green_tokens || p.total_earned || 0)}</span>
            <span style={{ color: "var(--cyan)", fontSize: 12 }}>🔥 Streak: {p.streak_days || 0} days</span>
          </div>
        </div>

        {/* Filter tabs */}
        <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
          {cats.map((c) => (
            <button key={c} className={`sp-btn ${taskFilter === c ? "sp-btn-primary" : "sp-btn-outline"}`}
              style={{ padding: "6px 16px", fontSize: 12, textTransform: "capitalize" }}
              onClick={() => setTaskFilter(c)}
            >{c === "all" ? "All Tasks" : c}</button>
          ))}
        </div>

        {/* Task list */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {filtered.map((task) => (
            <div key={task.id} className="sp-card" style={{
              display: "flex", alignItems: "center", gap: 16,
              opacity: task.completed && !task.repeatable ? 0.5 : 1,
              borderLeft: `3px solid ${task.completed ? "var(--accent)" : "rgba(255,255,255,0.1)"}`,
            }}>
              <div style={{ fontSize: 28, minWidth: 40, textAlign: "center" }}>{task.icon}</div>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <h4 style={{ margin: 0, fontSize: 14 }}>{task.title}</h4>
                  <span style={{
                    fontSize: 10, padding: "2px 8px", borderRadius: 10,
                    background: task.category === "daily" ? "rgba(74,155,109,0.15)" : task.category === "weekly" ? "rgba(90,155,165,0.15)" : "rgba(139,126,168,0.15)",
                    color: task.category === "daily" ? "var(--accent)" : task.category === "weekly" ? "var(--cyan)" : "var(--violet)",
                  }}>{task.category}</span>
                </div>
                <p style={{ margin: "4px 0 0", fontSize: 12, color: "var(--text-secondary)" }}>{task.desc}</p>
                {task.progress !== undefined && task.target && (
                  <div style={{ marginTop: 6 }}>
                    <div style={{ background: "rgba(255,255,255,0.06)", borderRadius: 6, height: 6, width: 120 }}>
                      <div style={{ background: "var(--accent)", height: "100%", borderRadius: 6, width: `${(task.progress / task.target) * 100}%` }} />
                    </div>
                    <span style={{ fontSize: 10, color: "var(--fog)" }}>{task.progress}/{task.target}</span>
                  </div>
                )}
              </div>
              <div style={{ textAlign: "right", minWidth: 90 }}>
                <div style={{ color: "var(--accent)", fontWeight: 700, fontSize: 14 }}>+{task.reward} 🪙</div>
                {task.completed ? (
                  <span style={{ fontSize: 11, color: "var(--accent)" }}>✓ Done</span>
                ) : (
                  <button className="sp-btn sp-btn-primary" style={{ padding: "4px 12px", fontSize: 11, marginTop: 4 }}
                    onClick={() => completeTask(task.id)}
                  >Complete</button>
                )}
              </div>
            </div>
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="sp-card" style={{ textAlign: "center", padding: 40, color: "var(--fog)" }}>No tasks in this category.</div>
        )}
      </>
    );
  };

  // ── Shop Page ─────────────────────────────────────────
  const renderShop = () => (
    <>
      <div className="sp-section-head">
        <div className="sp-section-title">Reward Shop</div>
        <div className="sp-greencoin-badge">🪙 {fmt(coins)} available</div>
      </div>
      <div className="sp-grid-3" style={{ gap: 24 }}>
        {shopItems.map((item) => (
          <div key={item.id} className="sp-card sp-shop-card">
            <div className="sp-emoji" style={item.out_of_stock ? { filter: "grayscale(1)" } : undefined}>{item.emoji}</div>
            <h4 style={item.out_of_stock ? { color: "var(--fog)" } : undefined}>{item.name}</h4>
            <p>{item.desc}</p>
            <div className="sp-shop-price" style={item.out_of_stock ? { background: "rgba(255,255,255,0.05)", color: "var(--fog)" } : undefined}>{item.price} 🪙</div>
            <br />
            {item.out_of_stock ? (
              <button className="sp-btn sp-btn-primary" disabled style={{ background: "var(--bg-panels)", color: "var(--fog)" }}>Out of Stock</button>
            ) : (
              <button className="sp-btn sp-btn-primary" disabled={coins < item.price} onClick={() => redeem(item.name, item.price)}>REDEEM</button>
            )}
          </div>
        ))}
      </div>
    </>
  );

  // ── Badges Page ───────────────────────────────────────
  const renderBadges = () => {
    const b = badges || { earned: [], locked: [] };
    return (
      <>
        <div className="sp-section-head">
          <div className="sp-section-title">Your badges</div>
          <div className="sp-dr-sub" style={{ fontSize: 12, fontWeight: 600 }}>{b.earned.length} of {b.earned.length + b.locked.length} earned</div>
        </div>
        <div className="sp-grid-5">
          {b.earned.map((badge) => (
            <div key={badge.name} className="sp-card sp-badge-card accent-hover" onClick={() => showToast("acid", "🎖️", badge.emoji + " " + badge.name, badge.desc)}>
              <div className="sp-emoji">{badge.emoji}</div>
              <div className="sp-badge-name">{badge.name}</div>
            </div>
          ))}
          {b.locked.map((badge) => (
            <div key={badge.name} className="sp-card sp-badge-card locked" onClick={() => showToast("yellow", "🔒", "Badge Locked", badge.desc)}>
              <div className="sp-emoji">{badge.emoji}</div>
              <div className="sp-badge-name">{badge.name}</div>
            </div>
          ))}
        </div>
      </>
    );
  };

  // ── Feed Page ─────────────────────────────────────────
  const renderFeed = () => (
    <div className="sp-dash-row-2">
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        {feed.map((f) => (
          <div key={f.id} className="sp-card" style={f.is_system ? { border: "1px solid var(--accent)", background: "var(--accent-dim)" } : undefined}>
            <div style={{ display: "flex", gap: 12, marginBottom: 12 }}>
              <div className="sp-lb-ava" style={{ background: f.color }}>{f.initials}</div>
              <div className="sp-dr-main">
                <div className="sp-dr-title" style={{ fontFamily: "var(--font-heading)" }}>
                  {f.user} {f.is_user && <span className="text-fog">(You)</span>}
                </div>
                <div className="sp-dr-sub">{f.dept} · {f.time}</div>
              </div>
              {f.coins > 0 && <div className="sp-ac-badge">+{f.coins}🪙</div>}
            </div>
            <div style={{ fontFamily: "var(--font-body)", fontSize: 14, marginBottom: f.is_system ? 0 : 16 }}>{f.content}</div>
            {!f.is_system && (
              <div style={{ display: "flex", gap: 12 }}>
                <button className="sp-btn sp-btn-outline" style={{ padding: "4px 12px", fontSize: 12 }} onClick={() => likeFeedPost(f.id)}>👍 {f.likes || "Like"}</button>
                <button className="sp-btn sp-btn-outline" style={{ padding: "4px 12px", fontSize: 12 }} onClick={() => showToast("cyan", "💬", "Comment feature coming soon!", "Social Feature")}>💬 Comment</button>
              </div>
            )}
          </div>
        ))}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <div className="sp-card">
          <div className="sp-section-title">Upcoming events</div>
          {events.map((e) => (
            <div key={e.id} className="sp-data-row">
              <div className="sp-dr-icon">{e.icon}</div>
              <div className="sp-dr-main"><div className="sp-dr-title">{e.title}</div><div className="sp-dr-sub">{e.time}</div></div>
              <button className="sp-btn sp-btn-primary" style={{ padding: "4px 8px", fontSize: 10 }} disabled={e.joined} onClick={() => rsvp(e.id)}>
                {e.joined ? "JOINED" : "RSVP"}
              </button>
            </div>
          ))}
        </div>

        <div className="sp-card">
          <div className="sp-section-title">Live campus stats</div>
          {[
            { label: "Solar Generation", value: `${dashData?.solar_kwh_today || 124}kWh`, color: "text-yellow" },
            { label: "Campus Energy Score", value: `${dashData?.campus_energy_score || 74}/100`, color: "text-acid" },
            { label: "Active Students", value: fmt(dashData?.active_students || 1240), color: "text-cyan" },
            { label: "Waste Prevented Today", value: `₹${fmt(dashData?.waste_prevented_inr || 12400)}`, color: "text-coral" },
          ].map((s) => (
            <div key={s.label} className="sp-data-row">
              <div className="sp-dr-main"><div className={`sp-dr-title ${s.color}`}>{s.label}</div></div>
              <div className="sp-dr-right"><div className={`sp-dr-stat ${s.color}`} style={{ fontSize: 16 }}>{s.value}</div></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  // ── Analytics Page ────────────────────────────────────
  const renderAnalytics = () => {
    const a = analytics || {};
    return (
      <>
        <div className="sp-section-title" style={{ fontSize: 16, marginBottom: 16 }}>Your Analytics</div>
        <div className="sp-dash-row-2">
          <div className="sp-card" style={{ padding: 24, position: "relative" }}>
            <div className="sp-dr-sub" style={{ marginBottom: 12 }}>WEEKLY COINS EARNED</div>
            <canvas ref={coinsChartRef} style={{ width: "100%", height: 140, display: "block" }} />
            <div style={{ display: "flex", justifyContent: "space-between", fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--fog)", marginTop: 8 }}>
              {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => <span key={d}>{d}</span>)}
              <span className="text-acid">Sun</span>
            </div>
          </div>
          <div className="sp-card" style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            <div className="sp-dr-sub" style={{ alignSelf: "flex-start" }}>PERFORMANCE RADAR</div>
            <canvas ref={radarChartRef} width="260" height="260" style={{ marginTop: -20 }} />
          </div>
        </div>

        <div className="sp-dash-row-2">
          <div className="sp-card sp-grid-2">
            <div><div className="sp-dr-sub" style={{ marginBottom: 4 }}>Best Single Day</div><div style={{ fontFamily: "var(--font-heading)", fontSize: 24, color: "var(--yellow)" }}>{a.best_day_coins || 890}🪙</div></div>
            <div><div className="sp-dr-sub" style={{ marginBottom: 4 }}>Longest Streak</div><div style={{ fontFamily: "var(--font-heading)", fontSize: 24, color: "var(--coral)" }}>{a.longest_streak || 23} days</div></div>
            <div><div className="sp-dr-sub" style={{ marginBottom: 4 }}>Most Scans (Day)</div><div style={{ fontFamily: "var(--font-heading)", fontSize: 24, color: "var(--cyan)" }}>{a.most_scans_day || 8} scans</div></div>
            <div><div className="sp-dr-sub" style={{ marginBottom: 4 }}>Most CO₂ Saved</div><div style={{ fontFamily: "var(--font-heading)", fontSize: 24, color: "var(--accent)" }}>{a.most_co2_saved || 18.4}kg</div></div>
          </div>

          <div className="sp-card">
            <div className="sp-dr-sub" style={{ marginBottom: 16 }}>ACTION BREAKDOWN</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {(a.action_breakdown || []).map((b) => (
                <div key={b.label}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontFamily: "var(--font-mono)", fontSize: 10, marginBottom: 4 }}>
                    <span>{b.label}</span>
                    <span style={{ color: colorVar(b.color) }}>{b.pct}%</span>
                  </div>
                  <div className="sp-prog-bar"><div className="sp-prog-fill" style={{ width: `${b.pct}%`, background: colorVar(b.color) }} /></div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="sp-card sp-grid-2" style={{ gap: 24 }}>
          {(a.goals || []).map((g) => (
            <div key={g.title}>
              <div className="sp-chal-top" style={{ marginBottom: 4 }}>
                <div className="sp-chal-title">{g.title}</div>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, fontWeight: 700, color: colorVar(g.color) }}>{g.pct}%</div>
              </div>
              <div className="sp-dr-sub" style={{ marginBottom: 8, textAlign: "right" }}>{g.sub}</div>
              <div className="sp-prog-bar" style={{ height: 8 }}><div className="sp-prog-fill" style={{ width: `${g.pct}%`, background: colorVar(g.color) }} /></div>
            </div>
          ))}
        </div>
      </>
    );
  };

  // ── Profile Page ──────────────────────────────────────
  const renderProfile = () => {
    const prefs = p.preferences || {};
    return (
      <div className="sp-dash-row-2">
        <div className="sp-card" style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", padding: "40px 20px" }}>
          <div className="sp-sc-avatar" style={{ width: 96, height: 96, fontSize: 36, marginBottom: 16 }}>
            {p.initials || "PR"}
            <div className="sp-sc-avatar-ring" />
          </div>
          <div style={{ fontFamily: "var(--font-heading)", fontSize: 20, fontWeight: 600, marginBottom: 4 }}>{p.name || "Student"}</div>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--fog)", marginBottom: 4 }}>{p.email || ""}</div>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--fog)", marginBottom: 20 }}>{p.dept || ""}</div>

          <div className="sp-sc-lvl" style={{ fontSize: 12, padding: "4px 12px" }}>Lvl {p.level || 7} — {p.level_title || "Eco Champion"}</div>
          <div className="sp-xp" style={{ maxWidth: 300, margin: "0 auto 32px" }}>
            <div className="sp-xp-labels" style={{ fontSize: 11 }}><span>XP {fmt(p.xp || 8240)}</span><span>Next {fmt(p.xp_next || 10000)}</span></div>
            <div className="sp-xp-bar-bg" style={{ height: 6 }}><div className="sp-xp-bar-fill" style={{ width: `${xpPct}%` }} /></div>
          </div>

          <div className="sp-grid-3" style={{ gap: 20, width: "100%", maxWidth: 400, marginBottom: 32 }}>
            <div style={{ background: "var(--bg-panels)", padding: 16, borderRadius: 12, border: "1px solid var(--border)" }}>
              <div className="sp-dr-sub" style={{ marginBottom: 8 }}>CO₂ Saved</div>
              <div className="text-cyan" style={{ fontFamily: "var(--font-heading)", fontSize: 24 }}>{p.co2_avoided_kg || 142}kg</div>
            </div>
            <div style={{ background: "var(--bg-panels)", padding: 16, borderRadius: 12, border: "1px solid var(--border)" }}>
              <div className="sp-dr-sub" style={{ marginBottom: 8 }}>Day Streak</div>
              <div className="text-coral" style={{ fontFamily: "var(--font-heading)", fontSize: 24 }}>{p.streak_days || 12}</div>
            </div>
            <div style={{ background: "var(--bg-panels)", padding: 16, borderRadius: 12, border: "1px solid var(--border)" }}>
              <div className="sp-dr-sub" style={{ marginBottom: 8 }}>Total Scans</div>
              <div className="text-acid" style={{ fontFamily: "var(--font-heading)", fontSize: 24 }}>{p.total_scans || 23}</div>
            </div>
          </div>

          <button className="sp-btn sp-btn-primary" style={{ padding: "16px 24px" }} onClick={() => showToast("cyan", "⬇️", "Downloading PDF", "Green GPA: 3.8 / 4.0 generating...")}>
            Download Green GPA Card
          </button>
        </div>

        <div className="sp-card" style={{ padding: 0 }}>
          <div className="sp-section-title" style={{ padding: 20, borderBottom: "1px solid var(--border)", fontSize: 14, letterSpacing: 1, color: "var(--fog)" }}>Preferences</div>
          <div style={{ padding: "12px 20px" }}>
            {[
              { key: "push_notifications", label: "Push Notifications" },
              { key: "ai_call_alerts", label: "AI Call Alerts" },
              { key: "streak_reminders", label: "Streak Reminders" },
              { key: "solar_peak_alerts", label: "Solar Peak Alerts" },
              { key: "challenge_updates", label: "Challenge Updates" },
              { key: "campus_feed_emails", label: "Campus Feed Emails" },
            ].map((pref) => (
              <div key={pref.key} className="sp-data-row" style={{ padding: "16px 0" }}>
                <div className="sp-dr-main sp-dr-title">{pref.label}</div>
                <div
                  className={`sp-toggle${prefs[pref.key] ? " on" : ""}`}
                  onClick={() => {
                    const newPrefs = { ...prefs, [pref.key]: !prefs[pref.key] };
                    setProfile((prev) => ({ ...prev, preferences: newPrefs }));
                    fetch(`${BASE}/api/student/profile`, {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ updates: { preferences: newPrefs } }),
                    }).catch(() => {});
                  }}
                >
                  <div className="sp-toggle-circ" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  // ── Page router ───────────────────────────────────────
  const renderContent = () => {
    switch (page) {
      case "dashboard": return renderDashboard();
      case "leaderboard": return renderLeaderboard();
      case "challenges": return renderChallenges();
      case "scanner": return renderScanner();
      case "callcenter": return renderCallCenter();
      case "wallet": return renderWallet();
      case "shop": return renderShop();
      case "tasks": return renderTasks();
      case "badges": return renderBadges();
      case "feed": return renderFeed();
      case "analytics": return renderAnalytics();
      case "profile": return renderProfile();
      default: return renderDashboard();
    }
  };

  /* ════════════════════════════════════════════════════════
     MAIN RENDER
     ════════════════════════════════════════════════════════ */
  return (
    <div className="sp-root">
      {/* ── Sidebar ─────────────────────────────────── */}
      <div className="sp-sidebar">
        <div className="sp-student-card">
          <div className="sp-sc-avatar">
            {p.initials || "PR"}
            <div className="sp-sc-avatar-ring" />
          </div>
          <div className="sp-sc-name">{p.name || "Student"}</div>
          <div className="sp-sc-dept">{p.short_dept || "MPSTME · CSE · 3rd Year"}</div>
          <div className="sp-sc-lvl">Lvl {p.level || 7} — {p.level_title || "Eco Champion"}</div>
          <div className="sp-xp">
            <div className="sp-xp-labels"><span>XP {fmt(p.xp || 8240)}</span><span>Next {fmt(p.xp_next || 10000)}</span></div>
            <div className="sp-xp-bar-bg"><div className="sp-xp-bar-fill" style={{ width: `${xpPct}%` }} /></div>
          </div>
        </div>

        <div className="sp-streak-widget">
          <div className="sp-sw-title">🔥 {p.streak_days || 12}-Day Streak</div>
          <div className="sp-sw-days">
            {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
              <div key={i} className={`sp-sw-day${i < 6 ? " done" : " today"}`}>{d}</div>
            ))}
          </div>
          <div className="sp-sw-sub">Keep it alive — {p.streak_hours_left || 6}hrs left</div>
        </div>

        {navSections.map((section) => (
          <div key={section.label} className="sp-sidebar-section">
            <div className="sp-sidebar-label">{section.label}</div>
            {section.items.map((item) => (
              <button
                key={item.id}
                className={`sp-nav-item${page === item.id ? " active" : ""}`}
                onClick={() => navTo(item.id)}
              >
                <span className="sp-nav-icon">{item.icon}</span>
                <span className="sp-nav-text">{item.text}</span>
                {item.badge && <span className={`sp-nav-badge${item.badgeRed ? " red" : ""}`}>{item.badge}</span>}
              </button>
            ))}
          </div>
        ))}

        <button className="sp-logout-btn" onClick={onLogout}>
          🚪 Logout
        </button>
      </div>

      {/* ── Main area ───────────────────────────────── */}
      <div className="sp-main-wrap">
        {/* Topbar */}
        <div className="sp-topbar">
          <div className="sp-brand">Campus<span>Zero</span></div>
          <div className="sp-search-bar">
            <span className="sp-search-kbd">Ctrl+K</span>
            <input type="text" placeholder="Search features, rooms, agents..." />
          </div>
          <div className="sp-top-right">
            <div className="sp-live-status">
              <span className="sp-dot" />
              <span>Solar {dashData?.solar_kwh_today || 847}kWh · {dashData?.agents_online || 6} agents</span>
            </div>
            <div className="sp-greencoin-badge" onClick={() => navTo("wallet")}>
              🪙 {fmt(coins)}
            </div>
            <div className="sp-bell" style={{ position: "relative" }} onClick={(e) => { e.stopPropagation(); setShowNotifs((v) => !v); }}>
              🔔
              {notifs.filter((n) => n.unread).length > 0 && (
                <div className="sp-bell-count">{notifs.filter((n) => n.unread).length}</div>
              )}
              {showNotifs && (
                <div className="sp-notif-dropdown" onClick={(e) => e.stopPropagation()}>
                  <div className="sp-notif-header">
                    Notifications
                    <span style={{ cursor: "pointer", color: "var(--accent)", fontSize: 11 }} onClick={() => setNotifs((prev) => prev.map((n) => ({ ...n, unread: false })))}>Mark all read</span>
                  </div>
                  {notifs.map((n, i) => (
                    <div key={i} className={`sp-notif-item${n.unread ? " unread" : ""}`}>
                      <div className="sp-notif-icon">{n.icon}</div>
                      <div className="sp-notif-content">
                        <h4>{n.title}</h4>
                        <p>{n.desc}</p>
                        <div className="sp-notif-time">{n.time}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="sp-avatar" style={{ position: "relative" }} onClick={(e) => { e.stopPropagation(); setShowProfileMenu((v) => !v); }}>
              {p.initials || "PR"}
              {showProfileMenu && (
                <div className="sp-notif-dropdown" style={{ top: 40, right: 0, width: 220 }} onClick={(e) => e.stopPropagation()}>
                  <div className="sp-notif-item" onClick={() => { setShowProfileMenu(false); navTo("profile"); }}>View profile</div>
                  <div className="sp-notif-item" style={{ color: "var(--coral)" }} onClick={onLogout}>Sign out</div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Page content */}
        <div className="sp-main">
          {renderContent()}
        </div>
      </div>

      {/* ── Solar Spin Modal ────────────────────────── */}
      {showSpinModal && (
        <div className="sp-modal-overlay" onClick={() => { if (!spinning) setShowSpinModal(false); }}>
          <div className="sp-modal" onClick={(e) => e.stopPropagation()}>
            <button className="sp-modal-close" onClick={() => setShowSpinModal(false)}>✕</button>
            <h2 style={{ fontFamily: "var(--font-heading)", fontSize: 18, color: "var(--accent)", marginBottom: 8 }}>Solar Spin</h2>
            <p style={{ fontSize: 12, color: "var(--fog)", marginBottom: 24 }}>Solar is generating surplus energy — spin to win bonus GreenCoins!</p>
            <div style={{ fontSize: 80, marginBottom: 24, transition: "0.2s" }}>{spinEmoji}</div>
            <button className="sp-btn sp-btn-primary" style={{ width: "100%", padding: 16 }} disabled={spinning} onClick={triggerSpin}>
              {spinning ? "SPINNING..." : "SPIN NOW"}
            </button>
            {spinResult && (
              <div style={{ fontFamily: "var(--font-heading)", fontSize: 20, color: "var(--accent)", marginTop: 16 }}>
                You won +{spinResult} GreenCoins!
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Toast Container ─────────────────────────── */}
      <div className="sp-toast-container">
        {toasts.map((t) => (
          <div key={t.id} className={`sp-toast ${t.color}`}>
            <div style={{ fontSize: 24 }}>{t.icon}</div>
            <div style={{ flexGrow: 1 }}>
              <div style={{ fontFamily: "var(--font-heading)", fontSize: 14, fontWeight: 600 }}>{t.title}</div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--fog)" }}>{t.desc}</div>
            </div>
            {t.coinAmt > 0 && (
              <div style={{ fontFamily: "var(--font-heading)", fontSize: 16, color: "var(--accent)", fontWeight: 700 }}>+🪙 {t.coinAmt}</div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
