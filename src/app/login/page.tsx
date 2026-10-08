"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth-store";
import { Lock, User, AlertCircle, Loader2, ShieldCheck } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const { setAuth } = useAuthStore();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      setError("Please fill in both fields");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
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

  // Demo helper for instant testing
  const fillDemoCredentials = (u: string, p: string) => {
    setUsername(u);
    setPassword(p);
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center items-center p-4">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl p-8 space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-1">
          <div className="w-14 h-14 bg-emerald-600 rounded-2xl flex items-center justify-center font-black text-2xl text-white mx-auto shadow-md">
            AH
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight pt-2">
            Al-Afhhihram House
          </h1>
          <p className="text-xs text-slate-500 font-medium">
            POS & Retail Inventory Control System
          </p>
        </div>

        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Username / Email
            </label>
            <div className="relative">
              <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g. admin or cashier1"
                className="w-full pl-9 pr-3 py-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Password
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

        {/* Quick Demo Credentials Switcher */}
        <div className="pt-4 border-t border-slate-100 space-y-2">
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
              onClick={() => fillDemoCredentials("cashier1", "cashier123")}
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
