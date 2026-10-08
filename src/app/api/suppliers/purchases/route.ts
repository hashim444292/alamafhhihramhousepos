import { NextRequest, NextResponse } from "next/server";
import { SupplierService } from "@/server/services/supplier-service";
import { getAuthUser, unauthorizedResponse, forbiddenResponse } from "@/lib/auth-middleware";

export async function POST(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) return unauthorizedResponse();
  if (user.role === "CASHIER") return forbiddenResponse();

  try {
    const body = await req.json();
    const result = await SupplierService.recordPurchaseBill(body, user.id);
    return NextResponse.json({ success: true, ...result }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 400 });
  }
}
