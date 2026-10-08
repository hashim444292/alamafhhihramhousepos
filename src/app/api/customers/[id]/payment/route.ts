import { NextRequest, NextResponse } from "next/server";
import { CustomerService } from "@/server/services/customer-service";
import { getAuthUser, unauthorizedResponse } from "@/lib/auth-middleware";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getAuthUser(req);
  if (!user) return unauthorizedResponse();

  try {
    const body = await req.json();
    const { amount, paymentMethod, notes, nextDueDate } = body;

    if (!amount || amount <= 0) {
      return NextResponse.json({ success: false, error: "Valid amount is required" }, { status: 400 });
    }

    const result = await CustomerService.recordPaymentReceived(
      params.id,
      amount,
      paymentMethod || "CASH",
      notes || "Khata Udhaar payment received",
      nextDueDate
    );

    return NextResponse.json({ success: true, ...result });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 400 });
  }
}
