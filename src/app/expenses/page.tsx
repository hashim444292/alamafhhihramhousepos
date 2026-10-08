"use client";

import React, { useState, useEffect } from "react";
import {
  Receipt,
  PlusCircle,
  Tag,
  DollarSign,
  Calendar,
  AlertCircle,
  CheckCircle,
} from "lucide-react";
import { useAuthStore } from "@/store/auth-store";
import { formatCurrency } from "@/lib/format-utils";

export default function ExpensesPage() {
  const { user } = useAuthStore();
  const [expenses, setExpenses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Form State
  const [category, setCategory] = useState<string>("PACKAGING");
  const [amount, setAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<string>("CASH");
  const [description, setDescription] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const fetchExpenses = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/expenses");
      const data = await res.json();
      if (data.success) {
        setExpenses(data.expenses);
      }
    } catch (e) {
      console.error("Failed to load expenses:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExpenses();
  }, []);

  const handleRecordExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (amount <= 0 || !description.trim()) {
      setMsg({ type: "error", text: "Please enter a valid amount and description" });
      return;
    }

    setSubmitting(true);
    setMsg(null);

    try {
      const res = await fetch("/api/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category,
          amount,
          paymentMethod,
          description,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setMsg({ type: "success", text: "Expense recorded successfully!" });
        setDescription("");
        setAmount(0);
        fetchExpenses();
      } else {
        setMsg({ type: "error", text: data.error || "Failed to record expense" });
      }
    } catch (err: any) {
      setMsg({ type: "error", text: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  const totalExpenseAmount = expenses.reduce((acc, exp) => acc + exp.amount, 0);

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center space-x-2">
          <Receipt className="w-7 h-7 text-emerald-600" />
          <span>Store Expenses & Cost Logging</span>
        </h1>
        <p className="text-xs sm:text-sm text-slate-500">
          Track overhead costs: showroom rent, electricity, packaging bags, and shipping
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Expense Creation Form (1 column) */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <h3 className="font-bold text-sm text-slate-900 flex items-center space-x-2">
            <PlusCircle className="w-4 h-4 text-emerald-600" />
            <span>Record New Operating Expense</span>
          </h3>

          {msg && (
            <div
              className={`p-3 rounded-lg text-xs flex items-center space-x-2 ${
                msg.type === "success"
                  ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                  : "bg-rose-50 text-rose-800 border border-rose-200"
              }`}
            >
              {msg.type === "success" ? (
                <CheckCircle className="w-4 h-4 flex-shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
              )}
              <span>{msg.text}</span>
            </div>
          )}

          <form onSubmit={handleRecordExpense} className="space-y-3.5">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-slate-50 font-medium"
              >
                <option value="PACKAGING">Packaging (Shopping Bags, Ihram Boxes)</option>
                <option value="RENT">Showroom Rent</option>
                <option value="UTILITIES">Utilities (Electricity & Cooling)</option>
                <option value="TRANSPORT">Logistics & Transportation</option>
                <option value="SALARIES">Staff Wages</option>
                <option value="MARKETING">Marketing & Signage</option>
                <option value="MISC">Miscellaneous Supplies</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Amount (Rs.)
              </label>
              <input
                type="number"
                min="0.01"
                step="any"
                value={amount || ""}
                onChange={(e) => setAmount(Number(e.target.value))}
                placeholder="0.00"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-bold"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Payment Channel
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-slate-50 font-medium"
              >
                <option value="CASH">Cash Drawer</option>
                <option value="CARD">Debit / Corporate Card</option>
                <option value="BANK_TRANSFER">Bank Transfer</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Description / Memo
              </label>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g. 1000 branded Ihram gift bags printed by Jeddah Press"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs transition shadow-md"
            >
              {submitting ? "Logging..." : "Save Expense Record"}
            </button>
          </form>
        </div>

        {/* Expenses List & Summary (2 columns) */}
        <div className="lg:col-span-2 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4 flex flex-col">
          <div className="flex items-center justify-between border-b pb-3">
            <div>
              <h3 className="font-bold text-base text-slate-900">Expenses Log</h3>
              <p className="text-xs text-slate-500">Total recorded expenses</p>
            </div>
            <div className="text-right">
              <span className="text-xs text-slate-400 font-medium">Total Outflow:</span>
              <div className="text-lg font-black text-rose-600">
                {formatCurrency(totalExpenseAmount)}
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b">
                <tr>
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3">Category</th>
                  <th className="py-2.5 px-3">Description</th>
                  <th className="py-2.5 px-3">Mode</th>
                  <th className="py-2.5 px-3 text-right">Amount (Rs.)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-400">
                      Loading expenses...
                    </td>
                  </tr>
                ) : expenses.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-400">
                      No expenses logged yet.
                    </td>
                  </tr>
                ) : (
                  expenses.map((exp) => (
                    <tr key={exp.id} className="hover:bg-slate-50">
                      <td className="py-2.5 px-3 text-slate-500 whitespace-nowrap">
                        {new Date(exp.date).toLocaleDateString()}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-800">
                          {exp.category}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-slate-700">{exp.description}</td>
                      <td className="py-2.5 px-3 text-slate-500 text-xs font-mono">
                        {exp.paymentMethod}
                      </td>
                      <td className="py-2.5 px-3 text-right font-black text-rose-600 whitespace-nowrap">
                        {formatCurrency(exp.amount)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
