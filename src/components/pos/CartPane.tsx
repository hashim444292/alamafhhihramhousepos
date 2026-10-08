"use client";

import React, { useState, useEffect } from "react";
import {
  Trash2,
  Plus,
  Minus,
  Tag,
  Percent,
  Receipt,
  RotateCcw,
  User,
  ShoppingBag,
  UserCheck,
} from "lucide-react";
import { usePosStore, CartItem } from "@/store/pos-store";
import { formatNumber, formatCurrency } from "@/lib/format-utils";

interface CartPaneProps {
  onPayClick: (initialMethod?: "CASH" | "CREDIT") => void;
  onKhataClick?: () => void;
}

export const CartPane: React.FC<CartPaneProps> = ({ onPayClick, onKhataClick }) => {
  const {
    cart,
    updateQuantity,
    removeItem,
    clearCart,
    setItemDiscount,
    cartDiscountType,
    cartDiscountValue,
    setCartDiscount,
    customerName,
    customerPhone,
    customerId,
    selectedCustomer,
    setCustomer,
    setSelectedCustomer,
    getSubtotal,
    getCartDiscountAmount,
    getTaxAmount,
    getGrandTotal,
    taxRate,
  } = usePosStore();

  const [discountModalOpen, setDiscountModalOpen] = useState(false);
  const [activeItemForDiscount, setActiveItemForDiscount] = useState<CartItem | null>(null);
  const [discountTypeInput, setDiscountTypeInput] = useState<"PERCENTAGE" | "FIXED">("PERCENTAGE");
  const [discountValueInput, setDiscountValueInput] = useState<number>(0);

  // Customer Selector Modal
  const [customerModalOpen, setCustomerModalOpen] = useState(false);
  const [customerList, setCustomerList] = useState<any[]>([]);
  const [customerSearch, setCustomerSearch] = useState("");
  const [tempCustomerName, setTempCustomerName] = useState(customerName);
  const [tempCustomerPhone, setTempCustomerPhone] = useState(customerPhone);

  const subtotal = getSubtotal();
  const cartDiscountAmount = getCartDiscountAmount();
  const taxAmount = getTaxAmount();
  const grandTotal = getGrandTotal();

  useEffect(() => {
    async function loadCustomers() {
      try {
        const res = await fetch("/api/customers");
        const data = await res.json();
        if (data.success) {
          setCustomerList(data.customers);
        }
      } catch (e) {
        // ignore
      }
    }
    loadCustomers();
  }, []);

  const handleOpenItemDiscount = (item: CartItem) => {
    setActiveItemForDiscount(item);
    setDiscountTypeInput(item.discountType === "FIXED" ? "FIXED" : "PERCENTAGE");
    setDiscountValueInput(item.discountValue);
    setDiscountModalOpen(true);
  };

  const handleOpenCartDiscount = () => {
    setActiveItemForDiscount(null);
    setDiscountTypeInput(cartDiscountType === "FIXED" ? "FIXED" : "PERCENTAGE");
    setDiscountValueInput(cartDiscountValue);
    setDiscountModalOpen(true);
  };

  const handleApplyDiscount = () => {
    if (activeItemForDiscount) {
      setItemDiscount(activeItemForDiscount.productId, discountTypeInput, discountValueInput);
    } else {
      setCartDiscount(discountTypeInput, discountValueInput);
    }
    setDiscountModalOpen(false);
  };

  const handleSelectExistingCustomer = (cust: any) => {
    setSelectedCustomer(cust);
    setCustomerModalOpen(false);
  };

  const handleSetWalkin = () => {
    setSelectedCustomer(null);
    setCustomer(tempCustomerName || "Walk-in Customer", tempCustomerPhone, null);
    setCustomerModalOpen(false);
  };

  const filteredCustomers = customerList.filter(
    (c) =>
      c.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
      (c.phone && c.phone.includes(customerSearch))
  );

  return (
    <div className="flex flex-col h-full bg-white select-none">
      {/* Cart Header */}
      <div className="p-3 border-b border-slate-200 flex items-center justify-between bg-slate-50">
        <div className="flex items-center space-x-2">
          <ShoppingBag className="w-5 h-5 text-emerald-600" />
          <div>
            <h2 className="font-bold text-sm text-slate-900 leading-tight">Order Cart</h2>
            <button
              onClick={() => {
                setTempCustomerName(customerName);
                setTempCustomerPhone(customerPhone);
                setCustomerModalOpen(true);
              }}
              className="text-[11px] text-emerald-700 hover:underline flex items-center font-medium"
            >
              <User className="w-3 h-3 mr-0.5" />
              <span>
                {selectedCustomer ? (
                  <span className="font-bold text-emerald-800">
                    {selectedCustomer.name} (Baqaya: Rs. {selectedCustomer.balance.toFixed(2)})
                  </span>
                ) : (
                  customerName || "Walk-in Customer"
                )}
              </span>
            </button>
          </div>
        </div>

        {cart.length > 0 && (
          <button
            onClick={() => {
              if (confirm("Clear the entire cart?")) {
                clearCart();
              }
            }}
            title="Clear Cart"
            className="text-xs text-rose-600 hover:text-rose-700 flex items-center px-2 py-1 rounded hover:bg-rose-50 transition"
          >
            <RotateCcw className="w-3.5 h-3.5 mr-1" />
            <span>Reset</span>
          </button>
        )}
      </div>

      {/* Cart Items Table */}
      <div className="flex-1 overflow-y-auto divide-y divide-slate-100 p-2">
        {cart.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-400 py-12">
            <Receipt className="w-12 h-12 stroke-1 mb-2 opacity-50" />
            <p className="text-sm font-medium">Cart is empty</p>
            <p className="text-xs text-slate-400 mt-1">Scan barcode or tap products</p>
          </div>
        ) : (
          cart.map((item) => (
            <div key={item.productId} className="py-2 px-1 flex flex-col space-y-1">
              <div className="flex items-start justify-between">
                <div className="flex-1 pr-2">
                  <h4 className="font-semibold text-xs text-slate-900 leading-tight">
                    {item.name}
                  </h4>
                  <div className="text-[10px] text-slate-500 font-mono">
                    {item.sku} • {formatCurrency(item.unitPrice)}
                  </div>
                </div>

                <div className="text-right">
                  <div className="font-bold text-xs text-slate-900">
                    {formatCurrency(item.subtotalAmount)}
                  </div>
                  {item.discountAmount > 0 && (
                    <div className="text-[10px] text-rose-600 font-medium">
                      -{formatCurrency(item.discountAmount)}
                    </div>
                  )}
                </div>
              </div>

              {/* Quantity Stepper & Actions */}
              <div className="flex items-center justify-between pt-1">
                <div className="flex items-center space-x-1">
                  <button
                    onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                    className="w-7 h-7 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 rounded flex items-center justify-center text-slate-700 transition"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <span className="w-8 text-center text-xs font-bold text-slate-800">
                    {item.quantity}
                  </span>
                  <button
                    onClick={() => {
                      if (item.quantity >= item.stockAvailable) {
                        alert(`Only ${item.stockAvailable} units available in stock`);
                        return;
                      }
                      updateQuantity(item.productId, item.quantity + 1);
                    }}
                    className="w-7 h-7 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 rounded flex items-center justify-center text-slate-700 transition"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleOpenItemDiscount(item)}
                    title="Item Discount"
                    className={`text-[11px] px-1.5 py-0.5 rounded flex items-center space-x-0.5 transition ${
                      item.discountAmount > 0
                        ? "bg-rose-50 text-rose-700 font-bold"
                        : "text-slate-500 hover:bg-slate-100"
                    }`}
                  >
                    <Tag className="w-3 h-3" />
                    <span>
                      {item.discountAmount > 0
                        ? item.discountType === "PERCENTAGE"
                          ? `${item.discountValue}%`
                          : `Rs. ${item.discountValue}`
                        : "Discount"}
                    </span>
                  </button>

                  <button
                    onClick={() => removeItem(item.productId)}
                    className="p-1 text-slate-400 hover:text-rose-600 rounded transition"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Cart Summary & Sticky Checkout Area */}
      <div className="border-t border-slate-200 p-3 bg-slate-50 space-y-2">
        <div className="flex justify-between text-xs text-slate-600">
          <span>Subtotal:</span>
          <span>{formatCurrency(subtotal)}</span>
        </div>

        <div className="flex justify-between text-xs items-center">
          <button
            onClick={handleOpenCartDiscount}
            className="text-emerald-700 hover:underline flex items-center space-x-1 font-medium"
          >
            <Percent className="w-3 h-3" />
            <span>
              Cart Discount{" "}
              {cartDiscountType !== "NONE" &&
                `(${cartDiscountValue}${cartDiscountType === "PERCENTAGE" ? "%" : " Rs."})`}
            </span>
          </button>
          <span className={cartDiscountAmount > 0 ? "text-rose-600 font-semibold" : "text-slate-600"}>
            -{formatCurrency(cartDiscountAmount)}
          </span>
        </div>

        {taxAmount > 0 && (
          <div className="flex justify-between text-xs text-slate-600">
            <span>Tax:</span>
            <span>{formatCurrency(taxAmount)}</span>
          </div>
        )}

        {/* Grand Total */}
        <div className="flex justify-between items-baseline pt-2 border-t border-slate-200">
          <span className="font-bold text-sm text-slate-900">Grand Total:</span>
          <span className="font-black text-xl sm:text-2xl text-emerald-700">
            {formatCurrency(grandTotal)}
          </span>
        </div>

        {/* Dual Checkout Buttons: 1) Fast Fully Paid Cash  2) Khata / Udhaar for Client */}
        <div className="grid grid-cols-1 gap-2 pt-1">
          {/* Button 1: Fast Cash Checkout (فوری نقد / 100% Paid) */}
          <button
            disabled={cart.length === 0}
            onClick={() => onPayClick("CASH")}
            className={`w-full py-3 px-3 rounded-xl font-bold text-sm text-white shadow-md transition flex items-center justify-between active:scale-[0.99] ${
              cart.length === 0
                 ? "bg-slate-300 cursor-not-allowed shadow-none"
                : "bg-emerald-600 hover:bg-emerald-500 shadow-emerald-700/20"
            }`}
          >
            <div className="flex items-center space-x-1.5">
              <span className="text-base">⚡</span>
              <span className="text-left leading-tight">
                <span className="block font-black">Fast Cash Checkout</span>
                <span className="text-[10px] text-emerald-200 font-normal">فوری نقد (Fully Paid)</span>
              </span>
            </div>
            <span className="text-xs bg-emerald-700/60 px-2 py-1 rounded-lg font-extrabold text-white">
              {formatCurrency(grandTotal)}
            </span>
          </button>

          {/* Button 2: Khata / Udhaar Sale (کھاتہ دار / ادھار) */}
          <button
            disabled={cart.length === 0}
            onClick={() => {
              if (onKhataClick) {
                onKhataClick();
              } else {
                onPayClick("CREDIT");
              }
            }}
            className={`w-full py-2.5 px-3 rounded-xl font-bold text-xs text-slate-800 border transition flex items-center justify-between active:scale-[0.99] ${
              cart.length === 0
                ? "bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed"
                : "bg-amber-50 hover:bg-amber-100/80 border-amber-300 text-amber-950"
            }`}
          >
            <div className="flex items-center space-x-1.5">
              <UserCheck className="w-4 h-4 text-amber-700" />
              <span className="text-left leading-tight">
                <span className="block font-black">Khata / Udhaar Sale</span>
                <span className="text-[10px] text-amber-800 font-medium">رجسٹرڈ گاہک کا کھاتہ / ادھار</span>
              </span>
            </div>
            <span className="text-[11px] font-bold text-amber-800 bg-amber-200/60 px-2 py-0.5 rounded">
              {selectedCustomer ? selectedCustomer.name : "Select Client"}
            </span>
          </button>
        </div>
      </div>

      {/* Customer Selection Modal (Janne Wale vs Walk-in) */}
      {customerModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-5 space-y-4 max-h-[85vh] flex flex-col">
            <h3 className="font-bold text-base text-slate-900 flex items-center space-x-2">
              <UserCheck className="w-5 h-5 text-emerald-600" />
              <span>Select Customer / Khata (گاہک منتخب کریں)</span>
            </h3>

            {/* Search existing */}
            <div>
              <input
                type="text"
                placeholder="Search regular customer by name or phone..."
                value={customerSearch}
                onChange={(e) => setCustomerSearch(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
              />
            </div>

            {/* List of Registered Known Customers */}
            <div className="flex-1 overflow-y-auto space-y-1.5 max-h-48 border border-slate-100 rounded-lg p-1">
              {filteredCustomers.length === 0 ? (
                <div className="p-3 text-center text-xs text-slate-400">
                  No registered customer found
                </div>
              ) : (
                filteredCustomers.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => handleSelectExistingCustomer(c)}
                    className="w-full text-left p-2 hover:bg-emerald-50 rounded-lg border border-transparent hover:border-emerald-200 flex justify-between items-center transition"
                  >
                    <div>
                      <div className="font-bold text-xs text-slate-900">{c.name}</div>
                      <div className="text-[10px] text-slate-500">{c.phone || "No phone"}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-[11px] font-bold text-rose-600">
                        Baqaya: Rs. {c.balance.toFixed(2)}
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>

            {/* Or Walk-in Customer Entry */}
            <div className="border-t pt-3 space-y-2">
              <div className="text-xs font-bold text-slate-700">Or Walk-In Customer:</div>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  placeholder="Customer Name"
                  value={tempCustomerName}
                  onChange={(e) => setTempCustomerName(e.target.value)}
                  className="px-3 py-2 border rounded-lg text-xs"
                />
                <input
                  type="tel"
                  placeholder="Phone (optional)"
                  value={tempCustomerPhone}
                  onChange={(e) => setTempCustomerPhone(e.target.value)}
                  className="px-3 py-2 border rounded-lg text-xs"
                />
              </div>
            </div>

            <div className="flex space-x-2 pt-2 border-t">
              <button
                onClick={() => setCustomerModalOpen(false)}
                className="flex-1 py-2 text-xs font-semibold text-slate-600 bg-slate-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleSetWalkin}
                className="flex-1 py-2 text-xs font-bold text-white bg-slate-900 rounded-lg hover:bg-slate-800"
              >
                Save as Walk-in
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Discount Modal */}
      {discountModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-5 space-y-4">
            <h3 className="font-bold text-sm text-slate-900">
              {activeItemForDiscount ? `Discount: ${activeItemForDiscount.name}` : "Cart Discount"}
            </h3>

            <div className="flex rounded-lg border border-slate-200 p-1 bg-slate-100">
              <button
                onClick={() => setDiscountTypeInput("PERCENTAGE")}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-md ${
                  discountTypeInput === "PERCENTAGE" ? "bg-white text-emerald-700 shadow-sm" : "text-slate-600"
                }`}
              >
                Percentage (%)
              </button>
              <button
                onClick={() => setDiscountTypeInput("FIXED")}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-md ${
                  discountTypeInput === "FIXED" ? "bg-white text-emerald-700 shadow-sm" : "text-slate-600"
                }`}
              >
                Fixed (Rs.)
              </button>
            </div>

            <input
              type="number"
              min="0"
              step="any"
              value={discountValueInput || ""}
              onChange={(e) => setDiscountValueInput(Number(e.target.value))}
              placeholder={discountTypeInput === "PERCENTAGE" ? "e.g. 10%" : "e.g. 200 Rs."}
              className="w-full px-3 py-2 border rounded-lg text-sm"
            />

            <div className="flex space-x-2 pt-2">
              <button
                onClick={() => setDiscountModalOpen(false)}
                className="flex-1 py-2 text-xs font-semibold text-slate-600 bg-slate-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleApplyDiscount}
                className="flex-1 py-2 text-xs font-bold text-white bg-emerald-600 rounded-lg hover:bg-emerald-500"
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
