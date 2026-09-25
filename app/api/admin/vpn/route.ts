import { NextRequest, NextResponse } from "next/server";
import { requireAdminFromRequest, addVpnServer, listVpnServers } from "@/lib/saas";

export const runtime = "edge";

export async function GET(req: NextRequest) {
  await requireAdminFromRequest(req);
  const servers = await listVpnServers();
  // Never send the secret key back to the browser.
  const safe = servers.map(({ secretKey, ...rest }) => rest);
  return NextResponse.json({ servers: safe });
}

export async function POST(req: NextRequest) {
  try {
    await requireAdminFromRequest(req);
    const body = await req.json();
    const label = String(body?.label || "").trim();
    const countryCode = String(body?.countryCode || "").trim().toUpperCase();
    const relayUrl = String(body?.relayUrl || "").trim();
    const secretKey = String(body?.secretKey || "").trim();

    if (!label) return NextResponse.json({ error: "Server label is required." }, { status: 400 });
    if (!relayUrl || !/^https?:\/\//i.test(relayUrl)) {
      return NextResponse.json({ error: "A valid relay URL (http:// or https://) is required." }, { status: 400 });
    }
    if (!secretKey) return NextResponse.json({ error: "Secret key is required." }, { status: 400 });

    await addVpnServer(label, countryCode, relayUrl, secretKey);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not add VPN server." }, { status: 500 });
  }
}
