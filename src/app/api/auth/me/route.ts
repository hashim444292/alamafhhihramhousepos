import { NextRequest, NextResponse } from "next/server";
import { getAuthUser, unauthorizedResponse } from "@/lib/auth-middleware";
import db from "@/lib/db";

export async function GET(req: NextRequest) {
  const userPayload = await getAuthUser(req);
  if (!userPayload) {
    return unauthorizedResponse();
  }

  const user = await db.user.findUnique({
    where: { id: userPayload.id },
    select: {
      id: true,
      username: true,
      fullName: true,
      email: true,
      role: true,
      isActive: true,
    },
  });

  if (!user || !user.isActive) {
    return unauthorizedResponse("User account is inactive or not found");
  }

  return NextResponse.json({
    success: true,
    user,
  });
}
