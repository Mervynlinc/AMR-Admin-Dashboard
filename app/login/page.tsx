"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabase";
import { Microscope, BadgeCheck, KeyRound, Eye, EyeOff, ShieldCheck, Lock, Database, ArrowRight, AlertCircle } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [staffId, setStaffId] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({ staffId: "", password: "" });
  const [shake, setShake] = useState(false);
  const [adminCount, setAdminCount] = useState(0);
  const [mrsaPct, setMrsaPct] = useState("0");
  const [labCount, setLabCount] = useState(0);

  useEffect(() => {
    document.title = "GALRS — Login";
    fetchStats();
  }, []);

  const fetchStats = async () => {
    const { count: isolates } = await supabase
      .from('isolates')
      .select('*', { count: 'exact', head: true });
    
    const { count: mrsa } = await supabase
      .from('isolates')
      .select('*', { count: 'exact', head: true })
      .eq('is_mrsa', true);
    
    const { count: labs } = await supabase
      .from('labs')
      .select('*', { count: 'exact', head: true });

    setAdminCount(isolates || 0);
    const mrsaPctVal = isolates ? ((mrsa || 0) / isolates * 100).toFixed(0) : "0";
    setMrsaPct(mrsaPctVal);
    setLabCount(labs || 0);
  };

  const clearErrors = () => {
    setErrors({ staffId: "", password: "" });
  };

  const validate = () => {
    let valid = true;
    const newErrors = { staffId: "", password: "" };

    if (!staffId.trim()) {
      newErrors.staffId = "Staff ID is required.";
      valid = false;
    }
    if (!password) {
      newErrors.password = "Password is required.";
      valid = false;
    }

    setErrors(newErrors);
    return valid;
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    clearErrors();

    if (!validate()) return;

    setLoading(true);

    try {
      const { data, error } = await supabase
        .from('admin_users')
        .select('*')
        .eq('staff_id', staffId.trim())
        .eq('is_active', true)
        .single();

      if (error || !data) {
        triggerShake();
        setErrors({ staffId: "", password: "Invalid Staff ID or password. Please try again." });
        setLoading(false);
        return;
      }

      const { data: verifyData, error: verifyError } = await supabase.rpc('verify_admin_password', {
        p_staff_id: staffId.trim(),
        p_password: password
      });

      if (verifyError || !verifyData) {
        triggerShake();
        setErrors({ staffId: "", password: "Invalid Staff ID or password. Please try again." });
        setLoading(false);
        return;
      }

      const sessionData = {
        id: data.id,
        name: data.name,
        staff_id: data.staff_id,
        email: data.email,
        role: data.role
      };

      if (rememberMe) {
        localStorage.setItem("galrs_admin", JSON.stringify(sessionData));
      } else {
        sessionStorage.setItem("galrs_admin", JSON.stringify(sessionData));
      }

      // Set cookie for middleware auth check
      document.cookie = `galrs_session=${JSON.stringify(sessionData)}; path=/; max-age=${rememberMe ? 86400 * 30 : 86400}`;

      router.push("/");

    } catch (err) {
      console.error("Login error:", err);
      triggerShake();
      setErrors({ staffId: "", password: "An error occurred. Please try again." });
    } finally {
      setLoading(false);
    }
  };

  const triggerShake = () => {
    setShake(true);
    setTimeout(() => setShake(false), 400);
  };

  const togglePassword = () => {
    setShowPassword(!showPassword);
  };

  const toggleRemember = () => {
    setRememberMe(!rememberMe);
  };

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {/* LEFT PANEL - Branded */}
      <div className="hidden lg:flex lg:w-[52%] relative bg-[#022c22] overflow-hidden" style={{
        backgroundImage: `
          linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),
          linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)
        `,
        backgroundSize: '40px 40px'
      }}>
        {/* Floating orbs */}
        <div className="orb-1 absolute top-[10%] left-[15%] w-72 h-72 rounded-full bg-emerald-500/[0.07] blur-3xl" style={{ animation: 'float1 12s ease-in-out infinite' }}></div>
        <div className="orb-2 absolute bottom-[15%] right-[10%] w-96 h-96 rounded-full bg-teal-400/[0.05] blur-3xl" style={{ animation: 'float2 15s ease-in-out infinite' }}></div>
        <div className="orb-3 absolute top-[55%] left-[50%] w-48 h-48 rounded-full bg-emerald-300/[0.04] blur-2xl" style={{ animation: 'float3 10s ease-in-out infinite' }}></div>

        {/* Decorative vertical lines */}
        <div className="absolute left-[20%] top-0 bottom-0 w-px bg-white/[0.04]" style={{ animation: 'lineGrow 1.2s ease forwards', transformOrigin: 'top' }}></div>
        <div className="absolute left-[40%] top-0 bottom-0 w-px bg-white/[0.03]" style={{ animation: 'lineGrow 1.2s ease forwards 200ms', transformOrigin: 'top' }}></div>
        <div className="absolute left-[60%] top-0 bottom-0 w-px bg-white/[0.03]" style={{ animation: 'lineGrow 1.2s ease forwards 400ms', transformOrigin: 'top' }}></div>
        <div className="absolute left-[80%] top-0 bottom-0 w-px bg-white/[0.04]" style={{ animation: 'lineGrow 1.2s ease forwards 600ms', transformOrigin: 'top' }}></div>

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-between p-10 xl:p-14 w-full">
          {/* Top: Logo & branding */}
          <div className="fade-up">
            <div className="flex items-center gap-3.5 mb-2">
              <div className="w-11 h-11 rounded-xl bg-emerald-500/20 border border-emerald-400/20 flex items-center justify-center gentle-rotate" style={{ animation: 'gentleRotate 6s ease-in-out infinite' }}>
                <Microscope className="w-6 h-6 text-emerald-300" />
              </div>
              <div>
                <h1 className="text-xl font-extrabold text-white tracking-wide">AMR-Admin</h1>
                <p className="text-[10px] text-emerald-400/50 font-semibold tracking-[0.2em] uppercase">AMR Admin Surveillance</p>
              </div>
            </div>
          </div>

          {/* Middle: Hero text */}
          <div className="space-y-6 max-w-md">
            <div className="fade-up fade-up-d1">
              <h2 className="text-3xl xl:text-4xl font-extrabold text-white leading-tight tracking-tight">
                Antimicrobial Admin<br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-300 to-teal-200">Dashboard</span>
              </h2>
            </div>
            <p className="fade-up fade-up-d2 text-sm text-emerald-100/40 leading-relaxed max-w-sm">
              Manage your laboratory network, track and manage users , and generate comprehensive AMR surveillance reports.
            </p>
          </div>

          {/* Bottom: Compliance badges */}
          <div className="fade-up fade-up-d4">

          </div>
        </div>
      </div>

      {/* RIGHT PANEL - Login Form */}
      <div className="flex-1 flex items-center justify-center bg-white relative">
        {/* Subtle background texture */}
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, #000 1px, transparent 0)', backgroundSize: '24px 24px' }}></div>

        <div className="relative z-10 w-full max-w-sm mx-6">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-3 mb-10 fade-up">
            <div className="w-10 h-10 rounded-xl bg-[#064e3b] flex items-center justify-center">
              <Microscope className="w-5 h-5 text-emerald-300" />
            </div>
            <div>
              <h1 className="text-base font-extrabold text-gray-900 tracking-wide">GALRS</h1>
              <p className="text-[9px] text-gray-400 font-semibold tracking-[0.15em] uppercase">AMR Surveillance</p>
            </div>
          </div>

          {/* Welcome text */}
          <div className="mb-8 fade-up fade-up-d1">
            <h2 className="text-2xl font-extrabold text-gray-900 tracking-tight">Welcome back</h2>
            <p className="text-sm text-gray-500 mt-1.5">Sign in to your laboratory account</p>
          </div>

          {/* Login Form */}
          <form onSubmit={handleLogin} className="space-y-5">
            {/* Staff ID */}
            <div className="fade-up fade-up-d2">
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Staff ID</label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">
                  <BadgeCheck className="w-[18px] h-[18px]" />
                </span>
                <input
                  type="text"
                  autoComplete="username"
                  value={staffId}
                  onChange={(e) => setStaffId(e.target.value)}
                  className="input-glow w-full border border-gray-200 rounded-xl pl-11 pr-4 py-3 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-emerald-600 transition bg-gray-50/50"
                  
                />
              </div>
              {errors.staffId && (
                <p className="text-xs text-red-600 mt-1.5 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {errors.staffId}
                </p>
              )}
            </div>

            {/* Password */}
            <div className={`fade-up fade-up-d3 ${shake ? 'shake' : ''}`}>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-sm font-semibold text-gray-700">Password</label>
              </div>
              <div id="passwordWrapper" className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">
                  <KeyRound className="w-[18px] h-[18px]" />
                </span>
                <input
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input-glow w-full border border-gray-200 rounded-xl pl-11 pr-11 py-3 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-emerald-600 transition bg-gray-50/50"
                  placeholder="Enter your password"
                />
                <button type="button" onClick={togglePassword} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition">
                  {showPassword ? <EyeOff className="w-[18px] h-[18px]" /> : <Eye className="w-[18px] h-[18px]" />}
                </button>
              </div>
              {errors.password && (
                <p className="text-xs text-red-600 mt-1.5 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {errors.password}
                </p>
              )}
            </div>

            {/* Login button */}
            <div className="fade-up fade-up-d5 pt-1">
              <button
                type="submit"
                disabled={loading}
                className="btn-shimmer w-full bg-[#064e3b] hover:bg-[#022c22] text-white rounded-xl py-3.5 text-sm font-bold transition flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/15 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <span>{loading ? 'Authenticating...' : 'Sign In'}</span>
                {loading ? (
                  <svg className="spinner w-4 h-4" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="31.4" strokeDashoffset="10" strokeLinecap="round" />
                  </svg>
                ) : (
                  <ArrowRight className="w-4 h-4" />
                )}
              </button>
            </div>
          </form>


        </div>
      </div>

      <style jsx>{`
        @keyframes float1 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(30px, -20px) scale(1.05); }
          66% { transform: translate(-15px, 15px) scale(0.95); }
        }
        @keyframes float2 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(-25px, 25px) scale(0.97); }
          66% { transform: translate(20px, -10px) scale(1.03); }
        }
        @keyframes float3 {
          0%, 100% { transform: translate(0, 0); }
          50% { transform: translate(15px, -30px); }
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .fade-up { animation: fadeUp 600ms ease forwards; }
        .fade-up-d1 { animation-delay: 100ms; opacity: 0; }
        .fade-up-d2 { animation-delay: 200ms; opacity: 0; }
        .fade-up-d3 { animation-delay: 300ms; opacity: 0; }
        .fade-up-d4 { animation-delay: 400ms; opacity: 0; }
        .fade-up-d5 { animation-delay: 500ms; opacity: 0; }
        .input-glow:focus {
          box-shadow: 0 0 0 3px rgba(6, 78, 59, 0.12);
        }
        .btn-shimmer {
          position: relative;
          overflow: hidden;
        }
        .btn-shimmer::after {
          content: '';
          position: absolute;
          top: 0; left: -100%; width: 100%; height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.08), transparent);
          transition: left 500ms ease;
        }
        .btn-shimmer:hover::after {
          left: 100%;
        }
        @keyframes statPulse {
          0%, 100% { opacity: 0.6; }
          50% { opacity: 1; }
        }
        .stat-dot { animation: statPulse 2.5s ease-in-out infinite; }
        @keyframes gentleRotate {
          0%, 100% { transform: rotate(0deg); }
          25% { transform: rotate(2deg); }
          75% { transform: rotate(-2deg); }
        }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-6px); }
          40% { transform: translateX(6px); }
          60% { transform: translateX(-4px); }
          80% { transform: translateX(4px); }
        }
        .shake { animation: shake 400ms ease; }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        .spinner { animation: spin 700ms linear infinite; }
        @keyframes lineGrow {
          from { transform: scaleY(0); }
          to { transform: scaleY(1); }
        }
        .line-grow { animation: lineGrow 1.2s ease forwards; transform-origin: top; }
      `}</style>
    </div>
  );
}