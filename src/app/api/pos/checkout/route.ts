import { NextRequest, NextResponse } from "next/server";
import { SalesService } from "@/server/services/sales-service";
import { getAuthUser, unauthorizedResponse } from "@/lib/auth-middleware";
import { CheckoutSchema } from "@/lib/validations/sales";

export async function POST(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) return unauthorizedResponse();

  try {
    const body = await req.json();
    const parsed = CheckoutSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.errors[0].message },
        { status: 400 }
      );
    }

    const result = await SalesService.checkout(parsed.data, user.id);
    return NextResponse.json({
      success: true,
      transaction: result.transaction,
      isDuplicate: result.isDuplicate,
    }, { status: 201 });
  } catch (err: any) {
    console.error("POS checkout error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to process sale" },
      { status: 400 }
    );
  }
}
