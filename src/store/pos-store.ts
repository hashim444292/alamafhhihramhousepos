import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface CartItem {
  productId: string;
  name: string;
  sku: string;
  barcode?: string;
  unitPrice: number;
  costPrice: number;
  quantity: number;
  discountType: "NONE" | "PERCENTAGE" | "FIXED";
  discountValue: number;
  discountAmount: number;
  subtotalAmount: number;
  stockAvailable: number;
}

export interface OfflineTransaction {
  clientTransactionId: string;
  timestamp: string;
  customerId?: string | null;
  customerName: string;
  customerPhone?: string;
  items: any[];
  subtotal: number;
  discountType: "NONE" | "PERCENTAGE" | "FIXED";
  discountValue: number;
  discountAmount: number;
  taxRate: number;
  taxAmount: number;
  totalAmount: number;
  paymentMethod: "CASH" | "CARD" | "MOBILE_WALLET" | "CREDIT" | "SPLIT" | "BANK_TRANSFER";
  amountTendered: number;
  changeDue: number;
  balanceDue: number;
  shiftId?: string | null;
  status: "PENDING_SYNC" | "FAILED";
}

interface PosState {
  cart: CartItem[];
  cartDiscountType: "NONE" | "PERCENTAGE" | "FIXED";
  cartDiscountValue: number;
  taxRate: number; // default 0.0 (0%) for Pakistan retail unless tax applies
  customerId: string | null;
  customerName: string;
  customerPhone: string;
  selectedCustomer: any | null;
  receiptWidth: "80mm" | "58mm";
  isOnline: boolean;
  offlineQueue: OfflineTransaction[];
  activeShift: any | null;

  // Actions
  addItem: (product: any) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  removeItem: (productId: string) => void;
  setItemDiscount: (productId: string, type: "NONE" | "PERCENTAGE" | "FIXED", value: number) => void;
  setCartDiscount: (type: "NONE" | "PERCENTAGE" | "FIXED", value: number) => void;
  setTaxRate: (rate: number) => void;
  setCustomer: (name: string, phone: string, customerId?: string | null) => void;
  setSelectedCustomer: (customer: any | null) => void;
  setReceiptWidth: (width: "80mm" | "58mm") => void;
  setIsOnline: (online: boolean) => void;
  setActiveShift: (shift: any | null) => void;
  clearCart: () => void;

  // Offline queue actions
  enqueueOfflineTransaction: (tx: OfflineTransaction) => void;
  dequeueOfflineTransaction: (clientTxId: string) => void;
  clearOfflineQueue: () => void;

  // Computed calculations
  getSubtotal: () => number;
  getCartDiscountAmount: () => number;
  getTaxAmount: () => number;
  getGrandTotal: () => number;
}

