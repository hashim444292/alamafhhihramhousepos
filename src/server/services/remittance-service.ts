import db from "@/lib/db";
import { parseShiftHandover } from "@/types/shift-handover";

export interface CreateRemittanceInput {
  amount: number;
  paymentMethod?: string;
  ownerId?: string;
  ownerName?: string;
  notes?: string;
  remittedAt?: string;
}

let tableChecked = false;

export async function ensureRemittancesTable() {
  if (tableChecked) return;
  try {
    await db.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS manager_remittances (
        id TEXT PRIMARY KEY,
        "remittanceNumber" TEXT UNIQUE NOT NULL,
        amount DOUBLE PRECISION NOT NULL,
        "paymentMethod" TEXT NOT NULL DEFAULT 'CASH',
        status TEXT NOT NULL DEFAULT 'CONFIRMED',
        "managerId" TEXT NOT NULL,
        "managerName" TEXT NOT NULL,
        "ownerId" TEXT,
        "ownerName" TEXT,
        "remittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "confirmedAt" TIMESTAMP(3),
        notes TEXT,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_mgr_remit_status ON manager_remittances(status);
      CREATE INDEX IF NOT EXISTS idx_mgr_remit_date ON manager_remittances("remittedAt");
    `);
    tableChecked = true;
  } catch (err: any) {
    try {
      // Fallback for SQLite syntax
      await db.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS manager_remittances (
          id TEXT PRIMARY KEY,
          remittanceNumber TEXT UNIQUE NOT NULL,
          amount REAL NOT NULL,
          paymentMethod TEXT NOT NULL DEFAULT 'CASH',
          status TEXT NOT NULL DEFAULT 'CONFIRMED',
          managerId TEXT NOT NULL,
          managerName TEXT NOT NULL,
          ownerId TEXT,
          ownerName TEXT,
          remittedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
          confirmedAt DATETIME,
          notes TEXT,
          createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
          updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
        );
      `);
      tableChecked = true;
    } catch {
      // already exists or handled by Prisma
    }
  }
}

