import { NextRequest, NextResponse } from "next/server";
import { getAuthUser, unauthorizedResponse, forbiddenResponse } from "@/lib/auth-middleware";
import db from "@/lib/db";
import { parseDateFilter } from "@/lib/date-utils";

export async function GET(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) return unauthorizedResponse();
  if (user.role === "CASHIER") {
    return forbiddenResponse("Accounting is restricted to Admin & Manager");
  }

  try {
    const { searchParams } = new URL(req.url);
    const startDateParam = searchParams.get("startDate");
    const endDateParam = searchParams.get("endDate");

    const { gte, lte } = parseDateFilter(startDateParam, endDateParam);
    const dateRangeFilter: any = {};
    if (gte) dateRangeFilter.gte = gte;
    if (lte) dateRangeFilter.lte = lte;

    const hasDateFilter = Object.keys(dateRangeFilter).length > 0;

    // 1. Sales in period
    const salesWhere: any = { status: "COMPLETED" };
    if (hasDateFilter) {
      salesWhere.createdAt = dateRangeFilter;
    }

    const sales = await db.salesTransaction.findMany({
      where: salesWhere,
      include: { items: true },
    });

    const totalSalesRevenue = sales.reduce((acc, s) => acc + s.totalAmount, 0);
    const totalCashCollected = sales
      .filter((s) => s.paymentMethod === "CASH")
      .reduce((acc, s) => acc + (s.totalAmount - (s.balanceDue || 0)), 0);
    const totalCardCollected = sales
      .filter((s) => s.paymentMethod === "CARD" || s.paymentMethod === "MOBILE_WALLET")
      .reduce((acc, s) => acc + (s.totalAmount - (s.balanceDue || 0)), 0);
    const totalCreditGivenOnSales = sales.reduce((acc, s) => acc + (s.balanceDue || 0), 0);

    let costOfGoodsSold = 0;
    sales.forEach((s) => {
      s.items.forEach((it) => {
        costOfGoodsSold += it.costPrice * it.quantity;
      });
    });

    const grossProfit = totalSalesRevenue - costOfGoodsSold;

    // 2. Purchases in period
    const purchaseWhere: any = {};
    if (hasDateFilter) {
      purchaseWhere.orderDate = dateRangeFilter;
    }

    const purchases = await db.purchaseOrder.findMany({
      where: purchaseWhere,
    });

    const totalPurchasesAmount = purchases.reduce((acc, p) => acc + p.totalAmount, 0);
    const totalPurchasesPaid = purchases.reduce((acc, p) => acc + p.paidAmount, 0);
    const totalPurchasesPayablePending = purchases.reduce((acc, p) => acc + p.balanceAmount, 0);

    // 3. Operational Expenses in period
    const expenseWhere: any = {};
    if (hasDateFilter) {
      expenseWhere.date = dateRangeFilter;
    }

    const expenses = await db.expense.findMany({
      where: expenseWhere,
    });

    const totalExpenses = expenses.reduce((acc, e) => acc + e.amount, 0);

    // Expenses categorized breakdown (Heads of Accounts)
    const expenseByCategory: Record<string, number> = {};
    expenses.forEach((e) => {
      expenseByCategory[e.category] = (expenseByCategory[e.category] || 0) + e.amount;
    });

    // 4. Customer Udhaar Recoveries collected in this period
    const recoveryWhere: any = { referenceType: "PAYMENT_RECEIVED" };
    if (hasDateFilter) {
      recoveryWhere.createdAt = dateRangeFilter;
    }
    const customerRecoveries = await db.customerLedgerEntry.findMany({
      where: recoveryWhere,
    });
    const totalRecoveriesCollected = customerRecoveries.reduce((acc, r) => acc + r.credit, 0);

    // 5. Net Profit / Loss
    const netProfit = grossProfit - totalExpenses;

    // 6. Total Balance Sheet Positions (Receivables & Payables & Inventory valuation)
    const [allCustomers, allSuppliers, allProducts] = await Promise.all([
      db.customer.findMany({ where: { isActive: true }, select: { balance: true } }),
      db.supplier.findMany({ where: { isActive: true }, select: { currentBalance: true } }),
      db.product.findMany({
        where: { isActive: true },
        select: { stockQuantity: true, purchasePrice: true },
      }),
    ]);

    const totalAccountsReceivable = allCustomers.reduce((acc, c) => acc + c.balance, 0);
    const totalAccountsPayable = allSuppliers.reduce((acc, s) => acc + s.currentBalance, 0);
    const totalInventoryPieces = allProducts.reduce((acc, p) => acc + Math.max(0, p.stockQuantity), 0);
    const currentInventoryValuation = allProducts.reduce(
      (acc, p) => acc + Math.max(0, p.stockQuantity) * p.purchasePrice,
      0
    );

    return NextResponse.json({
      success: true,
      accounting: {
        tradingAccount: {
          totalSalesRevenue,
          costOfGoodsSold,
          grossProfit,
          grossMarginPercent: totalSalesRevenue > 0 ? (grossProfit / totalSalesRevenue) * 100 : 0,
        },
        profitAndLoss: {
          grossProfit,
          totalExpenses,
          expenseByCategory,
          netProfit,
          netMarginPercent: totalSalesRevenue > 0 ? (netProfit / totalSalesRevenue) * 100 : 0,
        },
        purchasesSummary: {
          totalPurchasesAmount,
          totalPurchasesPaid,
          totalPurchasesPayablePending,
          totalOrdersCount: purchases.length,
        },
        cashFlowSummary: {
          cashInflowSales: totalCashCollected,
          cashInflowRecoveries: totalRecoveriesCollected,
          totalCashReceived: totalCashCollected + totalRecoveriesCollected,
          cashOutflowPurchases: totalPurchasesPaid,
          cashOutflowExpenses: totalExpenses,
          netCashFlow: totalCashCollected + totalRecoveriesCollected - totalPurchasesPaid - totalExpenses,
        },
        balanceSheetSnapshot: {
          totalInventoryPieces,
          currentInventoryValuation,
          totalAccountsReceivable,
          totalAccountsPayable,
          netWorkingCapital: currentInventoryValuation + totalAccountsReceivable - totalAccountsPayable,
        },
      },
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
