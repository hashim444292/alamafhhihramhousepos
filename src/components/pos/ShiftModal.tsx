"use client";

import React, { useState } from "react";
import { Clock, DollarSign, X, CheckCircle, AlertTriangle, Printer } from "lucide-react";
import { usePosStore } from "@/store/pos-store";
import { useAuthStore } from "@/store/auth-store";
import { formatCurrency } from "@/lib/format-utils";

interface ShiftModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ShiftModal: React.FC<ShiftModalProps> = ({ isOpen, onClose }) => {
  const { user } = useAuthStore();
  const { activeShift, setActiveShift } = usePosStore();

  const [openingCashInput, setOpeningCashInput] = useState<number>(0);
  const [closingCashInput, setClosingCashInput] = useState<number>(0);
  const [shiftNotes, setShiftNotes] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [zReportData, setZReportData] = useState<any | null>(null);
  const [lastClosedShift, setLastClosedShift] = useState<any | null>(null);

  // Fetch shift data and previous cashier handover info
  React.useEffect(() => {
    if (!isOpen) return;

    async function fetchShiftInfo() {
      try {
        const res = await fetch("/api/pos/shifts");
        const data = await res.json();
        if (data.success) {
          if (data.lastClosedShift) {
            setLastClosedShift(data.lastClosedShift);
            // Default opening cash to previous cashier's left cash if starting fresh
            if (!activeShift && data.lastClosedShift.closingCash !== null && data.lastClosedShift.closingCash !== undefined) {
              setOpeningCashInput(data.lastClosedShift.closingCash);
            }
          }
        }
      } catch (err) {
        console.error("Error fetching shift info:", err);
      }
    }
    fetchShiftInfo();
  }, [isOpen, activeShift]);

  if (!isOpen) return null;

