import { NextRequest, NextResponse } from "next/server";
import { ShiftService } from "@/server/services/shift-service";
import { getAuthUser, unauthorizedResponse, forbiddenResponse } from "@/lib/auth-middleware";
import { z } from "zod";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const SettleShortageSchema = z.object({
  shiftId: z.string().min(1, "Shift ID is required"),
  settlementType: z.enum(["RECOVERED_FROM_CASHIER", "ABSORBED_BY_STORE"]),
  notes: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) return unauthorizedResponse();

  if (user.role !== "ADMIN" && user.role !== "MANAGER") {
    return forbiddenResponse("Only Managers and Admins can settle shift cash shortages.");
  }

  try {
    const body = await req.json();
    const parsed = SettleShortageSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.errors[0].message },
        { status: 400 }
      );
    }

    const result = await ShiftService.settleShortage(
      parsed.data.shiftId,
      {
        settlementType: parsed.data.settlementType,
        notes: parsed.data.notes,
      },
      {
        id: user.id,
        fullName: user.fullName,
        role: user.role,
      }
    );

    return NextResponse.json({ success: true, shift: result.shift });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 400 });
  }
}
