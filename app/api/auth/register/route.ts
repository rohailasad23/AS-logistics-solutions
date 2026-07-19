import { NextRequest, NextResponse } from "next/server";
import { createUser, createSession, authCookieHeader } from "@/lib/saas";

export const runtime = "edge";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const email = String(body?.email || "").trim().toLowerCase();
    const password = String(body?.password || "");
    const companyName = String(body?.companyName || "").trim();
    const deviceId = String(body?.deviceId || "").trim();

    if (!email || !password || !companyName || !deviceId) {
      return NextResponse.json({ error: "Missing required registration fields." }, { status: 400 });
    }

    const user = await createUser(email, password, companyName);
    const token = await createSession(user.id, deviceId);
    const response = NextResponse.json({ user: { email: user.email, companyName: user.companyName, role: user.role } });
    response.headers.set("Set-Cookie", authCookieHeader(token));
    return response;
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Registration failed." },
      { status: 400 },
    );
  }
}
