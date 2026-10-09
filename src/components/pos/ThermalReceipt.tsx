"use client";

import React from "react";
import { Printer, X } from "lucide-react";
import { formatCurrency, formatNumber, formatReceiptDate } from "@/lib/format-utils";

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
  tokenNumber?: string | number;
  refNo?: string;
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
  tokenNumber,
  refNo,
  onClose,
}) => {
  const storeName = process.env.NEXT_PUBLIC_STORE_NAME || "AL-AMAFHH IHRAM HOUSE";
  const storeAddress =
    process.env.NEXT_PUBLIC_STORE_ADDRESS ||
    "Shop #2 Plot #C22 Gulistan-e-juhar Block 9 pakistan homes near pak ideal society. 75290";
  const storePhone = process.env.NEXT_PUBLIC_STORE_PHONE || "0313 8230045, 0311 2983178, 0346 2769171";
  const storeEmail = process.env.NEXT_PUBLIC_STORE_EMAIL || "info@alamafhhihramhouse.com";
  const storeTaxNo = process.env.NEXT_PUBLIC_STORE_TAX_NUMBER || "SNTN# 9602690";

  const is58mm = width === "58mm";

  // Derive display token and invoice number
  const invoiceShort = invoiceNumber.includes("-")
    ? invoiceNumber.split("-").pop()
    : invoiceNumber;
  const tokenDisplay = tokenNumber || (invoiceShort ? `C${invoiceShort}` : "C01-01");

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
              className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-bold transition flex items-center space-x-1 shadow-sm"
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
            className={`bg-white p-4 shadow-sm font-mono text-slate-900 text-xs leading-normal ${
              is58mm ? "receipt-width-58mm" : "receipt-width-80mm"
            }`}
          >
            {/* Logo */}
            <div className="text-center mb-1">
              <img
                src="/logo.png"
                alt="AL-AMAFHH IHRAM HOUSE"
                className="h-16 max-w-[210px] mx-auto object-contain mb-1 filter grayscale contrast-125"
              />
            </div>

            {/* Store Information */}
            <div className="text-center pb-2 mb-1.5 space-y-0.5">
              <div className="font-black text-sm sm:text-base tracking-wider uppercase text-slate-900 leading-tight">
                {storeName}
              </div>
              <div className="text-[10px] text-slate-700 leading-tight px-1 font-sans">
                {storeAddress}
              </div>
              <div className="text-[10px] text-slate-700 font-semibold font-sans">
                Call: {storePhone}
              </div>
              {storeEmail && (
                <div className="text-[10px] text-slate-700 font-sans">
                  {storeEmail}
                </div>
              )}
              {storeTaxNo && (
                <div className="text-[10px] font-bold text-slate-800 tracking-wide mt-0.5">
                  {storeTaxNo}
                </div>
              )}
            </div>

            {/* Token & Invoice Header (Exact layout matching sample receipt) */}
            <div className="border-t border-dashed border-slate-700 pt-1.5 pb-1">
              <div className="flex justify-between items-center text-[11px] font-bold tracking-tight text-slate-900">
                <span>TOKEN NO - {tokenDisplay}</span>
                <span>INVOICE NO- {invoiceShort}</span>
              </div>
              <div className="text-[10px] text-slate-700 font-medium">Takeaway - Takeaway</div>
              <div className="text-[10px] text-slate-800 font-semibold">Customer Copy</div>
            </div>

            {/* Reference, Date & Staff */}
            <div className="border-t border-dashed border-slate-700 pt-1.5 pb-1 text-[11px] space-y-0.5 text-slate-900">
              <div className="flex justify-between">
                <span>Ref No :</span>
                <span>{refNo || invoiceNumber}</span>
              </div>
              <div className="flex justify-between">
                <span>Date:</span>
                <span>{formatReceiptDate(date)}</span>
              </div>
              <div className="flex justify-between">
                <span>Waiter / Cashier Name:</span>
                <span className="font-semibold">{cashierName}</span>
              </div>
              {customerName && (
                <div className="flex justify-between">
                  <span>Customer:</span>
                  <span className="font-semibold">
                    {customerName} {customerPhone ? `(${customerPhone})` : ""}
                  </span>
                </div>
              )}
            </div>

            {/* Payment Type Header (Prominent Bold from sample) */}
            <div className="my-1.5 text-sm sm:text-base font-extrabold uppercase text-slate-950 tracking-wide">
              Payment Type - {paymentMethod}
            </div>

            {/* Line Items Table */}
            <div className="mb-1.5">
              <div className="border-y border-dashed border-slate-700 py-1 my-1">
                <div className="flex justify-between font-bold text-[11px] text-slate-900">
                  <span className="w-8 text-left">Qty</span>
                  <span className="flex-1 text-left px-1">Item</span>
                  <span className="w-16 text-right">T.Price</span>
                </div>
              </div>
              <div className="space-y-1.5 text-[11px]">
                {items.map((item, idx) => (
                  <div key={idx} className="flex justify-between items-start leading-tight">
                    <span className="w-8 text-left font-medium text-slate-900">
                      {item.quantity}
                    </span>
                    <span className="flex-1 text-left px-1 font-semibold text-slate-900">
                      {item.name}
                      {item.quantity > 1 && (
                        <span className="block text-[9.5px] text-slate-500 font-normal">
                          @ {formatCurrency(item.unitPrice)}
                        </span>
                      )}
                      {item.discountAmount ? (
                        <span className="block text-[9.5px] text-rose-600 font-normal">
                          Disc: -{formatCurrency(item.discountAmount)}
                        </span>
                      ) : null}
                    </span>
                    <span className="w-16 text-right font-bold text-slate-900">
                      {formatNumber(item.subtotal)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Financial Breakdown (Exact layout matching sample) */}
            <div className="border-t border-dashed border-slate-700 pt-1.5 pb-1 space-y-0.5 text-[11px] text-slate-900">
              <div className="flex justify-between">
                <span>Total</span>
                <span className="font-semibold">{formatNumber(subtotal)}</span>
              </div>
              {discountAmount > 0 && (
                <div className="flex justify-between text-rose-600">
                  <span>Discount</span>
                  <span>-{formatNumber(discountAmount)}</span>
                </div>
              )}
              {taxRate > 0 || taxAmount > 0 ? (
                <div className="flex justify-between">
                  <span>SST({taxRate || 0}%)</span>
                  <span>{formatNumber(taxAmount)}</span>
                </div>
              ) : null}
              <div className="border-t border-dashed border-slate-400 my-1"></div>
              <div className="flex justify-between font-extrabold text-[13px] text-slate-950">
                <span>Grand Total</span>
                <span>{formatNumber(totalAmount)}</span>
              </div>
              <div className="flex justify-between font-semibold">
                <span>Paid Amount</span>
                <span>{formatNumber(amountTendered || totalAmount)}</span>
              </div>
              <div className="flex justify-between font-semibold">
                <span>Return Amount</span>
                <span>{formatNumber(changeDue || 0)}</span>
              </div>
              {balanceDue > 0 && (
                <div className="flex justify-between font-bold text-rose-600 border-t border-dotted border-rose-400 pt-0.5 mt-0.5">
                  <span>Balance Due (ادھار):</span>
                  <span>{formatNumber(balanceDue)}</span>
                </div>
              )}
            </div>

            {/* Footer Matching Photo */}
            <div className="border-t border-dashed border-slate-700 pt-2 text-center text-[10px] space-y-1 text-slate-700">
              <div className="font-bold text-xs uppercase tracking-wider text-slate-900">
                Thanks
              </div>
              <div className="font-bold text-slate-900 text-[11px]">
                جزاكم الله خيراً
              </div>
              <div className="text-[10px]">
                Bill Prepared By: Cashier {cashierName}
              </div>
              <div className="text-[9px] text-slate-500 font-semibold">
                Powered By Al-Amafhh POS
              </div>
              <div className="text-[9.5px] font-mono text-slate-500">
                Print Time: {formatReceiptDate(new Date())}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

