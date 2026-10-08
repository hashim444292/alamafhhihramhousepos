import db from "@/lib/db";

export interface CustomerInput {
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  balance?: number;
  creditLimit?: number;
  paymentDueDate?: string | Date | null;
  paymentTermsDays?: number;
}

export class CustomerService {
  static async getAll(search?: string) {
    const where: any = { isActive: true };
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { phone: { contains: search } },
        { address: { contains: search } },
      ];
    }

    return db.customer.findMany({
      where,
      orderBy: { name: "asc" },
      include: {
        _count: { select: { sales: true, ledgerEntries: true } },
      },
    });
  }

  static async getById(id: string) {
    return db.customer.findUnique({
      where: { id },
      include: {
        sales: {
          orderBy: { createdAt: "desc" },
          include: {
            items: true,
            cashier: { select: { fullName: true } },
          },
        },
        ledgerEntries: {
          orderBy: { createdAt: "desc" },
        },
      },
    });
  }

  static async create(data: CustomerInput) {
    return db.customer.create({
      data: {
        name: data.name,
        phone: data.phone || null,
        email: data.email || null,
        address: data.address || null,
        balance: data.balance || 0.0,
        creditLimit: data.creditLimit || 0.0,
        paymentDueDate: data.paymentDueDate ? new Date(data.paymentDueDate) : null,
        paymentTermsDays: data.paymentTermsDays || 0,
      },
    });
  }

  static async update(id: string, data: Partial<CustomerInput>) {
    const updateData: any = { ...data };
    if (data.paymentDueDate !== undefined) {
      updateData.paymentDueDate = data.paymentDueDate ? new Date(data.paymentDueDate) : null;
    }
    return db.customer.update({
      where: { id },
      data: updateData,
    });
  }

  static async delete(id: string) {
    return db.customer.update({
      where: { id },
      data: { isActive: false },
    });
  }

  /**
   * Record payment received from customer (Udhaar recovery)
   */
  static async recordPaymentReceived(
    customerId: string,
    amount: number,
    paymentMethod = "CASH",
    notes = "Payment received towards khata balance",
    nextDueDate?: string | Date | null
  ) {
    return db.$transaction(async (tx) => {
      const customer = await tx.customer.findUnique({
        where: { id: customerId },
      });

      if (!customer) throw new Error("Customer not found");

      const newBalance = customer.balance - amount;
      const voucherNo = `RCV-${Date.now().toString().slice(-6)}`;

      await tx.customerLedgerEntry.create({
        data: {
          customerId,
          referenceType: "PAYMENT_RECEIVED",
          referenceId: voucherNo,
          debit: 0.0,
          credit: amount, // Credit decreases customer debt
          runningBalance: newBalance,
          notes: `${notes} (${paymentMethod})`,
        },
      });

      const customerUpdateData: any = { balance: newBalance };
      if (newBalance <= 0) {
        customerUpdateData.paymentDueDate = null;
      } else if (nextDueDate !== undefined) {
        customerUpdateData.paymentDueDate = nextDueDate ? new Date(nextDueDate) : null;
      }

      const updatedCustomer = await tx.customer.update({
        where: { id: customerId },
        data: customerUpdateData,
      });

      // Synchronize with customer's open sales invoices (FIFO allocation)
      let remainingPayment = amount;
      const openInvoices = await tx.salesTransaction.findMany({
        where: {
          customerId,
          balanceDue: { gt: 0 },
        },
        orderBy: { createdAt: "asc" },
      });

      for (const invoice of openInvoices) {
        if (remainingPayment <= 0) break;
        const settle = Math.min(invoice.balanceDue, remainingPayment);
        const newInvoiceBalance = Math.round((invoice.balanceDue - settle) * 100) / 100;
        remainingPayment -= settle;

        await tx.salesTransaction.update({
          where: { id: invoice.id },
          data: {
            balanceDue: newInvoiceBalance,
            dueDate: newInvoiceBalance <= 0 ? null : invoice.dueDate,
          },
        });
      }

      return { customer: updatedCustomer, newBalance };
    });
  }
}
