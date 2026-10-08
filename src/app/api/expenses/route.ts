import { NextRequest, NextResponse } from "next/server";
import { ExpenseService } from "@/server/services/expense-service";
import { getAuthUser, unauthorizedResponse, forbiddenResponse } from "@/lib/auth-middleware";
import { ExpenseSchema } from "@/lib/validations/expense";
import { parseDateFilter } from "@/lib/date-utils";

export async function GET(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) return unauthorizedResponse();

  try {
    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category") || undefined;
    const startDateParam = searchParams.get("startDate");
    const endDateParam = searchParams.get("endDate");

    const { gte: startDate, lte: endDate } = parseDateFilter(startDateParam, endDateParam);

    const expenses = await ExpenseService.getAll(category, startDate, endDate);
    return NextResponse.json({ success: true, expenses });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) return unauthorizedResponse();
  if (user.role === "CASHIER") {
    return forbiddenResponse("Cashiers are not authorized to log store expenses");
  }

  try {
    const body = await req.json();
    const parsed = ExpenseSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.errors[0].message },
        { status: 400 }
      );
    }

    const expense = await ExpenseService.create(parsed.data, user.id);
    return NextResponse.json({ success: true, expense }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 400 });
  }
}
