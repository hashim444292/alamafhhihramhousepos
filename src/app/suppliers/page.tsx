"use client";

import React, { useState, useEffect } from "react";
import {
  Truck,
  PlusCircle,
  Search,
  DollarSign,
  FileText,
  Printer,
  X,
  CreditCard,
  PackagePlus,
  ArrowDownRight,
  ArrowUpRight,
  Edit2,
  Trash2,
  AlertCircle,
  CheckCircle,
  RefreshCw,
  Eye,
  ShoppingCart,
  Calendar,
  Clock,
  BellRing,
} from "lucide-react";
import { useAuthStore } from "@/store/auth-store";
import { formatCurrency, formatNumber } from "@/lib/format-utils";

export default function SuppliersPage() {
  const { user } = useAuthStore();
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [rightTab, setRightTab] = useState<"LEDGER" | "PURCHASES">("LEDGER");
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Selected Supplier for Ledger / Detail view
  const [activeSupplier, setActiveSupplier] = useState<any | null>(null);

  // Add / Edit Supplier Modal
  const [supplierModalOpen, setSupplierModalOpen] = useState(false);
  const [editingSupplierId, setEditingSupplierId] = useState<string | null>(null);
  const [formName, setFormName] = useState("");
  const [formCompany, setFormCompany] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formAddress, setFormAddress] = useState("");
  const [formInitialBalance, setFormInitialBalance] = useState<number>(0);
  const [formPaymentDueDate, setFormPaymentDueDate] = useState("");
  const [formPaymentTermsDays, setFormPaymentTermsDays] = useState<number>(0);

  // Record Purchase Bill Modal
  const [purchaseModalOpen, setPurchaseModalOpen] = useState(false);
  const [selectedSupplierForPurchase, setSelectedSupplierForPurchase] = useState<any | null>(null);
  const [billNumber, setBillNumber] = useState("");
  const [purchaseItems, setPurchaseItems] = useState<
    Array<{ productId: string; quantity: number; unitCost: number }>
  >([]);
  const [purchasePaidAmount, setPurchasePaidAmount] = useState<number>(0);
  const [purchasePaymentMethod, setPurchasePaymentMethod] = useState("BANK_TRANSFER");
  const [purchaseDueDate, setPurchaseDueDate] = useState("");
  const [purchaseDueDaysPreset, setPurchaseDueDaysPreset] = useState("custom");
  const [purchaseNotes, setPurchaseNotes] = useState("");

  // Record Payment to Vendor Modal
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [selectedSupplierForPayment, setSelectedSupplierForPayment] = useState<any | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState("CASH");
  const [paymentNextDueDate, setPaymentNextDueDate] = useState("");
  const [paymentNotes, setPaymentNotes] = useState("");

  // Date Range Filter for Ledger Print
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const fetchSuppliers = async (silent: boolean = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await fetch("/api/suppliers");
      const data = await res.json();
      if (data.success) {
        setSuppliers(data.suppliers);
      }
    } catch (e) {
      console.error(e);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const fetchProducts = async () => {
    try {
      const res = await fetch("/api/products");
      const data = await res.json();
      if (data.success) {
        setProducts(data.products);
      }
    } catch (e) {
      // ignore
    }
  };

  const fetchSupplierDetails = async (id: string, silent: boolean = false) => {
    try {
      const res = await fetch(`/api/suppliers/${id}`);
      const data = await res.json();
      if (data.success) {
        setActiveSupplier(data.supplier);
      }
    } catch (e) {
      if (!silent) alert("Failed to load supplier details");
    }
  };

  useEffect(() => {
    fetchSuppliers();
    fetchProducts();
  }, []);

  // Automatic real-time polling every 4 seconds so data updates live without manual page refresh
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      fetchSuppliers(true);
      if (activeSupplier?.id) {
        fetchSupplierDetails(activeSupplier.id, true);
      }
    }, 4000);
    return () => clearInterval(interval);
  }, [autoRefresh, activeSupplier?.id]);

  // Open Add modal
  const handleOpenAdd = () => {
    setEditingSupplierId(null);
    setFormName("");
    setFormCompany("");
    setFormPhone("");
    setFormEmail("");
    setFormAddress("");
    setFormInitialBalance(0);
    setFormPaymentDueDate("");
    setFormPaymentTermsDays(0);
    setSupplierModalOpen(true);
  };

  // Open Edit modal
  const handleOpenEdit = (sup: any) => {
    setEditingSupplierId(sup.id);
    setFormName(sup.name);
    setFormCompany(sup.companyName || "");
    setFormPhone(sup.phone || "");
    setFormEmail(sup.email || "");
    setFormAddress(sup.address || "");
    setFormInitialBalance(sup.currentBalance);
    setFormPaymentDueDate(
      sup.paymentDueDate ? new Date(sup.paymentDueDate).toISOString().slice(0, 10) : ""
    );
    setFormPaymentTermsDays(sup.paymentTermsDays || 0);
    setSupplierModalOpen(true);
  };

  const handleSaveSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      alert("Supplier name is required");
      return;
    }

    try {
      const url = editingSupplierId
        ? `/api/suppliers/${editingSupplierId}`
        : "/api/suppliers";
      const method = editingSupplierId ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formName,
          companyName: formCompany,
          phone: formPhone,
          email: formEmail,
          address: formAddress,
          currentBalance: formInitialBalance,
          paymentDueDate: formPaymentDueDate || null,
          paymentTermsDays: formPaymentTermsDays,
        }),
      });

      const data = await res.json();
      if (data.success) {
        alert(editingSupplierId ? "Supplier updated!" : "Supplier added!");
        setSupplierModalOpen(false);
        fetchSuppliers();
        if (editingSupplierId && activeSupplier && activeSupplier.id === editingSupplierId) {
          fetchSupplierDetails(editingSupplierId);
        }
      } else {
        alert(data.error);
      }
    } catch (e: any) {
      alert(`Error: ${e.message}`);
    }
  };

  const handleDeleteSupplier = async (id: string) => {
    if (!confirm("Are you sure you want to deactivate this supplier?")) return;
    try {
      const res = await fetch(`/api/suppliers/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        alert("Supplier deactivated");
        fetchSuppliers();
        if (activeSupplier?.id === id) setActiveSupplier(null);
      } else {
        alert(data.error);
      }
    } catch (e: any) {
      alert(`Error: ${e.message}`);
    }
  };

  // Open Purchase Bill Modal
  const handleOpenPurchase = (sup: any) => {
    setSelectedSupplierForPurchase(sup);
    setBillNumber(`BILL-${Date.now().toString().slice(-6)}`);
    setPurchaseItems([
      {
        productId: products[0]?.id || "",
        quantity: 10,
        unitCost: products[0]?.purchasePrice || 1000,
      },
    ]);
    setPurchasePaidAmount(0);
    setPurchasePaymentMethod("BANK_TRANSFER");
    // Default due date: if supplier has terms days, use today + terms days, else 15 days
    const terms = sup.paymentTermsDays || 15;
    const defaultDate = new Date();
    defaultDate.setDate(defaultDate.getDate() + terms);
    setPurchaseDueDate(defaultDate.toISOString().slice(0, 10));
    setPurchaseDueDaysPreset(terms.toString());
    setPurchaseNotes("");
    setPurchaseModalOpen(true);
  };

  const handleAddPurchaseLine = () => {
    setPurchaseItems([
      ...purchaseItems,
      {
        productId: products[0]?.id || "",
        quantity: 10,
        unitCost: products[0]?.purchasePrice || 1000,
      },
    ]);
  };

  const handleRemovePurchaseLine = (index: number) => {
    setPurchaseItems(purchaseItems.filter((_, i) => i !== index));
  };

  const totalPurchaseBillAmount = purchaseItems.reduce(
    (sum, item) => sum + item.quantity * item.unitCost,
    0
  );

  const handleSubmitPurchaseBill = async () => {
    if (!selectedSupplierForPurchase || purchaseItems.length === 0) return;

    try {
      const res = await fetch("/api/suppliers/purchases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          supplierId: selectedSupplierForPurchase.id,
          poNumber: billNumber,
          items: purchaseItems,
          totalAmount: totalPurchaseBillAmount,
          paidAmount: purchasePaidAmount,
          paymentMethod: purchasePaymentMethod,
          dueDate: purchaseDueDate || null,
          notes: purchaseNotes || `Inventory purchase bill #${billNumber}`,
        }),
      });

      const data = await res.json();
      if (data.success) {
        alert("Purchase bill saved! Inventory stock automatically added.");
        setPurchaseModalOpen(false);
        fetchSuppliers();
        if (activeSupplier) fetchSupplierDetails(activeSupplier.id);
      } else {
        alert(data.error);
      }
    } catch (e: any) {
      alert(`Error: ${e.message}`);
    }
  };

  // Open Record Payment Modal
  const handleOpenPayment = (sup: any) => {
    setSelectedSupplierForPayment(sup);
    setPaymentAmount(sup.currentBalance > 0 ? sup.currentBalance : 0);
    setPaymentMethod("CASH");
    setPaymentNextDueDate(
      sup.paymentDueDate ? new Date(sup.paymentDueDate).toISOString().slice(0, 10) : ""
    );
    setPaymentNotes("Payment against pending bills");
    setPaymentModalOpen(true);
  };

  const handleSubmitPayment = async () => {
    if (!selectedSupplierForPayment || paymentAmount <= 0) {
      alert("Enter valid payment amount");
      return;
    }

    try {
      const res = await fetch(`/api/suppliers/${selectedSupplierForPayment.id}/payment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: paymentAmount,
          paymentMethod,
          notes: paymentNotes,
          nextDueDate: paymentNextDueDate || null,
        }),
      });

      const data = await res.json();
      if (data.success) {
        alert("Payment recorded! Vendor payable balance updated.");
        setPaymentModalOpen(false);
        fetchSuppliers();
        if (activeSupplier) fetchSupplierDetails(activeSupplier.id);
      } else {
        alert(data.error);
      }
    } catch (e: any) {
      alert(`Error: ${e.message}`);
    }
  };

  // Filtered Ledger Entries for Print / View
  const filteredLedger = (activeSupplier?.ledgerEntries || []).filter((entry: any) => {
    if (!startDate && !endDate) return true;
    const entryDate = new Date(entry.createdAt).toISOString().slice(0, 10);
    if (startDate && entryDate < startDate) return false;
    if (endDate && entryDate > endDate) return false;
    return true;
  });

  const totalPayableAll = suppliers.reduce((sum, s) => sum + s.currentBalance, 0);

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center space-x-2">
            <Truck className="w-7 h-7 text-emerald-600" />
            <span>Suppliers & Inventory Purchases (وینڈرز اور خریداریاں)</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Track wholesale purchases, bills pending, inventory restock, and vendor ledgers
          </p>
        </div>

        <div className="flex items-center space-x-2">
          {/* Live Auto-Refresh indicator & Refresh button */}
          <button
            onClick={() => {
              fetchSuppliers(false);
              if (activeSupplier?.id) fetchSupplierDetails(activeSupplier.id, false);
            }}
            title="Refresh Suppliers & Purchases"
            className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition flex items-center space-x-1.5 text-xs font-semibold"
          >
            <RefreshCw className="w-4 h-4 text-emerald-600 animate-spin-hover" />
            <span className="hidden sm:inline">Refresh Now</span>
          </button>

          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            title="Toggle Live Auto-Sync"
            className={`px-3 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 ${
              autoRefresh
                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                : "bg-slate-100 text-slate-500"
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${autoRefresh ? "bg-emerald-500 animate-pulse" : "bg-slate-400"}`} />
            <span>{autoRefresh ? "Live Sync ON" : "Live Sync OFF"}</span>
          </button>

          <button
            onClick={handleOpenAdd}
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs sm:text-sm font-bold flex items-center space-x-1.5 transition shadow-sm"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Add New Supplier (نیا وینڈر)</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center space-x-3">
          <div className="p-3 bg-emerald-50 text-emerald-700 rounded-xl">
            <Truck className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs text-slate-500 font-medium">Total Active Suppliers</div>
            <div className="text-xl font-bold text-slate-900">{suppliers.length}</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center space-x-3">
          <div className="p-3 bg-rose-50 text-rose-700 rounded-xl">
            <DollarSign className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs text-rose-900 font-medium">Total Pending Bills (کل بقایا واجب الادا)</div>
            <div className="text-xl font-black text-rose-600">
              {formatCurrency(totalPayableAll)}
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center space-x-3">
          <div className="p-3 bg-blue-50 text-blue-700 rounded-xl">
            <PackagePlus className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs text-slate-500 font-medium">Auto Restock on Purchase</div>
            <div className="text-xs font-semibold text-slate-700 mt-0.5">
              Instant Stock-In & Ledger Entry
            </div>
          </div>
        </div>
      </div>

      {/* Suppliers Table & Ledger View */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Suppliers Directory (7 cols) */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search supplier by name, company, city..."
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg"
              />
            </div>
          </div>

          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b">
                <tr>
                  <th className="py-2.5 px-3">Supplier Name</th>
                  <th className="py-2.5 px-3">City / Contact</th>
                  <th className="py-2.5 px-3 text-right">Pending Balance</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-slate-400">
                      Loading suppliers...
                    </td>
                  </tr>
                ) : suppliers.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-slate-400">
                      No suppliers found. Click "Add New Supplier" to create one.
                    </td>
                  </tr>
                ) : (
                  suppliers.map((s) => (
                    <tr
                      key={s.id}
                      onClick={() => fetchSupplierDetails(s.id)}
                      className={`cursor-pointer transition hover:bg-slate-50 ${
                        activeSupplier?.id === s.id ? "bg-emerald-50/70" : ""
                      }`}
                    >
                      <td className="py-3 px-3">
                        <div className="font-bold text-slate-900">{s.name}</div>
                        {s.companyName && (
                          <div className="text-[11px] text-slate-500">{s.companyName}</div>
                        )}
                      </td>
                      <td className="py-3 px-3 text-slate-600 text-xs">
                        <div>{s.phone || "No phone"}</div>
                        <div className="text-[10px] text-slate-400 truncate max-w-[150px]">
                          {s.address}
                        </div>
                      </td>
                      <td className="py-3 px-3 text-right font-black">
                        <div
                          className={s.currentBalance > 0 ? "text-rose-600" : "text-emerald-700"}
                        >
                          {formatCurrency(s.currentBalance)}
                        </div>
                        {s.currentBalance > 0 && s.paymentDueDate && (() => {
                          const dueDate = new Date(s.paymentDueDate);
                          const now = new Date();
                          const diffTime = dueDate.getTime() - now.getTime();
                          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                          const isOverdue = diffDays < 0;
                          const isDueToday = diffDays === 0;

                          return (
                            <div className="mt-1 flex justify-end">
                              <span
                                className={`inline-flex items-center space-x-1 px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                  isOverdue
                                    ? "bg-rose-100 text-rose-800 border border-rose-300 animate-pulse"
                                    : isDueToday
                                    ? "bg-amber-100 text-amber-800 border border-amber-300"
                                    : "bg-blue-50 text-blue-700 border border-blue-200"
                                }`}
                              >
                                <Clock className="w-2.5 h-2.5 mr-0.5" />
                                {isOverdue
                                  ? `Overdue (${Math.abs(diffDays)}d ago)`
                                  : isDueToday
                                  ? "Due Today (آج)"
                                  : `Due in ${diffDays}d`}
                              </span>
                            </div>
                          );
                        })()}
                      </td>
                      <td className="py-3 px-3 text-right space-x-1 whitespace-nowrap">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenPurchase(s);
                          }}
                          title="Record Purchase Bill"
                          className="px-2 py-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded text-xs font-semibold"
                        >
                          + Bill
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenPayment(s);
                          }}
                          title="Record Payment"
                          className="px-2 py-1 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded text-xs font-semibold"
                        >
                          Pay
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenEdit(s);
                          }}
                          className="p-1 text-slate-400 hover:text-slate-700 rounded"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right: Supplier Ledger & Printable Statement (5 cols) */}
        <div id="supplier-ledger-printable-area" className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 shadow-sm p-4 space-y-4">
          {activeSupplier ? (
            <div className="space-y-4">
              <div className="flex items-start justify-between border-b pb-3">
                <div>
                  <h3 className="font-bold text-base text-slate-900">{activeSupplier.name}</h3>
                  <p className="text-xs text-slate-500">{activeSupplier.companyName || activeSupplier.phone}</p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-400 font-semibold uppercase">Pending Payable</span>
                  <div className="text-lg font-black text-rose-600">
                    {formatCurrency(activeSupplier.currentBalance)}
                  </div>
                  {activeSupplier.currentBalance > 0 && activeSupplier.paymentDueDate && (
                    <div className="text-[11px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 mt-1 inline-flex items-center space-x-1">
                      <Clock className="w-3 h-3 text-amber-600 mr-1" />
                      <span>
                        Due: {new Date(activeSupplier.paymentDueDate).toLocaleDateString("en-PK", { day: "2-digit", month: "short", year: "numeric" })}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Tabs: Ledger Statement vs Purchase Invoices History */}
              <div className="flex border-b border-slate-200">
                <button
                  onClick={() => setRightTab("LEDGER")}
                  className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition flex items-center space-x-1.5 ${
                    rightTab === "LEDGER"
                      ? "border-emerald-600 text-emerald-800"
                      : "border-transparent text-slate-500 hover:text-slate-800"
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Ledger Statement (کھاتہ اسٹیٹمنٹ)</span>
                </button>
                <button
                  onClick={() => setRightTab("PURCHASES")}
                  className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition flex items-center space-x-1.5 ${
                    rightTab === "PURCHASES"
                      ? "border-emerald-600 text-emerald-800"
                      : "border-transparent text-slate-500 hover:text-slate-800"
                  }`}
                >
                  <ShoppingCart className="w-3.5 h-3.5" />
                  <span>Purchases & Bills History ({activeSupplier.purchaseOrders?.length || 0})</span>
                </button>
              </div>

              {rightTab === "LEDGER" && (
                <>
                  {/* Date Filter & Print Statement */}
                  <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 space-y-2">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                      <span>Filter Date Range for Report:</span>
                      <button
                        onClick={() => window.print()}
                        className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-white rounded-md text-xs font-bold flex items-center space-x-1"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        <span>Print Ledger</span>
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-[10px] text-slate-500">From Date:</span>
                        <input
                          type="date"
                          value={startDate}
                          onChange={(e) => setStartDate(e.target.value)}
                          className="w-full px-2 py-1 bg-white border rounded text-xs"
                        />
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500">To Date:</span>
                        <input
                          type="date"
                          value={endDate}
                          onChange={(e) => setEndDate(e.target.value)}
                          className="w-full px-2 py-1 bg-white border rounded text-xs"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Printable Vendor Ledger Table */}
                  <div id="supplier-ledger-print" className="overflow-y-auto max-h-96 border rounded-xl">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 text-slate-600 border-b sticky top-0">
                        <tr>
                          <th className="py-2 px-2">Date</th>
                          <th className="py-2 px-2">Details / Ref</th>
                          <th className="py-2 px-2 text-right">Debit (Paid)</th>
                          <th className="py-2 px-2 text-right">Credit (Bill)</th>
                          <th className="py-2 px-2 text-right">Balance</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredLedger.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="py-6 text-center text-slate-400 text-xs">
                              No ledger transactions in this range.
                            </td>
                          </tr>
                        ) : (
                          filteredLedger.map((e: any) => (
                            <tr key={e.id} className="hover:bg-slate-50">
                              <td className="py-2 px-2 text-[10px] text-slate-500 whitespace-nowrap">
                                {new Date(e.createdAt).toLocaleDateString()}
                              </td>
                              <td className="py-2 px-2">
                                <div className="font-semibold text-slate-900 text-[11px]">{e.referenceType}</div>
                                <div className="text-[10px] text-slate-500 truncate max-w-[120px]">
                                  {e.referenceId} {e.notes ? `• ${e.notes}` : ""}
                                </div>
                              </td>
                              <td className="py-2 px-2 text-right font-medium text-emerald-700">
                                {e.debit > 0 ? formatCurrency(e.debit) : "-"}
                              </td>
                              <td className="py-2 px-2 text-right font-medium text-rose-600">
                                {e.credit > 0 ? formatCurrency(e.credit) : "-"}
                              </td>
                              <td className="py-2 px-2 text-right font-bold text-slate-900">
                                {formatCurrency(e.runningBalance)}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </>
              )}

              {rightTab === "PURCHASES" && (
                <div className="space-y-3 max-h-[500px] overflow-y-auto">
                  {(!activeSupplier.purchaseOrders || activeSupplier.purchaseOrders.length === 0) ? (
                    <div className="p-8 text-center text-slate-400 text-xs border rounded-xl">
                      No purchase orders recorded yet from this supplier.
                    </div>
                  ) : (
                    activeSupplier.purchaseOrders.map((po: any) => (
                      <div key={po.id} className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2 text-xs">
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="font-mono font-bold text-slate-900">{po.poNumber}</span>
                            <div className="text-[10px] text-slate-500">
                              Date: {new Date(po.orderDate || po.createdAt).toLocaleString()}
                            </div>
                          </div>
                          <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded-full">
                            {po.status}
                          </span>
                        </div>

                        {/* Items inside this PO */}
                        <div className="bg-white rounded-lg border border-slate-200 p-2 divide-y divide-slate-100">
                          {po.items?.map((it: any) => (
                            <div key={it.id} className="py-1.5 flex justify-between items-center text-[11px]">
                              <div>
                                <span className="font-bold text-slate-800">{it.product?.name || "Product"}</span>
                                <span className="text-[10px] text-slate-400 font-mono block">{it.product?.sku}</span>
                              </div>
                              <div className="text-right">
                                <span className="font-semibold text-slate-700">
                                  {it.quantityReceived || it.quantityOrdered} {it.product?.unit || "pcs"} × Rs. {it.unitCost}
                                </span>
                                <div className="font-bold text-slate-900">
                                  {formatCurrency(it.totalCost)}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* PO Summary */}
                        <div className="flex justify-between items-center text-[11px] pt-1 border-t border-slate-200">
                          <div>
                            <span className="text-slate-500">Paid: </span>
                            <strong className="text-emerald-700">{formatCurrency(po.paidAmount)}</strong>
                            <span className="text-slate-400 mx-1">•</span>
                            <span className="text-slate-500">Due: </span>
                            <strong className="text-rose-600">{formatCurrency(po.balanceAmount)}</strong>
                          </div>
                          <div className="font-bold text-slate-900">
                            Total: {formatCurrency(po.totalAmount)}
                          </div>
                        </div>

                        {po.notes && (
                          <div className="text-[10px] text-slate-500 bg-white p-1.5 rounded border border-slate-100">
                            <strong>Note:</strong> {po.notes}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400 text-center">
              <FileText className="w-12 h-12 stroke-1 mb-2 opacity-50" />
              <p className="text-sm font-medium">Select a Supplier</p>
              <p className="text-xs text-slate-400 mt-1">
                Click on any supplier on the left to inspect purchase orders, payments, and print ledgers
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Add / Edit Supplier Modal */}
      {supplierModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="font-bold text-base text-slate-900">
                {editingSupplierId ? "Edit Supplier" : "Add New Supplier (نیا وینڈر)"}
              </h3>
              <button onClick={() => setSupplierModalOpen(false)}>
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            <form onSubmit={handleSaveSupplier} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Supplier / Vendor Name *
                </label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. Al-Rahman Fabrics"
                  className="w-full px-3 py-2 border rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Company / Mill Name</label>
                <input
                  type="text"
                  value={formCompany}
                  onChange={(e) => setFormCompany(e.target.value)}
                  placeholder="e.g. Al-Rahman Textile Mills Ltd"
                  className="w-full px-3 py-2 border rounded-lg text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Phone</label>
                  <input
                    type="text"
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    placeholder="0300-1234567"
                    className="w-full px-3 py-2 border rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    placeholder="orders@vendor.pk"
                    className="w-full px-3 py-2 border rounded-lg text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">City / Market Address</label>
                <input
                  type="text"
                  value={formAddress}
                  onChange={(e) => setFormAddress(e.target.value)}
                  placeholder="e.g. Faisalabad Textile Market"
                  className="w-full px-3 py-2 border rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Opening Payable Balance (Rs.)</label>
                <input
                  type="number"
                  value={formInitialBalance}
                  onChange={(e) => setFormInitialBalance(Number(e.target.value))}
                  placeholder="0.00"
                  className="w-full px-3 py-2 border rounded-lg text-xs font-bold"
                />
              </div>

              <div className="flex space-x-2 pt-2 border-t">
                <button
                  type="button"
                  onClick={() => setSupplierModalOpen(false)}
                  className="flex-1 py-2 text-xs font-semibold bg-slate-100 rounded-lg text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 text-xs font-bold bg-emerald-600 text-white rounded-lg hover:bg-emerald-500"
                >
                  Save Supplier
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Record Purchase Bill Modal (Automatic Inventory Restock) */}
      {purchaseModalOpen && selectedSupplierForPurchase && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full p-6 space-y-4 max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center border-b pb-3">
              <div>
                <h3 className="font-bold text-base text-slate-900">
                  Record Purchase Bill & Stock-In ({selectedSupplierForPurchase.name})
                </h3>
                <p className="text-xs text-slate-500">
                  Adding products here will automatically increase your stock levels
                </p>
              </div>
              <button onClick={() => setPurchaseModalOpen(false)}>
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            <div className="space-y-3 flex-1 overflow-y-auto">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Bill / PO Number</label>
                  <input
                    type="text"
                    value={billNumber}
                    onChange={(e) => setBillNumber(e.target.value)}
                    className="w-full px-3 py-1.5 border rounded-lg text-xs font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Payment Method</label>
                  <select
                    value={purchasePaymentMethod}
                    onChange={(e) => setPurchasePaymentMethod(e.target.value)}
                    className="w-full px-3 py-1.5 border rounded-lg text-xs bg-slate-50"
                  >
                    <option value="BANK_TRANSFER">Bank Transfer (بینک)</option>
                    <option value="CASH">Cash (کیش)</option>
                    <option value="CHEQUE">Cheque (چیک)</option>
                    <option value="CREDIT">Fully Pending on Credit (ادھار)</option>
                  </select>
                </div>
              </div>

              {/* Purchase Bill Items List */}
              <div className="border rounded-xl p-3 bg-slate-50 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800">Items Purchased from Supplier:</span>
                  <button
                    type="button"
                    onClick={handleAddPurchaseLine}
                    className="text-xs text-emerald-700 font-bold hover:underline flex items-center space-x-1"
                  >
                    <PlusCircle className="w-3.5 h-3.5" />
                    <span>Add Item</span>
                  </button>
                </div>

                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {purchaseItems.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-2 bg-white p-2 rounded-lg border">
                      <select
                        value={item.productId}
                        onChange={(e) => {
                          const pId = e.target.value;
                          const found = products.find((p) => p.id === pId);
                          const updated = [...purchaseItems];
                          updated[idx] = {
                            ...updated[idx],
                            productId: pId,
                            unitCost: found?.purchasePrice || updated[idx].unitCost,
                          };
                          setPurchaseItems(updated);
                        }}
                        className="flex-1 px-2 py-1 text-xs border rounded"
                      >
                        {products.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name} ({p.sku})
                          </option>
                        ))}
                      </select>

                      <input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => {
                          const updated = [...purchaseItems];
                          updated[idx].quantity = Number(e.target.value);
                          setPurchaseItems(updated);
                        }}
                        placeholder="Qty"
                        className="w-16 px-2 py-1 text-xs border rounded font-bold"
                      />

                      <input
                        type="number"
                        min="0"
                        value={item.unitCost}
                        onChange={(e) => {
                          const updated = [...purchaseItems];
                          updated[idx].unitCost = Number(e.target.value);
                          setPurchaseItems(updated);
                        }}
                        placeholder="Cost"
                        className="w-24 px-2 py-1 text-xs border rounded font-bold text-emerald-700"
                      />

                      <span className="text-xs font-bold text-slate-900 w-24 text-right">
                        Rs. {(item.quantity * item.unitCost).toFixed(0)}
                      </span>

                      {purchaseItems.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemovePurchaseLine(idx)}
                          className="p-1 text-rose-500 hover:text-rose-700"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Totals & Paid Amount */}
              <div className="bg-slate-100 p-3 rounded-xl space-y-2 text-xs">
                <div className="flex justify-between font-bold text-slate-900">
                  <span>Total Bill Amount:</span>
                  <span className="text-base text-emerald-800">
                    Rs. {totalPurchaseBillAmount.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-slate-700">Amount Paid Now (اخراجات/ادائیگی):</span>
                  <input
                    type="number"
                    value={purchasePaidAmount || ""}
                    onChange={(e) => setPurchasePaidAmount(Number(e.target.value))}
                    className="w-32 px-2 py-1 border rounded text-xs font-bold text-right"
                    placeholder="0"
                  />
                </div>
                <div className="flex justify-between font-bold border-t pt-2 text-rose-600">
                  <span>Remaining Pending (بقایا کھاتہ):</span>
                  <span>
                    Rs. {Math.max(0, totalPurchaseBillAmount - purchasePaidAmount).toFixed(2)}
                  </span>
                </div>

                {/* If there is pending balance, specify when to pay the supplier */}
                {totalPurchaseBillAmount > purchasePaidAmount && (
                  <div className="mt-3 pt-2 border-t border-slate-200">
                    <label className="block text-[11px] font-bold text-slate-800 mb-1 flex items-center">
                      <Clock className="w-3.5 h-3.5 text-amber-600 mr-1" />
                      <span>Payment Due Date to Vendor (وینڈ کو ادائیگی کی تاریخ / کتنے دن بعد):</span>
                    </label>
                    <div className="grid grid-cols-2 gap-2 mt-1">
                      <select
                        value={purchaseDueDaysPreset}
                        onChange={(e) => {
                          const val = e.target.value;
                          setPurchaseDueDaysPreset(val);
                          if (val !== "custom") {
                            const days = Number(val);
                            const d = new Date();
                            d.setDate(d.getDate() + days);
                            setPurchaseDueDate(d.toISOString().slice(0, 10));
                          }
                        }}
                        className="px-2 py-1.5 border rounded-lg text-xs bg-white"
                      >
                        <option value="7">In 7 Days (1 ہفتہ بعد)</option>
                        <option value="15">In 15 Days (2 ہفتے بعد)</option>
                        <option value="30">In 30 Days (1 مہینہ بعد)</option>
                        <option value="45">In 45 Days</option>
                        <option value="60">In 60 Days (2 مہینے بعد)</option>
                        <option value="custom">Custom Date (اپنی مرضی کی تاریخ)</option>
                      </select>
                      <input
                        type="date"
                        value={purchaseDueDate}
                        onChange={(e) => {
                          setPurchaseDueDate(e.target.value);
                          setPurchaseDueDaysPreset("custom");
                        }}
                        className="px-2 py-1.5 border rounded-lg text-xs bg-white font-bold text-slate-800"
                      />
                    </div>
                    <p className="text-[10px] text-slate-500 mt-1">
                      🔔 اس تاریخ پر سسٹم آپ کو نوٹیفکیشن الرٹ دے گا کہ وینڈر کو بقایا رقم ادا کرنی ہے۔
                    </p>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Notes / Remarks</label>
                <input
                  type="text"
                  value={purchaseNotes}
                  onChange={(e) => setPurchaseNotes(e.target.value)}
                  placeholder="e.g. Received via TCS Cargo from Faisalabad"
                  className="w-full px-3 py-1.5 border rounded-lg text-xs"
                />
              </div>
            </div>

            <div className="flex space-x-2 pt-2 border-t">
              <button
                onClick={() => setPurchaseModalOpen(false)}
                className="flex-1 py-2.5 text-xs font-semibold bg-slate-100 rounded-xl text-slate-700"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitPurchaseBill}
                className="flex-1 py-2.5 text-xs font-bold bg-emerald-600 text-white rounded-xl hover:bg-emerald-500"
              >
                Confirm Bill & Add Stock
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Record Payment to Vendor Modal */}
      {paymentModalOpen && selectedSupplierForPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex justify-between items-center border-b pb-3">
              <div>
                <h3 className="font-bold text-base text-slate-900">
                  Pay Vendor ({selectedSupplierForPayment.name})
                </h3>
                <p className="text-xs text-rose-600 font-bold">
                  Current Pending: Rs. {selectedSupplierForPayment.currentBalance.toFixed(2)}
                </p>
              </div>
              <button onClick={() => setPaymentModalOpen(false)}>
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-xs font-semibold text-slate-700">
                    Payment Amount (ادائیگی کی رقم) *
                  </label>
                  <button
                    type="button"
                    onClick={() => setPaymentAmount(selectedSupplierForPayment.currentBalance)}
                    className="text-[11px] text-emerald-700 hover:underline font-bold"
                  >
                    Pay Full (مکمل ادائیگی: Rs. {selectedSupplierForPayment.currentBalance.toFixed(2)})
                  </button>
                </div>
                <input
                  type="number"
                  value={paymentAmount || ""}
                  onChange={(e) => setPaymentAmount(Number(e.target.value))}
                  className="w-full px-3 py-2 border rounded-lg text-sm font-bold text-slate-900"
                />
                <div className="flex justify-between items-center mt-1 text-[11px]">
                  <span className="text-slate-500">Remaining after this payment:</span>
                  <span className="font-bold text-rose-600">
                    Rs. {Math.max(0, selectedSupplierForPayment.currentBalance - paymentAmount).toFixed(2)}
                  </span>
                </div>
              </div>

              {/* If remaining balance is left after partial payment, allow setting next due date */}
              {selectedSupplierForPayment.currentBalance > paymentAmount && (
                <div className="bg-amber-50/70 p-2.5 rounded-lg border border-amber-200">
                  <label className="block text-[11px] font-bold text-amber-900 mb-1 flex items-center">
                    <Clock className="w-3.5 h-3.5 text-amber-600 mr-1" />
                    <span>Next Payment Due Date (اگلی ادائیگی کی تاریخ):</span>
                  </label>
                  <input
                    type="date"
                    value={paymentNextDueDate}
                    onChange={(e) => setPaymentNextDueDate(e.target.value)}
                    className="w-full px-2 py-1.5 border rounded-lg text-xs bg-white font-bold"
                  />
                  <p className="text-[10px] text-amber-800 mt-0.5">
                    بقایا رقم کیلئے اگلی یاد دہانی کی تاریخ سیٹ کریں۔
                  </p>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Payment Channel
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg text-xs bg-slate-50"
                >
                  <option value="CASH">Cash Drawer (کیش)</option>
                  <option value="BANK_TRANSFER">Bank Transfer (بینک ٹرانسفر)</option>
                  <option value="CHEQUE">Cheque (چیک)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Payment Voucher Notes
                </label>
                <input
                  type="text"
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  placeholder="e.g. Paid via Meezan Bank Cheque #4928"
                  className="w-full px-3 py-2 border rounded-lg text-xs"
                />
              </div>
            </div>

            <div className="flex space-x-2 pt-2 border-t">
              <button
                onClick={() => setPaymentModalOpen(false)}
                className="flex-1 py-2 text-xs font-semibold bg-slate-100 rounded-lg text-slate-700"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitPayment}
                className="flex-1 py-2 text-xs font-bold bg-emerald-600 text-white rounded-lg hover:bg-emerald-500"
              >
                Record Payment
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
