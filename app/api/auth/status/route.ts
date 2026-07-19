import { NextRequest, NextResponse } from "next/server";
import { getSessionTokenFromHeader, getAuthSession, getActiveLicenseForUser, getActiveDeviceForLicense } from "@/lib/saas";

export const runtime = "edge";

export async function GET(req: NextRequest) {
  const token = getSessionTokenFromHeader(req.headers.get("cookie") ?? undefined);
  const auth = await getAuthSession(token);
  if (!auth) {
    return NextResponse.json({ authenticated: false });
  }

  const license = await getActiveLicenseForUser(auth.user.id);
  const device = license
    ? await getActiveDeviceForLicense(license.id, auth.user.id, auth.session.deviceId)
    : null;

  return NextResponse.json({
    authenticated: true,
    user: {
      email: auth.user.email,
      companyName: auth.user.companyName,
      role: auth.user.role,
    },
    license: license
      ? {
          id: license.id,
          plan: license.plan,
          maxDevices: license.maxDevices,
          status: license.status,
          assignedUserId: license.assignedUserId,
        }
      : null,
    device: device
      ? {
          deviceId: device.deviceId,
          name: device.name,
          fingerprint: device.fingerprint,
          active: Boolean(device.active),
          lastSeenAt: device.lastSeenAt,
        }
      : null,
  });
}
