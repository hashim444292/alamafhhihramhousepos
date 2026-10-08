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
} from "lucide-react";
import Link from "next/link";
import { ThermalReceipt } from "@/components/pos/ThermalReceipt";
import { formatCurrency, formatNumber } from "@/lib/format-utils";

export default function DashboardPage() {
  const [metrics, setMetrics] = useState<any | null>(null);
  const [salesList, setSalesList] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  // Filters
  const [paymentFilter, setPaymentFilter] = useState("ALL");
  const [selectedInvoice, setSelectedInvoice] = useState<any | null>(null);

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
          <table className="w-full text-left text-xs sm:text-sm">
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
