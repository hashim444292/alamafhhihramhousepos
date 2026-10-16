import { NextRequest, NextResponse } from "next/server";
import { RemittanceService } from "@/server/services/remittance-service";
import { getAuthUser, unauthorizedResponse, forbiddenResponse } from "@/lib/auth-middleware";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser(req);
  if (!user) return unauthorizedResponse();

  if (user.role !== "ADMIN" && user.role !== "MANAGER") {
    return forbiddenResponse("Only Admins and Owners can confirm receipt of remittances.");
  }

  try {
    const { id } = await params;
    const result = await RemittanceService.confirmRemittance(id, {
      id: user.id,
      fullName: user.fullName || user.username,
    });

    return NextResponse.json({
      success: true,
      message: "مالک کی جانب سے رقم وصولی کی تصدیق کر دی گئی۔ (Remittance receipt confirmed by owner)",
      ...result,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 400 });
  }
}
