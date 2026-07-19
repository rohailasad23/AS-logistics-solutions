import { NextRequest, NextResponse } from "next/server";
import { authenticateUser, createSession, authCookieHeader } from "@/lib/saas";

export const runtime = "edge";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const email = String(body?.email || "").trim().toLowerCase();
    const password = String(body?.password || "");
    const deviceId = String(body?.deviceId || "").trim();

    if (!email || !password || !deviceId) {
      return NextResponse.json({ error: "Email, password, and device ID are required." }, { status: 400 });
    }

    const user = await authenticateUser(email, password);
    if (!user) {
      return NextResponse.json({ error: "Invalid credentials." }, { status: 401 });
    }

    const token = await createSession(user.id, deviceId);
    const response = NextResponse.json({ user: { email: user.email, companyName: user.companyName, role: user.role } });
    response.headers.set("Set-Cookie", authCookieHeader(token));
    return response;
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Login failed." },
      { status: 500 },
    );
  }
}
