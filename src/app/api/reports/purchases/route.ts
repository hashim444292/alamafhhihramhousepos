import { NextRequest, NextResponse } from "next/server";
import { getAuthUser, unauthorizedResponse } from "@/lib/auth-middleware";
import db from "@/lib/db";
import { parseDateFilter } from "@/lib/date-utils";

export async function GET(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) return unauthorizedResponse();

  try {
    const { searchParams } = new URL(req.url);
    const supplierId = searchParams.get("supplierId") || undefined;
    const startDateParam = searchParams.get("startDate");
    const endDateParam = searchParams.get("endDate");

    const where: any = {};
    if (supplierId && supplierId !== "ALL") {
      where.supplierId = supplierId;
    }

    const { gte, lte } = parseDateFilter(startDateParam, endDateParam);
    if (gte || lte) {
      where.orderDate = {};
      if (gte) where.orderDate.gte = gte;
      if (lte) where.orderDate.lte = lte;
    }

    const purchases = await db.purchaseOrder.findMany({
      where,
      orderBy: { orderDate: "desc" },
      include: {
        supplier: {
          select: {
            id: true,
            name: true,
            companyName: true,
            phone: true,
            currentBalance: true,
          },
        },
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                sku: true,
                unit: true,
              },
            },
          },
        },
      },
    });

    // Summary calculations
    const totalPurchasedAmount = purchases.reduce((acc, p) => acc + p.totalAmount, 0);
    const totalPaidAmount = purchases.reduce((acc, p) => acc + p.paidAmount, 0);
    const totalRemainingPayable = purchases.reduce((acc, p) => acc + p.balanceAmount, 0);

    return NextResponse.json({
      success: true,
      purchases,
      summary: {
        totalPurchasedAmount,
        totalPaidAmount,
        totalRemainingPayable,
        count: purchases.length,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
