import { NextRequest, NextResponse } from "next/server";
import { requireAdminFromRequest, suspendLicense } from "@/lib/saas";

export const runtime = "edge";

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdminFromRequest(req);
    const { id } = await params;
    const licenseId = Number(id);
    if (!Number.isFinite(licenseId)) {
      return NextResponse.json({ error: "Invalid license id." }, { status: 400 });
    }
    await suspendLicense(licenseId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "License suspension failed." }, { status: 500 });
  }
}
