import { getDb } from "@/db";
import { users, licenses, sessions, devices, auditLogs } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { sql } from "drizzle-orm";

export const SESSION_COOKIE = "safer_session";
const SESSION_DURATION_SECONDS = 60 * 60 * 24 * 7;
const SESSION_DURATION_MS = SESSION_DURATION_SECONDS * 1000;

export class AuthError extends Error {}
export class LicenseError extends Error {}

function toHex(buffer: ArrayBuffer) {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function normalizeKey(value: string) {
  return value.trim().toLowerCase();
}

export function parseCookies(cookieHeader?: string) {
  const cookies: Record<string, string> = {};
  if (!cookieHeader) return cookies;
  for (const part of cookieHeader.split(";")) {
    const [name, ...valueParts] = part.trim().split("=");
    if (!name) continue;
    cookies[name] = decodeURIComponent(valueParts.join("="));
  }
  return cookies;
}

export function getSessionTokenFromHeader(cookieHeader?: string) {
  return parseCookies(cookieHeader)[SESSION_COOKIE] || null;
}

export function getSessionTokenFromCookies(cookies: any) {
  return cookies?.get?.(SESSION_COOKIE)?.value ?? null;
}

export async function randomHex(bytes: number) {
  const buffer = new Uint8Array(bytes);
  crypto.getRandomValues(buffer);
  return toHex(buffer.buffer);
}

export async function hashPassword(password: string) {
  const salt = await randomHex(16);
  const passwordKey = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    { name: "PBKDF2" },
    false,
    ["deriveBits"],
  );
  const hashBuffer = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: new TextEncoder().encode(salt),
      iterations: 150000,
      hash: "SHA-256",
    },
    passwordKey,
    256,
  );
  return `${salt}$${toHex(hashBuffer)}`;
}

export async function verifyPassword(stored: string, password: string) {
  const [salt, hash] = stored.split("$");
  if (!salt || !hash) return false;
  const passwordKey = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    { name: "PBKDF2" },
    false,
    ["deriveBits"],
  );
  const hashBuffer = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: new TextEncoder().encode(salt),
      iterations: 150000,
      hash: "SHA-256",
    },
    passwordKey,
    256,
  );
  return toHex(hashBuffer) === hash;
}

export async function hashLicenseKey(licenseKey: string) {
  const normalized = normalizeKey(licenseKey);
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(normalized),
  );
  return toHex(digest);
}

export function authCookieHeader(token: string) {
  const cookieParts = [`${SESSION_COOKIE}=${encodeURIComponent(token)}`];
  cookieParts.push(`Path=/`);
  cookieParts.push(`HttpOnly`);
  cookieParts.push(`SameSite=Lax`);
  if (process.env.NODE_ENV === "production") cookieParts.push("Secure");
  cookieParts.push(`Max-Age=${SESSION_DURATION_SECONDS}`);
  return cookieParts.join("; ");
}

export function clearAuthCookie() {
  const cookieParts = [`${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`];
  if (process.env.NODE_ENV === "production") cookieParts.push("Secure");
  return cookieParts.join("; ");
}

export async function getAuthSession(token: string | null) {
  if (!token) return null;
  const db = getDb();
  const sessionsRows = await db
    .select()
    .from(sessions)
    .where(eq(sessions.token, token))
    .limit(1);
  const session = sessionsRows[0];
  if (!session) return null;
  if (new Date(session.expiresAt).getTime() < Date.now()) return null;

  const usersRows = await db
    .select()
    .from(users)
    .where(eq(users.id, session.userId))
    .limit(1);
  const user = usersRows[0];
  if (!user) return null;

  return { user, session };
}

export async function createUser(
  email: string,
  password: string,
  companyName: string,
) {
  const db = getDb();
  const existing = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);
  if (existing.length) {
    throw new Error("A user already exists with that email.");
  }

  const passwordHash = await hashPassword(password);
  const currentUsers = await db.select().from(users).limit(1);
  const role = currentUsers.length ? "user" : "admin";

  await db.insert(users).values({
    email,
    companyName,
    passwordHash,
    role,
  });

  const userRows = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);
  return userRows[0];
}

export async function authenticateUser(email: string, password: string) {
  const db = getDb();
  const usersRows = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);
  const user = usersRows[0];
  if (!user) return null;
  if (!(await verifyPassword(user.passwordHash, password))) return null;
  return user;
}

export async function createSession(userId: number, deviceId: string) {
  const db = getDb();
  const token = await randomHex(32);
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS).toISOString();
  await db.insert(sessions).values({
    userId,
    deviceId,
    token,
    expiresAt,
  });
  return token;
}

export async function deleteSession(token: string) {
  const db = getDb();
  await db.delete(sessions).where(eq(sessions.token, token));
}

export async function findLicenseByKey(licenseKey: string) {
  const db = getDb();
  const keyHash = await hashLicenseKey(licenseKey);
  const rows = await db
    .select()
    .from(licenses)
    .where(eq(licenses.keyHash, keyHash))
    .limit(1);
  return rows[0] || null;
}

