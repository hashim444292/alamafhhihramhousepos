import { NextRequest, NextResponse } from "next/server";
import { RemittanceService } from "@/server/services/remittance-service";
import { getAuthUser, unauthorizedResponse, forbiddenResponse } from "@/lib/auth-middleware";
import { z } from "zod";

const CreateRemittanceSchema = z.object({
  amount: z.number().positive("رقم 0 سے زیادہ ہونا لازمی ہے۔ (Amount must be greater than 0)"),
  paymentMethod: z.string().optional().default("CASH"),
  ownerId: z.string().optional(),
  ownerName: z.string().optional(),
  notes: z.string().optional(),
  remittedAt: z.string().optional(),
  status: z.enum(["PENDING", "CONFIRMED"]).optional().default("CONFIRMED"),
});

export async function GET(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) return unauthorizedResponse();

  if (user.role !== "ADMIN" && user.role !== "MANAGER") {
    return forbiddenResponse("Only Managers and Admins can view remittances.");
  }

  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") || "ALL";
    const limit = parseInt(searchParams.get("limit") || "100", 10);

    const data = await RemittanceService.getAllRemittances({ status, limit });
    return NextResponse.json({
      success: true,
      ...data,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) return unauthorizedResponse();

  if (user.role !== "ADMIN" && user.role !== "MANAGER") {
    return forbiddenResponse("Only Managers and Admins can record remittances to owner.");
  }

  try {
    const body = await req.json();
    const parsed = CreateRemittanceSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.errors[0].message },
        { status: 400 }
      );
    }

    const result = await RemittanceService.createRemittance(
      {
        amount: parsed.data.amount,
        paymentMethod: parsed.data.paymentMethod,
        ownerId: parsed.data.ownerId,
        ownerName: parsed.data.ownerName,
        notes: parsed.data.notes,
        remittedAt: parsed.data.remittedAt,
      },
      {
        id: user.id,
        fullName: user.fullName || user.username,
        role: user.role,
      }
    );

    return NextResponse.json({
      success: true,
      message: "مالک / ایڈمن کو رقم کی ادائیگی کامیابی سے ریکارڈ ہو گئی ہے۔ (Remittance recorded successfully)",
      ...result,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 400 });
  }
}
