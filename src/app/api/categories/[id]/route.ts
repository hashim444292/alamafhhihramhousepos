import { NextRequest, NextResponse } from "next/server";
import { ProductService } from "@/server/services/product-service";
import { getAuthUser, unauthorizedResponse, forbiddenResponse } from "@/lib/auth-middleware";

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getAuthUser(req);
  if (!user) return unauthorizedResponse();
  if (user.role === "CASHIER") {
    return forbiddenResponse("Only Admins and Managers can edit categories");
  }

  try {
    const body = await req.json();
    if (!body.name || typeof body.name !== "string" || body.name.trim().length === 0) {
      return NextResponse.json({ success: false, error: "Category name is required" }, { status: 400 });
    }

    const updated = await ProductService.updateCategory(params.id, body.name, body.description);
    return NextResponse.json({ success: true, category: updated });
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
  if (user.role === "CASHIER") {
    return forbiddenResponse("Only Admins and Managers can delete categories");
  }

  try {
    await ProductService.deleteCategory(params.id);
    return NextResponse.json({ success: true, message: "Category deleted successfully" });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 400 });
  }
}
