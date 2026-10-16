import { NextRequest, NextResponse } from "next/server";
import { runFactoryReset } from "@/server/factory-reset";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const key = searchParams.get("key");

    let bodyKey = null;
    try {
      const body = await req.json();
      bodyKey = body?.key;
    } catch {
      // Body might be empty
    }

    const authKey = key || bodyKey;

    if (
      authKey !== "al-afhhihram-seed-2026" &&
      authKey !== "reset123" &&
      authKey !== "factory-reset-clean-slate"
    ) {
      return NextResponse.json(
        { success: false, error: "Unauthorized. Pass ?key=al-afhhihram-seed-2026" },
        { status: 401 }
      );
    }

    const result = await runFactoryReset();
    return NextResponse.json(result);
  } catch (err: any) {
    console.error("Factory Reset API error:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  return POST(req);
}
