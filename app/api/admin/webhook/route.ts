import { NextRequest, NextResponse } from "next/server";
import { findLicenseByKey, updateLicenseStatus, createAuditLog } from "@/lib/saas";

export const runtime = "edge";
const SECRET = process.env.LICENSE_WEBHOOK_SECRET || "";

export async function POST(req: NextRequest) {
  try {
    const signature = req.headers.get("x-signature") || "";
    if (!SECRET || signature !== SECRET) {
      return NextResponse.json({ error: "Unauthorized webhook" }, { status: 401 });
    }

    const payload = await req.json();
    const licenseKey = String(payload?.licenseKey || "").trim();
    const status = String(payload?.status || "active").trim().toLowerCase();
    const eventType = String(payload?.eventType || "license.update").trim();

    if (!licenseKey) {
      return NextResponse.json({ error: "Missing license key" }, { status: 400 });
    }
    if (!["active", "suspended", "revoked"].includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    const license = await findLicenseByKey(licenseKey);
    if (!license) {
      return NextResponse.json({ error: "License not found" }, { status: 404 });
    }

    await updateLicenseStatus(license.id, status);
    await createAuditLog(null, eventType, `Webhook updated license ${licenseKey} -> ${status}`, JSON.stringify(payload));

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Webhook failed" }, { status: 500 });
  }
}
