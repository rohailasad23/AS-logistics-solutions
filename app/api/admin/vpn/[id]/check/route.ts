import { NextRequest, NextResponse } from "next/server";
import { requireAdminFromRequest, listVpnServers, checkVpnServerHealth } from "@/lib/saas";

export const runtime = "edge";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdminFromRequest(req);
    const { id } = await params;
    const servers = await listVpnServers();
    const server = servers.find((s) => s.id === Number(id));
    if (!server) return NextResponse.json({ error: "Server not found." }, { status: 404 });

    const result = await checkVpnServerHealth(server);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Health check failed." }, { status: 500 });
  }
}
