import { NextRequest, NextResponse } from "next/server";
import { SalesService } from "@/server/services/sales-service";
import { getAuthUser, unauthorizedResponse } from "@/lib/auth-middleware";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getAuthUser(req);
  if (!user) return unauthorizedResponse();

  try {
    const { id } = params;
    const body = await req.json().catch(() => ({}));
    const reason = body.reason || "Customer Return / واپسی";
    const refundMethod = body.refundMethod || "CASH";

    const updatedTransaction = await SalesService.processSalesReturn(
      id,
      user.id,
      reason,
      refundMethod
    );

    return NextResponse.json({
      success: true,
      message: "Sale invoice returned successfully. Stock restored to inventory.",
      transaction: updatedTransaction,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 400 }
    );
  }
}
