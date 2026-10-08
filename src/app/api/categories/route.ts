import { NextRequest, NextResponse } from "next/server";
import { ProductService } from "@/server/services/product-service";
import { getAuthUser, unauthorizedResponse, forbiddenResponse } from "@/lib/auth-middleware";

export async function GET() {
  try {
    const categories = await ProductService.getCategories();
    return NextResponse.json({ success: true, categories });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) return unauthorizedResponse();
  if (user.role === "CASHIER") {
    return forbiddenResponse("Only Admins and Managers can add new categories");
  }

  try {
    const body = await req.json();
    if (!body.name || typeof body.name !== "string" || body.name.trim().length === 0) {
      return NextResponse.json({ success: false, error: "Category name is required" }, { status: 400 });
    }

    const category = await ProductService.createCategory(body.name, body.description);
    return NextResponse.json({ success: true, category }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
