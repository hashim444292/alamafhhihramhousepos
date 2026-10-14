import db from "@/lib/db";
import { OpenShiftInput, CloseShiftInput } from "@/lib/validations/shift";
import {
  ShiftHandoverData,
  parseShiftHandover,
  formatShiftHandoverNotes,
} from "@/types/shift-handover";

export class ShiftService {
  static async getAllShifts(params?: {
    limit?: number;
    startDate?: string;
    endDate?: string;
    cashierId?: string;
  }) {
    const limit = params?.limit || 150;
    const where: any = {};

    if (params?.cashierId && params.cashierId !== "ALL") {
      where.cashierId = params.cashierId;
    }

    if (params?.startDate || params?.endDate) {
      where.openedAt = {};
      if (params?.startDate) {
        where.openedAt.gte = new Date(`${params.startDate}T00:00:00.000Z`);
      }
      if (params?.endDate) {
        where.openedAt.lte = new Date(`${params.endDate}T23:59:59.999Z`);
      }
    }

    const [shifts, cashiers] = await Promise.all([
      db.shift.findMany({
        where,
        take: limit,
        orderBy: { openedAt: "desc" },
        include: {
          cashier: { select: { id: true, fullName: true, username: true, role: true } },
          _count: { select: { sales: true } },
        },
      }),
      db.user.findMany({
        select: { id: true, fullName: true, username: true, role: true },
        orderBy: { fullName: "asc" },
      }),
    ]);

    let totalOpeningCash = 0;
    let totalSales = 0;
    let totalExpectedCash = 0;
    let totalClosingCash = 0;
    let totalDifference = 0;
    let closedShiftsCount = 0;
    let openShiftsCount = 0;
    let shortageCount = 0;
    let totalShortageAmount = 0;
    let pendingHandoversCount = 0;

    const mappedShifts = shifts.map((s) => {
      const handover = parseShiftHandover(s.notes);
      if (handover?.handoverStatus === "PENDING" && (s.cashier?.role === "CASHIER" || !s.cashier?.role)) {
        pendingHandoversCount++;
      }
      return {
        ...s,
        handover,
      };
    });

    for (const s of mappedShifts) {
      totalOpeningCash += s.openingCash;
      totalSales += s.totalSalesAmount;
      totalExpectedCash += (s.systemExpectedCash || s.openingCash);

      if (s.status === "CLOSED" && s.closingCash !== null && s.closingCash !== undefined) {
        closedShiftsCount++;
        totalClosingCash += s.closingCash;
        if (s.cashDifference !== null && s.cashDifference !== undefined) {
          totalDifference += s.cashDifference;
          if (s.cashDifference < 0) {
            shortageCount++;
            totalShortageAmount += Math.abs(s.cashDifference);
          }
        }
      } else {
        openShiftsCount++;
      }
    }

    return {
      shifts: mappedShifts,
      cashiers,
      summary: {
        totalShifts: mappedShifts.length,
        openShiftsCount,
        closedShiftsCount,
        pendingHandoversCount,
        totalOpeningCash,
        totalSales,
        totalExpectedCash,
        totalClosingCash,
        totalDifference,
        shortageCount,
        totalShortageAmount,
      },
    };
  }

  static async getCurrentShift(cashierId: string) {
    return db.shift.findFirst({
      where: {
        cashierId,
        status: "OPEN",
      },
      include: {
        cashier: { select: { fullName: true, username: true } },
      },
      orderBy: { openedAt: "desc" },
    });
  }

  static async getLastClosedShift() {
    return db.shift.findFirst({
      where: {
        status: "CLOSED",
      },
      include: {
        cashier: { select: { fullName: true, username: true } },
      },
      orderBy: { closedAt: "desc" },
    });
  }

