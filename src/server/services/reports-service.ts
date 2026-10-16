import db from "@/lib/db";
import { parseShiftHandover } from "@/types/shift-handover";
import { parseStockLossNotes } from "@/types/stock-loss";

export class ReportsService {
  static async getDashboardMetrics() {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);

    // 1. Fetch Today's Sales Transactions
    const todaySales = await db.salesTransaction.findMany({
      where: {
        createdAt: { gte: startOfToday, lte: endOfToday },
        status: "COMPLETED",
      },
      include: { items: true },
    });

    const todayTotalRevenue = todaySales.reduce((acc, sale) => acc + sale.totalAmount, 0);
    const todayTransactionCount = todaySales.length;

    // Calculate Today's COGS (Cost of Goods Sold)
    let todayCOGS = 0;
    todaySales.forEach((sale) => {
      sale.items.forEach((item) => {
        todayCOGS += item.costPrice * item.quantity;
      });
    });

    const todayGrossProfit = todayTotalRevenue - todayCOGS;

    // 2. Fetch Today's Expenses
    const todayExpenses = await db.expense.findMany({
      where: {
        date: { gte: startOfToday, lte: endOfToday },
      },
    });

    const todayTotalExpenses = todayExpenses.reduce((acc, exp) => acc + exp.amount, 0);
    const todayNetProfit = todayGrossProfit - todayTotalExpenses;

    // 3. Overall Lifetime / Month Metrics
    const allCompletedSales = await db.salesTransaction.findMany({
      where: { status: "COMPLETED" },
      include: { items: true },
    });

    const totalRevenue = allCompletedSales.reduce((acc, s) => acc + s.totalAmount, 0);
    let totalCOGS = 0;
    allCompletedSales.forEach((s) => {
      s.items.forEach((item) => {
        totalCOGS += item.costPrice * item.quantity;
      });
    });

    const allExpenses = await db.expense.aggregate({
      _sum: { amount: true },
    });
    const totalExpenses = allExpenses._sum.amount || 0;
    const totalNetProfit = totalRevenue - totalCOGS - totalExpenses;

    // 4. Payment method distribution for today
    const paymentBreakdown = {
      CASH: Math.round(todaySales.filter((s) => s.paymentMethod === "CASH").reduce((a, s) => a + s.totalAmount, 0) * 100) / 100,
      CARD: Math.round(todaySales.filter((s) => s.paymentMethod === "CARD").reduce((a, s) => a + s.totalAmount, 0) * 100) / 100,
      MOBILE_WALLET: Math.round(todaySales.filter((s) => s.paymentMethod === "MOBILE_WALLET").reduce((a, s) => a + s.totalAmount, 0) * 100) / 100,
      CREDIT: Math.round(todaySales.filter((s) => s.paymentMethod === "CREDIT").reduce((a, s) => a + s.totalAmount, 0) * 100) / 100,
      BANK_TRANSFER: Math.round(todaySales.filter((s) => s.paymentMethod === "BANK_TRANSFER").reduce((a, s) => a + s.totalAmount, 0) * 100) / 100,
    };

    // 5. Low stock alerts count
    const allProducts = await db.product.findMany({
      where: { isActive: true },
      select: { stockQuantity: true, minStockThreshold: true },
    });
    const lowStockCount = allProducts.filter((p) => p.stockQuantity <= p.minStockThreshold).length;

    // 6. Recent sales transactions
    // 6. Recent sales transactions
    const recentSales = await db.salesTransaction.findMany({
      take: 8,
      orderBy: { createdAt: "desc" },
      include: {
        cashier: { select: { fullName: true } },
        items: true,
      },
    });

    // 7. Cash Drawer Shortages & Settlements Audit
    const shortageShifts = await db.shift.findMany({
      where: {
        cashDifference: { lt: 0 },
      },
      take: 25,
      orderBy: { closedAt: "desc" },
      include: {
        cashier: { select: { id: true, fullName: true, username: true } },
      },
    });

