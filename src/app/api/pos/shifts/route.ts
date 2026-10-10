import { NextRequest, NextResponse } from "next/server";
import { ShiftService } from "@/server/services/shift-service";
import { getAuthUser, unauthorizedResponse } from "@/lib/auth-middleware";
import { OpenShiftSchema } from "@/lib/validations/shift";

export async function GET(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) return unauthorizedResponse();

  try {
    const { searchParams } = new URL(req.url);
    const isHistory = searchParams.get("history") === "true";

    if (isHistory) {
      const startDate = searchParams.get("startDate") || undefined;
      const endDate = searchParams.get("endDate") || undefined;
      const cashierId = searchParams.get("cashierId") || undefined;
      const result = await ShiftService.getAllShifts({ startDate, endDate, cashierId });
      return NextResponse.json({
        success: true,
        shifts: result.shifts,
        summary: result.summary,
        cashiers: result.cashiers,
      });
    }

    const [activeShift, lastClosedShift] = await Promise.all([
      ShiftService.getCurrentShift(user.id),
      ShiftService.getLastClosedShift(),
    ]);

    return NextResponse.json({
      success: true,
      activeShift,
      hasActiveShift: !!activeShift,
      lastClosedShift: lastClosedShift
        ? {
            id: lastClosedShift.id,
            shiftNumber: lastClosedShift.shiftNumber,
            closingCash: lastClosedShift.closingCash,
            closedAt: lastClosedShift.closedAt,
            cashierName: lastClosedShift.cashier?.fullName || "Staff",
            notes: lastClosedShift.notes,
          }
        : null,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) return unauthorizedResponse();

  try {
    const body = await req.json();
    const parsed = OpenShiftSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.errors[0].message },
        { status: 400 }
      );
    }

    const shift = await ShiftService.openShift(parsed.data, user.id);
    return NextResponse.json({ success: true, shift }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 400 });
  }
}
