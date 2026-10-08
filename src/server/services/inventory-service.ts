import db from "@/lib/db";
import { StockAdjustmentInput } from "@/lib/validations/product";

export class InventoryService {
  static async adjustStock(input: StockAdjustmentInput, userId: string) {
    return db.$transaction(async (tx) => {
      const product = await tx.product.findUnique({
        where: { id: input.productId },
      });

      if (!product) {
        throw new Error("Product not found");
      }

      const previousStock = product.stockQuantity;
      const newStock = previousStock + input.quantity;

      if (newStock < 0) {
        throw new Error(`Insufficient stock. Current stock: ${previousStock}, adjustment: ${input.quantity}`);
      }

      // Update product stock
      const updatedProduct = await tx.product.update({
        where: { id: input.productId },
        data: { stockQuantity: newStock },
      });

      // Record movement
      const movement = await tx.stockMovement.create({
        data: {
          productId: input.productId,
          movementType: input.movementType,
          quantity: input.quantity,
          previousStock,
          newStock,
          referenceType: "MANUAL",
          notes: input.notes || "Manual stock adjustment",
          performedById: userId,
        },
        include: {
          product: true,
          performedBy: {
            select: { id: true, fullName: true, username: true },
          },
        },
      });

      return { product: updatedProduct, movement };
    });
  }

  static async getMovements(limit = 100, productId?: string) {
    const where: any = {};
    if (productId) where.productId = productId;

    return db.stockMovement.findMany({
      where,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        product: { select: { id: true, name: true, sku: true, barcode: true } },
        performedBy: { select: { id: true, fullName: true } },
      },
    });
  }

  static async getLowStockProducts() {
    const products = await db.product.findMany({
      where: { isActive: true },
      include: { category: true },
      orderBy: { stockQuantity: "asc" },
    });

    return products.filter((p) => p.stockQuantity <= p.minStockThreshold);
  }
}
