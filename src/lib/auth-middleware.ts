import { NextRequest, NextResponse } from "next/server";
import { verifyAccessToken, TokenPayload } from "./jwt";

export interface AuthenticatedRequest extends NextRequest {
  user?: TokenPayload;
}

export async function getAuthUser(req: NextRequest): Promise<TokenPayload | null> {
  // 1. Check Authorization Bearer header
  const authHeader = req.headers.get("authorization");
  let token: string | null = null;

  if (authHeader && authHeader.startsWith("Bearer ")) {
    token = authHeader.substring(7);
  }

  // 2. Check Cookie fallback
  if (!token) {
    const cookieToken = req.cookies.get("token")?.value;
    if (cookieToken) token = cookieToken;
  }

  if (!token) return null;

  return await verifyAccessToken(token);
}

export function authorizeRole(userRole: string, allowedRoles: string[]): boolean {
  return allowedRoles.includes(userRole);
}

export function unauthorizedResponse(message = "Unauthorized: Authentication required") {
  return NextResponse.json({ success: false, error: message }, { status: 401 });
}

export function forbiddenResponse(message = "Forbidden: Insufficient role permissions") {
  return NextResponse.json({ success: false, error: message }, { status: 403 });
}
