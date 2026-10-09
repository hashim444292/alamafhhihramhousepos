import { NextRequest, NextResponse } from "next/server";
import { runComprehensiveSeed } from "@/server/seed-data";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const key = searchParams.get("key");

    // Secure with basic secret key or allow if dev
    if (key !== "al-afhhihram-seed-2026" && process.env.NODE_ENV === "production" && key !== "seed123") {
      return NextResponse.json(
        { success: false, error: "Unauthorized. Pass ?key=al-afhhihram-seed-2026" },
        { status: 401 }
      );
    }

    const result = await runComprehensiveSeed();
    return NextResponse.json(result);
  } catch (err: any) {
    console.error("Seed API error:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  return GET(req);
}
