import { NextRequest, NextResponse } from "next/server";
import {
  requireAuthFromRequest,
  findLicenseByKey,
  assignLicenseToUser,
  createOrUpdateDevice,
  AuthError,
  LicenseError,
} from "@/lib/saas";

export const runtime = "edge";

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuthFromRequest(req);
    const body = await req.json();
    const licenseKey = String(body?.licenseKey || "").trim();
    const deviceId = String(body?.deviceId || "").trim();
    const deviceName = String(body?.deviceName || "Browser").trim();
    const fingerprint = String(body?.fingerprint || "").trim();

    if (!licenseKey || !deviceId || !fingerprint) {
      return NextResponse.json(
        { error: "License key, device ID, and fingerprint are required." },
        { status: 400 },
      );
    }

    const license = await findLicenseByKey(licenseKey);
    if (!license || license.status !== "active") {
      return NextResponse.json({ error: "License key is invalid or inactive." }, { status: 400 });
    }

    if (license.assignedUserId && license.assignedUserId !== auth.user.id) {
      return NextResponse.json({ error: "This license key is already assigned." }, { status: 403 });
    }

    if (!license.assignedUserId) {
      await assignLicenseToUser(license.id, auth.user.id);
    }

    await createOrUpdateDevice(
      auth.user.id,
      license.id,
      deviceId,
      fingerprint,
      deviceName,
    );

    return NextResponse.json({
      ok: true,
      license: {
        plan: license.plan,
        maxDevices: license.maxDevices,
        status: license.status,
      },
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    if (error instanceof LicenseError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "License activation failed." },
      { status: 500 },
    );
  }
}
