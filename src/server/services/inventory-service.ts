import db from "@/lib/db";
import { StockAdjustmentInput } from "@/lib/validations/product";
import {
  StockLossSettlementData,
  parseStockLossNotes,
  formatStockLossNotes,
} from "@/types/stock-loss";

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
      const isOutward = ["STOCK_OUT_DAMAGE", "STOCK_OUT_STOLEN", "STOCK_OUT_SALE", "STOCK_OUT_RETURN"].includes(input.movementType);
      const isLoss = input.movementType === "STOCK_OUT_DAMAGE" || input.movementType === "STOCK_OUT_STOLEN";
      const effectiveQty = isOutward ? -Math.abs(input.quantity) : input.quantity;
      const newStock = previousStock + effectiveQty;

      if (newStock < 0) {
        throw new Error(`Insufficient stock. Current stock: ${previousStock}, adjustment: ${effectiveQty}`);
      }

      // Update product stock
      const updatedProduct = await tx.product.update({
        where: { id: input.productId },
        data: { stockQuantity: newStock },
      });

      const referenceType =
        input.movementType === "STOCK_OUT_DAMAGE"
          ? "DAMAGE"
          : input.movementType === "STOCK_OUT_STOLEN"
          ? "STOLEN"
          : "MANUAL";

      let movementNotes = input.notes || (isOutward ? "Reported loss / stock deduction" : "Manual stock adjustment");
      if (isLoss) {
        const lossPayload: StockLossSettlementData = {
          reason: input.notes?.trim() || (input.movementType === "STOCK_OUT_DAMAGE" ? "Damaged / Broken item reported" : "Stolen / Lost item reported"),
          settlementStatus: "UNSETTLED",
        };
        movementNotes = formatStockLossNotes(lossPayload);
      }

      // Record movement
      const movement = await tx.stockMovement.create({
        data: {
          productId: input.productId,
          movementType: input.movementType,
          quantity: effectiveQty,
          previousStock,
          newStock,
          referenceType,
          notes: movementNotes,
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

  static async getMovements(params?: {
    limit?: number;
    productId?: string;
    movementType?: string;
    startDate?: Date;
    endDate?: Date;
    performedById?: string;
  }) {
    const limit = params?.limit || 200;
    const where: any = {};

    if (params?.productId) where.productId = params.productId;
    if (params?.performedById && params.performedById !== "ALL") {
      where.performedById = params.performedById;
    }

    if (params?.movementType && params.movementType !== "ALL") {
      if (params.movementType === "LOSS") {
        where.movementType = { in: ["STOCK_OUT_DAMAGE", "STOCK_OUT_STOLEN"] };
      } else {
        where.movementType = params.movementType;
      }
    }

    if (params?.startDate || params?.endDate) {
      where.createdAt = {};
      if (params.startDate) where.createdAt.gte = params.startDate;
      if (params.endDate) where.createdAt.lte = params.endDate;
    }

    return db.stockMovement.findMany({
      where,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            sku: true,
            barcode: true,
            purchasePrice: true,
            sellingPrice: true,
            unit: true,
          },
        },
        performedBy: {
          select: { id: true, fullName: true, username: true, role: true },
        },
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

  static async settleLoss(
    movementId: string,
    input: {
      settlementType: "RECOVERED_FROM_STAFF" | "ABSORBED_BY_STORE";
      notes?: string;
    },
    manager: { id: string; fullName: string; role: string }
  ) {
    const movement = await db.stockMovement.findUnique({
      where: { id: movementId },
      include: {
        product: true,
        performedBy: { select: { id: true, fullName: true, username: true } },
      },
    });

    if (!movement) {
      throw new Error("Stock movement record not found");
    }

    if (movement.movementType !== "STOCK_OUT_DAMAGE" && movement.movementType !== "STOCK_OUT_STOLEN") {
      throw new Error("Only Damaged and Stolen stock movements can be settled as inventory loss");
    }

    const existingLossData = parseStockLossNotes(movement.notes);

    const updatedLossData: StockLossSettlementData = {
      ...existingLossData,
      settlementStatus: "SETTLED",
      settlementType: input.settlementType,
      settledBy: manager.fullName,
      settledAt: new Date().toISOString(),
      settlementNotes:
        input.notes?.trim() ||
        (input.settlementType === "RECOVERED_FROM_STAFF"
          ? "شاپ مینیجر / عملے سے نقصان کی رقم وصول / ایڈجسٹ کر لی گئی۔ (Recovered from Shop Staff)"
          : "دکان / مالک نے کاروباری نقصان کے طور پر تسلیم کر لیا۔ (Store Loss Absorbed by Shop)"),
    };

    const updatedMovement = await db.stockMovement.update({
      where: { id: movementId },
      data: {
        notes: formatStockLossNotes(updatedLossData),
      },
      include: {
        product: true,
        performedBy: { select: { id: true, fullName: true, username: true } },
      },
    });

    return {
      success: true,
      movement: {
        ...updatedMovement,
        lossData: updatedLossData,
      },
    };
  }
}
