import React, { useState } from "react";
import { Building2, ShieldCheck, GraduationCap, ArrowRight, Eye, EyeOff } from "lucide-react";

export default function LoginPage({ onLogin, onGoToRegister, onBackToLanding }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);

  return (
    <div className="min-h-screen flex items-center justify-center bg-black relative overflow-hidden">
      {/* Subtle background effects */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] rounded-full bg-sky-500/[0.04] blur-[120px]" />
        <div className="absolute bottom-0 right-0 w-[600px] h-[400px] rounded-full bg-violet-500/[0.03] blur-[100px]" />
      </div>

      <div className="relative z-10 w-full max-w-md px-6">
        {/* Logo */}
        <div className="flex flex-col items-center mb-10">
          <button
            onClick={onBackToLanding}
            className="flex items-center gap-3 mb-6 group"
          >
            <div className="relative flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-sky-500/20 to-violet-500/20 border border-sky-400/25 shadow-[0_0_14px_rgba(56,189,248,0.12)]">
              <Building2 className="w-6 h-6 text-sky-300" />
            </div>
            <div>
              <p className="text-xl font-extrabold text-white leading-none tracking-tight">
                NMIMS Indore
              </p>
              <p className="text-[9px] text-sky-400/75 uppercase tracking-[0.2em] font-semibold mt-0.5">
                Net-Zero Command Center
              </p>
            </div>
          </button>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Welcome Back
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Sign in to your account
          </p>
        </div>

        {/* Login Form Card */}
        <div className="glass-card p-8 mb-6">
          <div className="space-y-4 mb-6">
            <div>
              <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@nmims.edu"
                className="w-full h-11 px-4 rounded-xl bg-white/[0.04] border border-white/[0.08] text-sm text-white placeholder-slate-600 focus:border-sky-500/40 focus:outline-none focus:ring-1 focus:ring-sky-500/20 transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPw ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full h-11 px-4 pr-11 rounded-xl bg-white/[0.04] border border-white/[0.08] text-sm text-white placeholder-slate-600 focus:border-sky-500/40 focus:outline-none focus:ring-1 focus:ring-sky-500/20 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-600 hover:text-slate-400 transition-colors"
                >
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>

          <button
            onClick={() => {
              /* For now just validate non-empty or let demo buttons be used */
            }}
            className="w-full h-11 rounded-xl bg-sky-500/20 border border-sky-400/25 text-sm font-semibold text-sky-300 hover:bg-sky-500/30 transition-all duration-200 flex items-center justify-center gap-2"
          >
            Sign In <ArrowRight className="w-4 h-4" />
          </button>

          <p className="text-center text-xs text-slate-600 mt-4">
            Don&apos;t have an account?{" "}
            <button
              onClick={onGoToRegister}
              className="text-sky-400 hover:text-sky-300 transition-colors font-medium"
            >
              Register
            </button>
          </p>
        </div>

        {/* Divider */}
        <div className="flex items-center gap-4 mb-4">
          <div className="flex-1 h-px bg-gradient-to-r from-transparent via-emerald-400/30 to-transparent" />
          <span className="text-xs text-emerald-400 uppercase tracking-widest font-bold animate-pulse">
            ⚡ Demo Access ⚡
          </span>
          <div className="flex-1 h-px bg-gradient-to-r from-transparent via-emerald-400/30 to-transparent" />
        </div>

        {/* Demo Login Buttons */}
        <div className="relative grid grid-cols-2 gap-3 p-4 rounded-2xl border-2 border-dashed border-emerald-400/40 bg-emerald-500/[0.04]">
          {/* Pulsing glow behind the card */}
          <div className="absolute -inset-1 rounded-2xl bg-emerald-400/[0.06] blur-lg -z-10 animate-pulse" />

          {/* Hint badge */}
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-emerald-500 text-black text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full shadow-[0_0_12px_rgba(52,211,153,0.5)] whitespace-nowrap z-10">
            Click to enter instantly
          </div>

          <button
            onClick={() => onLogin("admin")}
            className="group glass-card glass-card-hover p-5 flex flex-col items-center gap-3 text-center border-violet-400/20 hover:border-violet-400/50 hover:shadow-[0_0_20px_rgba(139,92,246,0.15)] transition-all duration-300"
          >
            <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500/25 to-fuchsia-500/20 border border-violet-400/30 group-hover:border-violet-400/60 group-hover:shadow-[0_0_16px_rgba(139,92,246,0.3)] transition-all duration-300">
              <ShieldCheck className="w-6 h-6 text-violet-400" />
            </div>
            <div>
              <p className="text-sm font-bold text-white">Admin Demo</p>
              <p className="text-[10px] text-violet-300/60 mt-0.5">Full control panel</p>
            </div>
          </button>

          <button
            onClick={() => onLogin("student")}
            className="group glass-card glass-card-hover p-5 flex flex-col items-center gap-3 text-center border-emerald-400/20 hover:border-emerald-400/50 hover:shadow-[0_0_20px_rgba(52,211,153,0.15)] transition-all duration-300"
          >
            <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500/25 to-teal-500/20 border border-emerald-400/30 group-hover:border-emerald-400/60 group-hover:shadow-[0_0_16px_rgba(52,211,153,0.3)] transition-all duration-300">
              <GraduationCap className="w-6 h-6 text-emerald-400" />
            </div>
            <div>
              <p className="text-sm font-bold text-white">Student Demo</p>
              <p className="text-[10px] text-emerald-300/60 mt-0.5">Campus dashboard</p>
            </div>
          </button>
        </div>

        <p className="text-center text-[10px] text-slate-500 mt-4">
          No credentials needed — demo buttons bypass authentication.
        </p>
      </div>
    </div>
  );
}
