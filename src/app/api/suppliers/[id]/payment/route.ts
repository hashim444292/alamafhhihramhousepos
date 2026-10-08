import { NextRequest, NextResponse } from "next/server";
import { SupplierService } from "@/server/services/supplier-service";
import { getAuthUser, unauthorizedResponse, forbiddenResponse } from "@/lib/auth-middleware";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getAuthUser(req);
  if (!user) return unauthorizedResponse();
  if (user.role === "CASHIER") return forbiddenResponse();

  try {
    const body = await req.json();
    const { amount, paymentMethod, notes, nextDueDate } = body;

    if (!amount || amount <= 0) {
      return NextResponse.json({ success: false, error: "Valid amount is required" }, { status: 400 });
    }

    const result = await SupplierService.recordPayment(
      params.id,
      amount,
      paymentMethod || "CASH",
      notes || "Vendor bill payment",
      nextDueDate
    );

    return NextResponse.json({ success: true, ...result });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 400 });
  }
}