    const mappedShortages = shortageShifts.map((sh) => {
      const handover = parseShiftHandover(sh.notes);
      const isSettled = handover?.shortageSettlementStatus === "SETTLED";
      const shortageAmount = Math.abs(sh.cashDifference || 0);

      return {
        id: sh.id,
        shiftNumber: sh.shiftNumber,
        cashierId: sh.cashierId,
        cashierName: sh.cashier?.fullName || sh.cashier?.username || "Cashier",
        shortageAmount,
        systemExpectedCash: sh.systemExpectedCash,
        closingCash: sh.closingCash,
        closedAt: sh.closedAt,
        isSettled,
        settlementStatus: isSettled ? ("SETTLED" as const) : ("UNSETTLED" as const),
        settlementType: handover?.shortageSettlementType,
        settledBy: handover?.shortageSettledBy,
        settledAt: handover?.shortageSettledAt,
        settlementNotes: handover?.shortageSettlementNotes,
        cashierNotes: handover?.cashierNotes,
      };
    });

    const unsettledShortages = mappedShortages.filter((s) => !s.isSettled);
    const totalUnsettledShortage = Math.round(unsettledShortages.reduce((acc, s) => acc + s.shortageAmount, 0) * 100) / 100;

    // 8. Damaged & Stolen Inventory Losses & Settlements Audit
    const lossMovements = await db.stockMovement.findMany({
      where: {
        movementType: { in: ["STOCK_OUT_DAMAGE", "STOCK_OUT_STOLEN"] },
      },
      take: 30,
      orderBy: { createdAt: "desc" },
      include: {
        product: true,
        performedBy: { select: { id: true, fullName: true, username: true } },
      },
    });

    const mappedLosses = lossMovements.map((m) => {
      const lossData = parseStockLossNotes(m.notes);
      const isSettled = lossData.settlementStatus === "SETTLED";
      const quantityLost = Math.abs(m.quantity);
      const unitCost = m.product.purchasePrice || m.product.sellingPrice || 0;
      const totalLossValue = Math.round(quantityLost * unitCost * 100) / 100;

      return {
        id: m.id,
        movementType: m.movementType,
        productId: m.productId,
        productName: m.product.name,
        productSku: m.product.sku,
        quantity: quantityLost,
        unitCost,
        totalLossValue,
        performedBy: m.performedBy?.fullName || m.performedBy?.username || "Staff",
        reportedAt: m.createdAt,
        reason: lossData.reason,
        isSettled,
        settlementStatus: isSettled ? ("SETTLED" as const) : ("UNSETTLED" as const),
        settlementType: lossData.settlementType,
        settledBy: lossData.settledBy,
        settledAt: lossData.settledAt,
        settlementNotes: lossData.settlementNotes,
      };
    });

    const unsettledLosses = mappedLosses.filter((l) => !l.isSettled);
    const totalUnsettledLossValue = Math.round(unsettledLosses.reduce((acc, l) => acc + l.totalLossValue, 0) * 100) / 100;

    return {
      today: {
        revenue: Math.round(todayTotalRevenue * 100) / 100,
        transactionCount: todayTransactionCount,
        cogs: Math.round(todayCOGS * 100) / 100,
        grossProfit: Math.round(todayGrossProfit * 100) / 100,
        expenses: Math.round(todayTotalExpenses * 100) / 100,
        netProfit: Math.round(todayNetProfit * 100) / 100,
        paymentBreakdown,
      },
      lifetime: {
        totalRevenue: Math.round(totalRevenue * 100) / 100,
        totalCOGS: Math.round(totalCOGS * 100) / 100,
        totalExpenses: Math.round(totalExpenses * 100) / 100,
        totalNetProfit: Math.round(totalNetProfit * 100) / 100,
      },
      lowStockCount,
      recentSales,
      shortageMetrics: {
        totalUnsettledAmount: totalUnsettledShortage,
        unsettledCount: unsettledShortages.length,
        shortages: mappedShortages,
      },
      inventoryLossMetrics: {
        totalUnsettledValue: totalUnsettledLossValue,
        unsettledCount: unsettledLosses.length,
        losses: mappedLosses,
      },
    };
  }
}
