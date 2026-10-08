import { NextRequest, NextResponse } from "next/server";
import { SupplierService } from "@/server/services/supplier-service";
import { getAuthUser, unauthorizedResponse, forbiddenResponse } from "@/lib/auth-middleware";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supplier = await SupplierService.getById(params.id);
    if (!supplier) {
      return NextResponse.json({ success: false, error: "Supplier not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true, supplier });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getAuthUser(req);
  if (!user) return unauthorizedResponse();
  if (user.role === "CASHIER") return forbiddenResponse();

  try {
    const body = await req.json();
    const updated = await SupplierService.update(params.id, body);
    return NextResponse.json({ success: true, supplier: updated });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getAuthUser(req);
  if (!user) return unauthorizedResponse();
  if (user.role !== "ADMIN") return forbiddenResponse("Only Admins can deactivate suppliers");

  try {
    await SupplierService.delete(params.id);
    return NextResponse.json({ success: true, message: "Supplier deactivated" });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
