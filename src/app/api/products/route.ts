import { NextRequest, NextResponse } from "next/server";
import { ProductService } from "@/server/services/product-service";
import { getAuthUser, unauthorizedResponse, forbiddenResponse } from "@/lib/auth-middleware";
import { ProductSchema } from "@/lib/validations/product";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || undefined;
    const categoryId = searchParams.get("categoryId") || undefined;
    const lowStock = searchParams.get("lowStock") === "true";

    const products = await ProductService.getAll(search, categoryId, lowStock);
    const categories = await ProductService.getCategories();

    return NextResponse.json({
      success: true,
      products,
      categories,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) return unauthorizedResponse();
  if (user.role === "CASHIER") {
    return forbiddenResponse("Only Admins and Managers can add new products");
  }

  try {
    const body = await req.json();
    const parsed = ProductSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.errors[0].message },
        { status: 400 }
      );
    }

    const product = await ProductService.create(parsed.data, user.id);
    return NextResponse.json({ success: true, product }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
