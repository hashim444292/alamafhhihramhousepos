import { z } from "zod";

export const CartItemSchema = z.object({
  productId: z.string().min(1),
  name: z.string(),
  sku: z.string(),
  barcode: z.string().optional(),
  unitPrice: z.number().positive(),
  costPrice: z.number().nonnegative(),
  quantity: z.number().int().positive(),
  discountAmount: z.number().nonnegative().default(0),
  subtotalAmount: z.number().nonnegative(),
});

export const CheckoutSchema = z.object({
  clientTransactionId: z.string().optional(),
  customerId: z.string().optional().nullable(),
  customerName: z.string().default("Walk-in Customer"),
  customerPhone: z.string().optional().nullable(),
  items: z.array(CartItemSchema).min(1, "Cart cannot be empty"),
  subtotal: z.number().nonnegative(),
  discountType: z.enum(["NONE", "PERCENTAGE", "FIXED"]).default("NONE"),
  discountValue: z.number().nonnegative().default(0),
  discountAmount: z.number().nonnegative().default(0),
  taxRate: z.number().nonnegative().default(0.0),
  taxAmount: z.number().nonnegative().default(0),
  totalAmount: z.number().positive(),
  paymentMethod: z.enum(["CASH", "CARD", "MOBILE_WALLET", "CREDIT", "SPLIT", "BANK_TRANSFER"]).default("CASH"),
  amountTendered: z.number().nonnegative().default(0),
  changeDue: z.number().nonnegative().default(0),
  balanceDue: z.number().nonnegative().default(0), // Udhaar / Khata balance
  dueDate: z.string().optional().nullable(), // Due date for Khata promise/recovery
  shiftId: z.string().optional().nullable(),
});

export const OfflineSyncBatchSchema = z.object({
  transactions: z.array(CheckoutSchema),
});

export type CartItemInput = z.infer<typeof CartItemSchema>;
export type CheckoutInput = z.infer<typeof CheckoutSchema>;