  static async checkCashierHandoverClearance(cashierId: string) {
    const user = await db.user.findUnique({
      where: { id: cashierId },
      select: { id: true, role: true, fullName: true },
    });

    // Managers and Admins never need handover clearance or approval from anyone
    if (!user || user.role === "ADMIN" || user.role === "MANAGER") {
      return { isCleared: true, pendingShift: null };
    }

    const closedShifts = await db.shift.findMany({
      where: { cashierId, status: "CLOSED" },
      orderBy: { closedAt: "desc" },
      take: 10,
      include: { cashier: { select: { fullName: true, username: true, role: true } } },
    });

    for (const s of closedShifts) {
      const handover = parseShiftHandover(s.notes);
      if (handover && handover.handoverStatus === "PENDING") {
        return {
          isCleared: false,
          pendingShift: {
            id: s.id,
            shiftNumber: s.shiftNumber || 1,
            closedAt: s.closedAt,
            closingCash: s.closingCash,
            handoverAmount: handover.handoverAmount,
            handoverStatus: handover.handoverStatus,
            cashierName: s.cashier?.fullName || s.cashier?.username,
          },
        };
      }
    }

    return { isCleared: true, pendingShift: null };
  }

  static async acceptShiftHandover(
    shiftId: string,
    manager: { id: string; fullName: string },
    action: "ACCEPT" | "REJECT" = "ACCEPT",
    managerNotes?: string
  ) {
    const shift = await db.shift.findUnique({
      where: { id: shiftId },
      include: { cashier: { select: { fullName: true, username: true } } },
    });

    if (!shift) {
      throw new Error("Shift not found");
    }

    const existingHandover = parseShiftHandover(shift.notes);
    const updatedHandover: ShiftHandoverData = {
      handoverAmount: existingHandover?.handoverAmount ?? (shift.closingCash || 0),
      handoverStatus: action === "ACCEPT" ? "ACCEPTED" : "REJECTED",
      handoverTo: manager.fullName,
      handoverManagerId: manager.id,
      handoverManagerName: manager.fullName,
      handoverAcceptedAt: new Date().toISOString(),
      handoverNotes:
        managerNotes ||
        (action === "ACCEPT"
          ? "کیش ہینڈ اوور وصول پایا اور تصدیق کی گئی۔ (Cash handover verified & accepted)"
          : "کیش ہینڈ اوور مسترد کیا گیا۔ (Handover rejected)"),
      cashierNotes: existingHandover?.cashierNotes || "",
    };

    const updated = await db.shift.update({
      where: { id: shiftId },
      data: {
        notes: formatShiftHandoverNotes(updatedHandover),
      },
      include: { cashier: { select: { fullName: true, username: true } } },
    });

    return {
      shift: {
        ...updated,
        handover: updatedHandover,
      },
    };
  }

  static async getPendingHandovers() {
    const closedShifts = await db.shift.findMany({
      where: {
        status: "CLOSED",
        cashier: {
          role: "CASHIER", // Only cashiers have handover approval requests
        },
      },
      orderBy: { closedAt: "desc" },
      take: 50,
      include: {
        cashier: { select: { id: true, fullName: true, username: true, role: true } },
      },
    });

    const pending = [];
    for (const s of closedShifts) {
      const handover = parseShiftHandover(s.notes);
      if (handover && handover.handoverStatus === "PENDING") {
        pending.push({
          ...s,
          handover,
        });
      }
    }
    return pending;
  }

  static async openShift(input: OpenShiftInput, cashierId: string) {
    const existing = await this.getCurrentShift(cashierId);
    if (existing) {
      return existing;
    }

    // 1. Strict Gatekeeper: verify that cashier has no unaccepted handovers from previous shifts
    const clearance = await this.checkCashierHandoverClearance(cashierId);
    if (!clearance.isCleared && clearance.pendingShift) {
      throw new Error(
        `آخری شفٹ #${clearance.pendingShift.shiftNumber} کا کیش ہینڈ اوور (Rs. ${clearance.pendingShift.handoverAmount}) مینیجر کی منظوری (Acceptance) کا منتظر ہے۔ اس وقت تک نیا رجسٹر اوپن نہیں ہو سکتا۔ برائے مہربانی پہلے مینیجر سے تصدیق کرائیں۔ (Manager acceptance required for previous shift cash handover before opening new shift.)`
      );
    }

    const lastShift = await db.shift.findFirst({
      orderBy: { openedAt: "desc" },
    });
    const nextShiftNumber = (lastShift?.shiftNumber || 0) + 1;

    return db.shift.create({
      data: {
        cashierId,
        shiftNumber: nextShiftNumber,
        openingCash: input.openingCash,
        status: "OPEN",
        notes: input.notes,
      },
      include: {
        cashier: { select: { fullName: true, username: true } },
      },
    });
  }

