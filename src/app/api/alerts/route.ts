import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { getAuthUser, unauthorizedResponse } from "@/lib/auth-middleware";

export async function GET(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) return unauthorizedResponse();

  try {
    const today = new Date();
    // Beginning of tomorrow (to include everything due today or before today)
    const endOfToday = new Date(today);
    endOfToday.setHours(23, 59, 59, 999);

    // 1. Supplier Payables Due / Overdue
    // Suppliers with positive balance and paymentDueDate <= endOfToday
    const overdueSuppliers = await db.supplier.findMany({
      where: {
        isActive: true,
        currentBalance: { gt: 0 },
        paymentDueDate: {
          lte: endOfToday,
        },
      },
      orderBy: { paymentDueDate: "asc" },
      select: {
        id: true,
        name: true,
        companyName: true,
        phone: true,
        currentBalance: true,
        paymentDueDate: true,
      },
    });

    // 2. Customer Receivables Due / Overdue (Udhaar recovery)
    // Customers with positive balance and paymentDueDate <= endOfToday
    const overdueCustomers = await db.customer.findMany({
      where: {
        isActive: true,
        balance: { gt: 0 },
        paymentDueDate: {
          lte: endOfToday,
        },
      },
      orderBy: { paymentDueDate: "asc" },
      select: {
        id: true,
        name: true,
        phone: true,
        balance: true,
        paymentDueDate: true,
      },
    });

    // 3. Low stock alerts (bonus inventory health signal)
    const lowStockProducts = await db.product.findMany({
      where: {
        isActive: true,
        stockQuantity: { lte: db.product.fields ? undefined : 5 }, // will filter below
      },
      select: {
        id: true,
        name: true,
        sku: true,
        stockQuantity: true,
        minStockThreshold: true,
      },
    }).then(products => products.filter(p => p.stockQuantity <= p.minStockThreshold));

    const totalAlertsCount = overdueSuppliers.length + overdueCustomers.length;

    return NextResponse.json({
      success: true,
      totalAlertsCount,
      overdueSuppliers,
      overdueCustomers,
      lowStockProducts,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
