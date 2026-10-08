"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth-store";
import { usePosStore } from "@/store/pos-store";
import {
  ShoppingBag,
  Package,
  Users,
  Truck,
  FileText,
  BarChart3,
  Receipt,
  Wifi,
  WifiOff,
  RefreshCw,
  LogOut,
  Printer,
  Bell,
  BellRing,
  Clock,
  X,
  AlertTriangle,
} from "lucide-react";

export const Navbar: React.FC = () => {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const {
    isOnline,
    setIsOnline,
    offlineQueue,
    clearOfflineQueue,
    receiptWidth,
    setReceiptWidth,
  } = usePosStore();

  const [syncing, setSyncing] = useState(false);
  const [alertsOpen, setAlertsOpen] = useState(false);
  const [alertData, setAlertData] = useState<{
    totalAlertsCount: number;
    overdueSuppliers: any[];
    overdueCustomers: any[];
  }>({
    totalAlertsCount: 0,
    overdueSuppliers: [],
    overdueCustomers: [],
  });

  const fetchAlerts = async () => {
    if (!user) return;
    try {
      const res = await fetch("/api/alerts");
      const data = await res.json();
      if (data.success) {
        setAlertData({
          totalAlertsCount: data.totalAlertsCount,
          overdueSuppliers: data.overdueSuppliers || [],
          overdueCustomers: data.overdueCustomers || [],
        });
      }
    } catch (e) {
      // ignore
    }
  };

  useEffect(() => {
    if (user) {
      fetchAlerts();
      const interval = setInterval(fetchAlerts, 5000); // Polling every 5 seconds for live alerts
      return () => clearInterval(interval);
    }
  }, [user]);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    setIsOnline(navigator.onLine);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [setIsOnline]);

  const handleSyncOffline = async () => {
    if (offlineQueue.length === 0 || syncing) return;
    setSyncing(true);
    try {
      const res = await fetch("/api/pos/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transactions: offlineQueue }),
      });
      const data = await res.json();
      if (data.success) {
        clearOfflineQueue();
        alert(`Successfully synced ${data.totalProcessed} queued offline transactions!`);
      } else {
        alert(`Sync error: ${data.error}`);
      }
    } catch (e: any) {
      alert(`Sync failed: ${e.message}`);
    } finally {
      setSyncing(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch (e) {
      // ignore
    }
    logout();
    router.push("/login");
  };

  const isPosPage = pathname === "/pos";

  return (
    <header className="sticky top-0 z-40 w-full select-none border-b border-slate-800 bg-slate-950/95 backdrop-blur-md shadow-md">
      <div className="w-full px-3 sm:px-4 lg:px-6 flex h-14 items-center justify-between gap-2 lg:gap-4">
        {/* Brand / Logo */}
        <div className="flex items-center shrink-0">
          <Link href="/pos" className="group flex items-center space-x-2.5 transition">
            <div className="relative flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 font-black text-white shadow-sm ring-1 ring-emerald-400/30 group-hover:scale-105 transition-transform duration-150">
              <span className="text-xs sm:text-sm tracking-tighter">AH</span>
              <span className="absolute -bottom-0.5 -right-0.5 flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-xs sm:text-sm font-bold tracking-tight text-white group-hover:text-emerald-300 transition-colors leading-tight whitespace-nowrap">
                Al-Afhhihram House
              </span>
              <span className="text-[10px] font-medium text-emerald-400/90 tracking-normal hidden xl:block leading-none">
                Ihram & Islamic Clothing POS
              </span>
            </div>
          </Link>
        </div>

        {/* Navigation Links - Sleek, compact, perfectly proportioned, no wrapping */}
        <nav className="flex items-center space-x-1 sm:space-x-1.5 overflow-x-auto no-scrollbar py-0.5 max-w-full">
          <Link
            href="/pos"
            className={`group flex items-center space-x-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold tracking-normal transition-all whitespace-nowrap ${
              pathname === "/pos"
                ? "bg-emerald-600 text-white shadow-sm shadow-emerald-950/50 ring-1 ring-emerald-400/30"
                : "text-slate-300 hover:bg-slate-800/80 hover:text-white"
            }`}
          >
            <ShoppingBag className={`w-3.5 h-3.5 transition-transform group-hover:scale-110 shrink-0 ${pathname === "/pos" ? "text-white" : "text-emerald-400"}`} />
            <span>POS Register</span>
          </Link>

          <Link
            href="/inventory"
            className={`group flex items-center space-x-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold tracking-normal transition-all whitespace-nowrap ${
              pathname === "/inventory"
                ? "bg-emerald-600 text-white shadow-sm shadow-emerald-950/50 ring-1 ring-emerald-400/30"
                : "text-slate-300 hover:bg-slate-800/80 hover:text-white"
            }`}
          >
            <Package className={`w-3.5 h-3.5 transition-transform group-hover:scale-110 shrink-0 ${pathname === "/inventory" ? "text-white" : "text-emerald-400"}`} />
            <span>Inventory</span>
          </Link>

          <Link
            href="/customers"
            className={`group flex items-center space-x-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold tracking-normal transition-all whitespace-nowrap ${
              pathname === "/customers"
                ? "bg-emerald-600 text-white shadow-sm shadow-emerald-950/50 ring-1 ring-emerald-400/30"
                : "text-slate-300 hover:bg-slate-800/80 hover:text-white"
            }`}
          >
            <Users className={`w-3.5 h-3.5 transition-transform group-hover:scale-110 shrink-0 ${pathname === "/customers" ? "text-white" : "text-emerald-400"}`} />
            <span>Khata (گاہک)</span>
          </Link>

          <Link
            href="/suppliers"
            className={`group flex items-center space-x-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold tracking-normal transition-all whitespace-nowrap ${
              pathname === "/suppliers"
                ? "bg-emerald-600 text-white shadow-sm shadow-emerald-950/50 ring-1 ring-emerald-400/30"
                : "text-slate-300 hover:bg-slate-800/80 hover:text-white"
            }`}
          >
            <Truck className={`w-3.5 h-3.5 transition-transform group-hover:scale-110 shrink-0 ${pathname === "/suppliers" ? "text-white" : "text-emerald-400"}`} />
            <span>Suppliers (وینڈرز)</span>
          </Link>

          <Link
            href="/reports"
            className={`group flex items-center space-x-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold tracking-normal transition-all whitespace-nowrap ${
              pathname === "/reports"
                ? "bg-emerald-600 text-white shadow-sm shadow-emerald-950/50 ring-1 ring-emerald-400/30"
                : "text-slate-300 hover:bg-slate-800/80 hover:text-white"
            }`}
          >
            <FileText className={`w-3.5 h-3.5 transition-transform group-hover:scale-110 shrink-0 ${pathname === "/reports" ? "text-white" : "text-emerald-400"}`} />
            <span>Reports & Print</span>
          </Link>

          {user?.role !== "CASHIER" && (
            <>
              <Link
                href="/expenses"
                className={`group flex items-center space-x-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold tracking-normal transition-all whitespace-nowrap ${
                  pathname === "/expenses"
                    ? "bg-emerald-600 text-white shadow-sm shadow-emerald-950/50 ring-1 ring-emerald-400/30"
                    : "text-slate-300 hover:bg-slate-800/80 hover:text-white"
                }`}
              >
                <Receipt className={`w-3.5 h-3.5 transition-transform group-hover:scale-110 shrink-0 ${pathname === "/expenses" ? "text-white" : "text-emerald-400"}`} />
                <span>Expenses</span>
              </Link>

              <Link
                href="/dashboard"
                className={`group flex items-center space-x-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold tracking-normal transition-all whitespace-nowrap ${
                  pathname === "/dashboard"
                    ? "bg-emerald-600 text-white shadow-sm shadow-emerald-950/50 ring-1 ring-emerald-400/30"
                    : "text-slate-300 hover:bg-slate-800/80 hover:text-white"
                }`}
              >
                <BarChart3 className={`w-3.5 h-3.5 transition-transform group-hover:scale-110 shrink-0 ${pathname === "/dashboard" ? "text-white" : "text-emerald-400"}`} />
                <span>Dashboard</span>
              </Link>
            </>
          )}
        </nav>

        {/* Right Tools (Network, Printer Width, Sync, User) */}
        <div className="flex items-center space-x-1.5 sm:space-x-2 shrink-0">
          {isPosPage && (
            <div className="hidden 2xl:flex items-center bg-slate-900 border border-slate-800 rounded-lg p-0.5 text-xs text-slate-300 shadow-inner">
              <div className="flex items-center px-1.5 py-0.5 text-slate-400 font-medium text-[10px] gap-1">
                <Printer className="w-3 h-3 text-slate-400" />
                <span>Receipt:</span>
              </div>
              <button
                onClick={() => setReceiptWidth("80mm")}
                className={`px-1.5 py-0.5 rounded text-[10px] font-semibold transition-all ${
                  receiptWidth === "80mm"
                    ? "bg-emerald-600 text-white shadow-sm"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                80mm
              </button>
              <button
                onClick={() => setReceiptWidth("58mm")}
                className={`px-1.5 py-0.5 rounded text-[10px] font-semibold transition-all ${
                  receiptWidth === "58mm"
                    ? "bg-emerald-600 text-white shadow-sm"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                58mm
              </button>
            </div>
          )}

          {/* Network & Offline Queue Badge */}
          <div className="flex items-center space-x-1.5">
            {isOnline ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 text-[11px] font-semibold text-emerald-400 ring-1 ring-inset ring-emerald-500/20">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                <span className="hidden sm:inline">Online</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-2.5 py-1 text-[11px] font-semibold text-amber-400 ring-1 ring-inset ring-amber-500/30 animate-pulse">
                <WifiOff className="w-3 h-3 text-amber-400" />
                <span>Offline</span>
              </span>
            )}

            {offlineQueue.length > 0 && (
              <button
                onClick={handleSyncOffline}
                disabled={syncing || !isOnline}
                title="Click to sync offline transactions"
                className="flex items-center gap-1.5 text-[11px] bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-bold px-2.5 py-1 rounded-full shadow transition"
              >
                <RefreshCw className={`w-3 h-3 ${syncing ? "animate-spin" : ""}`} />
                <span>{offlineQueue.length} Queued</span>
              </button>
            )}
          </div>

          {/* Payment & Recovery Overdue Alerts Bell Notification */}
          <div className="relative">
            <button
              onClick={() => setAlertsOpen(!alertsOpen)}
              title="Payment Due Alerts (وینڈرز اور گاہکوں کے بقایا الرٹس)"
              className={`relative p-2 rounded-xl transition-all duration-150 ${
                alertData.totalAlertsCount > 0
                  ? "bg-rose-500/15 text-rose-300 hover:bg-rose-500/25 ring-1 ring-rose-500/30"
                  : "bg-slate-900 text-slate-300 hover:bg-slate-800 hover:text-white border border-slate-800"
              }`}
            >
              {alertData.totalAlertsCount > 0 ? (
                <BellRing className="w-4 h-4 text-rose-400 animate-bounce" />
              ) : (
                <Bell className="w-4 h-4 text-slate-400" />
              )}
              {alertData.totalAlertsCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-rose-600 text-white font-black text-[10px] w-4 h-4 rounded-full flex items-center justify-center ring-2 ring-slate-950">
                  {alertData.totalAlertsCount}
                </span>
              )}
            </button>

            {/* Alerts Dropdown Panel */}
            {alertsOpen && (
              <div className="absolute right-0 mt-2.5 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-slate-200 z-50 text-slate-800 overflow-hidden animate-in fade-in slide-in-from-top-2">
                <div className="p-3 bg-slate-900 text-white flex justify-between items-center border-b border-slate-800">
                  <div className="flex items-center space-x-2">
                    <AlertTriangle className="w-4 h-4 text-amber-400" />
                    <span className="font-bold text-xs sm:text-sm">
                      Due Date Alerts (ادائیگی اور وصولی یاد دہانی)
                    </span>
                  </div>
                  <button
                    onClick={() => setAlertsOpen(false)}
                    className="p-1 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="max-h-96 overflow-y-auto divide-y divide-slate-100 p-2 space-y-2">
                  {/* Overdue Suppliers Section */}
                  {alertData.overdueSuppliers.length > 0 && (
                    <div className="space-y-1.5">
                      <div className="px-2 py-1 text-[11px] font-black text-rose-800 bg-rose-50 rounded flex justify-between items-center">
                        <span>🔴 وینڈرز کو ادائیگی کرنی ہے (Pay Suppliers)</span>
                        <span className="bg-rose-200 px-1.5 py-0.2 rounded font-mono">
                          {alertData.overdueSuppliers.length}
                        </span>
                      </div>
                      {alertData.overdueSuppliers.map((sup: any) => (
                        <Link
                          key={sup.id}
                          href="/suppliers"
                          onClick={() => setAlertsOpen(false)}
                          className="block p-2 rounded-xl bg-slate-50 hover:bg-rose-50/60 border border-slate-100 transition"
                        >
                          <div className="flex justify-between items-start">
                            <div>
                              <div className="font-bold text-xs text-slate-900">{sup.name}</div>
                              <div className="text-[10px] text-slate-500">{sup.phone || sup.companyName}</div>
                            </div>
                            <div className="text-right">
                              <div className="font-black text-xs text-rose-600">
                                Rs. {sup.currentBalance.toFixed(2)}
                              </div>
                              <div className="text-[10px] text-rose-700 font-bold flex items-center justify-end">
                                <Clock className="w-2.5 h-2.5 mr-0.5" />
                                {sup.paymentDueDate
                                  ? `Due: ${new Date(sup.paymentDueDate).toLocaleDateString("en-PK")}`
                                  : "Due Now"}
                              </div>
                            </div>
                          </div>
                        </Link>
                      ))}
                    </div>
                  )}

                  {/* Overdue Customers Section */}
                  {alertData.overdueCustomers.length > 0 && (
                    <div className="space-y-1.5 pt-1">
                      <div className="px-2 py-1 text-[11px] font-black text-amber-900 bg-amber-50 rounded flex justify-between items-center">
                        <span>🟡 گاہکوں سے وصولی کرنی ہے (Collect Receivables)</span>
                        <span className="bg-amber-200 px-1.5 py-0.2 rounded font-mono">
                          {alertData.overdueCustomers.length}
                        </span>
                      </div>
                      {alertData.overdueCustomers.map((cust: any) => (
                        <Link
                          key={cust.id}
                          href="/customers"
                          onClick={() => setAlertsOpen(false)}
                          className="block p-2 rounded-xl bg-slate-50 hover:bg-amber-50/60 border border-slate-100 transition"
                        >
                          <div className="flex justify-between items-start">
                            <div>
                              <div className="font-bold text-xs text-slate-900">{cust.name}</div>
                              <div className="text-[10px] text-slate-500">{cust.phone || "No phone"}</div>
                            </div>
                            <div className="text-right">
                              <div className="font-black text-xs text-amber-800">
                                Rs. {cust.balance.toFixed(2)}
                              </div>
                              <div className="text-[10px] text-amber-800 font-bold flex items-center justify-end">
                                <Clock className="w-2.5 h-2.5 mr-0.5" />
                                {cust.paymentDueDate
                                  ? `Promise: ${new Date(cust.paymentDueDate).toLocaleDateString("en-PK")}`
                                  : "Due Now"}
                              </div>
                            </div>
                          </div>
                        </Link>
                      ))}
                    </div>
                  )}

                  {/* No Alerts */}
                  {alertData.totalAlertsCount === 0 && (
                    <div className="p-6 text-center text-slate-400 space-y-1">
                      <div className="text-emerald-600 font-bold text-xs">✓ No Overdue Payments!</div>
                      <p className="text-[11px] text-slate-500">
                        All supplier bills and customer khata promises are up to date.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* User profile pill */}
          {user ? (
            <div className="flex items-center gap-2 pl-2 border-l border-slate-800">
              <div className="hidden sm:flex flex-col items-end">
                <span className="text-xs font-semibold text-white tracking-tight leading-tight">
                  {user.fullName}
                </span>
                <span className="inline-block text-[10px] font-mono text-emerald-400 font-medium tracking-wider">
                  [{user.role}]
                </span>
              </div>
              <button
                onClick={handleLogout}
                title="Sign out"
                className="flex items-center justify-center p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 transition-all duration-150"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <Link
              href="/login"
              className="text-xs bg-emerald-600 hover:bg-emerald-500 text-white font-semibold px-3.5 py-1.5 rounded-lg shadow-sm transition"
            >
              Sign In
            </Link>
          )}
        </div>
      </div>
    </header>
  );
};
