"use client";

import React, { useState, useEffect, useRef } from "react";
import { Search, Barcode, Camera, AlertTriangle, Layers } from "lucide-react";
import { usePosStore } from "@/store/pos-store";
import { formatNumber } from "@/lib/format-utils";

interface Product {
  id: string;
  sku: string;
  barcode: string;
  name: string;
  sellingPrice: number;
  purchasePrice: number;
  stockQuantity: number;
  minStockThreshold: number;
  unit: string;
  size?: string | null;
  color?: string | null;
  brand?: string | null;
  category?: { id: string; name: string };
  categoryId: string;
}

interface ProductGridProps {
  products: Product[];
  categories: Array<{ id: string; name: string }>;
  loading?: boolean;
  onOpenScanner?: () => void;
}

export const ProductGrid: React.FC<ProductGridProps> = ({
  products,
  categories,
  loading = false,
  onOpenScanner,
}) => {
  const { addItem } = usePosStore();
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [barcodeInput, setBarcodeInput] = useState("");
  const barcodeInputRef = useRef<HTMLInputElement>(null);

  // USB Barcode Scanner Auto-Focus
  useEffect(() => {
    barcodeInputRef.current?.focus();
  }, []);

  // Handle USB Barcode scan (Hardware barcode scanners send string followed by Enter key)
  const handleBarcodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const code = barcodeInput.trim();
    if (!code) return;

    const matched = products.find(
      (p) =>
        p.barcode.toLowerCase() === code.toLowerCase() ||
        p.sku.toLowerCase() === code.toLowerCase()
    );

    if (matched) {
      if (matched.stockQuantity <= 0) {
        alert(`Cannot add "${matched.name}": Out of stock`);
      } else {
        addItem(matched);
      }
      setBarcodeInput("");
    } else {
      alert(`No product found with barcode or SKU: ${code}`);
      setBarcodeInput("");
    }
  };

  // Filtered Products
  const filteredProducts = products.filter((p) => {
    const matchesCategory =
      selectedCategory === "all" || p.categoryId === selectedCategory;
    const matchesSearch =
      searchQuery === "" ||
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.barcode.includes(searchQuery);

    return matchesCategory && matchesSearch;
  });

  return (
    <div className="flex flex-col h-full bg-slate-50 border-r border-slate-200">
      {/* Top Search & Barcode Scan Bar */}
      <div className="p-3 bg-white border-b border-slate-200 space-y-2">
        <div className="flex items-center gap-2">
          {/* USB Barcode Fast Scanner Input */}
          <form onSubmit={handleBarcodeSubmit} className="relative flex-1">
            <Barcode className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              ref={barcodeInputRef}
              type="text"
              value={barcodeInput}
              onChange={(e) => setBarcodeInput(e.target.value)}
              placeholder="Scan Barcode / Enter SKU (USB Scanner Ready)..."
              className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
            />
          </form>

          {/* Camera Scanner Button for Mobile / Tablet */}
          {onOpenScanner && (
            <button
              onClick={onOpenScanner}
              type="button"
              title="Open Camera Barcode Scanner"
              className="p-2 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition"
            >
              <Camera className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Text Filter Bar */}
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, fabric, or brand..."
            className="w-full pl-9 pr-3 py-1.5 text-xs sm:text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        {/* Category Filter Chips (Horizontal Scrolling on Mobile) */}
        <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 scrollbar-none text-xs">
          <button
            onClick={() => setSelectedCategory("all")}
            className={`px-3 py-1.5 rounded-full font-medium whitespace-nowrap transition ${
              selectedCategory === "all"
                ? "bg-slate-900 text-white shadow-sm"
                : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
            }`}
          >
            All Items ({products.length})
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3 py-1.5 rounded-full font-medium whitespace-nowrap transition ${
                selectedCategory === cat.id
                  ? "bg-emerald-600 text-white shadow-sm"
                  : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      {/* Touch-Friendly Products Grid */}
      <div className="flex-1 p-3 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center h-48 text-slate-400 text-sm">
            Loading products catalog...
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-slate-400">
            <Layers className="w-8 h-8 mb-2 opacity-50" />
            <p className="text-sm">No products found</p>
          </div>
        ) : (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(140px,1fr))] gap-2.5 sm:gap-3">
            {filteredProducts.map((p) => {
              const isOut = p.stockQuantity <= 0;
              const isLow = p.stockQuantity > 0 && p.stockQuantity <= p.minStockThreshold;

              return (
                <button
                  key={p.id}
                  disabled={isOut}
                  onClick={() => addItem(p)}
                  className={`flex flex-col text-left p-3 rounded-xl border bg-white shadow-sm transition active:scale-[0.98] relative overflow-hidden select-none ${
                    isOut
                      ? "opacity-50 cursor-not-allowed border-slate-200"
                      : "hover:border-emerald-500 hover:shadow-md cursor-pointer border-slate-200"
                  }`}
                >
                  {/* Top Badges */}
                  <div className="flex items-center justify-between w-full mb-1">
                    <span className="text-[10px] font-mono text-slate-400 truncate max-w-[80px]">
                      {p.sku}
                    </span>
                    {isOut ? (
                      <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded">
                        Out
                      </span>
                    ) : isLow ? (
                      <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded flex items-center">
                        <AlertTriangle className="w-2.5 h-2.5 mr-0.5" />
                        {p.stockQuantity} left
                      </span>
                    ) : (
                      <span className="text-[10px] font-medium text-slate-500">
                        Qty: {p.stockQuantity}
                      </span>
                    )}
                  </div>

                  {/* Title & Specs */}
                  <div className="flex-1">
                    <h3 className="font-semibold text-xs sm:text-sm text-slate-900 line-clamp-2 leading-tight">
                      {p.name}
                    </h3>
                    {(p.size || p.color) && (
                      <p className="text-[10px] text-slate-500 mt-0.5 truncate">
                        {p.size && `${p.size}`} {p.color && `• ${p.color}`}
                      </p>
                    )}
                  </div>

                  {/* Price */}
                  <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between w-full">
                    <span className="text-xs text-slate-400 font-medium">Rs.</span>
                    <span className="text-sm sm:text-base font-extrabold text-emerald-700">
                      {formatNumber(p.sellingPrice)}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
