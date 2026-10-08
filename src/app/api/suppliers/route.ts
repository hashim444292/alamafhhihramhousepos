import { NextRequest, NextResponse } from "next/server";
import { SupplierService } from "@/server/services/supplier-service";
import { getAuthUser, unauthorizedResponse, forbiddenResponse } from "@/lib/auth-middleware";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || undefined;
    const suppliers = await SupplierService.getAll(search);
    return NextResponse.json({ success: true, suppliers });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) return unauthorizedResponse();
  if (user.role === "CASHIER") return forbiddenResponse();

  try {
    const body = await req.json();
    if (!body.name) {
      return NextResponse.json({ success: false, error: "Supplier name is required" }, { status: 400 });
    }

    const supplier = await SupplierService.create(body);
    return NextResponse.json({ success: true, supplier }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