export async function createLicenseKey(
  licenseKey: string,
  plan = "starter",
  maxDevices = 1,
) {
  const db = getDb();
  const keyHash = await hashLicenseKey(licenseKey);
  const existing = await db
    .select()
    .from(licenses)
    .where(eq(licenses.keyHash, keyHash))
    .limit(1);
  if (existing.length) {
    throw new Error("A license with that key already exists.");
  }
  await db.insert(licenses).values({
    keyHash,
    plan,
    maxDevices,
    status: "active",
  });
}

export async function assignLicenseToUser(
  licenseId: number,
  userId: number,
) {
  const db = getDb();
  await db
    .update(licenses)
    .set({ assignedUserId: userId, updatedAt: new Date().toISOString() })
    .where(eq(licenses.id, licenseId));
}

export async function getActiveLicenseForUser(userId: number) {
  const db = getDb();
  const rows = await db
    .select()
    .from(licenses)
    .where(and(eq(licenses.assignedUserId, userId), eq(licenses.status, "active")))
    .limit(1);
  return rows[0] || null;
}

export async function getActiveDeviceForLicense(
  licenseId: number,
  userId: number,
  deviceId: string,
) {
  const db = getDb();
  const rows = await db
    .select()
    .from(devices)
    .where(
      and(
        eq(devices.licenseId, licenseId),
        eq(devices.userId, userId),
        eq(devices.deviceId, deviceId),
        eq(devices.active, 1),
      ),
    )
    .limit(1);
  return rows[0] || null;
}

export async function countActiveDevices(licenseId: number) {
  const db = getDb();
  const rows = await db
    .select({ count: sql`COUNT(*)` })
    .from(devices)
    .where(and(eq(devices.licenseId, licenseId), eq(devices.active, 1)));
  return Number(rows[0]?.count ?? 0);
}

export async function createOrUpdateDevice(
  userId: number,
  licenseId: number,
  deviceId: string,
  fingerprint: string,
  name: string,
) {
  const db = getDb();
  const existing = await db
    .select()
    .from(devices)
    .where(
      and(
        eq(devices.licenseId, licenseId),
        eq(devices.userId, userId),
        eq(devices.deviceId, deviceId),
      ),
    )
    .limit(1);

  if (existing.length) {
    await db
      .update(devices)
      .set({ fingerprint, name, lastSeenAt: new Date().toISOString(), active: 1 })
      .where(eq(devices.id, existing[0].id));
    return existing[0];
  }

  const activeCount = await countActiveDevices(licenseId);
  const licenseRows = await db
    .select()
    .from(licenses)
    .where(eq(licenses.id, licenseId))
    .limit(1);
  const license = licenseRows[0];
  if (!license) {
    throw new Error("License not found.");
  }
  if (activeCount >= Number(license.maxDevices)) {
    throw new LicenseError("The license has reached its active device limit.");
  }

  await db.insert(devices).values({
    licenseId,
    userId,
    deviceId,
    name,
    fingerprint,
    active: 1,
    lastSeenAt: new Date().toISOString(),
  });
}

export async function getAuthState(cookiesObj: any) {
  const token = getSessionTokenFromCookies(cookiesObj);
  const auth = await getAuthSession(token);
  if (!auth) return null;
  const license = await getActiveLicenseForUser(auth.user.id);
  const device = license
    ? await getActiveDeviceForLicense(
        license.id,
        auth.user.id,
        auth.session.deviceId,
      )
    : null;
  return { ...auth, license, device };
}

export async function requireAuthFromRequest(req: Request) {
  const token = getSessionTokenFromHeader(req.headers.get("cookie") ?? undefined);
  const auth = await getAuthSession(token);
  if (!auth) {
    throw new AuthError("Authentication required.");
  }
  return auth;
}

export async function requireAdminFromRequest(req: Request) {
  const auth = await requireAuthFromRequest(req);
  if (auth.user.role !== "admin") {
    throw new AuthError("Admin privileges required.");
  }
  return auth;
}

export async function requireActiveLicenseFromRequest(req: Request) {
  const auth = await requireAuthFromRequest(req);
  const license = await getActiveLicenseForUser(auth.user.id);
  if (!license) {
    throw new LicenseError("No active license assigned to this account.");
  }
  const device = await getActiveDeviceForLicense(
    license.id,
    auth.user.id,
    auth.session.deviceId,
  );
  if (!device) {
    throw new LicenseError("This device is not authorized for your license.");
  }
  return { ...auth, license, device };
}

export async function updateLicenseStatus(
  licenseId: number,
  status: string,
) {
  const db = getDb();
  await db
    .update(licenses)
    .set({ status, updatedAt: new Date().toISOString() })
    .where(eq(licenses.id, licenseId));
}

export async function createAuditLog(
  userId: number | null,
  type: string,
  message: string,
  metadata?: string,
) {
  const db = getDb();
  await db.insert(auditLogs).values({
    userId,
    type,
    message,
    metadata: metadata ?? "",
  });
}