export const usePosStore = create<PosState>()(
  persist(
    (set, get) => ({
      cart: [],
      cartDiscountType: "NONE",
      cartDiscountValue: 0,
      taxRate: 0.0, // 0% default
      customerId: null,
      customerName: "Walk-in Customer",
      customerPhone: "",
      selectedCustomer: null,
      receiptWidth: "80mm",
      isOnline: true,
      offlineQueue: [],
      activeShift: null,

      addItem: (product) => {
        const { cart } = get();
        const existingIndex = cart.findIndex((item) => item.productId === product.id);

        if (existingIndex > -1) {
          const updated = [...cart];
          const item = updated[existingIndex];
          const newQty = item.quantity + 1;
          const lineGross = newQty * item.unitPrice;

          let lineDiscount = 0;
          if (item.discountType === "PERCENTAGE") {
            lineDiscount = (lineGross * item.discountValue) / 100;
          } else if (item.discountType === "FIXED") {
            lineDiscount = item.discountValue;
          }

          updated[existingIndex] = {
            ...item,
            quantity: newQty,
            discountAmount: lineDiscount,
            subtotalAmount: Math.max(0, lineGross - lineDiscount),
          };
          set({ cart: updated });
        } else {
          const initialGross = product.sellingPrice;
          set({
            cart: [
              ...cart,
              {
                productId: product.id,
                name: product.name,
                sku: product.sku,
                barcode: product.barcode,
                unitPrice: product.sellingPrice,
                costPrice: product.purchasePrice,
                quantity: 1,
                discountType: "NONE",
                discountValue: 0,
                discountAmount: 0,
                subtotalAmount: initialGross,
                stockAvailable: product.stockQuantity,
              },
            ],
          });
        }
      },

      updateQuantity: (productId, quantity) => {
        if (quantity <= 0) {
          get().removeItem(productId);
          return;
        }

        const { cart } = get();
        const updated = cart.map((item) => {
          if (item.productId === productId) {
            const lineGross = quantity * item.unitPrice;
            let lineDiscount = 0;
            if (item.discountType === "PERCENTAGE") {
              lineDiscount = (lineGross * item.discountValue) / 100;
            } else if (item.discountType === "FIXED") {
              lineDiscount = item.discountValue;
            }

            return {
              ...item,
              quantity,
              discountAmount: lineDiscount,
              subtotalAmount: Math.max(0, lineGross - lineDiscount),
            };
          }
          return item;
        });

        set({ cart: updated });
      },

      removeItem: (productId) => {
        set({ cart: get().cart.filter((item) => item.productId !== productId) });
      },

      setItemDiscount: (productId, type, value) => {
        const { cart } = get();
        const updated = cart.map((item) => {
          if (item.productId === productId) {
            const lineGross = item.quantity * item.unitPrice;
            let lineDiscount = 0;
            if (type === "PERCENTAGE") {
              lineDiscount = (lineGross * Math.min(100, Math.max(0, value))) / 100;
            } else if (type === "FIXED") {
              lineDiscount = Math.min(lineGross, Math.max(0, value));
            }

            return {
              ...item,
              discountType: type,
              discountValue: value,
              discountAmount: lineDiscount,
              subtotalAmount: Math.max(0, lineGross - lineDiscount),
            };
          }
          return item;
        });

        set({ cart: updated });
      },

      setCartDiscount: (type, value) => {
        set({ cartDiscountType: type, cartDiscountValue: Math.max(0, value) });
      },

      setTaxRate: (rate) => set({ taxRate: Math.max(0, rate) }),
      
      setCustomer: (customerName, customerPhone, customerId = null) =>
        set({ customerName, customerPhone, customerId }),

      setSelectedCustomer: (selectedCustomer) => {
        if (selectedCustomer) {
          set({
            selectedCustomer,
            customerId: selectedCustomer.id,
            customerName: selectedCustomer.name,
            customerPhone: selectedCustomer.phone || "",
          });
        } else {
          set({
            selectedCustomer: null,
            customerId: null,
            customerName: "Walk-in Customer",
            customerPhone: "",
          });
        }
      },

      setReceiptWidth: (receiptWidth) => set({ receiptWidth }),
      setIsOnline: (isOnline) => set({ isOnline }),
      setActiveShift: (activeShift) => set({ activeShift }),

      clearCart: () => {
        set({
          cart: [],
          cartDiscountType: "NONE",
          cartDiscountValue: 0,
          customerId: null,
          customerName: "Walk-in Customer",
          customerPhone: "",
          selectedCustomer: null,
        });
      },

      enqueueOfflineTransaction: (tx) => {
        set({ offlineQueue: [...get().offlineQueue, tx] });
      },

      dequeueOfflineTransaction: (clientTxId) => {
        set({
          offlineQueue: get().offlineQueue.filter(
            (tx) => tx.clientTransactionId !== clientTxId
          ),
        });
      },

      clearOfflineQueue: () => set({ offlineQueue: [] }),

      getSubtotal: () => {
        return get().cart.reduce((sum, item) => sum + item.subtotalAmount, 0);
      },

      getCartDiscountAmount: () => {
        const subtotal = get().getSubtotal();
        const { cartDiscountType, cartDiscountValue } = get();
        if (cartDiscountType === "PERCENTAGE") {
          return (subtotal * Math.min(100, cartDiscountValue)) / 100;
        }
        if (cartDiscountType === "FIXED") {
          return Math.min(subtotal, cartDiscountValue);
        }
        return 0;
      },

      getTaxAmount: () => {
        const subtotal = get().getSubtotal();
        const cartDiscount = get().getCartDiscountAmount();
        const taxable = Math.max(0, subtotal - cartDiscount);
        return taxable * get().taxRate;
      },

      getGrandTotal: () => {
        const subtotal = get().getSubtotal();
        const cartDiscount = get().getCartDiscountAmount();
        const tax = get().getTaxAmount();
        return Math.max(0, subtotal - cartDiscount + tax);
      },
    }),
    {
      name: "al-afhhihram-pos-store-v2",
    }
  )
);
