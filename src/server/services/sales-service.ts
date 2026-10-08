import db from "@/lib/db";
import { CheckoutInput } from "@/lib/validations/sales";

export class SalesService {
  private static async generateInvoiceNumber(): Promise<string> {
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, "");
    const countToday = await db.salesTransaction.count({
      where: {
        createdAt: {
          gte: new Date(new Date().setHours(0, 0, 0, 0)),
        },
      },
    });
    const seq = String(countToday + 1).padStart(4, "0");
    return `INV-${dateStr}-${seq}`;
  }

  static async checkout(input: CheckoutInput, cashierId: string) {
    return db.$transaction(async (tx) => {
      // 1. Check idempotency for offline queue sync
      if (input.clientTransactionId) {
        const existing = await tx.salesTransaction.findUnique({
          where: { clientTransactionId: input.clientTransactionId },
          include: { items: true },
        });
        if (existing) {
          return { transaction: existing, isDuplicate: true };
        }
      }

      // 2. Validate stock for all items
      for (const item of input.items) {
        const product = await tx.product.findUnique({
          where: { id: item.productId },
        });

        if (!product) {
          throw new Error(`Product ${item.name} not found`);
        }

        if (product.stockQuantity < item.quantity) {
          throw new Error(
            `Insufficient stock for "${product.name}". Available: ${product.stockQuantity}, Requested: ${item.quantity}`
          );
        }
      }

      // 3. Compute credit / balance due (Udhaar)
      let balanceDue = 0;
      if (input.paymentMethod === "CREDIT") {
        balanceDue = input.totalAmount;
      } else if (input.amountTendered < input.totalAmount) {
        balanceDue = Math.max(0, input.totalAmount - input.amountTendered);
      }

      // 4. Generate invoice number
      const invoiceNumber = await this.generateInvoiceNumber();

      // 5. Create sales transaction
      const transaction = await tx.salesTransaction.create({
        data: {
          invoiceNumber,
          clientTransactionId: input.clientTransactionId,
          cashierId,
          shiftId: input.shiftId,
          customerId: input.customerId || null,
          customerName: input.customerName || "Walk-in Customer",
          customerPhone: input.customerPhone,
          subtotal: input.subtotal,
          discountType: input.discountType,
          discountValue: input.discountValue,
          discountAmount: input.discountAmount,
          taxRate: input.taxRate,
          taxAmount: input.taxAmount,
          totalAmount: input.totalAmount,
          paymentMethod: input.paymentMethod,
          amountTendered: input.paymentMethod === "CREDIT" ? 0 : input.amountTendered,
          changeDue: input.changeDue,
          balanceDue,
          dueDate: input.dueDate ? new Date(input.dueDate) : null,
          status: "COMPLETED",
          isSynced: true,
          items: {
            create: input.items.map((item) => ({
              productId: item.productId,
              productName: item.name,
              sku: item.sku,
              unitPrice: item.unitPrice,
              costPrice: item.costPrice,
              quantity: item.quantity,
              discountAmount: item.discountAmount,
              subtotalAmount: item.subtotalAmount,
            })),
          },
        },
        include: {
          items: true,
          cashier: { select: { id: true, fullName: true, username: true } },
          customer: true,
        },
      });

      // 6. Deduct inventory & record stock movements
      for (const item of input.items) {
        const currentProduct = await tx.product.findUnique({
          where: { id: item.productId },
        });

        if (currentProduct) {
          const previousStock = currentProduct.stockQuantity;
          const newStock = previousStock - item.quantity;

          await tx.product.update({
            where: { id: item.productId },
            data: { stockQuantity: newStock },
          });

          await tx.stockMovement.create({
            data: {
              productId: item.productId,
              movementType: "STOCK_OUT_SALE",
              quantity: -item.quantity,
              previousStock,
              newStock,
              referenceId: invoiceNumber,
              referenceType: "SALE",
              notes: `Sold via POS Invoice ${invoiceNumber}`,
              performedById: cashierId,
            },
          });
        }
      }

      // 7. Update Customer Ledger & Udhaar Balance if customer is registered
      if (input.customerId) {
        const customer = await tx.customer.findUnique({
          where: { id: input.customerId },
        });

        if (customer) {
          const prevBalance = customer.balance;
          const newBalance = prevBalance + balanceDue;

          await tx.customerLedgerEntry.create({
            data: {
              customerId: input.customerId,
              referenceType: "SALE_INVOICE",
              referenceId: invoiceNumber,
              debit: balanceDue > 0 ? balanceDue : input.totalAmount,
              credit: balanceDue > 0 ? 0 : input.totalAmount,
              runningBalance: newBalance,
              notes:
                balanceDue > 0
                  ? `Credit Sale on Invoice #${invoiceNumber} (Pending: Rs. ${balanceDue.toFixed(2)})`
                  : `Full Paid Sale on Invoice #${invoiceNumber}`,
            },
          });

          const customerUpdateData: any = { balance: newBalance };
          if (balanceDue > 0 && input.dueDate) {
            customerUpdateData.paymentDueDate = new Date(input.dueDate);
          } else if (newBalance <= 0) {
            customerUpdateData.paymentDueDate = null;
          }

          await tx.customer.update({
            where: { id: input.customerId },
            data: customerUpdateData,
          });
        }
      }

      // 8. Update Shift running total if shiftId is provided
      if (input.shiftId) {
        const actualCashCollected =
          input.paymentMethod === "CASH" ? Math.min(input.totalAmount, input.amountTendered) : 0;

        await tx.shift.update({
          where: { id: input.shiftId },
          data: {
            totalSalesAmount: { increment: input.totalAmount },
            totalTransactions: { increment: 1 },
          },
        });
      }

      return { transaction, isDuplicate: false };
    });
  }

  static async getTransactionById(id: string) {
    return db.salesTransaction.findUnique({
      where: { id },
      include: {
        items: true,
        cashier: { select: { fullName: true, username: true } },
        customer: true,
      },
    });
  }

  static async listTransactions(filters: {
    startDate?: Date;
    endDate?: Date;
    cashierId?: string;
    customerId?: string;
    paymentMethod?: string;
    limit?: number;
    skip?: number;
  }) {
    const where: any = {};

    if (filters.startDate || filters.endDate) {
      where.createdAt = {};
      if (filters.startDate) where.createdAt.gte = filters.startDate;
      if (filters.endDate) where.createdAt.lte = filters.endDate;
    }

    if (filters.cashierId) {
      where.cashierId = filters.cashierId;
    }

    if (filters.customerId) {
      where.customerId = filters.customerId;
    }

    if (filters.paymentMethod && filters.paymentMethod !== "ALL") {
      where.paymentMethod = filters.paymentMethod;
    }

    const [total, transactions] = await Promise.all([
      db.salesTransaction.count({ where }),
      db.salesTransaction.findMany({
        where,
        take: filters.limit || 50,
        skip: filters.skip || 0,
        orderBy: { createdAt: "desc" },
        include: {
          items: true,
          cashier: { select: { fullName: true, username: true } },
          customer: { select: { id: true, name: true, phone: true } },
        },
      }),
    ]);

    return { total, transactions };
  }

  /**
   * Process a Sales Return (واپسی)
   * Restocks returned items, adjusts customer khata / issues refund,
   * creates audit stock movement, and updates transaction status.
   */
  static async processSalesReturn(
    transactionId: string,
    cashierId: string,
    reason: string = "Customer Return / واپسی",
    refundMethod: "CASH" | "KHATA_CREDIT" = "CASH"
  ) {
    return db.$transaction(async (tx) => {
      const transaction = await tx.salesTransaction.findUnique({
        where: { id: transactionId },
        include: { items: true, customer: true },
      });

      if (!transaction) throw new Error("Sale transaction not found");
      if (transaction.status === "REFUNDED") {
        throw new Error("This transaction has already been refunded/returned");
      }

      // 1. Restock each returned item back into inventory & log stock movement
      for (const item of transaction.items) {
        const product = await tx.product.findUnique({
          where: { id: item.productId },
        });

        if (product) {
          const previousStock = product.stockQuantity;
          const newStock = previousStock + item.quantity;

          await tx.product.update({
            where: { id: item.productId },
            data: { stockQuantity: newStock },
          });

          await tx.stockMovement.create({
            data: {
              productId: item.productId,
              movementType: "STOCK_IN_RETURN",
              quantity: item.quantity,
              previousStock,
              newStock,
              referenceId: transaction.invoiceNumber,
              referenceType: "SALE_RETURN",
              notes: `Sales Return on Invoice #${transaction.invoiceNumber}: ${reason}`,
              performedById: cashierId,
            },
          });
        }
      }

      // 2. Adjust Customer Khata / Ledger if sale was tied to a registered customer
      if (transaction.customerId) {
        const customer = await tx.customer.findUnique({
          where: { id: transaction.customerId },
        });

        if (customer) {
          // If invoice had balanceDue (pending udhaar), reduce customer balance by that amount
          // If full amount was paid, or if refunded via Khata credit, decrease balance
          const balanceReduction = transaction.balanceDue > 0 ? transaction.balanceDue : 0;
          const newBalance = Math.max(0, customer.balance - balanceReduction);

          await tx.customerLedgerEntry.create({
            data: {
              customerId: customer.id,
              referenceType: "SALE_RETURN",
              referenceId: transaction.invoiceNumber,
              debit: 0,
              credit: transaction.totalAmount,
              runningBalance: newBalance,
              notes: `Sales Return on Invoice #${transaction.invoiceNumber} - ${reason}`,
            },
          });

          await tx.customer.update({
            where: { id: customer.id },
            data: {
              balance: newBalance,
              paymentDueDate: newBalance <= 0 ? null : customer.paymentDueDate,
            },
          });
        }
      }

      // 3. Mark transaction status as REFUNDED and clear balance due
      const updatedTx = await tx.salesTransaction.update({
        where: { id: transactionId },
        data: {
          status: "REFUNDED",
          balanceDue: 0,
          updatedAt: new Date(),
        },
        include: {
          items: true,
          cashier: { select: { fullName: true, username: true } },
          customer: true,
        },
      });

      return updatedTx;
    });
  }
}
