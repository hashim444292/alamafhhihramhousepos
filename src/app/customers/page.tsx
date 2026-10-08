"use client";

import React, { useState, useEffect } from "react";
import {
  Users,
  PlusCircle,
  Search,
  DollarSign,
  FileText,
  Printer,
  X,
  CreditCard,
  Phone,
  MapPin,
  Edit2,
  Trash2,
  History,
  CheckCircle,
  AlertCircle,
  Eye,
  Clock,
  Calendar,
  BellRing,
} from "lucide-react";
import { ThermalReceipt } from "@/components/pos/ThermalReceipt";
import { formatCurrency, formatNumber } from "@/lib/format-utils";

export default function CustomersPage() {
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // Active customer for detailed ledger / invoices
  const [activeCustomer, setActiveCustomer] = useState<any | null>(null);

  // Add / Edit Modal
  const [customerModalOpen, setCustomerModalOpen] = useState(false);
  const [editingCustomerId, setEditingCustomerId] = useState<string | null>(null);
  const [formName, setFormName] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formAddress, setFormAddress] = useState("");
  const [formInitialBalance, setFormInitialBalance] = useState<number>(0);
  const [formCreditLimit, setFormCreditLimit] = useState<number>(50000);
  const [formPaymentDueDate, setFormPaymentDueDate] = useState("");
  const [formPaymentTermsDays, setFormPaymentTermsDays] = useState<number>(0);

  // Payment Received Modal (Udhaar recovery)
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [recoveryAmount, setRecoveryAmount] = useState<number>(0);
  const [recoveryMethod, setRecoveryMethod] = useState("CASH");
  const [recoveryNextDueDate, setRecoveryNextDueDate] = useState("");
  const [recoveryNotes, setRecoveryNotes] = useState("");

  // Invoice view reprint
  const [selectedInvoice, setSelectedInvoice] = useState<any | null>(null);

  // Date filter for ledger print
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/customers");
      const data = await res.json();
      if (data.success) {
        setCustomers(data.customers);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchCustomerDetails = async (id: string) => {
    try {
      const res = await fetch(`/api/customers/${id}`);
      const data = await res.json();
      if (data.success) {
        setActiveCustomer(data.customer);
      }
    } catch (e) {
      alert("Failed to load customer details");
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  const handleOpenAdd = () => {
    setEditingCustomerId(null);
    setFormName("");
    setFormPhone("");
    setFormEmail("");
    setFormAddress("");
    setFormInitialBalance(0);
    setFormCreditLimit(50000);
    setFormPaymentDueDate("");
    setFormPaymentTermsDays(0);
    setCustomerModalOpen(true);
  };

  const handleOpenEdit = (c: any) => {
    setEditingCustomerId(c.id);
    setFormName(c.name);
    setFormPhone(c.phone || "");
    setFormEmail(c.email || "");
    setFormAddress(c.address || "");
    setFormInitialBalance(c.balance);
    setFormCreditLimit(c.creditLimit || 50000);
    setFormPaymentDueDate(
      c.paymentDueDate ? new Date(c.paymentDueDate).toISOString().slice(0, 10) : ""
    );
    setFormPaymentTermsDays(c.paymentTermsDays || 0);
    setCustomerModalOpen(true);
  };

  const handleSaveCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      alert("Customer name is required");
      return;
    }

    try {
      const url = editingCustomerId
        ? `/api/customers/${editingCustomerId}`
        : "/api/customers";
      const method = editingCustomerId ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formName,
          phone: formPhone,
          email: formEmail,
          address: formAddress,
          balance: formInitialBalance,
          creditLimit: formCreditLimit,
          paymentDueDate: formPaymentDueDate || null,
          paymentTermsDays: formPaymentTermsDays,
        }),
      });

      const data = await res.json();
      if (data.success) {
        alert(editingCustomerId ? "Customer updated!" : "Customer added!");
        setCustomerModalOpen(false);
        fetchCustomers();
        if (editingCustomerId && activeCustomer?.id === editingCustomerId) {
          fetchCustomerDetails(editingCustomerId);
        }
      } else {
        alert(data.error);
      }
    } catch (e: any) {
      alert(`Error: ${e.message}`);
    }
  };

  const handleDeleteCustomer = async (id: string) => {
    if (!confirm("Are you sure you want to deactivate this customer account?")) return;
    try {
      const res = await fetch(`/api/customers/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        alert("Customer deactivated");
        fetchCustomers();
        if (activeCustomer?.id === id) setActiveCustomer(null);
      } else {
        alert(data.error);
      }
    } catch (e: any) {
      alert(`Error: ${e.message}`);
    }
  };

  const handleOpenRecovery = (c: any) => {
    setActiveCustomer(c);
    setRecoveryAmount(c.balance > 0 ? c.balance : 0);
    setRecoveryMethod("CASH");
    setRecoveryNextDueDate(
      c.paymentDueDate ? new Date(c.paymentDueDate).toISOString().slice(0, 10) : ""
    );
    setRecoveryNotes("Khata payment received on counter");
    setPaymentModalOpen(true);
  };

  const handleConfirmRecovery = async () => {
    if (!activeCustomer || recoveryAmount <= 0) {
      alert("Please enter a valid payment amount");
      return;
    }

    try {
      const res = await fetch(`/api/customers/${activeCustomer.id}/payment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: recoveryAmount,
          paymentMethod: recoveryMethod,
          notes: recoveryNotes,
          nextDueDate: recoveryNextDueDate || null,
        }),
      });

      const data = await res.json();
      if (data.success) {
        alert("Payment recorded! Khata balance updated.");
        setPaymentModalOpen(false);
        fetchCustomers();
        fetchCustomerDetails(activeCustomer.id);
      } else {
        alert(data.error);
      }
    } catch (e: any) {
      alert(`Error: ${e.message}`);
    }
  };

  // Filtered customer ledger for print
  const filteredLedger = (activeCustomer?.ledgerEntries || []).filter((entry: any) => {
    if (!startDate && !endDate) return true;
    const entryDate = new Date(entry.createdAt).toISOString().slice(0, 10);
    if (startDate && entryDate < startDate) return false;
    if (endDate && entryDate > endDate) return false;
    return true;
  });

  const totalReceivable = customers.reduce((sum, c) => sum + c.balance, 0);

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center space-x-2">
            <Users className="w-7 h-7 text-emerald-600" />
            <span>Customers & Khata Udhaar (گاہک اور ادھار کھاتہ)</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Accounts receivable, regular customer ledger, sales history, and recovery vouchers
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs sm:text-sm font-bold flex items-center space-x-1.5 transition shadow-sm"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Add New Customer (نیا کھاتہ گاہک)</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center space-x-3">
          <div className="p-3 bg-emerald-50 text-emerald-700 rounded-xl">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs text-slate-500 font-medium">Registered Khata Customers</div>
            <div className="text-xl font-bold text-slate-900">{customers.length}</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center space-x-3">
          <div className="p-3 bg-amber-50 text-amber-700 rounded-xl">
            <DollarSign className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs text-amber-900 font-medium">Total Udhaar / Receivables (کل واجب الوصول)</div>
            <div className="text-xl font-black text-amber-700">
              {formatCurrency(totalReceivable)}
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center space-x-3">
          <div className="p-3 bg-blue-50 text-blue-700 rounded-xl">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs text-slate-500 font-medium">Printable Khata Statements</div>
            <div className="text-xs font-semibold text-slate-700 mt-0.5">
              Instant date-range filtered statement
            </div>
          </div>
        </div>
      </div>

      {/* Main Customers List & Ledger */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Customer Directory (6 cols) */}
        <div className="lg:col-span-6 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by customer name, phone, or area..."
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg"
              />
            </div>
          </div>

          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b">
                <tr>
                  <th className="py-2.5 px-3">Customer Name</th>
                  <th className="py-2.5 px-3">Contact</th>
                  <th className="py-2.5 px-3 text-right">Udhaar Balance</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-slate-400">
                      Loading customers...
                    </td>
                  </tr>
                ) : customers.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-slate-400">
                      No registered customers. Click "Add New Customer".
                    </td>
                  </tr>
                ) : (
                  customers.map((c) => (
                    <tr
                      key={c.id}
                      onClick={() => fetchCustomerDetails(c.id)}
                      className={`cursor-pointer transition hover:bg-slate-50 ${
                        activeCustomer?.id === c.id ? "bg-emerald-50/70" : ""
                      }`}
                    >
                      <td className="py-3 px-3">
                        <div className="font-bold text-slate-900">{c.name}</div>
                        {c.address && (
                          <div className="text-[11px] text-slate-400 truncate max-w-[130px]">
                            {c.address}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-3 text-slate-600 text-xs font-mono">
                        {c.phone || "No phone"}
                      </td>
                      <td className="py-3 px-3 text-right font-black">
                        <div className={c.balance > 0 ? "text-amber-700" : "text-emerald-700"}>
                          {formatCurrency(c.balance)}
                        </div>
                        {c.balance > 0 && c.paymentDueDate && (() => {
                          const dueDate = new Date(c.paymentDueDate);
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
                                  ? "Promise Today (آج)"
                                  : `Promise in ${diffDays}d`}
                              </span>
                            </div>
                          );
                        })()}
                      </td>
                      <td className="py-3 px-3 text-right space-x-1 whitespace-nowrap">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenRecovery(c);
                          }}
                          title="Record Payment Received"
                          className="px-2 py-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded text-xs font-semibold"
                        >
                          Receive Cash
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenEdit(c);
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

        {/* Right: Customer Profile, Past Invoices & Ledger (6 cols) */}
        <div id="customer-khata-printable-area" className="lg:col-span-6 bg-white rounded-2xl border border-slate-200 shadow-sm p-4 space-y-4">
          {activeCustomer ? (
            <div className="space-y-4">
              <div className="flex items-start justify-between border-b pb-3">
                <div>
                  <h3 className="font-bold text-base text-slate-900">{activeCustomer.name}</h3>
                  <p className="text-xs text-slate-500">
                    Phone: {activeCustomer.phone || "N/A"} • Address: {activeCustomer.address || "N/A"}
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-400 font-semibold uppercase">Pending Udhaar (کھاتہ)</span>
                  <div className="text-xl font-black text-amber-700">
                    {formatCurrency(activeCustomer.balance)}
                  </div>
                  {activeCustomer.balance > 0 && activeCustomer.paymentDueDate && (
                    <div className="text-[11px] font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 mt-1 inline-flex items-center">
                      <Clock className="w-3 h-3 text-amber-600 mr-1" />
                      <span>
                        Promise Due: {new Date(activeCustomer.paymentDueDate).toLocaleDateString("en-PK", { day: "2-digit", month: "short", year: "numeric" })}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Date Filter & Print Statement */}
              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                  <span>Khata Statement Date Range:</span>
                  <button
                    onClick={() => window.print()}
                    className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-white rounded-md text-xs font-bold flex items-center space-x-1"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Print Khata</span>
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

              {/* Ledger Entries */}
              <div>
                <h4 className="font-bold text-xs text-slate-800 mb-1">Khata Ledger (Debits & Credits)</h4>
                <div className="overflow-y-auto max-h-48 border rounded-xl">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-600 border-b sticky top-0">
                      <tr>
                        <th className="py-2 px-2">Date</th>
                        <th className="py-2 px-2">Ref / Voucher</th>
                        <th className="py-2 px-2 text-right">Debit (Sale)</th>
                        <th className="py-2 px-2 text-right">Credit (Received)</th>
                        <th className="py-2 px-2 text-right">Balance</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredLedger.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="py-4 text-center text-slate-400">
                            No ledger entries in this date range.
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
                              <div className="text-[10px] text-slate-500">{e.referenceId}</div>
                            </td>
                            <td className="py-2 px-2 text-right font-medium text-amber-700">
                              {e.debit > 0 ? formatCurrency(e.debit) : "-"}
                            </td>
                            <td className="py-2 px-2 text-right font-medium text-emerald-700">
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
              </div>

              {/* Past Invoices Sold to this Customer */}
              <div>
                <h4 className="font-bold text-xs text-slate-800 mb-1">
                  Invoices Sold to {activeCustomer.name} (خریداری کی تفصیل)
                </h4>
                <div className="overflow-y-auto max-h-48 border rounded-xl">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-600 border-b sticky top-0">
                      <tr>
                        <th className="py-2 px-2">Invoice #</th>
                        <th className="py-2 px-2">Date</th>
                        <th className="py-2 px-2">Mode</th>
                        <th className="py-2 px-2 text-right">Total (Rs.)</th>
                        <th className="py-2 px-2 text-center">View</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {(activeCustomer.sales || []).length === 0 ? (
                        <tr>
                          <td colSpan={5} className="py-4 text-center text-slate-400">
                            No sales invoices recorded for this customer yet.
                          </td>
                        </tr>
                      ) : (
                        (activeCustomer.sales || []).map((s: any) => (
                          <tr key={s.id} className="hover:bg-slate-50">
                            <td className="py-2 px-2 font-mono font-bold text-slate-900">
                              {s.invoiceNumber}
                            </td>
                            <td className="py-2 px-2 text-slate-500 text-[10px]">
                              {new Date(s.createdAt).toLocaleDateString()}
                            </td>
                            <td className="py-2 px-2">
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100">
                                {s.paymentMethod}
                              </span>
                            </td>
                            <td className="py-2 px-2 text-right font-bold text-emerald-700">
                              {formatCurrency(s.totalAmount)}
                            </td>
                            <td className="py-2 px-2 text-center">
                              <button
                                onClick={() => setSelectedInvoice(s)}
                                className="p-1 hover:bg-slate-200 rounded"
                              >
                                <Eye className="w-3.5 h-3.5 text-slate-600" />
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400 text-center">
              <Users className="w-12 h-12 stroke-1 mb-2 opacity-50" />
              <p className="text-sm font-medium">Select a Customer</p>
              <p className="text-xs text-slate-400 mt-1">
                Click on any customer to view full purchase history, Khata statement, and receive payments
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Add / Edit Customer Modal */}
      {customerModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="font-bold text-base text-slate-900">
                {editingCustomerId ? "Edit Customer Details" : "Add New Khata Customer (نیا گاہک)"}
              </h3>
              <button onClick={() => setCustomerModalOpen(false)}>
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            <form onSubmit={handleSaveCustomer} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Customer Full Name *</label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. Haji Muhammad Aslam"
                  className="w-full px-3 py-2 border rounded-lg text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Mobile / WhatsApp</label>
                  <input
                    type="tel"
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
                    placeholder="customer@gmail.com"
                    className="w-full px-3 py-2 border rounded-lg text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Address / Mohallah</label>
                <input
                  type="text"
                  value={formAddress}
                  onChange={(e) => setFormAddress(e.target.value)}
                  placeholder="e.g. Allama Iqbal Town, Lahore"
                  className="w-full px-3 py-2 border rounded-lg text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Opening Udhaar (Rs.)
                  </label>
                  <input
                    type="number"
                    value={formInitialBalance}
                    onChange={(e) => setFormInitialBalance(Number(e.target.value))}
                    placeholder="0"
                    className="w-full px-3 py-2 border rounded-lg text-xs font-bold text-amber-700"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Credit Limit (Rs.)
                  </label>
                  <input
                    type="number"
                    value={formCreditLimit}
                    onChange={(e) => setFormCreditLimit(Number(e.target.value))}
                    className="w-full px-3 py-2 border rounded-lg text-xs font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 bg-slate-50 p-2.5 rounded-lg border">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Promise Terms (کتنے دن میں واپسی)
                  </label>
                  <select
                    value={formPaymentTermsDays}
                    onChange={(e) => {
                      const days = Number(e.target.value);
                      setFormPaymentTermsDays(days);
                      if (days > 0) {
                        const d = new Date();
                        d.setDate(d.getDate() + days);
                        setFormPaymentDueDate(d.toISOString().slice(0, 10));
                      }
                    }}
                    className="w-full px-2 py-1.5 border rounded-lg text-xs bg-white"
                  >
                    <option value={0}>No Fixed Terms</option>
                    <option value={3}>3 Days</option>
                    <option value={7}>7 Days (1 ہفتہ)</option>
                    <option value={15}>15 Days (2 ہفتے)</option>
                    <option value={30}>30 Days (1 مہینہ)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Payment Promise Date (وصولی تاریخ)
                  </label>
                  <input
                    type="date"
                    value={formPaymentDueDate}
                    onChange={(e) => setFormPaymentDueDate(e.target.value)}
                    className="w-full px-2 py-1.5 border rounded-lg text-xs bg-white font-bold"
                  />
                </div>
              </div>

              <div className="flex space-x-2 pt-2 border-t">
                <button
                  type="button"
                  onClick={() => setCustomerModalOpen(false)}
                  className="flex-1 py-2 text-xs font-semibold bg-slate-100 rounded-lg text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 text-xs font-bold bg-emerald-600 text-white rounded-lg hover:bg-emerald-500"
                >
                  Save Customer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Payment Received Modal (Udhaar recovery) */}
      {paymentModalOpen && activeCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex justify-between items-center border-b pb-3">
              <div>
                <h3 className="font-bold text-base text-slate-900">
                  Receive Payment (ادھار وصولی: {activeCustomer.name})
                </h3>
                <p className="text-xs text-amber-700 font-bold">
                  Current Khata Balance: Rs. {activeCustomer.balance.toFixed(2)}
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
                    Amount Received (وصول کی جانے والی رقم) *
                  </label>
                  <button
                    type="button"
                    onClick={() => setRecoveryAmount(activeCustomer.balance)}
                    className="text-[11px] text-emerald-700 hover:underline font-bold"
                  >
                    Receive Full (مکمل وصولی: Rs. {activeCustomer.balance.toFixed(2)})
                  </button>
                </div>
                <input
                  type="number"
                  value={recoveryAmount || ""}
                  onChange={(e) => setRecoveryAmount(Number(e.target.value))}
                  className="w-full px-3 py-2 border rounded-lg text-lg font-bold text-slate-900"
                />
                <div className="flex justify-between items-center mt-1 text-[11px]">
                  <span className="text-slate-500">Remaining Khata Balance:</span>
                  <span className="font-bold text-amber-800">
                    Rs. {Math.max(0, activeCustomer.balance - recoveryAmount).toFixed(2)}
                  </span>
                </div>
              </div>

              {/* If remaining balance is left, specify next promise date */}
              {activeCustomer.balance > recoveryAmount && (
                <div className="bg-amber-50/70 p-2.5 rounded-lg border border-amber-200">
                  <label className="block text-[11px] font-bold text-amber-900 mb-1 flex items-center">
                    <Clock className="w-3.5 h-3.5 text-amber-600 mr-1" />
                    <span>Next Payment Promise Date (اگلی وصولی کی وعدہ تاریخ):</span>
                  </label>
                  <input
                    type="date"
                    value={recoveryNextDueDate}
                    onChange={(e) => setRecoveryNextDueDate(e.target.value)}
                    className="w-full px-2 py-1.5 border rounded-lg text-xs bg-white font-bold"
                  />
                  <p className="text-[10px] text-amber-800 mt-0.5">
                    گاہک سے بقیہ ادھار رقم وصول کرنے کی اگلی تاریخ درج کریں۔
                  </p>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Payment Mode
                </label>
                <select
                  value={recoveryMethod}
                  onChange={(e) => setRecoveryMethod(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg text-xs bg-slate-50"
                >
                  <option value="CASH">Cash (کیش)</option>
                  <option value="BANK_TRANSFER">Bank Transfer (بینک)</option>
                  <option value="EASYPAISA">Easypaisa / JazzCash</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Notes / Voucher Memo</label>
                <input
                  type="text"
                  value={recoveryNotes}
                  onChange={(e) => setRecoveryNotes(e.target.value)}
                  placeholder="e.g. Received partial cash against invoice"
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
                onClick={handleConfirmRecovery}
                className="flex-1 py-2 text-xs font-bold bg-emerald-600 text-white rounded-lg hover:bg-emerald-500"
              >
                Save Receipt Voucher
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Invoice Thermal Reprint View */}
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
          balanceDue={selectedInvoice.balanceDue}
          onClose={() => setSelectedInvoice(null)}
        />
      )}
    </div>
  );
}
