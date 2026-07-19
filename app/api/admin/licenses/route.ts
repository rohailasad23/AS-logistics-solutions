import { NextRequest, NextResponse } from "next/server";
import { requireAdminFromRequest, createLicenseKey } from "@/lib/saas";
import { getDb } from "@/db";
import { licenses } from "@/db/schema";

export const runtime = "edge";

export async function GET(req: NextRequest) {
  await requireAdminFromRequest(req);
  const rows = await getDb().select().from(licenses);
  return NextResponse.json({ licenses: rows });
}

export async function POST(req: NextRequest) {
  try {
    await requireAdminFromRequest(req);
    const body = await req.json();
    const licenseKey = String(body?.licenseKey || "").trim();
    const plan = String(body?.plan || "starter").trim() || "starter";
    const maxDevices = Number(body?.maxDevices || 1);

    if (!licenseKey) {
      return NextResponse.json({ error: "License key is required." }, { status: 400 });
    }
    if (maxDevices < 1) {
      return NextResponse.json({ error: "Max devices must be at least 1." }, { status: 400 });
    }

    await createLicenseKey(licenseKey, plan, maxDevices);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "License creation failed." }, { status: 500 });
  }
}
