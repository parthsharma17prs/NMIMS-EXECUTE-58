import React, { useState } from "react";
import { Building2, ArrowRight, Eye, EyeOff, ArrowLeft } from "lucide-react";

export default function RegisterPage({ onGoToLogin, onBackToLanding }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("student");
  const [showPw, setShowPw] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = () => {
    if (!name || !email || !password) return;
    setSubmitted(true);
    // Demo — just show success, no real registration yet
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-black relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 right-1/4 w-[700px] h-[400px] rounded-full bg-emerald-500/[0.03] blur-[120px]" />
        <div className="absolute bottom-0 left-1/4 w-[600px] h-[400px] rounded-full bg-sky-500/[0.03] blur-[100px]" />
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
            Create Account
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Join the net-zero movement
          </p>
        </div>

        {/* Form Card */}
        <div className="glass-card p-8 mb-6">
          {submitted ? (
            <div className="text-center py-6">
              <div className="w-14 h-14 rounded-full bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center mx-auto mb-4">
                <svg className="w-7 h-7 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-white mb-1">Account Created!</h3>
              <p className="text-sm text-slate-500 mb-6">
                This is a demo — no real account was created.
              </p>
              <button
                onClick={onGoToLogin}
                className="text-sm text-sky-400 hover:text-sky-300 font-medium flex items-center gap-1 mx-auto transition-colors"
              >
                <ArrowLeft className="w-4 h-4" /> Go to Login
              </button>
            </div>
          ) : (
            <>
              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Jayesh Sharma"
                    className="w-full h-11 px-4 rounded-xl bg-white/[0.04] border border-white/[0.08] text-sm text-white placeholder-slate-600 focus:border-sky-500/40 focus:outline-none focus:ring-1 focus:ring-sky-500/20 transition-all"
                  />
                </div>
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
                <div>
                  <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">
                    Role
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {["student", "admin"].map((r) => (
                      <button
                        key={r}
                        onClick={() => setRole(r)}
                        className={`h-10 rounded-xl text-sm font-medium transition-all duration-200 border ${
                          role === r
                            ? "bg-sky-500/20 border-sky-400/30 text-sky-300"
                            : "bg-white/[0.02] border-white/[0.06] text-slate-500 hover:border-white/[0.12] hover:text-slate-300"
                        }`}
                      >
                        {r === "student" ? "Student" : "Admin"}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <button
                onClick={handleSubmit}
                className="w-full h-11 rounded-xl bg-emerald-500/20 border border-emerald-400/25 text-sm font-semibold text-emerald-300 hover:bg-emerald-500/30 transition-all duration-200 flex items-center justify-center gap-2"
              >
                Create Account <ArrowRight className="w-4 h-4" />
              </button>
            </>
          )}

          {!submitted && (
            <p className="text-center text-xs text-slate-600 mt-4">
              Already have an account?{" "}
              <button
                onClick={onGoToLogin}
                className="text-sky-400 hover:text-sky-300 transition-colors font-medium"
              >
                Sign In
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