export class RemittanceService {
  /**
   * Calculates the Manager's actual physical Cash in Hand:
   * = Cash received from cashier shifts
   * - Cash paid out for shop petty expenses
   * - Cash already remitted/transferred to owner
   */
  /**
   * Calculates the Store Manager's actual physical Cash in Hand:
   * = Cash received from Cashier shift handovers (Accepted)
   * + Cash from Manager/Admin's own sales & drawer (Closed shifts + Open shift sales/float)
   * + Customer Khata Receivables (Udhaar recovery) collected in Cash
   * - Shop cash expenses paid by Manager/Admin from store cash
   * - Cash remitted to Owner (Confirmed + Pending transfers)
   */
  static async getManagerCashBalance() {
    await ensureRemittancesTable();

    const [
      closedShifts,
      openManagerShifts,
      unshiftedManagerSales,
      cashExpenses,
      remittances,
      customerPayments,
    ] = await Promise.all([
      db.shift.findMany({
        where: { status: "CLOSED" },
        select: {
          id: true,
          shiftNumber: true,
          openingCash: true,
          closingCash: true,
          notes: true,
          cashier: { select: { id: true, fullName: true, username: true, role: true } },
        },
      }),
      db.shift.findMany({
        where: {
          status: "OPEN",
          cashier: { role: { in: ["MANAGER", "ADMIN"] } },
        },
        select: {
          id: true,
          shiftNumber: true,
          openingCash: true,
          cashier: { select: { id: true, fullName: true, username: true, role: true } },
          sales: {
            where: { status: "COMPLETED" },
            select: { paymentMethod: true, totalAmount: true, balanceDue: true },
          },
        },
      }),
      db.salesTransaction.findMany({
        where: {
          shiftId: null,
          status: "COMPLETED",
          paymentMethod: "CASH",
          cashier: { role: { in: ["MANAGER", "ADMIN"] } },
        },
        select: { totalAmount: true, balanceDue: true },
      }),
      db.expense.findMany({
        where: { paymentMethod: "CASH" },
        select: {
          id: true,
          amount: true,
          recordedById: true,
          recordedBy: { select: { id: true, fullName: true, username: true, role: true } },
        },
      }),
      (db as any).managerRemittance.findMany({
        orderBy: { remittedAt: "desc" },
      }),
      db.customerLedgerEntry.findMany({
        where: {
          referenceType: "PAYMENT_RECEIVED",
          credit: { gt: 0 },
        },
        select: {
          id: true,
          credit: true,
          notes: true,
          createdAt: true,
        },
      }),
    ]);

    // 1. Total Cash Collected from Cashiers (Accepted Handovers)
    let totalCashierHandovers = 0;
    let totalManagerClosedShiftCash = 0;

    for (const s of closedShifts) {
      const isPrivileged = s.cashier?.role === "MANAGER" || s.cashier?.role === "ADMIN";
      const handover = parseShiftHandover(s.notes);

      if (isPrivileged) {
        // Manager's own closed shift
        const amt = handover && typeof handover.receivedAmount === "number"
          ? handover.receivedAmount
          : (handover?.handoverAmount ?? s.closingCash ?? 0);
        totalManagerClosedShiftCash += amt;
      } else {
        // Cashier shift handover accepted by manager
        if (handover && handover.handoverStatus === "ACCEPTED") {
          const amt = typeof (handover as any).receivedAmount === "number"
            ? (handover as any).receivedAmount
            : handover.handoverAmount;
          totalCashierHandovers += amt;
        } else if (!handover && s.closingCash) {
          totalCashierHandovers += s.closingCash;
        }
      }
    }

    // 2. Manager's Direct Sales & Active/Open Shifts
    let totalManagerOpenShiftCash = 0;
    for (const s of openManagerShifts) {
      const opening = s.openingCash || 0;
      const cashSales = s.sales
        .filter((sl) => sl.paymentMethod === "CASH")
        .reduce((sum, sl) => sum + Math.max(0, sl.totalAmount - (sl.balanceDue || 0)), 0);
      totalManagerOpenShiftCash += (opening + cashSales);
    }

    const totalUnshiftedManagerSales = unshiftedManagerSales.reduce(
      (sum, s) => sum + Math.max(0, s.totalAmount - (s.balanceDue || 0)),
      0
    );

    let totalManagerDirectSales = totalManagerClosedShiftCash + totalManagerOpenShiftCash + totalUnshiftedManagerSales;

    // 3. Customer Khata Receivables (Udhaar recovery) collected in Cash
    let totalCustomerReceivables = 0;
    for (const p of customerPayments) {
      const notesUpper = (p.notes || "").toUpperCase();
      const isNonCash =
        notesUpper.includes("CARD") ||
        notesUpper.includes("ONLINE") ||
        notesUpper.includes("BANK") ||
        notesUpper.includes("CHEQUE");
      if (!isNonCash) {
        totalCustomerReceivables += p.credit;
      }
    }

    // 4. Shop Cash Expenses
    let totalCashExpenses = 0;
    let managerCashExpenses = 0;
    for (const exp of cashExpenses) {
      totalCashExpenses += exp.amount;
      // Expenses paid out of store cash in manager custody (Manager/Admin or general store expenses)
      if (exp.recordedBy?.role === "MANAGER" || exp.recordedBy?.role === "ADMIN" || !exp.recordedBy?.role) {
        managerCashExpenses += exp.amount;
      }
    }

    // 5. Remittances to Owner
    let totalCashRemitted = 0;
    let pendingRemittancesCount = 0;
    let pendingRemittancesAmount = 0;

    for (const r of remittances) {
      if (r.status === "CONFIRMED") {
        totalCashRemitted += r.amount;
      } else if (r.status === "PENDING") {
        pendingRemittancesCount++;
        pendingRemittancesAmount += r.amount;
      }
    }

    // Financial rounding
    totalCashierHandovers = Math.round(totalCashierHandovers * 100) / 100;
    totalManagerDirectSales = Math.round(totalManagerDirectSales * 100) / 100;
    totalCustomerReceivables = Math.round(totalCustomerReceivables * 100) / 100;
    totalCashExpenses = Math.round(totalCashExpenses * 100) / 100;
    managerCashExpenses = Math.round(managerCashExpenses * 100) / 100;
    totalCashRemitted = Math.round(totalCashRemitted * 100) / 100;
    pendingRemittancesAmount = Math.round(pendingRemittancesAmount * 100) / 100;

    // Total Cash Inflow into Manager's hands
    const totalCashCollected = Math.round(
      (totalCashierHandovers + totalManagerDirectSales + totalCustomerReceivables) * 100
    ) / 100;

    // Current Cash in Hand = Inflows - Manager Cash Expenses - Remittances (Confirmed + Pending)
    const currentCashInHand = Math.max(
      0,
      Math.round(
        (totalCashCollected - managerCashExpenses - totalCashRemitted - pendingRemittancesAmount) * 100
      ) / 100
    );

    return {
      totalCashCollected,
      totalCashExpenses,
      managerCashExpenses,
      totalCashRemitted,
      currentCashInHand,
      pendingRemittancesCount,
      pendingRemittancesAmount,
      totalRemittancesCount: remittances.length,
      breakdown: {
        cashierHandoversReceived: totalCashierHandovers,
        managerDirectSales: totalManagerDirectSales,
        customerReceivablesCollected: totalCustomerReceivables,
        shopCashExpenses: totalCashExpenses,
        managerExpensesDeducted: managerCashExpenses,
        remittedToOwner: totalCashRemitted,
        pendingOwnerConfirm: pendingRemittancesAmount,
      },
    };
  }

