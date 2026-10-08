import { z } from "zod";

export const ProductSchema = z.object({
  sku: z.string().min(2, "SKU is required"),
  barcode: z.string().min(3, "Barcode is required"),
  name: z.string().min(2, "Product name is required"),
  description: z.string().optional().nullable(),
  categoryId: z.string().min(1, "Category is required"),
  purchasePrice: z.number().nonnegative("Purchase price must be positive"),
  sellingPrice: z.number().positive("Selling price must be greater than zero"),
  stockQuantity: z.number().int().default(0),
  minStockThreshold: z.number().int().nonnegative().default(5),
  unit: z.string().default("pcs"),
  size: z.string().optional().nullable(),
  color: z.string().optional().nullable(),
  brand: z.string().optional().nullable(),
  imageUrl: z.string().optional().nullable(),
  isActive: z.boolean().default(true),
});

export const StockAdjustmentSchema = z.object({
  productId: z.string().min(1, "Product ID is required"),
  quantity: z.number().int().refine((val) => val !== 0, "Quantity cannot be zero"),
  movementType: z.enum([
    "STOCK_IN_PO",
    "STOCK_OUT_SALE",
    "STOCK_OUT_DAMAGE",
    "STOCK_OUT_RETURN",
    "MANUAL_ADJUSTMENT",
  ]),
  notes: z.string().optional(),
});

export type ProductInput = z.infer<typeof ProductSchema>;
export type StockAdjustmentInput = z.infer<typeof StockAdjustmentSchema>;
