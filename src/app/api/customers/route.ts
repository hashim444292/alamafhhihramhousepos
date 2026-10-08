import { NextRequest, NextResponse } from "next/server";
import { CustomerService } from "@/server/services/customer-service";
import { getAuthUser, unauthorizedResponse } from "@/lib/auth-middleware";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || undefined;
    const customers = await CustomerService.getAll(search);
    return NextResponse.json({ success: true, customers });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) return unauthorizedResponse();

  try {
    const body = await req.json();
    if (!body.name) {
      return NextResponse.json({ success: false, error: "Customer name is required" }, { status: 400 });
    }

    const customer = await CustomerService.create(body);
    return NextResponse.json({ success: true, customer }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
