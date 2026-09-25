import { NextRequest, NextResponse } from "next/server";
import { requireAdminFromRequest, deleteVpnServer, setActiveVpnServer, deactivateAllVpnServers } from "@/lib/saas";

export const runtime = "edge";

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdminFromRequest(req);
    const { id } = await params;
    await deleteVpnServer(Number(id));
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not remove VPN server." }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdminFromRequest(req);
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    if (body?.active === false) {
      await deactivateAllVpnServers();
    } else {
      await setActiveVpnServer(Number(id));
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not update VPN server." }, { status: 500 });
  }
}
