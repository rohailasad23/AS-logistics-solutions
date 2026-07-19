import { NextRequest, NextResponse } from "next/server";
import { getSessionTokenFromHeader, deleteSession, clearAuthCookie } from "@/lib/saas";

export const runtime = "edge";

export async function POST(req: NextRequest) {
  try {
    const token = getSessionTokenFromHeader(req.headers.get("cookie") ?? undefined);
    if (token) {
      await deleteSession(token);
    }
    const response = NextResponse.json({ ok: true });
    response.headers.set("Set-Cookie", clearAuthCookie());
    return response;
  } catch {
    const response = NextResponse.json({ ok: false }, { status: 500 });
    response.headers.set("Set-Cookie", clearAuthCookie());
    return response;
  }
}