  static async getAllRemittances(params?: {
    limit?: number;
    status?: string;
  }) {
    await ensureRemittancesTable();
    const limit = params?.limit || 100;
    const where: any = {};

    if (params?.status && params.status !== "ALL") {
      where.status = params.status;
    }

    const [remittances, balance, admins] = await Promise.all([
      (db as any).managerRemittance.findMany({
        where,
        take: limit,
        orderBy: { remittedAt: "desc" },
      }),
      this.getManagerCashBalance(),
      db.user.findMany({
        where: { role: "ADMIN" },
        select: { id: true, fullName: true, username: true, role: true },
      }),
    ]);

    return {
      remittances,
      balance,
      admins,
    };
  }

  static async createRemittance(
    input: CreateRemittanceInput,
    manager: { id: string; fullName: string; role: string }
  ) {
    await ensureRemittancesTable();

    if (!input.amount || input.amount <= 0) {
      throw new Error("ادائیگی کی رقم 0 سے زیادہ ہونا لازمی ہے۔ (Remittance amount must be greater than 0)");
    }

    // Generate unique sequential remittance voucher number
    const count = await (db as any).managerRemittance.count();
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const remittanceNumber = `REM-${dateStr}-${String(count + 1).padStart(4, "0")}`;

    // If remitted directly to an admin or created by admin, auto-confirm
    const isDirectConfirm = manager.role === "ADMIN";

    const remittance = await (db as any).managerRemittance.create({
      data: {
        remittanceNumber,
        amount: Math.round(input.amount * 100) / 100,
        paymentMethod: input.paymentMethod || "CASH",
        status: isDirectConfirm ? "CONFIRMED" : "PENDING",
        managerId: manager.id,
        managerName: manager.fullName,
        ownerId: input.ownerId || null,
        ownerName: input.ownerName || "Owner / Admin",
        remittedAt: input.remittedAt ? new Date(input.remittedAt) : new Date(),
        confirmedAt: isDirectConfirm ? new Date() : null,
        notes: input.notes?.trim() || "مینیجر نے دکان کی نقدی مالک کو جمع کروا دی۔",
      },
    });

    const balance = await this.getManagerCashBalance();

    return {
      remittance,
      balance,
    };
  }

  static async confirmRemittance(
    remittanceId: string,
    owner: { id: string; fullName: string }
  ) {
    await ensureRemittancesTable();

    const existing = await (db as any).managerRemittance.findUnique({
      where: { id: remittanceId },
    });

    if (!existing) {
      throw new Error("Remittance record not found");
    }

    const updated = await (db as any).managerRemittance.update({
      where: { id: remittanceId },
      data: {
        status: "CONFIRMED",
        ownerId: owner.id,
        ownerName: owner.fullName,
        confirmedAt: new Date(),
      },
    });

    const balance = await this.getManagerCashBalance();

    return {
      remittance: updated,
      balance,
    };
  }
}
