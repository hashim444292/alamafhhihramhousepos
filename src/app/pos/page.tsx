"use client";

import React, { useState, useEffect, useRef } from "react";
import { ProductGrid } from "@/components/pos/ProductGrid";
import { CartPane } from "@/components/pos/CartPane";
import { PaymentModal } from "@/components/pos/PaymentModal";
import { ThermalReceipt } from "@/components/pos/ThermalReceipt";
import { ShiftModal } from "@/components/pos/ShiftModal";
import { BarcodeScannerModal } from "@/components/pos/BarcodeScannerModal";
import { usePosStore } from "@/store/pos-store";
import { Clock, AlertCircle } from "lucide-react";
import { formatCurrency } from "@/lib/format-utils";

export default function PosPage() {
  const { receiptWidth, activeShift, setActiveShift, addItem } = usePosStore();

  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals state
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [paymentMethodForModal, setPaymentMethodForModal] = useState<
    "CASH" | "CARD" | "MOBILE_WALLET" | "CREDIT"
  >("CASH");
  const [isShiftOpen, setIsShiftOpen] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [completedInvoice, setCompletedInvoice] = useState<any | null>(null);

  // Photoshop-Style Resizable & Lockable Workspace Panels State
  const containerRef = useRef<HTMLDivElement>(null);
  const [leftWidth, setLeftWidth] = useState<number>(58); // default ~58% left, 42% right
  const [isLocked, setIsLocked] = useState<boolean>(false);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [isDesktop, setIsDesktop] = useState<boolean>(false);

  // Safe Hydration-safe localStorage persistence (Versioned key: alamafh_pos_panel_layout_v1)
  useEffect(() => {
    try {
      const saved = localStorage.getItem("alamafh_pos_panel_layout_v1");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed.leftWidth === "number" && !isNaN(parsed.leftWidth)) {
          setLeftWidth(Math.min(72, Math.max(28, parsed.leftWidth)));
        }
        if (typeof parsed.isLocked === "boolean") {
          setIsLocked(parsed.isLocked);
        }
      }
    } catch {
      // Graceful fallback for storage quotas or private browsing
    }
  }, []);

  // Monitor breakpoint (only enable side-by-side resizing on desktop lg screens >= 1024px)
  useEffect(() => {
    const checkDesktop = () => {
      setIsDesktop(window.innerWidth >= 1024);
    };
    checkDesktop();
    window.addEventListener("resize", checkDesktop);
    return () => window.removeEventListener("resize", checkDesktop);
  }, []);

  const savePanelPreferences = (width: number, locked: boolean) => {
    try {
      localStorage.setItem(
        "alamafh_pos_panel_layout_v1",
        JSON.stringify({ leftWidth: width, isLocked: locked })
      );
    } catch {
      // safe fallback
    }
  };

  const handleToggleLock = () => {
    const nextLocked = !isLocked;
    setIsLocked(nextLocked);
    savePanelPreferences(leftWidth, nextLocked);
  };

  const handleDoubleClickDivider = () => {
    if (isLocked) return;
    setLeftWidth(58);
    savePanelPreferences(58, isLocked);
  };

  const handlePointerDownDivider = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isLocked || !isDesktop) return;
    e.preventDefault();
    const divider = e.currentTarget;
    try {
      divider.setPointerCapture(e.pointerId);
    } catch {}
    setIsDragging(true);

    const onPointerMove = (moveEv: PointerEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      if (rect.width <= 0) return;
      const clientX = moveEv.clientX;
      const newPercent = ((clientX - rect.left) / rect.width) * 100;
      const clamped = Math.min(72, Math.max(28, Math.round(newPercent * 10) / 10));
      setLeftWidth(clamped);
    };

    const onPointerUp = (upEv: PointerEvent) => {
      try {
        divider.releasePointerCapture(upEv.pointerId);
      } catch {}
      setIsDragging(false);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", onPointerUp);

      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        if (rect.width > 0) {
          const finalPercent = ((upEv.clientX - rect.left) / rect.width) * 100;
          const clamped = Math.min(72, Math.max(28, Math.round(finalPercent * 10) / 10));
          savePanelPreferences(clamped, isLocked);
        }
      }
    };

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pointercancel", onPointerUp);
  };

  const handleKeyDownDivider = (e: React.KeyboardEvent) => {
    if (isLocked) return;
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      setLeftWidth((w) => {
        const next = Math.max(28, Math.round((w - 1) * 10) / 10);
        savePanelPreferences(next, isLocked);
        return next;
      });
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      setLeftWidth((w) => {
        const next = Math.min(72, Math.round((w + 1) * 10) / 10);
        savePanelPreferences(next, isLocked);
        return next;
      });
    } else if (e.key === "Home" || e.key === "Enter") {
      e.preventDefault();
      setLeftWidth(58);
      savePanelPreferences(58, isLocked);
    }
  };

  // Fetch products and active shift
  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const prodRes = await fetch("/api/products");
        const prodData = await prodRes.json();
        if (prodData.success) {
          setProducts(prodData.products);
          setCategories(prodData.categories);
        }

        const shiftRes = await fetch("/api/pos/shifts");
        const shiftData = await shiftRes.json();
        if (shiftData.success) {
          if (shiftData.activeShift) {
            setActiveShift(shiftData.activeShift);
          } else {
            setActiveShift(null);
            // Prompt the incoming cashier automatically to enter starting cash & verify drawer handover
            setIsShiftOpen(true);
          }
        }
      } catch (e) {
        console.error("Failed to load POS data:", e);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [setActiveShift]);

  const handleSaleSuccess = (transaction: any) => {
    setCompletedInvoice(transaction);
  };

  const handleCameraScanSuccess = (decodedBarcode: string) => {
    if (!activeShift) {
      alert("برائے مہربانی پہلے شفٹ اوپن کریں! (Please open cashier shift first)");
      setIsShiftOpen(true);
      return;
    }
    const matched = products.find(
      (p) =>
        p.barcode.toLowerCase() === decodedBarcode.toLowerCase() ||
        p.sku.toLowerCase() === decodedBarcode.toLowerCase()
    );
    if (matched) {
      if (matched.stockQuantity <= 0) {
        alert(`Cannot add "${matched.name}": Out of stock`);
      } else {
        addItem(matched);
      }
    } else {
      alert(`Scanned barcode: ${decodedBarcode} not found in catalog.`);
    }
  };

  const handleOpenPaymentWithMethod = (method: "CASH" | "CREDIT" = "CASH") => {
    if (!activeShift) {
      alert("برائے مہربانی پہلے کیشئر شفٹ اوپن کریں! اس کے بغیر انوائس نہیں بن سکتی۔ (Please open cashier shift first)");
      setIsShiftOpen(true);
      return;
    }
    setPaymentMethodForModal(method);
    setIsPaymentOpen(true);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)] overflow-hidden">
      {/* Shift status strip */}
      {!activeShift ? (
        <div className="bg-amber-500/90 backdrop-blur text-slate-950 px-4 py-1.5 text-xs font-semibold flex items-center justify-between shadow-xs border-b border-amber-600/30">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 text-slate-950 shrink-0" />
            <span className="truncate">
              کوئی کیشئر شفٹ اوپن نہیں ہے۔ برائے مہربانی سیلز شروع کرنے سے پہلے شفٹ اوپن کریں۔
            </span>
          </div>
          <div className="flex items-center space-x-2 shrink-0">
            <button
              type="button"
              onClick={handleToggleLock}
              className={`px-2.5 py-1 rounded-lg text-[11px] sm:text-xs font-bold transition flex items-center space-x-1 border shadow-xs ${
                isLocked
                  ? "bg-slate-900/90 text-amber-200 border-amber-900/40 hover:bg-slate-900"
                  : "bg-amber-400 text-slate-950 border-amber-500 hover:bg-amber-300"
              }`}
              title={isLocked ? "Panels Locked (Click to enable resizing)" : "Panels Resizable (Click to lock)"}
            >
              <span>{isLocked ? "🔒 Panels Locked" : "🔓 Resize Panels"}</span>
            </button>
            <button
              onClick={() => setIsShiftOpen(true)}
              className="bg-slate-950 text-white hover:bg-slate-900 px-3 py-1 rounded-lg text-xs font-bold transition flex items-center space-x-1 shadow-sm shrink-0"
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Open Shift (شفٹ اوپن کریں)</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-slate-900 text-white px-3 sm:px-4 py-1 text-xs font-medium flex items-center justify-between border-b border-slate-800 shadow-xs">
          <div className="flex items-center space-x-2 sm:space-x-3 text-[11px] sm:text-xs truncate">
            <span className="flex items-center text-emerald-400 font-bold shrink-0">
              <span className="w-2 h-2 rounded-full bg-emerald-400 mr-1.5 animate-pulse"></span>
              Shift #{activeShift.shiftNumber || "1"} Active (شفٹ آن ہے)
            </span>
            <span className="text-slate-400 hidden sm:inline">
              Opening Cash: <strong className="text-white">{formatCurrency(activeShift.openingCash)}</strong>
            </span>
            <span className="text-slate-400 hidden md:inline">
              Started: {new Date(activeShift.openedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
          <div className="flex items-center space-x-2 shrink-0">
            <button
              type="button"
              onClick={handleToggleLock}
              className={`px-2.5 py-1 rounded-lg text-[11px] sm:text-xs font-bold transition flex items-center space-x-1 border shadow-xs ${
                isLocked
                  ? "bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700 hover:text-white"
                  : "bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-500 shadow-emerald-900/40"
              }`}
              title={isLocked ? "Panels Locked (Click to enable resizing)" : "Panels Resizable (Click to lock)"}
            >
              <span>{isLocked ? "🔒 Panels Locked" : "🔓 Resize Panels"}</span>
            </button>
            <button
              onClick={() => setIsShiftOpen(true)}
              className="bg-rose-600 hover:bg-rose-500 text-white px-2.5 py-1 rounded-lg text-[11px] sm:text-xs font-bold transition flex items-center space-x-1 shadow-sm shrink-0"
            >
              <Clock className="w-3 h-3" />
              <span>Close Shift / کلوزنگ رجسٹر (Z-Report)</span>
            </button>
          </div>
        </div>
      )}

      {/* Main Two-Pane POS Register Layout with Photoshop-style Resizable Panels */}
      <div
        ref={containerRef}
        className={`flex-1 flex flex-col lg:flex-row overflow-hidden relative ${
          isDragging ? "select-none cursor-col-resize" : ""
        }`}
      >
        {/* Left Pane: Product Catalog Grid & Search */}
        <div
          className="w-full lg:h-full overflow-hidden min-w-0"
          style={{
            width: isDesktop ? `${leftWidth}%` : "100%",
            flexShrink: 0,
          }}
        >
          <ProductGrid
            products={products}
            categories={categories}
            loading={loading}
            onOpenScanner={() => setIsScannerOpen(true)}
          />
        </div>

        {/* Photoshop-Style Resizable Divider Bar (Desktop lg+ only) */}
        <div
          role="separator"
          aria-orientation="vertical"
          aria-valuenow={Math.round(leftWidth)}
          aria-valuemin={28}
          aria-valuemax={72}
          aria-label="Resize panels divider"
          tabIndex={isLocked ? -1 : 0}
          onPointerDown={handlePointerDownDivider}
          onDoubleClick={handleDoubleClickDivider}
          onKeyDown={handleKeyDownDivider}
          className={`hidden lg:flex flex-col items-center justify-center relative z-20 shrink-0 select-none transition-colors duration-150 ${
            isLocked
              ? "w-2.5 bg-slate-200 border-x border-slate-300 cursor-default"
              : isDragging
              ? "w-2.5 bg-emerald-600 border-x border-emerald-700 cursor-col-resize shadow-md"
              : "w-2.5 bg-slate-200 hover:bg-emerald-500/80 active:bg-emerald-600 border-x border-slate-300 hover:border-emerald-500 cursor-col-resize group"
          }`}
          title={
            isLocked
              ? "🔒 Panels Locked (Click '🔒 Panels Locked' at top to unlock)"
              : `↔ Drag to resize (${Math.round(leftWidth)}% / ${Math.round(100 - leftWidth)}%) · Double-click to reset (58%)`
          }
        >
          {/* Grab handle indicator dots */}
          <div className="flex flex-col items-center justify-center space-y-1 py-3 pointer-events-none">
            {isLocked ? (
              <span className="text-[10px] text-slate-500">🔒</span>
            ) : (
              <>
                <div
                  className={`w-1 h-1 rounded-full transition-colors ${
                    isDragging ? "bg-white" : "bg-slate-400 group-hover:bg-white"
                  }`}
                />
                <div
                  className={`w-1 h-3.5 rounded-full transition-colors ${
                    isDragging ? "bg-white" : "bg-slate-400 group-hover:bg-white"
                  }`}
                />
                <div
                  className={`w-1 h-1 rounded-full transition-colors ${
                    isDragging ? "bg-white" : "bg-slate-400 group-hover:bg-white"
                  }`}
                />
              </>
            )}
          </div>
        </div>

        {/* Right Pane: Cart & Checkout Summary */}
        <div
          className="w-full lg:h-full border-t lg:border-t-0 border-slate-200 shadow-xl overflow-hidden min-w-0"
          style={{
            width: isDesktop ? `${100 - leftWidth}%` : "100%",
            flexShrink: 0,
          }}
        >
          <CartPane
            onPayClick={(method) => handleOpenPaymentWithMethod(method || "CASH")}
            onKhataClick={() => handleOpenPaymentWithMethod("CREDIT")}
          />
        </div>
      </div>

      {/* Payment Tender Modal */}
      <PaymentModal
        isOpen={isPaymentOpen}
        initialMethod={paymentMethodForModal}
        onClose={() => setIsPaymentOpen(false)}
        onSuccess={handleSaleSuccess}
      />

      {/* Thermal Receipt Print Modal */}
      {completedInvoice && (
        <ThermalReceipt
          invoiceNumber={completedInvoice.invoiceNumber}
          date={completedInvoice.createdAt}
          cashierName={completedInvoice.cashier?.fullName || "Cashier"}
          customerName={completedInvoice.customerName}
          customerPhone={completedInvoice.customerPhone}
          items={completedInvoice.items.map((it: any) => ({
            name: it.productName || it.name,
            sku: it.sku,
            quantity: it.quantity,
            unitPrice: it.unitPrice,
            discountAmount: it.discountAmount,
            subtotal: it.subtotalAmount,
          }))}
          subtotal={completedInvoice.subtotal}
          discountAmount={completedInvoice.discountAmount}
          taxRate={completedInvoice.taxRate}
          taxAmount={completedInvoice.taxAmount}
          totalAmount={completedInvoice.totalAmount}
          paymentMethod={completedInvoice.paymentMethod}
          amountTendered={completedInvoice.amountTendered}
          changeDue={completedInvoice.changeDue}
          width={receiptWidth}
          onClose={() => setCompletedInvoice(null)}
        />
      )}

      {/* Shift Open/Close & Z-Report Modal */}
      <ShiftModal
        isOpen={isShiftOpen}
        required={!activeShift}
        onClose={() => setIsShiftOpen(false)}
      />

      {/* HTML5 Camera Barcode Scanner Modal */}
      <BarcodeScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScanSuccess={handleCameraScanSuccess}
      />
    </div>
  );
}
