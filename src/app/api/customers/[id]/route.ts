import { NextRequest, NextResponse } from "next/server";
import { CustomerService } from "@/server/services/customer-service";
import { getAuthUser, unauthorizedResponse, forbiddenResponse } from "@/lib/auth-middleware";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const customer = await CustomerService.getById(params.id);
    if (!customer) {
      return NextResponse.json({ success: false, error: "Customer not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true, customer });
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

  try {
    const body = await req.json();
    const updated = await CustomerService.update(params.id, body);
    return NextResponse.json({ success: true, customer: updated });
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
  if (user.role === "CASHIER") return forbiddenResponse("Only Admins or Managers can deactivate customers");

  try {
    await CustomerService.delete(params.id);
    return NextResponse.json({ success: true, message: "Customer deactivated" });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
