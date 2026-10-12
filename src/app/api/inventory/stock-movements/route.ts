import { NextRequest, NextResponse } from "next/server";
import { InventoryService } from "@/server/services/inventory-service";
import { getAuthUser, unauthorizedResponse, forbiddenResponse } from "@/lib/auth-middleware";
import { StockAdjustmentSchema } from "@/lib/validations/product";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const productId = searchParams.get("productId") || undefined;
    const limit = Number(searchParams.get("limit")) || 50;

    const movements = await InventoryService.getMovements(limit, productId);
    return NextResponse.json({ success: true, movements });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) return unauthorizedResponse();

  try {
    const body = await req.json();
    const parsed = StockAdjustmentSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.errors[0].message },
        { status: 400 }
      );
    }

    // Cashiers are permitted to submit broken/damaged or stolen loss reports
    if (user.role === "CASHIER") {
      if (
        parsed.data.movementType !== "STOCK_OUT_DAMAGE" &&
        parsed.data.movementType !== "STOCK_OUT_STOLEN"
      ) {
        return forbiddenResponse(
          "Cashiers can only report damaged, broken, or stolen inventory loss."
        );
      }
    }

    const result = await InventoryService.adjustStock(parsed.data, user.id);
    return NextResponse.json({ success: true, ...result }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 400 });
  }
}
