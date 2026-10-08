import { NextRequest, NextResponse } from "next/server";
import { SyncService } from "@/server/services/sync-service";
import { getAuthUser, unauthorizedResponse } from "@/lib/auth-middleware";
import { OfflineSyncBatchSchema } from "@/lib/validations/sales";

export async function POST(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) return unauthorizedResponse();

  try {
    const body = await req.json();
    const parsed = OfflineSyncBatchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.errors[0].message },
        { status: 400 }
      );
    }

    const batchResult = await SyncService.processBatch(parsed.data.transactions, user.id);
    return NextResponse.json({
      success: true,
      message: `Processed ${batchResult.totalProcessed} offline transaction(s). Failures: ${batchResult.failedCount}`,
      ...batchResult,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
