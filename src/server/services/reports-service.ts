import db from "@/lib/db";

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
      CASH: todaySales.filter((s) => s.paymentMethod === "CASH").reduce((a, s) => a + s.totalAmount, 0),
      CARD: todaySales.filter((s) => s.paymentMethod === "CARD").reduce((a, s) => a + s.totalAmount, 0),
      MOBILE_WALLET: todaySales.filter((s) => s.paymentMethod === "MOBILE_WALLET").reduce((a, s) => a + s.totalAmount, 0),
    };

    // 5. Low stock alerts count
    const allProducts = await db.product.findMany({
      where: { isActive: true },
      select: { stockQuantity: true, minStockThreshold: true },
    });
    const lowStockCount = allProducts.filter((p) => p.stockQuantity <= p.minStockThreshold).length;

    // 6. Recent sales transactions
    const recentSales = await db.salesTransaction.findMany({
      take: 8,
      orderBy: { createdAt: "desc" },
      include: {
        cashier: { select: { fullName: true } },
        items: true,
      },
    });

    return {
      today: {
        revenue: todayTotalRevenue,
        transactionCount: todayTransactionCount,
        cogs: todayCOGS,
        grossProfit: todayGrossProfit,
        expenses: todayTotalExpenses,
        netProfit: todayNetProfit,
        paymentBreakdown,
      },
      lifetime: {
        totalRevenue,
        totalCOGS,
        totalExpenses,
        totalNetProfit,
      },
      lowStockCount,
      recentSales,
    };
  }
}
