import React from "react";
import { AlertTriangle, X } from "lucide-react";

/* ── Severity Configs ─────────────────────────────────────────── */
const severityCfg = {
  high: {
    bg: "bg-red-500/[0.08]",
    border: "border-red-500/20",
    text: "text-red-200",
    icon: "text-red-400",
    glow: "shadow-[0_0_20px_rgba(239,68,68,0.1)]",
    pulse: "animate-pulse",
    dot: "bg-red-400",
    dotGlow: "shadow-[0_0_8px_rgba(239,68,68,0.6)]",
    gradient: "from-red-500/20 via-red-500/5 to-transparent",
  },
  medium: {
    bg: "bg-amber-500/[0.08]",
    border: "border-amber-500/20",
    text: "text-amber-200",
    icon: "text-amber-400",
    glow: "shadow-[0_0_20px_rgba(245,158,11,0.1)]",
    pulse: "",
    dot: "bg-amber-400",
    dotGlow: "shadow-[0_0_8px_rgba(245,158,11,0.6)]",
    gradient: "from-amber-500/20 via-amber-500/5 to-transparent",
  },
  low: {
    bg: "bg-sky-500/[0.08]",
    border: "border-sky-500/20",
    text: "text-sky-200",
    icon: "text-sky-400",
    glow: "shadow-[0_0_20px_rgba(56,189,248,0.1)]",
    pulse: "",
    dot: "bg-sky-400",
    dotGlow: "shadow-[0_0_8px_rgba(56,189,248,0.6)]",
    gradient: "from-sky-500/20 via-sky-500/5 to-transparent",
  },
};

export default function AlertBanner({ alertMessage, severity = "high", onDismiss }) {
  if (!alertMessage) return null;
  const cfg = severityCfg[severity] || severityCfg.high;

  return (
    <div
      role="alert"
      className={`
        relative overflow-hidden animate-slide-down
        flex items-center justify-between gap-3
        px-5 py-3 border-b backdrop-blur-xl
        text-sm font-medium tracking-wide
        ${cfg.bg} ${cfg.border} ${cfg.text} ${cfg.glow}
      `}
    >
      {/* Gradient line at the bottom */}
      <div className={`absolute bottom-0 left-0 right-0 h-[1px] bg-gradient-to-r ${cfg.gradient}`} />

      {/* Icon + pulsing dot + Message */}
      <div className="flex items-center gap-3 min-w-0">
        <div className="relative">
          <AlertTriangle className={`w-5 h-5 flex-shrink-0 ${cfg.icon} ${cfg.pulse}`} />
          <span className={`absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full ${cfg.dot} ${cfg.dotGlow}`}>
            {severity === "high" && <span className={`absolute inset-0 rounded-full ${cfg.dot} animate-ping`} />}
          </span>
        </div>
        <span className="truncate">{alertMessage}</span>
      </div>

      {/* Dismiss */}
      {onDismiss && (
        <button
          onClick={onDismiss}
          className="p-1.5 rounded-lg hover:bg-white/[0.08] transition-all flex-shrink-0"
          aria-label="Dismiss alert"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
