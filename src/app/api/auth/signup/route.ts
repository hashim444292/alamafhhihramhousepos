import { NextRequest } from "next/server";
import { POST as registerHandler } from "@/app/api/auth/register/route";

export async function POST(req: NextRequest) {
  return registerHandler(req);
}