  const handleOpenShift = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/pos/shifts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          openingCash: openingCashInput,
          notes: shiftNotes || "Cashier register opened",
        }),
      });
      const data = await res.json();
      if (data.success) {
        setActiveShift(data.shift);
        alert("Shift opened successfully! نیا رجسٹر شروع ہو چکا ہے۔");
        onClose();
      } else {
        alert(data.error);
      }
    } catch (e: any) {
      alert(`Error: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleCloseShift = async () => {
    if (!activeShift) return;
    if (!confirm("Are you sure you want to end this shift and print the Z-Report?")) return;

    setLoading(true);
    try {
      const res = await fetch("/api/pos/shifts/close", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shiftId: activeShift.id,
          closingCash: closingCashInput,
          notes: shiftNotes,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setZReportData(data.zReport);
        setActiveShift(null);
      } else {
        alert(data.error);
      }
    } catch (e: any) {
      alert(`Error: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Clock className="w-5 h-5 text-emerald-400" />
            <span className="font-bold text-sm">
              {zReportData
                ? "Z-Report / Shift Closed"
                : activeShift
                ? "Shift Management & Drawer Reconciliation"
                : "Open Cashier Shift"}
            </span>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-slate-800 rounded-lg text-slate-400">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto space-y-4">
          {zReportData ? (
            /* Z-Report Summary */
            <div id="zreport-printable-area" className="space-y-4 font-mono text-xs">
              <div className="text-center pb-2 border-b border-dashed border-slate-300">
                <h4 className="font-bold text-sm text-slate-900">DAILY Z-REPORT RECORD</h4>
                <p className="text-slate-500">Terminal Shift #{zReportData.shiftNumber || 1}</p>
                <p className="text-slate-500">Cashier: {zReportData.cashier?.fullName}</p>
                <p className="text-slate-500">
                  Closed: {new Date(zReportData.closedAt).toLocaleString()}
                </p>
              </div>

              <div className="space-y-1.5 border-b border-dashed border-slate-300 pb-3">
                <div className="flex justify-between">
                  <span>Opening Cash Float:</span>
                  <span>{formatCurrency(zReportData.openingCash)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Total Cash Sales:</span>
                  <span>{formatCurrency(zReportData.cashSales)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Total Card Sales:</span>
                  <span>{formatCurrency(zReportData.cardSales)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Total Mobile Wallet Sales:</span>
                  <span>{formatCurrency(zReportData.mobileSales)}</span>
                </div>
                <div className="flex justify-between font-bold text-slate-900 pt-1 border-t border-slate-200">
                  <span>Gross Sales Amount:</span>
                  <span>{formatCurrency(zReportData.totalSalesAmount)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Total Invoices Count:</span>
                  <span>{zReportData.totalTransactions}</span>
                </div>
              </div>

              {/* Cash Reconciliation */}
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-1.5">
                <div className="flex justify-between font-semibold">
                  <span>System Expected Cash:</span>
                  <span>{formatCurrency(zReportData.systemExpectedCash)}</span>
                </div>
                <div className="flex justify-between font-semibold">
                  <span>Physical Cash Counted:</span>
                  <span>{formatCurrency(zReportData.closingCash)}</span>
                </div>
                <div
                  className={`flex justify-between font-bold pt-1 border-t border-slate-200 ${
                    zReportData.cashDifference >= 0 ? "text-emerald-700" : "text-rose-600"
                  }`}
                >
                  <span>Difference (Overage/Shortage):</span>
                  <span>{formatCurrency(zReportData.cashDifference)}</span>
                </div>
              </div>

              <div className="flex space-x-2 pt-2">
                <button
                  onClick={() => window.print()}
                  className="flex-1 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold flex items-center justify-center space-x-1.5"
                >
                  <Printer className="w-4 h-4" />
                  <span>Print Z-Report</span>
                </button>
                <button
                  onClick={onClose}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold"
                >
                  Close
                </button>
              </div>
            </div>
          ) : activeShift ? (
            /* Active Shift Info & Close Form */
            <div className="space-y-4">
              <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-xl">
                <div className="flex items-center space-x-2 text-emerald-800 font-bold text-xs">
                  <CheckCircle className="w-4 h-4 text-emerald-600" />
                  <span>Shift is currently OPEN</span>
                </div>
                <div className="mt-2 text-xs text-slate-600 space-y-1">
                  <div>Cashier: <strong className="text-slate-900">{user?.fullName}</strong></div>
                  <div>Opened: <strong>{new Date(activeShift.openedAt).toLocaleTimeString()}</strong></div>
                  <div>Opening Float: <strong>{formatCurrency(activeShift.openingCash)}</strong></div>
                  <div>Shift Sales to Date: <strong>{formatCurrency(activeShift.totalSalesAmount)}</strong> ({activeShift.totalTransactions} transactions)</div>
                </div>
              </div>

              <div className="border-t border-slate-200 pt-3">
                <h4 className="font-bold text-xs text-slate-800 mb-2">
                  Close Shift & Cash Drawer Reconciliation
                </h4>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Counted Physical Cash in Drawer (Rs.)
                    </label>
                    <input
                      type="number"
                      step="any"
                      value={closingCashInput || ""}
                      onChange={(e) => setClosingCashInput(Number(e.target.value))}
                      placeholder="Count and enter physical cash..."
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-bold focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Closing Shift Notes / Remarks
                    </label>
                    <textarea
                      rows={2}
                      value={shiftNotes}
                      onChange={(e) => setShiftNotes(e.target.value)}
                      placeholder="Optional shift notes..."
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                  </div>

                  <button
                    disabled={loading}
                    onClick={handleCloseShift}
                    className="w-full py-3 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl text-sm transition shadow-md"
                  >
                    {loading ? "Reconciling..." : "End Shift & Generate Z-Report"}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* Open Shift Form with Cashier Handover Reconciliation */
            <div className="space-y-4">
              {/* Previous Shift Handover Audit Card */}
              {lastClosedShift ? (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-amber-900 flex items-center space-x-1.5">
                      <Clock className="w-4 h-4 text-amber-600" />
                      <span>پچھلے کیشیئر کی کلوزنگ (Previous Shift Handover)</span>
                    </span>
                    <span className="text-[10px] bg-amber-200/80 text-amber-900 font-bold px-2 py-0.5 rounded-full">
                      Shift #{lastClosedShift.shiftNumber}
                    </span>
                  </div>

                  <div className="text-xs text-amber-950 space-y-1 bg-white/70 p-2.5 rounded-lg border border-amber-100">
                    <div className="flex justify-between">
                      <span className="text-slate-500">پچھلا کیشیئر (Duty Off By):</span>
                      <strong className="text-slate-900">{lastClosedShift.cashierName}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">کلوزنگ وقت (Duty Ended At):</span>
                      <span>{new Date(lastClosedShift.closedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ({new Date(lastClosedShift.closedAt).toLocaleDateString()})</span>
                    </div>
                    <div className="flex justify-between font-bold border-t border-amber-100 pt-1 mt-1">
                      <span className="text-amber-900">دراز میں چھوڑا گیا کیش (Cash Handed Over):</span>
                      <span className="text-amber-800 font-black text-sm">
                        {formatCurrency(lastClosedShift.closingCash)}
                      </span>
                    </div>
                    {lastClosedShift.notes && (
                      <div className="text-[11px] text-slate-500 italic mt-0.5">
                        نوٹ: "{lastClosedShift.notes}"
                      </div>
                    )}
                  </div>
                  <p className="text-[11px] text-amber-800 leading-tight">
                    💡 <strong>ہدایت:</strong> دراز میں موجود نوٹ گن کر درج کریں۔ اگر پچھلے کیشیئر کی بتائی گئی رقم اور آپ کی گنی ہوئی رقم میں فرق ہے تو نظام خودکار طور پر فرق ظاہر کرے گا۔
                  </p>
                </div>
              ) : (
                <div className="bg-blue-50 border border-blue-200 p-3 rounded-xl text-xs text-blue-900">
                  یہ سسٹم کی پہلی رجسٹر شفٹ ہے۔ دراز میں موجود ابتدائی اوپننگ کیش (Float) درج کر کے شفٹ شروع کریں۔
                </div>
              )}

              {/* Opening Cash Input */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-800">
                  گن کر دراز میں موجود کیش درج کریں (Counted Opening Cash in Drawer)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="any"
                    value={openingCashInput || ""}
                    onChange={(e) => setOpeningCashInput(Number(e.target.value))}
                    placeholder="مثلاً 500 یا پچھلی کلوزنگ کی رقم..."
                    className="w-full px-3 py-2.5 border border-slate-300 rounded-xl text-base font-black text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                  <span className="absolute right-3 top-3 text-xs font-bold text-slate-400">
                    Rs. (روپے)
                  </span>
                </div>

                {/* Real-time Handover Difference Audit */}
                {lastClosedShift && (
                  <div
                    className={`text-xs p-2.5 rounded-lg border flex items-center justify-between ${
                      openingCashInput === lastClosedShift.closingCash
                        ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                        : "bg-rose-50 border-rose-200 text-rose-700"
                    }`}
                  >
                    <span className="font-medium flex items-center space-x-1">
                      {openingCashInput === lastClosedShift.closingCash ? (
                        <>
                          <CheckCircle className="w-3.5 h-3.5 text-emerald-600 inline mr-1" />
                          <span>رقم پچھلی کلوزنگ سے بالکل برابر ہے (Perfect Match)</span>
                        </>
                      ) : (
                        <>
                          <AlertTriangle className="w-3.5 h-3.5 text-rose-600 inline mr-1" />
                          <span>ہینڈ اوور میں فرق ہے (Handover Discrepancy)</span>
                        </>
                      )}
                    </span>
                    <span className="font-black text-xs">
                      فرق: {formatCurrency(openingCashInput - lastClosedShift.closingCash)}
                    </span>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  کیشیئر شفٹ نوٹ / ریمارکس (Shift Notes)
                </label>
                <input
                  type="text"
                  value={shiftNotes}
                  onChange={(e) => setShiftNotes(e.target.value)}
                  placeholder="مثلاً: Morning Shift شروع کی، پچھلا کیش چیک کر لیا"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <button
                disabled={loading}
                onClick={handleOpenShift}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-sm transition shadow-md flex items-center justify-center space-x-1"
              >
                <Clock className="w-4 h-4" />
                <span>{loading ? "اوپن ہو رہا ہے..." : "شروع کریں / Open Cashier Shift"}</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
