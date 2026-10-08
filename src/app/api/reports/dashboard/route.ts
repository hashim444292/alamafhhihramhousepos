import { NextRequest, NextResponse } from "next/server";
import { ReportsService } from "@/server/services/reports-service";
import { getAuthUser, unauthorizedResponse, forbiddenResponse } from "@/lib/auth-middleware";

export async function GET(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) return unauthorizedResponse();
  if (user.role === "CASHIER") {
    return forbiddenResponse("Financial dashboards are restricted to Admin and Manager roles");
  }

  try {
    const metrics = await ReportsService.getDashboardMetrics();
    return NextResponse.json({ success: true, metrics });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
