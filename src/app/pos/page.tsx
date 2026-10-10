"use client";

import React, { useState, useEffect } from "react";
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
          <button
            onClick={() => setIsShiftOpen(true)}
            className="bg-slate-950 text-white hover:bg-slate-900 px-3 py-1 rounded-lg text-xs font-bold transition flex items-center space-x-1 shadow-sm shrink-0"
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Open Shift (شفٹ اوپن کریں)</span>
          </button>
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
          <button
            onClick={() => setIsShiftOpen(true)}
            className="bg-rose-600 hover:bg-rose-500 text-white px-2.5 py-1 rounded-lg text-[11px] sm:text-xs font-bold transition flex items-center space-x-1 shadow-sm shrink-0"
          >
            <Clock className="w-3 h-3" />
            <span>Close Shift / کلوزنگ رجسٹر (Z-Report)</span>
          </button>
        </div>
      )}

      {/* Main Two-Pane POS Register Layout */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Left Pane: Product Catalog Grid & Search (65% width) */}
        <div className="flex-1 lg:w-7/12 xl:w-8/12 h-full overflow-hidden">
          <ProductGrid
            products={products}
            categories={categories}
            loading={loading}
            onOpenScanner={() => setIsScannerOpen(true)}
          />
        </div>

        {/* Right Pane: Cart & Checkout Summary (35% width) */}
        <div className="w-full lg:w-5/12 xl:w-4/12 h-full border-t lg:border-t-0 lg:border-l border-slate-200 shadow-xl overflow-hidden">
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
