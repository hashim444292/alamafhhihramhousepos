"use client";

import React, { useState } from "react";
import {
  Banknote,
  CreditCard,
  Smartphone,
  BookOpen,
  CheckCircle2,
  X,
  Loader2,
  AlertCircle,
  Clock,
} from "lucide-react";
import { usePosStore } from "@/store/pos-store";
import { useAuthStore } from "@/store/auth-store";
import { formatNumber, formatCurrency } from "@/lib/format-utils";

interface PaymentModalProps {
  isOpen: boolean;
  initialMethod?: "CASH" | "CARD" | "MOBILE_WALLET" | "CREDIT";
  onClose: () => void;
  onSuccess: (transactionData: any) => void;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({
  isOpen,
  initialMethod = "CASH",
  onClose,
  onSuccess,
}) => {
  const { user } = useAuthStore();
  const {
    cart,
    customerName,
    customerPhone,
    customerId,
    selectedCustomer,
    setSelectedCustomer,
    setCustomer,
    cartDiscountType,
    cartDiscountValue,
    getSubtotal,
    getCartDiscountAmount,
    getTaxAmount,
    getGrandTotal,
    taxRate,
    activeShift,
    isOnline,
    enqueueOfflineTransaction,
    clearCart,
  } = usePosStore();

  const grandTotal = getGrandTotal();
  const subtotal = getSubtotal();
  const discountAmount = getCartDiscountAmount();
  const taxAmount = getTaxAmount();

  const [paymentMethod, setPaymentMethod] = useState<
    "CASH" | "CARD" | "MOBILE_WALLET" | "CREDIT"
  >(initialMethod);
  const [amountTendered, setAmountTendered] = useState<number>(
    initialMethod === "CREDIT" ? 0 : grandTotal
  );
  const [processing, setProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Customer selection list & Quick-create state
  const [customerList, setCustomerList] = useState<any[]>([]);
  const [showQuickAddCust, setShowQuickAddCust] = useState(false);
  const [quickCustName, setQuickCustName] = useState("");
  const [quickCustPhone, setQuickCustPhone] = useState("");
  const [isCreatingCust, setIsCreatingCust] = useState(false);
  const [dueDate, setDueDate] = useState("");
  const [dueDaysPreset, setDueDaysPreset] = useState("7");

  React.useEffect(() => {
    if (isOpen) {
      setPaymentMethod(initialMethod);
      setAmountTendered(initialMethod === "CREDIT" ? 0 : grandTotal);
      setErrorMsg("");
      const d = new Date();
      d.setDate(d.getDate() + 7);
      setDueDate(d.toISOString().slice(0, 10));
      setDueDaysPreset("7");
      // Fetch customers
      fetch("/api/customers")
        .then((res) => res.json())
        .then((data) => {
          if (data.success) {
            setCustomerList(data.customers);
          }
        })
        .catch(() => {});
    }
  }, [isOpen, initialMethod, grandTotal]);

  if (!isOpen) return null;

  // Change calculation
  const changeDue = Math.max(0, amountTendered - grandTotal);
  // Remaining Udhaar / Baqaya if paying less than total
  const balanceDue = paymentMethod === "CREDIT" ? grandTotal : Math.max(0, grandTotal - amountTendered);

  // Validation: If walk-in customer tries to leave without full payment
  const isInsufficientCash =
    paymentMethod === "CASH" && amountTendered < grandTotal && !customerId;

  // Pakistani Rupee note denominations
  const cashPresets = [500, 1000, 2000, 5000];

  const handleSelectCustomer = (cust: any) => {
    setSelectedCustomer(cust);
    setErrorMsg("");
    if (cust.paymentTermsDays && cust.paymentTermsDays > 0) {
      const d = new Date();
      d.setDate(d.getDate() + cust.paymentTermsDays);
      setDueDate(d.toISOString().slice(0, 10));
      setDueDaysPreset(cust.paymentTermsDays.toString());
    }
  };

  const handleQuickCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickCustName) return;
    setIsCreatingCust(true);
    try {
      const res = await fetch("/api/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: quickCustName,
          phone: quickCustPhone || undefined,
          address: "Walk-in client registered at checkout",
        }),
      });
      const data = await res.json();
      if (data.success && data.customer) {
        setCustomerList((prev) => [data.customer, ...prev]);
        setSelectedCustomer(data.customer);
        setShowQuickAddCust(false);
        setQuickCustName("");
        setQuickCustPhone("");
        setErrorMsg("");
      } else {
        alert(data.error || "Failed to create client");
      }
    } catch (err: any) {
      alert(`Error creating customer: ${err.message}`);
    } finally {
      setIsCreatingCust(false);
    }
  };

  const handleCompleteSale = async () => {
    if (cart.length === 0) return;
    if (isInsufficientCash) {
      setErrorMsg("Walk-in customer must pay full amount or select registered customer for Udhaar");
      return;
    }

    if (paymentMethod === "CREDIT" && !customerId) {
      setErrorMsg("Please select a registered customer to sell on Credit (Udhaar)");
      return;
    }

    setProcessing(true);
    setErrorMsg("");

    const clientTransactionId = `client-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

    const payload = {
      clientTransactionId,
      customerId: customerId || undefined,
      customerName: customerName || "Walk-in Customer",
      customerPhone: customerPhone || undefined,
      items: cart.map((item) => ({
        productId: item.productId,
        name: item.name,
        sku: item.sku,
        unitPrice: item.unitPrice,
        costPrice: item.costPrice,
        quantity: item.quantity,
        discountAmount: item.discountAmount,
        subtotalAmount: item.subtotalAmount,
      })),
      subtotal,
      discountType: cartDiscountType,
      discountValue: cartDiscountValue,
      discountAmount,
      taxRate,
      taxAmount,
      totalAmount: grandTotal,
      paymentMethod,
      amountTendered: paymentMethod === "CREDIT" ? 0 : amountTendered,
      changeDue: paymentMethod === "CASH" ? changeDue : 0,
      balanceDue,
      dueDate: balanceDue > 0 ? (dueDate || null) : null,
      shiftId: activeShift?.id || null,
    };

    if (isOnline) {
      try {
        const res = await fetch("/api/pos/checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.error || "Server rejected transaction");
        }

        clearCart();
        onClose();
        onSuccess(data.transaction);
        return;
      } catch (err: any) {
        console.warn("Online checkout failed, falling back to offline queue:", err.message);
      }
    }

    // Offline mode: queue locally
    const offlineRecord = {
      ...payload,
      timestamp: new Date().toISOString(),
      status: "PENDING_SYNC" as const,
    };

    enqueueOfflineTransaction(offlineRecord);
    clearCart();
    onClose();

    const localInvoice = {
      invoiceNumber: `OFFLINE-${Date.now().toString().slice(-6)}`,
      createdAt: new Date().toISOString(),
      cashier: { fullName: user?.fullName || "Terminal Cashier" },
      customerName: payload.customerName,
      customerPhone: payload.customerPhone,
      items: payload.items,
      subtotal: payload.subtotal,
      discountAmount: payload.discountAmount,
      taxRate: payload.taxRate,
      taxAmount: payload.taxAmount,
      totalAmount: payload.totalAmount,
      paymentMethod: payload.paymentMethod,
      amountTendered: payload.amountTendered,
      changeDue: payload.changeDue,
      balanceDue: payload.balanceDue,
    };

    onSuccess(localInvoice);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden flex flex-col">
        {/* Modal Header */}
        <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div>
            <h3 className="font-bold text-base text-white">Select Payment Method</h3>
            <p className="text-xs text-slate-400">
              Total Payable:{" "}
              <span className="text-emerald-400 font-bold">
                {formatCurrency(grandTotal)}
              </span>
              {selectedCustomer && (
                <span className="ml-2 text-amber-300">
                  [{selectedCustomer.name} - Prev Khata: {formatCurrency(selectedCustomer.balance)}]
                </span>
              )}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-4">
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg flex items-center">
              <AlertCircle className="w-4 h-4 mr-2 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Payment Method Selectors */}
          <div className="grid grid-cols-4 gap-2">
            <button
              onClick={() => {
                setPaymentMethod("CASH");
                setAmountTendered(grandTotal);
              }}
              className={`p-3 rounded-xl border flex flex-col items-center justify-center space-y-1 transition ${
                paymentMethod === "CASH"
                  ? "bg-emerald-50 border-emerald-500 text-emerald-800 font-bold shadow-sm"
                  : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}
            >
              <Banknote className="w-5 h-5" />
              <span className="text-xs">Cash</span>
            </button>

            <button
              onClick={() => {
                setPaymentMethod("CARD");
                setAmountTendered(grandTotal);
              }}
              className={`p-3 rounded-xl border flex flex-col items-center justify-center space-y-1 transition ${
                paymentMethod === "CARD"
                  ? "bg-emerald-50 border-emerald-500 text-emerald-800 font-bold shadow-sm"
                  : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}
            >
              <CreditCard className="w-5 h-5" />
              <span className="text-xs">Card / POS</span>
            </button>

            <button
              onClick={() => {
                setPaymentMethod("MOBILE_WALLET");
                setAmountTendered(grandTotal);
              }}
              className={`p-3 rounded-xl border flex flex-col items-center justify-center space-y-1 transition ${
                paymentMethod === "MOBILE_WALLET"
                  ? "bg-emerald-50 border-emerald-500 text-emerald-800 font-bold shadow-sm"
                  : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}
            >
              <Smartphone className="w-5 h-5" />
              <span className="text-xs">Easypaisa/Jazz</span>
            </button>

            <button
              onClick={() => {
                setPaymentMethod("CREDIT");
                setAmountTendered(0);
              }}
              className={`p-3 rounded-xl border flex flex-col items-center justify-center space-y-1 transition ${
                paymentMethod === "CREDIT"
                  ? "bg-amber-50 border-amber-500 text-amber-800 font-bold shadow-sm"
                  : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}
            >
              <BookOpen className="w-5 h-5" />
              <span className="text-xs">Udhaar (کھاتہ)</span>
            </button>
          </div>

          {/* Cash Calculation Pane */}
          {paymentMethod === "CASH" && (
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Cash Received (Rs.)
                </label>
                <input
                  type="number"
                  step="any"
                  value={amountTendered || ""}
                  onChange={(e) => setAmountTendered(Number(e.target.value))}
                  className="w-full px-3 py-2 text-lg font-bold border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              {/* Quick Cash Banknote Buttons (Pakistan) */}
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => setAmountTendered(grandTotal)}
                  className="px-2.5 py-1 text-xs bg-white border border-slate-300 rounded-md font-medium text-slate-700 hover:bg-slate-100"
                >
                  Exact ({formatCurrency(grandTotal)})
                </button>
                {cashPresets.map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setAmountTendered(amt)}
                    className="px-2.5 py-1 text-xs bg-white border border-slate-300 rounded-md font-medium text-slate-700 hover:bg-slate-100"
                  >
                    {formatCurrency(amt)}
                  </button>
                ))}
              </div>

              {/* Change or Partial Balance Due */}
              <div className="pt-2 border-t border-slate-200 flex justify-between items-baseline">
                {amountTendered >= grandTotal ? (
                  <>
                    <span className="text-xs font-semibold text-slate-600">Change Return (بقایا):</span>
                    <span className="text-lg font-extrabold text-emerald-700">
                      {formatCurrency(changeDue)}
                    </span>
                  </>
                ) : (
                  <>
                    <span className="text-xs font-semibold text-amber-700">
                      Remaining Udhaar to Khata (بقایا ادھار):
                    </span>
                    <span className="text-lg font-extrabold text-amber-700">
                      {formatCurrency(balanceDue)}
                    </span>
                  </>
                )}
              </div>

              {/* If Partial Payment (Udhaar balance remaining), show Inline Customer Assignment */}
              {amountTendered < grandTotal && (
                <div className="pt-3 border-t border-amber-200 bg-amber-50/70 p-3 rounded-lg space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-amber-900">
                      ادھار کھاتہ کے لیے گاہک منتخب کریں (Assign Khata Account):
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowQuickAddCust(!showQuickAddCust)}
                      className="text-[11px] text-emerald-700 hover:underline font-bold"
                    >
                      {showQuickAddCust ? "Cancel" : "+ نیا گاہک بنائیں (+ New Client)"}
                    </button>
                  </div>

                  {/* Quick-add form */}
                  {showQuickAddCust ? (
                    <form onSubmit={handleQuickCreateCustomer} className="space-y-1.5 pt-1">
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="text"
                          required
                          placeholder="گاہک کا نام (Client Name)"
                          value={quickCustName}
                          onChange={(e) => setQuickCustName(e.target.value)}
                          className="px-2.5 py-1.5 text-xs border rounded bg-white"
                        />
                        <input
                          type="tel"
                          placeholder="فون نمبر (Phone)"
                          value={quickCustPhone}
                          onChange={(e) => setQuickCustPhone(e.target.value)}
                          className="px-2.5 py-1.5 text-xs border rounded bg-white"
                        />
                      </div>
                      <button
                        type="submit"
                        disabled={isCreatingCust}
                        className="w-full py-1.5 bg-emerald-600 text-white rounded text-xs font-bold hover:bg-emerald-500"
                      >
                        {isCreatingCust ? "Saving Client..." : "Save & Assign to Khata"}
                      </button>
                    </form>
                  ) : (
                    /* Customer Dropdown */
                    <select
                      value={customerId || ""}
                      onChange={(e) => {
                        const found = customerList.find((c) => c.id === e.target.value);
                        if (found) {
                          handleSelectCustomer(found);
                        } else {
                          setSelectedCustomer(null);
                        }
                      }}
                      className="w-full px-3 py-2 text-xs bg-white border border-amber-300 rounded-lg text-slate-800 font-medium focus:ring-2 focus:ring-amber-500"
                    >
                      <option value="">-- گاہک منتخب کریں (Select Khata Client) --</option>
                      {customerList.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} {c.phone ? `(${c.phone})` : ""} - Baqaya: Rs. {c.balance.toFixed(0)}
                        </option>
                      ))}
                    </select>
                  )}

                  {selectedCustomer && (
                    <div className="space-y-2">
                      <div className="text-[11px] text-emerald-800 font-semibold bg-emerald-100/60 p-1.5 rounded">
                        ✓ Remaining Rs. {balanceDue.toFixed(2)} will be debited to{" "}
                        <strong>{selectedCustomer.name}</strong> (Total new Baqaya: Rs.{" "}
                        {(selectedCustomer.balance + balanceDue).toFixed(2)})
                      </div>
                      <div className="pt-1">
                        <label className="block text-[10px] font-bold text-amber-900 mb-1 flex items-center">
                          <Clock className="w-3 h-3 text-amber-600 mr-1" />
                          <span>Promise Due Date for Remaining Rs. {balanceDue.toFixed(0)}:</span>
                        </label>
                        <input
                          type="date"
                          value={dueDate}
                          onChange={(e) => setDueDate(e.target.value)}
                          className="w-full px-2 py-1 border rounded text-xs bg-white font-bold"
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Credit Sale Summary */}
          {paymentMethod === "CREDIT" && (
            <div className="bg-amber-50 p-4 rounded-xl border border-amber-200 text-xs space-y-3">
              <div className="flex justify-between items-center">
                <div className="font-bold text-amber-950 text-sm">
                  📖 Credit / Udhaar Transaction (کھاتہ دار ادھار)
                </div>
                <button
                  type="button"
                  onClick={() => setShowQuickAddCust(!showQuickAddCust)}
                  className="text-xs text-emerald-800 font-bold hover:underline"
                >
                  {showQuickAddCust ? "Cancel" : "+ نیا گاہک بنائیں (+ New Client)"}
                </button>
              </div>

              {showQuickAddCust ? (
                <form onSubmit={handleQuickCreateCustomer} className="space-y-2 bg-white p-3 rounded-lg border border-amber-200">
                  <div className="font-semibold text-slate-800 text-[11px]">
                    Create & Select New Khata Client:
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      required
                      placeholder="گاہک کا نام (Client Name)"
                      value={quickCustName}
                      onChange={(e) => setQuickCustName(e.target.value)}
                      className="px-2.5 py-1.5 text-xs border rounded bg-white"
                    />
                    <input
                      type="tel"
                      placeholder="فون نمبر (Phone)"
                      value={quickCustPhone}
                      onChange={(e) => setQuickCustPhone(e.target.value)}
                      className="px-2.5 py-1.5 text-xs border rounded bg-white"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={isCreatingCust}
                    className="w-full py-1.5 bg-emerald-600 text-white rounded text-xs font-bold hover:bg-emerald-500"
                  >
                    {isCreatingCust ? "Saving Client..." : "Save & Assign to Khata"}
                  </button>
                </form>
              ) : (
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    Select Registered Client (رجسٹرڈ گاہک منتخب کریں):
                  </label>
                  <select
                    value={customerId || ""}
                    onChange={(e) => {
                      const found = customerList.find((c) => c.id === e.target.value);
                      if (found) {
                        handleSelectCustomer(found);
                      } else {
                        setSelectedCustomer(null);
                      }
                    }}
                    className="w-full px-3 py-2 text-xs bg-white border border-amber-300 rounded-lg text-slate-900 font-bold focus:ring-2 focus:ring-amber-500"
                  >
                    <option value="">-- رجسٹرڈ گاہک منتخب کریں (Choose Client) --</option>
                    {customerList.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} {c.phone ? `(${c.phone})` : ""} - سابقہ بقایا: Rs. {c.balance.toFixed(0)}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {selectedCustomer ? (
                <div className="bg-white/80 p-3 rounded-lg border border-amber-200 space-y-1">
                  <div className="flex justify-between">
                    <span className="text-slate-600">Client Name:</span>
                    <strong className="text-slate-900">{selectedCustomer.name}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Current Balance:</span>
                    <span className="font-bold text-slate-700">Rs. {selectedCustomer.balance.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">This Bill (Udhaar):</span>
                    <span className="font-extrabold text-amber-800">+ Rs. {grandTotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between pt-1 border-t border-slate-200 text-xs">
                    <span className="font-bold text-slate-900">Total New Balance:</span>
                    <span className="font-black text-rose-700">
                      Rs. {(selectedCustomer.balance + grandTotal).toFixed(2)}
                    </span>
                  </div>

                  {/* Promise Due Date Selector */}
                  <div className="pt-2 border-t border-amber-200">
                    <label className="block text-[11px] font-bold text-amber-900 mb-1 flex items-center">
                      <Clock className="w-3.5 h-3.5 text-amber-600 mr-1" />
                      <span>Payment Promise / Recovery Date (ادھار واپسی کی تاریخ):</span>
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <select
                        value={dueDaysPreset}
                        onChange={(e) => {
                          const val = e.target.value;
                          setDueDaysPreset(val);
                          if (val !== "custom") {
                            const days = Number(val);
                            const d = new Date();
                            d.setDate(d.getDate() + days);
                            setDueDate(d.toISOString().slice(0, 10));
                          }
                        }}
                        className="px-2 py-1.5 border rounded-lg text-xs bg-white"
                      >
                        <option value="3">In 3 Days (3 دن بعد)</option>
                        <option value="7">In 7 Days (1 ہفتہ بعد)</option>
                        <option value="15">In 15 Days (2 ہفتے بعد)</option>
                        <option value="30">In 30 Days (1 مہینہ بعد)</option>
                        <option value="custom">Custom Date (اپنی تاریخ)</option>
                      </select>
                      <input
                        type="date"
                        value={dueDate}
                        onChange={(e) => {
                          setDueDate(e.target.value);
                          setDueDaysPreset("custom");
                        }}
                        className="px-2 py-1.5 border rounded-lg text-xs bg-white font-bold text-slate-800"
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-amber-800 text-[11px] bg-amber-100/60 p-2 rounded">
                  ⚠️ Udhaar sale requires choosing a registered customer account so their ledger is properly tracked.
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex space-x-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 text-sm font-semibold text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-100 transition"
          >
            Cancel
          </button>

          <button
            disabled={processing || isInsufficientCash}
            onClick={handleCompleteSale}
            className={`flex-1 py-3 text-sm font-bold text-white rounded-xl shadow-lg transition flex items-center justify-center space-x-2 ${
              processing || isInsufficientCash
                ? "bg-slate-300 cursor-not-allowed shadow-none"
                : "bg-emerald-600 hover:bg-emerald-500 shadow-emerald-700/20"
            }`}
          >
            {processing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Processing...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>Confirm & Complete</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
