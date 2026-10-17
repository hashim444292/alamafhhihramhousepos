"use client";

import React, { useState, useEffect } from "react";
import {
  TrendingUp,
  DollarSign,
  ShoppingBag,
  Receipt,
  CreditCard,
  Calendar,
  Filter,
  Eye,
  ArrowUpRight,
  ArrowDownRight,
  BellRing,
  Clock,
  Truck,
  Users,
  CheckCircle,
  AlertTriangle,
  Scale,
  ShieldAlert,
  X,
  Package,
  Landmark,
  Banknote,
  Send,
} from "lucide-react";
import Link from "next/link";
import { ThermalReceipt } from "@/components/pos/ThermalReceipt";
import { formatCurrency, formatNumber } from "@/lib/format-utils";
import { useAuthStore } from "@/store/auth-store";

export default function DashboardPage() {
  const { user } = useAuthStore();
  const [metrics, setMetrics] = useState<any | null>(null);
  const [salesList, setSalesList] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<any | null>(null);
  const [pendingHandovers, setPendingHandovers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [paymentFilter, setPaymentFilter] = useState("ALL");
  const [selectedInvoice, setSelectedInvoice] = useState<any | null>(null);

  // Cashier Handover Verification State (Manager)
  const [verifyingHandoverShift, setVerifyingHandoverShift] = useState<any | null>(null);
  const [verifiedAmount, setVerifiedAmount] = useState<number | string>("");
  const [managerHandoverNotes, setManagerHandoverNotes] = useState("");
  const [handoverSubmitting, setHandoverSubmitting] = useState(false);

  // Manager-to-Owner Remittance State
  const [remittanceData, setRemittanceData] = useState<{
    remittances: any[];
    balance: any;
    admins: any[];
  } | null>(null);
  const [remittanceModalOpen, setRemittanceModalOpen] = useState(false);
  const [remittanceAmount, setRemittanceAmount] = useState("");
  const [remittanceMethod, setRemittanceMethod] = useState("CASH");
  const [remittanceOwnerId, setRemittanceOwnerId] = useState("");
  const [remittanceOwnerName, setRemittanceOwnerName] = useState("");
  const [remittanceNotes, setRemittanceNotes] = useState("");
  const [remittanceSubmitting, setRemittanceSubmitting] = useState(false);
  const [confirmingRemittanceId, setConfirmingRemittanceId] = useState<string | null>(null);

  // Shortage Settlement State
  const [selectedShortageShift, setSelectedShortageShift] = useState<any | null>(null);
  const [shortageSettlementType, setShortageSettlementType] = useState<"RECOVERED_FROM_CASHIER" | "ABSORBED_BY_STORE">("RECOVERED_FROM_CASHIER");
  const [shortageNotes, setShortageNotes] = useState("");
  const [shortageSubmitting, setShortageSubmitting] = useState(false);

  // Inventory Loss Settlement State
  const [selectedLossMovement, setSelectedLossMovement] = useState<any | null>(null);
  const [lossSettlementType, setLossSettlementType] = useState<"RECOVERED_FROM_STAFF" | "ABSORBED_BY_STORE">("RECOVERED_FROM_STAFF");
  const [lossNotes, setLossNotes] = useState("");
  const [lossSubmitting, setLossSubmitting] = useState(false);

  // Settlement Register active tab
  const [settlementRegisterTab, setSettlementRegisterTab] = useState<"SHORTAGES" | "LOSSES" | "REMITTANCES">("SHORTAGES");

  const fetchPendingHandovers = async () => {
    // Cashier handover approval queue is strictly for Store Managers (NOT Admin/Owner)
    if (user?.role !== "MANAGER") {
      setPendingHandovers([]);
      return;
    }
    try {
      const res = await fetch("/api/pos/shifts/handover");
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.pendingHandovers) {
          setPendingHandovers(data.pendingHandovers);
        }
      }
    } catch (e) {
      // safe fallback
    }
  };

  const fetchRemittances = async () => {
    try {
      const res = await fetch("/api/remittances");
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setRemittanceData({
            remittances: data.remittances || [],
            balance: data.balance || {
              currentCashInHand: 0,
              totalCashRemitted: 0,
              pendingRemittancesAmount: 0,
              pendingRemittancesCount: 0,
              totalCashCollected: 0,
              totalCashExpenses: 0,
            },
            admins: data.admins || [],
          });
          if (data.admins && data.admins.length > 0 && !remittanceOwnerId) {
            setRemittanceOwnerId(data.admins[0].id);
            setRemittanceOwnerName(data.admins[0].fullName || data.admins[0].username);
          }
        }
      }
    } catch (e) {
      // non-admin/manager or network
    }
  };

  const handleVerifyAndAcceptHandover = async (action: "ACCEPT" | "REJECT") => {
    if (!verifyingHandoverShift) return;
    setHandoverSubmitting(true);
    try {
      const recAmt = action === "ACCEPT" ? parseFloat(String(verifiedAmount)) || 0 : undefined;
      const res = await fetch("/api/pos/shifts/handover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shiftId: verifyingHandoverShift.id,
          action,
          receivedAmount: recAmt,
          notes: managerHandoverNotes,
        }),
      });
      const data = await res.json();
      if (data.success) {
        alert(data.message || "کیش ہینڈ اوور کی تصدیق اور منظوری مکمل ہو گئی ہے۔");
        setVerifyingHandoverShift(null);
        fetchPendingHandovers();
        fetchRemittances();
        const dashRes = await fetch("/api/reports/dashboard");
        const dashData = await dashRes.json();
        if (dashData.success) setMetrics(dashData.metrics);
      } else {
        alert(data.error);
      }
    } catch (e: any) {
      alert(`Error: ${e.message}`);
    } finally {
      setHandoverSubmitting(false);
    }
  };

  const handleSubmitRemittance = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(remittanceAmount);
    if (!amt || amt <= 0) {
      alert("براہ کرم درست رقم درج کریں۔ (Please enter a valid amount)");
      return;
    }
    setRemittanceSubmitting(true);
    try {
      const res = await fetch("/api/remittances", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: amt,
          paymentMethod: remittanceMethod,
          ownerId: remittanceOwnerId || undefined,
          ownerName: remittanceOwnerName || undefined,
          notes: remittanceNotes,
        }),
      });
      const data = await res.json();
      if (data.success) {
        alert("مالک / ایڈمن کو رقم کی ادائیگی کامیابی سے ریکارڈ ہو گئی ہے۔ (Remittance recorded successfully)");
        setRemittanceModalOpen(false);
        setRemittanceAmount("");
        setRemittanceNotes("");
        fetchRemittances();
        const dashRes = await fetch("/api/reports/dashboard");
        const dashData = await dashRes.json();
        if (dashData.success) setMetrics(dashData.metrics);
      } else {
        alert(data.error);
      }
    } catch (e: any) {
      alert(`Error: ${e.message}`);
    } finally {
      setRemittanceSubmitting(false);
    }
  };

  const handleConfirmRemittance = async (remittanceId: string) => {
    if (!confirm("کیا آپ تصدیق کرتے ہیں کہ مینیجر سے یہ رقم وصول پا لی گئی ہے؟ (Confirm receipt of this remittance?)")) return;
    setConfirmingRemittanceId(remittanceId);
    try {
      const res = await fetch(`/api/remittances/${remittanceId}/confirm`, {
        method: "POST",
      });
      const data = await res.json();
      if (data.success) {
        alert("مالک کی جانب سے رقم وصولی کی تصدیق مکمل ہو گئی ہے۔ (Remittance confirmed by owner)");
        fetchRemittances();
      } else {
        alert(data.error);
      }
    } catch (e: any) {
      alert(`Error: ${e.message}`);
    } finally {
      setConfirmingRemittanceId(null);
    }
  };

  const handleSettleShortage = async () => {
    if (!selectedShortageShift) return;
    setShortageSubmitting(true);
    try {
      const res = await fetch("/api/pos/shifts/settle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shiftId: selectedShortageShift.id,
          settlementType: shortageSettlementType,
          notes: shortageNotes,
        }),
      });
      const data = await res.json();
      if (data.success) {
        alert("دراز کیش شارٹیج کا تصفیہ کامیابی سے محفوظ ہو گیا ہے۔ (Shortage settled successfully)");
        setSelectedShortageShift(null);
        setShortageNotes("");
        // Refetch dashboard
        const dashRes = await fetch("/api/reports/dashboard");
        const dashData = await dashRes.json();
        if (dashData.success) setMetrics(dashData.metrics);
      } else {
        alert(data.error);
      }
    } catch (e: any) {
      alert(`Error: ${e.message}`);
    } finally {
      setShortageSubmitting(false);
    }
  };

  const handleSettleLoss = async () => {
    if (!selectedLossMovement) return;
    setLossSubmitting(true);
    try {
      const res = await fetch("/api/inventory/stock-movements/settle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          movementId: selectedLossMovement.id,
          settlementType: lossSettlementType,
          notes: lossNotes,
        }),
      });
      const data = await res.json();
      if (data.success) {
        alert("ٹوٹ پھوٹ / چوری کے نقصان کا تصفیہ کامیابی سے محفوظ ہو گیا ہے۔ (Inventory loss settled successfully)");
        setSelectedLossMovement(null);
        setLossNotes("");
        // Refetch dashboard
        const dashRes = await fetch("/api/reports/dashboard");
        const dashData = await dashRes.json();
        if (dashData.success) setMetrics(dashData.metrics);
      } else {
        alert(data.error);
      }
    } catch (e: any) {
      alert(`Error: ${e.message}`);
    } finally {
      setLossSubmitting(false);
    }
  };

  useEffect(() => {
    async function fetchDashboard() {
      setLoading(true);
      try {
        const [dashRes, salesRes, alertRes] = await Promise.all([
          fetch("/api/reports/dashboard"),
          fetch("/api/reports/sales?limit=25"),
          fetch("/api/alerts"),
        ]);

        const dashData = await dashRes.json();
        const salesData = await salesRes.json();
        const alertData = await alertRes.json();

        if (dashData.success) {
          setMetrics(dashData.metrics);
        }
        if (salesData.success) {
          setSalesList(salesData.transactions);
        }
        if (alertData.success) {
          setAlerts(alertData);
        }
      } catch (e) {
        console.error("Dashboard fetch error:", e);
      } finally {
        setLoading(false);
      }
    }
    fetchDashboard();
    fetchPendingHandovers();
    fetchRemittances();
  }, []);

  useEffect(() => {
    fetchPendingHandovers();
  }, [user?.role]);

  const filteredSales = salesList.filter((s) => {
    if (paymentFilter === "ALL") return true;
    return s.paymentMethod === paymentFilter;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      {/* Dashboard Header */}
      <div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center space-x-2">
          <TrendingUp className="w-7 h-7 text-emerald-600" />
          <span>Financial & Executive Dashboard</span>
        </h1>
        <p className="text-xs sm:text-sm text-slate-500">
          Real-time retail turnover, COGS audit, operating expenses, and net margins
        </p>
      </div>

      {/* Manager Cash Handover Acceptance Queue Widget - Strictly for Store Manager (NOT Admin/Owner) */}
      {user?.role === "MANAGER" && pendingHandovers.length > 0 && (
        <div className="bg-amber-50 border-2 border-amber-400 rounded-2xl p-4 sm:p-5 shadow-sm space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-amber-200 pb-3">
            <div className="flex items-center space-x-2.5">
              <span className="p-2 bg-amber-500 text-slate-950 rounded-xl font-black text-sm">
                💰 {pendingHandovers.length}
              </span>
              <div>
                <h3 className="font-black text-base text-amber-950">
                  کیش ہینڈ اوور کی منظوری برائے مینیجر (Pending Cash Handover Approvals)
                </h3>
                <p className="text-xs text-amber-800">
                  کیشیئرز کی کلوزنگ کی رقم دراز سے وصول کر کے منظوری دیں تاکہ وہ اگلی شفٹ شروع کر سکیں۔
                </p>
              </div>
            </div>
            <span className="text-[11px] font-bold bg-amber-200/80 text-amber-900 px-2.5 py-1 rounded-full shrink-0">
              {pendingHandovers.length} رجسٹر تصدیق کے منتظر
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {pendingHandovers.map((sh: any) => (
              <div
                key={sh.id}
                className="bg-white rounded-xl border border-amber-200 p-3.5 shadow-xs flex flex-col justify-between space-y-2.5"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-xs font-bold text-slate-900 block">
                      کیشیئر: {sh.cashier?.fullName || sh.cashier?.username}
                    </span>
                    <span className="text-[10px] text-slate-500">
                      Shift #{sh.shiftNumber || "1"} · {sh.closedAt ? new Date(sh.closedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "Recently"}
                    </span>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 bg-amber-100 text-amber-800 rounded border border-amber-300">
                    PENDING
                  </span>
                </div>

                <div className="bg-amber-50/50 p-2.5 rounded-lg border border-amber-100 flex justify-between items-center">
                  <span className="text-xs text-amber-900 font-semibold">ہینڈ اوور رقم:</span>
                  <span className="text-base font-black text-amber-900">
                    {formatCurrency(sh.handover?.handoverAmount ?? sh.closingCash ?? 0)}
                  </span>
                </div>

                {sh.handover?.cashierNotes && (
                  <p className="text-[11px] text-slate-600 italic">
                    نوٹ: "{sh.handover.cashierNotes}"
                  </p>
                )}

                <button
                  onClick={() => {
                    setVerifyingHandoverShift(sh);
                    setVerifiedAmount(sh.handover?.handoverAmount ?? sh.closingCash ?? 0);
                    setManagerHandoverNotes("");
                  }}
                  className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg text-xs transition shadow-xs flex items-center justify-center space-x-1.5 cursor-pointer"
                >
                  <CheckCircle className="w-3.5 h-3.5" />
                  <span>کیش گن کر تصدیق و وصول کریں (Verify & Accept)</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pending Cash Shortage & Inventory Loss Settlements Alert Widget */}
      {metrics && (metrics.shortageMetrics?.unsettledCount > 0 || metrics.inventoryLossMetrics?.unsettledCount > 0) && (
        <div className="bg-rose-50 border-2 border-rose-400 rounded-2xl p-4 sm:p-5 shadow-sm space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-rose-200 pb-3">
            <div className="flex items-center space-x-2.5">
              <span className="p-2 bg-rose-600 text-white rounded-xl font-black text-sm flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-white" />
              </span>
              <div>
                <h3 className="font-black text-base text-rose-950">
                  تصفیہ طلب شارٹیج و نقصان الرٹ (Pending Shortage & Loss Settlements)
                </h3>
                <p className="text-xs text-rose-800">
                  کیشیئر دراز میں مس پلیس شدہ رقم اور ٹوٹ پھوٹ / چوری کا تصفیہ کریں تاکہ دکان کا کھاتہ اور منافع شفاف رہے۔
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {metrics.shortageMetrics?.unsettledCount > 0 && (
                <span className="text-[11px] font-bold bg-rose-200 text-rose-900 px-2.5 py-1 rounded-full shrink-0">
                  {metrics.shortageMetrics.unsettledCount} کیش شارٹیج (Rs. {formatNumber(metrics.shortageMetrics.totalUnsettledAmount)})
                </span>
              )}
              {metrics.inventoryLossMetrics?.unsettledCount > 0 && (
                <span className="text-[11px] font-bold bg-amber-200 text-amber-900 px-2.5 py-1 rounded-full shrink-0">
                  {metrics.inventoryLossMetrics.unsettledCount} انوینٹری نقصان (Rs. {formatNumber(metrics.inventoryLossMetrics.totalUnsettledValue)})
                </span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Unsettled Shortages */}
            {metrics.shortageMetrics?.shortages?.filter((s: any) => !s.isSettled).map((sh: any) => (
              <div
                key={`alert-shortage-${sh.id}`}
                className="bg-white rounded-xl border border-rose-200 p-3.5 shadow-xs flex flex-col justify-between space-y-2.5"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-xs font-bold text-slate-900 block">
                      کیشیئر: {sh.cashierName} (Shift #{sh.shiftNumber || "1"})
                    </span>
                    <span className="text-[10px] text-slate-500">
                      کلوزنگ: {sh.closedAt ? new Date(sh.closedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "Recently"}
                    </span>
                  </div>
                  <span className="text-[10px] font-black px-2 py-0.5 bg-rose-100 text-rose-800 rounded border border-rose-300">
                    کیش کم ہے (SHORTAGE)
                  </span>
                </div>

                <div className="bg-rose-50/60 p-2.5 rounded-lg border border-rose-200 flex justify-between items-center">
                  <div>
                    <span className="text-xs text-rose-900 font-semibold block">دراز میں کمی (Shortage):</span>
                    <span className="text-[10px] text-slate-500">
                      متوقع: {formatCurrency(sh.systemExpectedCash)} · گنا گیا: {formatCurrency(sh.closingCash)}
                    </span>
                  </div>
                  <span className="text-base font-black text-rose-700">
                    -{formatCurrency(sh.shortageAmount)}
                  </span>
                </div>

                {sh.cashierNotes && (
                  <p className="text-[11px] text-slate-600 italic">
                    کیشیئر نوٹ: "{sh.cashierNotes}"
                  </p>
                )}

                <button
                  onClick={() => {
                    setSelectedShortageShift(sh);
                    setShortageSettlementType("RECOVERED_FROM_CASHIER");
                    setShortageNotes(`کیشیئر ${sh.cashierName} سے دراز کی شارٹیج کا تصفیہ`);
                  }}
                  className="w-full py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-lg text-xs transition shadow-xs flex items-center justify-center space-x-1"
                >
                  <Scale className="w-3.5 h-3.5" />
                  <span>تصفیہ کریں (Settle Shortage)</span>
                </button>
              </div>
            ))}

            {/* Unsettled Losses */}
            {metrics.inventoryLossMetrics?.losses?.filter((l: any) => !l.isSettled).map((loss: any) => (
              <div
                key={`alert-loss-${loss.id}`}
                className="bg-white rounded-xl border border-amber-300 p-3.5 shadow-xs flex flex-col justify-between space-y-2.5"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-xs font-bold text-slate-900 block">
                      {loss.productName}
                    </span>
                    <span className="text-[10px] text-slate-500">
                      SKU: {loss.productSku} · رپورٹ کنندہ: {loss.performedBy}
                    </span>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                    loss.movementType === "STOCK_OUT_DAMAGE"
                      ? "bg-rose-100 text-rose-800 border-rose-300"
                      : "bg-amber-100 text-amber-900 border-amber-300"
                  }`}>
                    {loss.movementType === "STOCK_OUT_DAMAGE" ? "ٹوٹ پھوٹ (Damage)" : "چوری (Stolen)"}
                  </span>
                </div>

                <div className="bg-amber-50/60 p-2.5 rounded-lg border border-amber-200 flex justify-between items-center">
                  <div>
                    <span className="text-xs text-amber-900 font-semibold block">ضائع شدہ تعداد: {loss.quantity}</span>
                    <span className="text-[10px] text-slate-500">قیمت خرید: {formatCurrency(loss.unitCost)} فی آئٹم</span>
                  </div>
                  <span className="text-base font-black text-rose-700">
                    {formatCurrency(loss.totalLossValue)}
                  </span>
                </div>

                {loss.reason && (
                  <p className="text-[11px] text-slate-600 italic">
                    وجہ: "{loss.reason}"
                  </p>
                )}

                <button
                  onClick={() => {
                    setSelectedLossMovement(loss);
                    setLossSettlementType("RECOVERED_FROM_STAFF");
                    setLossNotes(`شاپ مینیجر / اسٹاف کے ذمے ٹوٹ پھوٹ و نقصان کا تصفیہ`);
                  }}
                  className="w-full py-2 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-lg text-xs transition shadow-xs flex items-center justify-center space-x-1"
                >
                  <ShieldAlert className="w-3.5 h-3.5" />
                  <span>نقصان کا تصفیہ کریں (Settle Loss)</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Real-time KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        {/* Today's Revenue */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold">Today's Sales</span>
            <div className="p-2 bg-emerald-50 text-emerald-700 rounded-lg">
              <ShoppingBag className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-xl sm:text-2xl font-black text-slate-900">
              {metrics ? formatNumber(metrics.today.revenue) : "0"}
              <span className="text-xs text-slate-400 font-bold ml-1">Rs.</span>
            </div>
            <div className="text-[11px] text-emerald-700 font-semibold mt-1">
              {metrics ? `${metrics.today.transactionCount} Orders Today` : "0 Orders"}
            </div>
          </div>
        </div>

        {/* COGS */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold">COGS (Purchase Cost)</span>
            <div className="p-2 bg-blue-50 text-blue-700 rounded-lg">
              <Receipt className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-xl sm:text-2xl font-black text-slate-900">
              {metrics ? formatNumber(metrics.today.cogs) : "0"}
              <span className="text-xs text-slate-400 font-bold ml-1">Rs.</span>
            </div>
            <div className="text-[11px] text-slate-500 mt-1">Direct product inventory cost</div>
          </div>
        </div>

        {/* Gross Margin */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold">Gross Profit</span>
            <div className="p-2 bg-indigo-50 text-indigo-700 rounded-lg">
              <ArrowUpRight className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-xl sm:text-2xl font-black text-indigo-700">
              {metrics ? formatNumber(metrics.today.grossProfit) : "0"}
              <span className="text-xs text-indigo-400 font-bold ml-1">Rs.</span>
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              {metrics && metrics.today.revenue > 0
                ? `${((metrics.today.grossProfit / metrics.today.revenue) * 100).toFixed(1)}% Gross Margin`
                : "Margin"}
            </div>
          </div>
        </div>

        {/* Daily Expenses */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold">Daily Expenses</span>
            <div className="p-2 bg-rose-50 text-rose-700 rounded-lg">
              <ArrowDownRight className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-xl sm:text-2xl font-black text-rose-600">
              {metrics ? formatNumber(metrics.today.expenses) : "0"}
              <span className="text-xs text-rose-400 font-bold ml-1">Rs.</span>
            </div>
            <div className="text-[11px] text-slate-500 mt-1">Packaging, rent & utilities</div>
          </div>
        </div>

        {/* Net Profit */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold">Net Store Profit</span>
            <div className="p-2 bg-emerald-100 text-emerald-800 rounded-lg">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div
              className={`text-xl sm:text-2xl font-black ${
                metrics && metrics.today.netProfit >= 0 ? "text-emerald-700" : "text-rose-600"
              }`}
            >
              {metrics ? formatNumber(metrics.today.netProfit) : "0"}
              <span className="text-xs text-slate-400 font-bold ml-1">Rs.</span>
            </div>
            <div className="text-[11px] text-emerald-700 font-semibold mt-1">
              Final Bottom Line
            </div>
          </div>
        </div>
      </div>

      {/* Payment Method Breakdown Cards */}
      {metrics?.today.paymentBreakdown && (
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
          <h3 className="font-bold text-sm text-slate-900 flex items-center space-x-2">
            <CreditCard className="w-4 h-4 text-emerald-600" />
            <span>Today's Payment Channels Breakdown</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-xs text-slate-500 font-medium">Physical Cash Drawer (کیش)</span>
              <div className="text-lg font-bold text-slate-900 mt-1">
                {formatCurrency(metrics.today.paymentBreakdown.CASH)}
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-xs text-slate-500 font-medium">Card / Bank Terminal</span>
              <div className="text-lg font-bold text-slate-900 mt-1">
                {formatCurrency(metrics.today.paymentBreakdown.CARD)}
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-xs text-slate-500 font-medium">Easypaisa & JazzCash</span>
              <div className="text-lg font-bold text-slate-900 mt-1">
                {formatCurrency(metrics.today.paymentBreakdown.MOBILE_WALLET)}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Store Manager Cash Custody & Remittance to Owner Section */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-5 sm:p-6 rounded-2xl shadow-md border border-indigo-900/60 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-indigo-800/60 pb-4">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-indigo-600 rounded-xl text-white shadow-inner">
              <Landmark className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-black text-lg text-white tracking-tight flex items-center space-x-2">
                <span>اسٹور مینیجر نقد کیش و مالک کو ادائیگی</span>
                <span className="text-[11px] font-semibold bg-indigo-700/80 text-indigo-100 px-2 py-0.5 rounded-full">
                  Manager Cash & Owner Remittances
                </span>
              </h3>
              <p className="text-xs text-indigo-200 mt-0.5">
                درازوں سے وصول شدہ کل نقدی، دکان کے پیٹی اخراجات، اور مالک کو منتقل کردہ کیش کا شفاف آڈٹ
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              setRemittanceAmount("");
              setRemittanceNotes("");
              setRemittanceModalOpen(true);
            }}
            className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-xl text-xs sm:text-sm transition shadow-md flex items-center justify-center space-x-2 shrink-0 cursor-pointer"
          >
            <Banknote className="w-4 h-4 text-slate-950" />
            <span>مالک / ایڈمن کو رقم دیں (Transfer Cash to Owner)</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="bg-white/10 backdrop-blur-xs p-3.5 rounded-xl border border-white/10">
            <span className="text-xs text-indigo-200 font-medium block">
              مینیجر کے پاس نقد رقم (Cash in Hand)
            </span>
            <div className="text-xl sm:text-2xl font-black text-emerald-400 mt-1">
              Rs. {formatNumber(remittanceData?.balance?.currentCashInHand || 0)}
            </div>
            <span className="text-[10px] text-indigo-300 mt-1 block">
              شاپ دراز سے وصول منہا اخراجات و ادائیگیاں
            </span>
          </div>

          <div className="bg-white/10 backdrop-blur-xs p-3.5 rounded-xl border border-white/10">
            <span className="text-xs text-indigo-200 font-medium block">
              مالک کو ادا شدہ کل رقم (Total to Owner)
            </span>
            <div className="text-xl sm:text-2xl font-black text-white mt-1">
              Rs. {formatNumber(remittanceData?.balance?.totalCashRemitted || 0)}
            </div>
            <span className="text-[10px] text-indigo-300 mt-1 block">
              {remittanceData?.balance?.totalRemittancesCount || 0} ادائیگیاں تصدیق شدہ
            </span>
          </div>

          <div className="bg-white/10 backdrop-blur-xs p-3.5 rounded-xl border border-white/10">
            <span className="text-xs text-indigo-200 font-medium block">
              منتظر تصدیق (Pending Owner Confirm)
            </span>
            <div className={`text-xl sm:text-2xl font-black mt-1 ${
              (remittanceData?.balance?.pendingRemittancesAmount || 0) > 0 ? "text-amber-400" : "text-slate-300"
            }`}>
              Rs. {formatNumber(remittanceData?.balance?.pendingRemittancesAmount || 0)}
            </div>
            <span className="text-[10px] text-indigo-300 mt-1 block">
              {remittanceData?.balance?.pendingRemittancesCount || 0} واؤچرز مالک کی منظوری کے منتظر
            </span>
          </div>

          <div className="bg-white/10 backdrop-blur-xs p-3.5 rounded-xl border border-white/10">
            <span className="text-xs text-indigo-200 font-medium block">
              دکان کے نقد اخراجات (Cash Expenses)
            </span>
            <div className="text-xl sm:text-2xl font-black text-rose-300 mt-1">
              Rs. {formatNumber(remittanceData?.balance?.totalCashExpenses || 0)}
            </div>
            <span className="text-[10px] text-indigo-300 mt-1 block">
              روزمرہ شاپ پیٹی کیش اخراجات
            </span>
          </div>
        </div>
      </div>

      {/* Due Date & Overdue Reminders Notification Center (وینڈرز کو ادائیگی اور گاہکوں سے وصولی) */}
      {alerts && (alerts.overdueSuppliers.length > 0 || alerts.overdueCustomers.length > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Overdue Supplier Payables */}
          <div className="bg-rose-50/70 border border-rose-200 rounded-2xl p-4 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 text-rose-900 font-bold text-sm">
                <Truck className="w-5 h-5 text-rose-600" />
                <span>وینڈرز کو واجب الادا بلز (Supplier Bills Overdue)</span>
              </div>
              <Link
                href="/suppliers"
                className="text-xs font-bold text-rose-700 hover:underline"
              >
                Go to Suppliers →
              </Link>
            </div>

            <div className="space-y-2 max-h-56 overflow-y-auto">
              {alerts.overdueSuppliers.length === 0 ? (
                <div className="text-xs text-emerald-700 bg-emerald-50 p-2.5 rounded-lg border border-emerald-200">
                  ✓ تمام وینڈرز کے بلز کلیئر ہیں۔ No overdue supplier payments.
                </div>
              ) : (
                alerts.overdueSuppliers.map((s: any) => (
                  <div
                    key={s.id}
                    className="flex justify-between items-center p-2.5 bg-white rounded-xl border border-rose-100 shadow-xs"
                  >
                    <div>
                      <div className="font-bold text-xs text-slate-900">{s.name}</div>
                      <div className="text-[11px] text-slate-500">{s.phone || s.companyName}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-black text-sm text-rose-600">
                        {formatCurrency(s.currentBalance)}
                      </div>
                      <div className="text-[10px] text-rose-700 font-bold flex items-center justify-end">
                        <Clock className="w-3 h-3 mr-0.5" />
                        {s.paymentDueDate
                          ? `Due: ${new Date(s.paymentDueDate).toLocaleDateString("en-PK")}`
                          : "Immediate"}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Overdue Customer Receivables */}
          <div className="bg-amber-50/70 border border-amber-200 rounded-2xl p-4 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 text-amber-950 font-bold text-sm">
                <Users className="w-5 h-5 text-amber-600" />
                <span>گاہکوں سے ادھار وصولی (Customer Khata Due)</span>
              </div>
              <Link
                href="/customers"
                className="text-xs font-bold text-amber-800 hover:underline"
              >
                Go to Customers →
              </Link>
            </div>

            <div className="space-y-2 max-h-56 overflow-y-auto">
              {alerts.overdueCustomers.length === 0 ? (
                <div className="text-xs text-emerald-700 bg-emerald-50 p-2.5 rounded-lg border border-emerald-200">
                  ✓ تمام گاہکوں کے وعدے اپ ڈیٹ ہیں۔ No overdue customer receivables.
                </div>
              ) : (
                alerts.overdueCustomers.map((c: any) => (
                  <div
                    key={c.id}
                    className="flex justify-between items-center p-2.5 bg-white rounded-xl border border-amber-100 shadow-xs"
                  >
                    <div>
                      <div className="font-bold text-xs text-slate-900">{c.name}</div>
                      <div className="text-[11px] text-slate-500">{c.phone || "No phone"}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-black text-sm text-amber-800">
                        {formatCurrency(c.balance)}
                      </div>
                      <div className="text-[10px] text-amber-800 font-bold flex items-center justify-end">
                        <Clock className="w-3 h-3 mr-0.5" />
                        {c.paymentDueDate
                          ? `Promise: ${new Date(c.paymentDueDate).toLocaleDateString("en-PK")}`
                          : "Immediate"}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Loss & Damages Quick Audit Card */}
          <div className="bg-rose-50/70 border border-rose-200 rounded-2xl p-4 shadow-sm space-y-2 col-span-1 md:col-span-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 text-rose-950 font-bold text-sm">
                <AlertTriangle className="w-5 h-5 text-rose-600" />
                <span>ٹوٹ پھوٹ و چوری شدہ مال کا آڈٹ (Broken & Stolen Items Audit)</span>
              </div>
              <Link
                href="/reports?tab=damages"
                className="text-xs font-bold text-rose-800 hover:text-rose-950 hover:underline flex items-center space-x-1"
              >
                <span>مکمل نقصان رپورٹ دیکھیں (View Loss Report) →</span>
              </Link>
            </div>
            <p className="text-xs text-rose-800/80">
              دکان میں کیشئیرز اور عملے کی جانب سے رپورٹ کردہ تمام ٹوٹی ہوئی اشیاء اور چوری شدہ مال کی تعداد اور مالی نقصان یہاں سے مانیٹر اور تصدیق کریں۔
            </p>
          </div>
        </div>
      )}

      {/* Filterable Sales Transaction Reports */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden space-y-4 p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <h3 className="font-bold text-base text-slate-900">Sales Transactions Audit</h3>
            <p className="text-xs text-slate-500">
              Invoices generated from counter terminal & mobile POS
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <Filter className="w-4 h-4 text-slate-400" />
            <select
              value={paymentFilter}
              onChange={(e) => setPaymentFilter(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700"
            >
              <option value="ALL">All Payment Types</option>
              <option value="CASH">Cash</option>
              <option value="CARD">Card / Mada</option>
              <option value="MOBILE_WALLET">Mobile Wallet</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm min-w-[600px]">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b">
              <tr>
                <th className="py-3 px-4">Invoice #</th>
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4">Cashier</th>
                <th className="py-3 px-4">Payment</th>
                <th className="py-3 px-4 text-right">Items</th>
                <th className="py-3 px-4 text-right">Total</th>
                <th className="py-3 px-4 text-center">Receipt</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    Loading transactions...
                  </td>
                </tr>
              ) : filteredSales.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    No transactions found for the selected filter.
                  </td>
                </tr>
              ) : (
                filteredSales.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50 transition">
                    <td className="py-3 px-4 font-mono font-bold text-slate-900">
                      {s.invoiceNumber}
                    </td>
                    <td className="py-3 px-4 text-slate-500">
                      {new Date(s.createdAt).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-slate-700">
                      {s.customerName || "Walk-in Customer"}
                    </td>
                    <td className="py-3 px-4 text-slate-700">{s.cashier?.fullName}</td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-800">
                        {s.paymentMethod}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right text-slate-600">{s.items?.length || 0}</td>
                    <td className="py-3 px-4 text-right font-black text-emerald-700">
                      {formatCurrency(s.totalAmount)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => setSelectedInvoice(s)}
                        className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Audit & Settlements Register (کیش شارٹیج و انوینٹری نقصان رجسٹر) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden space-y-4 p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <h3 className="font-bold text-base text-slate-900 flex items-center space-x-2">
              <Scale className="w-5 h-5 text-indigo-600" />
              <span>Audit & Settlements Register (شارٹیج و نقصان کا تصفیہ رجسٹر)</span>
            </h3>
            <p className="text-xs text-slate-500">
              دراز میں کم کیش اور اشیاء کی ٹوٹ پھوٹ و چوری کے تصفیے کا شفاف آڈٹ ریکارڈ
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setSettlementRegisterTab("SHORTAGES")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 ${
                settlementRegisterTab === "SHORTAGES"
                  ? "bg-rose-600 text-white shadow-xs"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              <span>💰 دراز کیش شارٹیج</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                settlementRegisterTab === "SHORTAGES" ? "bg-white/20 text-white" : "bg-slate-200 text-slate-800"
              }`}>
                {metrics?.shortageMetrics?.shortages?.length || 0}
              </span>
            </button>

            <button
              onClick={() => setSettlementRegisterTab("LOSSES")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 ${
                settlementRegisterTab === "LOSSES"
                  ? "bg-amber-600 text-white shadow-xs"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              <span>📦 ٹوٹ پھوٹ و چوری</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                settlementRegisterTab === "LOSSES" ? "bg-white/20 text-white" : "bg-slate-200 text-slate-800"
              }`}>
                {metrics?.inventoryLossMetrics?.losses?.length || 0}
              </span>
            </button>

            <button
              onClick={() => setSettlementRegisterTab("REMITTANCES")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 ${
                settlementRegisterTab === "REMITTANCES"
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              <span>💵 مینیجر تا اونر کیش لیجر</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                settlementRegisterTab === "REMITTANCES" ? "bg-white/20 text-white" : "bg-slate-200 text-slate-800"
              }`}>
                {remittanceData?.remittances?.length || 0}
              </span>
            </button>
          </div>
        </div>

        {settlementRegisterTab === "SHORTAGES" ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm min-w-[700px]">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b">
                <tr>
                  <th className="py-3 px-4">Shift / کلوزنگ وقت</th>
                  <th className="py-3 px-4">کیشیئر</th>
                  <th className="py-3 px-4 text-right">متوقع کیش</th>
                  <th className="py-3 px-4 text-right">گنا گیا کیش</th>
                  <th className="py-3 px-4 text-right">شارٹیج (کمی)</th>
                  <th className="py-3 px-4 text-center">تصفیہ کی صورتحال (Status)</th>
                  <th className="py-3 px-4">تصفیہ کی تفصیل / نوٹ</th>
                  <th className="py-3 px-4 text-center">ایکشن</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {!metrics?.shortageMetrics?.shortages || metrics.shortageMetrics.shortages.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-400">
                      کوئی کیش شارٹیج ریکارڈ موجود نہیں ہے۔ دراز کا حساب 100% برابر ہے۔
                    </td>
                  </tr>
                ) : (
                  metrics.shortageMetrics.shortages.map((sh: any) => (
                    <tr key={`reg-shortage-${sh.id}`} className="hover:bg-slate-50/70">
                      <td className="py-3 px-4 font-bold text-slate-800">
                        <div>Shift #{sh.shiftNumber || "1"}</div>
                        <div className="text-[10px] text-slate-400 font-normal">
                          {sh.closedAt ? new Date(sh.closedAt).toLocaleString() : "-"}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-slate-800 font-semibold">{sh.cashierName}</td>
                      <td className="py-3 px-4 text-right text-slate-600">
                        {formatCurrency(sh.systemExpectedCash)}
                      </td>
                      <td className="py-3 px-4 text-right text-slate-800 font-semibold">
                        {formatCurrency(sh.closingCash)}
                      </td>
                      <td className="py-3 px-4 text-right font-black text-rose-600">
                        -{formatCurrency(sh.shortageAmount)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {sh.isSettled ? (
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              sh.settlementType === "RECOVERED_FROM_CASHIER"
                                ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                                : "bg-slate-100 text-slate-800 border border-slate-300"
                            }`}
                          >
                            {sh.settlementType === "RECOVERED_FROM_CASHIER"
                              ? "✅ کیشیئر نے ادا کیا"
                              : "🏢 دکان کا نقصان"}
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-100 text-rose-800 border border-rose-300 animate-pulse">
                            ⚠️ غیر تصفیہ شدہ
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-xs text-slate-600 max-w-xs">
                        {sh.isSettled ? (
                          <div>
                            <span className="font-semibold text-slate-800">
                              تصفیہ کنندہ: {sh.settledBy || "Manager"}
                            </span>
                            {sh.settlementNotes && (
                              <div className="text-[11px] text-slate-500 italic mt-0.5">
                                "{sh.settlementNotes}"
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400 text-xs italic">تصفیہ کا منتظر</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {!sh.isSettled ? (
                          <button
                            onClick={() => {
                              setSelectedShortageShift(sh);
                              setShortageSettlementType("RECOVERED_FROM_CASHIER");
                              setShortageNotes(`کیشیئر ${sh.cashierName} سے دراز شارٹیج کا تصفیہ`);
                            }}
                            className="px-2.5 py-1 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-lg text-xs transition shadow-xs flex items-center space-x-1 mx-auto"
                          >
                            <Scale className="w-3 h-3" />
                            <span>تصفیہ</span>
                          </button>
                        ) : (
                          <button
                            onClick={() => {
                              setSelectedShortageShift(sh);
                              setShortageSettlementType(sh.settlementType || "RECOVERED_FROM_CASHIER");
                              setShortageNotes(sh.settlementNotes || "");
                            }}
                            className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-lg text-xs transition mx-auto"
                          >
                            تبدیل / دیکھئے
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        ) : settlementRegisterTab === "LOSSES" ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm min-w-[700px]">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b">
                <tr>
                  <th className="py-3 px-4">پروڈکٹ / SKU</th>
                  <th className="py-3 px-4 text-center">قسم</th>
                  <th className="py-3 px-4 text-right">مقدار</th>
                  <th className="py-3 px-4 text-right">نقصان کی مالیت</th>
                  <th className="py-3 px-4">رپورٹ کنندہ</th>
                  <th className="py-3 px-4 text-center">تصفیہ کی صورتحال (Status)</th>
                  <th className="py-3 px-4">تصفیہ کی تفصیل / نوٹ</th>
                  <th className="py-3 px-4 text-center">ایکشن</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {!metrics?.inventoryLossMetrics?.losses || metrics.inventoryLossMetrics.losses.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-400">
                      کوئی ٹوٹ پھوٹ یا چوری کا ریکارڈ موجود نہیں ہے۔ انوینٹری 100% محفوظ ہے۔
                    </td>
                  </tr>
                ) : (
                  metrics.inventoryLossMetrics.losses.map((loss: any) => (
                    <tr key={`reg-loss-${loss.id}`} className="hover:bg-slate-50/70">
                      <td className="py-3 px-4 font-bold text-slate-900">
                        <div>{loss.productName}</div>
                        <div className="text-[10px] text-slate-400 font-normal">
                          SKU: {loss.productSku}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            loss.movementType === "STOCK_OUT_DAMAGE"
                              ? "bg-rose-100 text-rose-800 border border-rose-300"
                              : "bg-amber-100 text-amber-900 border border-amber-300"
                          }`}
                        >
                          {loss.movementType === "STOCK_OUT_DAMAGE" ? "🔨 ٹوٹ پھوٹ" : "🕵️ چوری"}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right text-rose-600 font-black">
                        -{loss.quantity} pcs
                      </td>
                      <td className="py-3 px-4 text-right font-black text-rose-700">
                        {formatCurrency(loss.totalLossValue)}
                      </td>
                      <td className="py-3 px-4 text-slate-700 text-xs">
                        <div>{loss.performedBy}</div>
                        <div className="text-[10px] text-slate-400">
                          {loss.reportedAt ? new Date(loss.reportedAt).toLocaleDateString() : "-"}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-center">
                        {loss.isSettled ? (
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              loss.settlementType === "RECOVERED_FROM_STAFF"
                                ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                                : "bg-slate-100 text-slate-800 border border-slate-300"
                            }`}
                          >
                            {loss.settlementType === "RECOVERED_FROM_STAFF"
                              ? "✅ مینیجر / عملے نے ادا کیا"
                              : "🏢 دکان کا نقصان"}
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-100 text-rose-800 border border-rose-300 animate-pulse">
                            ⚠️ غیر تصفیہ شدہ
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-xs text-slate-600 max-w-xs">
                        {loss.isSettled ? (
                          <div>
                            <span className="font-semibold text-slate-800">
                              تصفیہ کنندہ: {loss.settledBy || "Manager"}
                            </span>
                            {loss.settlementNotes && (
                              <div className="text-[11px] text-slate-500 italic mt-0.5">
                                "{loss.settlementNotes}"
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="text-slate-500 text-xs italic">
                            {loss.reason || "تصفیہ کا منتظر"}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {!loss.isSettled ? (
                          <button
                            onClick={() => {
                              setSelectedLossMovement(loss);
                              setLossSettlementType("RECOVERED_FROM_STAFF");
                              setLossNotes(`شاپ مینیجر / عملے سے ٹوٹ پھوٹ و نقصان کا تصفیہ`);
                            }}
                            className="px-2.5 py-1 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-lg text-xs transition shadow-xs flex items-center space-x-1 mx-auto"
                          >
                            <ShieldAlert className="w-3 h-3" />
                            <span>تصفیہ</span>
                          </button>
                        ) : (
                          <button
                            onClick={() => {
                              setSelectedLossMovement(loss);
                              setLossSettlementType(loss.settlementType || "RECOVERED_FROM_STAFF");
                              setLossNotes(loss.settlementNotes || "");
                            }}
                            className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-lg text-xs transition mx-auto"
                          >
                            تبدیل / دیکھئے
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm min-w-[750px]">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b">
                <tr>
                  <th className="py-3 px-4">واؤچر # / تاریخ</th>
                  <th className="py-3 px-4">ادا کنندہ (مینیجر)</th>
                  <th className="py-3 px-4">وصول کنندہ (مالک / ایڈمن)</th>
                  <th className="py-3 px-4">طریقہ کار (Method)</th>
                  <th className="py-3 px-4 text-right">رقم (Amount)</th>
                  <th className="py-3 px-4 text-center">صورتحال (Status)</th>
                  <th className="py-3 px-4">نوٹ / مقصد</th>
                  <th className="py-3 px-4 text-center">ایکشن</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {!remittanceData?.remittances || remittanceData.remittances.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-400">
                      ابھی تک مالک / ایڈمن کو کوئی کیش ادائیگی واؤچر درج نہیں ہوا ہے۔
                    </td>
                  </tr>
                ) : (
                  remittanceData.remittances.map((rem: any) => (
                    <tr key={rem.id} className="hover:bg-slate-50/70">
                      <td className="py-3 px-4 font-bold text-slate-900">
                        <div>{rem.remittanceNumber}</div>
                        <div className="text-[10px] text-slate-400 font-normal">
                          {rem.remittedAt ? new Date(rem.remittedAt).toLocaleString() : "-"}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-slate-800 font-semibold">
                        {rem.managerName || "Store Manager"}
                      </td>
                      <td className="py-3 px-4 text-slate-800">
                        {rem.ownerName || "Owner / Admin"}
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-slate-100 text-slate-800">
                          {rem.paymentMethod === "CASH" ? "💵 نقد کیش" : rem.paymentMethod === "BANK_TRANSFER" ? "🏦 بینک" : rem.paymentMethod}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-black text-emerald-700 text-sm">
                        {formatCurrency(rem.amount)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {rem.status === "CONFIRMED" ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                            ✅ وصول شدہ (Confirmed)
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-900 border border-amber-300 animate-pulse">
                            ⏳ منتظر تصدیق
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-xs text-slate-600 max-w-xs">
                        {rem.notes || "-"}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {rem.status === "PENDING" && (user?.role === "ADMIN" || user?.role === "MANAGER") ? (
                          <button
                            disabled={confirmingRemittanceId === rem.id}
                            onClick={() => handleConfirmRemittance(rem.id)}
                            className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg text-xs transition shadow-xs flex items-center space-x-1 mx-auto cursor-pointer"
                          >
                            <CheckCircle className="w-3.5 h-3.5" />
                            <span>{confirmingRemittanceId === rem.id ? "تصدیق ہو رہی ہے..." : "وصول پایا"}</span>
                          </button>
                        ) : (
                          <span className="text-[11px] text-slate-400">
                            {rem.confirmedAt ? new Date(rem.confirmedAt).toLocaleDateString() : "محفوظ"}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Cash Shortage Settlement Modal */}
      {selectedShortageShift && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full p-5 sm:p-6 shadow-2xl border border-slate-200 my-auto max-h-[calc(100vh-2rem)] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 shrink-0">
              <div className="flex items-center space-x-2">
                <div className="p-2 bg-rose-50 text-rose-600 rounded-xl">
                  <Scale className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-base text-slate-900">
                    دراز کیش شارٹیج کا تصفیہ (Settle Cash Shortage)
                  </h3>
                  <p className="text-xs text-slate-500">
                    کیشیئر: {selectedShortageShift.cashierName} · Shift #{selectedShortageShift.shiftNumber || "1"}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedShortageShift(null)}
                className="p-1.5 hover:bg-slate-100 text-slate-400 hover:text-slate-700 rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="py-4 space-y-4 flex-1 min-h-0 overflow-y-auto">
              <div className="bg-rose-50 border border-rose-200 rounded-xl p-3.5 space-y-2">
                <div className="flex justify-between items-center text-xs text-rose-900 font-semibold">
                  <span>شارٹیج کی کل رقم (Total Misplaced Shortage):</span>
                  <span className="text-lg font-black text-rose-700">
                    -{formatCurrency(selectedShortageShift.shortageAmount)}
                  </span>
                </div>
                <div className="text-[11px] text-slate-600 flex justify-between border-t border-rose-100 pt-2">
                  <span>سسٹم متوقع رقم: {formatCurrency(selectedShortageShift.systemExpectedCash)}</span>
                  <span>کیشیئر کی گنی ہوئی رقم: {formatCurrency(selectedShortageShift.closingCash)}</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-2">
                  تصفیہ کا فیصلہ منتخب کریں (Select Settlement Option):
                </label>
                <div className="space-y-2.5">
                  <label
                    onClick={() => setShortageSettlementType("RECOVERED_FROM_CASHIER")}
                    className={`flex items-start space-x-3 p-3 rounded-xl border-2 cursor-pointer transition ${
                      shortageSettlementType === "RECOVERED_FROM_CASHIER"
                        ? "border-emerald-500 bg-emerald-50/50"
                        : "border-slate-200 hover:border-slate-300 bg-white"
                    }`}
                  >
                    <input
                      type="radio"
                      name="shortageType"
                      checked={shortageSettlementType === "RECOVERED_FROM_CASHIER"}
                      onChange={() => setShortageSettlementType("RECOVERED_FROM_CASHIER")}
                      className="mt-0.5 text-emerald-600 focus:ring-emerald-500"
                    />
                    <div className="text-xs">
                      <span className="font-bold text-slate-900 block">
                        ✅ کیشیئر سے وصولی / تنخواہ سے کٹوتی (Recovered from Cashier)
                      </span>
                      <p className="text-[11px] text-slate-600 mt-0.5">
                        کیشیئر کی غلطی ہے، کیشیئر نے رقم واپس جمع کرا دی ہے یا تنخواہ سے کٹوتی کر لی جائے گی۔ دکان کا کوئی نقصان نہیں ہوگا۔
                      </p>
                    </div>
                  </label>

                  <label
                    onClick={() => setShortageSettlementType("ABSORBED_BY_STORE")}
                    className={`flex items-start space-x-3 p-3 rounded-xl border-2 cursor-pointer transition ${
                      shortageSettlementType === "ABSORBED_BY_STORE"
                        ? "border-rose-500 bg-rose-50/50"
                        : "border-slate-200 hover:border-slate-300 bg-white"
                    }`}
                  >
                    <input
                      type="radio"
                      name="shortageType"
                      checked={shortageSettlementType === "ABSORBED_BY_STORE"}
                      onChange={() => setShortageSettlementType("ABSORBED_BY_STORE")}
                      className="mt-0.5 text-rose-600 focus:ring-rose-500"
                    />
                    <div className="text-xs">
                      <span className="font-bold text-slate-900 block">
                        🏢 دکان / مالک کا نقصان (Store Loss / Absorbed by Shop Owner)
                      </span>
                      <p className="text-[11px] text-slate-600 mt-0.5">
                        دکان / مالک نے اس کمی کو کاروبار کے آپریشنل نقصان کے طور پر تسلیم کر کے دراز کا کھاتہ کلوز اور کلیئر کر دیا۔
                      </p>
                    </div>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  تصفیہ نوٹ / ریمارکس (Audit Notes):
                </label>
                <textarea
                  rows={2}
                  value={shortageNotes}
                  onChange={(e) => setShortageNotes(e.target.value)}
                  placeholder="مثلاً: کیشیئر نے نقد واپس جمع کرا دیے یا تنخواہ سے ایڈجسٹ ہو گئے..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-end space-x-2 shrink-0">
              <button
                type="button"
                onClick={() => setSelectedShortageShift(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition"
              >
                منسوخ (Cancel)
              </button>
              <button
                type="button"
                disabled={shortageSubmitting}
                onClick={handleSettleShortage}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition shadow-sm flex items-center space-x-1.5"
              >
                {shortageSubmitting ? (
                  <span>محفوظ ہو رہا ہے...</span>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    <span>تصفیہ محفوظ کریں (Confirm Settlement)</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Inventory Loss Settlement Modal */}
      {selectedLossMovement && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full p-5 sm:p-6 shadow-2xl border border-slate-200 my-auto max-h-[calc(100vh-2rem)] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 shrink-0">
              <div className="flex items-center space-x-2">
                <div className="p-2 bg-amber-50 text-amber-700 rounded-xl">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-base text-slate-900">
                    ٹوٹ پھوٹ و چوری کے نقصان کا تصفیہ (Settle Inventory Loss)
                  </h3>
                  <p className="text-xs text-slate-500">
                    پروڈکٹ: {selectedLossMovement.productName} ({selectedLossMovement.productSku})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedLossMovement(null)}
                className="p-1.5 hover:bg-slate-100 text-slate-400 hover:text-slate-700 rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="py-4 space-y-4 flex-1 min-h-0 overflow-y-auto">
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 space-y-2">
                <div className="flex justify-between items-center text-xs text-amber-950 font-semibold">
                  <span>نقصان کی کل مالیت (Total Loss Value):</span>
                  <span className="text-lg font-black text-rose-700">
                    {formatCurrency(selectedLossMovement.totalLossValue)}
                  </span>
                </div>
                <div className="text-[11px] text-slate-600 flex justify-between border-t border-amber-100 pt-2">
                  <span>ضائع شدہ مقدار: {selectedLossMovement.quantity} آئٹمز</span>
                  <span>رپورٹ کنندہ: {selectedLossMovement.performedBy}</span>
                </div>
                {selectedLossMovement.reason && (
                  <div className="text-[11px] text-slate-700 italic bg-white/70 p-2 rounded border border-amber-100">
                    وجہ: "{selectedLossMovement.reason}"
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-2">
                  تصفیہ کا فیصلہ منتخب کریں (Select Settlement Option):
                </label>
                <div className="space-y-2.5">
                  <label
                    onClick={() => setLossSettlementType("RECOVERED_FROM_STAFF")}
                    className={`flex items-start space-x-3 p-3 rounded-xl border-2 cursor-pointer transition ${
                      lossSettlementType === "RECOVERED_FROM_STAFF"
                        ? "border-emerald-500 bg-emerald-50/50"
                        : "border-slate-200 hover:border-slate-300 bg-white"
                    }`}
                  >
                    <input
                      type="radio"
                      name="lossType"
                      checked={lossSettlementType === "RECOVERED_FROM_STAFF"}
                      onChange={() => setLossSettlementType("RECOVERED_FROM_STAFF")}
                      className="mt-0.5 text-emerald-600 focus:ring-emerald-500"
                    />
                    <div className="text-xs">
                      <span className="font-bold text-slate-900 block">
                        🛡️ شاپ مینیجر / عملے سے وصولی (Recovered from Shop Manager / Staff)
                      </span>
                      <p className="text-[11px] text-slate-600 mt-0.5">
                        شاپ مینیجر دکان کے اسٹاک اور تحفظ کا ذمہ دار ہے۔ نقصان کی رقم مینیجر یا متعلقہ عملے سے وصول یا تنخواہ سے ایڈجسٹ کر لی جائے گی۔
                      </p>
                    </div>
                  </label>

                  <label
                    onClick={() => setLossSettlementType("ABSORBED_BY_STORE")}
                    className={`flex items-start space-x-3 p-3 rounded-xl border-2 cursor-pointer transition ${
                      lossSettlementType === "ABSORBED_BY_STORE"
                        ? "border-rose-500 bg-rose-50/50"
                        : "border-slate-200 hover:border-slate-300 bg-white"
                    }`}
                  >
                    <input
                      type="radio"
                      name="lossType"
                      checked={lossSettlementType === "ABSORBED_BY_STORE"}
                      onChange={() => setLossSettlementType("ABSORBED_BY_STORE")}
                      className="mt-0.5 text-rose-600 focus:ring-rose-500"
                    />
                    <div className="text-xs">
                      <span className="font-bold text-slate-900 block">
                        🏢 دکان / مالک کا نقصان (Business Loss Written Off)
                      </span>
                      <p className="text-[11px] text-slate-600 mt-0.5">
                        ناگزیر ٹوٹ پھوٹ یا چوری کو دکان نے کاروباری نقصان (Damage Write-Off) کے طور پر تسلیم کر کے اسٹاک کا بیلنس کلیئر کر دیا۔
                      </p>
                    </div>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  تصفیہ نوٹ / ریمارکس (Audit Notes):
                </label>
                <textarea
                  rows={2}
                  value={lossNotes}
                  onChange={(e) => setLossNotes(e.target.value)}
                  placeholder="مثلاً: مینیجر نے نقصان کی رقم کلیئر کروا دی یا ناگزیر ٹوٹ پھوٹ تسلیم کی گئی..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-end space-x-2 shrink-0">
              <button
                type="button"
                onClick={() => setSelectedLossMovement(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition"
              >
                منسوخ (Cancel)
              </button>
              <button
                type="button"
                disabled={lossSubmitting}
                onClick={handleSettleLoss}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition shadow-sm flex items-center space-x-1.5"
              >
                {lossSubmitting ? (
                  <span>محفوظ ہو رہا ہے...</span>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    <span>تصفیہ محفوظ کریں (Confirm Settlement)</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cashier Handover Verification Modal (Store Manager) */}
      {verifyingHandoverShift && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full p-5 sm:p-6 shadow-2xl border border-slate-200 my-auto max-h-[calc(100vh-2rem)] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 shrink-0">
              <div className="flex items-center space-x-2">
                <div className="p-2 bg-amber-50 text-amber-600 rounded-xl">
                  <CheckCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-base text-slate-900">
                    کیش ہینڈ اوور کی تصدیق برائے مینیجر
                  </h3>
                  <p className="text-xs text-slate-500">
                    کیشیئر: {verifyingHandoverShift.cashier?.fullName || verifyingHandoverShift.cashier?.username} · Shift #{verifyingHandoverShift.shiftNumber || "1"}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setVerifyingHandoverShift(null)}
                className="p-1.5 hover:bg-slate-100 text-slate-400 hover:text-slate-700 rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="py-4 space-y-4 flex-1 min-h-0 overflow-y-auto">
              {/* Declared Handover Amount */}
              <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-3.5 space-y-1">
                <div className="flex justify-between items-center text-xs text-amber-950 font-semibold">
                  <span>کیشیئر کی اعلان کردہ رقم (Cashier Handover Amount):</span>
                  <span className="text-lg font-black text-amber-900">
                    {formatCurrency(verifyingHandoverShift.handover?.handoverAmount ?? verifyingHandoverShift.closingCash ?? 0)}
                  </span>
                </div>
                {verifyingHandoverShift.handover?.cashierNotes && (
                  <p className="text-[11px] text-slate-600 italic border-t border-amber-100 pt-1">
                    کیشیئر نوٹ: "{verifyingHandoverShift.handover.cashierNotes}"
                  </p>
                )}
              </div>

              {/* Actual Counted Amount */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  مینیجر نے گن کر کتنا کیش وصول کیا؟ (Actual Cash Counted by Manager):
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={verifiedAmount}
                    onChange={(e) => setVerifiedAmount(e.target.value)}
                    className="w-full px-3 py-2.5 bg-white border-2 border-emerald-500 rounded-xl font-black text-slate-900 text-base focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setVerifiedAmount(verifyingHandoverShift.handover?.handoverAmount ?? verifyingHandoverShift.closingCash ?? 0)}
                    className="absolute right-2 top-2 px-2.5 py-1 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 font-bold rounded-lg text-xs transition"
                  >
                    پورا کیش (Exact)
                  </button>
                </div>
              </div>

              {/* Discrepancy Live Badge */}
              {(() => {
                const declared = verifyingHandoverShift.handover?.handoverAmount ?? verifyingHandoverShift.closingCash ?? 0;
                const actual = parseFloat(String(verifiedAmount)) || 0;
                const diff = actual - declared;
                if (diff === 0) {
                  return (
                    <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-xs text-emerald-800 font-semibold flex items-center space-x-2">
                      <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>✅ رقم 100% پوری موصول ہوئی (کوئی شارٹیج یا فرق نہیں ہے)</span>
                    </div>
                  );
                } else if (diff < 0) {
                  return (
                    <div className="p-3 bg-rose-50 rounded-xl border border-rose-200 text-xs text-rose-800 font-semibold flex items-center space-x-2">
                      <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                      <span>
                        ⚠️ کیش میں کمی (Shortage): <strong>Rs. {formatNumber(Math.abs(diff))}</strong> کم موصول ہوئے۔ یہ شارٹیج رجسٹر میں ریکارڈ ہوگی۔
                      </span>
                    </div>
                  );
                } else {
                  return (
                    <div className="p-3 bg-blue-50 rounded-xl border border-blue-200 text-xs text-blue-800 font-semibold flex items-center space-x-2">
                      <TrendingUp className="w-4 h-4 text-blue-600 shrink-0" />
                      <span>
                        ℹ️ کیش میں اضافہ (Surplus): <strong>Rs. {formatNumber(diff)}</strong> زیادہ موصول ہوئے۔
                      </span>
                    </div>
                  );
                }
              })()}

              {/* Manager Audit Notes */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  مینیجر کا نوٹ / ریمارکس (Manager Verification Notes):
                </label>
                <textarea
                  rows={2}
                  value={managerHandoverNotes}
                  onChange={(e) => setManagerHandoverNotes(e.target.value)}
                  placeholder="مثلاً: کیش گن کر پورا وصول پایا یا 50 روپے کم ملے..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between shrink-0">
              <button
                type="button"
                disabled={handoverSubmitting}
                onClick={() => handleVerifyAndAcceptHandover("REJECT")}
                className="px-3 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 rounded-xl transition"
              >
                ❌ مسترد کریں (Reject)
              </button>

              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => setVerifyingHandoverShift(null)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition"
                >
                  منسوخ (Cancel)
                </button>
                <button
                  type="button"
                  disabled={handoverSubmitting}
                  onClick={() => handleVerifyAndAcceptHandover("ACCEPT")}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition shadow-sm flex items-center space-x-1.5 cursor-pointer"
                >
                  {handoverSubmitting ? (
                    <span>تصدیق ہو رہی ہے...</span>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4" />
                      <span>کیش وصولی تصدیق کریں (Accept Handover)</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Transfer Cash to Owner Modal */}
      {remittanceModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-3 sm:p-4 overflow-y-auto">
          <form
            onSubmit={handleSubmitRemittance}
            className="bg-white rounded-2xl max-w-lg w-full p-5 sm:p-6 shadow-2xl border border-slate-200 my-auto max-h-[calc(100vh-2rem)] flex flex-col"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 shrink-0">
              <div className="flex items-center space-x-2">
                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                  <Landmark className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-base text-slate-900">
                    مالک / ایڈمن کو رقم کی منتقلی (Transfer Cash to Owner)
                  </h3>
                  <p className="text-xs text-slate-500">
                    اسٹور مینیجر کی جانب سے دکان کی نقد رقم یا منافع مالک کو جمع کروانا
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setRemittanceModalOpen(false)}
                className="p-1.5 hover:bg-slate-100 text-slate-400 hover:text-slate-700 rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="py-4 space-y-4 flex-1 min-h-0 overflow-y-auto">
              {/* Available Cash in Hand Notice */}
              <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-3.5 flex justify-between items-center">
                <div>
                  <span className="text-xs text-emerald-900 font-semibold block">مینیجر کے پاس دستیاب کیش (Cash in Hand):</span>
                  <span className="text-[10px] text-emerald-700">دکان کی تجوری میں موجود کل رقم</span>
                </div>
                <span className="text-xl font-black text-emerald-700">
                  Rs. {formatNumber(remittanceData?.balance?.currentCashInHand || 0)}
                </span>
              </div>

              {/* Amount input & quick chips */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  مالک کو ادا کی جانے والی رقم (Amount in PKR) *
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  step="any"
                  value={remittanceAmount}
                  onChange={(e) => setRemittanceAmount(e.target.value)}
                  placeholder="مثلاً: 25000"
                  className="w-full px-3.5 py-2.5 bg-white border-2 border-indigo-500 rounded-xl font-black text-slate-900 text-base focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />

                <div className="flex flex-wrap gap-1.5 mt-2">
                  {[5000, 10000, 20000, 50000].map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setRemittanceAmount(String(amt))}
                      className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg transition"
                    >
                      Rs. {formatNumber(amt)}
                    </button>
                  ))}
                  {(remittanceData?.balance?.currentCashInHand ?? 0) > 0 && (
                    <button
                      type="button"
                      onClick={() => setRemittanceAmount(String(remittanceData?.balance?.currentCashInHand || 0))}
                      className="px-2.5 py-1 bg-indigo-100 hover:bg-indigo-200 text-indigo-800 text-xs font-black rounded-lg transition"
                    >
                      تمام کیش (All Rs. {formatNumber(remittanceData?.balance?.currentCashInHand || 0)})
                    </button>
                  )}
                </div>
              </div>

              {/* Recipient Admin / Owner */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  کس مالک / ایڈمن کو دی جا رہی ہے؟ (Recipient Owner / Admin)
                </label>
                {remittanceData?.admins && remittanceData.admins.length > 0 ? (
                  <select
                    value={remittanceOwnerId}
                    onChange={(e) => {
                      setRemittanceOwnerId(e.target.value);
                      const adm = remittanceData.admins.find((a: any) => a.id === e.target.value);
                      if (adm) setRemittanceOwnerName(adm.fullName || adm.username);
                    }}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  >
                    {remittanceData.admins.map((adm: any) => (
                      <option key={adm.id} value={adm.id}>
                        {adm.fullName || adm.username} ({adm.role})
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={remittanceOwnerName}
                    onChange={(e) => setRemittanceOwnerName(e.target.value)}
                    placeholder="مالک / ایڈمن کا نام"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-medium text-slate-800"
                  />
                )}
              </div>

              {/* Payment Method */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  ادائیگی کا طریقہ کار (Payment Method)
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: "CASH", label: "💵 نقد (Cash)" },
                    { id: "BANK_TRANSFER", label: "🏦 بینک ٹرانسفر" },
                    { id: "CHEQUE", label: "📝 چیک" },
                  ].map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setRemittanceMethod(m.id)}
                      className={`py-2 px-2 rounded-xl text-xs font-bold border-2 transition text-center cursor-pointer ${
                        remittanceMethod === m.id
                          ? "border-indigo-600 bg-indigo-50 text-indigo-900"
                          : "border-slate-200 hover:border-slate-300 bg-white text-slate-700"
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Notes / Purpose */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  تفصیل / مقصد (Notes / Purpose):
                </label>
                <textarea
                  rows={2}
                  value={remittanceNotes}
                  onChange={(e) => setRemittanceNotes(e.target.value)}
                  placeholder="مثلاً: 10 دن کی جمع شدہ سیل کیش / ماہانہ منافع ادائیگی..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-end space-x-2 shrink-0">
              <button
                type="button"
                onClick={() => setRemittanceModalOpen(false)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition"
              >
                منسوخ (Cancel)
              </button>
              <button
                type="submit"
                disabled={remittanceSubmitting}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl transition shadow-sm flex items-center space-x-1.5 cursor-pointer"
              >
                {remittanceSubmitting ? (
                  <span>محفوظ ہو رہا ہے...</span>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>ادائیگی جمع کروائیں (Submit Remittance)</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Invoice Thermal Receipt Reprint Modal */}
      {selectedInvoice && (
        <ThermalReceipt
          invoiceNumber={selectedInvoice.invoiceNumber}
          date={selectedInvoice.createdAt}
          cashierName={selectedInvoice.cashier?.fullName || "Cashier"}
          customerName={selectedInvoice.customerName}
          customerPhone={selectedInvoice.customerPhone}
          items={selectedInvoice.items.map((it: any) => ({
            name: it.productName || it.name,
            sku: it.sku,
            quantity: it.quantity,
            unitPrice: it.unitPrice,
            discountAmount: it.discountAmount,
            subtotal: it.subtotalAmount,
          }))}
          subtotal={selectedInvoice.subtotal}
          discountAmount={selectedInvoice.discountAmount}
          taxRate={selectedInvoice.taxRate}
          taxAmount={selectedInvoice.taxAmount}
          totalAmount={selectedInvoice.totalAmount}
          paymentMethod={selectedInvoice.paymentMethod}
          amountTendered={selectedInvoice.amountTendered}
          changeDue={selectedInvoice.changeDue}
          onClose={() => setSelectedInvoice(null)}
        />
      )}
    </div>
  );
}
