"use client";

import React, { useState, useEffect } from "react";
import {
  Package,
  AlertTriangle,
  Search,
  PlusCircle,
  History,
  Barcode,
  Printer,
  X,
  Layers,
  ArrowDownUp,
  Edit2,
  Trash2,
  CheckCircle,
  FolderPlus,
  Settings,
  Truck,
  FileText,
  ExternalLink,
  Clock,
} from "lucide-react";
import { useAuthStore } from "@/store/auth-store";
import { formatNumber } from "@/lib/format-utils";

export default function InventoryPage() {
  const { user } = useAuthStore();
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [filterLowStockOnly, setFilterLowStockOnly] = useState(false);

  // Supplier Purchase Restock Modal (Proper Purchase Invoice)
  const [purchaseModalOpen, setPurchaseModalOpen] = useState(false);
  const [selectedProductForPurchase, setSelectedProductForPurchase] = useState<any | null>(null);
  const [purchaseSupplierId, setPurchaseSupplierId] = useState("");
  const [purchaseQty, setPurchaseQty] = useState<number>(10);
  const [purchaseCost, setPurchaseCost] = useState<number>(0);
  const [purchaseBillNo, setPurchaseBillNo] = useState("");
  const [purchasePaidAmount, setPurchasePaidAmount] = useState<number>(0);
  const [purchasePaymentMethod, setPurchasePaymentMethod] = useState("CASH");
  const [purchaseNotes, setPurchaseNotes] = useState("");
  const [purchaseDueDate, setPurchaseDueDate] = useState<string>("");
  const [purchaseDueDaysPreset, setPurchaseDueDaysPreset] = useState<string>("15");
  const [isSubmittingPurchase, setIsSubmittingPurchase] = useState(false);

  // Generated Purchase Invoice for immediate printing/viewing
  const [lastCreatedInvoice, setLastCreatedInvoice] = useState<any | null>(null);

  // Category Management Modal
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [categoryNameInput, setCategoryNameInput] = useState("");
  const [categoryDescInput, setCategoryDescInput] = useState("");
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [isSubmittingCategory, setIsSubmittingCategory] = useState(false);

  // Add Product Modal
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [isSubmittingAdd, setIsSubmittingAdd] = useState(false);
  const [newProduct, setNewProduct] = useState({
    name: "",
    sku: "",
    barcode: "",
    categoryId: "",
    purchasePrice: 0,
    sellingPrice: 0,
    stockQuantity: 0,
    minStockThreshold: 5,
    unit: "pcs",
    size: "",
    color: "",
  });

  // Edit Product Modal
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedProductForEdit, setSelectedProductForEdit] = useState<any | null>(null);
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);

  // Stock Adjustment Modal
  const [adjustmentModalOpen, setAdjustmentModalOpen] = useState(false);
  const [selectedProductForAdj, setSelectedProductForAdj] = useState<any | null>(null);
  const [adjQuantity, setAdjQuantity] = useState<number>(10);
  const [adjType, setAdjType] = useState<string>("STOCK_IN_PO");
  const [adjNotes, setAdjNotes] = useState<string>("");

  // Barcode Sheet Modal
  const [barcodeModalOpen, setBarcodeModalOpen] = useState(false);
  const [selectedProductForBarcode, setSelectedProductForBarcode] = useState<any | null>(null);
  const [barcodeStickerCount, setBarcodeStickerCount] = useState<number>(12);

  // Stock Movements Audit Modal
  const [movementsModalOpen, setMovementsModalOpen] = useState(false);
  const [movements, setMovements] = useState<any[]>([]);

  const fetchInventory = async (silent: boolean = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await fetch("/api/products");
      const data = await res.json();
      if (data.success) {
        setProducts(data.products);
        setCategories(data.categories);
      }

      // Fetch Suppliers list for purchase orders
      const supRes = await fetch("/api/suppliers");
      const supData = await supRes.json();
      if (supData.success) {
        setSuppliers(supData.suppliers);
      }
    } catch (e) {
      console.error("Failed to load inventory:", e);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    fetchInventory();
  }, []);

  // Real-time automatic background polling every 5 seconds so inventory & suppliers auto-refresh without manual page reload
  useEffect(() => {
    const timer = setInterval(() => {
      fetchInventory(true);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  const handleOpenPurchaseRestock = (product: any) => {
    setSelectedProductForPurchase(product);
    setPurchaseSupplierId(suppliers.length > 0 ? suppliers[0].id : "");
    setPurchaseQty(10);
    const cost = product.purchasePrice || 0;
    setPurchaseCost(cost);
    setPurchaseBillNo(`BILL-${Date.now().toString().slice(-6)}`);
    setPurchasePaidAmount(cost * 10);
    setPurchasePaymentMethod("CASH");
    setPurchaseNotes("");
    const d = new Date();
    d.setDate(d.getDate() + 15);
    setPurchaseDueDate(d.toISOString().slice(0, 10));
    setPurchaseDueDaysPreset("15");
    setPurchaseModalOpen(true);
  };

  const handleRecordPurchaseInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProductForPurchase) return;
    if (!purchaseSupplierId) {
      alert("Please select a vendor/supplier to record this purchase from!");
      return;
    }
    if (purchaseQty <= 0) {
      alert("Purchase quantity must be greater than zero.");
      return;
    }

    const totalBill = purchaseQty * purchaseCost;
    setIsSubmittingPurchase(true);
    try {
      const res = await fetch("/api/suppliers/purchases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          supplierId: purchaseSupplierId,
          billNumber: purchaseBillNo,
          items: [
            {
              productId: selectedProductForPurchase.id,
              quantity: purchaseQty,
              unitCost: purchaseCost,
            },
          ],
          totalAmount: totalBill,
          paidAmount: purchasePaidAmount,
          paymentMethod: purchasePaymentMethod,
          dueDate: purchasePaidAmount < totalBill ? (purchaseDueDate || null) : null,
          notes: purchaseNotes || `Inventory Restock: ${selectedProductForPurchase.name} (${purchaseQty} ${selectedProductForPurchase.unit || "pcs"})`,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setPurchaseModalOpen(false);
        // Show printable invoice receipt
        setLastCreatedInvoice({
          poNumber: data.purchaseOrder?.poNumber || purchaseBillNo,
          supplierName: suppliers.find((s) => s.id === purchaseSupplierId)?.name || "Supplier",
          createdAt: new Date().toISOString(),
          productName: selectedProductForPurchase.name,
          sku: selectedProductForPurchase.sku,
          unit: selectedProductForPurchase.unit || "pcs",
          quantity: purchaseQty,
          unitCost: purchaseCost,
          totalAmount: totalBill,
          paidAmount: purchasePaidAmount,
          balanceDue: Math.max(0, totalBill - purchasePaidAmount),
          paymentMethod: purchasePaymentMethod,
          notes: purchaseNotes,
        });
        fetchInventory();
      } else {
        alert(`Error: ${data.error || "Failed to record purchase bill"}`);
      }
    } catch (err: any) {
      alert(`Network error: ${err.message}`);
    } finally {
      setIsSubmittingPurchase(false);
    }
  };

  const handleOpenCategoriesModal = () => {
    setEditingCategoryId(null);
    setCategoryNameInput("");
    setCategoryDescInput("");
    setCategoryModalOpen(true);
  };

  const handleStartEditCategory = (cat: any) => {
    setEditingCategoryId(cat.id);
    setCategoryNameInput(cat.name);
    setCategoryDescInput(cat.description || "");
  };

  const handleCancelEditCategory = () => {
    setEditingCategoryId(null);
    setCategoryNameInput("");
    setCategoryDescInput("");
  };

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryNameInput.trim()) {
      alert("Please enter a category name");
      return;
    }
    setIsSubmittingCategory(true);
    try {
      if (editingCategoryId) {
        // Update category
        const res = await fetch(`/api/categories/${editingCategoryId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: categoryNameInput.trim(),
            description: categoryDescInput.trim(),
          }),
        });
        const data = await res.json();
        if (data.success) {
          alert("Category updated successfully!");
          handleCancelEditCategory();
          fetchInventory();
        } else {
          alert(`Error: ${data.error || "Failed to update category"}`);
        }
      } else {
        // Create new category
        const res = await fetch("/api/categories", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: categoryNameInput.trim(),
            description: categoryDescInput.trim(),
          }),
        });
        const data = await res.json();
        if (data.success) {
          alert("New category added successfully!");
          handleCancelEditCategory();
          fetchInventory();
        } else {
          alert(`Error: ${data.error || "Failed to add category"}`);
        }
      }
    } catch (err: any) {
      alert(`Network error: ${err.message}`);
    } finally {
      setIsSubmittingCategory(false);
    }
  };

  const handleDeleteCategory = async (cat: any) => {
    if (!confirm(`Are you sure you want to delete category "${cat.name}"?`)) {
      return;
    }
    try {
      const res = await fetch(`/api/categories/${cat.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.success) {
        alert("Category deleted successfully!");
        if (selectedCategory === cat.id) {
          setSelectedCategory("all");
        }
        fetchInventory();
      } else {
        alert(`Error: ${data.error || "Failed to delete category"}`);
      }
    } catch (err: any) {
      alert(`Network error: ${err.message}`);
    }
  };

  const handleOpenAddProduct = () => {
    const randomSku = `SKU-${Date.now().toString().slice(-5)}`;
    const randomBarcode = `896${Math.floor(100000000 + Math.random() * 900000000)}`;
    setNewProduct({
      name: "",
      sku: randomSku,
      barcode: randomBarcode,
      categoryId: categories.length > 0 ? categories[0].id : "",
      purchasePrice: 0,
      sellingPrice: 0,
      stockQuantity: 0,
      minStockThreshold: 5,
      unit: "pcs",
      size: "",
      color: "",
    });
    setAddModalOpen(true);
  };

  const handleOpenEditProduct = (product: any) => {
    setSelectedProductForEdit({
      id: product.id,
      name: product.name,
      sku: product.sku,
      barcode: product.barcode,
      categoryId: product.categoryId,
      purchasePrice: product.purchasePrice,
      sellingPrice: product.sellingPrice,
      stockQuantity: product.stockQuantity,
      minStockThreshold: product.minStockThreshold,
      unit: product.unit || "pcs",
      size: product.size || "",
      color: product.color || "",
    });
    setEditModalOpen(true);
  };

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProduct.name || !newProduct.categoryId || !newProduct.sellingPrice) {
      alert("Please fill in Product Name, Category and Retail Selling Price.");
      return;
    }
    setIsSubmittingAdd(true);
    try {
      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newProduct),
      });
      const data = await res.json();
      if (data.success) {
        alert("Product created successfully!");
        setAddModalOpen(false);
        fetchInventory();
      } else {
        alert(`Error: ${data.error || "Failed to create product"}`);
      }
    } catch (err: any) {
      alert(`Network error: ${err.message}`);
    } finally {
      setIsSubmittingAdd(false);
    }
  };

  const handleUpdateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProductForEdit) return;
    setIsSubmittingEdit(true);
    try {
      const res = await fetch(`/api/products/${selectedProductForEdit.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(selectedProductForEdit),
      });
      const data = await res.json();
      if (data.success) {
        alert("Product & Rates updated successfully!");
        setEditModalOpen(false);
        fetchInventory();
      } else {
        alert(`Error: ${data.error || "Failed to update product"}`);
      }
    } catch (err: any) {
      alert(`Network error: ${err.message}`);
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  const handleDeleteProduct = async (product: any) => {
    const confirmMsg = `Are you sure you want to delete "${product.name}"?\n(SKU: ${product.sku}, Current Stock: ${product.stockQuantity})`;
    if (!confirm(confirmMsg)) return;

    try {
      const res = await fetch(`/api/products/${product.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.success) {
        alert("Product deleted successfully!");
        fetchInventory();
      } else {
        alert(`Error: ${data.error || "Failed to delete product"}`);
      }
    } catch (err: any) {
      alert(`Network error: ${err.message}`);
    }
  };

  const handleOpenAdjustment = (product: any) => {
    setSelectedProductForAdj(product);
    setAdjQuantity(10);
    setAdjType("STOCK_IN_PO");
    setAdjNotes("");
    setAdjustmentModalOpen(true);
  };

  const handleOpenBarcodeSheet = (product: any) => {
    setSelectedProductForBarcode(product);
    setBarcodeStickerCount(12);
    setBarcodeModalOpen(true);
  };

  const handleOpenMovements = async (productId?: string) => {
    try {
      const url = productId
        ? `/api/inventory/stock-movements?productId=${productId}`
        : "/api/inventory/stock-movements";
      const res = await fetch(url);
      const data = await res.json();
      if (data.success) {
        setMovements(data.movements);
        setMovementsModalOpen(true);
      }
    } catch (e) {
      alert("Failed to load stock movements");
    }
  };

  const submitStockAdjustment = async () => {
    if (!selectedProductForAdj) return;
    try {
      const finalQty =
        adjType === "STOCK_OUT_DAMAGE" || adjType === "STOCK_OUT_SALE"
          ? -Math.abs(adjQuantity)
          : Math.abs(adjQuantity);

      const res = await fetch("/api/inventory/stock-movements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: selectedProductForAdj.id,
          quantity: finalQty,
          movementType: adjType,
          notes: adjNotes || "Inventory adjustment",
        }),
      });

      const data = await res.json();
      if (data.success) {
        alert("Stock adjusted successfully!");
        setAdjustmentModalOpen(false);
        fetchInventory();
      } else {
        alert(data.error);
      }
    } catch (e: any) {
      alert(`Error: ${e.message}`);
    }
  };

  // Metrics
  const totalSkuCount = products.length;
  const totalStockUnits = products.reduce((acc, p) => acc + p.stockQuantity, 0);
  const lowStockCount = products.filter((p) => p.stockQuantity <= p.minStockThreshold).length;

  // Filter
  const filteredProducts = products.filter((p) => {
    const matchesCat = selectedCategory === "all" || p.categoryId === selectedCategory;
    const matchesSearch =
      search === "" ||
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.sku.toLowerCase().includes(search.toLowerCase()) ||
      p.barcode.includes(search);
    const matchesLowStock = !filterLowStockOnly || p.stockQuantity <= p.minStockThreshold;

    return matchesCat && matchesSearch && matchesLowStock;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center space-x-2">
            <Package className="w-7 h-7 text-emerald-600" />
            <span>Inventory Management</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Real-time stock tracking, low-inventory alerts, and barcode label generation
          </p>
        </div>

        <div className="flex items-center space-x-2">
          {user?.role !== "CASHIER" && (
            <>
              <button
                onClick={handleOpenAddProduct}
                className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs sm:text-sm font-bold flex items-center space-x-1.5 shadow-sm shadow-emerald-700/20 transition"
              >
                <PlusCircle className="w-4 h-4" />
                <span>+ Add New Product</span>
              </button>

              <button
                onClick={handleOpenCategoriesModal}
                className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs sm:text-sm font-bold flex items-center space-x-1.5 shadow-sm transition"
              >
                <FolderPlus className="w-4 h-4 text-emerald-400" />
                <span>Categories (کیٹیگریز)</span>
              </button>
            </>
          )}

          <button
            onClick={() => handleOpenMovements()}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs sm:text-sm font-semibold flex items-center space-x-1.5 transition"
          >
            <History className="w-4 h-4 text-slate-600" />
            <span>Audit History</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center space-x-3">
          <div className="p-3 bg-emerald-50 text-emerald-700 rounded-xl">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs text-slate-500 font-medium">Total Products (SKUs)</div>
            <div className="text-xl font-bold text-slate-900">{totalSkuCount}</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center space-x-3">
          <div className="p-3 bg-blue-50 text-blue-700 rounded-xl">
            <Package className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs text-slate-500 font-medium">Total Units in Stock</div>
            <div className="text-xl font-bold text-slate-900">{totalStockUnits}</div>
          </div>
        </div>

        <div
          onClick={() => setFilterLowStockOnly(!filterLowStockOnly)}
          className={`p-4 rounded-xl border shadow-sm flex items-center space-x-3 cursor-pointer transition ${
            lowStockCount > 0
              ? "bg-amber-50/70 border-amber-300 hover:bg-amber-100"
              : "bg-white border-slate-200"
          }`}
        >
          <div className="p-3 bg-amber-500 text-slate-950 rounded-xl">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs text-amber-900 font-semibold">Low Stock Warnings</div>
            <div className="text-xl font-black text-amber-700">
              {lowStockCount} Items
              {filterLowStockOnly && (
                <span className="text-xs text-amber-800 ml-2 font-normal">(Filtering)</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, SKU, or barcode..."
            className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        <div className="flex items-center space-x-2 w-full md:w-auto overflow-x-auto">
          <div className="flex items-center space-x-1">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-700 font-medium"
            >
              <option value="all">All Categories ({categories.length})</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} {c._count?.products !== undefined ? `(${c._count.products})` : ""}
                </option>
              ))}
            </select>

            {user?.role !== "CASHIER" && (
              <button
                onClick={handleOpenCategoriesModal}
                title="Manage Categories (Add / Edit / Delete)"
                className="p-2 bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 text-slate-600 rounded-lg border border-slate-200 transition"
              >
                <Settings className="w-4 h-4" />
              </button>
            )}
          </div>

          <button
            onClick={() => setFilterLowStockOnly(!filterLowStockOnly)}
            className={`px-3 py-2 rounded-lg text-xs sm:text-sm font-semibold flex items-center space-x-1.5 transition whitespace-nowrap ${
              filterLowStockOnly
                ? "bg-amber-500 text-slate-950"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
          >
            <AlertTriangle className="w-4 h-4" />
            <span>Low Stock Only</span>
          </button>
        </div>
      </div>

      {/* Products Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
              <tr>
                <th className="py-3 px-4">Product Details</th>
                <th className="py-3 px-4">SKU & Barcode</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4 text-right">Cost (Rs.)</th>
                <th className="py-3 px-4 text-right">Retail (Rs.)</th>
                <th className="py-3 px-4 text-center">Stock Level</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    Loading inventory catalog...
                  </td>
                </tr>
              ) : filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    No matching products found.
                  </td>
                </tr>
              ) : (
                filteredProducts.map((p) => {
                  const isOut = p.stockQuantity <= 0;
                  const isLow = p.stockQuantity > 0 && p.stockQuantity <= p.minStockThreshold;

                  return (
                    <tr key={p.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900">{p.name}</div>
                        {(p.size || p.color) && (
                          <div className="text-[11px] text-slate-500">
                            {p.size && `${p.size}`} {p.color && `• ${p.color}`}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-600">
                        <div>{p.sku}</div>
                        <div className="text-[11px] text-slate-400">{p.barcode}</div>
                      </td>
                      <td className="py-3 px-4 text-slate-600">
                        {p.category?.name || "Uncategorized"}
                      </td>
                      <td className="py-3 px-4 text-right font-medium text-slate-700">
                        {formatNumber(p.purchasePrice)}
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-emerald-700">
                        {formatNumber(p.sellingPrice)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${
                            isOut
                              ? "bg-rose-100 text-rose-800"
                              : isLow
                              ? "bg-amber-100 text-amber-800"
                              : "bg-emerald-100 text-emerald-800"
                          }`}
                        >
                          {isOut
                            ? "Out of Stock"
                            : isLow
                            ? `Low: ${p.stockQuantity} ${p.unit}`
                            : `${p.stockQuantity} ${p.unit}`}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right space-x-1 whitespace-nowrap">
                        {user?.role !== "CASHIER" && (
                          <>
                            <button
                              onClick={() => handleOpenEditProduct(p)}
                              title="Edit Product & Rates"
                              className="p-1.5 bg-slate-100 hover:bg-blue-50 hover:text-blue-700 rounded-lg transition"
                            >
                              <Edit2 className="w-4 h-4 text-slate-700" />
                            </button>
                            <button
                              onClick={() => handleOpenPurchaseRestock(p)}
                              title="Purchase from Supplier & Restock (وینڈر سے پرچیز بل بنائیں)"
                              className="p-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-lg transition border border-emerald-200"
                            >
                              <Truck className="w-4 h-4 text-emerald-700" />
                            </button>
                          </>
                        )}
                        <button
                          onClick={() => handleOpenBarcodeSheet(p)}
                          title="Generate Barcode Labels"
                          className="p-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg transition text-slate-700"
                        >
                          <Barcode className="w-4 h-4" />
                        </button>
                        {user?.role !== "CASHIER" && (
                          <button
                            onClick={() => handleDeleteProduct(p)}
                            title="Delete Product"
                            className="p-1.5 bg-slate-100 hover:bg-rose-50 hover:text-rose-700 rounded-lg transition text-slate-400"
                          >
                            <Trash2 className="w-4 h-4 text-rose-500" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Record Purchase Restock Bill Modal (Proper Supplier Invoice & Auto Stock-In) */}
      {purchaseModalOpen && selectedProductForPurchase && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6 space-y-4 my-8">
            <div className="flex justify-between items-center border-b pb-3">
              <div>
                <h3 className="font-bold text-base text-slate-900 flex items-center space-x-2">
                  <Truck className="w-5 h-5 text-emerald-600" />
                  <span>Purchase Restock & Supplier Bill (پرچیز بل)</span>
                </h3>
                <p className="text-xs text-slate-500">{selectedProductForPurchase.name}</p>
              </div>
              <button
                onClick={() => setPurchaseModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRecordPurchaseInvoice} className="space-y-3.5 text-xs">
              <div className="bg-emerald-50/50 p-3 rounded-xl border border-emerald-100 flex justify-between items-center">
                <div>
                  <span className="text-slate-500 block text-[10px]">Product / SKU:</span>
                  <span className="font-bold text-slate-900">{selectedProductForPurchase.name}</span>
                  <span className="text-[10px] text-slate-500 font-mono block">{selectedProductForPurchase.sku}</span>
                </div>
                <div className="text-right">
                  <span className="text-slate-500 block text-[10px]">Current Stock:</span>
                  <span className="font-extrabold text-sm text-slate-800">
                    {selectedProductForPurchase.stockQuantity} {selectedProductForPurchase.unit || "pcs"}
                  </span>
                </div>
              </div>

              {/* Vendor Selection */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="font-semibold text-slate-700">
                    Vendor / Supplier * (کس وینڈر سے خریدا؟)
                  </label>
                  <a
                    href="/suppliers"
                    target="_blank"
                    className="text-[11px] text-emerald-700 hover:underline flex items-center font-bold"
                  >
                    <span>+ New Vendor</span>
                    <ExternalLink className="w-3 h-3 ml-0.5" />
                  </a>
                </div>
                <select
                  required
                  value={purchaseSupplierId}
                  onChange={(e) => setPurchaseSupplierId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white font-medium focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="">-- وینڈر منتخب کریں (Select Vendor) --</option>
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} {s.company ? `(${s.company})` : ""} - Baqaya: Rs. {s.currentBalance.toFixed(0)}
                    </option>
                  ))}
                </select>
              </div>

              {/* Bill Details */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Invoice / Bill # (بل نمبر)
                  </label>
                  <input
                    type="text"
                    required
                    value={purchaseBillNo}
                    onChange={(e) => setPurchaseBillNo(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono text-xs bg-white font-bold"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Payment Method</label>
                  <select
                    value={purchasePaymentMethod}
                    onChange={(e) => setPurchasePaymentMethod(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white"
                  >
                    <option value="CASH">Cash (نقد کیش)</option>
                    <option value="BANK_TRANSFER">Bank Transfer (بینک)</option>
                    <option value="CHEQUE">Cheque (چیک)</option>
                    <option value="CREDIT">Full Credit / Udhaar (مکمل ادھار)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Units Purchased ({selectedProductForPurchase.unit || "pcs"}) *
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={purchaseQty}
                    onChange={(e) => {
                      const q = Number(e.target.value);
                      setPurchaseQty(q);
                      setPurchasePaidAmount(q * purchaseCost);
                    }}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-bold text-slate-900 bg-white"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Unit Purchase Rate (خرید ریٹ - Rs.) *
                  </label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    required
                    value={purchaseCost}
                    onChange={(e) => {
                      const c = Number(e.target.value);
                      setPurchaseCost(c);
                      setPurchasePaidAmount(purchaseQty * c);
                    }}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-bold text-emerald-800 bg-white"
                  />
                </div>
              </div>

              {/* Financial Calculation Pane */}
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2">
                <div className="flex justify-between font-bold text-xs text-slate-900">
                  <span>Total Purchase Bill Amount:</span>
                  <span className="text-sm font-black text-slate-900">
                    Rs. {(purchaseQty * purchaseCost).toFixed(2)}
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="font-semibold text-slate-700">Amount Paid Now (ادائیگی):</span>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    max={purchaseQty * purchaseCost}
                    value={purchasePaidAmount}
                    onChange={(e) => setPurchasePaidAmount(Number(e.target.value))}
                    className="w-32 px-2.5 py-1 text-xs border rounded-lg font-bold text-right bg-white text-emerald-700"
                  />
                </div>

                <div className="flex justify-between font-bold pt-1 border-t border-slate-200 text-xs">
                  <span className="text-rose-700">Remaining to Vendor Khata (بقایا ادھار):</span>
                  <span className="text-rose-700 font-extrabold">
                    Rs. {Math.max(0, purchaseQty * purchaseCost - purchasePaidAmount).toFixed(2)}
                  </span>
                </div>

                {/* If there is pending balance, specify when to pay the supplier */}
                {purchaseQty * purchaseCost > purchasePaidAmount && (
                  <div className="mt-2.5 pt-2 border-t border-slate-200">
                    <label className="block text-[11px] font-bold text-slate-800 mb-1 flex items-center">
                      <Clock className="w-3.5 h-3.5 text-amber-600 mr-1" />
                      <span>Payment Due Date to Vendor (وینڈر کو بقایا رقم کب ادا کریں گے؟):</span>
                    </label>
                    <div className="grid grid-cols-2 gap-2 mt-1">
                      <select
                        value={purchaseDueDaysPreset}
                        onChange={(e) => {
                          const val = e.target.value;
                          setPurchaseDueDaysPreset(val);
                          if (val !== "custom") {
                            const days = Number(val);
                            const d = new Date();
                            d.setDate(d.getDate() + days);
                            setPurchaseDueDate(d.toISOString().slice(0, 10));
                          }
                        }}
                        className="px-2 py-1.5 border rounded-lg text-xs bg-white text-slate-700 font-semibold"
                      >
                        <option value="7">In 7 Days (1 ہفتہ بعد)</option>
                        <option value="15">In 15 Days (2 ہفتے بعد)</option>
                        <option value="30">In 30 Days (1 مہینہ بعد)</option>
                        <option value="45">In 45 Days</option>
                        <option value="60">In 60 Days (2 مہینے بعد)</option>
                        <option value="custom">Custom Date (اپنی مرضی کی تاریخ)</option>
                      </select>
                      <input
                        type="date"
                        value={purchaseDueDate}
                        onChange={(e) => {
                          setPurchaseDueDate(e.target.value);
                          setPurchaseDueDaysPreset("custom");
                        }}
                        className="px-2 py-1.5 border rounded-lg text-xs bg-white font-bold text-slate-800"
                      />
                    </div>
                    <p className="text-[10px] text-slate-500 mt-1">
                      🔔 اس تاریخ پر سسٹم آپ کو الرٹ دے گا کہ وینڈر کو بقایا رقم ادھار کلیئر کرنی ہے۔
                    </p>
                  </div>
                )}
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Supplier Delivery Notes / Transport (تفصیلات)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Received via Bilty #5841 Faisalabad Cargo"
                  value={purchaseNotes}
                  onChange={(e) => setPurchaseNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white"
                />
              </div>

              <div className="flex space-x-2 pt-2 border-t">
                <button
                  type="button"
                  onClick={() => setPurchaseModalOpen(false)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingPurchase}
                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs flex items-center justify-center space-x-1 shadow-md shadow-emerald-700/20"
                >
                  <CheckCircle className="w-4 h-4 mr-1" />
                  <span>{isSubmittingPurchase ? "Processing..." : "Generate Purchase Bill & Add Stock"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Printable Purchase Order Bill Invoice Receipt Modal */}
      {lastCreatedInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 space-y-4 my-8">
            <div className="flex justify-between items-center border-b pb-3 print:hidden">
              <div className="flex items-center space-x-2">
                <FileText className="w-5 h-5 text-emerald-600" />
                <h3 className="font-bold text-base text-slate-900">
                  Purchase Invoice Generated (پرچیز انوائس)
                </h3>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => window.print()}
                  className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-lg flex items-center space-x-1"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Invoice</span>
                </button>
                <button
                  onClick={() => setLastCreatedInvoice(null)}
                  className="p-1 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Printable Invoice Container */}
            <div id="purchase-invoice-printable-area" className="p-4 border border-slate-200 rounded-xl bg-slate-50 space-y-3 text-xs print:bg-white print:border-none print:p-0">
              <div className="text-center border-b pb-2">
                <h2 className="font-black text-base text-slate-900 uppercase tracking-tight">
                  Al-Afhhihram House
                </h2>
                <div className="text-[11px] font-bold text-slate-600">
                  OFFICIAL PURCHASE ORDER BILL (خریداری بل)
                </div>
                <div className="text-[10px] text-slate-400">
                  Bill No: {lastCreatedInvoice.poNumber} • Date: {new Date(lastCreatedInvoice.createdAt).toLocaleString()}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div>
                  <span className="text-slate-500 block">Supplier / Vendor:</span>
                  <span className="font-bold text-slate-900">{lastCreatedInvoice.supplierName}</span>
                </div>
                <div className="text-right">
                  <span className="text-slate-500 block">Payment Mode:</span>
                  <span className="font-bold text-slate-900">{lastCreatedInvoice.paymentMethod}</span>
                </div>
              </div>

              {/* Items Purchased Table */}
              <table className="w-full text-left border-t border-b border-slate-200 py-1 my-2">
                <thead>
                  <tr className="text-[10px] text-slate-500 uppercase">
                    <th className="py-1">Product Details</th>
                    <th className="text-center py-1">Qty</th>
                    <th className="text-right py-1">Rate (Rs.)</th>
                    <th className="text-right py-1">Total (Rs.)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  <tr>
                    <td className="py-2">
                      <div className="font-bold text-slate-900">{lastCreatedInvoice.productName}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{lastCreatedInvoice.sku}</div>
                    </td>
                    <td className="text-center font-bold py-2">
                      {lastCreatedInvoice.quantity} {lastCreatedInvoice.unit}
                    </td>
                    <td className="text-right py-2">{lastCreatedInvoice.unitCost.toFixed(2)}</td>
                    <td className="text-right font-bold text-slate-900 py-2">
                      {lastCreatedInvoice.totalAmount.toFixed(2)}
                    </td>
                  </tr>
                </tbody>
              </table>

              {/* Totals */}
              <div className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-600">Total Purchase Value:</span>
                  <span className="font-bold text-slate-900">
                    Rs. {lastCreatedInvoice.totalAmount.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Amount Paid (ادا شدہ):</span>
                  <span className="font-bold text-emerald-700">
                    Rs. {lastCreatedInvoice.paidAmount.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between pt-1 border-t border-slate-200 font-bold">
                  <span className="text-rose-600">Remaining Balance (بقایا کھاتہ):</span>
                  <span className="font-black text-rose-600">
                    Rs. {lastCreatedInvoice.balanceDue.toFixed(2)}
                  </span>
                </div>
              </div>

              {lastCreatedInvoice.notes && (
                <div className="pt-2 border-t text-[10px] text-slate-500">
                  <strong>Notes:</strong> {lastCreatedInvoice.notes}
                </div>
              )}

              <div className="text-center text-[10px] text-emerald-800 font-bold bg-emerald-50 p-2 rounded-lg print:border">
                ✓ Inventory successfully updated & added to Vendor Ledger!
              </div>
            </div>

            <div className="pt-2 flex justify-end print:hidden">
              <button
                onClick={() => setLastCreatedInvoice(null)}
                className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800"
              >
                Close Receipt
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Barcode Stickers Printable Sheet Modal */}
      {barcodeModalOpen && selectedProductForBarcode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full p-6 space-y-4">
            <div className="flex justify-between items-center border-b pb-3 print:hidden">
              <div>
                <h3 className="font-bold text-base text-slate-900">
                  Printable Adhesive Barcode Labels
                </h3>
                <p className="text-xs text-slate-500">{selectedProductForBarcode.name}</p>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => window.print()}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-lg flex items-center space-x-1"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Sheet</span>
                </button>
                <button
                  onClick={() => setBarcodeModalOpen(false)}
                  className="p-1 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Sticker Count Control (Screen Only) */}
            <div className="flex items-center space-x-3 bg-slate-50 p-3 rounded-xl border print:hidden">
              <span className="text-xs font-semibold text-slate-700">Labels to Generate:</span>
              {[6, 12, 24, 30].map((cnt) => (
                <button
                  key={cnt}
                  onClick={() => setBarcodeStickerCount(cnt)}
                  className={`px-2.5 py-1 rounded text-xs font-bold transition ${
                    barcodeStickerCount === cnt
                      ? "bg-slate-900 text-white"
                      : "bg-white border text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  {cnt}
                </button>
              ))}
            </div>

            {/* Printable Sticker Sheet Grid */}
            <div id="barcode-printable-area" className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-4 bg-slate-100 rounded-xl max-h-[60vh] overflow-y-auto print:bg-white print:p-0 print:grid-cols-3">
              {Array.from({ length: barcodeStickerCount }).map((_, i) => (
                <div
                  key={i}
                  className="bg-white p-3 border border-dashed border-slate-300 rounded-lg flex flex-col items-center justify-center text-center shadow-sm"
                >
                  <div className="text-[10px] font-bold text-slate-900 uppercase">
                    Al-Afhhihram House
                  </div>
                  <div className="text-[10px] text-slate-600 font-medium truncate max-w-full">
                    {selectedProductForBarcode.name}
                  </div>
                  {/* Visual Barcode Pattern Representation */}
                  <div className="my-1.5 flex items-center justify-center space-x-[2px] h-9">
                    {[
                      2, 1, 3, 1, 2, 4, 1, 3, 2, 1, 4, 1, 2, 3, 1, 2, 4, 1, 2, 3, 1, 4, 2, 1, 3,
                    ].map((w, idx) => (
                      <div
                        key={idx}
                        className="bg-black h-full"
                        style={{ width: `${w}px` }}
                      />
                    ))}
                  </div>
                  <div className="font-mono text-[10px] font-bold text-slate-900">
                    {selectedProductForBarcode.barcode}
                  </div>
                  <div className="flex justify-between w-full mt-1 pt-1 border-t border-slate-200 text-[10px]">
                    <span className="font-mono text-slate-500">
                      {selectedProductForBarcode.sku}
                    </span>
                    <span className="font-black text-emerald-800">
                      Rs. {selectedProductForBarcode.sellingPrice.toFixed(0)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Stock Movement Audit Log Modal */}
      {movementsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-3xl w-full p-6 space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="font-bold text-base text-slate-900 flex items-center space-x-2">
                <History className="w-5 h-5 text-emerald-600" />
                <span>Stock Movement Audit Logs</span>
              </h3>
              <button
                onClick={() => setMovementsModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 border-b">
                  <tr>
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3">Product</th>
                    <th className="py-2.5 px-3">Type</th>
                    <th className="py-2.5 px-3 text-right">Qty</th>
                    <th className="py-2.5 px-3 text-right">Previous</th>
                    <th className="py-2.5 px-3 text-right">New</th>
                    <th className="py-2.5 px-3">Performed By</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {movements.map((m) => (
                    <tr key={m.id} className="hover:bg-slate-50">
                      <td className="py-2.5 px-3 text-slate-500">
                        {new Date(m.createdAt).toLocaleString()}
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-slate-900">
                        {m.product.name}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-[11px]">{m.movementType}</td>
                      <td
                        className={`py-2.5 px-3 text-right font-bold ${
                          m.quantity > 0 ? "text-emerald-600" : "text-rose-600"
                        }`}
                      >
                        {m.quantity > 0 ? `+${m.quantity}` : m.quantity}
                      </td>
                      <td className="py-2.5 px-3 text-right text-slate-600">{m.previousStock}</td>
                      <td className="py-2.5 px-3 text-right font-bold text-slate-900">
                        {m.newStock}
                      </td>
                      <td className="py-2.5 px-3 text-slate-600">{m.performedBy?.fullName}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
      {/* Add New Product Modal */}
      {addModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl max-w-xl w-full p-6 space-y-4 my-8">
            <div className="flex justify-between items-center border-b pb-3">
              <div>
                <h3 className="font-bold text-base text-slate-900">+ Add New Product (نیا پروڈکٹ شامل کریں)</h3>
                <p className="text-xs text-slate-500">Define product details, SKU, barcode, and PKR rates</p>
              </div>
              <button
                onClick={() => setAddModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateProduct} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className="block font-semibold text-slate-700 mb-1">
                    Product Title / Name * (پروڈکٹ کا نام)
                  </label>
                  <input
                    type="text"
                    required
                    value={newProduct.name}
                    onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                    placeholder="e.g. Premium Al-Haram Ihram (1400g Cotton)"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-medium focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="font-semibold text-slate-700">Category * (کیٹیگری)</label>
                    <button
                      type="button"
                      onClick={handleOpenCategoriesModal}
                      className="text-[11px] text-emerald-700 hover:underline font-bold"
                    >
                      + Manage / Add Categories
                    </button>
                  </div>
                  <select
                    required
                    value={newProduct.categoryId}
                    onChange={(e) => setNewProduct({ ...newProduct, categoryId: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                  >
                    <option value="">Select Category</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Unit</label>
                  <select
                    value={newProduct.unit}
                    onChange={(e) => setNewProduct({ ...newProduct, unit: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                  >
                    <option value="pcs">Pieces (Pcs)</option>
                    <option value="set">Set (جوڑا)</option>
                    <option value="box">Box (ڈبہ)</option>
                    <option value="meter">Meter (میٹر)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">SKU Code *</label>
                  <input
                    type="text"
                    required
                    value={newProduct.sku}
                    onChange={(e) => setNewProduct({ ...newProduct, sku: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono text-xs"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Barcode (EAN-13) *</label>
                  <input
                    type="text"
                    required
                    value={newProduct.barcode}
                    onChange={(e) => setNewProduct({ ...newProduct, barcode: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono text-xs"
                  />
                </div>

                {/* Rates in PKR */}
                <div className="bg-emerald-50/50 p-3 rounded-xl border border-emerald-100 sm:col-span-2 grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-800 mb-1">
                      Purchase Cost (خرید ریٹ - Rs.)
                    </label>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      required
                      value={newProduct.purchasePrice}
                      onChange={(e) =>
                        setNewProduct({ ...newProduct, purchasePrice: Number(e.target.value) })
                      }
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm font-bold text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-emerald-800 mb-1">
                      Retail Selling Price (فروخت ریٹ - Rs.) *
                    </label>
                    <input
                      type="number"
                      step="any"
                      min="1"
                      required
                      value={newProduct.sellingPrice}
                      onChange={(e) =>
                        setNewProduct({ ...newProduct, sellingPrice: Number(e.target.value) })
                      }
                      className="w-full px-3 py-2 bg-white border border-emerald-400 rounded-lg text-sm font-black text-emerald-700 focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>


                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Low Stock Alert Limit
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={newProduct.minStockThreshold}
                    onChange={(e) =>
                      setNewProduct({ ...newProduct, minStockThreshold: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Size (optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. Standard, XL, 54, 56"
                    value={newProduct.size}
                    onChange={(e) => setNewProduct({ ...newProduct, size: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Color (optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. White, Black, Cream"
                    value={newProduct.color}
                    onChange={(e) => setNewProduct({ ...newProduct, color: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div className="flex space-x-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setAddModalOpen(false)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingAdd}
                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs flex items-center justify-center space-x-1"
                >
                  <CheckCircle className="w-4 h-4 mr-1" />
                  <span>{isSubmittingAdd ? "Saving..." : "Save Product"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Product & Rates Modal */}
      {editModalOpen && selectedProductForEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl max-w-xl w-full p-6 space-y-4 my-8">
            <div className="flex justify-between items-center border-b pb-3">
              <div>
                <h3 className="font-bold text-base text-slate-900">Edit Product & Rates (ریٹ اور تفصیلات تبدیل کریں)</h3>
                <p className="text-xs text-slate-500">{selectedProductForEdit.name}</p>
              </div>
              <button
                onClick={() => setEditModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateProduct} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className="block font-semibold text-slate-700 mb-1">
                    Product Title / Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={selectedProductForEdit.name}
                    onChange={(e) =>
                      setSelectedProductForEdit({ ...selectedProductForEdit, name: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-medium focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="font-semibold text-slate-700">Category * (کیٹیگری)</label>
                    <button
                      type="button"
                      onClick={handleOpenCategoriesModal}
                      className="text-[11px] text-emerald-700 hover:underline font-bold"
                    >
                      + Manage / Add
                    </button>
                  </div>
                  <select
                    required
                    value={selectedProductForEdit.categoryId}
                    onChange={(e) =>
                      setSelectedProductForEdit({
                        ...selectedProductForEdit,
                        categoryId: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Unit</label>
                  <select
                    value={selectedProductForEdit.unit}
                    onChange={(e) =>
                      setSelectedProductForEdit({ ...selectedProductForEdit, unit: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                  >
                    <option value="pcs">Pieces (Pcs)</option>
                    <option value="set">Set (جوڑا)</option>
                    <option value="box">Box (ڈبہ)</option>
                    <option value="meter">Meter (میٹر)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">SKU</label>
                  <input
                    type="text"
                    value={selectedProductForEdit.sku}
                    onChange={(e) =>
                      setSelectedProductForEdit({ ...selectedProductForEdit, sku: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono text-xs"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Barcode</label>
                  <input
                    type="text"
                    value={selectedProductForEdit.barcode}
                    onChange={(e) =>
                      setSelectedProductForEdit({
                        ...selectedProductForEdit,
                        barcode: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono text-xs"
                  />
                </div>

                {/* Rates in PKR */}
                <div className="bg-emerald-50/50 p-3 rounded-xl border border-emerald-100 sm:col-span-2 grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-800 mb-1">
                      Purchase Cost (خرید ریٹ - Rs.)
                    </label>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      required
                      value={selectedProductForEdit.purchasePrice}
                      onChange={(e) =>
                        setSelectedProductForEdit({
                          ...selectedProductForEdit,
                          purchasePrice: Number(e.target.value),
                        })
                      }
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm font-bold text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-emerald-800 mb-1">
                      Retail Selling Price (فروخت ریٹ - Rs.) *
                    </label>
                    <input
                      type="number"
                      step="any"
                      min="1"
                      required
                      value={selectedProductForEdit.sellingPrice}
                      onChange={(e) =>
                        setSelectedProductForEdit({
                          ...selectedProductForEdit,
                          sellingPrice: Number(e.target.value),
                        })
                      }
                      className="w-full px-3 py-2 bg-white border border-emerald-400 rounded-lg text-sm font-black text-emerald-700 focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Current Stock Quantity
                  </label>
                  <input
                    type="number"
                    value={selectedProductForEdit.stockQuantity}
                    onChange={(e) =>
                      setSelectedProductForEdit({
                        ...selectedProductForEdit,
                        stockQuantity: Number(e.target.value),
                      })
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-bold"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Low Stock Alert Limit
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={selectedProductForEdit.minStockThreshold}
                    onChange={(e) =>
                      setSelectedProductForEdit({
                        ...selectedProductForEdit,
                        minStockThreshold: Number(e.target.value),
                      })
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Size</label>
                  <input
                    type="text"
                    value={selectedProductForEdit.size}
                    onChange={(e) =>
                      setSelectedProductForEdit({ ...selectedProductForEdit, size: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Color</label>
                  <input
                    type="text"
                    value={selectedProductForEdit.color}
                    onChange={(e) =>
                      setSelectedProductForEdit({ ...selectedProductForEdit, color: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div className="flex space-x-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setEditModalOpen(false)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingEdit}
                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs flex items-center justify-center space-x-1"
                >
                  <CheckCircle className="w-4 h-4 mr-1" />
                  <span>{isSubmittingEdit ? "Updating..." : "Update Product & Rates"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Category Management Modal (Add, Edit, Delete Categories) */}
      {categoryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6 space-y-4 my-8">
            <div className="flex justify-between items-center border-b pb-3">
              <div>
                <h3 className="font-bold text-base text-slate-900 flex items-center space-x-2">
                  <FolderPlus className="w-5 h-5 text-emerald-600" />
                  <span>Category Management (کیٹیگریز کا انتظام)</span>
                </h3>
                <p className="text-xs text-slate-500">
                  Add new product categories, edit names, or remove unused categories
                </p>
              </div>
              <button
                onClick={() => setCategoryModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Category Form (Create or Edit) */}
            <form onSubmit={handleSaveCategory} className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
              <div className="flex justify-between items-center">
                <span className="font-bold text-xs text-slate-800">
                  {editingCategoryId ? "✏️ Edit Category (کیٹیگری تبدیل کریں)" : "➕ Add New Category (نئی کیٹیگری شامل کریں)"}
                </span>
                {editingCategoryId && (
                  <button
                    type="button"
                    onClick={handleCancelEditCategory}
                    className="text-[11px] text-slate-500 hover:text-slate-800 underline"
                  >
                    Cancel Edit
                  </button>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Category Name * (مثلاً: احرام، عبایا، تسبیح، ٹوپی)
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ihram Sets, Prayer Mats, Perfumes/Attar"
                  value={categoryNameInput}
                  onChange={(e) => setCategoryNameInput(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white font-medium focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Description (optional)
                </label>
                <input
                  type="text"
                  placeholder="Short note or description..."
                  value={categoryDescInput}
                  onChange={(e) => setCategoryDescInput(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white"
                />
              </div>

              <div className="flex space-x-2 pt-1">
                {editingCategoryId && (
                  <button
                    type="button"
                    onClick={handleCancelEditCategory}
                    className="flex-1 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold rounded-lg text-xs"
                  >
                    Cancel
                  </button>
                )}
                <button
                  type="submit"
                  disabled={isSubmittingCategory}
                  className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg text-xs flex items-center justify-center space-x-1"
                >
                  <CheckCircle className="w-3.5 h-3.5 mr-1" />
                  <span>
                    {isSubmittingCategory
                      ? "Saving..."
                      : editingCategoryId
                      ? "Update Category"
                      : "Save Category"}
                  </span>
                </button>
              </div>
            </form>

            {/* Existing Categories List */}
            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs font-bold text-slate-700 px-1">
                <span>Existing Categories ({categories.length})</span>
                <span className="text-slate-400 font-normal">Products Count</span>
              </div>

              <div className="max-h-60 overflow-y-auto divide-y divide-slate-100 border border-slate-200 rounded-xl bg-white p-1">
                {categories.length === 0 ? (
                  <div className="p-4 text-center text-xs text-slate-400">
                    No categories found. Create one above!
                  </div>
                ) : (
                  categories.map((cat) => (
                    <div
                      key={cat.id}
                      className={`p-2.5 flex items-center justify-between rounded-lg transition ${
                        editingCategoryId === cat.id ? "bg-emerald-50 border border-emerald-300" : "hover:bg-slate-50"
                      }`}
                    >
                      <div>
                        <div className="font-bold text-xs text-slate-900">{cat.name}</div>
                        {cat.description && (
                          <div className="text-[10px] text-slate-500">{cat.description}</div>
                        )}
                      </div>

                      <div className="flex items-center space-x-2">
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full text-[10px] font-bold">
                          {cat._count?.products || 0} Products
                        </span>

                        <button
                          type="button"
                          onClick={() => handleStartEditCategory(cat)}
                          title="Edit Category Name"
                          className="p-1 hover:bg-slate-200 rounded text-slate-600 hover:text-blue-700 transition"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDeleteCategory(cat)}
                          title="Delete Category"
                          className="p-1 hover:bg-rose-50 rounded text-slate-400 hover:text-rose-600 transition"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="pt-2 border-t flex justify-end">
              <button
                type="button"
                onClick={() => setCategoryModalOpen(false)}
                className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition"
              >
                Done / Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
