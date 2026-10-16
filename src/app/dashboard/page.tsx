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
} from "lucide-react";
import Link from "next/link";
import { ThermalReceipt } from "@/components/pos/ThermalReceipt";
import { formatCurrency, formatNumber } from "@/lib/format-utils";

export default function DashboardPage() {
  const [metrics, setMetrics] = useState<any | null>(null);
  const [salesList, setSalesList] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<any | null>(null);
  const [pendingHandovers, setPendingHandovers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [paymentFilter, setPaymentFilter] = useState("ALL");
  const [selectedInvoice, setSelectedInvoice] = useState<any | null>(null);

  const fetchPendingHandovers = async () => {
    try {
      const res = await fetch("/api/pos/shifts/handover");
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.pendingHandovers) {
          setPendingHandovers(data.pendingHandovers);
        }
      }
    } catch (e) {
      // safe fallback if not manager/admin
    }
  };

  const handleAcceptHandover = async (shiftId: string) => {
    try {
      const res = await fetch("/api/pos/shifts/handover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shiftId,
          action: "ACCEPT",
          notes: "Received and verified by Manager on Dashboard",
        }),
      });
      const data = await res.json();
      if (data.success) {
        alert("کیش ہینڈ اوور قبول کر لیا گیا ہے۔ اب کیشیئر نئی شفٹ اور بل بنا سکتا ہے۔ (Handover accepted, cashier unlocked)");
        fetchPendingHandovers();
      } else {
        alert(data.error);
      }
    } catch (e: any) {
      alert(`Error: ${e.message}`);
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
  }, []);

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

      {/* Manager Cash Handover Acceptance Queue Widget */}
      {pendingHandovers.length > 0 && (
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
                  onClick={() => handleAcceptHandover(sh.id)}
                  className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg text-xs transition shadow-xs flex items-center justify-center space-x-1"
                >
                  <CheckCircle className="w-3.5 h-3.5" />
                  <span>کیش وصول پایا (Accept Cash Handover)</span>
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
