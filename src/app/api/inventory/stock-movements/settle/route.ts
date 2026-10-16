import { NextRequest, NextResponse } from "next/server";
import { InventoryService } from "@/server/services/inventory-service";
import { getAuthUser, unauthorizedResponse, forbiddenResponse } from "@/lib/auth-middleware";
import { z } from "zod";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const SettleLossSchema = z.object({
  movementId: z.string().min(1, "Movement ID is required"),
  settlementType: z.enum(["RECOVERED_FROM_STAFF", "ABSORBED_BY_STORE"]),
  notes: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) return unauthorizedResponse();

  if (user.role !== "ADMIN" && user.role !== "MANAGER") {
    return forbiddenResponse("Only Managers and Admins can settle damaged or stolen stock losses.");
  }

  try {
    const body = await req.json();
    const parsed = SettleLossSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.errors[0].message },
        { status: 400 }
      );
    }

    const result = await InventoryService.settleLoss(
      parsed.data.movementId,
      {
        settlementType: parsed.data.settlementType,
        notes: parsed.data.notes,
      },
      {
        id: user.id,
        fullName: user.fullName,
        role: user.role,
      }
    );

    return NextResponse.json({ success: true, movement: result.movement });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 400 });
  }
}
