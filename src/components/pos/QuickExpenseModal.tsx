"use client";

import React, { useState } from "react";
import { Receipt, DollarSign, X, CheckCircle, AlertTriangle } from "lucide-react";
import { useAuthStore } from "@/store/auth-store";
import { formatCurrency } from "@/lib/format-utils";

interface QuickExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExpenseAdded?: () => void;
}

export const QuickExpenseModal: React.FC<QuickExpenseModalProps> = ({
  isOpen,
  onClose,
  onExpenseAdded,
}) => {
  const { user } = useAuthStore();
  const [category, setCategory] = useState<string>("TEA_REFRESHMENT");
  const [amount, setAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<string>("CASH");
  const [description, setDescription] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (amount <= 0) {
      setError("برائے مہربانی درست رقم درج کریں۔ (Please enter a valid amount)");
      return;
    }
    if (!description.trim()) {
      setError("خرچے کی تفصیل لکھنا لازمی ہے۔ (Description is required)");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category,
          amount,
          paymentMethod,
          description: description.trim(),
        }),
      });

      const data = await res.json();
      if (data.success) {
        alert("خرچہ درج ہو گیا ہے۔ اگر دراز سے ادا کیا ہے تو کلوزنگ کے وقت یہ رقم منہا ہو گی۔ (Expense recorded successfully)");
        setAmount(0);
        setDescription("");
        if (onExpenseAdded) onExpenseAdded();
        onClose();
      } else {
        setError(data.error || "خرچہ درج کرنے میں ناکامی ہوئی");
      }
    } catch (err: any) {
      setError(err.message || "نیٹ ورک کی خرابی");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden flex flex-col my-auto max-h-[calc(100vh-2rem)]">
        {/* Header */}
        <div className="px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-2">
            <Receipt className="w-5 h-5 text-amber-400" />
            <span className="font-bold text-sm">
              روزمرہ دکان خرچہ / Daily Store Expense
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-slate-800 rounded-lg text-slate-400"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Form */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-5 flex-1 min-h-0 overflow-y-auto space-y-3.5">
          {error && (
            <div className="p-2.5 bg-rose-50 border border-rose-300 rounded-xl text-rose-800 text-xs font-semibold flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Cashier Badge */}
          <div className="bg-slate-50 border border-slate-200 p-2.5 rounded-xl flex items-center justify-between text-xs">
            <span className="text-slate-500">کیشیئر (Recorded By):</span>
            <span className="font-bold text-slate-900">
              {user?.fullName || "Staff"} ({user?.role})
            </span>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              خرچے کی مد / Category
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-bold bg-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
            >
              <option value="TEA_REFRESHMENT">چائے و ریفریشمنٹ (Tea & Refreshment)</option>
              <option value="PACKAGING">پیکنگ بیگز و شاپر (Packaging Bags)</option>
              <option value="TRANSPORT">کرایہ / ترسیل (Transport / Delivery)</option>
              <option value="UTILITIES">یوٹیلیٹی / صفائی (Utilities & Cleaning)</option>
              <option value="MISC">دیگر متفرق اخراجات (Miscellaneous)</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                رقم / Amount (Rs.)
              </label>
              <input
                type="number"
                step="any"
                min="1"
                value={amount || ""}
                onChange={(e) => setAmount(Number(e.target.value))}
                placeholder="مثلاً 250"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-black text-slate-900 focus:ring-2 focus:ring-amber-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                ادائیگی کا طریقہ / Source
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-semibold bg-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
              >
                <option value="CASH">دراز سے نقد (Cash Drawer)</option>
                <option value="CARD">کارڈ (Card)</option>
                <option value="BANK_TRANSFER">بینک ٹرانسفر (Bank)</option>
              </select>
            </div>
          </div>

          {paymentMethod === "CASH" && (
            <p className="text-[11px] text-amber-800 bg-amber-50 border border-amber-200 p-2 rounded-lg leading-tight">
              💡 <strong>نوٹ:</strong> دراز سے ادا شدہ کیش آپ کے شفٹ کے اختتام پر متوقع کیش (Expected Cash) سے خودکار طور پر کم کر دیا جائے گا۔
            </p>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              خرچے کی تفصیل / Description & Memo
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="مثلاً: گاہکوں اور اسٹاف کی شام کی چائے اور بسکٹ"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none"
            />
          </div>

          <div className="pt-2 flex space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs"
            >
              منسوخ (Cancel)
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2.5 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-xl text-xs transition shadow-md"
            >
              {loading ? "محفوظ ہو رہا ہے..." : "خرچہ درج کریں (Save Expense)"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
