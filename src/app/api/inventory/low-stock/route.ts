import { NextResponse } from "next/server";
import { InventoryService } from "@/server/services/inventory-service";

export async function GET() {
  try {
    const lowStockProducts = await InventoryService.getLowStockProducts();
    return NextResponse.json({
      success: true,
      count: lowStockProducts.length,
      products: lowStockProducts,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
