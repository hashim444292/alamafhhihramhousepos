"use client";

import React, { useState, useEffect } from "react";
import {
  FileText,
  Printer,
  Calendar,
  Filter,
  ShoppingBag,
  Receipt,
  Users,
  Truck,
  TrendingUp,
  DollarSign,
  PieChart,
  Layers,
  Clock,
  CheckCircle,
  ArrowDownRight,
  ArrowUpRight,
  CreditCard,
  Building,
  Eye,
  RotateCcw,
  X,
  AlertCircle,
} from "lucide-react";
import { ThermalReceipt } from "@/components/pos/ThermalReceipt";
import { formatCurrency, formatNumber } from "@/lib/format-utils";
import { useAuthStore } from "@/store/auth-store";

export default function ReportsPage() {
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState<
    "accounting" | "sales" | "purchases" | "expenses" | "customers" | "suppliers" | "shifts"
  >("sales");

  useEffect(() => {
    if (user?.role === "ADMIN" || user?.role === "MANAGER") {
      setActiveTab("accounting");
    } else {
      setActiveTab("sales");
    }
  }, [user?.role]);

  // Helper to format local date YYYY-MM-DD
  const formatLocalDate = (d: Date) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  // Date range presets
  const [preset, setPreset] = useState<"today" | "yesterday" | "week" | "month" | "all" | "custom">("today");
  const [startDate, setStartDate] = useState(() => formatLocalDate(new Date()));
  const [endDate, setEndDate] = useState(() => formatLocalDate(new Date()));

  // Data states
  const [accountingData, setAccountingData] = useState<any | null>(null);
  const [salesData, setSalesData] = useState<any[]>([]);
  const [purchaseData, setPurchaseData] = useState<any[]>([]);
  const [expenseData, setExpenseData] = useState<any[]>([]);
  const [customerData, setCustomerData] = useState<any[]>([]);
  const [supplierData, setSupplierData] = useState<any[]>([]);
  const [shiftData, setShiftData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>("ALL");
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>("ALL");
  const [selectedCashierId, setSelectedCashierId] = useState<string>("ALL");
  const [shiftSummary, setShiftSummary] = useState<any | null>(null);
  const [cashierList, setCashierList] = useState<any[]>([]);

  // Invoice Details & Return Modals
  const [selectedInvoiceForModal, setSelectedInvoiceForModal] = useState<any | null>(null);
  const [thermalReceiptInvoice, setThermalReceiptInvoice] = useState<any | null>(null);
  const [returnInvoice, setReturnInvoice] = useState<any | null>(null);
  const [returnReason, setReturnReason] = useState<string>("Customer Return / واپسی");
  const [isSubmittingReturn, setIsSubmittingReturn] = useState<boolean>(false);

  // Customer Individual Statement & Audit Report Modal
  const [customerStatementData, setCustomerStatementData] = useState<any | null>(null);
  const [isFetchingCustomerStatement, setIsFetchingCustomerStatement] = useState<boolean>(false);

  // Apply Presets
  const applyPreset = (p: "today" | "yesterday" | "week" | "month" | "all" | "custom") => {
    setPreset(p);
    const today = new Date();

    if (p === "today") {
      const d = formatLocalDate(today);
      setStartDate(d);
      setEndDate(d);
    } else if (p === "yesterday") {
      const yest = new Date(today);
      yest.setDate(today.getDate() - 1);
      const d = formatLocalDate(yest);
      setStartDate(d);
      setEndDate(d);
    } else if (p === "week") {
      const weekStart = new Date(today);
      weekStart.setDate(today.getDate() - 7);
      setStartDate(formatLocalDate(weekStart));
      setEndDate(formatLocalDate(today));
    } else if (p === "month") {
      const monthStart = new Date(today);
      monthStart.setDate(today.getDate() - 30);
      setStartDate(formatLocalDate(monthStart));
      setEndDate(formatLocalDate(today));
    } else if (p === "all") {
      setStartDate("");
      setEndDate("");
    }
  };

  const loadReportData = async () => {
    setLoading(true);
    try {
      const sDate = startDate ? `startDate=${startDate}` : "";
      const eDate = endDate ? `endDate=${endDate}` : "";
      const query = [sDate, eDate].filter(Boolean).join("&");

      // 1. Accounting PnL & Financial Statements
      if (activeTab === "accounting") {
        const res = await fetch(`/api/reports/accounting?${query}`);
        const data = await res.json();
        if (data.success) setAccountingData(data.accounting);
      }
      // 2. Sales Transactions
      else if (activeTab === "sales") {
        const custParam = selectedCustomerId !== "ALL" ? `&customerId=${selectedCustomerId}` : "";
        const res = await fetch(`/api/reports/sales?${query}${custParam}&limit=500`);
        const data = await res.json();
        if (data.success) setSalesData(data.transactions);
      }
      // 3. Purchases from Suppliers
      else if (activeTab === "purchases") {
        const supParam = selectedSupplierId !== "ALL" ? `&supplierId=${selectedSupplierId}` : "";
        const res = await fetch(`/api/reports/purchases?${query}${supParam}`);
        const data = await res.json();
        if (data.success) setPurchaseData(data.purchases);
      }
      // 4. Operational Expenses
      else if (activeTab === "expenses") {
        const res = await fetch(`/api/expenses?${query}`);
        const data = await res.json();
        if (data.success) setExpenseData(data.expenses);
      }
      // 5. Customer Udhaar & Ledgers
      else if (activeTab === "customers") {
        const res = await fetch("/api/customers");
        const data = await res.json();
        if (data.success) setCustomerData(data.customers);
      }
      // 6. Supplier Ledgers & Payables
      else if (activeTab === "suppliers") {
        const res = await fetch("/api/suppliers");
        const data = await res.json();
        if (data.success) setSupplierData(data.suppliers);
      }
      // 7. Shifts & Cash Register Closings (Z-Reports)
      else if (activeTab === "shifts") {
        const query = new URLSearchParams({
          history: "true",
          startDate,
          endDate,
          ...(selectedCashierId !== "ALL" ? { cashierId: selectedCashierId } : {}),
        });
        const res = await fetch(`/api/pos/shifts?${query.toString()}`);
        const data = await res.json();
        if (data.success) {
          setShiftData(data.shifts);
          setShiftSummary(data.summary);
          if (data.cashiers) setCashierList(data.cashiers);
        }
      }
    } catch (e) {
      console.error("Failed to load report data:", e);
    } finally {
      setLoading(false);
    }
  };

  // Pre-load supplier list for filter dropdown if not loaded
  useEffect(() => {
    if (supplierData.length === 0) {
      fetch("/api/suppliers")
        .then((r) => r.json())
        .then((d) => d.success && setSupplierData(d.suppliers))
        .catch(() => {});
    }
    if (customerData.length === 0) {
      fetch("/api/customers")
        .then((r) => r.json())
        .then((d) => d.success && setCustomerData(d.customers))
        .catch(() => {});
    }
  }, []);

  useEffect(() => {
    loadReportData();
  }, [activeTab, startDate, endDate, selectedSupplierId, selectedCustomerId, selectedCashierId]);

  const handlePrint = () => {
    window.print();
  };

  const handleOpenCustomerStatement = async (customerId: string) => {
    setIsFetchingCustomerStatement(true);
    try {
      const res = await fetch(`/api/customers/${customerId}`);
      const data = await res.json();
      if (data.success) {
        setCustomerStatementData(data.customer);
      } else {
        alert("Failed to load customer statement");
      }
    } catch (e: any) {
      alert("Error loading customer statement: " + e.message);
    } finally {
      setIsFetchingCustomerStatement(false);
    }
  };

  const handleProcessReturn = async () => {
    if (!returnInvoice || isSubmittingReturn) return;
    setIsSubmittingReturn(true);
    try {
      const res = await fetch(`/api/reports/sales/${returnInvoice.id}/return`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: returnReason }),
      });
      const data = await res.json();
      if (data.success) {
        alert("Sales invoice marked as RETURNED. Items restocked to inventory successfully!");
        setReturnInvoice(null);
        if (selectedInvoiceForModal && selectedInvoiceForModal.id === returnInvoice.id) {
          setSelectedInvoiceForModal(data.transaction);
        }
        loadReportData();
      } else {
        alert(`Error: ${data.error}`);
      }
    } catch (e: any) {
      alert(`Return failed: ${e.message}`);
    } finally {
      setIsSubmittingReturn(false);
    }
  };

  // Calculations for Sales Report
  const totalSalesAmount = salesData.reduce((acc, s) => acc + s.totalAmount, 0);
  const totalCashSales = salesData
    .filter((s) => s.paymentMethod === "CASH")
    .reduce((acc, s) => acc + s.totalAmount, 0);
  const totalCreditSales = salesData
    .filter((s) => s.paymentMethod === "CREDIT" || s.balanceDue > 0)
    .reduce((acc, s) => acc + (s.balanceDue || s.totalAmount), 0);
  const totalCardSales = salesData
    .filter((s) => s.paymentMethod === "CARD" || s.paymentMethod === "MOBILE_WALLET")
    .reduce((acc, s) => acc + s.totalAmount, 0);

  // Calculations for Purchase Report
  const totalPurchasesBill = purchaseData.reduce((acc, p) => acc + p.totalAmount, 0);
  const totalPurchasesPaid = purchaseData.reduce((acc, p) => acc + p.paidAmount, 0);
  const totalPurchasesRemaining = purchaseData.reduce((acc, p) => acc + p.balanceAmount, 0);

  // Calculations for Expense Report
  const totalExpensesAmount = expenseData.reduce((acc, e) => acc + e.amount, 0);

  // Calculations for Receivables & Payables
  const totalCustomerReceivables = customerData.reduce((acc, c) => acc + c.balance, 0);
  const totalSupplierPayables = supplierData.reduce((acc, s) => acc + s.currentBalance, 0);

  const storeName = process.env.NEXT_PUBLIC_STORE_NAME || "Al-Afhhihram House";
  const storeAddress =
    process.env.NEXT_PUBLIC_STORE_ADDRESS || "Shop #12, Madinah Market, Urdu Bazar, Lahore";
  const storePhone = process.env.NEXT_PUBLIC_STORE_PHONE || "+92 300 1234567";

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      {/* Page Header (Screen Only) */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 print:hidden">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center space-x-2">
            <FileText className="w-7 h-7 text-emerald-600" />
            <span>Accounting & Audited Financial Reports (مکمل اکاؤنٹنگ اور رپورٹس)</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Real-time Trading Account, P&L, Sales, Supplier Purchases, Customer Khata & Daily Drawer Closings
          </p>
        </div>

        <button
          onClick={handlePrint}
          className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs sm:text-sm font-bold flex items-center space-x-2 transition shadow-md"
        >
          <Printer className="w-4 h-4 text-emerald-400" />
          <span>Print This Report (رپورٹ پرنٹ کریں)</span>
        </button>
      </div>

      {/* Tabs & Controls Bar (Screen Only) */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-4 print:hidden">
        {/* Module Tabs */}
        <div className="flex flex-wrap gap-2 border-b border-slate-100 pb-3">
          {user?.role !== "CASHIER" && (
            <button
              onClick={() => setActiveTab("accounting")}
              className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center space-x-1.5 transition ${
                activeTab === "accounting"
                  ? "bg-slate-900 text-white shadow-sm"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              <PieChart className="w-4 h-4 text-emerald-400" />
              <span>General Accounting & P&L (مکمل اکاؤنٹنگ و منافع)</span>
            </button>
          )}

          <button
            onClick={() => setActiveTab("sales")}
            className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center space-x-1.5 transition ${
              activeTab === "sales"
                ? "bg-emerald-600 text-white shadow-sm"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
          >
            <ShoppingBag className="w-4 h-4" />
            <span>Sales Report (سیلز رپورٹ)</span>
          </button>

          <button
            onClick={() => setActiveTab("purchases")}
            className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center space-x-1.5 transition ${
              activeTab === "purchases"
                ? "bg-emerald-600 text-white shadow-sm"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
          >
            <Truck className="w-4 h-4" />
            <span>Purchases Report (خریداری رپورٹ)</span>
          </button>

          <button
            onClick={() => setActiveTab("expenses")}
            className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center space-x-1.5 transition ${
              activeTab === "expenses"
                ? "bg-emerald-600 text-white shadow-sm"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
          >
            <Receipt className="w-4 h-4" />
            <span>Expenses Report (اخراجات رپورٹ)</span>
          </button>

          <button
            onClick={() => setActiveTab("customers")}
            className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center space-x-1.5 transition ${
              activeTab === "customers"
                ? "bg-emerald-600 text-white shadow-sm"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Customer Udhaar (گاہک کھاتہ)</span>
          </button>

          <button
            onClick={() => setActiveTab("suppliers")}
            className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center space-x-1.5 transition ${
              activeTab === "suppliers"
                ? "bg-emerald-600 text-white shadow-sm"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
          >
            <Building className="w-4 h-4" />
            <span>Supplier Payables (وینڈرز کھاتہ)</span>
          </button>

          <button
            onClick={() => setActiveTab("shifts")}
            className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center space-x-1.5 transition ${
              activeTab === "shifts"
                ? "bg-emerald-600 text-white shadow-sm"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>Shift Drawer Closings (کلوزنگ رجسٹر Z-Reports)</span>
          </button>
        </div>

        {/* Date Filters & Presets (Weekly, Monthly, Custom) */}
        {/* Date Filters & Presets (Weekly, Monthly, Custom) */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pt-1">
          {/* Quick Presets */}
          <div className="flex items-center space-x-1.5 flex-wrap gap-y-1">
            <span className="text-xs text-slate-500 font-semibold mr-1">Period:</span>
            <button
              onClick={() => applyPreset("today")}
              className={`px-2.5 py-1 text-xs font-bold rounded-lg transition ${
                preset === "today" ? "bg-slate-900 text-white shadow-sm" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              Today (آج)
            </button>
            <button
              onClick={() => applyPreset("yesterday")}
              className={`px-2.5 py-1 text-xs font-bold rounded-lg transition ${
                preset === "yesterday" ? "bg-slate-900 text-white shadow-sm" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              Yesterday (کل)
            </button>
            <button
              onClick={() => applyPreset("week")}
              className={`px-2.5 py-1 text-xs font-bold rounded-lg transition ${
                preset === "week" ? "bg-slate-900 text-white shadow-sm" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              Last 7 Days (ہفتہ وار)
            </button>
            <button
              onClick={() => applyPreset("month")}
              className={`px-2.5 py-1 text-xs font-bold rounded-lg transition ${
                preset === "month" ? "bg-slate-900 text-white shadow-sm" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              Last 30 Days (ماہانہ)
            </button>
            <button
              onClick={() => applyPreset("all")}
              className={`px-2.5 py-1 text-xs font-bold rounded-lg transition ${
                preset === "all" ? "bg-emerald-700 text-white shadow-sm" : "bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200"
              }`}
            >
              All History (تمام تاریخیں)
            </button>
          </div>

          {/* Custom Date Pickers & Filters */}
          <div className="flex items-center space-x-2 text-xs flex-wrap gap-y-1">
            {activeTab === "sales" && (
              <div className="flex items-center space-x-1 mr-2">
                <span className="font-semibold text-slate-600">Customer:</span>
                <select
                  value={selectedCustomerId}
                  onChange={(e) => setSelectedCustomerId(e.target.value)}
                  className="px-2 py-1 border rounded text-xs bg-slate-50 font-bold"
                >
                  <option value="ALL">All Customers (تمام گاہک)</option>
                  {customerData.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} {c.phone ? `(${c.phone})` : ""}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {activeTab === "purchases" && (
              <div className="flex items-center space-x-1 mr-2">
                <span className="font-semibold text-slate-600">Vendor:</span>
                <select
                  value={selectedSupplierId}
                  onChange={(e) => setSelectedSupplierId(e.target.value)}
                  className="px-2 py-1 border rounded text-xs bg-slate-50 font-bold"
                >
                  <option value="ALL">All Suppliers (تمام وینڈرز)</option>
                  {supplierData.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.companyName || "Vendor"})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {activeTab === "shifts" && (
              <div className="flex items-center space-x-1 mr-2">
                <span className="font-semibold text-slate-600">Cashier:</span>
                <select
                  value={selectedCashierId}
                  onChange={(e) => setSelectedCashierId(e.target.value)}
                  className="px-2 py-1 border rounded text-xs bg-slate-50 font-bold"
                >
                  <option value="ALL">All Cashiers (تمام کیشئیر)</option>
                  {cashierList.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.fullName || c.username}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="flex items-center space-x-1.5 bg-slate-50 px-2 py-1 rounded-lg border border-slate-200">
              <Calendar className="w-4 h-4 text-slate-500" />
              <span className="text-slate-600 font-semibold">From:</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setPreset("custom");
                  const newStart = e.target.value;
                  setStartDate(newStart);
                  if (endDate && newStart > endDate) {
                    setEndDate(newStart);
                  }
                }}
                className="px-2 py-0.5 border rounded text-xs bg-white focus:ring-1 focus:ring-slate-900 outline-none"
              />
              <span className="text-slate-600 font-semibold">To:</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setPreset("custom");
                  const newEnd = e.target.value;
                  setEndDate(newEnd);
                  if (startDate && newEnd < startDate) {
                    setStartDate(newEnd);
                  }
                }}
                className="px-2 py-0.5 border rounded text-xs bg-white focus:ring-1 focus:ring-slate-900 outline-none"
              />
              <button
                onClick={() => loadReportData()}
                className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-white rounded text-xs font-bold transition flex items-center space-x-1 shadow-sm"
              >
                <Filter className="w-3 h-3 text-emerald-400" />
                <span>Filter</span>
              </button>
              {(startDate || endDate) && (
                <button
                  onClick={() => applyPreset("all")}
                  title="Clear date filter to view all records"
                  className="px-2 py-1 text-slate-500 hover:text-rose-600 transition text-xs font-semibold"
                >
                  Reset
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* =========================================================================
          PRINTABLE REPORT DOCUMENT CONTAINER (Visible on screen and printed via A4)
         ========================================================================= */}
      <div id="report-printable-area" className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-6">
        {/* Printable Official Store Header */}
        <div className="border-b-2 border-slate-900 pb-4 flex flex-col sm:flex-row sm:items-center justify-between text-center sm:text-left">
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 uppercase tracking-wide">
              {storeName}
            </h2>
            <p className="text-xs text-slate-600">
              Ihram Sets, Islamic Clothing & Hajj Accessories (احرام و اسلامی ملبوسات)
            </p>
            <p className="text-xs text-slate-500">{storeAddress} • Tel: {storePhone}</p>
          </div>
          <div className="mt-3 sm:mt-0 sm:text-right">
            <span className="inline-block px-3 py-1 bg-emerald-50 text-emerald-800 border border-emerald-300 font-bold text-xs rounded-lg uppercase">
              {activeTab === "accounting"
                ? "Official Financial & Trading Statement (P&L)"
                : activeTab === "sales"
                ? "Official Sales Report"
                : activeTab === "purchases"
                ? "Supplier Purchases & Inward Stock Report"
                : activeTab === "expenses"
                ? "Operating Expenses & Heads of Account"
                : activeTab === "customers"
                ? "Customer Udhaar Khata Summary"
                : activeTab === "suppliers"
                ? "Supplier Payables Ledger Summary"
                : "Drawer Closing & Shift Z-Reports"}
            </span>
            <div className="text-xs text-slate-500 mt-1">
              Date Period: <strong>{startDate && endDate ? `${startDate} to ${endDate}` : startDate ? `From ${startDate}` : endDate ? `Up to ${endDate}` : "All History (شروع سے اب تک تمام ریکارڈ)"}</strong>
            </div>
            <div className="text-[10px] text-slate-400">
              Printed on: {new Date().toLocaleString()}
            </div>
          </div>
        </div>

        {/* 1. GENERAL ACCOUNTING & PNL REPORT */}
        {activeTab === "accounting" && (
          <div className="space-y-6">
            {loading ? (
              <div className="py-12 text-center text-slate-400">Generating Accounting Audit...</div>
            ) : !accountingData ? (
              <div className="py-12 text-center text-slate-400">No accounting data found.</div>
            ) : (
              <>
                {/* Executive Head Snapshot */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3.5 bg-emerald-50 rounded-xl border border-emerald-200">
                    <span className="text-[10px] text-emerald-900 font-bold uppercase">
                      Total Sales Revenue (فروخت)
                    </span>
                    <div className="text-xl font-black text-emerald-800 mt-0.5">
                      {formatCurrency(accountingData.tradingAccount.totalSalesRevenue)}
                    </div>
                  </div>

                  <div className="p-3.5 bg-blue-50 rounded-xl border border-blue-200">
                    <span className="text-[10px] text-blue-900 font-bold uppercase">
                      COGS / Purchase Cost (لاگت خرید)
                    </span>
                    <div className="text-xl font-black text-blue-800 mt-0.5">
                      {formatCurrency(accountingData.tradingAccount.costOfGoodsSold)}
                    </div>
                  </div>

                  <div className="p-3.5 bg-rose-50 rounded-xl border border-rose-200">
                    <span className="text-[10px] text-rose-900 font-bold uppercase">
                      Operating Expenses (اخراجات)
                    </span>
                    <div className="text-xl font-black text-rose-700 mt-0.5">
                      {formatCurrency(accountingData.profitAndLoss.totalExpenses)}
                    </div>
                  </div>

                  <div className="p-3.5 bg-slate-900 text-white rounded-xl shadow-sm">
                    <span className="text-[10px] text-emerald-400 font-bold uppercase">
                      Net Profit (خالص منافع)
                    </span>
                    <div className="text-xl font-black text-emerald-400 mt-0.5">
                      {formatCurrency(accountingData.profitAndLoss.netProfit)}
                    </div>
                    <span className="text-[10px] text-slate-400">
                      Margin: {formatNumber(accountingData.profitAndLoss.netMarginPercent)}%
                    </span>
                  </div>
                </div>

                {/* Trading & Profit & Loss Statement Table */}
                <div className="border border-slate-300 rounded-xl overflow-hidden">
                  <div className="bg-slate-100 px-4 py-2.5 font-bold text-xs text-slate-800 border-b flex justify-between">
                    <span>Trading Account & Profit & Loss Head (حساب و کتاب برائے منتخب مدت)</span>
                    <span>Amount (PKR)</span>
                  </div>
                  <table className="w-full text-xs">
                    <tbody className="divide-y divide-slate-200">
                      <tr className="bg-white">
                        <td className="py-2.5 px-4 font-bold text-slate-900">
                          Gross Sales Turnover (فروخت مال)
                        </td>
                        <td className="py-2.5 px-4 text-right font-black text-slate-900">
                          {formatCurrency(accountingData.tradingAccount.totalSalesRevenue)}
                        </td>
                      </tr>
                      <tr className="bg-slate-50/50">
                        <td className="py-2.5 px-4 text-slate-700 pl-8">
                          Less: Cost of Goods Sold (COGS - پروڈکٹس کی لاگت خرید)
                        </td>
                        <td className="py-2.5 px-4 text-right font-bold text-rose-600">
                          - {formatCurrency(accountingData.tradingAccount.costOfGoodsSold)}
                        </td>
                      </tr>
                      <tr className="bg-emerald-50 font-bold border-y border-emerald-200">
                        <td className="py-2.5 px-4 text-emerald-900 uppercase">
                          Gross Trading Profit (مجموعی منافع)
                        </td>
                        <td className="py-2.5 px-4 text-right font-black text-emerald-800">
                          {formatCurrency(accountingData.tradingAccount.grossProfit)}
                        </td>
                      </tr>
                      <tr className="bg-white">
                        <td className="py-2.5 px-4 font-bold text-slate-900" colSpan={2}>
                          Operating Expenses by Category / Heads (اخراجات کے ہیڈز):
                        </td>
                      </tr>
                      {Object.keys(accountingData.profitAndLoss.expenseByCategory).length === 0 ? (
                        <tr>
                          <td className="py-2 px-8 text-slate-400" colSpan={2}>
                            No expenses logged in this period.
                          </td>
                        </tr>
                      ) : (
                        Object.entries(accountingData.profitAndLoss.expenseByCategory).map(
                          ([cat, amt]: any) => (
                            <tr key={cat} className="hover:bg-slate-50">
                              <td className="py-1.5 px-8 text-slate-600">• {cat}</td>
                              <td className="py-1.5 px-4 text-right text-slate-700 font-semibold">
                                {formatCurrency(amt)}
                              </td>
                            </tr>
                          )
                        )
                      )}
                      <tr className="bg-rose-50/70 border-t border-rose-200 font-bold">
                        <td className="py-2.5 px-4 text-rose-900">
                          Total Operating Expenses Outflow (کل اخراجات)
                        </td>
                        <td className="py-2.5 px-4 text-right font-black text-rose-700">
                          - {formatCurrency(accountingData.profitAndLoss.totalExpenses)}
                        </td>
                      </tr>
                      <tr className="bg-slate-900 text-white font-extrabold text-sm border-t-2 border-slate-900">
                        <td className="py-3 px-4 uppercase text-emerald-400">
                          Net Operating Profit / Bottom Line (خالص منافع برائے مدت)
                        </td>
                        <td className="py-3 px-4 text-right font-black text-emerald-400">
                          {formatCurrency(accountingData.profitAndLoss.netProfit)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Cash Flow Reconciliation Inflows & Outflows */}
                <div className="border border-slate-300 rounded-xl overflow-hidden">
                  <div className="bg-slate-900 px-4 py-2.5 font-bold text-xs text-white flex justify-between items-center">
                    <span className="flex items-center space-x-2">
                      <Clock className="w-4 h-4 text-emerald-400" />
                      <span>
                        Operational Financial Audit & Cash Flow ({startDate === endDate ? `Day End Summary: ${startDate}` : `${preset.toUpperCase()} Audit: ${startDate} to ${endDate}`})
                      </span>
                    </span>
                    <span className="text-[11px] text-emerald-400 font-mono">
                      Net Cash Generated: {formatCurrency(accountingData.cashFlowSummary.netCashFlow)}
                    </span>
                  </div>

                  <table className="w-full text-xs">
                    <tbody className="divide-y divide-slate-100">
                      {/* Cash Inflow from Sales */}
                      <tr className="bg-white">
                        <td className="py-2.5 px-4 font-semibold text-slate-800 flex items-center space-x-2">
                          <ArrowDownRight className="w-4 h-4 text-emerald-600" />
                          <span>1. Cash Collected from Retail Sales (آج نقد فروخت سے موصولی)</span>
                        </td>
                        <td className="py-2.5 px-4 text-right font-black text-emerald-700">
                          + {formatCurrency(accountingData.cashFlowSummary.cashInflowSales)}
                        </td>
                      </tr>

                      {/* Cash Inflow from Customer Udhaar Recovery */}
                      <tr className="bg-white">
                        <td className="py-2.5 px-4 font-semibold text-slate-800 flex items-center space-x-2">
                          <ArrowDownRight className="w-4 h-4 text-emerald-600" />
                          <span>2. Customer Udhaar Recoveries Received (گاہکوں سے ادھار کی وصولی)</span>
                        </td>
                        <td className="py-2.5 px-4 text-right font-black text-emerald-700">
                          + {formatCurrency(accountingData.cashFlowSummary.cashInflowRecoveries)}
                        </td>
                      </tr>

                      {/* Cash Outflow to Vendors/Purchases */}
                      <tr className="bg-slate-50/50">
                        <td className="py-2.5 px-4 font-semibold text-slate-800 flex items-center space-x-2">
                          <ArrowUpRight className="w-4 h-4 text-rose-600" />
                          <span>3. Paid to Suppliers for Purchases (وینڈرز کو پرچیز ادائیگی)</span>
                        </td>
                        <td className="py-2.5 px-4 text-right font-black text-rose-600">
                          - {formatCurrency(accountingData.cashFlowSummary.cashOutflowPurchases)}
                        </td>
                      </tr>

                      {/* Cash Outflow for Expenses */}
                      <tr className="bg-slate-50/50">
                        <td className="py-2.5 px-4 font-semibold text-slate-800 flex items-center space-x-2">
                          <ArrowUpRight className="w-4 h-4 text-rose-600" />
                          <span>4. Store Operating Expenses Paid (دکان کے کل اخراجات)</span>
                        </td>
                        <td className="py-2.5 px-4 text-right font-black text-rose-600">
                          - {formatCurrency(accountingData.cashFlowSummary.cashOutflowExpenses)}
                        </td>
                      </tr>

                      {/* Total Inflow vs Outflow Net */}
                      <tr className="bg-emerald-50/70 font-bold border-t-2 border-emerald-300">
                        <td className="py-2.5 px-4 text-emerald-900 uppercase">
                          Net Operational Cash Flow Position (خالص کیش بچت برائے مدت)
                        </td>
                        <td className="py-2.5 px-4 text-right font-black text-emerald-800">
                          {formatCurrency(accountingData.cashFlowSummary.netCashFlow)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Balance Sheet Positions Snapshot & Current Stock Valuation */}
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-2">
                  <div className="p-3.5 bg-slate-50 rounded-xl border">
                    <span className="text-[10px] text-slate-500 font-bold uppercase block">
                      Remaining Store Stock Value (موجودہ اسٹاک کی مالیت)
                    </span>
                    <div className="text-lg font-black text-slate-900 mt-1">
                      {formatCurrency(accountingData.balanceSheetSnapshot.currentInventoryValuation)}
                    </div>
                    <span className="text-[10px] text-slate-500 font-medium">
                      {formatNumber(accountingData.balanceSheetSnapshot.totalInventoryPieces)} Total Pieces in Store
                    </span>
                  </div>

                  <div className="p-3.5 bg-blue-50 rounded-xl border border-blue-200">
                    <span className="text-[10px] text-blue-900 font-bold uppercase block">
                      Purchases Inward This Period (خریداری مال)
                    </span>
                    <div className="text-lg font-black text-blue-800 mt-1">
                      {formatCurrency(accountingData.purchasesSummary.totalPurchasesAmount)}
                    </div>
                    <span className="text-[10px] text-blue-700">
                      Paid: {formatCurrency(accountingData.purchasesSummary.totalPurchasesPaid)} • Due: {formatCurrency(accountingData.purchasesSummary.totalPurchasesPayablePending)}
                    </span>
                  </div>

                  <div className="p-3.5 bg-amber-50 rounded-xl border border-amber-200">
                    <span className="text-[10px] text-amber-900 font-bold uppercase block">
                      Total Receivables (کل واجب الوصول ادھار)
                    </span>
                    <div className="text-lg font-black text-amber-800 mt-1">
                      {formatCurrency(accountingData.balanceSheetSnapshot.totalAccountsReceivable)}
                    </div>
                    <span className="text-[10px] text-amber-700">
                      Recovered in Period: {formatCurrency(accountingData.cashFlowSummary.cashInflowRecoveries)}
                    </span>
                  </div>

                  <div className="p-3.5 bg-rose-50 rounded-xl border border-rose-200">
                    <span className="text-[10px] text-rose-900 font-bold uppercase block">
                      Total Payables (وینڈرز کو واجب الادا ادھار)
                    </span>
                    <div className="text-lg font-black text-rose-700 mt-1">
                      {formatCurrency(accountingData.balanceSheetSnapshot.totalAccountsPayable)}
                    </div>
                    <span className="text-[10px] text-rose-700">
                      Net Working Capital: {formatCurrency(accountingData.balanceSheetSnapshot.netWorkingCapital)}
                    </span>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* 2. SALES REPORT VIEW */}
        {activeTab === "sales" && (
          <div className="space-y-5">
            {/* Summary KPIs */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 bg-slate-50 rounded-xl border">
                <span className="text-[10px] text-slate-500 font-semibold uppercase">Total Gross Sales</span>
                <div className="text-lg font-black text-emerald-800">
                  {formatCurrency(totalSalesAmount)}
                </div>
                <span className="text-[10px] text-slate-400">{salesData.length} Total Invoices</span>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border">
                <span className="text-[10px] text-slate-500 font-semibold uppercase">Cash Collected</span>
                <div className="text-lg font-black text-slate-900">
                  {formatCurrency(totalCashSales)}
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border">
                <span className="text-[10px] text-slate-500 font-semibold uppercase">Card & Digital</span>
                <div className="text-lg font-black text-slate-900">
                  {formatCurrency(totalCardSales)}
                </div>
              </div>

              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200">
                <span className="text-[10px] text-amber-900 font-semibold uppercase">Sold on Credit (Udhaar)</span>
                <div className="text-lg font-black text-amber-700">
                  {formatCurrency(totalCreditSales)}
                </div>
              </div>
            </div>

            {/* Sales Table */}
            <div className="overflow-x-auto border rounded-xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 text-slate-700 font-bold border-b">
                  <tr>
                    <th className="py-2.5 px-3">Invoice #</th>
                    <th className="py-2.5 px-3">Date & Time</th>
                    <th className="py-2.5 px-3">Customer</th>
                    <th className="py-2.5 px-3">Cashier</th>
                    <th className="py-2.5 px-3">Payment</th>
                    <th className="py-2.5 px-3 text-center">Status</th>
                    <th className="py-2.5 px-3 text-right">Items</th>
                    <th className="py-2.5 px-3 text-right">Total Amount (Rs.)</th>
                    <th className="py-2.5 px-3 text-right print:hidden">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr>
                      <td colSpan={9} className="py-8 text-center text-slate-400">
                        Generating report data...
                      </td>
                    </tr>
                  ) : salesData.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-8 text-center text-slate-400">
                        No sales recorded in this date range.
                      </td>
                    </tr>
                  ) : (
                    salesData.map((s) => (
                      <tr key={s.id} className="hover:bg-slate-50 transition">
                        <td className="py-2.5 px-3 font-mono font-bold text-slate-900">
                          {s.invoiceNumber}
                        </td>
                        <td className="py-2.5 px-3 text-slate-500 whitespace-nowrap">
                          {new Date(s.createdAt).toLocaleString()}
                        </td>
                        <td className="py-2.5 px-3 font-medium text-slate-800">
                          <div>{s.customerName || "Walk-in Customer"}</div>
                          {s.customerPhone && (
                            <div className="text-[10px] text-slate-400">{s.customerPhone}</div>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-slate-600">{s.cashier?.fullName}</td>
                        <td className="py-2.5 px-3">
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-800">
                            {s.paymentMethod}
                            {s.balanceDue > 0 && ` (Udhaar: ${formatCurrency(s.balanceDue)})`}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          {s.status === "REFUNDED" ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-700 border border-rose-200">
                              Returned / واپس شدہ
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                              Completed
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-right font-medium text-slate-700">
                          {s.items?.reduce((acc: number, it: any) => acc + (it.quantity || 1), 0) || 0} pcs
                        </td>
                        <td className={`py-2.5 px-3 text-right font-black ${
                          s.status === "REFUNDED" ? "text-slate-400 line-through" : "text-emerald-800"
                        }`}>
                          {formatCurrency(s.totalAmount)}
                        </td>
                        <td className="py-2.5 px-3 text-right print:hidden whitespace-nowrap space-x-1">
                          <button
                            onClick={() => setSelectedInvoiceForModal(s)}
                            title="View Full Invoice Details (انوائس تفصیلات دیکھیں)"
                            className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-bold inline-flex items-center space-x-1 transition"
                          >
                            <Eye className="w-3.5 h-3.5 text-emerald-600" />
                            <span>View</span>
                          </button>
                          <button
                            onClick={() => setThermalReceiptInvoice(s)}
                            title="Print Thermal Receipt (رسید پرنٹ کریں)"
                            className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg text-xs font-bold inline-flex items-center space-x-1 transition"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </button>
                          {s.status !== "REFUNDED" && (
                            <button
                              onClick={() => {
                                setReturnInvoice(s);
                                setReturnReason("Customer Return / واپسی");
                              }}
                              title="Return / Refund this Sale (مال واپس کریں)"
                              className="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg text-xs font-bold inline-flex items-center space-x-1 transition"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                              <span>Return</span>
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
                <tfoot className="bg-slate-100 font-bold text-slate-900 border-t-2 border-slate-300">
                  <tr>
                    <td colSpan={7} className="py-3 px-3 text-right uppercase">
                      Grand Total Sales:
                    </td>
                    <td className="py-3 px-3 text-right font-black text-sm text-emerald-800">
                      Rs. {totalSalesAmount.toFixed(2)}
                    </td>
                    <td className="print:hidden"></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}

        {/* 3. PURCHASES REPORT (FROM SUPPLIERS) */}
        {activeTab === "purchases" && (
          <div className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3 bg-slate-50 rounded-xl border">
                <span className="text-[10px] text-slate-500 font-semibold uppercase">
                  Total Purchases (خریداری مال)
                </span>
                <div className="text-lg font-black text-slate-900">
                  {formatCurrency(totalPurchasesBill)}
                </div>
                <span className="text-[10px] text-slate-400">{purchaseData.length} Purchase Bills</span>
              </div>

              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200">
                <span className="text-[10px] text-emerald-900 font-semibold uppercase">
                  Paid to Vendors (ادائیگی کر دی)
                </span>
                <div className="text-lg font-black text-emerald-700">
                  {formatCurrency(totalPurchasesPaid)}
                </div>
              </div>

              <div className="p-3 bg-rose-50 rounded-xl border border-rose-200">
                <span className="text-[10px] text-rose-900 font-semibold uppercase">
                  Remaining Vendor Khata (بقایا ادھار)
                </span>
                <div className="text-lg font-black text-rose-600">
                  {formatCurrency(totalPurchasesRemaining)}
                </div>
              </div>
            </div>

            <div className="overflow-x-auto border rounded-xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 text-slate-700 font-bold border-b">
                  <tr>
                    <th className="py-2.5 px-3">Bill / PO #</th>
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3">Supplier Name</th>
                    <th className="py-2.5 px-3">Company</th>
                    <th className="py-2.5 px-3">Items Purchased</th>
                    <th className="py-2.5 px-3 text-right">Bill Total (Rs.)</th>
                    <th className="py-2.5 px-3 text-right">Paid (Rs.)</th>
                    <th className="py-2.5 px-3 text-right">Balance Due (Rs.)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-slate-400">
                        Loading purchase bills...
                      </td>
                    </tr>
                  ) : purchaseData.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-slate-400">
                        No purchase bills recorded for this selection.
                      </td>
                    </tr>
                  ) : (
                    purchaseData.map((p) => (
                      <tr key={p.id} className="hover:bg-slate-50">
                        <td className="py-2.5 px-3 font-mono font-bold text-slate-900">{p.poNumber}</td>
                        <td className="py-2.5 px-3 text-slate-500">
                          {new Date(p.orderDate).toLocaleDateString()}
                        </td>
                        <td className="py-2.5 px-3 font-semibold text-slate-900">{p.supplier?.name}</td>
                        <td className="py-2.5 px-3 text-slate-500">{p.supplier?.companyName || "-"}</td>
                        <td className="py-2.5 px-3 text-slate-600">
                          {p.items?.map((it: any) => `${it.product?.name} (x${it.quantityOrdered})`).join(", ") || "-"}
                        </td>
                        <td className="py-2.5 px-3 text-right font-black text-slate-900">
                          {formatCurrency(p.totalAmount)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-bold text-emerald-700">
                          {formatCurrency(p.paidAmount)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-black text-rose-600">
                          {formatCurrency(p.balanceAmount)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
                <tfoot className="bg-slate-100 font-bold text-slate-900 border-t-2 border-slate-300">
                  <tr>
                    <td colSpan={5} className="py-3 px-3 text-right uppercase">
                      Total Purchases:
                    </td>
                    <td className="py-3 px-3 text-right font-black text-sm text-slate-900">
                      Rs. {totalPurchasesBill.toFixed(2)}
                    </td>
                    <td className="py-3 px-3 text-right font-black text-sm text-emerald-700">
                      {formatCurrency(totalPurchasesPaid)}
                    </td>
                    <td className="py-3 px-3 text-right font-black text-sm text-rose-600">
                      {formatCurrency(totalPurchasesRemaining)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}

        {/* 4. EXPENSES REPORT VIEW */}
        {activeTab === "expenses" && (
          <div className="space-y-5">
            <div className="p-4 bg-slate-50 rounded-xl border flex justify-between items-center">
              <div>
                <span className="text-xs text-slate-500 font-semibold uppercase">Total Expenses in Period</span>
                <div className="text-xl font-black text-rose-600">
                  {formatCurrency(totalExpensesAmount)}
                </div>
              </div>
              <div className="text-right text-xs text-slate-500">
                {expenseData.length} Expense Transactions Recorded
              </div>
            </div>

            <div className="overflow-x-auto border rounded-xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 text-slate-700 font-bold border-b">
                  <tr>
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3">Voucher #</th>
                    <th className="py-2.5 px-3">Category (Head of Account)</th>
                    <th className="py-2.5 px-3">Description</th>
                    <th className="py-2.5 px-3">Mode</th>
                    <th className="py-2.5 px-3 text-right">Amount (Rs.)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-400">
                        Loading expenses...
                      </td>
                    </tr>
                  ) : expenseData.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-400">
                        No expenses logged in this range.
                      </td>
                    </tr>
                  ) : (
                    expenseData.map((e) => (
                      <tr key={e.id} className="hover:bg-slate-50">
                        <td className="py-2.5 px-3 text-slate-500 whitespace-nowrap">
                          {new Date(e.date).toLocaleDateString()}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-slate-600">{e.expenseNumber}</td>
                        <td className="py-2.5 px-3 font-semibold text-slate-800">{e.category}</td>
                        <td className="py-2.5 px-3 text-slate-600">{e.description}</td>
                        <td className="py-2.5 px-3 text-slate-500">{e.paymentMethod}</td>
                        <td className="py-2.5 px-3 text-right font-black text-rose-600">
                          {formatCurrency(e.amount)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
                <tfoot className="bg-slate-100 font-bold text-slate-900 border-t-2 border-slate-300">
                  <tr>
                    <td colSpan={5} className="py-3 px-3 text-right uppercase">
                      Total Outflow:
                    </td>
                    <td className="py-3 px-3 text-right font-black text-sm text-rose-600">
                      {formatCurrency(totalExpensesAmount)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}

        {/* 5. CUSTOMER KHATA RECEIVABLES REPORT */}
        {activeTab === "customers" && (
          <div className="space-y-5">
            <div className="p-4 bg-amber-50 rounded-xl border border-amber-200 flex justify-between items-center">
              <div>
                <span className="text-xs text-amber-900 font-semibold uppercase">Total Customer Udhaar Outstanding</span>
                <div className="text-xl font-black text-amber-700">
                  {formatCurrency(totalCustomerReceivables)}
                </div>
              </div>
              <div className="text-right text-xs text-amber-800">
                {customerData.filter((c) => c.balance > 0).length} Customers with Pending Balances
              </div>
            </div>

            <div className="overflow-x-auto border rounded-xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 text-slate-700 font-bold border-b">
                  <tr>
                    <th className="py-2.5 px-3">Customer Name</th>
                    <th className="py-2.5 px-3">Phone</th>
                    <th className="py-2.5 px-3">Address</th>
                    <th className="py-2.5 px-3 text-right">Credit Limit</th>
                    <th className="py-2.5 px-3 text-right">Udhaar Balance (Rs.)</th>
                    <th className="py-2.5 px-3 text-right print:hidden">Audit Report</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {customerData.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-50 transition">
                      <td className="py-2.5 px-3 font-bold text-slate-900">{c.name}</td>
                      <td className="py-2.5 px-3 font-mono text-slate-600">{c.phone || "-"}</td>
                      <td className="py-2.5 px-3 text-slate-500">{c.address || "-"}</td>
                      <td className="py-2.5 px-3 text-right text-slate-600">
                        {formatCurrency(c.creditLimit || 0)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-black text-amber-700">
                        {formatCurrency(c.balance)}
                      </td>
                      <td className="py-2.5 px-3 text-right print:hidden whitespace-nowrap">
                        <button
                          onClick={() => handleOpenCustomerStatement(c.id)}
                          title="View & Print Individual Customer Report (مکمل خریداری و کھاتہ رپورٹ)"
                          className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 rounded-lg text-xs font-bold inline-flex items-center space-x-1 transition border border-amber-200"
                        >
                          <FileText className="w-3.5 h-3.5 text-amber-700" />
                          <span>Customer Report</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-slate-100 font-bold text-slate-900 border-t-2 border-slate-300">
                  <tr>
                    <td colSpan={4} className="py-3 px-3 text-right uppercase">
                      Total Receivables:
                    </td>
                    <td className="py-3 px-3 text-right font-black text-sm text-amber-700">
                      {formatCurrency(totalCustomerReceivables)}
                    </td>
                    <td className="print:hidden"></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}

        {/* 6. SUPPLIER PAYABLES REPORT */}
        {activeTab === "suppliers" && (
          <div className="space-y-5">
            <div className="p-4 bg-rose-50 rounded-xl border border-rose-200 flex justify-between items-center">
              <div>
                <span className="text-xs text-rose-900 font-semibold uppercase">Total Vendor Payables Outstanding</span>
                <div className="text-xl font-black text-rose-600">
                  {formatCurrency(totalSupplierPayables)}
                </div>
              </div>
              <div className="text-right text-xs text-rose-800">
                {supplierData.filter((s) => s.currentBalance > 0).length} Suppliers with Pending Bills
              </div>
            </div>

            <div className="overflow-x-auto border rounded-xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 text-slate-700 font-bold border-b">
                  <tr>
                    <th className="py-2.5 px-3">Supplier Name</th>
                    <th className="py-2.5 px-3">Company / Mill</th>
                    <th className="py-2.5 px-3">Phone</th>
                    <th className="py-2.5 px-3">City / Address</th>
                    <th className="py-2.5 px-3 text-right">Payable Balance (Rs.)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {supplierData.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-50">
                      <td className="py-2.5 px-3 font-bold text-slate-900">{s.name}</td>
                      <td className="py-2.5 px-3 text-slate-600">{s.companyName || "-"}</td>
                      <td className="py-2.5 px-3 font-mono text-slate-600">{s.phone || "-"}</td>
                      <td className="py-2.5 px-3 text-slate-500">{s.address || "-"}</td>
                      <td className="py-2.5 px-3 text-right font-black text-rose-600">
                        {formatCurrency(s.currentBalance)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-slate-100 font-bold text-slate-900 border-t-2 border-slate-300">
                  <tr>
                    <td colSpan={4} className="py-3 px-3 text-right uppercase">
                      Total Payables:
                    </td>
                    <td className="py-3 px-3 text-right font-black text-sm text-rose-600">
                      {formatCurrency(totalSupplierPayables)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}

        {/* 7. SHIFT CLOSING REGISTER (Z-REPORTS & DRAWER AUDIT) */}
        {activeTab === "shifts" && (
          <div className="space-y-6">
            {/* 5 KPI Summary Cards for Cash Drawer Reconciliation */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 flex flex-col justify-between">
                <div className="flex items-center justify-between text-slate-500 mb-1">
                  <span className="text-[11px] font-bold uppercase tracking-wider">Total Shifts</span>
                  <Clock className="w-4 h-4 text-slate-400" />
                </div>
                <div>
                  <div className="text-xl font-black text-slate-900">
                    {shiftSummary ? shiftSummary.totalShifts : shiftData.length}
                  </div>
                  <div className="text-[10px] text-slate-500 font-medium mt-0.5">
                    {shiftSummary
                      ? `${shiftSummary.openShiftsCount} Open · ${shiftSummary.closedShiftsCount} Closed`
                      : "Register Sessions"}
                  </div>
                </div>
              </div>

              <div className="bg-blue-50/50 border border-blue-200 rounded-xl p-3.5 flex flex-col justify-between">
                <div className="flex items-center justify-between text-blue-700 mb-1">
                  <span className="text-[11px] font-bold uppercase tracking-wider">Opening Float</span>
                  <DollarSign className="w-4 h-4 text-blue-500" />
                </div>
                <div>
                  <div className="text-xl font-black text-blue-900">
                    {formatCurrency(shiftSummary?.totalOpeningCash || 0)}
                  </div>
                  <div className="text-[10px] text-blue-600 font-medium mt-0.5">
                    Starting drawer cash
                  </div>
                </div>
              </div>

              <div className="bg-emerald-50/50 border border-emerald-200 rounded-xl p-3.5 flex flex-col justify-between">
                <div className="flex items-center justify-between text-emerald-700 mb-1">
                  <span className="text-[11px] font-bold uppercase tracking-wider">Shift Sales</span>
                  <TrendingUp className="w-4 h-4 text-emerald-500" />
                </div>
                <div>
                  <div className="text-xl font-black text-emerald-900">
                    {formatCurrency(shiftSummary?.totalSales || 0)}
                  </div>
                  <div className="text-[10px] text-emerald-600 font-medium mt-0.5">
                    Recorded invoices
                  </div>
                </div>
              </div>

              <div className="bg-indigo-50/50 border border-indigo-200 rounded-xl p-3.5 flex flex-col justify-between">
                <div className="flex items-center justify-between text-indigo-700 mb-1">
                  <span className="text-[11px] font-bold uppercase tracking-wider">Expected Cash</span>
                  <Layers className="w-4 h-4 text-indigo-500" />
                </div>
                <div>
                  <div className="text-xl font-black text-indigo-900">
                    {formatCurrency(shiftSummary?.totalExpectedCash || 0)}
                  </div>
                  <div className="text-[10px] text-indigo-600 font-medium mt-0.5">
                    Float + Cash Sales
                  </div>
                </div>
              </div>

              <div className={`border rounded-xl p-3.5 flex flex-col justify-between ${
                shiftSummary && shiftSummary.shortageCount > 0
                  ? "bg-rose-50/60 border-rose-300"
                  : shiftSummary && shiftSummary.totalDifference > 0
                  ? "bg-amber-50/60 border-amber-300"
                  : "bg-slate-50 border-slate-200"
              }`}>
                <div className="flex items-center justify-between mb-1">
                  <span className={`text-[11px] font-bold uppercase tracking-wider ${
                    shiftSummary && shiftSummary.shortageCount > 0 ? "text-rose-700" : "text-slate-700"
                  }`}>
                    Closing Counted
                  </span>
                  <DollarSign className={`w-4 h-4 ${
                    shiftSummary && shiftSummary.shortageCount > 0 ? "text-rose-500" : "text-slate-400"
                  }`} />
                </div>
                <div>
                  <div className={`text-xl font-black ${
                    shiftSummary && shiftSummary.shortageCount > 0 ? "text-rose-900" : "text-slate-900"
                  }`}>
                    {formatCurrency(shiftSummary?.totalClosingCash || 0)}
                  </div>
                  <div className={`text-[10px] font-bold mt-0.5 ${
                    shiftSummary && shiftSummary.totalDifference < 0
                      ? "text-rose-600"
                      : shiftSummary && shiftSummary.totalDifference > 0
                      ? "text-amber-600"
                      : "text-emerald-600"
                  }`}>
                    {shiftSummary && shiftSummary.totalDifference !== 0
                      ? `Net Diff: ${shiftSummary.totalDifference > 0 ? "+" : ""}${formatCurrency(shiftSummary.totalDifference)}`
                      : "Drawer Balanced"}
                  </div>
                </div>
              </div>
            </div>

            {/* Cash Shortage & Discrepancy Alert Banner */}
            {shiftSummary && shiftSummary.shortageCount > 0 && (
              <div className="bg-rose-50 border-2 border-rose-300 rounded-xl p-4 flex items-start space-x-3 text-rose-900">
                <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                <div className="flex-1 text-xs">
                  <div className="font-black text-sm text-rose-900 flex items-center space-x-1.5">
                    <span>⚠️ CASH SHORTAGE ALERT / کیش کی کمی کا الرٹ</span>
                    <span className="px-2 py-0.5 bg-rose-200 text-rose-800 rounded font-black text-xs">
                      {shiftSummary.shortageCount} Shift{shiftSummary.shortageCount > 1 ? "s" : ""} Short
                    </span>
                  </div>
                  <p className="mt-1 text-rose-800">
                    A total cash shortage of <strong className="font-black text-rose-950 underline">{formatCurrency(shiftSummary.totalShortageAmount)}</strong> was reported across {shiftSummary.shortageCount} shift closings. Counted cash was less than system expected cash. Please review the cashier details below.
                  </p>
                </div>
              </div>
            )}

            {shiftSummary && shiftSummary.totalDifference > 0 && (
              <div className="bg-amber-50 border border-amber-300 rounded-xl p-3.5 flex items-start space-x-3 text-amber-900">
                <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="text-xs">
                  <div className="font-bold text-amber-900">Cash Surplus Recorded (اضافی کیش)</div>
                  <p className="text-amber-800 mt-0.5">
                    Physical closing drawer cash exceeded expected cash by <strong className="font-bold">+{formatCurrency(shiftSummary.totalDifference)}</strong>.
                  </p>
                </div>
              </div>
            )}

            {shiftSummary && shiftSummary.closedShiftsCount > 0 && shiftSummary.totalDifference === 0 && (
              <div className="bg-emerald-50 border border-emerald-300 rounded-xl p-3 flex items-center space-x-3 text-emerald-900">
                <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
                <div className="text-xs font-semibold">
                  All {shiftSummary.closedShiftsCount} closed drawer shifts perfectly balanced. Physical counted cash matched system expected cash with zero discrepancy.
                </div>
              </div>
            )}

            {/* Shifts Audit Table */}
            <div className="overflow-x-auto border rounded-xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 text-slate-700 font-bold border-b">
                  <tr>
                    <th className="py-2.5 px-3">Shift #</th>
                    <th className="py-2.5 px-3">Cashier</th>
                    <th className="py-2.5 px-3">Opened At</th>
                    <th className="py-2.5 px-3">Closed At</th>
                    <th className="py-2.5 px-3 text-right">Opening Cash</th>
                    <th className="py-2.5 px-3 text-right">Sales Recorded</th>
                    <th className="py-2.5 px-3 text-right">Expected Drawer</th>
                    <th className="py-2.5 px-3 text-right">Closing Drawer</th>
                    <th className="py-2.5 px-3 text-right">Difference (فرق)</th>
                    <th className="py-2.5 px-3 text-center">Status</th>
                    <th className="py-2.5 px-3">Remarks / Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr>
                      <td colSpan={11} className="py-8 text-center text-slate-400">
                        Loading shift reports...
                      </td>
                    </tr>
                  ) : shiftData.length === 0 ? (
                    <tr>
                      <td colSpan={11} className="py-8 text-center text-slate-400">
                        No shifts recorded for the selected period.
                      </td>
                    </tr>
                  ) : (
                    shiftData.map((sh) => (
                      <tr key={sh.id} className="hover:bg-slate-50">
                        <td className="py-2.5 px-3 font-mono font-bold text-slate-900">
                          #{sh.shiftNumber || "1"}
                        </td>
                        <td className="py-2.5 px-3 font-medium text-slate-800">
                          {sh.cashier?.fullName || sh.cashier?.username}
                        </td>
                        <td className="py-2.5 px-3 text-slate-500 whitespace-nowrap">
                          {new Date(sh.openedAt).toLocaleString()}
                        </td>
                        <td className="py-2.5 px-3 text-slate-500 whitespace-nowrap">
                          {sh.closedAt ? new Date(sh.closedAt).toLocaleString() : "Still Open"}
                        </td>
                        <td className="py-2.5 px-3 text-right font-medium text-slate-700">
                          {formatCurrency(sh.openingCash)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-black text-emerald-800">
                          {formatCurrency(sh.totalSalesAmount)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-semibold text-slate-800">
                          {formatCurrency(sh.systemExpectedCash || sh.openingCash)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-bold text-slate-900">
                          {sh.closingCash !== null && sh.closingCash !== undefined
                            ? formatCurrency(sh.closingCash)
                            : "-"}
                        </td>
                        <td
                          className={`py-2.5 px-3 text-right font-black ${
                            sh.cashDifference === 0
                              ? "text-emerald-700"
                              : sh.cashDifference < 0
                              ? "text-rose-600"
                              : "text-amber-700"
                          }`}
                        >
                          {sh.cashDifference !== null && sh.cashDifference !== undefined
                            ? (sh.cashDifference > 0 ? `+${formatCurrency(sh.cashDifference)}` : formatCurrency(sh.cashDifference))
                            : "-"}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              sh.status === "CLOSED"
                                ? "bg-slate-100 text-slate-700"
                                : "bg-emerald-100 text-emerald-800"
                            }`}
                          >
                            {sh.status}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-slate-500 text-[11px] max-w-xs truncate" title={sh.notes || ""}>
                          {sh.notes || "-"}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Report Footer / Signature Line for Audit */}
        <div className="pt-8 border-t border-slate-200 grid grid-cols-2 text-xs text-slate-500">
          <div>
            <div>Prepared By: ___________________________</div>
            <div className="text-[10px] text-slate-400 mt-1">Al-Afhhihram House Cashier / Accountant</div>
          </div>
          <div className="text-right">
            <div>Verified / Approved By: ___________________________</div>
            <div className="text-[10px] text-slate-400 mt-1">Store Owner / General Manager</div>
          </div>
        </div>
      </div>

      {/* =========================================================================
          1. DETAILED INVOICE MODAL (مکمل انوائس تفصیلات: پروڈکٹس، مقدار، ریٹ، رعایت)
         ========================================================================= */}
      {selectedInvoiceForModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-6 space-y-5 my-8">
            <div className="flex justify-between items-start border-b pb-3">
              <div>
                <div className="flex items-center space-x-2">
                  <FileText className="w-6 h-6 text-emerald-600" />
                  <h3 className="font-black text-lg text-slate-900">
                    Invoice Details (انوائس مکمل تفصیل)
                  </h3>
                  {selectedInvoiceForModal.status === "REFUNDED" ? (
                    <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-700">
                      Returned / واپس شدہ
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                      Completed Sale
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 font-mono mt-0.5">
                  Invoice #{selectedInvoiceForModal.invoiceNumber} • Date: {new Date(selectedInvoiceForModal.createdAt).toLocaleString()}
                </p>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setThermalReceiptInvoice(selectedInvoiceForModal)}
                  className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-lg flex items-center space-x-1 transition shadow-sm"
                >
                  <Printer className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Print Receipt</span>
                </button>
                <button
                  onClick={() => setSelectedInvoiceForModal(null)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Customer & Cashier Header */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-3.5 rounded-xl border text-xs">
              <div>
                <span className="text-slate-400 block font-semibold text-[10px] uppercase">Customer (گاہک)</span>
                <span className="font-bold text-slate-900">{selectedInvoiceForModal.customerName || "Walk-in"}</span>
                {selectedInvoiceForModal.customerPhone && (
                  <span className="text-[10px] text-slate-500 block">{selectedInvoiceForModal.customerPhone}</span>
                )}
              </div>
              <div>
                <span className="text-slate-400 block font-semibold text-[10px] uppercase">Cashier (کیشیئر)</span>
                <span className="font-bold text-slate-900">{selectedInvoiceForModal.cashier?.fullName || "Staff"}</span>
              </div>
              <div>
                <span className="text-slate-400 block font-semibold text-[10px] uppercase">Payment Method</span>
                <span className="font-bold text-slate-900">{selectedInvoiceForModal.paymentMethod}</span>
              </div>
              <div>
                <span className="text-slate-400 block font-semibold text-[10px] uppercase">Remaining Udhaar</span>
                <span className={`font-black ${selectedInvoiceForModal.balanceDue > 0 ? "text-amber-700" : "text-emerald-700"}`}>
                  {formatCurrency(selectedInvoiceForModal.balanceDue || 0)}
                </span>
              </div>
            </div>

            {/* Itemized List Table (کتنے پیس ہیں، کیا پروڈکٹ ہے) */}
            <div className="border rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 text-slate-700 font-bold border-b">
                  <tr>
                    <th className="py-2.5 px-3">#</th>
                    <th className="py-2.5 px-3">Product Name & SKU</th>
                    <th className="py-2.5 px-3 text-center">Qty (تعداد / پیس)</th>
                    <th className="py-2.5 px-3 text-right">Unit Price</th>
                    <th className="py-2.5 px-3 text-right">Discount</th>
                    <th className="py-2.5 px-3 text-right">Total (Rs.)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {selectedInvoiceForModal.items?.map((it: any, idx: number) => (
                    <tr key={it.id || idx} className="hover:bg-slate-50">
                      <td className="py-2.5 px-3 text-slate-400 font-mono">{idx + 1}</td>
                      <td className="py-2.5 px-3">
                        <div className="font-bold text-slate-900">{it.productName}</div>
                        <div className="text-[10px] text-slate-400 font-mono">{it.sku}</div>
                      </td>
                      <td className="py-2.5 px-3 text-center font-black text-slate-800">
                        {it.quantity} pcs
                      </td>
                      <td className="py-2.5 px-3 text-right text-slate-600">
                        {formatCurrency(it.unitPrice)}
                      </td>
                      <td className="py-2.5 px-3 text-right text-slate-500">
                        {it.discountAmount > 0 ? formatCurrency(it.discountAmount) : "-"}
                      </td>
                      <td className="py-2.5 px-3 text-right font-bold text-slate-900">
                        {formatCurrency(it.subtotalAmount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Invoice Totals Summary */}
            <div className="bg-slate-50 p-4 rounded-xl border space-y-1.5 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal ({selectedInvoiceForModal.items?.reduce((a: number, b: any) => a + (b.quantity || 1), 0)} items):</span>
                <span className="font-medium">{formatCurrency(selectedInvoiceForModal.subtotal)}</span>
              </div>
              {selectedInvoiceForModal.discountAmount > 0 && (
                <div className="flex justify-between text-rose-600">
                  <span>Bill Discount:</span>
                  <span className="font-medium">- {formatCurrency(selectedInvoiceForModal.discountAmount)}</span>
                </div>
              )}
              {selectedInvoiceForModal.taxAmount > 0 && (
                <div className="flex justify-between text-slate-600">
                  <span>Tax ({selectedInvoiceForModal.taxRate}%):</span>
                  <span className="font-medium">{formatCurrency(selectedInvoiceForModal.taxAmount)}</span>
                </div>
              )}
              <div className="flex justify-between font-black text-sm text-slate-900 pt-2 border-t border-slate-200">
                <span>Grand Total:</span>
                <span className="text-emerald-700">{formatCurrency(selectedInvoiceForModal.totalAmount)}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Paid / Tendered:</span>
                <span>{formatCurrency(selectedInvoiceForModal.amountTendered)}</span>
              </div>
              {selectedInvoiceForModal.changeDue > 0 && (
                <div className="flex justify-between text-slate-600">
                  <span>Change Returned:</span>
                  <span>{formatCurrency(selectedInvoiceForModal.changeDue)}</span>
                </div>
              )}
            </div>

            {/* Return Action if not already refunded */}
            <div className="flex justify-between items-center pt-2 border-t">
              <div>
                {selectedInvoiceForModal.status !== "REFUNDED" ? (
                  <button
                    onClick={() => {
                      setReturnInvoice(selectedInvoiceForModal);
                      setReturnReason("Customer Return / واپسی");
                    }}
                    className="px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold inline-flex items-center space-x-1.5 transition"
                  >
                    <RotateCcw className="w-4 h-4" />
                    <span>Return / Refund This Sale (مال واپس کریں)</span>
                  </button>
                ) : (
                  <div className="text-xs text-rose-600 font-bold flex items-center space-x-1">
                    <CheckCircle className="w-4 h-4" />
                    <span>This sale was refunded and stock restored to inventory.</span>
                  </div>
                )}
              </div>
              <button
                onClick={() => setSelectedInvoiceForModal(null)}
                className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          2. SALES RETURN CONFIRMATION MODAL (سیل واپسی، اسٹاک ری اسٹور اور کھاتہ ایڈجسٹمنٹ)
         ========================================================================= */}
      {returnInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center space-x-3 text-rose-600 border-b pb-3">
              <div className="p-2 bg-rose-100 rounded-xl">
                <AlertCircle className="w-6 h-6 text-rose-600" />
              </div>
              <div>
                <h3 className="font-bold text-base text-slate-900">
                  Confirm Sales Return (سیلز واپسی تصدیق)
                </h3>
                <p className="text-xs text-slate-500">
                  Invoice #{returnInvoice.invoiceNumber}
                </p>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <p className="text-slate-600">
                Are you sure you want to process a return for this sale?
              </p>
              <div className="bg-rose-50 border border-rose-200 p-3 rounded-xl space-y-1 text-rose-900">
                <div className="font-bold">What will happen automatically:</div>
                <div>• All <strong>{returnInvoice.items?.reduce((a: number, b: any) => a + (b.quantity || 1), 0)} items</strong> will be added back into inventory stock.</div>
                <div>• Audit Stock Movement log (<code className="font-mono text-[10px]">STOCK_IN_RETURN</code>) will be recorded.</div>
                {returnInvoice.customerId && (
                  <div>• Customer khata udhaar balance will be reduced accordingly.</div>
                )}
                <div>• Invoice status will become <span className="font-bold text-rose-700">REFUNDED</span>.</div>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  Reason for Return (واپسی کی وجہ):
                </label>
                <input
                  type="text"
                  value={returnReason}
                  onChange={(e) => setReturnReason(e.target.value)}
                  placeholder="e.g. Size exchange, defective item, customer returned"
                  className="w-full px-3 py-2 border rounded-xl bg-slate-50 text-xs focus:ring-2 focus:ring-rose-500 outline-none"
                />
              </div>

              <div className="flex justify-between items-center bg-slate-100 p-3 rounded-xl font-bold">
                <span className="text-slate-700">Refund Amount:</span>
                <span className="text-base text-rose-700">Rs. {returnInvoice.totalAmount.toFixed(2)}</span>
              </div>
            </div>

            <div className="flex space-x-2 pt-2 border-t">
              <button
                onClick={handleProcessReturn}
                disabled={isSubmittingReturn}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white rounded-xl font-bold text-xs flex items-center justify-center space-x-1.5 transition"
              >
                <RotateCcw className="w-4 h-4" />
                <span>{isSubmittingReturn ? "Restocking Items..." : "Confirm Return & Restock"}</span>
              </button>
              <button
                onClick={() => setReturnInvoice(null)}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold text-xs transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          3. THERMAL RECEIPT MODAL (80mm / 58mm رول رسید پرنٹ)
         ========================================================================= */}
      {thermalReceiptInvoice && (
        <ThermalReceipt
          invoiceNumber={thermalReceiptInvoice.invoiceNumber}
          date={thermalReceiptInvoice.createdAt}
          cashierName={thermalReceiptInvoice.cashier?.fullName || "Staff"}
          customerName={thermalReceiptInvoice.customerName}
          customerPhone={thermalReceiptInvoice.customerPhone}
          items={thermalReceiptInvoice.items?.map((it: any) => ({
            name: it.productName,
            sku: it.sku,
            quantity: it.quantity,
            unitPrice: it.unitPrice,
            discountAmount: it.discountAmount,
            subtotal: it.subtotalAmount,
          })) || []}
          subtotal={thermalReceiptInvoice.subtotal}
          discountAmount={thermalReceiptInvoice.discountAmount}
          taxRate={thermalReceiptInvoice.taxRate}
          taxAmount={thermalReceiptInvoice.taxAmount}
          totalAmount={thermalReceiptInvoice.totalAmount}
          paymentMethod={thermalReceiptInvoice.paymentMethod}
          amountTendered={thermalReceiptInvoice.amountTendered}
          changeDue={thermalReceiptInvoice.changeDue}
          balanceDue={thermalReceiptInvoice.balanceDue}
          onClose={() => setThermalReceiptInvoice(null)}
        />
      )}

      {/* =========================================================================
          4. CUSTOMER INDIVIDUAL AUDIT & PURCHASES REPORT MODAL
             (کسٹمر نے آج تک کتنا مال خریدا، کس تاریخ کو کیا چیز لی، کتنے ادا کیے اور کتنے بقایا ہیں)
         ========================================================================= */}
      {customerStatementData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full p-6 sm:p-8 space-y-6 my-8 max-h-[92vh] overflow-y-auto">
            {/* Modal Actions & Header */}
            <div className="flex justify-between items-start border-b pb-4">
              <div>
                <div className="flex items-center space-x-2">
                  <Users className="w-6 h-6 text-amber-600" />
                  <h3 className="font-black text-xl text-slate-900 tracking-tight">
                    Individual Customer Purchases & Khata Report
                  </h3>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  تفصیلی کسٹمر رپورٹ: آج تک خریدا گیا سامان، پروڈکٹس، ادائیگی اور بقایا ادھار
                </p>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => window.print()}
                  className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 transition shadow-sm"
                >
                  <Printer className="w-4 h-4 text-emerald-400" />
                  <span>Print Customer Report (رپورٹ پرنٹ کریں)</span>
                </button>
                <button
                  onClick={() => setCustomerStatementData(null)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Customer Details & Balance KPI Summary */}
            <div id="customer-report-printable-area" className="space-y-6">
              {/* Store & Customer Top Banner */}
              <div className="border border-slate-200 bg-slate-50 p-4 rounded-xl flex flex-col sm:flex-row justify-between gap-4">
                <div>
                  <h4 className="font-black text-base text-slate-900 uppercase">
                    {customerStatementData.name}
                  </h4>
                  <div className="text-xs text-slate-600 space-y-0.5 mt-1">
                    <div>Phone / Mobile: <strong className="font-mono">{customerStatementData.phone || "Not provided"}</strong></div>
                    <div>Address: <strong>{customerStatementData.address || "Local Customer"}</strong></div>
                    <div>Customer ID: <span className="font-mono text-[10px] text-slate-400">{customerStatementData.id}</span></div>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-right">
                  <div className="bg-white p-3 rounded-lg border">
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">Total Purchases Ever</span>
                    <span className="text-base font-black text-emerald-700">
                      {formatCurrency((customerStatementData.sales || []).reduce((acc: number, s: any) => acc + (s.status !== "REFUNDED" ? s.totalAmount : 0), 0))}
                    </span>
                    <span className="text-[10px] text-slate-400 block">
                      {(customerStatementData.sales || []).length} Invoices
                    </span>
                  </div>

                  <div className="bg-white p-3 rounded-lg border">
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">Total Cash Paid</span>
                    <span className="text-base font-black text-slate-900">
                      {formatCurrency((customerStatementData.sales || []).reduce((acc: number, s: any) => acc + (s.status !== "REFUNDED" ? (s.totalAmount - (s.balanceDue || 0)) : 0), 0))}
                    </span>
                  </div>

                  <div className="bg-amber-50 p-3 rounded-lg border border-amber-200 col-span-2 sm:col-span-1">
                    <span className="text-[10px] text-amber-900 font-bold uppercase block">Current Pending Balance</span>
                    <span className="text-base font-black text-amber-700">
                      {formatCurrency(customerStatementData.balance)}
                    </span>
                    {customerStatementData.paymentDueDate && (
                      <span className="text-[10px] text-amber-800 font-semibold block">
                        Due: {new Date(customerStatementData.paymentDueDate).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* SECTION A: DETAILED PRODUCTS PURCHASED (کس تاریخ کو کون سا پروڈکٹ لیا، کتنے پیس اور کیا ریٹ تھا) */}
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b pb-2">
                  <h4 className="font-black text-sm text-slate-900 flex items-center space-x-1.5">
                    <ShoppingBag className="w-4 h-4 text-emerald-600" />
                    <span>Itemized Products Purchase Log (کس تاریخ کو کونسی پروڈکٹ کتنی لی)</span>
                  </h4>
                  <span className="text-xs text-slate-500 font-medium">
                    Detailed breakdown of each item purchased
                  </span>
                </div>

                <div className="border rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 text-slate-700 font-bold border-b">
                      <tr>
                        <th className="py-2.5 px-3">Date</th>
                        <th className="py-2.5 px-3">Invoice #</th>
                        <th className="py-2.5 px-3">Product Name & SKU</th>
                        <th className="py-2.5 px-3 text-center">Qty (تعداد)</th>
                        <th className="py-2.5 px-3 text-right">Unit Rate (Rs.)</th>
                        <th className="py-2.5 px-3 text-right">Discount</th>
                        <th className="py-2.5 px-3 text-right">Line Total (Rs.)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {(customerStatementData.sales || []).flatMap((sale: any) =>
                        (sale.items || []).map((item: any) => ({
                          ...item,
                          saleDate: sale.createdAt,
                          invoiceNumber: sale.invoiceNumber,
                          saleStatus: sale.status,
                        }))
                      ).length === 0 ? (
                        <tr>
                          <td colSpan={7} className="py-6 text-center text-slate-400">
                            No products purchased by this customer yet.
                          </td>
                        </tr>
                      ) : (
                        (customerStatementData.sales || []).flatMap((sale: any) =>
                          (sale.items || []).map((item: any, idx: number) => (
                            <tr key={`${sale.id}-${item.id || idx}`} className="hover:bg-slate-50">
                              <td className="py-2 px-3 text-slate-500 whitespace-nowrap text-[11px]">
                                {new Date(sale.createdAt).toLocaleDateString()}
                              </td>
                              <td className="py-2 px-3 font-mono font-bold text-slate-900 text-[11px]">
                                {sale.invoiceNumber}
                                {sale.status === "REFUNDED" && (
                                  <span className="ml-1 text-[9px] text-rose-600 font-bold">(Returned)</span>
                                )}
                              </td>
                              <td className="py-2 px-3">
                                <div className="font-bold text-slate-900">{item.productName}</div>
                                <div className="text-[10px] text-slate-400 font-mono">{item.sku}</div>
                              </td>
                              <td className="py-2 px-3 text-center font-bold text-slate-800">
                                {item.quantity} pcs
                              </td>
                              <td className="py-2 px-3 text-right text-slate-600">
                                {formatCurrency(item.unitPrice)}
                              </td>
                              <td className="py-2 px-3 text-right text-slate-500">
                                {item.discountAmount > 0 ? formatCurrency(item.discountAmount) : "-"}
                              </td>
                              <td className="py-2 px-3 text-right font-black text-slate-900">
                                {formatCurrency(item.subtotalAmount)}
                              </td>
                            </tr>
                          ))
                        )
                      )}
                    </tbody>
                    <tfoot className="bg-slate-50 font-bold text-slate-900 border-t">
                      <tr>
                        <td colSpan={3} className="py-2.5 px-3 text-right uppercase">
                          Total Items Purchased:
                        </td>
                        <td className="py-2.5 px-3 text-center font-black text-emerald-800">
                          {(customerStatementData.sales || []).reduce(
                            (acc: number, s: any) =>
                              acc + (s.items || []).reduce((sum: number, it: any) => sum + (it.quantity || 1), 0),
                            0
                          )} pcs
                        </td>
                        <td colSpan={2} className="py-2.5 px-3 text-right uppercase">
                          Total Products Amount:
                        </td>
                        <td className="py-2.5 px-3 text-right font-black text-emerald-800">
                          {formatCurrency((customerStatementData.sales || []).reduce((acc: number, s: any) => acc + (s.status !== "REFUNDED" ? s.totalAmount : 0), 0))}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              {/* SECTION B: INVOICES & PAYMENT AUDIT (کتنے ادا کیے، کتنے بقایا ہیں) */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between border-b pb-2">
                  <h4 className="font-black text-sm text-slate-900 flex items-center space-x-1.5">
                    <Receipt className="w-4 h-4 text-emerald-600" />
                    <span>Invoices Bill & Khata Ledger Audit (بل، ادائیگیاں اور بقایا جات)</span>
                  </h4>
                  <span className="text-xs text-slate-500 font-medium">
                    Audit of total bill, paid amount, and remaining due
                  </span>
                </div>

                <div className="border rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 text-slate-700 font-bold border-b">
                      <tr>
                        <th className="py-2.5 px-3">Date</th>
                        <th className="py-2.5 px-3">Invoice #</th>
                        <th className="py-2.5 px-3">Payment Mode</th>
                        <th className="py-2.5 px-3 text-center">Status</th>
                        <th className="py-2.5 px-3 text-right">Total Bill (Rs.)</th>
                        <th className="py-2.5 px-3 text-right">Paid Amount (Rs.)</th>
                        <th className="py-2.5 px-3 text-right">Remaining Due (Rs.)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {(customerStatementData.sales || []).length === 0 ? (
                        <tr>
                          <td colSpan={7} className="py-6 text-center text-slate-400">
                            No billing transactions found.
                          </td>
                        </tr>
                      ) : (
                        (customerStatementData.sales || []).map((sale: any) => {
                          const paidForThisInvoice = sale.totalAmount - (sale.balanceDue || 0);
                          return (
                            <tr key={sale.id} className="hover:bg-slate-50">
                              <td className="py-2.5 px-3 text-slate-500 whitespace-nowrap text-[11px]">
                                {new Date(sale.createdAt).toLocaleString()}
                              </td>
                              <td className="py-2.5 px-3 font-mono font-bold text-slate-900">
                                {sale.invoiceNumber}
                              </td>
                              <td className="py-2.5 px-3 font-semibold text-slate-700">
                                {sale.paymentMethod}
                              </td>
                              <td className="py-2.5 px-3 text-center">
                                {sale.status === "REFUNDED" ? (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-700">
                                    Refunded
                                  </span>
                                ) : sale.balanceDue > 0 ? (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                                    Partial / Udhaar
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                                    Fully Paid
                                  </span>
                                )}
                              </td>
                              <td className="py-2.5 px-3 text-right font-black text-slate-900">
                                {formatCurrency(sale.totalAmount)}
                              </td>
                              <td className="py-2.5 px-3 text-right font-bold text-emerald-700">
                                {formatCurrency(paidForThisInvoice)}
                              </td>
                              <td className={`py-2.5 px-3 text-right font-black ${sale.balanceDue > 0 ? "text-amber-700" : "text-slate-400"}`}>
                                {formatCurrency(sale.balanceDue || 0)}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                    <tfoot className="bg-slate-100 font-bold text-slate-900 border-t-2 border-slate-300">
                      <tr>
                        <td colSpan={4} className="py-2.5 px-3 text-right uppercase">
                          Summary Balance Position:
                        </td>
                        <td className="py-2.5 px-3 text-right font-black text-slate-900">
                          {formatCurrency((customerStatementData.sales || []).reduce((acc: number, s: any) => acc + (s.status !== "REFUNDED" ? s.totalAmount : 0), 0))}
                        </td>
                        <td className="py-2.5 px-3 text-right font-black text-emerald-700">
                          {formatCurrency((customerStatementData.sales || []).reduce((acc: number, s: any) => acc + (s.status !== "REFUNDED" ? (s.totalAmount - (s.balanceDue || 0)) : 0), 0))}
                        </td>
                        <td className="py-2.5 px-3 text-right font-black text-amber-700">
                          {formatCurrency(customerStatementData.balance)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              {/* Signature Line for Audit Print */}
              <div className="pt-6 border-t border-slate-200 grid grid-cols-2 text-xs text-slate-500 print:grid">
                <div>
                  <div>Accountant Signature: ___________________________</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">Al-Afhhihram House Khata Dept</div>
                </div>
                <div className="text-right">
                  <div>Customer Signature: ___________________________</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">{customerStatementData.name}</div>
                </div>
              </div>
            </div>

            {/* Modal Bottom Buttons */}
            <div className="flex justify-between items-center pt-3 border-t">
              <span className="text-xs text-slate-500">
                You can print this document directly using the print button above.
              </span>
              <button
                onClick={() => setCustomerStatementData(null)}
                className="px-6 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition"
              >
                Close Report
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