  static async closeShift(
    input: CloseShiftInput,
    cashierId: string,
    userRole?: string,
    userFullName?: string
  ) {
    const shift = await db.shift.findUnique({
      where: { id: input.shiftId },
      include: {
        sales: {
          where: { status: "COMPLETED" },
        },
      },
    });

    if (!shift) {
      throw new Error("Shift not found");
    }

    if (shift.status === "CLOSED") {
      throw new Error("Shift is already closed");
    }

    let role = userRole;
    let name = userFullName;
    if (!role) {
      const dbUser = await db.user.findUnique({
        where: { id: cashierId },
        select: { role: true, fullName: true },
      });
      role = dbUser?.role || "CASHIER";
      name = dbUser?.fullName || "Staff";
    }
    const isPrivileged = role === "ADMIN" || role === "MANAGER";

    // Calculate sales breakdown for this shift
    const cashSales = shift.sales
      .filter((s) => s.paymentMethod === "CASH")
      .reduce((sum, s) => sum + s.totalAmount, 0);

    const cardSales = shift.sales
      .filter((s) => s.paymentMethod === "CARD")
      .reduce((sum, s) => sum + s.totalAmount, 0);

    const mobileSales = shift.sales
      .filter((s) => s.paymentMethod === "MOBILE_WALLET")
      .reduce((sum, s) => sum + s.totalAmount, 0);

    const totalSales = shift.sales.reduce((sum, s) => sum + s.totalAmount, 0);

    // Calculate cash expenses recorded by this cashier during this shift
    const cashExpenses = await db.expense.aggregate({
      where: {
        recordedById: cashierId,
        paymentMethod: "CASH",
        date: {
          gte: shift.openedAt,
        },
      },
      _sum: { amount: true },
    });
    const totalCashExpenses = cashExpenses._sum.amount || 0;

    // Expected cash in drawer = Opening cash + Cash collected from cash sales - Cash paid for expenses
    const systemExpectedCash = shift.openingCash + cashSales - totalCashExpenses;
    const cashDifference = input.closingCash - systemExpectedCash;

    const handoverAmount =
      input.handoverCash !== undefined && input.handoverCash !== null
        ? input.handoverCash
        : input.closingCash;

    // Admin & Manager do not need manager approval; auto-accepted directly without pending approval requests
    const handoverPayload: ShiftHandoverData = isPrivileged
      ? {
          handoverAmount,
          handoverStatus: "ACCEPTED",
          handoverTo: `Self (${role})`,
          handoverManagerId: cashierId,
          handoverManagerName: name || role,
          handoverAcceptedAt: new Date().toISOString(),
          handoverNotes: `Direct shift close by ${role} (No manager approval needed)`,
          cashierNotes: input.notes || "",
        }
      : {
          handoverAmount,
          handoverStatus: "PENDING",
          handoverTo: input.handoverTo || "Manager",
          handoverManagerId: null,
          handoverManagerName: null,
          handoverAcceptedAt: null,
          handoverNotes: null,
          cashierNotes: input.notes || "",
        };

    const closedShift = await db.shift.update({
      where: { id: input.shiftId },
      data: {
        closedAt: new Date(),
        closingCash: input.closingCash,
        systemExpectedCash,
        cashDifference,
        totalSalesAmount: totalSales,
        totalTransactions: shift.sales.length,
        status: "CLOSED",
        notes: formatShiftHandoverNotes(handoverPayload),
      },
      include: {
        cashier: { select: { fullName: true, username: true } },
      },
    });

    return {
      zReport: {
        ...closedShift,
        cashSales,
        cardSales,
        mobileSales,
        cashExpenses: totalCashExpenses,
        handover: handoverPayload,
      },
    };
  }
}
