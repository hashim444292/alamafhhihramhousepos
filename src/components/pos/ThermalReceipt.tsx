"use client";

import React from "react";
import { Printer, X } from "lucide-react";
import { formatCurrency, formatNumber } from "@/lib/format-utils";

export interface ReceiptItem {
  name: string;
  sku?: string;
  quantity: number;
  unitPrice: number;
  discountAmount?: number;
  subtotal: number;
}

export interface ReceiptProps {
  invoiceNumber: string;
  date: string;
  cashierName: string;
  customerName?: string;
  customerPhone?: string;
  items: ReceiptItem[];
  subtotal: number;
  discountAmount: number;
  taxRate?: number;
  taxAmount: number;
  totalAmount: number;
  paymentMethod: string;
  amountTendered: number;
  changeDue: number;
  balanceDue?: number;
  width?: "80mm" | "58mm";
  onClose?: () => void;
}

export const ThermalReceipt: React.FC<ReceiptProps> = ({
  invoiceNumber,
  date,
  cashierName,
  customerName,
  customerPhone,
  items,
  subtotal,
  discountAmount,
  taxRate = 0.0,
  taxAmount = 0.0,
  totalAmount,
  paymentMethod,
  amountTendered,
  changeDue,
  balanceDue = 0.0,
  width = "80mm",
  onClose,
}) => {
  const storeName = process.env.NEXT_PUBLIC_STORE_NAME || "Al-Afhhihram House";
  const storeAddress = process.env.NEXT_PUBLIC_STORE_ADDRESS || "Shop #12, Madinah Market, Urdu Bazar, Lahore";
  const storePhone = process.env.NEXT_PUBLIC_STORE_PHONE || "+92 300 1234567";
  const storeTaxNo = process.env.NEXT_PUBLIC_STORE_TAX_NUMBER || "STRN-12345678-9";
  const currency = "Rs.";

  const is58mm = width === "58mm";

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden flex flex-col max-h-[90vh]">
        {/* Screen Only Header */}
        <div className="px-4 py-3 bg-slate-900 text-white flex items-center justify-between print:hidden">
          <div className="flex items-center space-x-2">
            <Printer className="w-4 h-4 text-emerald-400" />
            <span className="font-semibold text-sm">Receipt Preview ({width})</span>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={handlePrint}
              className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-bold transition flex items-center space-x-1"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Receipt</span>
            </button>
            {onClose && (
              <button
                onClick={onClose}
                className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        {/* Printable Receipt Paper Container */}
        <div className="p-6 overflow-y-auto flex justify-center bg-slate-100 flex-1">
          <div
            id="thermal-receipt-area"
            className={`bg-white p-4 shadow-sm font-mono text-slate-900 text-xs ${
              is58mm ? "receipt-width-58mm" : "receipt-width-80mm"
            }`}
          >
            {/* Header */}
            <div className="text-center border-b border-dashed border-slate-400 pb-2 mb-2">
              <div className="font-bold text-sm sm:text-base tracking-wider uppercase">
                {storeName}
              </div>
              <div className="text-[10px] text-slate-600 leading-tight">
                Ihram Sets & Islamic Wear (احرام و اسلامی ملبوسات)
              </div>
              <div className="text-[10px] text-slate-600">{storeAddress}</div>
              <div className="text-[10px] text-slate-600">Tel: {storePhone}</div>
              <div className="text-[10px] font-semibold mt-0.5">
                NTN/STRN: {storeTaxNo}
              </div>
            </div>

            {/* Invoice Meta */}
            <div className="text-[11px] mb-2 border-b border-dashed border-slate-400 pb-2 space-y-0.5">
              <div className="flex justify-between">
                <span>Invoice #:</span>
                <span className="font-bold">{invoiceNumber}</span>
              </div>
              <div className="flex justify-between">
                <span>Date:</span>
                <span>{new Date(date).toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span>Cashier:</span>
                <span>{cashierName}</span>
              </div>
              {customerName && (
                <div className="flex justify-between">
                  <span>Customer:</span>
                  <span className="font-bold">{customerName}</span>
                </div>
              )}
            </div>

            {/* Line Items */}
            <div className="mb-2 border-b border-dashed border-slate-400 pb-2">
              <div className="flex justify-between font-bold border-b border-slate-200 pb-1 mb-1 text-[11px]">
                <span>Description</span>
                <span>Total</span>
              </div>
              <div className="space-y-1.5 text-[11px]">
                {items.map((item, idx) => (
                  <div key={idx} className="flex flex-col">
                    <span className="font-medium text-slate-900 leading-tight">
                      {item.name}
                    </span>
                    <div className="flex justify-between text-slate-600 text-[10px]">
                      <span>
                        {item.quantity} x {formatCurrency(item.unitPrice)}
                        {item.discountAmount ? ` (-${formatCurrency(item.discountAmount)})` : ""}
                      </span>
                      <span className="font-semibold text-slate-900">
                        {formatCurrency(item.subtotal)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Financial Breakdown */}
            <div className="space-y-1 text-[11px] border-b border-dashed border-slate-400 pb-2">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
              {discountAmount > 0 && (
                <div className="flex justify-between text-rose-600">
                  <span>Discount:</span>
                  <span>-{formatCurrency(discountAmount)}</span>
                </div>
              )}
              {taxAmount > 0 && (
                <div className="flex justify-between">
                  <span>Tax:</span>
                  <span>{formatCurrency(taxAmount)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-sm border-t border-slate-300 pt-1 mt-1">
                <span>NET TOTAL:</span>
                <span>{formatCurrency(totalAmount)}</span>
              </div>
            </div>

            {/* Payment Details */}
            <div className="py-2 text-[10px] space-y-0.5 border-b border-dashed border-slate-400 mb-2">
              <div className="flex justify-between">
                <span>Payment Mode:</span>
                <span className="font-semibold">{paymentMethod}</span>
              </div>
              <div className="flex justify-between">
                <span>Paid Amount:</span>
                <span>{formatCurrency(amountTendered)}</span>
              </div>
              {changeDue > 0 && (
                <div className="flex justify-between font-semibold">
                  <span>Change Return (بقایا):</span>
                  <span>{formatCurrency(changeDue)}</span>
                </div>
              )}
              {balanceDue > 0 && (
                <div className="flex justify-between font-bold text-rose-600">
                  <span>Udhaar to Khata (ادھار):</span>
                  <span>{formatCurrency(balanceDue)}</span>
                </div>
              )}
            </div>

            {/* Footer Blessing */}
            <div className="text-center text-[10px] space-y-1 pt-1 text-slate-600">
              <div className="font-bold text-slate-900">جزاكم الله خيراً</div>
              <div>May Allah accept your Umrah & Hajj pilgrimage</div>
              <div className="text-[9px]">Exchange possible within 7 days with original invoice</div>
              <div className="font-mono text-[9px] text-slate-400 mt-2">
                * * * Thank You for Shopping * * *
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
