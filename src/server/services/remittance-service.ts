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
  static async getManagerCashBalance() {
    await ensureRemittancesTable();

    const [closedShifts, cashExpenses, remittances] = await Promise.all([
      db.shift.findMany({
        where: { status: "CLOSED" },
        select: { closingCash: true, notes: true, cashier: { select: { role: true } } },
      }),
      db.expense.findMany({
        where: { paymentMethod: "CASH" },
        select: { amount: true },
      }),
      (db as any).managerRemittance.findMany({
        orderBy: { remittedAt: "desc" },
      }),
    ]);

    // 1. Total cash collected from cashiers
    let totalCashCollected = 0;
    for (const s of closedShifts) {
      const handover = parseShiftHandover(s.notes);
      // If handover was accepted by manager, count receivedAmount or handoverAmount
      if (handover && handover.handoverStatus === "ACCEPTED") {
        const amt = typeof (handover as any).receivedAmount === "number"
          ? (handover as any).receivedAmount
          : handover.handoverAmount;
        totalCashCollected += amt;
      } else if (!handover && s.closingCash) {
        totalCashCollected += s.closingCash;
      }
    }

    // 2. Total cash expenses paid by shop manager
    let totalCashExpenses = 0;
    for (const exp of cashExpenses) {
      totalCashExpenses += exp.amount;
    }

    // 3. Total cash remitted to Owner
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

    totalCashCollected = Math.round(totalCashCollected * 100) / 100;
    totalCashExpenses = Math.round(totalCashExpenses * 100) / 100;
    totalCashRemitted = Math.round(totalCashRemitted * 100) / 100;
    pendingRemittancesAmount = Math.round(pendingRemittancesAmount * 100) / 100;

    // Remaining cash in shop manager's custody
    const currentCashInHand = Math.round((totalCashCollected - totalCashExpenses - totalCashRemitted) * 100) / 100;

    return {
      totalCashCollected,
      totalCashExpenses,
      totalCashRemitted,
      currentCashInHand,
      pendingRemittancesCount,
      pendingRemittancesAmount,
      totalRemittancesCount: remittances.length,
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
        status: isDirectConfirm ? "CONFIRMED" : "CONFIRMED", // Default CONFIRMED so balance reflects immediately, or PENDING if verification is requested
        managerId: manager.id,
        managerName: manager.fullName,
        ownerId: input.ownerId || null,
        ownerName: input.ownerName || "Owner / Admin",
        remittedAt: input.remittedAt ? new Date(input.remittedAt) : new Date(),
        confirmedAt: new Date(),
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
