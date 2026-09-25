import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  email: text("email").notNull(),
  companyName: text("company_name").notNull(),
  passwordHash: text("password_hash").notNull(),
  role: text("role").notNull().default("user"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const licenses = sqliteTable("licenses", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  keyHash: text("key_hash").notNull(),
  licenseKey: text("license_key"),
  ownerName: text("owner_name"),
  plan: text("plan").notNull().default("starter"),
  maxDevices: integer("max_devices").notNull().default(1),
  status: text("status").notNull().default("active"),
  assignedUserId: integer("assigned_user_id"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const sessions = sqliteTable("sessions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").notNull(),
  deviceId: text("device_id").notNull(),
  token: text("token").notNull(),
  expiresAt: text("expires_at").notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const devices = sqliteTable("devices", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  licenseId: integer("license_id").notNull(),
  userId: integer("user_id").notNull(),
  deviceId: text("device_id").notNull(),
  fingerprint: text("fingerprint").notNull(),
  name: text("name").notNull(),
  active: integer("active").notNull().default(1),
  lastSeenAt: text("last_seen_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const vpnServers = sqliteTable("vpn_servers", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  label: text("label").notNull(),
  countryCode: text("country_code"),
  relayUrl: text("relay_url").notNull(),
  secretKey: text("secret_key").notNull(),
  active: integer("active").notNull().default(0),
  lastCheckedAt: text("last_checked_at"),
  lastStatus: text("last_status").notNull().default("unknown"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const auditLogs = sqliteTable("audit_logs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id"),
  type: text("type").notNull(),
  message: text("message").notNull(),
  metadata: text("metadata").notNull().default(""),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});
