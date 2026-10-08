import { NextRequest, NextResponse } from "next/server";
import { ShiftService } from "@/server/services/shift-service";
import { getAuthUser, unauthorizedResponse } from "@/lib/auth-middleware";
import { CloseShiftSchema } from "@/lib/validations/shift";

export async function POST(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) return unauthorizedResponse();

  try {
    const body = await req.json();
    const parsed = CloseShiftSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.errors[0].message },
        { status: 400 }
      );
    }

    const result = await ShiftService.closeShift(parsed.data, user.id);
    return NextResponse.json({
      success: true,
      message: "Shift closed and Z-report generated",
      ...result,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 400 });
  }
}
