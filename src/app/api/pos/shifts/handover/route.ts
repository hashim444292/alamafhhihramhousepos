import { NextRequest, NextResponse } from "next/server";
import { ShiftService } from "@/server/services/shift-service";
import { getAuthUser, unauthorizedResponse, forbiddenResponse } from "@/lib/auth-middleware";
import { AcceptHandoverSchema } from "@/lib/validations/shift";

export async function GET(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) return unauthorizedResponse();

  // Cashier handover approval queue is strictly for Store Managers (NOT Admin/Owner)
  if (user.role !== "MANAGER") {
    return NextResponse.json({
      success: true,
      pendingHandovers: [],
    });
  }

  try {
    const pendingHandovers = await ShiftService.getPendingHandovers();
    return NextResponse.json({
      success: true,
      pendingHandovers,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) return unauthorizedResponse();

  // Cashier cash collection and approval is strictly restricted to Store Managers
  if (user.role !== "MANAGER") {
    return forbiddenResponse(
      "کیشیئر سے کیش کی وصولی اور منظوری صرف اسٹور مینیجر (Store Manager) کے پاس ہے، ایڈمن یا اونر کے پاس نہیں۔ (Only Store Managers can collect and accept cash from Cashiers.)"
    );
  }

  try {
    const body = await req.json();
    const parsed = AcceptHandoverSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.errors[0].message },
        { status: 400 }
      );
    }

    const result = await ShiftService.acceptShiftHandover(
      parsed.data.shiftId,
      { id: user.id, fullName: user.fullName, role: user.role },
      parsed.data.action,
      parsed.data.notes,
      parsed.data.receivedAmount
    );

    return NextResponse.json({
      success: true,
      message: parsed.data.action === "ACCEPT" 
        ? "کیش ہینڈ اوور کی تصدیق اور منظوری مکمل ہو گئی ہے۔ (Cash handover accepted successfully)"
        : "کیش ہینڈ اوور مسترد کر دیا گیا۔ (Cash handover rejected)",
      ...result,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 400 });
  }
}
