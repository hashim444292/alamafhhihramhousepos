import db from "@/lib/db";

export interface SupplierInput {
  name: string;
  companyName?: string;
  phone?: string;
  email?: string;
  address?: string;
  currentBalance?: number;
  paymentDueDate?: string | Date | null;
  paymentTermsDays?: number;
}

export interface PurchaseBillInput {
  supplierId: string;
  poNumber?: string;
  items: Array<{
    productId: string;
    quantity: number;
    unitCost: number;
  }>;
  totalAmount: number;
  paidAmount: number;
  paymentMethod: string;
  dueDate?: string | Date | null;
  notes?: string;
}

export class SupplierService {
  static async getAll(search?: string) {
    const where: any = { isActive: true };
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { companyName: { contains: search } },
        { phone: { contains: search } },
      ];
    }

    return db.supplier.findMany({
      where,
      orderBy: { name: "asc" },
      include: {
        _count: { select: { purchaseOrders: true, ledgerEntries: true } },
      },
    });
  }

  static async getById(id: string) {
    return db.supplier.findUnique({
      where: { id },
      include: {
        purchaseOrders: {
          orderBy: { orderDate: "desc" },
          include: {
            items: {
              include: { product: { select: { name: true, sku: true, unit: true } } },
            },
          },
        },
        ledgerEntries: {
          orderBy: { createdAt: "desc" },
        },
      },
    });
  }

  static async create(data: SupplierInput) {
    return db.supplier.create({
      data: {
        name: data.name,
        companyName: data.companyName,
        phone: data.phone,
        email: data.email,
        address: data.address,
        currentBalance: data.currentBalance || 0.0,
        paymentDueDate: data.paymentDueDate ? new Date(data.paymentDueDate) : null,
        paymentTermsDays: data.paymentTermsDays || 0,
      },
    });
  }

  static async update(id: string, data: Partial<SupplierInput>) {
    const updateData: any = { ...data };
    if (data.paymentDueDate !== undefined) {
      updateData.paymentDueDate = data.paymentDueDate ? new Date(data.paymentDueDate) : null;
    }
    return db.supplier.update({
      where: { id },
      data: updateData,
    });
  }

  static async delete(id: string) {
    return db.supplier.update({
      where: { id },
      data: { isActive: false },
    });
  }

  /**
   * Record new inventory purchase bill from supplier,
   * automatically update inventory stock, and update vendor ledger balance.
   */
  static async recordPurchaseBill(input: PurchaseBillInput, userId: string) {
    return db.$transaction(async (tx) => {
      const supplier = await tx.supplier.findUnique({
        where: { id: input.supplierId },
      });

      if (!supplier) {
        throw new Error("Supplier not found");
      }

      const balanceAmount = Math.max(0, input.totalAmount - input.paidAmount);
      const billNumber =
        input.poNumber || `BILL-${Date.now().toString().slice(-6)}`;

      const billDueDate = input.dueDate ? new Date(input.dueDate) : null;

      // 1. Create Purchase Order / Bill record
      const po = await tx.purchaseOrder.create({
        data: {
          poNumber: billNumber,
          supplierId: input.supplierId,
          totalAmount: input.totalAmount,
          paidAmount: input.paidAmount,
          balanceAmount,
          dueDate: billDueDate,
          paymentMethod: input.paymentMethod,
          status: "RECEIVED",
          notes: input.notes,
          items: {
            create: input.items.map((item) => ({
              productId: item.productId,
              quantityOrdered: item.quantity,
              quantityReceived: item.quantity,
              unitCost: item.unitCost,
              totalCost: item.quantity * item.unitCost,
            })),
          },
        },
        include: { items: true },
      });

      // 2. Increment stock quantity for each product and log Stock Movement
      for (const item of input.items) {
        const product = await tx.product.findUnique({
          where: { id: item.productId },
        });

        if (product) {
          const previousStock = product.stockQuantity;
          const newStock = previousStock + item.quantity;

          await tx.product.update({
            where: { id: item.productId },
            data: {
              stockQuantity: newStock,
              purchasePrice: item.unitCost, // Update latest purchase cost
            },
          });

          await tx.stockMovement.create({
            data: {
              productId: item.productId,
              movementType: "STOCK_IN_PO",
              quantity: item.quantity,
              previousStock,
              newStock,
              referenceId: billNumber,
              referenceType: "PURCHASE_ORDER",
              notes: `Stock In from Supplier: ${supplier.name} (Bill ${billNumber})`,
              performedById: userId,
            },
          });
        }
      }

      // 3. Update Supplier Ledger
      // Credit: Total bill amount (increases liability)
      const prevBal = supplier.currentBalance;
      const afterBillBal = prevBal + input.totalAmount;

      await tx.supplierLedgerEntry.create({
        data: {
          supplierId: input.supplierId,
          referenceType: "PURCHASE_BILL",
          referenceId: billNumber,
          debit: 0.0,
          credit: input.totalAmount,
          runningBalance: afterBillBal,
          notes: input.notes || `Purchased goods via Bill #${billNumber}`,
        },
      });

      // If partial or full payment was made now, record payment debit
      let finalBalance = afterBillBal;
      if (input.paidAmount > 0) {
        finalBalance = afterBillBal - input.paidAmount;
        await tx.supplierLedgerEntry.create({
          data: {
            supplierId: input.supplierId,
            referenceType: "PAYMENT_MADE",
            referenceId: `PAY-${billNumber}`,
            debit: input.paidAmount,
            credit: 0.0,
            runningBalance: finalBalance,
            notes: `Payment paid at purchase via ${input.paymentMethod}`,
          },
        });
      }

      // Update currentBalance on supplier and if there is a remaining balance and bill dueDate, update supplier.paymentDueDate
      const supplierUpdateData: any = { currentBalance: finalBalance };
      if (finalBalance > 0 && billDueDate) {
        supplierUpdateData.paymentDueDate = billDueDate;
      } else if (finalBalance <= 0) {
        supplierUpdateData.paymentDueDate = null;
      }

      await tx.supplier.update({
        where: { id: input.supplierId },
        data: supplierUpdateData,
      });

      return { purchaseOrder: po, updatedBalance: finalBalance };
    });
  }

  /**
   * Record a vendor payment (e.g. paying remaining bill balance)
   */
  static async recordPayment(
    supplierId: string,
    amount: number,
    paymentMethod = "CASH",
    notes = "Payment to vendor",
    nextDueDate?: string | Date | null
  ) {
    return db.$transaction(async (tx) => {
      const supplier = await tx.supplier.findUnique({
        where: { id: supplierId },
      });

      if (!supplier) throw new Error("Supplier not found");

      const newBalance = supplier.currentBalance - amount;
      const receiptNo = `VOUCH-${Date.now().toString().slice(-6)}`;

      await tx.supplierLedgerEntry.create({
        data: {
          supplierId,
          referenceType: "PAYMENT_MADE",
          referenceId: receiptNo,
          debit: amount,
          credit: 0.0,
          runningBalance: newBalance,
          notes: `${notes} (${paymentMethod})`,
        },
      });

      // Allocate payment against pending purchase orders to keep Purchase Order balanceAmount 100% synced with ledger
      let remainingToApply = amount;
      const pendingPOs = await tx.purchaseOrder.findMany({
        where: {
          supplierId,
          balanceAmount: { gt: 0 },
        },
        orderBy: { orderDate: "asc" },
      });

      for (const po of pendingPOs) {
        if (remainingToApply <= 0) break;
        const settle = Math.min(po.balanceAmount, remainingToApply);
        const newPaid = po.paidAmount + settle;
        const newBal = po.balanceAmount - settle;

        await tx.purchaseOrder.update({
          where: { id: po.id },
          data: {
            paidAmount: newPaid,
            balanceAmount: newBal,
            dueDate: newBal <= 0 ? null : po.dueDate,
          },
        });

        remainingToApply -= settle;
      }

      const supplierUpdateData: any = { currentBalance: newBalance };
      if (newBalance <= 0) {
        supplierUpdateData.paymentDueDate = null;
      } else if (nextDueDate !== undefined) {
        supplierUpdateData.paymentDueDate = nextDueDate ? new Date(nextDueDate) : null;
      }

      const updatedSupplier = await tx.supplier.update({
        where: { id: supplierId },
        data: supplierUpdateData,
      });

      return { supplier: updatedSupplier, newBalance };
    });
  }
}
