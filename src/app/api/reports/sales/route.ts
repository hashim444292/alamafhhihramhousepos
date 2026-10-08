import { NextRequest, NextResponse } from "next/server";
import { SalesService } from "@/server/services/sales-service";
import { getAuthUser, unauthorizedResponse } from "@/lib/auth-middleware";
import { parseDateFilter } from "@/lib/date-utils";

export async function GET(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) return unauthorizedResponse();

  try {
    const { searchParams } = new URL(req.url);
    const cashierId = searchParams.get("cashierId") || undefined;
    const customerId = searchParams.get("customerId") || undefined;
    const paymentMethod = searchParams.get("paymentMethod") || undefined;
    const startDateParam = searchParams.get("startDate");
    const endDateParam = searchParams.get("endDate");
    const limit = Number(searchParams.get("limit")) || 50;
    const skip = Number(searchParams.get("skip")) || 0;

    const { gte: startDate, lte: endDate } = parseDateFilter(startDateParam, endDateParam);

    const data = await SalesService.listTransactions({
      startDate,
      endDate,
      cashierId,
      customerId,
      paymentMethod,
      limit,
      skip,
    });

    return NextResponse.json({ success: true, ...data });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
