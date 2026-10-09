"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth-store";
import { Lock, User, AlertCircle, Loader2, ShieldCheck, UserPlus, CheckCircle, Mail } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const { setAuth } = useAuthStore();

  const [activeTab, setActiveTab] = useState<"login" | "signup">("login");

  // Login form state
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  // Signup form state
  const [fullName, setFullName] = useState("");
  const [signupUsername, setSignupUsername] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupRole, setSignupRole] = useState<"CASHIER" | "MANAGER">("CASHIER");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      setError("Please fill in both fields");
      return;
    }

    setLoading(true);
    setError("");
    setSuccessMsg("");

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username.trim(), password }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Login failed");
      }

      setAuth(data.user, data.token);

      // Role-based redirect
      if (data.user.role === "CASHIER") {
        router.push("/pos");
      } else if (data.user.role === "MANAGER") {
        router.push("/inventory");
      } else {
        router.push("/dashboard");
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !signupUsername || !signupPassword) {
      setError("Please fill in all required fields (Name, Username, Password)");
      return;
    }

    setLoading(true);
    setError("");
    setSuccessMsg("");

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: fullName.trim(),
          username: signupUsername.trim(),
          email: signupEmail ? signupEmail.trim() : undefined,
          password: signupPassword,
          role: signupRole,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Signup failed");
      }

      setSuccessMsg("Account created successfully! Redirecting...");
      setAuth(data.user, data.token);

      setTimeout(() => {
        if (data.user.role === "CASHIER") {
          router.push("/pos");
        } else if (data.user.role === "MANAGER") {
          router.push("/inventory");
        } else {
          router.push("/dashboard");
        }
      }, 800);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Demo helper for instant testing
  const fillDemoCredentials = (u: string, p: string) => {
    setActiveTab("login");
    setUsername(u);
    setPassword(p);
    setError("");
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center items-center p-4">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl p-7 sm:p-8 space-y-5 border border-slate-100">
        {/* Brand Header */}
        <div className="text-center space-y-1">
          <div className="flex items-center justify-center mx-auto mb-2">
            <img
              src="/logo.png"
              alt="AL-AMAFHH IHRAM HOUSE"
              className="h-16 w-auto object-contain"
            />
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            AL-AMAFHH IHRAM HOUSE
          </h1>
          <p className="text-xs text-slate-500 font-medium">
            POS & Retail Inventory Control System (الافیہ احرام ہاؤس)
          </p>
        </div>

        {/* Tab Switcher: Login vs Signup */}
        <div className="grid grid-cols-2 p-1 bg-slate-100 rounded-2xl border border-slate-200">
          <button
            type="button"
            onClick={() => {
              setActiveTab("login");
              setError("");
              setSuccessMsg("");
            }}
            className={`py-2 text-xs font-bold rounded-xl transition ${
              activeTab === "login"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-900"
            }`}
          >
            Sign In (لاگ اِن)
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab("signup");
              setError("");
              setSuccessMsg("");
            }}
            className={`py-2 text-xs font-bold rounded-xl transition flex items-center justify-center space-x-1 ${
              activeTab === "signup"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-900"
            }`}
          >
            <UserPlus className="w-3.5 h-3.5 text-emerald-600" />
            <span>Create Account (نیا اکاؤنٹ)</span>
          </button>
        </div>

        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center space-x-2 font-semibold">
            <CheckCircle className="w-4 h-4 flex-shrink-0 text-emerald-600" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* ===================== TAB 1: LOGIN FORM ===================== */}
        {activeTab === "login" && (
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Username / Email (یوزرنیم)
              </label>
              <div className="relative">
                <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g. admin or cashier"
                  className="w-full pl-9 pr-3 py-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Password (پاس ورڈ)
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-3 py-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-sm transition shadow-lg shadow-emerald-700/20 flex items-center justify-center space-x-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Verifying credentials...</span>
                </>
              ) : (
                <span>Sign In to Terminal</span>
              )}
            </button>
          </form>
        )}

        {/* ===================== TAB 2: SIGNUP FORM ===================== */}
        {activeTab === "signup" && (
          <form onSubmit={handleSignup} className="space-y-3.5">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Full Name (پورا نام) *
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="e.g. Hashim Gaziani"
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Username (یوزرنیم لاگ اِن کے لیے) *
              </label>
              <div className="relative">
                <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={signupUsername}
                  onChange={(e) => setSignupUsername(e.target.value)}
                  placeholder="e.g. cashier2 or tariq"
                  className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Email Address (اختیاری)
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="email"
                  value={signupEmail}
                  onChange={(e) => setSignupEmail(e.target.value)}
                  placeholder="cashier@example.com"
                  className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Role / عہدہ
              </label>
              <select
                value={signupRole}
                onChange={(e) => setSignupRole(e.target.value as any)}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs sm:text-sm bg-slate-50 font-bold focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              >
                <option value="CASHIER">Cashier (کاؤنٹر کیشیئر - POS رسائی)</option>
                <option value="MANAGER">Manager (اسٹور منیجر - انوینٹری و اخراجات)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Password (پاس ورڈ) *
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="password"
                  value={signupPassword}
                  onChange={(e) => setSignupPassword(e.target.value)}
                  placeholder="At least 4 characters"
                  className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-sm transition shadow-lg shadow-emerald-700/20 flex items-center justify-center space-x-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Creating user...</span>
                </>
              ) : (
                <span>Register & Open Terminal</span>
              )}
            </button>
          </form>
        )}

        {/* Quick Demo Credentials Switcher */}
        <div className="pt-3 border-t border-slate-100 space-y-2">
          <div className="flex items-center space-x-1 text-slate-400 text-[11px] font-semibold justify-center">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Instant Demo Logins (Click to autofill):</span>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => fillDemoCredentials("admin", "admin123")}
              className="py-1.5 px-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-center transition"
            >
              <div className="text-[11px] font-bold text-slate-900">Admin</div>
              <div className="text-[9px] text-slate-500 font-mono">admin123</div>
            </button>

            <button
              type="button"
              onClick={() => fillDemoCredentials("manager", "manager123")}
              className="py-1.5 px-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-center transition"
            >
              <div className="text-[11px] font-bold text-slate-900">Manager</div>
              <div className="text-[9px] text-slate-500 font-mono">manager123</div>
            </button>

            <button
              type="button"
              onClick={() => fillDemoCredentials("cashier", "cashier123")}
              className="py-1.5 px-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-center transition"
            >
              <div className="text-[11px] font-bold text-slate-900">Cashier</div>
              <div className="text-[9px] text-slate-500 font-mono">cashier123</div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
