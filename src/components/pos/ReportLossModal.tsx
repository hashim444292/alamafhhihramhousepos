import React, { useState, useEffect } from "react";
import { AlertTriangle, Package, X, Search, CheckCircle, History, PlusCircle, RefreshCw } from "lucide-react";
import { useAuthStore } from "@/store/auth-store";
import { formatCurrency, formatNumber } from "@/lib/format-utils";

interface ReportLossModalProps {
  isOpen: boolean;
  products: any[];
  onClose: () => void;
  onLossReported?: () => void;
}

export const ReportLossModal: React.FC<ReportLossModalProps> = ({
  isOpen,
  products,
  onClose,
  onLossReported,
}) => {
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState<"report" | "history">("report");
  const [search, setSearch] = useState("");
  const [selectedProductId, setSelectedProductId] = useState<string>("");
  const [quantity, setQuantity] = useState<number>(1);
  const [movementType, setMovementType] = useState<"STOCK_OUT_DAMAGE" | "STOCK_OUT_STOLEN">(
    "STOCK_OUT_DAMAGE"
  );
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // History state
  const [historyMovements, setHistoryMovements] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyFilter, setHistoryFilter] = useState<"ALL" | "DAMAGE" | "STOLEN">("ALL");

  const fetchHistory = async () => {
    setHistoryLoading(true);
    try {
      const res = await fetch("/api/inventory/stock-movements?movementType=LOSS&limit=100");
      const data = await res.json();
      if (data.success) {
        setHistoryMovements(data.movements || []);
      }
    } catch (e) {
      console.error("Failed to load loss history:", e);
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchHistory();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const filteredProducts = products.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.sku.toLowerCase().includes(search.toLowerCase()) ||
      p.barcode.includes(search)
  );

  const selectedProduct = products.find((p) => p.id === selectedProductId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProductId || !selectedProduct) {
      setError("برائے مہربانی پہلے آئٹم منتخب کریں۔ (Please select an item)");
      return;
    }
    if (quantity <= 0) {
      setError("تعداد کم از کم 1 ہونا ضروری ہے۔ (Quantity must be at least 1)");
      return;
    }
    if (quantity > selectedProduct.stockQuantity) {
      setError(
        `موجودہ اسٹاک صرف ${selectedProduct.stockQuantity} ہے، اس سے زیادہ کٹوتی ممکن نہیں۔`
      );
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/inventory/stock-movements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: selectedProductId,
          quantity: quantity,
          movementType,
          notes: notes.trim() || (movementType === "STOCK_OUT_DAMAGE" ? "Damaged / Broken item reported" : "Stolen / Lost item reported"),
        }),
      });

      const data = await res.json();
      if (data.success) {
        alert(
          `نقصان کا اندراج ہو گیا ہے۔ اسٹاک سے ${quantity} عدد منہا کر دیے گئے ہیں۔ (Loss record logged, stock deducted)`
        );
        setSelectedProductId("");
        setQuantity(1);
        setNotes("");
        setSearch("");
        if (onLossReported) onLossReported();
        await fetchHistory();
        setActiveTab("history");
      } else {
        setError(data.error || "نقصان درج کرنے میں ناکامی ہوئی");
      }
    } catch (err: any) {
      setError(err.message || "نیٹ ورک کی خرابی");
    } finally {
      setLoading(false);
    }
  };

  const filteredHistory = historyMovements.filter((m) => {
    if (historyFilter === "DAMAGE") return m.movementType === "STOCK_OUT_DAMAGE";
    if (historyFilter === "STOLEN") return m.movementType === "STOCK_OUT_STOLEN";
    return true;
  });

  const totalBrokenQty = historyMovements
    .filter((m) => m.movementType === "STOCK_OUT_DAMAGE")
    .reduce((sum, m) => sum + Math.abs(m.quantity || 0), 0);

  const totalStolenQty = historyMovements
    .filter((m) => m.movementType === "STOCK_OUT_STOLEN")
    .reduce((sum, m) => sum + Math.abs(m.quantity || 0), 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden flex flex-col my-auto max-h-[calc(100vh-2rem)]">
        {/* Header */}
        <div className="px-5 py-3.5 bg-rose-950 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-5 h-5 text-rose-400" />
            <span className="font-bold text-sm">
              ٹوٹ پھوٹ / چوری کا اندراج و تصدیق (Damage & Stolen Log)
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-rose-900 rounded-lg text-rose-300"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Buttons */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-3 pt-2 gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab("report")}
            className={`flex-1 py-2 text-xs font-bold rounded-t-lg flex items-center justify-center space-x-1.5 transition ${
              activeTab === "report"
                ? "bg-white text-rose-900 border-t border-x border-slate-200 shadow-xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            }`}
          >
            <PlusCircle className="w-3.5 h-3.5 text-rose-600" />
            <span>+ نیا اندراج (Report Loss)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("history")}
            className={`flex-1 py-2 text-xs font-bold rounded-t-lg flex items-center justify-center space-x-1.5 transition ${
              activeTab === "history"
                ? "bg-white text-rose-900 border-t border-x border-slate-200 shadow-xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            }`}
          >
            <History className="w-3.5 h-3.5 text-slate-700" />
            <span>ریکارڈ دیکھیں ({historyMovements.length})</span>
          </button>
        </div>

        {/* TAB 1: REPORT FORM */}
        {activeTab === "report" && (
          <form onSubmit={handleSubmit} className="p-4 sm:p-5 space-y-3.5 flex-1 min-h-0 overflow-y-auto">
            {error && (
              <div className="p-2.5 bg-rose-50 border border-rose-300 rounded-xl text-rose-800 text-xs font-semibold flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* User Badge */}
            <div className="bg-slate-50 border border-slate-200 p-2.5 rounded-xl flex items-center justify-between text-xs">
              <span className="text-slate-500">رپورٹ کنندہ (Reported By):</span>
              <span className="font-bold text-slate-900">
                {user?.fullName || "Staff"} ({user?.role})
              </span>
            </div>

            {/* Loss Type */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                نقصان کی نوعیت / Reason Type
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setMovementType("STOCK_OUT_DAMAGE")}
                  className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center space-x-1.5 transition ${
                    movementType === "STOCK_OUT_DAMAGE"
                      ? "bg-rose-100 border-rose-400 text-rose-900 shadow-xs"
                      : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  <span>🔨</span>
                  <span>ٹوٹ پھوٹ / Damage</span>
                </button>
                <button
                  type="button"
                  onClick={() => setMovementType("STOCK_OUT_STOLEN")}
                  className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center space-x-1.5 transition ${
                    movementType === "STOCK_OUT_STOLEN"
                      ? "bg-amber-100 border-amber-400 text-amber-900 shadow-xs"
                      : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  <span>🕵️</span>
                  <span>چوری / لاپتہ / Stolen</span>
                </button>
              </div>
            </div>

            {/* Product Search & Selection */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                آئٹم تلاش کریں یا منتخب کریں (Select Product)
              </label>
              <div className="relative mb-2">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="نام، بارکوڈ یا SKU لکھیں..."
                  className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-rose-500 focus:outline-none"
                />
              </div>

              <div className="max-h-36 overflow-y-auto border border-slate-200 rounded-xl divide-y divide-slate-100 bg-slate-50/50">
                {filteredProducts.slice(0, 15).map((p) => (
                  <div
                    key={p.id}
                    onClick={() => {
                      setSelectedProductId(p.id);
                      setSearch(p.name);
                    }}
                    className={`p-2 text-xs cursor-pointer flex items-center justify-between transition ${
                      selectedProductId === p.id
                        ? "bg-rose-50 font-bold text-rose-950"
                        : "hover:bg-slate-100 text-slate-800"
                    }`}
                  >
                    <div className="truncate mr-2">
                      <span className="block truncate">{p.name}</span>
                      <span className="text-[10px] text-slate-400">{p.barcode}</span>
                    </div>
                    <div className="shrink-0 text-right">
                      <span className="text-[11px] font-bold text-slate-600">
                        اسٹاک: {p.stockQuantity}
                      </span>
                    </div>
                  </div>
                ))}
                {filteredProducts.length === 0 && (
                  <div className="p-3 text-center text-xs text-slate-400">
                    کوئی آئٹم نہیں ملا (No items found)
                  </div>
                )}
              </div>
            </div>

            {selectedProduct && (
              <div className="bg-rose-50/60 border border-rose-200 p-2.5 rounded-xl text-xs space-y-1">
                <div className="font-bold text-rose-900">{selectedProduct.name}</div>
                <div className="flex justify-between text-slate-600 text-[11px]">
                  <span>موجودہ اسٹاک: <strong>{selectedProduct.stockQuantity} {selectedProduct.unit || "pcs"}</strong></span>
                  <span>قیمت خرید: Rs. {selectedProduct.purchasePrice}</span>
                </div>
              </div>
            )}

            {/* Quantity */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                خراب یا چوری شدہ تعداد (Quantity Lost / Broken)
              </label>
              <input
                type="number"
                min="1"
                max={selectedProduct ? selectedProduct.stockQuantity : 9999}
                value={quantity || ""}
                onChange={(e) => setQuantity(Math.max(1, Number(e.target.value)))}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-black text-rose-700 focus:ring-2 focus:ring-rose-500 focus:outline-none"
              />
            </div>

            {/* Notes */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                وجہ یا تفصیل / Reason & Remarks
              </label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="مثلاً: شیلف سے گر کر شیشہ ٹوٹ گیا، یا ڈبے سے غائب تھا"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-rose-500 focus:outline-none"
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
                disabled={loading || !selectedProductId}
                className={`flex-1 py-2.5 text-white font-bold rounded-xl text-xs transition shadow-md ${
                  !selectedProductId
                    ? "bg-slate-300 cursor-not-allowed"
                    : "bg-rose-600 hover:bg-rose-500"
                }`}
              >
                {loading ? "محفوظ ہو رہا ہے..." : "نقصان درج کریں (Deduct Loss)"}
              </button>
            </div>
          </form>
        )}

        {/* TAB 2: HISTORY LOG VIEW */}
        {activeTab === "history" && (
          <div className="p-4 space-y-3 overflow-y-auto flex-1 min-h-0 flex flex-col">
            {/* Summary Strip */}
            <div className="grid grid-cols-3 gap-2 bg-slate-50 border border-slate-200 p-2.5 rounded-xl text-center">
              <div>
                <div className="text-[10px] text-slate-500 font-medium">ٹوٹ پھوٹ (Broken)</div>
                <div className="text-sm font-black text-rose-600">{totalBrokenQty} عدد</div>
              </div>
              <div className="border-x border-slate-200">
                <div className="text-[10px] text-slate-500 font-medium">چوری (Stolen)</div>
                <div className="text-sm font-black text-amber-600">{totalStolenQty} عدد</div>
              </div>
              <div>
                <div className="text-[10px] text-slate-500 font-medium">کل اندراجات</div>
                <div className="text-sm font-black text-slate-800">{historyMovements.length}</div>
              </div>
            </div>

            {/* Filter pills & Refresh */}
            <div className="flex items-center justify-between text-xs">
              <div className="flex space-x-1">
                <button
                  type="button"
                  onClick={() => setHistoryFilter("ALL")}
                  className={`px-2 py-0.5 rounded-md font-bold text-[11px] transition ${
                    historyFilter === "ALL"
                      ? "bg-slate-900 text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  All ({historyMovements.length})
                </button>
                <button
                  type="button"
                  onClick={() => setHistoryFilter("DAMAGE")}
                  className={`px-2 py-0.5 rounded-md font-bold text-[11px] transition ${
                    historyFilter === "DAMAGE"
                      ? "bg-rose-600 text-white"
                      : "bg-rose-50 text-rose-700 hover:bg-rose-100"
                  }`}
                >
                  🔨 Broken
                </button>
                <button
                  type="button"
                  onClick={() => setHistoryFilter("STOLEN")}
                  className={`px-2 py-0.5 rounded-md font-bold text-[11px] transition ${
                    historyFilter === "STOLEN"
                      ? "bg-amber-600 text-white"
                      : "bg-amber-50 text-amber-800 hover:bg-amber-100"
                  }`}
                >
                  🕵️ Stolen
                </button>
              </div>

              <button
                type="button"
                onClick={fetchHistory}
                disabled={historyLoading}
                className="text-slate-500 hover:text-slate-800 flex items-center space-x-1 text-[11px]"
                title="ریفریش کریں"
              >
                <RefreshCw className={`w-3 h-3 ${historyLoading ? "animate-spin" : ""}`} />
                <span>Refresh</span>
              </button>
            </div>

            {/* Movement Cards List */}
            <div className="flex-1 overflow-y-auto space-y-2 max-h-[50vh]">
              {historyLoading ? (
                <div className="py-12 text-center text-xs text-slate-400">
                  ڈیٹا لوڈ ہو رہا ہے... (Loading...)
                </div>
              ) : filteredHistory.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-400">
                  کوئی ٹوٹ پھوٹ یا چوری کا ریکارڈ موجود نہیں ہے۔ (No loss records found)
                </div>
              ) : (
                filteredHistory.map((m) => (
                  <div
                    key={m.id}
                    className="p-3 bg-white border border-slate-200 rounded-xl hover:border-slate-300 shadow-2xs space-y-1.5 transition"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="font-bold text-xs text-slate-900 leading-tight">
                          {m.product?.name || "نامعلوم پروڈکٹ"}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          {m.product?.barcode || m.product?.sku}
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-bold ${
                            m.movementType === "STOCK_OUT_DAMAGE"
                              ? "bg-rose-100 text-rose-800"
                              : "bg-amber-100 text-amber-800"
                          }`}
                        >
                          {m.movementType === "STOCK_OUT_DAMAGE"
                            ? "🔨 ٹوٹ پھوٹ / Broken"
                            : "🕵️ چوری / Stolen"}
                        </span>
                        <div className="text-xs font-black text-rose-600 mt-0.5">
                          {m.quantity} {m.product?.unit || "pcs"}
                        </div>
                      </div>
                    </div>

                    {m.notes && (
                      <div className="text-[11px] text-slate-600 bg-slate-50 p-1.5 rounded-lg border border-slate-100">
                        {m.notes}
                      </div>
                    )}

                    <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-100">
                      <div>
                        درج کنندہ: <strong className="text-slate-700">{m.performedBy?.fullName || "Staff"}</strong> ({m.performedBy?.role})
                      </div>
                      <div>
                        {new Date(m.createdAt).toLocaleDateString()} {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={onClose}
                className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs"
              >
                بند کریں (Close)
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
