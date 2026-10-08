import { NextRequest, NextResponse } from "next/server";
import { ProductService } from "@/server/services/product-service";
import { getAuthUser, unauthorizedResponse, forbiddenResponse } from "@/lib/auth-middleware";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const product = await ProductService.getById(params.id);
    if (!product) {
      return NextResponse.json({ success: false, error: "Product not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true, product });
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
    const updated = await ProductService.update(params.id, body);
    return NextResponse.json({ success: true, product: updated });
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
  if (user.role === "CASHIER") return forbiddenResponse("Only Admins and Managers can delete products");

  try {
    await ProductService.delete(params.id);
    return NextResponse.json({ success: true, message: "Product deleted successfully" });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
