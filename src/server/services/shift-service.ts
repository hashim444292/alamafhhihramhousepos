import db from "@/lib/db";
import { OpenShiftInput, CloseShiftInput } from "@/lib/validations/shift";

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
          cashier: { select: { id: true, fullName: true, username: true } },
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

    for (const s of shifts) {
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
      shifts,
      cashiers,
      summary: {
        totalShifts: shifts.length,
        openShiftsCount,
        closedShiftsCount,
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

  static async openShift(input: OpenShiftInput, cashierId: string) {
    const existing = await this.getCurrentShift(cashierId);
    if (existing) {
      return existing;
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

  static async closeShift(input: CloseShiftInput, cashierId: string) {
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

    // Expected cash in drawer = Opening cash + Cash collected from cash sales
    const systemExpectedCash = shift.openingCash + cashSales;
    const cashDifference = input.closingCash - systemExpectedCash;

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
        notes: input.notes || shift.notes,
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
      },
    };
  }
}
