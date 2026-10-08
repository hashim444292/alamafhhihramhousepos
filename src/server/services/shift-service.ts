import db from "@/lib/db";
import { OpenShiftInput, CloseShiftInput } from "@/lib/validations/shift";

export class ShiftService {
  static async getAllShifts(limit: number = 50) {
    return db.shift.findMany({
      take: limit,
      orderBy: { openedAt: "desc" },
      include: {
        cashier: { select: { fullName: true, username: true } },
        _count: { select: { sales: true } },
      },
    });
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
